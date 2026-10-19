import type { Generation, GenerationStatus, MediaAsset, VideoProviderMode, VideoRatio } from "./types";

type SeedanceCreateResult = {
  providerTaskId: string;
};

type VideoProviderCreateResult = SeedanceCreateResult & {
  status?: GenerationStatus;
  videoUrl?: string;
  coverUrl?: string;
  lastFrameUrl?: string;
  errorMessage?: string;
};

type SeedanceTaskResult = {
  status: GenerationStatus;
  videoUrl?: string;
  lastFrameUrl?: string;
  errorMessage?: string;
};

const apiBase = process.env.SEEDANCE_API_BASE ?? "https://ark.cn-beijing.volces.com";
const modelId = process.env.SEEDANCE_MODEL_ID ?? "doubao-seedance-2-5-260628";
const defaultDoubao2ApiBase = "http://127.0.0.1:7872/v1";

function apiKey() {
  return process.env.BYTEPLUS_API_KEY ?? process.env.ARK_API_KEY;
}

export function isSeedanceConfigured() {
  return Boolean(apiKey());
}

export function isDoubao2ApiConfigured() {
  return Boolean(
    process.env.VIDEO_PROVIDER === "doubao2api" ||
      process.env.DOUBAO2API_PROXY_BASE_URL ||
      process.env.DOUBAO2API_BASE_URL
  );
}

export function configuredVideoProvider(): VideoProviderMode {
  const requested = normalizeProviderMode(process.env.VIDEO_PROVIDER);

  if (requested === "seedance") return isSeedanceConfigured() ? "seedance" : "manual";
  if (requested === "doubao2api") return "doubao2api";
  if (requested === "manual") return "manual";

  if (isSeedanceConfigured()) return "seedance";
  if (isDoubao2ApiConfigured()) return "doubao2api";
  return "manual";
}

export function isVideoProviderConfigured() {
  return configuredVideoProvider() !== "manual";
}

export async function createVideoProviderTask(generation: Generation): Promise<VideoProviderCreateResult> {
  if (generation.provider === "doubao2api") return createDoubao2ApiVideo(generation);
  if (generation.provider === "seedance") return createSeedanceTask(generation);
  throw new Error("当前为人工制作通道，不能直接创建实时任务。");
}

function resolveVolcVideoModel(requested?: string) {
  const m = String(requested ?? "").trim().toLowerCase();
  if (m === "sd2" || m === "doubao-seedance-2-0-260128") return "doubao-seedance-2-0-260128";
  if (m === "sd2fast" || m === "doubao-seedance-2-0-fast-260128") return "doubao-seedance-2-0-fast-260128";
  if (m === "sd2.5" || m === "doubao-seedance-2-5-260628") return "doubao-seedance-2-5-260628";
  return modelId;
}

