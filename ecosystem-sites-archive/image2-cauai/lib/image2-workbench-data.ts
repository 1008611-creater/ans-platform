import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  isSupabaseWorkbenchEnabled,
  readCloudWorkbenchAssets,
  readCloudWorkbenchFeedback,
  saveCloudWorkbenchAsset,
  saveCloudWorkbenchFeedback
} from "./image2-workbench-cloud";

export type WorkbenchAssetGroup = "人物" | "服装" | "场景" | "动作" | "结果";

export type WorkbenchAssetKind = "person" | "clothing" | "scene" | "motion" | "result";

export type WorkbenchAsset = {
  id: string;
  kind: WorkbenchAssetKind;
  group: WorkbenchAssetGroup;
  title: string;
  subtitle: string;
  note: string;
  sourcePath: string;
  previewPath: string;
  tags: string[];
  promptHint: string;
  ratio?: string;
  origin?: "master" | "upload" | "generated";
  stage?: WorkbenchPromptTemplateStage;
  createdAt?: string;
  prompt?: string;
};

export type WorkbenchPromptTemplateStage = "outfit" | "first-frame";

export type WorkbenchFeedbackStage = WorkbenchPromptTemplateStage | "manual";

export type WorkbenchFeedbackRating = "usable" | "needs-fix" | "reject";

export type WorkbenchFeedback = {
  id: string;
  assetId: string;
  stage: WorkbenchFeedbackStage;
  rating: WorkbenchFeedbackRating;
  reasons: string[];
  note?: string;
  prompt?: string;
  referenceIds: string[];
  createdAt: string;
};

export type WorkbenchFeedbackStats = {
  total: number;
  usable: number;
  needsFix: number;
  reject: number;
  latestAt?: string;
};

export type WorkbenchPromptTemplate = {
  id: string;
  stage: WorkbenchPromptTemplateStage;
  title: string;
  summary: string;
  prompt: string;
  tags: string[];
};

export type WorkbenchCase = {
  id: number;
  title: string;
  categoryLabel: string;
  imageUrl: string;
  imageAlt: string;
  promptPreview: string;
  sourceLabel?: string;
  valueTier: string;
  valueScore: number;
  sourceNote?: string;
};

export type WorkbenchMetric = {
  label: string;
  value: string;
  detail: string;
};

export type WorkbenchArtifactPaths = {
  mainImage?: string;
  contactSheet?: string;
  middleFrameGrid?: string;
};

export type WorkbenchReferenceLink = {
  label: string;
  href: string;
  note: string;
};

export type Image2WorkbenchData = {
  sourceLabel: string;
  metrics: WorkbenchMetric[];
  assets: WorkbenchAsset[];
  feedback: WorkbenchFeedback[];
  feedbackStats: WorkbenchFeedbackStats;
  promptTemplates: WorkbenchPromptTemplate[];
  featuredCases: WorkbenchCase[];
  artifactPaths: WorkbenchArtifactPaths;
  referenceLinks: WorkbenchReferenceLink[];
  updatedAt: string;
  access?: WorkbenchAccessState;
};

export type Image2PublicHomeData = {
  featuredCases: WorkbenchCase[];
  updatedAt: string;
};

export type WorkbenchAccessState = {
  email?: string;
  isAuthenticated: boolean;
  isTeamMember: boolean;
  message?: string;
  mode: "public" | "team";
};

