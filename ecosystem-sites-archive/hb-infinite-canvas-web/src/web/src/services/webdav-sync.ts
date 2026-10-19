import i18n from "@/i18n";
import type { WebdavSyncConfig } from "@/stores/use-config-store";
import {
    computeTransferTimeoutMs,
    formatContentRange,
    isRetryableStatus,
    readOffsetHeader,
    retryDelayMs,
    uploadBlobInChunks,
    WEBDAV_CHUNK_BYTES,
    WEBDAV_CHUNK_THRESHOLD_BYTES,
    WEBDAV_MAX_ATTEMPTS,
    WEBDAV_MIN_TIMEOUT_MS,
    WEBDAV_UPLOAD_COMPLETE_HEADER,
    WEBDAV_UPLOAD_OFFSET_HEADER,
} from "@/services/webdav-transfer-plan";

export const WEBDAV_MANIFEST_FILE_NAME = "manifest.json";

const ensuredDirectories = new Set<string>();
/**
 * 已经确认「不支持分片 PUT」的远端地址。
 * 第三方 WebDAV（坚果云、Nextcloud 等）按 RFC 9110 会拒绝带 Content-Range 的 PUT，
 * 试过一次就别再试，直接整包上传。
 */
const chunkedUnsupportedRemotes = new Set<string>();
const webdavText = (key: string, options?: Record<string, unknown>) => i18n.t(`config.webdav.errors.${key}`, options);

/** WebDAV 请求错误：带状态码和「值不值得重试」，避免上层靠错误文案猜。 */
export class WebdavRequestError extends Error {
    readonly status: number;
    readonly retryable: boolean;

    constructor(message: string, options: { status?: number; retryable?: boolean } = {}) {
        super(message);
        this.name = "WebdavRequestError";
        this.status = options.status ?? 0;
        this.retryable = options.retryable ?? false;
    }
}

/** 远端不接受分片 PUT，需要回退成整包上传。 */
export class WebdavChunkUnsupportedError extends WebdavRequestError {
    constructor(message: string, status: number) {
        super(message, { status, retryable: false });
        this.name = "WebdavChunkUnsupportedError";
    }
}

export type WebdavUploadOptions = {
    /** 某一片失败、准备重试前回调（用来告诉用户「在重试」而不是卡住） */
    onRetry?: (event: { path: string; bytes: number; attempt: number; error: unknown }) => void;
    /** 分片进度，只有大文件会回调多次 */
    onProgress?: (event: { path: string; offset: number; total: number }) => void;
};

export type WebdavUploadStats = { chunks: number; attempts: number; restarts: number };

export async function testWebdavConnection(config: WebdavSyncConfig) {
    await ensureWebdavDirectory(config);
    const response = await webdavFetch(config, "", { method: "PROPFIND", headers: { Depth: "0" } });
    if (response.ok || response.status === 207) return;
    await throwWebdavError(response, webdavText("testFailed"));
}

export async function downloadWebdavSyncFile(config: WebdavSyncConfig) {
    return downloadWebdavFile(config, WEBDAV_MANIFEST_FILE_NAME);
}

export async function downloadWebdavFile(config: WebdavSyncConfig, path: string) {
    await ensureWebdavDirectory(config);
    return withRequestRetry(async () => {
        const response = await webdavFetch(config, path, { method: "GET" });
        if (response.status === 404) return null;
        if (!response.ok) await throwWebdavError(response, webdavText("downloadFailed"));
        // 视频几百 MB，读 body 也要按体积给超时；Content-Length 拿不到就退回 120 秒下限
        const expectedBytes = Number(response.headers.get("Content-Length")) || 0;
        const file = await withTimeout(response.blob(), webdavText("downloadTimeout"), computeTransferTimeoutMs(expectedBytes));
        return file.size ? file : null;
    });
}

export async function uploadWebdavSyncFile(config: WebdavSyncConfig, file: Blob) {
    return uploadWebdavFile(config, WEBDAV_MANIFEST_FILE_NAME, file, "application/json");
}

