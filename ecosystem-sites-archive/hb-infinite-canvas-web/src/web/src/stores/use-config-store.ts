import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";

import i18n from "@/i18n";
import { AGNES_API_KEY, AGNES_BASE_URL } from "@/constant/env";
import { createDefaultZiyuChannel, isZiyuChannel, ZIYU_CHANNEL_ID, ZIYU_IMAGE_SCRIPT, ZIYU_VIDEO_SCRIPT } from "@/stores/channel-templates";

export type ApiCallFormat = "openai" | "gemini";
export type ModelCapability = "image" | "video" | "text" | "audio";
export type ReasoningEffort = "auto" | "low" | "medium" | "high" | "xhigh";

export type ChannelModel = {
    name: string;
    capability: ModelCapability;
    script?: string;
};

export type ModelChannel = {
    id: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    apiFormat: ApiCallFormat;
    models: ChannelModel[];
    /**
     * 单次请求允许生成的图片张数上限。
     * 有些渠道（如 OpenLux）对 n 的处理不老实：不报错，但会少给（实测 n=3 只返回 2 张）。
     * 这类渠道填 1，前端会拆成多次请求，保证用户选几张就出几张。
     * 留空表示不限制。
     */
    imageBatchLimit?: number;
    /**
     * 图生图改走 `/images/generations` + image 参数，而不是 multipart 的 `/images/edits`。
     * OpenLux 一类渠道的 edits 接口不可用（报 failed to parse multipart form），必须走这条。
     */
    editViaGenerations?: boolean;
};

export type AiConfig = {
    channelMode: "remote" | "local";
    baseUrl: string;
    apiKey: string;
    apiFormat: ApiCallFormat;
    channels: ModelChannel[];
    model: string;
    imageModel: string;
    videoModel: string;
    textModel: string;
    audioModel: string;
    audioVoice: string;
    audioFormat: string;
    audioSpeed: string;
    audioInstructions: string;
    videoSeconds: string;
    videoMode: "text" | "keyframe" | "reference";
    vquality: string;
    videoGenerateAudio: string;
    videoWatermark: string;
    systemPrompt: string;
    reasoningEffort: ReasoningEffort;
    models: string[];
    quality: string;
    size: string;
    background: string;
    count: string;
    canvasImageCount: string;
};

export type WebdavSyncConfig = {
    url: string;
    username: string;
    password: string;
    directory: string;
    lastSyncedAt: string;
};
export type ConfigTabKey = "channels" | "preferences" | "prompt-sources" | "account" | "webdav" | "local-storage";

export const CONFIG_STORE_KEY = "infinite-canvas:ai_config_store";
const CHANNEL_MODEL_SEPARATOR = "::";
// 默认渠道指向 McGrox（OpenAI 兼容中转）。原先写死 https://api.openai.com，但浏览器直连公网 OpenAI 必然 401，
// 用户第一次打开画布会以为画布坏了。改成预填中转地址后，用户只需粘贴自己的 Key 即可用。
const OPENAI_BASE_URL = "https://mcgrox.top";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";

// ---- Agnes 视频代理（本 fork 自带：本机由 scripts/windows/start.bat 拉起，服务器由 systemd 托管）----
export const LOCAL_AGNES_CHANNEL_ID = "agnes-local";
export const LOCAL_AGNES_MODEL = "agnes-video-2.5-flash";
export const LOCAL_AGNES_CHANNEL_NAME = "Agnes 视频代理";

/**
 * 占位 Key —— 服务器构建用。
 *
 * /agnes/ 的 Authorization 由 nginx 在服务端注入（proxy_set_header 会覆盖浏览器发来的同名头），
 * 所以前端只需要一个非空字符串来通过 assertVideoConfig 的校验，真 Key 永远不进 bundle。
 */
const AGNES_PROXY_PLACEHOLDER = "agnes-proxy";

/** Address baked into this build: /agnes when built for the server, http://localhost:8787 otherwise. */
const AGNES_URL = AGNES_BASE_URL;
/** Address every locally built bundle uses, and the one old configs in localStorage still carry. */
const LOCALHOST_AGNES_URL = "http://localhost:8787";

