import axios from "axios";
import { nanoid } from "nanoid";

import i18n from "@/i18n";
import { resolveVideoModeForInput } from "@/lib/canvas/canvas-video-mode";
import { dataUrlToFile } from "@/lib/image-utils";
import { storeMediaBlob, uploadMediaFile, type UploadedFile } from "@/services/file-storage";
import { ensureSessionForProxy, persistRemoteMedia } from "@/services/backend-sync";
import { imageToDataUrl } from "@/services/image-storage";
import { boolConfig, buildApiUrl, modelOptionName, resolveModelRequestConfig, resolveModelScript, type AiConfig } from "@/stores/use-config-store";
import { runModelPlugin } from "./model-plugin";
import type { ReferenceImage } from "@/types/image";
import type { VideoGenerationMode } from "@/types/canvas";

export type VideoInput = {
    mode?: VideoGenerationMode;
    references?: ReferenceImage[];
    firstFrame?: ReferenceImage;
    lastFrame?: ReferenceImage;
};

export function buildVideoInput(config: Pick<AiConfig, "videoMode">, references: ReferenceImage[] = []): VideoInput {
    const mode = resolveVideoModeForInput(config.videoMode, references.length);
    if (mode === "keyframe") return { mode, firstFrame: references[0], lastFrame: references[1] };
    return { mode, references: mode === "reference" ? references : [] };
}
type VideoResponse = { id: string; status?: string; error?: { message?: string }; url?: string; result_url?: string; video_url?: string; content?: { video_url?: string; url?: string } | null };
type ApiVideoResponse = VideoResponse | { code?: number | string; data?: VideoResponse | null; msg?: string; message?: string; error?: { message?: string } };
type ApiEnvelope<T> = T | { code?: number | string; data?: T | null; msg?: string; message?: string; error?: { message?: string } };
type RequestOptions = { signal?: AbortSignal };
const apiText = (key: string, options?: Record<string, unknown>) => i18n.t(`apiErrors.${key}`, options);

export type VideoGenerationResult = { blob?: Blob; url?: string; mimeType?: string; taskId?: string };
export type VideoGenerationTask = { id: string; provider: "openai" | "plugin"; model: string };
export type VideoGenerationTaskState = { status: "pending" } | { status: "completed"; result: VideoGenerationResult } | { status: "failed"; error: string };

/** Results for scripted (plugin) video models, which run their own create+poll in one shot at task creation. */
const pluginVideoResults = new Map<string, VideoGenerationResult>();

function aiApiUrl(config: AiConfig, path: string) {
    return buildApiUrl(config.baseUrl, path);
}

/**
 * /agnes/ 由 nginx 用真会话把关（auth_request），所以本站路径必须带 cookie，
 * 否则免费试拍会直接 401。跨域渠道则不能带 —— 它们没有
 * Access-Control-Allow-Credentials，带上会被浏览器整体拒绝。
 */
function needsSameOriginCredentials(url: string) {
    if (!/^https?:/i.test(url)) return true;
    if (typeof window === "undefined") return false;
    try {
        return new URL(url).origin === window.location.origin;
    } catch {
        return false;
    }
}

/** 会话过期（12 小时）时自动续期一次再重试，避免「用了一上午突然点不动」。 */
async function withSessionRetry<T>(send: () => Promise<T>): Promise<T> {
    try {
        return await send();
    } catch (error) {
        if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error;
        if (!(await ensureSessionForProxy())) {
            try {
                const { useConfigStore } = await import("@/stores/use-config-store");
                useConfigStore.getState().openConfigDialog(false, "account");
            } catch {}
            throw new Error("请先在「配置 → 账号与云同步」登录账号后再使用平台模型通道");
        }
        return await send();
    }
}

function aiHeaders(config: AiConfig, contentType?: string) {
    return {
        Authorization: `Bearer ${config.apiKey}`,
        ...(contentType ? { "Content-Type": contentType } : {}),
    };
}

export async function requestVideoGeneration(config: AiConfig, prompt: string, input: ReferenceImage[] | VideoInput = [], options?: RequestOptions): Promise<VideoGenerationResult> {
    const task = await createVideoGenerationTask(config, prompt, input, options);
    for (let attempt = 0; attempt < 120; attempt += 1) {
        if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const state = await pollVideoGenerationTask(config, task, options);
        if (state.status === "completed") return state.result;
        if (state.status === "failed") throw new Error(state.error);
        if (attempt === 119) throw new Error(apiText("videoTimeout", { provider: "" }));
        await delay(2500, options?.signal);
    }
    throw new Error(apiText("videoTimeout", { provider: "" }));
}

