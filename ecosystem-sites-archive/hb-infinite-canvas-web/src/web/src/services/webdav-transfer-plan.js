/*
 * WebDAV 传输规划 —— 纯逻辑，零依赖，可以在 node 里直接跑测试。
 *
 * 为什么单独拆出来：
 * 公网这条链路上（浏览器 → Cloudflare → nginx → canvas-webdav），真正卡住上传的不是
 * 画布自己的代码，而是两堵外部的墙：
 *   1. **时长墙**：PUT 的响应必须等整个请求体收完才会发出，而 Cloudflare 的 524 只给
 *      源站 100 秒。上行只有 2Mbps 时，单次请求超过 20MB 左右必然被掐断——和文件
 *      总量无关，只和「这一次请求要传多久」有关。
 *   2. **体积墙**：Cloudflare 单次请求体上限 100MB，超了直接 413。
 * 所以大文件必须切成若干片、每片几十秒内传完，逐片续传。切片、超时、重试这些判断
 * 全是纯算术，放在这里，既不依赖浏览器 API，也能被真实网络测试反复验证。
 *
 * 约定：本文件不使用任何浏览器 API，也不 import 任何东西（要能被 node 直接加载）。
 */

/** 单个请求的兜底超时下限：小文件不受影响，行为和以前一致。 */
export const WEBDAV_MIN_TIMEOUT_MS = 120000;
/** 建立连接 + 服务端处理的固定开销。 */
export const WEBDAV_BASE_TIMEOUT_MS = 60000;
/** 超时上限，防止慢链路下无限等待。 */
export const WEBDAV_MAX_TIMEOUT_MS = 30 * 60 * 1000;
/** 估算超时时假定的最低上行速度（保守值，实测家庭宽带上行约 200-290KB/s）。 */
export const WEBDAV_ASSUMED_MIN_BYTES_PER_SECOND = 128 * 1024;
/** 分片大小：4MB 在 128KB/s 的链路上约 32 秒，离 100 秒的时长墙有 3 倍余量。 */
export const WEBDAV_CHUNK_BYTES = 4 * 1024 * 1024;
/** 超过这个大小才走分片，小文件保持一次性 PUT（对第三方 WebDAV 服务最友好）。 */
export const WEBDAV_CHUNK_THRESHOLD_BYTES = 4 * 1024 * 1024;
/** 单个分片最多尝试几次（含首次）。 */
export const WEBDAV_MAX_ATTEMPTS = 3;
/** 小文件并发数：大文件一律串行，避免把上行带宽三等分。 */
export const WEBDAV_PARALLEL_SMALL_FILES = 3;
/** 与服务端约定的响应头（服务端见 canvas-webdav/server.js）。 */
export const WEBDAV_UPLOAD_OFFSET_HEADER = "X-Upload-Offset";
export const WEBDAV_UPLOAD_TOTAL_HEADER = "X-Upload-Total";
export const WEBDAV_UPLOAD_COMPLETE_HEADER = "X-Upload-Complete";

/**
 * 按体积推算这次请求该给多久超时。
 * 小文件保持 120 秒下限（老行为不变），大文件按 128KB/s 保守估算再留 60 秒余量。
 */
export function computeTransferTimeoutMs(bytes, floorMs = WEBDAV_MIN_TIMEOUT_MS) {
    const size = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
    const estimated = WEBDAV_BASE_TIMEOUT_MS + Math.ceil((size / WEBDAV_ASSUMED_MIN_BYTES_PER_SECOND) * 1000);
    return Math.min(WEBDAV_MAX_TIMEOUT_MS, Math.max(floorMs, estimated));
}

/** 第 attempt 次失败后等多久再试（attempt 从 1 开始），指数退避，封顶 8 秒。 */
export function retryDelayMs(attempt) {
    const step = Math.max(0, Number(attempt) - 1);
    return Math.min(8000, 500 * Math.pow(2, step));
}

/** 这些状态码值得重试：过载、限流、请求超时、服务端错误。 */
export function isRetryableStatus(status) {
    return status === 408 || status === 425 || status === 429 || status >= 500;
}

/**
 * 默认的可重试判断：看错误对象上的 retryable 标记（WebdavRequestError 会带上），
 * 没标记的一律当成可重试（网络抖动的可能性更大）。明确不可重试的错误必须自己标 false。
 */
export function defaultIsRetryableError(error) {
    const flag = error && typeof error === "object" ? error.retryable : undefined;
    return typeof flag === "boolean" ? flag : true;
}

/** 拼 Content-Range 头：`bytes <start>-<end>/<total>`。 */
export function formatContentRange(start, end, total) {
    return `bytes ${start}-${end}/${total}`;
}