function normalizeUrl(value: string) {
    return (value || "").trim().toLowerCase().replace(/\/+$/, "");
}

/** True when the channel points at this build's proxy, or at the localhost address it replaced. */
function isLocalAgnesChannel(channel: ModelChannel) {
    const baseUrl = normalizeUrl(channel.baseUrl);
    return [AGNES_URL, "/agnes", "/api/agnes", LOCALHOST_AGNES_URL].some((url) => baseUrl === normalizeUrl(url) || baseUrl.startsWith(`${normalizeUrl(url)}/`));
}

/**
 * Server builds reach the proxy through the page's own origin, but a config saved from a private address
 * can still point at localhost, which then resolves to the visitor's own machine. Rewrite it to this
 * build's URL so the page just works; local builds and private-host visits are left alone.
 */
function retargetAgnesChannel(channels: ModelChannel[]): ModelChannel[] {
    if (normalizeUrl(AGNES_URL) === LOCALHOST_AGNES_URL) return channels;
    if (typeof window === "undefined") return channels;
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]") return channels;

    const index = channels.findIndex(isLocalAgnesChannel);
    if (index < 0) return channels;
    if (normalizeUrl(channels[index].baseUrl) === normalizeUrl(AGNES_URL)) return channels;
    const next = [...channels];
    next[index] = { ...channels[index], baseUrl: AGNES_URL };
    return next;
}

/**
 * Build the preset proxy channel. The key comes from VITE_AGNES_API_KEY, which start.bat injects
 * from agnes-video-proxy/.env (server builds inject PROXY_ACCESS_TOKEN); when it is empty the user can
 * still paste a key in the config panel.
 */
export function createLocalAgnesChannel(): ModelChannel {
    return {
        id: LOCAL_AGNES_CHANNEL_ID,
        name: LOCAL_AGNES_CHANNEL_NAME,
        baseUrl: AGNES_URL,
        apiKey: AGNES_API_KEY || AGNES_PROXY_PLACEHOLDER,
        apiFormat: "openai",
        models: [{ name: LOCAL_AGNES_MODEL, capability: "video" }],
    };
}

/**
 * Migration: persisted configs predate the preset channel, so `defaultConfig` alone cannot reach them.
 * Repoints a stale localhost address first, then adds the proxy channel when missing, and tops up its
 * key/model when the user left them blank.
 */
export function ensureLocalAgnesChannel(channels: ModelChannel[]): ModelChannel[] {
    const retargeted = retargetAgnesChannel(channels);
    const index = retargeted.findIndex(isLocalAgnesChannel);
    if (index < 0) return [...retargeted, createLocalAgnesChannel()];

    const existing = retargeted[index];
    const hasModel = existing.models.some((model) => model.name === LOCAL_AGNES_MODEL);
    const needsKey = !existing.apiKey.trim();
    if (hasModel && !needsKey) return retargeted;

    const next = [...retargeted];
    next[index] = {
        ...existing,
        apiKey: needsKey ? AGNES_API_KEY || AGNES_PROXY_PLACEHOLDER : existing.apiKey,
        models: hasModel ? existing.models : [...existing.models, { name: LOCAL_AGNES_MODEL, capability: "video" as const }],
    };
    return next;
}

/**
 * Migration: 紫域渠道默认注入。
 *
 * 为什么必须有它：紫域原先只作为「从模板添加」弹窗里的一条模板存在，而这里的 merge 会把
 * 渠道列表按 localStorage 重建 —— 只往 defaultConfig.channels 加一条，老用户永远看不到它。
 * 线上症状就是「渠道列表里根本没有紫域」，等于付费主链路没接上。
 *
 * 与 Agnes 的区别：Agnes 是免费试拍（自带默认模型），紫域是付费渠道，所以只补渠道本身，
 * 不动用户已经选好的 videoModel，避免把人的默认模型悄悄换掉。
 */
