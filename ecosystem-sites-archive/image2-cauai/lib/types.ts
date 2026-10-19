export const VIDEO_MODELS = [
  { value: "sd2.5", modelId: "doubao-seedance-2-5-260628", label: "SD 2.5 (火山旗舰)", hint: "Seedance 2.5" },
  { value: "sd2", modelId: "doubao-seedance-2-0-260128", label: "SD 2.0 (火山标准)", hint: "Seedance 2.0" },
  { value: "sd2fast", modelId: "doubao-seedance-2-0-fast-260128", label: "SD 2.0 Fast (火山极速)", hint: "Seedance 2.0 Fast" }
] as const;
export type VideoModelKey = (typeof VIDEO_MODELS)[number]["value"];

export const VIDEO_MODES = [
  {
    value: "text",
    label: "文生视频",
    hint: "只输入提示词"
  },
  {
    value: "first-frame",
    label: "首帧图生",
    hint: "上传 1 张图"
  },
  {
    value: "first-last",
    label: "首尾帧",
    hint: "上传 2 张图"
  },
  {
    value: "references",
    label: "参考素材",
    hint: "图/视频/音频"
  }
] as const;

export const RATIO_OPTIONS = [
  { value: "adaptive", label: "智能比例", size: "自适应", use: "默认" },
  { value: "16:9", label: "横版", size: "16:9", use: "B站/YouTube" },
  { value: "9:16", label: "竖版", size: "9:16", use: "抖音/视频号" },
  { value: "1:1", label: "方形", size: "1:1", use: "信息流" },
  { value: "4:3", label: "经典横版", size: "4:3", use: "故事片" },
  { value: "3:4", label: "小红书竖图", size: "3:4", use: "封面友好" },
  { value: "21:9", label: "电影宽银幕", size: "21:9", use: "横向大片" }
] as const;

export const DURATION_OPTIONS = [
  { value: 4, label: "4 秒", hint: "镜头测试" },
  { value: 5, label: "5 秒", hint: "快速预览" },
  { value: 8, label: "8 秒", hint: "短视频片段" },
  { value: 10, label: "10 秒", hint: "标准成片" },
  { value: 15, label: "15 秒", hint: "周卡满血" },
  { value: -1, label: "智能时长", hint: "模型决定" }
] as const;

export type VideoMode = (typeof VIDEO_MODES)[number]["value"];
export type VideoRatio = (typeof RATIO_OPTIONS)[number]["value"];
export type VideoDuration = (typeof DURATION_OPTIONS)[number]["value"];
export type VideoResolution = "720p";
export type GenerationStatus = "queued" | "running" | "succeeded" | "failed" | "expired";
export type VideoProviderMode = "manual" | "seedance" | "doubao2api";
export type AssetKind = "image" | "video" | "audio";
export type AssetRole = "first_frame" | "last_frame" | "reference_image" | "reference_video" | "reference_audio";

export type MediaAsset = {
  id: string;
  name: string;
  kind: AssetKind;
  role: AssetRole;
  mimeType: string;
  size: number;
  dataUrl?: string;
  url?: string;
};

export type UserProfile = {
  id: string;
  email?: string;
  displayName: string;
  createdAt: string;
  claimedTrialAt?: string;
};

export type LicenseCode = {
  id: string;
  codeHash: string;
  plan: "weekly_free";
  maxRedemptions: number;
  redeemedBy: string[];
  expiresAt?: string;
  createdAt: string;
};

export type Entitlement = {
  id: string;
  userId: string;
  plan: "weekly_free";
  startsAt: string;
  endsAt: string;
  dailyLimit: number;
  resolution: VideoResolution;
  maxDurationSeconds: 15;
  createdAt: string;
};

export type DailyUsage = {
  id: string;
  userId: string;
  usageDate: string;
  usedCount: number;
  limitCount: number;
  updatedAt: string;
};

export type Image2PromptStructure = {
  subject: string;
  style: string;
  composition: string;
  lighting: string;
  materials: string;
  text: string;
};

export type Image2PromptWorkbenchDraft = {
  versions?: import("./image2-prompt-engine").PromptVersion[];
  caseTitle: string;
  fields: Image2PromptStructure;
  basePrompt?: string;
  variables?: Record<string, string>;
  note: string;
  prompt: string;
  updatedAt: string;
};