/**
 * 上传一个文件。
 *
 * 超过分片阈值的大文件走分片续传（公网链路上单次 PUT 会被 Cloudflare 的
 * 100 秒时长墙 / 100MB 体积墙掐断，和文件总量无关，只看「这一次请求要传多久」）；
 * 小文件保持一次性 PUT，第三方 WebDAV 服务不认分片时也自动回退到整包上传。
 */
export async function uploadWebdavFile(config: WebdavSyncConfig, path: string, file: Blob, contentType = "application/octet-stream", options: WebdavUploadOptions = {}): Promise<WebdavUploadStats> {
    if (!file.size) throw new WebdavRequestError(webdavText("emptyUpload"));
    await ensureWebdavDirectory(config);
    await ensureWebdavSubdirectory(config, path);

    const remoteKey = config.url.trim().replace(/\/+$/, "");
    if (file.size > WEBDAV_CHUNK_THRESHOLD_BYTES && !chunkedUnsupportedRemotes.has(remoteKey)) {
        try {
            const stats = await uploadBlobInChunks({
                totalBytes: file.size,
                chunkBytes: WEBDAV_CHUNK_BYTES,
                maxAttempts: WEBDAV_MAX_ATTEMPTS,
                onRetry: (attempt, _offset, error) => options.onRetry?.({ path, bytes: file.size, attempt, error }),
                onProgress: (offset, total) => options.onProgress?.({ path, offset, total }),
                putChunk: async (start, end, total) => {
                    const slice = file.slice(start, end + 1);
                    const response = await webdavFetch(
                        config,
                        path,
                        {
                            method: "PUT",
                            headers: { "Content-Type": contentType, "Content-Range": formatContentRange(start, end, total) },
                            body: slice,
                        },
                        computeTransferTimeoutMs(slice.size),
                    );
                    if (response.status === 409) {
                        // 远端已持久化的字节数和我们以为的不一致，交给上层按远端位置续传
                        return { status: 409, ok: false, complete: false, nextOffset: readOffsetHeader(response.headers.get(WEBDAV_UPLOAD_OFFSET_HEADER)) };
                    }
                    if (response.status === 400 || response.status === 501) throw new WebdavChunkUnsupportedError(webdavText("chunkUnsupported"), response.status);
                    if (!response.ok) await throwWebdavError(response, webdavText("uploadFailed"));
                    return {
                        status: response.status,
                        ok: true,
                        complete: response.headers.get(WEBDAV_UPLOAD_COMPLETE_HEADER) === "1",
                        nextOffset: readOffsetHeader(response.headers.get(WEBDAV_UPLOAD_OFFSET_HEADER)),
                    };
                },
            });
            options.onProgress?.({ path, offset: file.size, total: file.size });
            return stats;
        } catch (error) {
            if (!(error instanceof WebdavChunkUnsupportedError)) throw error;
            chunkedUnsupportedRemotes.add(remoteKey);
        }
    }

    await putWholeFile(config, path, file, contentType);
    return { chunks: 1, attempts: 1, restarts: 0 };
}

/** 一次性 PUT：小文件，以及远端不支持分片时的大文件。 */
async function putWholeFile(config: WebdavSyncConfig, path: string, file: Blob, contentType: string) {
    await withRequestRetry(async () => {
        const response = await webdavFetch(config, path, { method: "PUT", headers: { "Content-Type": contentType }, body: file }, computeTransferTimeoutMs(file.size));
        if (!response.ok) await throwWebdavError(response, webdavText("uploadFailed"));
    });
}

async function ensureWebdavDirectory(config: WebdavSyncConfig) {
    assertWebdavConfig(config);
    await ensureWebdavDirectoryPath(config, config.directory);
}

async function ensureWebdavSubdirectory(config: WebdavSyncConfig, path: string) {
    const directory = normalizePath(path).split("/").slice(0, -1).join("/");
    if (!directory) return;
    await ensureWebdavDirectoryPath(config, [config.directory, directory].filter(Boolean).join("/"));
}

