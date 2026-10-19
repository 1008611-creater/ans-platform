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

/** 服务端代抓上游产物可能很慢（成片动辄几十 MB），给足超时。 */
const IMPORT_TIMEOUT_MS = 10 * 60_000;

export type BackendUser = {
    id: string;
    email: string;
    displayName?: string | null;
    role?: string;
    createdAt?: string;
};

/** 额度定价只用于展示服务端返回的目录，不在前端计算扣费。 */
export type CreditPricing = {
    cnyPerCredit: number;
    multiplier: number;
    denominations: number[];
};

export type CreditLedgerItem = {
    amount: number;
    balance_after: number;
    reason: string;
    task_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
};

export type FreeTrialStatus = { period: string; limit: number; used: number; remaining: number };

export type CreditSummary = {
    balance: number;
    pricing: CreditPricing;
    ledger: CreditLedgerItem[];
    freeTrial: FreeTrialStatus;
};

export type CreditRedemption = { credits: number; redeemed_at: string };

export type ZiyuModelInfo = {
    id: string; name?: string; type?: string; modes?: string[]; enabled?: boolean;
    cost?: number | null; costPerSecond?: number | null; allowedDurations?: Array<string | number>;
};
export type ZiyuCostGroup = { tier: number; models: ZiyuModelInfo[] };
export type ZiyuModelGroups = { video: ZiyuModelInfo[]; image: ZiyuModelInfo[]; byCost: ZiyuCostGroup[] };
export type ZiyuModelCatalog = { models: ZiyuModelInfo[]; groups?: ZiyuModelGroups };
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

/**
 * 会话续期（供 /agnes/、/ziyu/ 这类「由 nginx 用真会话把关」的路径使用）。
 *
 * 为什么需要它：nginx 的 auth_request 认的是 canvas_session（12 小时有效）。
 * 过期后这些路径会直接 401，而 model-plugin / video.ts 的请求不走 backendFetch，
 * 不会自动续期 —— 表现就是「用了一上午，突然点生成没反应」。
 * 所以在这些调用点遇到 401 时，先续一次期再重试。
 */
export async function ensureSessionForProxy(): Promise<boolean> {
    return refreshSession();
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
export async function sendRegisterCode(email: string): Promise<{ ok: boolean; ttlSeconds: number }> {
    const response = await fetch(`${API_BASE}/auth/register/code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
    });
    if (!response.ok) throw await readError(response, "验证码发送失败");
    return (await response.json()) as { ok: boolean; ttlSeconds: number };
}

export async function registerBackend(email: string, password: string, displayName?: string, code?: string): Promise<BackendUser> {
    const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, displayName, code }),
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
/** 读取当前账号的余额、流水和免费试拍状态。 */
export async function fetchCreditSummary(): Promise<CreditSummary> {
    const response = await backendFetch("/credits/me");
    if (!response.ok) throw await readError(response, "读取额度失败");
    return (await response.json()) as CreditSummary;
}

/** 粘贴兑换码后交给服务端做签名校验与一次性抢占。 */
export async function redeemCreditCode(code: string): Promise<{ ok: true; redeemedCredits: number; balance: number }> {
    const response = await backendFetch("/credits/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
    });
    if (!response.ok) throw await readError(response, "兑换失败");
    return (await response.json()) as { ok: true; redeemedCredits: number; balance: number };
}

export async function generateCreditCodes(credits: number, count = 1): Promise<{ credits: number; count: number; codes: string[] }> {
    const response = await backendFetch("/admin/credits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits, count }),
    });
    if (!response.ok) throw await readError(response, "生成兑换码失败");
    return (await response.json()) as { credits: number; count: number; codes: string[] };
}

export async function listCreditRedemptions(): Promise<CreditRedemption[]> {
    const response = await backendFetch("/credits/redemptions");
    if (!response.ok) throw await readError(response, "读取兑换记录失败");
    const payload = (await response.json()) as { items?: CreditRedemption[] };
    return payload.items || [];
}

export async function fetchFreeTrialStatus(): Promise<FreeTrialStatus> {
    const response = await backendFetch("/credits/free-trial");
    if (!response.ok) throw await readError(response, "读取免费试拍状态失败");
    return (await response.json()) as FreeTrialStatus;
}

/** 紫域目录只经过服务端代理，响应中不应包含任何密钥字段。 */
export async function fetchZiyuModelCatalog(): Promise<ZiyuModelCatalog> {
    const response = await backendFetch("/ziyu/models");
    if (!response.ok) throw await readError(response, "读取紫域模型目录失败");
    return (await response.json()) as ZiyuModelCatalog;
}
export async function importExternalUrl(url: string, kind: "image" | "video" | "audio" | "file" = "image") {
    const response = await backendFetch("/media/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, kind }),
    });
    if (!response.ok) throw await readError(response, "外链导入失败");
    return (await response.json()) as { storageKey: string; bytes: number; url: string; sourceUrl: string };
}

/**
 * ★ 服务端代抓上游产物，再把本地副本取回来（2026-09-14 收入级缺陷修复）。
 *
 * 起因：Agnes CDN 与紫域的产出地址都不发 Access-Control-Allow-Origin，浏览器直连
 * fetch 必被 CORS 挡死；旧代码失败后静默退回「只存外链」。而 Agnes 链接约 1 小时、
 * 紫域结果 URL 24 小时就被清理 —— 用户付了钱出的片会集体变 404，画布上连副本都没有。
 *
 * 关键点：服务端落盘后必须用**服务端那一个 storageKey** 存本地副本，
 * 否则本地与云上各占一个键，同步时会被当成两个文件。
 */
export async function persistRemoteMedia(
    url: string,
    kind: "image" | "video" | "audio" | "file" = "video",
    taskId?: string,
): Promise<{ storageKey: string; bytes: number; mimeType: string; blob: Blob; sourceUrl: string }> {
    const response = await backendFetch(
        "/media/import-url",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // 带 taskId 时服务端会走紫域那条路：先复核任务终态，再把 local_media_key 登记进对账表。
            body: JSON.stringify(taskId ? { url, kind, taskId } : { url, kind }),
        },
        IMPORT_TIMEOUT_MS,
    );
    if (!response.ok) throw await readError(response, "服务端落盘失败");
    const saved = (await response.json()) as { storageKey: string; bytes: number; url: string; sourceUrl: string };
    if (!saved || !saved.storageKey) throw new BackendError(502, "no_storage_key", "服务端没有返回副本位置");

    const media = await backendFetch(`/media/${encodeURIComponent(saved.storageKey)}`, {}, IMPORT_TIMEOUT_MS);
    if (!media.ok) throw await readError(media, "读取云端副本失败");
    const blob = await media.blob();
    const mimeType = blob.type || (kind === "video" ? "video/mp4" : kind === "image" ? "image/png" : "application/octet-stream");
    return { storageKey: saved.storageKey, bytes: blob.size || saved.bytes, mimeType, blob, sourceUrl: saved.sourceUrl || url };
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