export function ensureDefaultZiyuChannel(channels: ModelChannel[]): ModelChannel[] {
    const fresh = createDefaultZiyuChannel();
    const filtered = channels.filter((c) => !isLocalAgnesChannel(c) && c.id !== "default");
    const migrated = filtered.map((channel) => {
        if (!isZiyuChannel(channel)) return channel;
        return {
            ...fresh,
            id: channel.id,
        };
    });
    if (migrated.some((channel) => channel.id === ZIYU_CHANNEL_ID)) return migrated;
    return [fresh, ...migrated];
}

export const defaultConfig: AiConfig = {
    channelMode: "local",
    baseUrl: OPENAI_BASE_URL,
    apiKey: "",
    apiFormat: "openai",
    channels: [
        {
            id: "default",
            name: i18n.t("config.channels.defaultName"),
            baseUrl: OPENAI_BASE_URL,
            apiKey: "",
            apiFormat: "openai",
            models: [
                { name: "gpt-image-2", capability: "image" },
                { name: "grok-imagine-video", capability: "video" },
                { name: "gpt-5.5", capability: "text" },
                { name: "gpt-4o-mini-tts", capability: "audio" },
            ],
        },
        createLocalAgnesChannel(),
        createDefaultZiyuChannel(),
    ],
    model: "ziyu::image2.5sunburst",
    imageModel: "ziyu::image2.5sunburst",
    videoModel: "ziyu::sd2.5",
    textModel: "default::gpt-5.5",
    audioModel: "default::gpt-4o-mini-tts",
    audioVoice: "alloy",
    audioFormat: "mp3",
    audioSpeed: "1",
    audioInstructions: "",
    videoSeconds: "6",
    videoMode: "text",
    vquality: "720",
    videoGenerateAudio: "true",
    videoWatermark: "false",
    systemPrompt: "",
    reasoningEffort: "auto",
    models: ["default::gpt-image-2", "default::grok-imagine-video", "default::gpt-5.5", "default::gpt-4o-mini-tts", `${LOCAL_AGNES_CHANNEL_ID}${CHANNEL_MODEL_SEPARATOR}${LOCAL_AGNES_MODEL}`],
    quality: "auto",
    size: "1:1",
    background: "",
    count: "1",
    canvasImageCount: "3",
};

export const defaultWebdavSyncConfig: WebdavSyncConfig = {
    url: "",
    username: "",
    password: "",
    directory: "infinite-canvas",
    lastSyncedAt: "",
};

type ConfigStore = {
    config: AiConfig;
    webdav: WebdavSyncConfig;
    isConfigOpen: boolean;
    configTab: ConfigTabKey;
    shouldPromptContinue: boolean;
    updateConfig: <K extends keyof AiConfig>(key: K, value: AiConfig[K]) => void;
    updateWebdavConfig: <K extends keyof WebdavSyncConfig>(key: K, value: WebdavSyncConfig[K]) => void;
    isAiConfigReady: (config: AiConfig, model: string) => boolean;
    openConfigDialog: (shouldPromptContinue?: boolean, tab?: ConfigTabKey) => void;
    setConfigDialogOpen: (isOpen: boolean) => void;
    clearPromptContinue: () => void;
};

const VIDEO_KEYWORDS = ["video", "sora", "veo", "kling", "wan", "hailuo"];

export function boolConfig(value: string, fallback: boolean) {
    return value ? value === "true" : fallback;
}
const AUDIO_KEYWORDS = ["audio", "tts", "speech", "voice", "music", "sound"];
const IMAGE_KEYWORDS = ["seedream", "gpt-image", "image", "dall-e", "dalle", "imagen", "flux", "sdxl", "stable-diffusion", "midjourney"];

/** Best-effort default capability for a freshly fetched model name; user can override in the channel editor. */
export function guessCapability(name: string): ModelCapability {
    const value = name.toLowerCase();
    if (VIDEO_KEYWORDS.some((keyword) => value.includes(keyword))) return "video";
    if (AUDIO_KEYWORDS.some((keyword) => value.includes(keyword))) return "audio";
    if (IMAGE_KEYWORDS.some((keyword) => value.includes(keyword))) return "image";
    return "text";
}