async function ensureWebdavDirectoryPath(config: WebdavSyncConfig, directory: string) {
    const parts = normalizePath(directory).split("/").filter(Boolean);
    const cacheKey = `${config.url}:${parts.join("/")}`;
    if (ensuredDirectories.has(cacheKey)) return;
    let path = "";
    for (const part of parts) {
        path = path ? `${path}/${part}` : part;
        const response = await webdavFetch({ ...config, directory: "" }, path, { method: "MKCOL" });
        if (response.ok || ((response.status === 405 || response.status === 423) && (await webdavDirectoryExists(config, path)))) continue;
        await throwWebdavError(response, webdavText("directoryFailed"));
    }
    ensuredDirectories.add(cacheKey);
}

async function webdavDirectoryExists(config: WebdavSyncConfig, path: string) {
    const response = await webdavFetch({ ...config, directory: "" }, path, { method: "PROPFIND", headers: { Depth: "0" } });
    return response.ok || response.status === 207;
}

async function webdavFetch(config: WebdavSyncConfig, path: string, init: RequestInit, timeoutMs = WEBDAV_MIN_TIMEOUT_MS) {
    const headers = new Headers(init.headers);
    if (config.username || config.password) headers.set("Authorization", `Basic ${encodeBasicAuth(`${config.username}:${config.password}`)}`);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
        const url = buildWebdavUrl(config, path);
        return await fetch(url, { ...init, headers, signal: controller.signal });
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") throw new WebdavRequestError(webdavText("requestTimeout"), { retryable: true });
        if (error instanceof TypeError) throw new WebdavRequestError(webdavText("connectionFailed"), { retryable: true });
        throw error;
    } finally {
        window.clearTimeout(timer);
    }
}

/** 网络抖动/服务端 5xx 值得重来，认证失败、体积超限这类就别浪费时间。 */
async function withRequestRetry<T>(run: () => Promise<T>, attempts = WEBDAV_MAX_ATTEMPTS): Promise<T> {
    let attempt = 0;
    for (;;) {
        attempt += 1;
        try {
            return await run();
        } catch (error) {
            const retryable = error instanceof WebdavRequestError ? error.retryable : true;
            if (attempt >= attempts || !retryable) throw error;
            await new Promise((resolve) => window.setTimeout(resolve, retryDelayMs(attempt)));
        }
    }
}

function buildWebdavUrl(config: WebdavSyncConfig, path: string) {
    const baseUrl = config.url.trim().replace(/\/+$/, "");
    const remotePath = [normalizePath(config.directory), normalizePath(path)].filter(Boolean).join("/");
    if (!remotePath) return baseUrl;
    return `${baseUrl}/${remotePath.split("/").map(encodeURIComponent).join("/")}`;
}

function normalizePath(path: string) {
    return path.trim().replace(/^\/+|\/+$/g, "");
}

function assertWebdavConfig(config: WebdavSyncConfig) {
    if (!config.url.trim()) throw new WebdavRequestError(webdavText("urlRequired"));
}

async function throwWebdavError(response: Response, fallback: string): Promise<never> {
    const detail = await response.text().catch(() => "");
    if (response.status === 401 || response.status === 403) throw new WebdavRequestError(webdavText("authenticationFailed"), { status: response.status });
    if (response.status === 404) throw new WebdavRequestError(webdavText("pathMissing"), { status: response.status });
    if (response.status === 413) throw new WebdavRequestError(webdavText("payloadTooLarge"), { status: response.status });
    throw new WebdavRequestError(webdavText("responseFailed", { fallback, status: response.status, detail: detail ? ` ${detail.slice(0, 120)}` : "" }), {
        status: response.status,
        retryable: isRetryableStatus(response.status),
    });
}

function encodeBasicAuth(value: string) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
}

function withTimeout<T>(promise: Promise<T>, message: string, timeoutMs: number) {
    return new Promise<T>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new WebdavRequestError(message, { retryable: true })), timeoutMs);
        promise.then(resolve, reject).finally(() => window.clearTimeout(timer));
    });
}
