/**
 * 服务端通道（canvas-api）。
 *
 * 与 WebDAV 那条路的区别，一句话：这次服务端「认识」数据。
 *   - 每个用户有自己的目录，浏览器只是视图，清缓存、换电脑都不影响；
 *   - 媒体文件登记进 media_files 表，连原始出处（source_url）都留着 ——
 *     画布里那些只有 1 小时寿命的 CDN 外链，靠这个才不至于无声无息变成 404。
 *
 * 分片策略跟 WebDAV 那套完全一样（同一份纯逻辑 uploadBlobInChunks），
 * 因为要躲的是同一堵墙：公网 PUT 必须等整个请求体收完才拿得到响应，
 * Cloudflare 只给源站 100 秒，跟文件总量无关，只看这一次请求要传多久。
 */
import type { SyncTransport, SyncUploadOptions } from "@/services/app-sync";
import {
    computeTransferTimeoutMs,
    formatContentRange,
    readOffsetHeader,
    uploadBlobInChunks,
    WEBDAV_CHUNK_BYTES,
    WEBDAV_CHUNK_THRESHOLD_BYTES,
    WEBDAV_MAX_ATTEMPTS,
    WEBDAV_UPLOAD_COMPLETE_HEADER,
    WEBDAV_UPLOAD_OFFSET_HEADER,
} from "@/services/webdav-transfer-plan";

/** 同源部署，前端永远打相对路径；MCP / 本地调试可覆盖。 */
const API_BASE = (import.meta.env.VITE_CANVAS_API_BASE as string | undefined) || "/api";

export type BackendUser = {
    id: string;
    email: string;
    displayName?: string | null;
    role?: string;
    createdAt?: string;
};

export class BackendError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
        super(message);
        this.name = "BackendError";
        this.status = status;
        this.code = code;
    }
}

async function readError(response: Response, fallback: string) {
    try {
        const payload = (await response.json()) as { error?: string; message?: string };
        return new BackendError(response.status, payload.error || "unknown", payload.message || fallback);
    } catch {
        return new BackendError(response.status, "unknown", fallback);
    }
}

/** 带超时与 401 自动续期的一次请求。refresh 只试一次，失败就把登录态交出去让用户重新登。 */
let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
    if (!refreshing) {
        refreshing = (async () => {
            try {
                const response = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" });
                return response.ok;
            } catch {
                return false;
            }
        })().finally(() => {
            refreshing = null;
        });
    }
    return refreshing;
}

export async function backendFetch(path: string, init: RequestInit = {}, timeoutMs = 120000): Promise<Response> {
    const send = async () => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(`${API_BASE}${path}`, { ...init, credentials: "include", signal: controller.signal });
        } finally {
            window.clearTimeout(timer);
        }
    };

    let response = await send();
    if (response.status === 401 && path !== "/auth/refresh" && path !== "/auth/login") {
        if (await refreshSession()) response = await send();
    }
    return response;
}

/**
 * 注册。服务端可以关掉公开注册（ALLOW_REGISTER=0），那时会返 403 + registration_closed，
 * 前端据此把入口收起来，而不是让人填半天才发现不让注。
 */
export async function registerBackend(email: string, password: string, displayName?: string): Promise<BackendUser> {
    const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, displayName }),
    });
    if (!response.ok) throw await readError(response, "注册失败");
    const payload = (await response.json()) as { user: BackendUser };
    return payload.user;
}

export async function loginBackend(email: string, password: string): Promise<BackendUser> {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw await readError(response, "登录失败");
    const payload = (await response.json()) as { user: BackendUser };
    return payload.user;
}

export async function logoutBackend(): Promise<void> {
    try {
        await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    } catch {
        /* 登出失败无所谓：本地清掉登录态即可 */
    }
}

/** 拿当前登录者；没登录返回 null（401 是正常的「未登录」，不该刷成报错）。 */
export async function fetchBackendUser(): Promise<BackendUser | null> {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
        if (response.status === 401) return null;
        if (!response.ok) throw await readError(response, "读取账号失败");
        const payload = (await response.json()) as { user: BackendUser };
        return payload.user;
    } catch (error) {
        if (error instanceof BackendError && error.status === 401) return null;
        throw error;
    }
}