export async function createVideoGenerationTask(config: AiConfig, prompt: string, input: ReferenceImage[] | VideoInput = [], options?: RequestOptions): Promise<VideoGenerationTask> {
    const selectedModel = (config.model || config.videoModel).trim();
    const requestConfig = resolveModelRequestConfig(config, selectedModel);
    const script = resolveModelScript(config, selectedModel);
    const videoInput = Array.isArray(input) ? { mode: config.videoMode, references: input } : input;
    if (script) return createPluginVideoTask(requestConfig, selectedModel, script, prompt, videoInput, options);
    assertVideoConfig(requestConfig, requestConfig.model);
    return createOpenAIVideoTask(requestConfig, selectedModel, prompt, videoInput, options);
}

export async function pollVideoGenerationTask(config: AiConfig, task: VideoGenerationTask, options?: RequestOptions): Promise<VideoGenerationTaskState> {
    if (task.provider === "plugin") {
        const result = pluginVideoResults.get(task.id);
        return result ? { status: "completed", result } : { status: "failed", error: apiText("pluginVideoExpired") };
    }
    const requestConfig = resolveModelRequestConfig(config, task.model);
    assertVideoConfig(requestConfig, requestConfig.model);
    return pollOpenAIVideoTask(requestConfig, task, options);
}

async function createPluginVideoTask(config: AiConfig, model: string, script: string, prompt: string, input: VideoInput, options?: RequestOptions): Promise<VideoGenerationTask> {
    if (!config.baseUrl.trim()) throw new Error(apiText("baseUrlRequired"));
    if (!config.apiKey.trim()) throw new Error(apiText("apiKeyRequired"));
    const images = [input.firstFrame, input.lastFrame, ...(input.references || [])].filter((image): image is ReferenceImage => Boolean(image));
    const refs = await Promise.all(images.map((image) => imageToDataUrl(image)));
    const result = videoPluginResult(
        await runModelPlugin({
            capability: "video",
            script,
            config,
            prompt,
            images: refs,
            params: {
                mode: input.mode || config.videoMode || "text",
                seconds: normalizeVideoSeconds(config.videoSeconds),
                size: normalizeVideoSize(config.size),
                resolution: normalizeVideoResolution(config.vquality),
                ratio: config.size,
                generateAudio: boolConfig(config.videoGenerateAudio, true),
                watermark: boolConfig(config.videoWatermark, false),
            },
            signal: options?.signal,
        }),
    );
    const id = nanoid();
    pluginVideoResults.set(id, result);
    return { id, provider: "plugin", model };
}

function videoPluginResult(result: unknown): VideoGenerationResult {
    if (result instanceof Blob) return { blob: result };
    if (typeof result === "string") return { url: result, mimeType: "video/mp4" };
    if (result && typeof result === "object") {
        const record = result as Record<string, unknown>;
        if (record.blob instanceof Blob) return { blob: record.blob };
        const url = [record.url, record.video_url, record.result_url].find((value) => typeof value === "string" && value) as string | undefined;
        // 紫域脚本会把上游任务号带回来（ziyuJobId）：有了它，落盘时就能顺带把
        // local_media_key 登记进 channel_usage，对账才看得到「这条任务存到哪了」。
        const taskId = [record.ziyuJobId, record.taskId].find((value) => typeof value === "string" && value) as string | undefined;
        if (url) return { url, mimeType: "video/mp4", taskId };
    }
    throw new Error(apiText("scriptNoVideo"));
}

/**
 * ★ 出片结果落盘（2026-09-14 修复收入级缺陷）。
 *
 * 旧实现让**浏览器**直接去上游 CDN 抓字节：Agnes 约 1 小时、紫域 24 小时就会清掉结果，
 * 而两家都不发 CORS 头，fetch 必被挡，异常又被 catch 静默吞掉，最后只留一个外链 ——
 * 用户付了钱出的片，第二天全变 404 且画布上没有副本。
 *
 * 现在改成三步，且第 2 步必须沿用服务端返回的 storageKey（本地与云上同一个键，
 * 同步时才不会被当成两个文件各传一遍）：
 *   1. 请服务端代抓 → 落进本站媒体库（media_files 留档 source_url）；
 *   2. 浏览器从本站媒体端点把副本取回，存进本地媒体库；
 *   3. 服务端不可用时才退回浏览器直连（对少数确实发了 CORS 头的渠道仍有效），
 *      再不行才降级成只留外链。
 */