/**
 * 读服务端回报的下一个写入位置。响应头拿不到就返回 null，交给调用方兜底。
 */
export function readOffsetHeader(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Math.floor(parsed);
}

/**
 * 这一片传完之后，下一片该从哪开始。
 * 服务端报的位置优先（它有最终裁定权），报的位置不合法就退回到「刚传完的那一片末尾」。
 * @returns {number} 下一个偏移量，等于 total 表示传完了
 */
export function resolveNextOffset(result, start, end, total) {
    const reported = result && result.nextOffset;
    if (typeof reported === "number" && Number.isFinite(reported) && reported > start && reported <= total) return reported;
    if (result && result.complete) return total;
    return Math.min(total, end + 1);
}

/** 默认的等待实现。 */
function defaultSleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 分片上传主循环。
 *
 * 大小不超过 thresholdBytes 时退化成「一片」= 一次完整的 PUT，行为和老版本一致。
 * 大文件按 chunkBytes 切片，逐片顺序上传：
 *   - 每片独立重试（可重试错误才重试），退避后重来；
 *   - 服务端回 409（写入位置对不上）时，以服务端给的 X-Upload-Offset 为准续传，
 *     最多允许重启一次，避免死循环；
 *   - 全程记录了 attempts / chunks / restarts，便于把过程报给用户和测试断言。
 *
 * @param {{ totalBytes: number, putChunk: (start: number, end: number, total: number) => Promise<{status:number, ok:boolean, complete:boolean, nextOffset:number|null}>, chunkBytes?: number, thresholdBytes?: number, maxAttempts?: number, sleep?: (ms:number)=>Promise<void>, isRetryableError?: (error:unknown)=>boolean, onRetry?: (attempt:number, start:number, error:unknown)=>void, onProgress?: (offset:number, total:number)=>void }} options
 * @returns {Promise<{chunks:number, attempts:number, restarts:number}>}
 */
export async function uploadBlobInChunks(options) {
    const total = Math.max(0, Math.floor(Number(options.totalBytes) || 0));
    const chunkBytes = Math.max(1, Math.floor(Number(options.chunkBytes) || WEBDAV_CHUNK_BYTES));
    const thresholdBytes = Math.max(1, Math.floor(Number(options.thresholdBytes) || WEBDAV_CHUNK_THRESHOLD_BYTES));
    const maxAttempts = Math.max(1, Math.floor(Number(options.maxAttempts) || WEBDAV_MAX_ATTEMPTS));
    const sleep = options.sleep || defaultSleep;
    const isRetryableError = options.isRetryableError || defaultIsRetryableError;
    /** 单片上传：小文件走这条路，等价于老版本的一次 PUT。 */
    const single = total <= thresholdBytes;
    /** 死循环保险丝：正常需要的片数再宽放三倍。 */
    const maxIterations = Math.ceil(total / chunkBytes) * 3 + 8;

    let offset = 0;
    let chunks = 0;
    let attempts = 0;
    let restarts = 0;
    let iterations = 0;

    while (offset < total) {
        iterations += 1;
        if (iterations > maxIterations) throw new Error(`WebDAV 分片上传迭代次数异常（offset=${offset}, total=${total}）`);
        const end = (single ? total : Math.min(offset + chunkBytes, total)) - 1;
        let attempt = 0;

        for (;;) {
            attempt += 1;
            attempts += 1;
            let result;
            try {
                result = await options.putChunk(offset, end, total);
            } catch (error) {
                // 认证失败、文件不存在这类错误重试多少次都一样，直接抛给上层
                if (attempt >= maxAttempts || !isRetryableError(error)) throw error;
                options.onRetry?.(attempt, offset, error);
                await sleep(retryDelayMs(attempt));
                continue;
            }
            if (result && result.ok) {
                chunks += 1;
                offset = resolveNextOffset(result, offset, end, total);
                options.onProgress?.(offset, total);
                break;
            }
            if (result && result.status === 409) {
                const serverOffset = result.nextOffset;
                if (typeof serverOffset === "number" && Number.isFinite(serverOffset) && serverOffset >= 0 && serverOffset < total && restarts < 1) {
                    // 服务端已经持久化的字节数和我们以为的不一样（比如上次同步中途断了），
                    // 以服务端为准继续，而不是整个文件重传。
                    restarts += 1;
                    offset = serverOffset;
                    options.onRetry?.(attempt, offset, new Error("远端写入位置与预期不一致"));
                    break;
                }
                throw new Error(`WebDAV 分片写入位置冲突（远端 ${serverOffset}）`);
            }
            throw new Error(`WebDAV 分片上传失败（HTTP ${result && result.status}）`);
        }
    }

    return { chunks, attempts, restarts };
}