export type Image2PromptReuseHistoryItem = {
  action: "copied" | "generated" | "saved";
  caseKey: string;
  caseTitle: string;
  createdAt: string;
  id: string;
  prompt: string;
};

export type Image2CaseCollection = {
  id: string;
  name: string;
  caseKeys: string[];
  createdAt: string;
  updatedAt: string;
};

export type Image2CaseNote = {
  caseKey: string;
  note: string;
  updatedAt: string;
};

export type Image2AssetGachaState = {
  version: 1;
  runs: unknown[];
  recipes: unknown[];
  updatedAt?: string;
};

export type Image2AssetSnapshot = {
  version: "image2-assets-v1";
  favoriteCaseKeys: string[];
  activeCollectionId: string | null;
  collections: Image2CaseCollection[];
  gachaState?: Image2AssetGachaState;
  notes: Record<string, Image2CaseNote>;
  promptDrafts: Record<string, Image2PromptWorkbenchDraft>;
  promptReuseHistory: Image2PromptReuseHistoryItem[];
  updatedAt: string;
};

export type Image2UserAssets = {
  id: string;
  userId: string;
  snapshot: Image2AssetSnapshot;
  createdAt: string;
  updatedAt: string;
};

export type Image2AssetChangeAction = "asset_snapshot_save" | "admin_undo_asset_snapshot";

export type Image2AssetChangeActor = {
  type: "user" | "admin" | "system";
  id?: string;
  email?: string;
};

export type Image2AssetSnapshotSummary = {
  favoriteCaseKeys: number;
  collections: number;
  collectionCaseKeys: number;
  notes: number;
  promptDrafts: number;
  promptReuseHistory: number;
  gachaRuns: number;
  gachaRecipes: number;
};

export type Image2AssetChangeLog = {
  id: string;
  userId: string;
  action: Image2AssetChangeAction;
  source: string;
  reason: string;
  actor: Image2AssetChangeActor;
  beforeSnapshot: Image2AssetSnapshot;
  afterSnapshot: Image2AssetSnapshot;
  summary: {
    before: Image2AssetSnapshotSummary;
    after: Image2AssetSnapshotSummary;
  };
  createdAt: string;
  undoneAt?: string;
  undoneBy?: string;
  undoChangeId?: string;
};

export type Generation = {
  id: string;
  userId: string;
  title: string;
  prompt: string;
  model?: string;
  mode: VideoMode;
  ratio: VideoRatio;
  durationSeconds: VideoDuration;
  resolution: VideoResolution;
  style?: string;
  seed?: number;
  generateAudio: boolean;
  privacy: "private" | "link";
  assets: MediaAsset[];
  status: GenerationStatus;
  progress: number;
  provider: VideoProviderMode;
  providerTaskId?: string;
  coverUrl: string;
  videoUrl?: string;
  lastFrameUrl?: string;
  errorMessage?: string;
  operatorName?: string;
  externalAccount?: string;
  sourceTaskUrl?: string;
  operatorNote?: string;
  userMessage?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type QuotaSummary = {
  active: boolean;
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
};

export type DashboardResponse = {
  user: UserProfile;
  entitlement?: Entitlement;
  quota: QuotaSummary;
  jobs: Generation[];
  gallery: Generation[];
  providerMode: VideoProviderMode;
  ratios: typeof RATIO_OPTIONS;
  durations: typeof DURATION_OPTIONS;
  modes: typeof VIDEO_MODES;
};

export type CreateGenerationInput = {
  userId: string;
  prompt: string;
  model?: string;
  mode: VideoMode;
  ratio: VideoRatio;
  durationSeconds: VideoDuration;
  resolution: VideoResolution;
  style?: string;
  seed?: number;
  generateAudio?: boolean;
  privacy?: "private" | "link";
  assets?: MediaAsset[];
};

export type AdminQueueResponse = {
  jobs: Generation[];
  totals: {
    queued: number;
    running: number;
    succeeded: number;
    failed: number;
    expired: number;
  };
  providerMode: VideoProviderMode;
};