const outputRoot = path.resolve(
  process.env.DAIHUO_OUTPUT_ROOT || (process.env.VERCEL ? "/tmp/daihuo-output" : "D:/codex-work/daihuo/output")
);
const workbenchLibraryRoot = path.join(outputRoot, "image2-workbench-library");
const workbenchLibraryManifestPath = path.join(workbenchLibraryRoot, "assets.json");
const workbenchFeedbackPath = path.join(workbenchLibraryRoot, "feedback.json");
const matrixManifestPath = path.join(
  outputRoot,
  "person-dress-product-photo-runs",
  "2026-05-22-R008-matrix-3x3x5",
  "matrix-assets.json"
);
const caseLibraryPath = path.join(process.cwd(), "public", "data", "image2-case-library.json");
const currentHeroPath = path.join(
  outputRoot,
  "person-dress-product-photo-runs",
  "2026-05-24-R018-static-matrix-v2",
  "person-scenes",
  "D01",
  "ab500156-eb3c-43f1-bfc8-a3189ab0ed85.png"
);
const currentMainAssetPath = path.join(
  outputRoot,
  "person-dress-product-photo-runs",
  "2026-05-24-R018-static-matrix-v2",
  "assets",
  "P01-person-source.png"
);
const contactSheetPath = path.join(outputRoot, "action-transfer-material-table-work-20260524", "action-transfer-9-videos-contact-sheet.jpg");
const middleFrameGridPath = path.join(
  outputRoot,
  "action-transfer-material-table-work-20260524",
  "action-transfer-9-videos-middle-frame-grid.jpg"
);
const reviewFramePaths = [
  path.join(
    outputRoot,
    "person-dress-product-photo-video-handoff",
    "2026-05-22-R006-floral-classroom-dance",
    "outputs",
    "R006-P03-firstframe.jpg"
  ),
  path.join(
    outputRoot,
    "person-dress-product-photo-video-handoff",
    "2026-05-22-R010-matrix-formal-consumer-9",
    "review",
    "R010-P01-D03-S01-A05-P03-v01-mid.jpg"
  ),
  path.join(
    outputRoot,
    "person-dress-product-photo-video-handoff",
    "2026-05-22-R009-matrix-scale-9",
    "review",
    "R009-P01-D03-S03-A05-P03-v01-start.jpg"
  )
];

type WorkbenchLibraryManifest = {
  version: "image2-workbench-library-v1";
  assets: WorkbenchAsset[];
  updatedAt: string;
};

type WorkbenchFeedbackManifest = {
  version: "image2-workbench-feedback-v1";
  feedback: WorkbenchFeedback[];
  updatedAt: string;
};

export type SaveWorkbenchAssetInput = {
  buffer: Buffer;
  mimeType: string;
  originalName?: string;
  kind: WorkbenchAssetKind;
  title: string;
  note?: string;
  tags?: string[];
  origin: "master" | "upload" | "generated";
  stage?: WorkbenchPromptTemplateStage;
  prompt?: string;
  id?: string;
  createdAt?: string;
};

export type SaveWorkbenchFeedbackInput = {
  assetId: string;
  stage: WorkbenchFeedbackStage;
  rating: WorkbenchFeedbackRating;
  reasons?: string[];
  note?: string;
  prompt?: string;
  referenceIds?: string[];
};

const groupByKind: Record<WorkbenchAssetKind, WorkbenchAssetGroup> = {
  person: "人物",
  clothing: "服装",
  scene: "场景",
  motion: "动作",
  result: "结果"
};