/** 把一条外部 URL 抓回服务端保存，并记下原始出处。 */
export async function importExternalUrl(url: string, kind: "image" | "video" | "audio" | "file" = "image") {
    const response = await backendFetch("/media/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, kind }),
    });
    if (!response.ok) throw await readError(response, "外链导入失败");
    return (await response.json()) as { storageKey: string; bytes: number; url: string; sourceUrl: string };
}

export type BackendMediaItem = {
    storage_key: string;
    mime_type: string;
    bytes: number;
    checksum: string | null;
    source_url: string | null;
    created_at: string;
};

export async function listBackendMedia(): Promise<BackendMediaItem[]> {
    const response = await backendFetch("/media");
    if (!response.ok) throw await readError(response, "读取云端素材失败");
    const payload = (await response.json()) as { items: BackendMediaItem[] };
    return payload.items || [];
}

export type BackendSyncItem = { path: string; bytes: number; updatedAt: string };

/** 服务端现在存了什么，让用户能确认「东西真的在云上」 */
export async function listBackendSync(): Promise<{ items: BackendSyncItem[]; totalBytes: number }> {
    const response = await backendFetch("/sync");
    if (!response.ok) throw await readError(response, "读取云端同步状态失败");
    return (await response.json()) as { items: BackendSyncItem[]; totalBytes: number };
}

function encodePath(path: string) {
    return path
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
}

/**
 * 服务端通道的传输层，接口与 WebDAV 那份一致，
 * 于是 app-sync 里的合并、补缺失、回写逻辑一行都不用改。
 */
export function createBackendTransport(): SyncTransport {
    const readFile: SyncTransport["readFile"] = async (path, storageKey) => {
        // 有本地媒体标记就走 media 端点：那里登记的才是数据库里留了档的那份
        if (storageKey) {
            const media = await backendFetch(`/media/${encodeURIComponent(storageKey)}`);
            if (media.ok) return media.blob();
            if (media.status !== 404) throw await readError(media, "读取云端媒体失败");
        }
        const response = await backendFetch(`/sync/${encodePath(path)}`);
        if (response.status === 404) return null;
        if (!response.ok) throw await readError(response, "读取云端文件失败");
        return response.blob();
    };

    const writeFile: SyncTransport["writeFile"] = async (path, blob, mimeType, options: SyncUploadOptions = {}) => {
        if (!blob.size) throw new BackendError(400, "empty_upload", "内容为空，拒绝上传");

        // 媒体登记进 media_files（带 storageKey 与出处），其余（manifest 等）进文件柜
        const target = options.storageKey ? `/media/${encodeURIComponent(options.storageKey)}` : `/sync/${encodePath(path)}`;

        if (blob.size <= WEBDAV_CHUNK_THRESHOLD_BYTES) {
            const response = await backendFetch(
                target,
                { method: "PUT", headers: { "Content-Type": mimeType }, body: blob },
                computeTransferTimeoutMs(blob.size),
            );
            if (!response.ok) throw await readError(response, "上传失败");
            return { chunks: 1 };
        }

        return uploadBlobInChunks({
            totalBytes: blob.size,
            chunkBytes: WEBDAV_CHUNK_BYTES,
            maxAttempts: WEBDAV_MAX_ATTEMPTS,
            onRetry: (attempt) => options.onRetry?.({ attempt }),
            onProgress: (offset, total) => options.onProgress?.({ offset, total }),
            putChunk: async (start, end, total) => {
                const slice = blob.slice(start, end + 1);
                const response = await backendFetch(
                    target,
                    {
                        method: "PATCH",
                        headers: { "Content-Type": mimeType, "Content-Range": formatContentRange(start, end, total) },
                        body: slice,
                    },
                    computeTransferTimeoutMs(slice.size),
                );
                if (response.status === 409) {
                    return { status: 409, ok: false, complete: false, nextOffset: readOffsetHeader(response.headers.get(WEBDAV_UPLOAD_OFFSET_HEADER)) };
                }
                if (!response.ok) throw await readError(response, "分片上传失败");
                return {
                    status: response.status,
                    ok: true,
                    complete: response.headers.get(WEBDAV_UPLOAD_COMPLETE_HEADER) === "1",
                    nextOffset: readOffsetHeader(response.headers.get(WEBDAV_UPLOAD_OFFSET_HEADER)),
                };
            },
        });
    };

    return { readFile, writeFile };
}