export async function storeGeneratedVideo(result: VideoGenerationResult): Promise<UploadedFile> {
    if (result.blob) return uploadMediaFile(result.blob, "video");
    if (result.url) {
        try {
            const persisted = await persistRemoteMedia(result.url, "video", result.taskId);
            return await storeMediaBlob(persisted.storageKey, persisted.blob, persisted.mimeType || result.mimeType || "video/mp4");
        } catch {
            /* 落盘失败不阻断出片，继续尝试下面的退路 */
        }
        try {
            return await uploadMediaFile(result.url, "video");
        } catch {
            return { url: result.url, storageKey: "", bytes: 0, mimeType: result.mimeType || "video/mp4" };
        }
    }
    throw new Error(apiText("noPlayableVideo"));
}

async function createOpenAIVideoTask(config: AiConfig, model: string, prompt: string, input: VideoInput, options?: RequestOptions): Promise<VideoGenerationTask> {
    const mode = input.mode || config.videoMode || "text";
    const body = new FormData();
    body.append("model", modelOptionName(model));
    body.append("prompt", prompt);
    body.append("seconds", normalizeVideoSeconds(config.videoSeconds));
    if (normalizeVideoSize(config.size)) body.append("size", normalizeVideoSize(config.size)!);
    body.append("resolution_name", normalizeVideoResolution(config.vquality));
    body.append("preset", "normal");
    body.append("mode", mode);
    const appendFile = async (field: string, image: ReferenceImage) => body.append(field, await dataUrlToFile({ ...image, dataUrl: await imageToDataUrl(image) }));
    if (mode === "keyframe") {
        if (input.firstFrame) await appendFile("first_frame", input.firstFrame);
        if (input.lastFrame) await appendFile("last_frame", input.lastFrame);
    } else if (mode === "reference") {
        const files = await Promise.all((input.references || []).slice(0, 5).map(async (image) => dataUrlToFile({ ...image, dataUrl: await imageToDataUrl(image) })));
        files.forEach((file) => body.append("images[]", file));
    }
    try {
        const createUrl = aiApiUrl(config, "/videos");
        const created = unwrapVideoResponse(
            (
                await withSessionRetry(() =>
                    axios.post<ApiVideoResponse>(createUrl, body, {
                        headers: aiHeaders(config),
                        signal: options?.signal,
                        withCredentials: needsSameOriginCredentials(createUrl),
                    }),
                )
            ).data,
        );
        if (!created.id) throw new Error(apiText("noVideoTaskId"));
        return { id: created.id, provider: "openai", model };
    } catch (error) {
        throw new Error(readAxiosError(error, apiText("videoTaskCreateFailed")));
    }
}

async function pollOpenAIVideoTask(config: AiConfig, task: VideoGenerationTask, options?: RequestOptions): Promise<VideoGenerationTaskState> {
    try {
        const pollUrl = aiApiUrl(config, `/videos/${task.id}`);
        const video = unwrapVideoResponse(
            (
                await withSessionRetry(() =>
                    axios.get<ApiVideoResponse>(pollUrl, {
                        headers: aiHeaders(config),
                        signal: options?.signal,
                        withCredentials: needsSameOriginCredentials(pollUrl),
                    }),
                )
            ).data,
        );
        const url = videoResultUrl(video);
        if (url) return { status: "completed", result: await videoResultFromUrl(url, options) };
        if (video.status === "completed") {
            const contentUrl = aiApiUrl(config, `/videos/${task.id}/content`);
        const content = await withSessionRetry(() =>
            axios.get<Blob>(contentUrl, {
                headers: aiHeaders(config),
                responseType: "blob",
                signal: options?.signal,
                withCredentials: needsSameOriginCredentials(contentUrl),
            }),
        );
            await assertVideoBlob(content.data);
            return { status: "completed", result: { blob: content.data } };
        }
        if (video.status === "failed" || video.status === "cancelled") return { status: "failed", error: readApiErrorMessage(video.error?.message) || apiText("videoGenerationFailed") };
        return { status: "pending" };
    } catch (error) {
        throw new Error(readAxiosError(error, apiText("videoTaskQueryFailed")));
    }
}

async function videoResultFromUrl(url: string, options?: RequestOptions): Promise<VideoGenerationResult> {
    try {
        const response = await axios.get<Blob>(url, { responseType: "blob", signal: options?.signal });
        await assertVideoBlob(response.data);
        return { blob: response.data };
    } catch (error) {
        if (axios.isCancel(error) || options?.signal?.aborted) throw error;
        return { url, mimeType: "video/mp4" };
    }
}