const promptTemplates: WorkbenchPromptTemplate[] = [
  {
    id: "outfit-clean-studio",
    stage: "outfit",
    title: "清透棚拍穿搭",
    summary: "适合服装细节、版型和身份稳定，先把人物和衣服做准。",
    prompt: [
      "以 {{person}} 为主体，参考 {{clothing}} 的版型、颜色、层次和材质，生成一张高完成度的人物穿搭图。",
      "要求：保留人物五官、发型和年龄感；准确还原服装结构、褶皱、纹理和边缘；全身或半身稳定入镜；背景干净，高级棚拍；光线柔和但有层次；不要文字、水印、品牌错位和额外人物。"
    ].join("\n"),
    tags: ["人物稳定", "服装细节", "电商棚拍"]
  },
  {
    id: "outfit-editorial",
    stage: "outfit",
    title: "街拍编辑感",
    summary: "适合更有气质的穿搭图，兼顾画面气氛和主体识别。",
    prompt: [
      "以 {{person}} 和 {{clothing}} 为核心，生成一张具有时尚编辑感的人物穿搭图。",
      "要求：人物姿态自然，衣服版型准确，面部与发型稳定，整体像品牌街拍或杂志内页；镜头略带电影感；构图干净利落；背景和光线要服务于主体；不要夸张装饰、不要文字和水印。"
    ].join("\n"),
    tags: ["时尚", "封面感", "画面气质"]
  },
  {
    id: "outfit-safe-commercial",
    stage: "outfit",
    title: "安全商业版",
    summary: "保守但稳，适合批量出图和回退。",
    prompt: [
      "参考 {{person}} 和 {{clothing}}，生成稳定、清晰、适合批量交付的人物穿搭图。",
      "要求：识别度优先，服装细节完整，颜色准确，主体居中或略偏三分法，背景简洁，不抢主体，画面真实自然，适合后续做视频首帧。"
    ].join("\n"),
    tags: ["稳", "量产", "首帧友好"]
  },
  {
    id: "frame-action-transfer",
    stage: "first-frame",
    title: "动作迁移首帧",
    summary: "把穿搭图和场景图合到一起，目标是后续视频可直接起跑。",
    prompt: [
      "以 {{outfit}} 为主体，结合 {{scene}} 的空间氛围、光线和真实环境，生成一张视频首帧图。",
      "要求：人物身份和服装延续一致；场景真实可信；构图稳定；给动作迁移留出身体空间和运动方向；头手脚不要被切得太死；画面干净、可读、适合直接进入视频生成。"
    ].join("\n"),
    tags: ["首帧", "动作迁移", "空间感"]
  },
  {
    id: "frame-cover-impact",
    stage: "first-frame",
    title: "封面冲击版",
    summary: "用于要更强第一眼的首帧，适合海报化封面。",
    prompt: [
      "以 {{outfit}} 为主体，参考 {{scene}} 的氛围和透视，生成一张有封面冲击力的视频首帧。",
      "要求：主体突出，景深分层明确，光影有记忆点，画面结构强，适合短视频封面和开场第一帧；仍要保留动作迁移所需的身体空间和自然连贯性。"
    ].join("\n"),
    tags: ["封面", "强视觉", "电影感"]
  },
  {
    id: "frame-safe-commercial",
    stage: "first-frame",
    title: "安全首帧版",
    summary: "用于批量稳出图，强调可迁移、可复用、可复盘。",
    prompt: [
      "以 {{outfit}} 和 {{scene}} 生成一张稳定、真实、可直接用于动作迁移的视频首帧图。",
      "要求：主体清晰，姿态适合后续动作迁移，服装颜色和结构尽量保持一致，场景不要喧宾夺主，整张图像一条可用的工作底稿。"
    ].join("\n"),
    tags: ["批量", "稳", "工作底稿"]
  }
];

function referenceLinks(): WorkbenchReferenceLink[] {
  return [
    {
      label: "Image2 案例库",
      href: "/image2-cases",
      note: "打开 Image2 案例和提示词参考"
    },
    {
      label: "视频创作台",
      href: "/video-studio",
      note: "跳转无限画布 Seedance 视频台（hb.cauai.fun/video）"
    }
  ];
}