function findChannelModel(config: AiConfig, value: string): { channel: ModelChannel; model: ChannelModel } | null {
    const decoded = decodeChannelModel(value);
    const name = decoded?.model || value;
    const channel = decoded ? config.channels.find((item) => item.id === decoded.channelId) : config.channels.find((item) => item.models.some((model) => model.name === name));
    const model = channel?.models.find((item) => item.name === name);
    return channel && model ? { channel, model } : null;
}

export function modelCapabilityOf(config: AiConfig, value: string): ModelCapability | undefined {
    return findChannelModel(config, value)?.model.capability;
}

export function modelMatchesCapability(config: AiConfig, value: string, capability?: ModelCapability) {
    if (!capability) return true;
    return modelCapabilityOf(config, value) === capability;
}

export function resolveModelForCapability(config: AiConfig, currentModel: string | undefined, capability: ModelCapability) {
    const defaultModel = capability === "image" ? config.imageModel : capability === "video" ? config.videoModel : capability === "audio" ? config.audioModel : config.textModel;
    const fallbackModel = capability === "image" ? defaultConfig.imageModel : capability === "video" ? defaultConfig.videoModel : capability === "audio" ? defaultConfig.audioModel : defaultConfig.textModel;
    if (currentModel && modelMatchesCapability(config, currentModel, capability)) return currentModel;
    if (defaultModel && modelMatchesCapability(config, defaultModel, capability)) return defaultModel;
    return fallbackModel;
}

export function selectableModelsByCapability(config: AiConfig, capability?: ModelCapability) {
    if (!capability) return config.models;
    return config.channels.flatMap((channel) => channel.models.filter((model) => model.capability === capability && !(capability === "video" && model.name === "agnes-video-2.5")).map((model) => encodeChannelModel(channel.id, model.name)));
}

/** The user script (if any) attached to a model; empty string means use the system default call. */
export function resolveModelScript(config: AiConfig, value: string) {
    const found = findChannelModel(config, value);
    const explicit = found?.model.script?.trim() || "";
    if (explicit) return explicit;
    if (found && isZiyuChannel(found.channel)) {
        return found.model.capability === "image" ? ZIYU_IMAGE_SCRIPT : ZIYU_VIDEO_SCRIPT;
    }
    return "";
}

function isAiConfigReady(config: AiConfig, model: string) {
    const channel = resolveModelChannel(config, model);
    return Boolean(model.trim() && channel.baseUrl.trim() && channel.apiKey.trim());
}

