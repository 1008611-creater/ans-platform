import {
  DURATION_OPTIONS,
  RATIO_OPTIONS,
  type CreateGenerationInput,
  type MediaAsset,
  type VideoDuration,
  type VideoMode,
  type VideoRatio
} from "./types";

const validModes = new Set<VideoMode>(["text", "first-frame", "first-last", "references"]);
const validRatios = new Set<VideoRatio>(RATIO_OPTIONS.map((item) => item.value));
const validDurations = new Set<VideoDuration>(DURATION_OPTIONS.map((item) => item.value));

export function validateGenerationInput(input: CreateGenerationInput) {
  const prompt = input.prompt.trim();
  const assets = input.assets ?? [];

  if (!prompt && input.mode === "text") {
    throw new Error("请输入视频描述。");
  }

  if (!validModes.has(input.mode)) {
    throw new Error("生成模式无效。");
  }

  if (!validRatios.has(input.ratio)) {
    throw new Error("视频比例不支持。");
  }

  if (!validDurations.has(input.durationSeconds)) {
    throw new Error("Seedance 2.0 时长仅支持 4-15 秒或智能时长。");
  }

  if (input.resolution !== "720p") {
    throw new Error("当前周卡权益固定为 720p。");
  }

  const images = assets.filter((asset) => asset.kind === "image");
  const videos = assets.filter((asset) => asset.kind === "video");
  const audios = assets.filter((asset) => asset.kind === "audio");

  if (assets.some((asset) => asset.size > maxAssetBytes(asset.kind))) {
    throw new Error("素材过大，请先压缩后再上传。");
  }

  if (input.mode === "first-frame" && images.length !== 1) {
    throw new Error("首帧图生模式需要上传 1 张图片。");
  }

  if (input.mode === "first-last" && images.length !== 2) {
    throw new Error("首尾帧模式需要上传 2 张图片。");
  }

  if (input.mode === "references") {
    if (images.length > 9 || videos.length > 3 || audios.length > 3) {
      throw new Error("参考素材最多 9 张图、3 段视频、3 段音频。");
    }

    if (audios.length > 0 && images.length + videos.length === 0) {
      throw new Error("音频不能单独作为参考素材。");
    }
  }

  return {
    ...input,
    prompt,
    assets: assignAssetRoles(input.mode, assets),
    privacy: input.privacy ?? "private",
    generateAudio: Boolean(input.generateAudio)
  };
}

export function assignAssetRoles(mode: VideoMode, assets: MediaAsset[]) {
  if (mode === "first-frame") {
    return assets.slice(0, 1).map((asset) => ({ ...asset, role: "first_frame" as const }));
  }

  if (mode === "first-last") {
    return assets.slice(0, 2).map((asset, index) => ({
      ...asset,
      role: index === 0 ? ("first_frame" as const) : ("last_frame" as const)
    }));
  }

  if (mode === "references") {
    return assets.map((asset) => {
      if (asset.kind === "video") return { ...asset, role: "reference_video" as const };
      if (asset.kind === "audio") return { ...asset, role: "reference_audio" as const };
      return { ...asset, role: "reference_image" as const };
    });
  }

  return [];
}

export function maxAssetBytes(kind: MediaAsset["kind"]) {
  if (kind === "video") return 50 * 1024 * 1024;
  if (kind === "audio") return 15 * 1024 * 1024;
  return 30 * 1024 * 1024;
}

export function titleFromPrompt(prompt: string) {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (!cleaned) return "未命名视频";
  return cleaned.slice(0, 22);
}

export function coverForRatio(ratio: VideoRatio, index: number) {
  const covers = [
    "/assets/poster-beach.svg",
    "/assets/poster-city.svg",
    "/assets/poster-forest.svg",
    "/assets/poster-mountain.svg",
    "/assets/poster-product.svg",
    "/assets/poster-fashion.svg",
    "/assets/poster-lab.svg"
  ];

  if (ratio === "9:16" || ratio === "3:4") return covers[(index + 5) % covers.length];
  if (ratio === "1:1") return covers[(index + 4) % covers.length];
  if (ratio === "21:9") return covers[(index + 1) % covers.length];
  return covers[index % covers.length];
}