const cloudSeedAssets: WorkbenchAsset[] = [
  {
    id: "seed-person",
    kind: "person",
    group: "人物",
    title: "云端示例人物",
    subtitle: "部署种子",
    note: "云端演示用的人物参考，部署后可直接替换为团队自己的素材。",
    sourcePath: "/image2/hero/case-20125-portrait.jpg",
    previewPath: "/image2/hero/case-20125-portrait.jpg",
    tags: ["人物", "示例", "云端"],
    promptHint: "保留人物身份、脸型和发型，适合作为穿搭图主参考。"
  },
  {
    id: "seed-clothing",
    kind: "clothing",
    group: "服装",
    title: "云端示例服装",
    subtitle: "部署种子",
    note: "云端演示用的服装参考，适合展示穿搭图工作流。",
    sourcePath: "/image2/hero/case-20243-fashion.jpg",
    previewPath: "/image2/hero/case-20243-fashion.jpg",
    tags: ["服装", "示例", "云端"],
    promptHint: "重点保留版型、颜色和材质，适合做穿搭图服装锚点。"
  },
  {
    id: "seed-scene",
    kind: "scene",
    group: "场景",
    title: "云端示例场景",
    subtitle: "部署种子",
    note: "云端演示用的场景参考，适合首帧图和动作迁移背景。",
    sourcePath: "/image2/hero/case-20275-bangkok.jpg",
    previewPath: "/image2/hero/case-20275-bangkok.jpg",
    tags: ["场景", "示例", "云端"],
    promptHint: "用于控制空间氛围、构图和光线方向。"
  },
  {
    id: "seed-motion",
    kind: "motion",
    group: "动作",
    title: "云端示例动作",
    subtitle: "部署种子",
    note: "云端演示用的动作参考，展示动作迁移的起势和节奏。",
    sourcePath: "/image2/hero/case-20242-coffee.jpg",
    previewPath: "/image2/hero/case-20242-coffee.jpg",
    tags: ["动作", "示例", "云端"],
    promptHint: "用于观察动作节奏和身体方向。"
  },
  {
    id: "seed-result",
    kind: "result",
    group: "结果",
    title: "云端示例结果",
    subtitle: "部署种子",
    note: "云端演示用的结果样图，可作为首帧和复盘参考。",
    sourcePath: "/image2/hero/case-30001-vr.jpg",
    previewPath: "/image2/hero/case-30001-vr.jpg",
    tags: ["结果", "示例", "云端"],
    promptHint: "适合作为视频首帧和穿搭图的质量锚点。"
  }
];

function localPathExists(filePath: string) {
  return stat(filePath)
    .then(() => true)
    .catch(() => false);
}

async function firstExistingPath(candidates: Array<string | undefined>) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (await localPathExists(candidate)) return candidate;
  }
  return undefined;
}