function assertVideoConfig(config: AiConfig, model: string) {
    if (!model) throw new Error(apiText("videoModelRequired"));
    if (!config.baseUrl.trim()) throw new Error(apiText("baseUrlRequired"));
    if (!config.apiKey.trim()) throw new Error(apiText("apiKeyRequired"));
    if (config.apiFormat === "gemini") throw new Error(apiText("geminiVideoUnsupported"));
}

function normalizeVideoSeconds(value: string) {
    const seconds = Math.floor(Number(value) || 6);
    return String(Math.max(1, Math.min(20, seconds)));
}

function normalizeVideoSize(value: string) {
    if (value === "auto") return null;
    const size = value || "1280x720";
    if (/^\d+x\d+$/.test(size)) return size;
    return ["9:16", "2:3", "3:4"].includes(size) ? "720x1280" : "1280x720";
}

function normalizeVideoResolution(value: string) {
    if (value === "low") return "480p";
    if (value === "auto" || value === "high" || value === "medium") return "720p";
    const resolution = value.replace(/p$/i, "") || "720";
    return `${resolution}p`;
}

function unwrapVideoResponse(payload: ApiVideoResponse) {
    return unwrapEnvelope(payload, apiText("noVideoTask"));
}

function unwrapEnvelope<T>(payload: ApiEnvelope<T>, emptyMessage: string): T {
    if (!payload) throw new Error(emptyMessage);
    if (typeof payload === "object" && "code" in payload && payload.code !== undefined) {
        if (payload.code !== 0 && payload.code !== "0") throw new Error(readApiErrorMessage(payload) || apiText("requestFailed"));
        if (!payload.data) throw new Error(emptyMessage);
        return payload.data;
    }
    return payload as T;
}

function videoResultUrl(payload: VideoResponse) {
    return [payload.video_url, payload.result_url, payload.url, payload.content?.video_url, payload.content?.url].find((url) => typeof url === "string" && (isPublicMediaUrl(url) || /\.mp4(\?|#|$)/i.test(url)));
}

function readApiErrorMessage(value: unknown): string {
    if (!value) return "";
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            const inner = readApiErrorMessage(parsed) || value;
            if (inner === value && typeof parsed === "object" && Object.keys(parsed).length === 0) return "";
            return inner;
        } catch {
            if (/<[a-z][\s\S]*>/i.test(value)) return apiText("htmlError", { preview: `${value.slice(0, 80)}...` });
            return value;
        }
    }
    if (typeof value !== "object") return "";
    const payload = value as { msg?: unknown; message?: unknown; error?: unknown; detail?: unknown };
    // error may be a string or an object containing a message.
    const errorMsg =
        typeof payload.error === "string"
            ? payload.error
            : (payload.error as { message?: unknown })?.message;
    return (
        readApiErrorMessage(payload.msg) ||
        readApiErrorMessage(payload.message) ||
        readApiErrorMessage(errorMsg) ||
        readApiErrorMessage(payload.detail) ||
        ""
    );
}

function readAxiosError(error: unknown, fallback: string) {
    if (axios.isCancel(error)) return apiText("requestCanceled");
    if (axios.isAxiosError<{ error?: { message?: string }; msg?: string; message?: string; code?: number | string }>(error)) {
        if (!error.response && error.code === "ERR_NETWORK") return apiText("requestFailed");
        const responseData = error.response?.data;
        return readApiErrorMessage(responseData) || statusMessage(error.response?.status, fallback);
    }
    if (error instanceof DOMException && error.name === "AbortError") return apiText("requestCanceled");
    return error instanceof Error ? readApiErrorMessage(error.message) || error.message : fallback;
}

function statusMessage(status: number | undefined, fallback: string) {
    if (status === 401 || status === 403) return apiText("authenticationFailed");
    if (status === 429) return apiText("rateLimited");
    return status ? `${fallback}（${status}）` : fallback;
}

async function assertVideoBlob(blob: Blob) {
    if (!blob.type.includes("json")) return;
    let payload: { code?: number; msg?: string; error?: { message?: string } };
    try {
        payload = JSON.parse(await blob.text()) as { code?: number; msg?: string; error?: { message?: string } };
    } catch {
        return;
    }
    if (typeof payload.code === "number" && payload.code !== 0) throw new Error(readApiErrorMessage(payload) || apiText("videoDownloadFailed"));
    if (payload.error?.message) throw new Error(readApiErrorMessage(payload.error.message) || payload.error.message);
}

function isPublicMediaUrl(value: string) {
    return /^https?:\/\//i.test(value || "");
}

function delay(ms: number, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
        }
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener(
            "abort",
            () => {
                clearTimeout(timer);
                reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
        );
    });
}