export const useConfigStore = create<ConfigStore>()(
    persist(
        (set, get) => ({
            config: defaultConfig,
            webdav: defaultWebdavSyncConfig,
            isConfigOpen: false,
            configTab: "channels",
            shouldPromptContinue: false,
            updateConfig: (key, value) =>
                set((state) => ({
                    config: {
                        ...state.config,
                        [key]: value,
                    },
                })),
            updateWebdavConfig: (key, value) =>
                set((state) => ({
                    webdav: {
                        ...state.webdav,
                        [key]: value,
                    },
                })),
            isAiConfigReady: (config, model) => isAiConfigReady(config, model),
            openConfigDialog: (shouldPromptContinue = false, configTab = "channels") => set({ isConfigOpen: true, shouldPromptContinue, configTab }),
            setConfigDialogOpen: (isConfigOpen) => set({ isConfigOpen }),
            clearPromptContinue: () => set({ shouldPromptContinue: false }),
        }),
        {
            name: CONFIG_STORE_KEY,
            partialize: (state) => ({ config: state.config, webdav: state.webdav }),
            merge: (persisted, current) => {
                const persistedState = (persisted || {}) as Partial<ConfigStore>;
                const persistedConfig = (persistedState.config || {}) as Partial<AiConfig>;
                const persistedWebdav = (persistedState.webdav || {}) as Partial<WebdavSyncConfig>;
                const config = { ...defaultConfig, ...persistedConfig };
                if (!Array.isArray(persistedConfig.channels)) config.channels = [];
                const channels = ensureDefaultZiyuChannel(normalizeChannels(config));
                const models = modelOptionsFromChannels(channels);
                return {
                    ...current,
                    webdav: { ...defaultWebdavSyncConfig, ...persistedWebdav },
                    config: {
                        ...config,
                        channelMode: "local",
                        apiFormat: normalizeApiFormat(config.apiFormat),
                        channels,
                        models,
                        imageModel: normalizeModelOptionValue(config.imageModel || config.model, channels),
                        videoModel: normalizeModelOptionValue(config.videoModel, channels),
                        textModel: normalizeModelOptionValue(config.textModel || config.model, channels),
                        audioModel: normalizeModelOptionValue(config.audioModel || defaultConfig.audioModel, channels),
                        audioVoice: config.audioVoice || defaultConfig.audioVoice,
                        audioFormat: config.audioFormat || defaultConfig.audioFormat,
                        audioSpeed: config.audioSpeed || defaultConfig.audioSpeed,
                        audioInstructions: config.audioInstructions || "",
                        reasoningEffort: config.reasoningEffort || "auto",
                        videoSeconds: config.videoSeconds || "6",
                        videoMode: config.videoMode === "keyframe" || config.videoMode === "reference" ? config.videoMode : "text",
                        vquality: config.vquality || "720",
                        videoGenerateAudio: config.videoGenerateAudio || "true",
                        videoWatermark: config.videoWatermark || "false",
                        canvasImageCount: config.canvasImageCount || "3",
                    },
                };
            },
        },
    ),
);

export function useEffectiveConfig() {
    const config = useConfigStore((state) => state.config);
    return useMemo(() => ({ ...config, channelMode: "local" as const }), [config]);
}

/** Normalize a mixed list of raw model names or model objects into deduped ChannelModel entries. */
export function normalizeChannelModels(models: Array<string | ChannelModel> | undefined): ChannelModel[] {
    const seen = new Set<string>();
    const result: ChannelModel[] = [];
    for (const item of models || []) {
        const name = (typeof item === "string" ? item : item?.name || "").trim();
        if (!name || seen.has(name)) continue;
        seen.add(name);
        const capability = typeof item === "string" ? guessCapability(name) : item.capability || guessCapability(name);
        const script = typeof item === "string" ? undefined : item.script?.trim() || undefined;
        result.push({ name, capability, script });
    }
    return result;
}

export function createModelChannel(channel?: Partial<ModelChannel>): ModelChannel {
    const apiFormat = normalizeApiFormat(channel?.apiFormat);
    return {
        id: channel?.id?.trim() || nanoid(),
        name: channel?.name?.trim() || i18n.t("config.channels.newName"),
        baseUrl: channel?.baseUrl?.trim() || defaultBaseUrlForApiFormat(apiFormat),
        apiKey: channel?.apiKey || "",
        apiFormat,
        models: normalizeChannelModels(channel?.models),
        ...(channel?.imageBatchLimit ? { imageBatchLimit: channel.imageBatchLimit } : {}),
        ...(channel?.editViaGenerations ? { editViaGenerations: true } : {}),
    };
}

export function encodeChannelModel(channelId: string, model: string) {
    return `${channelId}${CHANNEL_MODEL_SEPARATOR}${model.trim()}`;
}

export function isChannelModelValue(value: string) {
    return value.includes(CHANNEL_MODEL_SEPARATOR);
}

export function decodeChannelModel(value: string) {
    const index = value.indexOf(CHANNEL_MODEL_SEPARATOR);
    if (index < 0) return null;
    return { channelId: value.slice(0, index), model: value.slice(index + CHANNEL_MODEL_SEPARATOR.length) };
}

export function modelOptionName(value: string) {
    return decodeChannelModel(value)?.model || value;
}