async function readJson<T>(filePath: string, fallback: T) {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

let featuredCaseCache: { revision: string; cases: WorkbenchCase[] } | undefined;

async function readFeaturedWorkbenchCases() {
  const indexPath = caseLibraryPath.replace(".json", ".index.json");
  const info = await stat(indexPath).catch(() => null);
  const revision = info ? `${info.mtimeMs}:${info.size}` : null;
  if (revision && featuredCaseCache?.revision === revision) return featuredCaseCache.cases;
  const casePayload = await readJson<{
    cases?: Array<{
      id: number;
      title: string;
      categoryLabel: string;
      imageUrl: string;
      imageAlt: string;
      promptPreview: string;
      sourceLabel?: string;
      valueTier: string;
      valueScore: number;
      featured?: boolean;
      sourceNote?: string;
    }>;
  }>(indexPath, {});

  const curatedImageByCaseId = new Map<number, string>([
    [30001, "/image2/hero/case-30001-vr.jpg"],
    [20292, "/image2/hero/case-20243-fashion.jpg"],
    [20305, "/image2/hero/case-20259-burger.jpg"],
    [20039, "/image2/hero/case-20242-coffee.jpg"],
    [20125, "/image2/hero/case-20125-portrait.jpg"]
  ]);
  const caseById = new Map((casePayload.cases ?? []).map((item) => [item.id, item]));

  const cases = [...curatedImageByCaseId]
    .map(([id, imageUrl]) => {
      const item = caseById.get(id);
      return item ? { ...item, imageUrl } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({
      id: item.id,
      title: item.title,
      categoryLabel: item.categoryLabel,
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt,
      promptPreview: item.promptPreview,
      sourceLabel: item.sourceLabel,
      valueTier: item.valueTier,
      valueScore: item.valueScore,
      sourceNote: item.sourceNote
    }));
  if (revision) featuredCaseCache = { revision, cases };
  return cases;
}

export async function loadImage2PublicHomeData(): Promise<Image2PublicHomeData> {
  return {
    featuredCases: await readFeaturedWorkbenchCases(),
    updatedAt: new Date().toISOString()
  };
}

export async function loadPublicImage2WorkbenchData(access?: WorkbenchAccessState): Promise<Image2WorkbenchData> {
  return {
    sourceLabel: "Image2 公开入口",
    metrics: [],
    assets: [],
    feedback: [],
    feedbackStats: { total: 0, usable: 0, needsFix: 0, reject: 0 },
    promptTemplates,
    featuredCases: await readFeaturedWorkbenchCases(),
    artifactPaths: {},
    referenceLinks: referenceLinks(),
    updatedAt: new Date().toISOString(),
    access: access ?? {
      isAuthenticated: false,
      isTeamMember: false,
      message: "请登录后继续。",
      mode: "public"
    }
  };
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

function cleanText(value: string | undefined, fallback: string, max = 140) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, max);
}

function cleanList(values: string[] | undefined, maxItems = 8) {
  return [...new Set((values ?? []).map((value) => cleanText(value, "", 40)).filter(Boolean))].slice(0, maxItems);
}

async function readWorkbenchLibraryAssets() {
  const manifest = await readJson<WorkbenchLibraryManifest>(workbenchLibraryManifestPath, {
    version: "image2-workbench-library-v1",
    assets: [],
    updatedAt: new Date(0).toISOString()
  });
  const existing: WorkbenchAsset[] = [];
  for (const asset of manifest.assets) {
    if (asset.previewPath && (await localPathExists(asset.previewPath))) existing.push(asset);
  }
  return existing;
}

export async function readWorkbenchFeedback() {
  if (isSupabaseWorkbenchEnabled()) {
    try {
      return await readCloudWorkbenchFeedback();
    } catch {
      // Fall through to the local manifest when Supabase is not ready yet.
    }
  }
  const manifest = await readJson<WorkbenchFeedbackManifest>(workbenchFeedbackPath, {
    version: "image2-workbench-feedback-v1",
    feedback: [],
    updatedAt: new Date(0).toISOString()
  });
  return manifest.feedback.filter((item) => item.assetId && item.createdAt).slice(0, 500);
}

export function getWorkbenchFeedbackStats(feedback: WorkbenchFeedback[]): WorkbenchFeedbackStats {
  return feedback.reduce(
    (stats, item) => {
      stats.total += 1;
      if (item.rating === "usable") stats.usable += 1;
      if (item.rating === "needs-fix") stats.needsFix += 1;
      if (item.rating === "reject") stats.reject += 1;
      if (!stats.latestAt || Date.parse(item.createdAt) > Date.parse(stats.latestAt)) stats.latestAt = item.createdAt;
      return stats;
    },
    { total: 0, usable: 0, needsFix: 0, reject: 0 } as WorkbenchFeedbackStats
  );
}

export async function saveWorkbenchFeedback(input: SaveWorkbenchFeedbackInput) {
  if (isSupabaseWorkbenchEnabled()) {
    try {
      return await saveCloudWorkbenchFeedback(input);
    } catch {
      // Fall back to the local manifest when Supabase is not ready yet.
    }
  }
  const now = new Date().toISOString();
  const feedback: WorkbenchFeedback = {
    id: `F-${Date.now()}-${randomUUID().slice(0, 6)}`,
    assetId: cleanText(input.assetId, "", 160),
    stage: input.stage,
    rating: input.rating,
    reasons: cleanList(input.reasons, 8),
    note: input.note?.trim() ? cleanText(input.note, "", 500) : undefined,
    prompt: input.prompt?.trim() ? cleanText(input.prompt, "", 4000) : undefined,
    referenceIds: cleanList(input.referenceIds, 10),
    createdAt: now
  };
  const existing = await readWorkbenchFeedback();
  const manifest: WorkbenchFeedbackManifest = {
    version: "image2-workbench-feedback-v1",
    feedback: [feedback, ...existing].slice(0, 500),
    updatedAt: now
  };
  await mkdir(workbenchLibraryRoot, { recursive: true });
  const temporaryPath = `${workbenchFeedbackPath}.${randomUUID().slice(0, 8)}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(manifest, null, 2), "utf-8");
  await rename(temporaryPath, workbenchFeedbackPath);
  return feedback;
}

export async function saveImage2WorkbenchAsset(input: SaveWorkbenchAssetInput) {
  if (isSupabaseWorkbenchEnabled()) {
    try {
      return await saveCloudWorkbenchAsset(input);
    } catch {
      // Keep the local-first path available if the cloud store is not ready.
    }
  }
  const now = new Date().toISOString();
  const prefix = input.origin === "generated" ? "G" : input.origin === "master" ? "M" : "U";
  const id = input.id || `${prefix}-${Date.now()}-${randomUUID().slice(0, 6)}`;
  const directory = path.join(workbenchLibraryRoot, input.origin === "generated" ? "generated" : input.origin === "master" ? "master" : "uploads");
  const extension = extensionForMimeType(input.mimeType);
  const storedPath = path.join(directory, `${id}.${extension}`);
  await mkdir(directory, { recursive: true });
  await writeFile(storedPath, input.buffer);

  const stageLabel = input.stage === "outfit" ? "人物穿搭图" : input.stage === "first-frame" ? "视频首帧图" : undefined;
  const asset: WorkbenchAsset = {
    id,
    kind: input.kind,
    group: groupByKind[input.kind],
    title: cleanText(input.title, input.originalName || stageLabel || "新增素材", 80),
    subtitle:
      input.origin === "generated"
        ? `生成沉淀 · ${stageLabel || "结果图"}`
        : input.origin === "master"
          ? `素材母版 · ${groupByKind[input.kind]}`
          : `团队上传 · ${groupByKind[input.kind]}`,
    note: cleanText(
      input.note,
      input.origin === "generated"
        ? "由作图工作台自动沉淀，可继续投入下一步流程。"
        : input.origin === "master"
          ? "从动作迁移素材母版迁入，可作为团队公共参考素材。"
          : "团队新增参考素材。",
      260
    ),
    sourcePath: storedPath,
    previewPath: storedPath,
    tags: [
      ...new Set([
        ...(input.tags ?? []),
        input.origin === "generated" ? "生成沉淀" : input.origin === "master" ? "素材母版" : "团队上传",
        stageLabel
      ].filter(Boolean) as string[])
    ].slice(0, 5),
    promptHint:
      input.origin === "generated"
        ? `可复用的${stageLabel || "结果图"}；选择后继续进入动作迁移首帧流程。`
        : input.origin === "master"
          ? "素材母版公共资产，适合团队批量选择和复盘。"
          : "团队上传素材，已可加入当前作图流程。",
    origin: input.origin,
    stage: input.stage,
    createdAt: now,
    prompt: input.prompt?.trim() || undefined
  };

  const existing = await readWorkbenchLibraryAssets();
  const manifest: WorkbenchLibraryManifest = {
    version: "image2-workbench-library-v1",
    assets: [asset, ...existing.filter((item) => item.id !== asset.id)].slice(0, 300),
    updatedAt: now
  };
  await mkdir(workbenchLibraryRoot, { recursive: true });
  const temporaryPath = `${workbenchLibraryManifestPath}.${randomUUID().slice(0, 8)}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(manifest, null, 2), "utf-8");
  await rename(temporaryPath, workbenchLibraryManifestPath);
  return asset;
}