export async function createSeedanceTask(generation: Generation): Promise<SeedanceCreateResult> {
  const key = apiKey();
  if (!key) throw new Error("未配置火山方舟 ARK_API_KEY。");

  const content = buildContent(generation);
  const hasFirstFrame = content.some((item) => item.role === "first_frame");
  const resolvedDuration = generation.durationSeconds > 0 ? generation.durationSeconds : 5;
  const body: Record<string, unknown> = {
    model: resolveVolcVideoModel(generation.model),
    content,
    resolution: generation.resolution || "720p",
    duration: resolvedDuration,
    framespersecond: 24,
    generate_audio: generation.generateAudio !== false,
    watermark: false
  };
  if (!hasFirstFrame && generation.ratio && generation.ratio !== "adaptive") {
    body.ratio = generation.ratio;
  }

  const response = await fetch(`${apiBase}/api/v3/contents/generations/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(providerError(payload, `Seedance 创建任务失败：${response.status}`));
  }

  const providerTaskId = payload.id ?? payload.task_id ?? payload.data?.id;
  if (!providerTaskId) {
    throw new Error("Seedance 创建任务成功，但未返回任务 ID。");
  }

  return { providerTaskId };
}

export async function createDoubao2ApiVideo(generation: Generation): Promise<VideoProviderCreateResult> {
  const body: Record<string, unknown> = {
    model: process.env.DOUBAO2API_VIDEO_MODEL ?? "doubao-video",
    prompt: providerPrompt(generation),
    ratio: doubaoRatio(generation.ratio),
    duration: generation.durationSeconds,
    generate_audio: generation.generateAudio,
    assets: generation.assets
  };

  const image = firstReferenceImage(generation.assets);
  if (image?.url && looksLikeTosKey(image.url)) {
    body.ref_image_key = image.url;
  } else if (image?.dataUrl || image?.url) {
    body.ref_image_data_url = image.dataUrl ?? image.url;
    body.ref_image_name = image.name;
    body.ref_image_mime_type = image.mimeType;
  }

  const payload = await postDoubao2Api("/video/generations", body, Number(process.env.DOUBAO2API_TIMEOUT_MS ?? 180000));
  const video = Array.isArray(payload.data) ? payload.data[0] : undefined;
  const providerTaskId = `doubao2api_${generation.id}`;

  if (!video?.video_url && payload.message) {
    return {
      providerTaskId,
      status: "failed",
      errorMessage: String(payload.message)
    };
  }

  if (!video?.video_url) {
    return {
      providerTaskId,
      status: "failed",
      errorMessage: "doubao2api 未返回视频地址。"
    };
  }

  return {
    providerTaskId,
    status: "succeeded",
    videoUrl: video.video_url,
    coverUrl: video.cover_url,
    lastFrameUrl: video.last_frame_url
  };
}

export async function createDoubao2ApiImage(input: {
  prompt: string;
  ratio?: string;
  size?: string;
  refImageDataUrl?: string;
  refImageName?: string;
  refImageMimeType?: string;
}) {
  const body: Record<string, unknown> = {
    model: process.env.DOUBAO2API_IMAGE_MODEL ?? "doubao-image",
    prompt: input.prompt,
    ratio: input.ratio,
    size: input.size
  };

  if (input.refImageDataUrl) {
    body.ref_image_data_url = input.refImageDataUrl;
    body.ref_image_name = input.refImageName;
    body.ref_image_mime_type = input.refImageMimeType;
  }

  return postDoubao2Api("/images/generations", body, Number(process.env.DOUBAO2API_TIMEOUT_MS ?? 180000));
}

export async function createDoubao2ApiMusic(input: {
  prompt: string;
  genre?: string;
  lyric?: string;
  mood?: string;
  gender?: string;
  theme?: string;
  generationType?: string;
}) {
  return postDoubao2Api(
    "/audio/generations",
    {
      model: process.env.DOUBAO2API_AUDIO_MODEL ?? "doubao-music",
      prompt: input.prompt,
      genre: input.genre,
      lyric: input.lyric,
      mood: input.mood,
      gender: input.gender,
      theme: input.theme,
      generation_type: input.generationType
    },
    Number(process.env.DOUBAO2API_TIMEOUT_MS ?? 180000)
  );
}

export async function retrieveSeedanceTask(providerTaskId: string): Promise<SeedanceTaskResult> {
  const key = apiKey();
  if (!key) throw new Error("未配置 BYTEPLUS_API_KEY。");

  const response = await fetch(`${apiBase}/api/v3/contents/generations/tasks/${providerTaskId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(providerError(payload, `Seedance 查询任务失败：${response.status}`));
  }

  return normalizeProviderTask(payload);
}

export function normalizeProviderTask(payload: Record<string, any>): SeedanceTaskResult {
  const status = String(payload.status ?? payload.data?.status ?? "queued");
  const normalizedStatus: GenerationStatus =
    status === "succeeded" || status === "failed" || status === "expired"
      ? status
      : status === "running"
        ? "running"
        : "queued";

  return {
    status: normalizedStatus,
    videoUrl: payload.content?.video_url ?? payload.data?.content?.video_url,
    lastFrameUrl: payload.content?.last_frame_url ?? payload.data?.content?.last_frame_url,
    errorMessage: payload.error?.message ?? payload.message ?? payload.data?.error?.message
  };
}

function buildContent(generation: Generation) {
  const content: Record<string, unknown>[] = [];
  const text = [generation.prompt, generation.style ? `风格：${generation.style}` : ""].filter(Boolean).join("\n");

  if (text) {
    content.push({
      type: "text",
      text
    });
  }

  for (const asset of generation.assets) {
    const url = asset.url ?? asset.dataUrl;
    if (!url) continue;
    content.push(assetToProviderContent(asset, url));
  }

  return content;
}

function assetToProviderContent(asset: MediaAsset, url: string) {
  if (asset.kind === "video") {
    return {
      type: "video_url",
      role: asset.role,
      video_url: { url }
    };
  }

  if (asset.kind === "audio") {
    return {
      type: "audio_url",
      role: asset.role,
      audio_url: { url }
    };
  }

  return {
    type: "image_url",
    role: asset.role,
    image_url: { url }
  };
}

function providerError(payload: Record<string, any>, fallback: string) {
  return payload?.error?.message ?? payload?.message ?? payload?.data?.error?.message ?? fallback;
}

function normalizeProviderMode(value: unknown): VideoProviderMode | undefined {
  if (value === "manual" || value === "seedance" || value === "doubao2api") return value;
  return undefined;
}

function doubao2ApiBase() {
  return (process.env.DOUBAO2API_PROXY_BASE_URL ?? process.env.DOUBAO2API_BASE_URL ?? defaultDoubao2ApiBase).replace(/\/+$/, "");
}

function doubao2ApiHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  const key = process.env.DOUBAO2API_API_KEY?.trim();
  if (key) headers.Authorization = `Bearer ${key}`;
  return headers;
}

async function postDoubao2Api(pathname: string, body: Record<string, unknown>, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${doubao2ApiBase()}${pathname}`, {
      method: "POST",
      headers: doubao2ApiHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(providerError(payload, `doubao2api 请求失败：${response.status}`));
    }
    return payload as Record<string, any>;
  } finally {
    clearTimeout(timeout);
  }
}

function providerPrompt(generation: Generation) {
  return [generation.prompt, generation.style ? `风格：${generation.style}` : ""].filter(Boolean).join("\n");
}

function doubaoRatio(ratio: VideoRatio) {
  return ratio === "adaptive" ? undefined : ratio;
}

function firstReferenceImage(assets: MediaAsset[]) {
  const rank = (asset: MediaAsset) => {
    if (asset.role === "first_frame") return 0;
    if (asset.role === "reference_image") return 1;
    if (asset.role === "last_frame") return 2;
    return 3;
  };

  return [...assets].filter((asset) => asset.kind === "image").sort((a, b) => rank(a) - rank(b))[0];
}

function looksLikeTosKey(value: string) {
  return /^tos-cn-/i.test(value) || /^tos-/i.test(value);
}