export function modelOptionLabel(config: AiConfig, value: string) {
    const decoded = decodeChannelModel(value);
    if (!decoded) return value;
    const channel = config.channels.find((item) => item.id === decoded.channelId);
    return channel ? `${decoded.model}（${channel.name}）` : decoded.model;
}

export function modelOptionsFromChannels(channels: ModelChannel[]) {
    return uniqueModelOptions(channels.flatMap((channel) => channel.models.map((model) => encodeChannelModel(channel.id, model.name))));
}

export function normalizeModelOptionValue(value: string | undefined, channels: ModelChannel[]) {
    const model = (value || "").trim();
    if (!model) return "";
    const decoded = decodeChannelModel(model);
    if (decoded) {
        const channel = channels.find((item) => item.id === decoded.channelId);
        return channel && channel.models.some((item) => item.name === decoded.model) ? model : "";
    }
    const channel = channels.find((item) => item.models.some((entry) => entry.name === model)) || channels[0];
    return channel && channel.models.some((item) => item.name === model) ? encodeChannelModel(channel.id, model) : model;
}

export function resolveModelChannel(config: AiConfig, value: string) {
    const decoded = decodeChannelModel(value);
    const model = decoded?.model || value;
    const matched = decoded ? config.channels.find((channel) => channel.id === decoded.channelId) : config.channels.find((channel) => channel.models.some((item) => item.name === model));
    return matched || config.channels[0] || createModelChannel({ id: "default", name: i18n.t("config.channels.defaultName"), baseUrl: config.baseUrl, apiKey: config.apiKey, apiFormat: config.apiFormat, models: config.models.map(modelOptionName).map((name) => ({ name, capability: guessCapability(name) })) });
}

export function resolveModelRequestConfig(config: AiConfig, value: string) {
    const channel = resolveModelChannel(config, value);
    return {
        ...config,
        model: modelOptionName(value || config.model),
        baseUrl: channel.baseUrl,
        apiKey: channel.apiKey,
        apiFormat: channel.apiFormat,
        imageBatchLimit: channel.imageBatchLimit,
        editViaGenerations: channel.editViaGenerations,
    };
}

function normalizeChannels(config: AiConfig) {
    const persistedChannels = Array.isArray(config.channels) ? config.channels : [];
    const channels = persistedChannels.map((channel, index) =>
        createModelChannel({
            ...channel,
            id: channel.id || (index === 0 ? "default" : `channel-${index + 1}`),
            name: channel.name || (index === 0 ? i18n.t("config.channels.defaultName") : i18n.t("config.channels.indexedName", { index: index + 1 })),
            models: normalizeChannelModels(channel.models),
        }),
    );
    if (!channels.length) {
        channels.push(
            createModelChannel({
                id: "default",
                name: i18n.t("config.channels.defaultName"),
                baseUrl: config.baseUrl || defaultConfig.baseUrl,
                apiKey: config.apiKey || "",
                apiFormat: config.apiFormat || defaultConfig.apiFormat,
                models: normalizeChannelModels([config.model, config.imageModel, config.videoModel, config.textModel, config.audioModel].map(modelOptionName)),
            }),
        );
    }
    return channels;
}

export function defaultBaseUrlForApiFormat(apiFormat: ApiCallFormat) {
    if (apiFormat === "gemini") return GEMINI_BASE_URL;
    return OPENAI_BASE_URL;
}

function normalizeApiFormat(apiFormat: unknown): ApiCallFormat {
    return apiFormat === "gemini" ? apiFormat : "openai";
}

function uniqueModelOptions(models: string[]) {
    return Array.from(new Set((models || []).map((model) => model.trim()).filter(Boolean)));
}

export function buildApiUrl(baseUrl: string, path: string) {
    const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
    const lowerBaseUrl = normalizedBaseUrl.toLowerCase();
    const apiBaseUrl = lowerBaseUrl.endsWith("/v1") ? normalizedBaseUrl : `${normalizedBaseUrl}/v1`;
    return `${apiBaseUrl}${path}`;
}