function makeTags(...parts: Array<string | undefined>) {
  return parts.filter((part): part is string => Boolean(part && part.trim())).slice(0, 4);
}

export async function loadImage2WorkbenchData(access?: WorkbenchAccessState): Promise<Image2WorkbenchData> {
  const useSupabaseWorkbench = isSupabaseWorkbenchEnabled();
  const matrix = await readJson<{
    character?: { id?: string; path?: string; note?: string };
    dresses?: Array<{
      id?: string;
      name?: string;
      status?: string;
      primary_path?: string;
      white_clean_path?: string;
      white_clean_source?: string;
      refs?: string[];
      taskId?: string;
    }>;
    scenes?: Array<{
      id?: string;
      source_slot?: string;
      name?: string;
      mood?: string;
      status?: string;
      path?: string;
      creator?: string;
      license?: string;
      note?: string;
    }>;
    dances?: Array<{
      id?: string;
      name?: string;
      path?: string;
      width?: number;
      height?: number;
      duration_s?: number;
      preview_path?: string;
    }>;
  }>(matrixManifestPath, {});

  const characterPath = await firstExistingPath([
    matrix.character?.path,
    currentMainAssetPath
  ]);

  const personAssets: WorkbenchAsset[] = [];
  if (characterPath) {
    personAssets.push({
      id: matrix.character?.id || "P01",
      kind: "person",
      group: "人物",
      title: "P01 人物原图",
      subtitle: "角色定锚",
      note: matrix.character?.note || "主人物参考，保留脸型、发型和整体身份。",
      sourcePath: characterPath,
      previewPath: characterPath,
      tags: ["人物", "主角色", "身份稳定"],
      promptHint: "稳定人物身份和脸部结构，适合作为穿搭图的主参考。"
    });
  }

  const faceCropPath = path.join(outputRoot, "person-dress-product-photo-runs", "2026-05-24-R018-static-matrix-v2", "assets", "P01-identity-face-crop.jpg");
  if (await localPathExists(faceCropPath)) {
    personAssets.push({
      id: "P01-face-crop",
      kind: "person",
      group: "人物",
      title: "P01 头像裁切",
      subtitle: "身份校准",
      note: "脸部稳定参考，适合检查人物识别和面部一致性。",
      sourcePath: faceCropPath,
      previewPath: faceCropPath,
      tags: ["人物", "脸部", "校准"],
      promptHint: "用于校准五官、发型和脸部细节。"
    });
  }

  const clothingAssets: WorkbenchAsset[] = [];
  for (const item of matrix.dresses ?? []) {
    const previewPath = await firstExistingPath([item.white_clean_path, item.primary_path, item.refs?.[0]]);
    if (!previewPath) continue;
    clothingAssets.push({
      id: item.id || previewPath,
      kind: "clothing",
      group: "服装",
      title: `${item.id || "D"} ${item.name || "服装参考"}`,
      subtitle: item.status || "服装矩阵",
      note: item.white_clean_source || "服装白底清图，适合穿搭图和首帧图复用。",
      sourcePath: item.primary_path || previewPath,
      previewPath,
      tags: makeTags("服装", item.id, item.status),
      promptHint: "重点保留服装版型、颜色和材质，适合做穿搭图主体。"
    });
  }

  const sceneAssets: WorkbenchAsset[] = [];
  for (const item of matrix.scenes ?? []) {
    const previewPath = item.path ? await firstExistingPath([item.path]) : undefined;
    if (!previewPath) continue;
    sceneAssets.push({
      id: item.id || previewPath,
      kind: "scene",
      group: "场景",
      title: `${item.id || "S"} ${item.name || "场景参考"}`,
      subtitle: item.mood || item.status || "场景矩阵",
      note: [item.creator, item.license, item.note].filter(Boolean).join(" · ") || "场景参考，适合首帧背景和光线延展。",
      sourcePath: previewPath,
      previewPath,
      tags: makeTags("场景", item.mood, item.status),
      promptHint: "用于控制空间氛围、构图和光线方向。"
    });
  }

  const motionAssets: WorkbenchAsset[] = [];
  for (const item of matrix.dances ?? []) {
    const previewPath = await firstExistingPath([item.preview_path]);
    if (!previewPath) continue;
    motionAssets.push({
      id: item.id || previewPath,
      kind: "motion",
      group: "动作",
      title: `${item.id || "A"} ${item.name || "动作参考"}`,
      subtitle: `${item.width || 0}x${item.height || 0} · ${item.duration_s ? `${item.duration_s.toFixed(2)}s` : "动作片段"}`,
      note: item.path || "动作参考视频的首帧预览。",
      sourcePath: item.path || previewPath,
      previewPath,
      tags: makeTags("动作", item.name, item.duration_s ? `${item.duration_s.toFixed(1)}s` : undefined),
      promptHint: "用于观察动作起势、身体方向和节奏结构。"
    });
  }

  const resultAssets: WorkbenchAsset[] = [];
  for (const [index, previewPath] of reviewFramePaths.entries()) {
    if (!(await localPathExists(previewPath))) continue;
    resultAssets.push({
      id: `result-${index + 1}`,
      kind: "result",
      group: "结果",
      title: index === 0 ? "P03 首帧沉淀" : `复盘样例 ${index + 1}`,
      subtitle: index === 0 ? "当前主图" : "首帧复盘",
      note: index === 0 ? "当前项目里最接近首帧交付的主图。" : "用于对照动作迁移复盘结果。",
      sourcePath: previewPath,
      previewPath,
      tags: ["结果", "复盘", "首帧"],
      promptHint: "可作为反推提示词和首帧质量检查样本。"
    });
  }

  if (await localPathExists(currentHeroPath)) {
    resultAssets.unshift({
      id: "current-hero",
      kind: "result",
      group: "结果",
      title: "当前主图",
      subtitle: "首帧候选",
      note: "动作迁移项目里当前可用的主图参考。",
      sourcePath: currentHeroPath,
      previewPath: currentHeroPath,
      tags: ["结果", "主图", "首帧"],
      promptHint: "适合作为视频首帧和穿搭图的质量锚点。"
    });
  }

  const sharedAssets = useSupabaseWorkbench
    ? await readCloudWorkbenchAssets().catch(() => readWorkbenchLibraryAssets())
    : await readWorkbenchLibraryAssets();
  const feedback = await readWorkbenchFeedback();
  const feedbackStats = getWorkbenchFeedbackStats(feedback);
  const assets = [...personAssets, ...clothingAssets, ...sceneAssets, ...motionAssets, ...resultAssets, ...sharedAssets];
  const finalAssets = assets.length ? assets : cloudSeedAssets;

  const featuredCases = await readFeaturedWorkbenchCases();

  const artifactPaths: WorkbenchArtifactPaths = {
    mainImage: (await firstExistingPath([currentHeroPath, currentMainAssetPath])) ?? "/image2/hero/case-30001-vr.jpg",
    contactSheet: (await firstExistingPath([contactSheetPath])) ?? "/image2/hero/case-20243-fashion.jpg",
    middleFrameGrid: (await firstExistingPath([middleFrameGridPath])) ?? "/image2/hero/case-20275-bangkok.jpg"
  };

  const metrics: WorkbenchMetric[] = [
    { label: "人物参考", value: String(finalAssets.filter((item) => item.kind === "person").length), detail: "身份稳定优先" },
    { label: "服装参考", value: String(finalAssets.filter((item) => item.kind === "clothing").length), detail: "白底与细节图" },
    { label: "场景参考", value: String(finalAssets.filter((item) => item.kind === "scene").length), detail: "动作迁移背景" },
    { label: "动作参考", value: String(finalAssets.filter((item) => item.kind === "motion").length), detail: "首帧节奏锚点" },
    { label: "结果库", value: String(finalAssets.filter((item) => item.kind === "result").length), detail: `${sharedAssets.length} 条团队沉淀` },
    { label: "体验反馈", value: String(feedbackStats.total), detail: `${feedbackStats.needsFix} 条待修 · ${feedbackStats.reject} 条废图` }
  ];

  return {
    sourceLabel: useSupabaseWorkbench ? "Image2 Supabase 工作台" : assets.length ? "动作迁移工作流素材母版" : "Image2 云端演示种子库",
    metrics,
    assets: finalAssets,
    feedback,
    feedbackStats,
    promptTemplates,
    featuredCases,
    artifactPaths,
    referenceLinks: referenceLinks(),
    updatedAt: new Date().toISOString(),
    access: access ?? {
      isAuthenticated: true,
      isTeamMember: true,
      mode: "team"
    }
  };
}

export function getPromptTemplateDefaults() {
  return {
    outfit: promptTemplates.find((item) => item.stage === "outfit")?.id ?? "outfit-clean-studio",
    firstFrame: promptTemplates.find((item) => item.stage === "first-frame")?.id ?? "frame-action-transfer"
  };
}
