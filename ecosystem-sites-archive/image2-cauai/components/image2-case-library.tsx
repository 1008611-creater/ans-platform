"use client";

import {
  type FormEvent,
  type MouseEvent,
  type SyntheticEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  CheckCircle2,
  Clock3,
  Clipboard,
  ClipboardCheck,
  Database,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FolderOpen,
  FolderPlus,
  Heart,
  History,
  ImageOff,
  KeyRound,
  LogIn,
  LogOut,
  Loader2,
  Maximize2,
  NotebookPen,
  PackageOpen,
  Radar,
  RotateCcw,
  Search,
  Save,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRound,
  WalletCards,
  WandSparkles,
  X
} from "lucide-react";
import { Image2LanguageToggle, useImage2LanguagePreference } from "@/components/image2-language";
import { localizedCaseText, localizedCategoryLabel, type Image2Language } from "@/lib/image2-language";
import { toUserFacingError } from "@/lib/user-facing-error";
import { Image2PlanSpace } from '@/components/image2-plan-space';
import { taskSearchScore } from '@/lib/image2-task-search';
import { Image2EvidenceImage } from './image2-evidence-image';
import { CASE_HANDOFF_KEY, CASE_RETURN_KEY } from '@/lib/image2-plan-protocol';
import { useDialogFocus } from "@/components/use-dialog-focus";
import { Image2PromptEditor } from '@/components/image2-prompt-editor';
import { findPromptVariables, renderPrompt, mergePromptVersions, normalizePromptVersions, promptConstraints, promptFingerprint, type PromptVersion } from '@/lib/image2-prompt-engine';
import filterStyles from "./image2-case-filters.module.css";
import styles from "./image2-case-workbench-bridge.module.css";

type Image2Case = {
  id: number;
  detailKey?: string;
  sourceDetailKey?: string;
  caseCode?: string;
  sourceCaseId?: string;
  sourceId?: string;
  sourceName?: string;
  sourceStatus?: "archived";
  title: string;
  category: string;
  categoryLabel: string;
  sourceCategory?: string;
  styles: string[];
  styleLabels: string[];
  scenes: string[];
  sceneLabels: string[];
  imageUrl: string;
  imageAlt: string;
  imageStatus?: "available" | "text-only";
  imageRoles?: Array<{ url: string; role: string; label?: string }>;
  referenceRequired?: boolean;
  inputCompleteness?: string;
  model?: string;
  modelEvidence?: { status: string; note: string; tested: boolean };
  sourceLicense?: string;
  sourceRecord?: { credit?: string; position?: string; links?: string[] };
  sourceRights?: { upstreamStatedTerms?: string; rightsNotice?: string };
  prompt?: string;
  promptPreview: string;
  promptKind: string;
  sourceLabel?: string;
  sourceUrl?: string;
  githubUrl?: string;
  featured: boolean;
  valueScore: number;
  valueTier: "精选" | "高价值" | "可参考";
  author?: string;
  aspect?: string;
  resolution?: string;
  sourceNote?: string;
  riskNote?: string;
  publishAngle?: string;
  promptStructure?: PromptStructure;
  reuseProfile?: ReuseProfile;
  replicationGuide?: ReplicationGuide;
  editorialProfile?: EditorialProfile;
  promptFamily?: PromptFamily;
};

type PromptStructure = {
  subject: string;
  style: string;
  composition: string;
  lighting: string;
  materials: string;
  text: string;
};

type ReuseProfile = {
  verdict: "direct" | "study" | "inspiration";
  label: string;
  difficulty: string;
  stability: string;
  sourceConfidence: string;
  note: string;
};

type PromptWorkbenchDraft = {
  caseTitle: string;
  fields: PromptStructure;
  note: string;
  prompt: string;
  versions?: PromptVersion[];
  basePrompt?: string;
  variables?: Record<string, string>;
  updatedAt: string;
};

type PromptReuseHistoryItem = {
  action: "copied" | "generated" | "saved";
  caseKey: string;
  caseTitle: string;
  createdAt: string;
  id: string;
  prompt: string;
};

type CaseCollection = {
  id: string;
  name: string;
  caseKeys: string[];
  createdAt: string;
  updatedAt: string;
};

type CaseNote = {
  caseKey: string;
  note: string;
  updatedAt: string;
};

type CaseAssetState = {
  activeCollectionId: string | null;
  collections: CaseCollection[];
  notes: Record<string, CaseNote>;
};

type ReplicationGuide = {
  workflow: "参考图编辑" | "文本生成";
  bestFor: string;
  requiredInputs: string[];
  editableVariables: string[];
  keepFixed: string[];
  verification: string[];
  failureWatchouts: string[];
};

type EditorialProfile = {
  score: number;
  tier: "精选" | "高价值" | "可参考";
  strengths: string[];
  cautions: string[];
  basis: string;
};

type PromptFamily = {
  id: string;
  size: number;
  primary: boolean;
  variantIndex: number;
};

type Image2AssetSnapshot = CaseAssetState & {
  favoriteCaseKeys: string[];
  promptDrafts: Record<string, PromptWorkbenchDraft>;
  promptReuseHistory: PromptReuseHistoryItem[];
  updatedAt: string;
  version: "image2-assets-v1";
};

type AccountAuthMode = "login" | "signup" | "recover";
type AccountOtpMode = "signup" | "recovery" | null;
type SupabaseOtpType = Exclude<AccountOtpMode, null> | "email";

type AccountAuthStatus = {
  message: string;
  tone: "idle" | "busy" | "success" | "error";
};

type MembershipStatus = AccountAuthStatus;

type Image2WalletSummary = {
  balance: number;
  lifetimeCredited: number;
  lifetimeSpent: number;
  updatedAt?: string;
};

type Image2WalletTransaction = {
  id: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
  source?: string;
  status: string;
  type: string;
};

type Image2WalletStatus = {
  recentTransactions: Image2WalletTransaction[];
  storageMode: string;
  wallet: Image2WalletSummary;
};

type Image2AccountSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  user: {
    id: string;
    email?: string;
  };
};

type SourceSummary = {
  id: string;
  label: string;
  site: string;
  repository: string;
  count: number;
  licenseNote: string;
};

type SourceRadar = {
  id: string;
  label: string;
  url: string;
  status: string;
  note: string;
};

type CasePayload = {
  source?: {
    site: string;
    repository: string;
    importedAt: string;
    licenseNote: string;
  };
  sources?: SourceSummary[];
  importedAt?: string;
  licenseNote?: string;
  totalCases: number;
  categories: Array<{ value: string; label: string; count: number }>;
  sourceRadar?: SourceRadar[];
  cases: Image2Case[];
};

type GeneratedImage = {
  name: string;
  path: string;
  dataUrl: string;
};

type GenerationResult = {
  outDir: string;
  images: GeneratedImage[];
  elapsedSeconds?: number;
  quota?: Image2FreeQuota;
  wallet?: Image2WalletSummary;
};

type Image2FreeQuota = {
  blocked: boolean;
  limit: number;
  remaining: number;
  used: number;
};

type GenerationStreamStatus = {
  detail?: string;
  elapsedSeconds?: number;
  stage?: string;
};

type GenerationHistoryItem = GenerationResult & {
  prompt?: string;
  model?: string;
  provider?: string;
  size?: string;
  versionId?: string | null;
  id: string;
  caseId: number;
  caseKey?: string;
  caseCode?: string;
  caseTitle: string;
  createdAt: string;
};

type CaseDetailContentProps = {
  editorScope: string;
  copiedId: number | null;
  freeQuota: Image2FreeQuota | null;
  wallet: Image2WalletSummary | null;
  generation: GenerationResult | null;
  generationError: string;
  generationElapsedSeconds: number;
  generationHistory: GenerationHistoryItem[];
  generationStatus: GenerationStreamStatus | null;
  isGenerating: boolean;
  isFavorite: boolean;
  isPromptLoading: boolean;
  item: Image2Case;
  language: Image2Language;
  onCopy: (item: Image2Case) => void;
  onCopyRewrite: () => void;
  onToggleFavorite: (item: Image2Case) => void;
  onGenerate: () => void;
  onGenerateRewrite: () => void;
  onPreviewImage: (preview: ImagePreview) => void;
  onOpenHistory: () => void;
  onOpenQuota: () => void;
  onResetWorkbench: () => void;
  onSaveWorkbench: (name?: string) => void;
  onSaveCaseNote: () => void;
  onWorkbenchFieldChange: (field: keyof PromptStructure, value: string) => void;
  onWorkbenchNoteChange: (value: string) => void;
  onBasePromptChange: (value: string) => void;
  onVariableChange: (token: string, value: string) => void;
  onRestoreVariant: (prompt: string | PromptVersion) => void;
  onEnterWorkbench: () => void;
  basePrompt: string;
  variables: Record<string, string>;
  recentReuse: PromptReuseHistoryItem[];
  caseCollections: CaseCollection[];
  selectedCaseCollectionIds: string[];
  rewriteCopiedKey: string | null;
  rewritePrompt: string;
  editorStatus: string;
  savedWorkbench?: PromptWorkbenchDraft;
  workbenchFields: PromptStructure;
  workbenchNote: string;
  caseNoteDraft: string;
  caseNoteUpdatedAt?: string;
  onCaseNoteChange: (value: string) => void;
  onClearCaseNote: () => void;
  onToggleCaseCollection: (collectionId: string) => void;
};

type CaseImageProps = {
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  onPreview?: () => void;
  previewLabel?: string;
  src: string;
  textOnly?: boolean;
  timeoutMs?: number;
};

type ImagePreview = {
  alt: string;
  meta?: string;
  src: string;
  title: string;
};

const image2BalancePacks = [
  { credits: 5, label: "5 张图", price: "10 ANS 积分", plan: "image2_credits_10" },
  { credits: 25, label: "25 张图", price: "50 ANS 积分", plan: "image2_credits_50" },
  { credits: 50, label: "50 张图", price: "100 ANS 积分", plan: "image2_credits_100" }
] as const;

const caseLibraryCopy = {
  zh: {
    heroKicker: "Image2 案例库",
    heroTitle: "从爆款图到可复刻提示词。",
    heroDescription: "按任务找到真实案例，保留原文约束，保存自己的完整方案，再带入工作台。",
    account: "登录 / 注册",
    bridge: {
      kicker: "案例接力",
      title: "把当前灵感带到作图台继续生产",
      fallback: "先选一张案例，再进入作图台选择人物、服装和场景参考图。",
      steps: ["看案例", "选参考", "出首帧"],
      enter: () => "带入当前方案"
    },
    filters: {
      search: "搜标题、来源、分类、标签、提示词...",
      favorites: "我的收藏",
      favoritesOnly: "只看收藏中",
      favoritesAll: "只看收藏",
      favoritesNote: "收藏保存在当前浏览器，回来看图和提示词更快。",
      collection: "收藏夹",
      allCollections: "全部收藏夹",
      newCollection: "新建收藏夹",
      membership: "ANS 算力余额",
      recent: "最近复用",
      category: "分类",
      gallery: "案例图库",
      allCategories: "全部分类",
      results: (count: number) => `${count} 个匹配案例`,
      emptyFavorites: "还没有匹配的收藏",
      emptyResults: "没有匹配案例",
      emptyFavoritesNote: "点卡片右上角的心形按钮，图片和提示词会留在当前浏览器。",
      emptyResultsNote: "换个关键词，或者放宽来源、分类和价值筛选。"
    },
    detail: {
      promptTitle: "英文原文提示词",
      promptSummary: "中文速读",
      favoriteOn: "已收藏",
      favoriteOff: "收藏"
    }
  },
  en: {
    heroKicker: "Live GPT-Image2 Case Library",
    heroTitle: "From viral images to reusable prompts.",
    heroDescription: "Find a real case, preserve its constraints, save your complete plan, and carry it into the workbench.",
    account: "Log in / Sign up",
    bridge: {
      kicker: "Case handoff",
      title: "Carry this idea to the workbench",
      fallback: "Pick a case first, then enter the workbench to choose person, outfit, and scene references.",
      steps: ["Review", "Reference", "First frame"],
      enter: () => "Carry current plan"
    },
    filters: {
      search: "Search title, source, category, tags, prompt...",
      favorites: "My favorites",
      favoritesOnly: "Favorites only",
      favoritesAll: "Show favorites",
      favoritesNote: "Favorites stay in this browser so prompts and images are easy to revisit.",
      collection: "Collections",
      allCollections: "All collections",
      newCollection: "New collection",
      membership: "Image balance",
      recent: "Recent reuse",
      category: "Categories",
      gallery: "Case library",
      allCategories: "All categories",
      results: (count: number) => `${count} matching cases`,
      emptyFavorites: "No favorite matches yet",
      emptyResults: "No matching cases",
      emptyFavoritesNote: "Use the heart button on a card to keep images and prompts in this browser.",
      emptyResultsNote: "Try another keyword or loosen the source and category filters."
    },
    detail: {
      promptTitle: "Original prompt",
      promptSummary: "Readable summary",
      favoriteOn: "Saved",
      favoriteOff: "Save"
    }
  }
} as const;

const image2DataVersion = "20261007-paired-assets-v3";
const initialVisibleCaseCount = 48;
const visibleCasePageSize = 48;
const favoriteCaseStorageKey = "image2-case-favorites:v1";
const generationHistoryStorageKey = "image2-generation-history:v1";
const promptWorkbenchStorageKey = "image2-prompt-workbench:v1";
const promptReuseHistoryStorageKey = "image2-prompt-reuse-history:v1";
const caseAssetStorageKey = "image2-case-assets:v1";
const accountSessionStorageKey = "image2-account-session:v1";
const workbenchAccountSessionStorageKey = "image2-workbench-team-session:v1";
const caseFiltersCollapsedStorageKey = "image2-case-filters-collapsed:v1";
const supabaseAuthUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const isSupabaseAuthConfigured = Boolean(supabaseAuthUrl && supabaseAnonKey);
const maxGenerationHistoryItems = 6; // Display window only; saved records are never truncated.
const maxPromptReuseHistoryItems = 8;
const freeQuotaExhaustedCode = "FREE_QUOTA_EXHAUSTED";
const balanceRequiredCode = "IMAGE2_BALANCE_INSUFFICIENT";
const promptFieldLabels: Array<{ field: keyof PromptStructure; label: string }> = [
  { field: "subject", label: "主体" },
  { field: "style", label: "风格" },
  { field: "composition", label: "构图" },
  { field: "lighting", label: "光线" },
  { field: "materials", label: "材质" },
  { field: "text", label: "文字" }
];
const emptyPromptStructure: PromptStructure = {
  subject: "",
  style: "",
  composition: "",
  lighting: "",
  materials: "",
  text: ""
};
const heroImageOverrides: Record<number, string> = {
  20125: "/image2/hero/case-20125-portrait.jpg",
  20242: "/image2/hero/case-20242-coffee.jpg",
  20243: "/image2/hero/case-20243-fashion.jpg",
  20259: "/image2/hero/case-20259-burger.jpg",
  20275: "/image2/hero/case-20275-bangkok.jpg",
  30001: "/image2/hero/case-30001-vr.jpg"
};

const normalize = (value: string) => value.trim().toLowerCase();
const stripSearchWhitespace = (value: string) => value.replace(/\s+/g, "");

type CaseSearchHaystack = {
  compact: string;
  text: string;
};


const getCaseKey = (item: Pick<Image2Case, "detailKey" | "id">) => item.detailKey ?? String(item.id);
const withDataVersion = (url: string) => `${url}${url.includes("?") ? "&" : "?"}v=${image2DataVersion}`;

const proxyRemoteImageUrl = (value: string) => {
  if (!value || value.startsWith("/")) return value;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return value;
    return `/api/image2/proxy?url=${encodeURIComponent(url.toString())}`;
  } catch {
    return value;
  }
};

const normalizeCaseImages = (data: CasePayload): CasePayload => ({
  ...data,
  cases: data.cases.map((item) => ({
    ...item,
    imageUrl: proxyRemoteImageUrl(item.imageUrl)
  }))
});

const scopedAssetStorageKey = (key: string, owner?: string | null) => {
  const userId = owner !== undefined ? owner : typeof window === "undefined" ? null : readAccountSession()?.user.id;
  return userId ? `${key}:account:${encodeURIComponent(userId)}` : key;
};

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes} 分 ${rest} 秒` : `${minutes} 分钟`;
};

const formatHistoryTime = (value: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));

const formatMembershipDate = (value?: string) => {
  if (!value) return "未激活";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未激活";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

const formatFreeQuotaText = (_quota: Image2FreeQuota | null) => {
  return "ANS 积分 2点/张";
};

const readAccountSession = () => {
  try {
    const raw = window.localStorage.getItem(accountSessionStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Image2AccountSession;
    if (!parsed.accessToken || !parsed.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
};

const persistAccountSession = (session: Image2AccountSession) => {
  window.localStorage.setItem(accountSessionStorageKey, JSON.stringify(session));
  window.localStorage.setItem(workbenchAccountSessionStorageKey, JSON.stringify(session));
  return session;
};

const clearAccountSession = () => {
  window.localStorage.removeItem(accountSessionStorageKey);
  window.localStorage.removeItem(workbenchAccountSessionStorageKey);
};

const supabaseAuthHeaders = (accessToken?: string) => ({
  apikey: supabaseAnonKey,
  "Content-Type": "application/json",
  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
});

const toAccountSession = (data: Record<string, unknown>): Image2AccountSession => {
  const user = data.user as { id?: string; email?: string } | undefined;
  const accessToken = typeof data.access_token === "string" ? data.access_token : "";
  if (!accessToken || !user?.id) throw new Error("登录响应缺少会话信息。");

  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : undefined;
  return {
    accessToken,
    refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : undefined,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
    user: {
      id: user.id,
      email: user.email
    }
  };
};

const supabaseAuthRequest = async (path: string, init: RequestInit = {}, accessToken?: string) => {
  if (!isSupabaseAuthConfigured) throw new Error("Supabase 账号入口未配置。");
  const response = await fetch(`${supabaseAuthUrl}/auth/v1/${path}`, {
    ...init,
    headers: {
      ...supabaseAuthHeaders(accessToken),
      ...(init.headers ?? {})
    }
  });
  const text = await response.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = { message: text.slice(0, 240) };
    }
  }

  if (!response.ok) {
    throw new Error(
      String(data.error_description ?? data.msg ?? data.message ?? data.error ?? "账号请求失败。")
    );
  }

  return data;
};

const getSupabaseUser = async (accessToken: string) => {
  const data = await supabaseAuthRequest("user", { cache: "no-store" }, accessToken);
  const id = typeof data.id === "string" ? data.id : "";
  if (!id) throw new Error("登录状态已失效。");
  return {
    id,
    email: typeof data.email === "string" ? data.email : undefined
  };
};

const signInWithSupabasePassword = async (email: string, password: string) =>
  toAccountSession(
    await supabaseAuthRequest("token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password })
    })
  );

const withAuthRedirect = (path: string, redirectTo?: string) =>
  redirectTo ? `${path}${path.includes("?") ? "&" : "?"}redirect_to=${encodeURIComponent(redirectTo)}` : path;

const getAuthCallbackUrl = (mode: "confirm" | "recovery") => {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/auth/callback?mode=${mode}`;
};

const signUpWithSupabasePassword = async (email: string, password: string, redirectTo?: string) => {
  const data = await supabaseAuthRequest(withAuthRedirect("signup", redirectTo), {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return data.access_token ? toAccountSession(data) : null;
};

const recoverSupabasePassword = async (email: string, redirectTo?: string) => {
  await supabaseAuthRequest(withAuthRedirect("recover", redirectTo), {
    method: "POST",
    body: JSON.stringify({ email })
  });
};

const verifySupabaseEmailCode = async (email: string, token: string, type: SupabaseOtpType) =>
  toAccountSession(
    await supabaseAuthRequest("verify", {
      method: "POST",
      body: JSON.stringify({ email, token, type })
    })
  );

const verifySupabaseSignupCode = async (email: string, token: string) => {
  try {
    return await verifySupabaseEmailCode(email, token, "signup");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/type|otp|token|invalid|verify/i.test(message)) throw error;
    return verifySupabaseEmailCode(email, token, "email");
  }
};

const updateSupabasePassword = async (accessToken: string, password: string) => {
  await supabaseAuthRequest(
    "user",
    {
      method: "PUT",
      body: JSON.stringify({ password })
    },
    accessToken
  );
};

const signOutSupabaseSession = async (accessToken: string) => {
  await supabaseAuthRequest("logout", { method: "POST" }, accessToken);
};

const requestImage2Wallet = async (session: Image2AccountSession) => {
  const response = await fetch("/api/image2/balance", {
    headers: {
      Authorization: `Bearer ${session.accessToken}`
    },
    cache: "no-store"
  });
  const data = (await response.json()) as Image2WalletStatus & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "图片余额读取失败。");
  return data;
};

const requestImage2Assets = async (session: Image2AccountSession) => {
  const response = await fetch(`/api/image2/assets?userId=${encodeURIComponent(session.user.id)}`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "x-image2-user": session.user.id
    },
    cache: "no-store"
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string; snapshot?: Image2AssetSnapshot };
  if (!response.ok) throw new Error(data.error ?? "收藏夹读取失败。");
  return data.snapshot ?? null;
};

const saveImage2Assets = async (session: Image2AccountSession, snapshot: Image2AssetSnapshot) => {
  const response = await fetch("/api/image2/assets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
      "x-image2-user": session.user.id
    },
    body: JSON.stringify({ snapshot })
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string; snapshot?: Image2AssetSnapshot };
  if (!response.ok) throw new Error(data.error ?? "收藏夹同步失败。");
  return data.snapshot ?? snapshot;
};

const redeemImage2License = async (session: Image2AccountSession, code: string) => {
  const response = await fetch("/api/image2/redeem", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ code })
  });
  const data = (await response.json()) as {
    redemption?: { credits?: number; plan?: string };
    wallet?: Image2WalletStatus;
    membership?: unknown;
    error?: string;
  };
  if (!response.ok || (!data.wallet && !data.membership)) throw new Error(data.error ?? "卡密兑换失败。");
  return data;
};

const promptTextHas = (item: Image2Case, pattern: RegExp) => pattern.test(`${item.title} ${item.prompt ?? ""}`);

const normalizePromptStructure = (value: Partial<PromptStructure> | undefined, fallback: PromptStructure) =>
  promptFieldLabels.reduce(
    (fields, { field }) => ({
      ...fields,
      [field]: typeof value?.[field] === "string" && value[field]?.trim() ? value[field]?.trim() : fallback[field]
    }),
    { ...emptyPromptStructure }
  );

const inferPromptStructure = (item: Image2Case): PromptStructure => {
  const fallback: PromptStructure = {
    subject: item.title,
    style: item.styleLabels.slice(0, 3).join("、") || item.categoryLabel || "清晰可复用风格",
    composition:
      item.aspect === "portrait"
        ? "竖向主视觉，主体层级清楚，保留上下安全区"
        : item.aspect === "landscape"
          ? "横向布局，前中后景分层明确"
          : `${item.categoryLabel} 构图，主体优先，留出改写空间`,
    lighting: promptTextHas(item, /light|lighting|shadow|sun|glow|studio|光|阴影|日光/i)
      ? "沿用原提示词的光线方向、反差和氛围"
      : "光线服务主体识别、材质层次和画面焦点",
    materials: promptTextHas(item, /glass|metal|paper|stone|fabric|texture|wood|plastic|marble|材质|纹理|纸|金属|玻璃/i)
      ? "保留关键材质、表面纹理与边缘细节"
      : "补足主体材质、背景表面和细节可信度",
    text: promptTextHas(item, /text|title|headline|copy|logo|label|typography|font|字|标题|文案|排版/i)
      ? "只保留必要文字，指定层级、位置和可读留白"
      : "不强行加字，需要投放时预留文字安全区"
  };

  return normalizePromptStructure(item.promptStructure, fallback);
};

const inferReuseProfile = (item: Image2Case): ReuseProfile => {
  if (item.reuseProfile) return item.reuseProfile;

  const text = `${item.title} ${item.prompt ?? ""} ${item.riskNote ?? ""}`.toLowerCase();
  const brandRisk = /brand|logo|marvel|openai|youtube|meta|spider|品牌|商标|ip|reference_/.test(text);
  const structured = item.promptKind === "JSON/结构化" || /^\s*[\[{]/.test(item.prompt ?? "");
  const sourced = Boolean(item.sourceUrl);

  if (!brandRisk && (structured || (item.prompt ?? "").length >= 260)) {
    return {
      verdict: "direct",
      label: "可直接改写",
      difficulty: structured ? "结构清楚" : "轻改可用",
      stability: structured ? "高" : "中",
      sourceConfidence: sourced ? "来源可追溯" : "来源待核查",
      note: "主体和变量替换后即可进入生成验证。"
    };
  }

  if (brandRisk || item.riskNote?.trim()) {
    return {
      verdict: "study",
      label: "适合拆解",
      difficulty: brandRisk ? "先去品牌" : "需改边界",
      stability: structured ? "中高" : "中",
      sourceConfidence: sourced ? "来源可追溯" : "来源待核查",
      note: "先吸收构图和提示词结构，再替换来源资产与敏感元素。"
    };
  }

  return {
    verdict: "inspiration",
    label: "灵感参考",
    difficulty: "需补变量",
    stability: "待验证",
    sourceConfidence: sourced ? "来源可追溯" : "来源待核查",
    note: "更适合作为方向卡片，生成前先补主体和输出约束。"
  };
};

// Only explicit upstream placeholders are editable variables; inferred structure is supplementary.
const promptVariables = findPromptVariables;
const buildRewritePrompt = (fields: PromptStructure, base: string, variables: Record<string, string>) => {
  const prompt = renderPrompt(base, variables);
  const additions = promptFieldLabels.filter(({ field }) => fields[field].trim()).map(({ field, label }) => label + '：' + fields[field].trim());
  return additions.length ? [prompt, '本站编辑补充要求（未涉及的身份、产品细节和结构约束保持原文）：', ...additions].join('\n\n') : prompt;
};

const readPromptWorkbenchDrafts = (owner?: string | null) => {
  if (typeof window === "undefined") return {} as Record<string, PromptWorkbenchDraft>;

  try {
    const raw = window.localStorage.getItem(scopedAssetStorageKey(promptWorkbenchStorageKey, owner));
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, PromptWorkbenchDraft] => {
        const draft = entry[1] as PromptWorkbenchDraft;
        return Boolean(
          entry[0] &&
            draft &&
            typeof draft.caseTitle === "string" &&
            typeof draft.note === "string" &&
            typeof draft.prompt === "string" &&
            typeof draft.updatedAt === "string" &&
            draft.fields &&
            promptFieldLabels.every(({ field }) => typeof draft.fields[field] === "string")
        );
      })
    );
  } catch {
    return {};
  }
};

const persistPromptWorkbenchDrafts = (drafts: Record<string, PromptWorkbenchDraft>, owner?: string | null) => {
  if (typeof window === "undefined") return drafts;

  try {
    if (Object.keys(drafts).length) {
      window.localStorage.setItem(scopedAssetStorageKey(promptWorkbenchStorageKey, owner), JSON.stringify(drafts));
    } else {
      window.localStorage.removeItem(scopedAssetStorageKey(promptWorkbenchStorageKey, owner));
    }
  } catch {
    reportStorageFailure();
  }

  return drafts;
};

const readPromptReuseHistory = () => {
  if (typeof window === "undefined") return [] as PromptReuseHistoryItem[];

  try {
    const raw = window.localStorage.getItem(scopedAssetStorageKey(promptReuseHistoryStorageKey));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is PromptReuseHistoryItem => {
        return Boolean(
          item &&
            typeof item.id === "string" &&
            typeof item.caseKey === "string" &&
            typeof item.caseTitle === "string" &&
            typeof item.createdAt === "string" &&
            typeof item.prompt === "string" &&
            ["copied", "generated", "saved"].includes(item.action)
        );
      })
      .slice(0, maxPromptReuseHistoryItems);
  } catch {
    return [];
  }
};

const persistPromptReuseHistory = (items: PromptReuseHistoryItem[], owner?: string | null) => {
  const next = items.slice(0, maxPromptReuseHistoryItems);
  if (typeof window === "undefined") return next;

  try {
    if (next.length) {
      window.localStorage.setItem(scopedAssetStorageKey(promptReuseHistoryStorageKey, owner), JSON.stringify(next));
    } else {
      window.localStorage.removeItem(scopedAssetStorageKey(promptReuseHistoryStorageKey, owner));
    }
  } catch {
    reportStorageFailure();
  }

  return next;
};

const readCaseAssetState = (): CaseAssetState => {
  const fallback: CaseAssetState = {
    activeCollectionId: null,
    collections: [],
    notes: {}
  };

  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(scopedAssetStorageKey(caseAssetStorageKey));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<CaseAssetState>;

    const collections = Array.isArray(parsed.collections)
      ? parsed.collections
          .filter((item): item is CaseCollection => {
            return Boolean(
              item &&
                typeof item.id === "string" &&
                typeof item.name === "string" &&
                typeof item.createdAt === "string" &&
                typeof item.updatedAt === "string" &&
                Array.isArray(item.caseKeys)
            );
          })
          .map((item) => ({
            ...item,
            name: item.name.trim(),
            caseKeys: [...new Set(item.caseKeys.filter((key): key is string => typeof key === "string" && Boolean(key.trim())).map((key) => key.trim()))]
          }))
          .filter((item) => Boolean(item.name))
      : [];

    const notes =
      parsed.notes && typeof parsed.notes === "object" && !Array.isArray(parsed.notes)
        ? Object.fromEntries(
            Object.entries(parsed.notes).filter((entry): entry is [string, CaseNote] => {
              const value = entry[1] as CaseNote;
              return Boolean(
                entry[0] &&
                  value &&
                  typeof value.caseKey === "string" &&
                  typeof value.note === "string" &&
                  typeof value.updatedAt === "string"
              );
            })
          )
        : {};

    const activeCollectionId =
      typeof parsed.activeCollectionId === "string" && collections.some((item) => item.id === parsed.activeCollectionId)
        ? parsed.activeCollectionId
        : null;

    return {
      activeCollectionId,
      collections,
      notes
    };
  } catch {
    return fallback;
  }
};

const persistCaseAssetState = (state: CaseAssetState, owner?: string | null) => {
  if (typeof window === "undefined") return state;

  try {
    if (!state.collections.length && !Object.keys(state.notes).length && !state.activeCollectionId) {
      window.localStorage.removeItem(scopedAssetStorageKey(caseAssetStorageKey, owner));
    } else {
      window.localStorage.setItem(scopedAssetStorageKey(caseAssetStorageKey, owner), JSON.stringify(state));
    }
  } catch {
    reportStorageFailure();
  }

  return state;
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));

const normalizeAssetPromptDrafts = (value: unknown) =>
  isRecord(value)
    ? Object.fromEntries(
        Object.entries(value).filter((entry): entry is [string, PromptWorkbenchDraft] => {
          const draft = entry[1] as PromptWorkbenchDraft;
          return Boolean(
            entry[0] &&
              draft &&
              typeof draft.caseTitle === "string" &&
              typeof draft.note === "string" &&
              typeof draft.prompt === "string" &&
              typeof draft.updatedAt === "string" &&
              draft.fields &&
              promptFieldLabels.every(({ field }) => typeof draft.fields[field] === "string")
          );
        })
      )
    : {};

const normalizeAssetPromptReuseHistory = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((item): item is PromptReuseHistoryItem => {
          return Boolean(
            item &&
              typeof item.id === "string" &&
              typeof item.caseKey === "string" &&
              typeof item.caseTitle === "string" &&
              typeof item.createdAt === "string" &&
              typeof item.prompt === "string" &&
              ["copied", "generated", "saved"].includes(item.action)
          );
        })
        .slice(0, maxPromptReuseHistoryItems)
    : [];

const buildAssetSnapshot = (input: {
  favoriteCaseKeys: Set<string>;
  caseAssetState: CaseAssetState;
  promptDrafts: Record<string, PromptWorkbenchDraft>;
  promptReuseHistory: PromptReuseHistoryItem[];
}): Image2AssetSnapshot => ({
  activeCollectionId: input.caseAssetState.activeCollectionId,
  collections: input.caseAssetState.collections,
  favoriteCaseKeys: [...input.favoriteCaseKeys],
  notes: input.caseAssetState.notes,
  promptDrafts: input.promptDrafts,
  promptReuseHistory: input.promptReuseHistory.slice(0, maxPromptReuseHistoryItems),
  updatedAt: new Date().toISOString(),
  version: "image2-assets-v1"
});

const mergeAssetSnapshots = (local: Image2AssetSnapshot, cloud?: Partial<Image2AssetSnapshot> | null): Image2AssetSnapshot => {
  if (!cloud) return local;

  const collectionMap = new Map<string, CaseCollection>();
  for (const collection of [...(cloud.collections ?? []), ...local.collections]) {
    const existing = collectionMap.get(collection.id);
    collectionMap.set(collection.id, {
      ...collection,
      caseKeys: [...new Set([...(existing?.caseKeys ?? []), ...collection.caseKeys])]
    });
  }

  const collections = [...collectionMap.values()];
  const activeCollectionId =
    local.activeCollectionId && collections.some((item) => item.id === local.activeCollectionId)
      ? local.activeCollectionId
      : cloud.activeCollectionId && collections.some((item) => item.id === cloud.activeCollectionId)
        ? cloud.activeCollectionId
        : null;

  const historyMap = new Map<string, PromptReuseHistoryItem>();
  for (const record of [...normalizeAssetPromptReuseHistory(cloud.promptReuseHistory), ...local.promptReuseHistory]) {
    historyMap.set(record.id, record);
  }

  return {
    activeCollectionId,
    collections,
    favoriteCaseKeys: [...new Set([...(cloud.favoriteCaseKeys ?? []), ...local.favoriteCaseKeys])],
    notes: Object.fromEntries([...new Set([...Object.keys(cloud.notes ?? {}), ...Object.keys(local.notes)])].map(key => {
      const a = cloud.notes?.[key], b = local.notes[key];
      if (!a || !b || a.note === b.note) return [key, b ?? a];
      const latest = a.updatedAt > b.updatedAt ? a : b, other = latest === a ? b : a;
      return [key, { ...latest, note: latest.note.includes(other.note) ? latest.note : latest.note + '\n\n并行备注（保留副本）\n' + other.note }];
    })),
    promptDrafts: Object.fromEntries([...new Set([...Object.keys(cloud.promptDrafts ?? {}), ...Object.keys(local.promptDrafts)])].map(key => {
      const a = normalizeAssetPromptDrafts(cloud.promptDrafts)[key], b = local.promptDrafts[key];
      const chosen = !a ? b : !b ? a : a.updatedAt > b.updatedAt ? a : b;
      const versions = mergePromptVersions(normalizePromptVersions(a?.versions), normalizePromptVersions(b?.versions));
      if (a && b && (a.prompt !== b.prompt || a.note !== b.note)) {
        const other = chosen === a ? b : a;
        if (!versions.some(v => v.prompt === other.prompt && v.note === other.note)) versions.push({ id: 'draft-conflict-' + promptFingerprint(other.prompt + other.note), name: '并行草稿（保留副本）', prompt: other.prompt, note: other.note, basePrompt: other.basePrompt, variables: other.variables, fields: { ...other.fields }, createdAt: other.updatedAt });
      }
      return [key, { ...chosen, versions }];
    })),
    promptReuseHistory: [...historyMap.values()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, maxPromptReuseHistoryItems),
    updatedAt: new Date().toISOString(),
    version: "image2-assets-v1"
  };
};

const stableRecord = <T,>(value: Record<string, T>) => Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));

const assetSnapshotSignature = (snapshot: Image2AssetSnapshot, userId?: string) =>
  JSON.stringify({
    userId: userId ?? "",
    favoriteCaseKeys: [...snapshot.favoriteCaseKeys].sort(),
    activeCollectionId: snapshot.activeCollectionId,
    collections: snapshot.collections
      .map((collection) => ({
        ...collection,
        caseKeys: [...collection.caseKeys].sort()
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    notes: stableRecord(snapshot.notes),
    promptDrafts: stableRecord(snapshot.promptDrafts),
    promptReuseHistory: snapshot.promptReuseHistory.map((record) => ({
      action: record.action,
      caseKey: record.caseKey,
      createdAt: record.createdAt,
      id: record.id,
      prompt: record.prompt
    }))
  });

const progressForStage = (stage?: string, elapsedSeconds = 0) => {
  if (stage === "任务已提交") return 14;
  if (stage === "正在构图") return 36;
  if (stage === "细节生成中") return 68;
  if (stage === "等待图片返回") return 88;
  if (stage === "仍在排队") return 94;
  return getGenerationStage(elapsedSeconds).progress;
};

class FreeQuotaExhaustedError extends Error {
  code = freeQuotaExhaustedCode;
  quota?: Image2FreeQuota;

  constructor(message: string, quota?: Image2FreeQuota) {
    super(message);
    this.name = "FreeQuotaExhaustedError";
    this.quota = quota;
  }
}

const isQuotaPayload = (value: unknown): value is { code?: string; error?: string; quota?: Image2FreeQuota } => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.code === freeQuotaExhaustedCode || Boolean(record.quota);
};

const isFreeQuotaError = (error: unknown): error is FreeQuotaExhaustedError => {
  return error instanceof FreeQuotaExhaustedError || (Boolean(error) && (error as { code?: string }).code === freeQuotaExhaustedCode);
};

const getGenerationStage = (seconds: number) => {
  if (seconds < 8) {
    return {
      label: "任务已提交",
      detail: "正在把提示词和画幅参数送入生成队列。",
      progress: 12
    };
  }
  if (seconds < 28) {
    return {
      label: "正在构图",
      detail: "模型在搭主体、背景和视觉结构，这一段通常看不到中间图。",
      progress: 36
    };
  }
  if (seconds < 58) {
    return {
      label: "细节生成中",
      detail: "纹理、文字、光影和边缘细节会在这一阶段变慢。",
      progress: 68
    };
  }
  if (seconds < 100) {
    return {
      label: "接近完成",
      detail: "正在等待图片返回并写入结果区，高峰期可能会多等一会。",
      progress: 88
    };
  }
  return {
    label: "仍在排队",
    detail: "已超过常规时间，不要重复点击；如果失败，页面会给出错误提示。",
    progress: 94
  };
};

const readGenerationHistory = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(scopedAssetStorageKey(generationHistoryStorageKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is GenerationHistoryItem => {
        return (
          item &&
          typeof item.id === "string" &&
          typeof item.caseId === "number" &&
          typeof item.caseTitle === "string" &&
          Array.isArray(item.images)
        );
      })
      ;
  } catch {
    return [];
  }
};

const readFavoriteCaseKeys = () => {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(scopedAssetStorageKey(favoriteCaseStorageKey));
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((item): item is string => typeof item === "string" && Boolean(item.trim())));
  } catch {
    return new Set<string>();
  }
};

const persistFavoriteCaseKeys = (keys: Set<string>, owner?: string | null) => {
  if (typeof window === "undefined") return keys;

  try {
    if (keys.size) {
      window.localStorage.setItem(scopedAssetStorageKey(favoriteCaseStorageKey, owner), JSON.stringify([...keys]));
    } else {
      window.localStorage.removeItem(scopedAssetStorageKey(favoriteCaseStorageKey, owner));
    }
  } catch {
    reportStorageFailure();
  }

  return keys;
};

const reportStorageFailure = () => window.dispatchEvent(new CustomEvent('image2-storage-error'));
const persistGenerationHistory = (items: GenerationHistoryItem[]) => {
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(scopedAssetStorageKey(generationHistoryStorageKey), JSON.stringify(items)); }
    catch { reportStorageFailure(); }
  }
  return items;
};

const commitAssetBackup = (snapshot: Image2AssetSnapshot, records: GenerationHistoryItem[], owner: string | null) => {
  const writes: Array<[string, unknown]> = [
    [favoriteCaseStorageKey, snapshot.favoriteCaseKeys],
    [caseAssetStorageKey, { collections: snapshot.collections, notes: snapshot.notes, activeCollectionId: snapshot.activeCollectionId }],
    [promptWorkbenchStorageKey, snapshot.promptDrafts],
    [promptReuseHistoryStorageKey, snapshot.promptReuseHistory],
    [generationHistoryStorageKey, records]
  ];
  const previous = writes.map(([key]) => [scopedAssetStorageKey(key, owner), window.localStorage.getItem(scopedAssetStorageKey(key, owner))] as const);
  try { for (const [key, value] of writes) window.localStorage.setItem(scopedAssetStorageKey(key, owner), JSON.stringify(value)); }
  catch (error) {
    for (const [key, value] of previous) { try { if (value === null) window.localStorage.removeItem(key); else window.localStorage.setItem(key, value); } catch { reportStorageFailure(); } }
    throw error;
  }
};

function authJsonHeaders(accessToken?: string) {
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
  };
}

async function requestImage2Json(payload: Record<string, unknown>, accessToken?: string) {
  const response = await fetch("/api/image2", {
    method: "POST",
    headers: authJsonHeaders(accessToken),
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok && isQuotaPayload(data) && (data.code === freeQuotaExhaustedCode || data.code === balanceRequiredCode)) {
    throw new FreeQuotaExhaustedError(data.error ?? "请登录 ANS 账号后使用算力积分生成（2 积分/张）。", data.quota);
  }
  if (!response.ok) throw new Error(data.error ?? "生成失败。");
  return data as GenerationResult;
}

async function requestImage2Quota() {
  const response = await fetch("/api/image2/quota", { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return null;
  return data.quota as Image2FreeQuota | undefined;
}

async function requestImage2Stream(
  payload: Record<string, unknown>,
  onStatus: (status: GenerationStreamStatus) => void,
  accessToken?: string
) {
  const response = await fetch("/api/image2/stream", {
    method: "POST",
    headers: authJsonHeaders(accessToken),
    body: JSON.stringify(payload)
  });

  if (!response.ok || !response.body) {
    return requestImage2Json(payload, accessToken);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handleEvent = (raw: string) => {
    const lines = raw.split(/\r?\n/);
    let event = "message";
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (!dataLines.length) return null;
    const data = JSON.parse(dataLines.join("\n"));
    if (event === "status") {
      onStatus(data as GenerationStreamStatus);
      return null;
    }
    if (event === "error") {
      if (isQuotaPayload(data) && (data.code === freeQuotaExhaustedCode || data.code === balanceRequiredCode)) {
        throw new FreeQuotaExhaustedError(data.error ?? "请登录 ANS 账号后使用算力积分生成（2 积分/张）。", data.quota);
      }
      throw new Error(typeof data.error === "string" ? data.error : "生成失败。");
    }
    if (event === "quota") {
      throw new FreeQuotaExhaustedError(data.error ?? "请登录 ANS 账号后使用算力积分生成（2 积分/张）。", data.quota);
    }
    if (event === "done") {
      return data as GenerationResult;
    }
    return null;
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    let separatorIndex = buffer.indexOf("\n\n");
    while (separatorIndex >= 0) {
      const raw = buffer.slice(0, separatorIndex).trim();
      buffer = buffer.slice(separatorIndex + 2);
      if (raw) {
        const result = handleEvent(raw);
        if (result) return result;
      }
      separatorIndex = buffer.indexOf("\n\n");
    }

    if (done) break;
  }

  throw new Error("生成连接中断，请稍后重试。");
}

function CaseImage({
  alt,
  className,
  loading = "lazy",
  onPreview,
  previewLabel = "查看高清大图",
  src,
  textOnly = false,
  timeoutMs = 12000
}: CaseImageProps) {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const imageSrc = retry ? src + (src.includes("?") ? "&" : "?") + "retry=" + retry : src;
  const [loaded, setLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loading === "eager");
  const [shellElement, setShellElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (textOnly) return;
    setFailed(false);
    setLoaded(false);
    setIsInView(loading === "eager");
  }, [loading, src, textOnly]);

  useEffect(() => {
    if (textOnly || !shellElement || loading === "eager") return;
    if (!("IntersectionObserver" in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "420px 0px" }
    );

    observer.observe(shellElement);
    return () => observer.disconnect();
  }, [loading, shellElement, src, textOnly]);

  useEffect(() => {
    if (textOnly || !isInView || failed || loaded) return;

    const timer = window.setTimeout(() => {
      setFailed(true);
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [failed, isInView, loaded, src, retry, timeoutMs, textOnly]);

  if (textOnly) {
    return (
      <div className={"case-image-shell case-image-text-only" + (className ? " " + className : "")} aria-label="纯文本提示词案例">
        <span>纯文本提示词案例</span>
      </div>
    );
  }
  const handleUnavailable = () => {
    setFailed(true);
    setLoaded(false);
  };

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (!image.naturalWidth || !image.naturalHeight) {
      handleUnavailable();
      return;
    }

    setLoaded(true);
  };

  const shellClassName = `case-image-shell${className ? ` ${className}` : ""}${loaded ? " is-loaded" : ""}${failed ? " is-unavailable" : ""}${onPreview ? " can-preview" : ""}`;
  const content = !failed ? (
    <>
      <img alt={alt} key={imageSrc} loading={loading} src={imageSrc} onError={handleUnavailable} onLoad={handleLoad} />
      {onPreview && loaded && (
        <span className="case-image-zoom-cue" aria-hidden="true">
          <Maximize2 />
        </span>
      )}
    </>
  ) : <span className="case-image-fallback">图片暂未加载，提示词仍可复用{onPreview ? " · 点击重试" : " · 打开详情可重试"}</span>;

  if (onPreview) {
    return (
      <button
        ref={setShellElement}
        aria-label={failed ? "重新加载图片" : previewLabel}
        className={shellClassName}
        title={previewLabel}
        type="button"
        onClick={() => { if (failed) { setFailed(false); setLoaded(false); setRetry(Date.now()); } else onPreview(); }}
      >
        {content}
      </button>
    );
  }

  return (
    <div ref={setShellElement} className={shellClassName}>
      {content}
    </div>
  );
}

function CaseDetailContent({
  editorScope,
  copiedId,
  freeQuota,
  wallet,
  generation,
  generationError,
  generationElapsedSeconds,
  generationHistory,
  generationStatus,
  isGenerating,
  isFavorite,
  isPromptLoading,
  item,
  onCopy,
  onCopyRewrite,
  onGenerate,
  onGenerateRewrite,
  onToggleFavorite,
  onPreviewImage,
  onOpenHistory,
  onOpenQuota,
  onResetWorkbench,
  onSaveWorkbench,
  onSaveCaseNote,
  onWorkbenchFieldChange,
  onWorkbenchNoteChange,
  onBasePromptChange, onVariableChange, onRestoreVariant, onEnterWorkbench, basePrompt, variables,
  recentReuse,
  caseCollections,
  selectedCaseCollectionIds,
  rewriteCopiedKey,
  rewritePrompt, editorStatus,
  savedWorkbench,
  workbenchFields,
  workbenchNote,
  caseNoteDraft,
  caseNoteUpdatedAt,
  language,
  onCaseNoteChange,
  onClearCaseNote,
  onToggleCaseCollection,
}: CaseDetailContentProps) {
  const hasPrompt = Boolean(item.prompt?.trim());
  const quotaLabel =
    freeQuota && freeQuota.remaining > 0
      ? "生成同款（2 积分）"
      : wallet && wallet.balance > 0
        ? "余额生成同款"
        : "生成同款";
  const reuse = inferReuseProfile(item);
  const localized = localizedCaseText(item, language);
  const pageCopy = caseLibraryCopy[language];
  const currentStage = isGenerating
    ? generationStatus?.stage
      ? {
          label: generationStatus.stage,
          detail: generationStatus.detail ?? "页面正在持续等待结果，不需要重复点击生成。",
          progress: progressForStage(generationStatus.stage, generationElapsedSeconds)
        }
      : getGenerationStage(generationElapsedSeconds)
    : {
        label: generation ? "生成完成" : "等待生成",
        detail: generation
          ? `本次用时 ${formatDuration(Math.round(generation.elapsedSeconds ?? 0))}，结果已显示在下方并加入历史记录。`
          : "每张图通常需要 60 到 90 秒，开始后可以留在这个面板等待。",
        progress: generation ? 100 : 0
      };

  return (
    <>
      <CaseImage
        alt={localized.imageAlt}
        className="case-detail-cover"
        loading="eager"
        src={item.imageUrl}
        textOnly={item.imageStatus === "text-only"}
        timeoutMs={9000}
        onPreview={() =>
          onPreviewImage({
            alt: localized.imageAlt,
            meta: [item.caseCode ?? `Case ${item.id}`, localized.categoryLabel, item.resolution].filter(Boolean).join(" · "),
            src: item.imageUrl,
            title: localized.title
          })
        }
      />
      <div className="case-detail-body">
        <p className="case-detail-kicker">
          {item.caseCode ?? `Case ${item.id}`} · {item.sourceName ?? "Canghe"} · {localized.valueTier || item.valueTier}
        </p>
        <div className="case-detail-heading">
          <h2>{localized.title}</h2>
          <button
            aria-pressed={isFavorite}
            className={isFavorite ? "case-favorite-detail active" : "case-favorite-detail"}
            title={isFavorite ? (language === "zh" ? "移出收藏" : "Remove favorite") : language === "zh" ? "收藏图片与提示词" : "Save image and prompt"}
            type="button"
            onClick={() => onToggleFavorite(item)}
          >
            <Heart aria-hidden="true" />
            <span>{isFavorite ? pageCopy.detail.favoriteOn : pageCopy.detail.favoriteOff}</span>
          </button>
        </div>
        <p className="case-detail-original-title">{localized.titleSecondary}</p>
        <div className="case-tag-row">
          {[
            localized.categoryLabel,
            item.sourceCategory,
            item.sourceStatus === "archived" ? "存量归档" : undefined,
            item.promptFamily && item.promptFamily.size > 1 ? `${item.promptFamily.size} 个同提示词变体` : undefined,
            localized.promptKind || item.promptKind,
            item.resolution,
            `${language === "zh" ? "编辑评分" : "Editorial score"} ${item.valueScore}`
          ]
            .filter((tag): tag is string => Boolean(tag))
            .map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
        </div>

        <section aria-label="图片与模型依据" className="case-image-evidence">
          <a href={item.sourceUrl} target="_blank" rel="noreferrer">图片不可用时查看上游来源 ↗</a>
          <p>上游模型：{item.model || "未知"} · 本站未实测</p>
          {item.modelEvidence ? <small>{item.modelEvidence.note}</small> : null}
          {item.referenceRequired ? <p>需要参考图 · {item.inputCompleteness === "provided" ? "上游已提供输入图" : "上游未提供完整输入，复用前需自行准备"}</p> : null}
          {([['output', '更多效果图'], ['reference', '输入参考图'], ['comparison', '跨模型对照']] as const).map(([role, label]) => {
            const pictures = (item.imageRoles || []).filter((image) => image.role === role && (role !== 'output' || proxyRemoteImageUrl(image.url) !== item.imageUrl));
            return pictures.length ? <div key={role}><h3>{label}</h3><div className="case-image-set">{pictures.map((image) => <Image2EvidenceImage key={image.url} src={proxyRemoteImageUrl(image.url)} label={image.label || label} sourceUrl={item.sourceUrl} onPreview={src => onPreviewImage({ src, title: label, alt: image.label || label, meta: image.label || label })} />)}</div></div> : null;
          })}
          {item.sourceLicense ? <small>许可说明：{item.sourceLicense}</small> : null}
          {item.sourceRecord?.credit ? <p>{item.sourceRecord.credit}</p> : null}
          {item.sourceRecord?.links?.map(link => <p key={link}><a href={link} target="_blank" rel="noreferrer noopener">来源证据：{link}</a></p>)}
          {item.sourceRights?.rightsNotice ? <small>{item.sourceRights.rightsNotice}</small> : null}
        </section>

        <section className={`case-reuse-profile ${reuse.verdict}`} aria-label="案例复用标注">
          <div>
            <strong>{reuse.label}</strong>
            <span>{reuse.difficulty}</span>
            <span>编辑判断 · 稳定度 {reuse.stability}</span>
            <span>{reuse.sourceConfidence}</span>
          </div>
          <p>{reuse.note}</p>
        </section>

        {item.editorialProfile ? (
          <section className="case-editorial-profile" aria-label="案例编辑评分">
            <div>
              <strong>{item.editorialProfile.score}</strong>
              <span>{item.editorialProfile.tier}</span>
              {item.editorialProfile.strengths.map((entry) => (
                <em key={entry}>{entry}</em>
              ))}
            </div>
            {item.editorialProfile.cautions.length ? <p>{item.editorialProfile.cautions.join(" · ")}</p> : null}
            <small>评分依据：{item.editorialProfile.basis}</small>
          </section>
        ) : null}

        {item.replicationGuide ? (
          <section className="case-replication-guide" aria-label="案例复刻指南">
            <header>
              <div>
                <small>REPLICATION PLAYBOOK</small>
                <h3>复刻指南</h3>
              </div>
              <span>{item.replicationGuide.workflow}</span>
            </header>
            <p className="case-replication-best-for">
              <strong>适合做什么</strong>
              {item.replicationGuide.bestFor}
            </p>
            <div className="case-replication-grid">
              {[
                ["准备输入", item.replicationGuide.requiredInputs],
                ["优先替换", item.replicationGuide.editableVariables],
                ["必须保持", item.replicationGuide.keepFixed],
                ["出图验收", item.replicationGuide.verification]
              ].map(([label, entries]) => (
                <div key={label as string}>
                  <strong>{label as string}</strong>
                  <ul>
                    {(entries as string[]).map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="case-replication-watchouts">
              <strong>常见失败点</strong>
              {item.replicationGuide.failureWatchouts.map((entry) => (
                <span key={entry}>{entry}</span>
              ))}
            </div>
          </section>
        ) : null}

        <div className="case-prompt-box">
          <h3>{pageCopy.detail.promptTitle}</h3>
          <div className="case-prompt-brief">
            <strong>{pageCopy.detail.promptSummary}</strong>
            <p>{localized.promptPreview}</p>
          </div>
          <pre className={!hasPrompt ? "is-loading" : ""}>
            {hasPrompt
              ? item.prompt
              : isPromptLoading
                ? "正在加载完整提示词，稍等一下就能复制或生成同款。"
                : "完整提示词暂时没有加载成功，请重新点开这个案例。"}
          </pre>
          <div className="case-actions">
            <button disabled={!hasPrompt || isPromptLoading} type="button" onClick={() => onCopy(item)}>
              {copiedId === item.id ? <ClipboardCheck aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
              {copiedId === item.id ? "已复制" : "复制提示词"}
            </button>
            <button disabled={!hasPrompt || isPromptLoading || isGenerating || item.referenceRequired} type="button" onClick={onGenerate}>
              <WandSparkles aria-hidden="true" />
              {isPromptLoading
                ? "加载提示词"
                : isGenerating
                  ? `生成中 ${formatDuration(generationElapsedSeconds)}`
                  : item.referenceRequired ? "请在工作台选择参考图" : quotaLabel}
            </button>
          </div>
          <div className="case-gacha-entry" aria-label="案例复用入口">
            <span><PackageOpen aria-hidden="true" />继续复用</span>
            <div>
              <a href={`/image2-cases/${encodeURIComponent(getCaseKey(item))}`}>独立案例页</a>
              <a href={`/api/integrations/ans/cases/${encodeURIComponent(getCaseKey(item))}?download=1`} download>导出 ANS 案例包</a>
            </div>
          </div>
          <div className="case-gacha-entry" aria-label="同款抽卡入口">
            <span>
              <PackageOpen aria-hidden="true" />
              同款抽卡
            </span>
            {isFavorite ? (
              <div>
                <a href={`/image2-cases/gacha?case=${encodeURIComponent(getCaseKey(item))}&mode=single`}>单抽同款</a>
                <a href={`/image2-cases/gacha?case=${encodeURIComponent(getCaseKey(item))}&mode=pack`}>九抽同款</a>
              </div>
            ) : (
              <button type="button" onClick={() => onToggleFavorite(item)}>
                <Heart aria-hidden="true" />
                先收藏再抽
              </button>
            )}
          </div>
          <p className="case-generate-note">
            <span>{formatFreeQuotaText(freeQuota)}</span>
            每张图通常 60 到 90 秒；页面会持续等待结果，完成后出现在下方“生成结果”，并自动进入“生成历史”。
          </p>
          {(isGenerating || generation) && (
            <div className={`case-generation-status${isGenerating ? " is-running" : " is-done"}`}>
              <div className="case-generation-status-head">
                <span>
                  {isGenerating ? <Clock3 aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                  当前生成
                </span>
                <strong>{isGenerating ? formatDuration(generationElapsedSeconds) : "已完成"}</strong>
              </div>
              <div className="case-generation-progress" aria-hidden="true">
                <span style={{ width: `${currentStage.progress}%` }} />
              </div>
              <div className="case-generation-stage">
                <strong>{currentStage.label}</strong>
                <p>{currentStage.detail}</p>
              </div>
              <div className="case-generation-guides">
                <span>
                  <b>预计</b> 60-90 秒/张
                </span>
                <span>
                  <b>结果</b> 本面板下方
                </span>
                <span>
                  <b>历史</b> 页面会自动保留最近记录
                </span>
              </div>
            </div>
          )}
        </div>

        <section className="case-workbench" aria-label="提示词改写工作台">
          {item.referenceRequired ? <p role="note">此案例需要参考图 · {item.inputCompleteness === 'missing' ? '上游未提供输入，请准备自己的素材。' : '输入图见上方图组，工作台会保留其角色。'}</p> : null}
          <Image2PromptEditor key={editorScope + ":" + getCaseKey(item)} original={item.prompt ?? ''} base={basePrompt} rendered={rewritePrompt}
            variables={variables} note={workbenchNote} versions={normalizePromptVersions(savedWorkbench?.versions)} status={editorStatus}
            onBase={onBasePromptChange} onVariable={onVariableChange} onNote={onWorkbenchNoteChange}
            onSave={onSaveWorkbench} onRestore={onRestoreVariant} onReset={onResetWorkbench}
            onCopy={onCopyRewrite} onEnter={onEnterWorkbench} copied={rewriteCopiedKey === getCaseKey(item)} />
          {recentReuse.length > 0 && (
            <div className="case-reuse-history" aria-label="最近复用">
              {recentReuse.slice(0, 12).map((record) => (
                <span key={record.id}>
                  <b>{record.action === "saved" ? "保存" : record.action === "generated" ? "生成" : "复制"}</b>
                  {formatHistoryTime(record.createdAt)}
                  {record.action === 'saved' ? <button type="button" onClick={() => onRestoreVariant(record.prompt)}>恢复此变体</button> : null}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="case-asset-hub" aria-label="收藏夹与备注">
          <header>
            <div>
              <small>
                <FolderPlus aria-hidden="true" />
                Asset Hub
              </small>
              <h3>收藏夹与备注</h3>
            </div>
            <span>{caseCollections.length ? `${caseCollections.length} 个收藏夹` : "本地资产"}</span>
          </header>

          <div className="case-asset-collections">
            <div className="case-asset-collections-head">
              <strong>把当前案例收录到收藏夹</strong>
              <small>{selectedCaseCollectionIds.length ? `${selectedCaseCollectionIds.length} 个已收录` : "未收录到任何收藏夹"}</small>
            </div>
            <div className="case-asset-collection-list">
              {caseCollections.length ? (
                caseCollections.map((collection) => {
                  const isActive = selectedCaseCollectionIds.includes(collection.id);

                  return (
                    <button
                      key={collection.id}
                      className={isActive ? "active" : ""}
                      type="button"
                      onClick={() => onToggleCaseCollection(collection.id)}
                    >
                      <span>
                        <strong>{collection.name}</strong>
                        <small>{collection.caseKeys.length} 个案例</small>
                      </span>
                      {isActive ? <CheckCircle2 aria-hidden="true" /> : <FolderOpen aria-hidden="true" />}
                    </button>
                  );
                })
              ) : (
                <div className="case-asset-empty">
                  <FolderOpen aria-hidden="true" />
                  <strong>还没有收藏夹</strong>
                  <p>先新建一个收藏夹，再把常用案例收进去。</p>
                </div>
              )}
            </div>
          </div>

          <label className="case-asset-note">
            <span>案例备注</span>
            <textarea
              aria-label="案例备注"
              placeholder="记录这个案例的用途、需要替换的主体、投放渠道或者测试结论。"
              rows={4}
              value={caseNoteDraft}
              onChange={(event) => onCaseNoteChange(event.target.value)}
            />
          </label>

          <div className="case-asset-actions">
            <button type="button" onClick={onSaveCaseNote}>
              <Save aria-hidden="true" />
              保存备注
            </button>
            <button type="button" onClick={onClearCaseNote}>
              <Trash2 aria-hidden="true" />
              清空备注
            </button>
          </div>

          <p className="case-asset-note-meta">
            {caseNoteUpdatedAt ? `已保存 ${formatHistoryTime(caseNoteUpdatedAt)}` : "备注只保存在当前浏览器"}
          </p>
        </section>

        {generationError && <p className="case-error">{generationError}</p>}
        {generation && (
          <div className="case-generation" id="case-generation-result">
            <strong>本地生成结果</strong>
            <small>刚生成的图片会先显示在这里，同时写入下方“生成历史”。</small>
            {generation.images.map((image) => (
              <figure key={image.path}>
                <button
                  aria-label="查看生成图高清大图"
                  className="case-generation-preview-button"
                  type="button"
                  onClick={() =>
                    onPreviewImage({
                      alt: image.name,
                      meta: generation.elapsedSeconds ? `生成耗时 ${formatDuration(Math.round(generation.elapsedSeconds))}` : "生成结果",
                      src: image.dataUrl,
                      title: image.name
                    })
                  }
                >
                  <img alt={image.name} src={image.dataUrl} />
                  <span aria-hidden="true">
                    <Maximize2 />
                  </span>
                </button>
                <figcaption>{image.name}</figcaption>
              </figure>
            ))}
          </div>
        )}

        <div className="case-generation-history" id="case-generation-history">
          <button className="case-history-open-button" type="button" onClick={onOpenHistory}>
            <span>
              <History aria-hidden="true" />
              生成历史
            </span>
            <strong>{generationHistory.length ? `最近 ${generationHistory.length} 次` : "暂无记录"}</strong>
            <small>弹出查看已出图、生成时间和耗时</small>
          </button>
        </div>

        <div className="case-tag-cloud">
          {[...item.styleLabels, ...item.sceneLabels].map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        <div className="case-links">
          {item.sourceUrl && (
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" />
              {item.sourceLabel || "原始来源"}
            </a>
          )}
          {item.githubUrl && (
            <a href={item.githubUrl} target="_blank" rel="noreferrer">
              <Database aria-hidden="true" />
              GitHub 记录
            </a>
          )}
        </div>
      </div>
    </>
  );
}

function Image2QuotaModal({
  accountSession,
  codeDraft,
  onClose,
  onCodeChange,
  onOpenLogin,
  onSubmitCode,
  quota,
  status,
  wallet
}: {
  accountSession: Image2AccountSession | null;
  codeDraft: string;
  onClose: () => void;
  onCodeChange: (value: string) => void;
  onOpenLogin: () => void;
  onSubmitCode: (event: FormEvent) => void;
  quota: Image2FreeQuota | null;
  status: MembershipStatus;
  wallet: Image2WalletSummary | null;
}) {
  return (
    <section className="case-quota-modal-layer" aria-label="图片余额兑换">
      <button aria-label="关闭领取额度弹窗" className="case-quota-modal-backdrop" type="button" onClick={onClose} />
      <div className="case-quota-modal-panel" role="dialog" aria-modal="true" aria-labelledby="case-quota-title">
        <button aria-label="关闭领取额度弹窗" className="case-quota-close" type="button" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
        <div className="case-quota-copy">
          <p>图片余额</p>
          <h2 id="case-quota-title">ANS 统一算力积分充值与兑换</h2>
          <span>
            本站已全面接入 ANS (AI Never Stops) 统一账号与算力积分体系（2 ANS 积分 = 1 张图，¥0.20/张），支持 ANS 兑换码直接充值，新用户可前往 ans.cauai.fun/workspace/credits 领取最高 150 积分。
          </span>
          <div className="case-quota-pack-row" aria-label="额度包">
            {image2BalancePacks.map((pack) => (
              <span key={pack.plan}>
                <b>{pack.label}</b>
                {pack.price}
              </span>
            ))}
          </div>
        </div>
        <div className="case-quota-wallet-card">
          <small>当前余额</small>
          <strong>{wallet?.balance ?? 0}</strong>
          <span>ANS 积分（2点/张）</span>
          {accountSession ? (
            <form className="case-membership-form" onSubmit={onSubmitCode}>
              <input
                aria-label="Image2 卡密"
                autoComplete="off"
                placeholder="输入卡密兑换额度"
                value={codeDraft}
                onChange={(event) => onCodeChange(event.target.value)}
              />
              <button type="submit" disabled={status.tone === "busy"}>
                {status.tone === "busy" ? <Loader2 className="spinning" aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
                兑换
              </button>
            </form>
          ) : (
            <button className="case-quota-login-button" type="button" onClick={onOpenLogin}>
              <LogIn aria-hidden="true" />
              登录后兑换
            </button>
          )}
          <p className={status.tone}>{status.message}</p>
        </div>
        <button className="case-quota-primary" type="button" onClick={onClose}>
          先继续看案例
        </button>
      </div>
    </section>
  );
}

function Image2CollectionPickerModal({
  collectionNameDraft,
  collections,
  isFavorite,
  item,
  onClose,
  onCollectionNameChange,
  onCreateCollection,
  onToggleCollection,
  onToggleFavoriteOnly,
  selectedCollectionIds
}: {
  collectionNameDraft: string;
  collections: CaseCollection[];
  isFavorite: boolean;
  item: Image2Case;
  onClose: () => void;
  onCollectionNameChange: (value: string) => void;
  onCreateCollection: (event: FormEvent) => void;
  onToggleCollection: (collectionId: string) => void;
  onToggleFavoriteOnly: (item: Image2Case) => void;
  selectedCollectionIds: string[];
}) {
  const localized = localizedCaseText(item, "zh");

  return (
    <section className="case-collection-modal-layer" aria-label="收藏夹选择器">
      <button aria-label="关闭收藏夹选择器" className="case-collection-modal-backdrop" type="button" onClick={onClose} />
      <div className="case-collection-modal-panel" role="dialog" aria-modal="true" aria-labelledby="case-collection-title">
        <div className="case-collection-modal-head">
          <div>
            <small>收藏夹</small>
            <h2 id="case-collection-title">保存到收藏夹</h2>
            <p>{localized.title}</p>
          </div>
          <button aria-label="关闭收藏夹选择器" type="button" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>

        <button
          aria-pressed={isFavorite}
          className={isFavorite ? "case-collection-favorite-toggle active" : "case-collection-favorite-toggle"}
          type="button"
          onClick={() => onToggleFavoriteOnly(item)}
        >
          <Heart aria-hidden="true" />
          <span>{isFavorite ? "已加入我的收藏" : "加入我的收藏"}</span>
        </button>

        <form className="case-collection-form" onSubmit={onCreateCollection}>
          <input
            aria-label="新建收藏夹名称"
            placeholder="新建收藏夹"
            value={collectionNameDraft}
            onChange={(event) => onCollectionNameChange(event.target.value)}
          />
          <button type="submit" title="新建收藏夹">
            <FolderPlus aria-hidden="true" />
          </button>
        </form>

        <div className="case-asset-collection-list">
          {collections.length ? (
            collections.map((collection) => {
              const isActive = selectedCollectionIds.includes(collection.id);
              return (
                <button
                  key={collection.id}
                  className={isActive ? "active" : ""}
                  type="button"
                  onClick={() => onToggleCollection(collection.id)}
                >
                  <span>
                    <strong>{collection.name}</strong>
                    <small>{collection.caseKeys.length} 个案例</small>
                  </span>
                  {isActive ? <CheckCircle2 aria-hidden="true" /> : <FolderOpen aria-hidden="true" />}
                </button>
              );
            })
          ) : (
            <div className="case-asset-empty">
              <FolderOpen aria-hidden="true" />
              <strong>还没有收藏夹</strong>
              <p>输入名称新建一个，后续可以按收藏夹筛选案例。</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Image2HistoryModal({
  history,
  onClose,
  onSelectHistory
}: {
  history: GenerationHistoryItem[];
  onClose: () => void;
  onSelectHistory: (item: GenerationHistoryItem) => void;
}) {
  return (
    <section className="case-history-modal-layer" aria-label="生成历史">
      <button aria-label="关闭生成历史" className="case-history-modal-backdrop" type="button" onClick={onClose} />
      <div className="case-history-modal-panel" role="dialog" aria-modal="true" aria-labelledby="case-history-title">
        <div className="case-history-modal-head">
          <div>
            <small>本机浏览器保留最近 {maxGenerationHistoryItems} 次</small>
            <h2 id="case-history-title">生成历史</h2>
          </div>
          <button aria-label="关闭生成历史" type="button" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>

        {history.length ? (
          <div className="case-history-modal-list">
            {history.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => {
                  onSelectHistory(record);
                  onClose();
                }}
              >
                {record.images[0]?.dataUrl ? (
                  <img alt={record.images[0].name} src={record.images[0].dataUrl} />
                ) : (
                  <div className="case-history-thumb" aria-hidden="true">
                    <ImageOff />
                  </div>
                )}
                <span>
                  <small>{record.caseCode ?? `Case ${record.caseId}`}</small>
                  <strong>{record.caseTitle}</strong>
                  <em>
                    {formatHistoryTime(record.createdAt)}
                    {record.elapsedSeconds ? ` · ${formatDuration(Math.round(record.elapsedSeconds))}` : ""}
                    {record.images.length > 1 ? ` · ${record.images.length} 张` : ""}
                  </em>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="case-history-empty">
            <History aria-hidden="true" />
            <strong>还没有生成记录</strong>
            <p>第一次生成成功后，图片、案例名、时间和耗时都会保存在这里。</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Image2ImagePreviewModal({
  onClose,
  preview
}: {
  onClose: () => void;
  preview: ImagePreview;
}) {
  return (
    <section className="case-image-preview-layer" aria-label="高清大图预览">
      <button aria-label="关闭高清大图" className="case-image-preview-backdrop" type="button" onClick={onClose} />
      <div className="case-image-preview-panel" role="dialog" aria-modal="true" aria-labelledby="case-image-preview-title">
        <div className="case-image-preview-head">
          <div>
            <small>{preview.meta ?? "Image2 case"}</small>
            <h2 id="case-image-preview-title">{preview.title}</h2>
          </div>
          <button aria-label="关闭高清大图" type="button" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
        <figure className="case-image-preview-frame">
          <img alt={preview.alt} src={preview.src} />
        </figure>
      </div>
    </section>
  );
}

function mergeCasePayloads(base: CasePayload, extra?: Partial<CasePayload> | null): CasePayload {
  if (!extra) return base;

  const cases = [...(base.cases ?? []), ...((extra.cases as Image2Case[] | undefined) ?? [])];
  const counts = new Map<string, number>();
  for (const item of cases) {
    counts.set(item.category, (counts.get(item.category) || 0) + 1);
  }

  const categories = [...counts.entries()]
    .map(([value, count]) => ({
      value,
      label:
        base.categories.find((item) => item.value === value)?.label ??
        extra.categories?.find((item) => item.value === value)?.label ??
        value,
      count
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "zh-Hans-CN"));

  const mergedSources = [...(base.sources ?? []), ...((extra.sources as SourceSummary[] | undefined) ?? [])].filter(
    (item, index, list) => index === list.findIndex((candidate) => candidate.id === item.id)
  );
  const mergedRadar = [...(base.sourceRadar ?? []), ...((extra.sourceRadar as SourceRadar[] | undefined) ?? [])].filter(
    (item, index, list) => index === list.findIndex((candidate) => candidate.id === item.id)
  );

  return {
    ...base,
    sources: mergedSources.map((item) => ({
      ...item,
      count: cases.filter((entry) => (entry.sourceId ?? "canghe") === item.id).length || item.count
    })),
    sourceRadar: mergedRadar,
    totalCases: cases.length,
    categories,
    importedAt: extra.importedAt ?? base.importedAt,
    cases
  };
}

export function Image2CaseLibrary() {
  const { language, setLanguage } = useImage2LanguagePreference("zh");
  const pageCopy = caseLibraryCopy[language];
  const [payload, setPayload] = useState<CasePayload | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [sourceId, setSourceId] = useState("全部");
  const [category, setCategory] = useState("全部");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [planView, setPlanView] = useState(false);
  const [assetBackupStatus, setAssetBackupStatus] = useState('');
  const [syncAttempt, setSyncAttempt] = useState(0);
  const [sortOrder, setSortOrder] = useState('relevance');
  const [inputFilter, setInputFilter] = useState('all');
  const [showPromptVariants, setShowPromptVariants] = useState(false);
  const [favoriteCaseKeys, setFavoriteCaseKeys] = useState<Set<string>>(() => new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [rewriteCopiedKey, setRewriteCopiedKey] = useState<string | null>(null);
  const [promptDrafts, setPromptDrafts] = useState<Record<string, PromptWorkbenchDraft>>({});
  const [promptReuseHistory, setPromptReuseHistory] = useState<PromptReuseHistoryItem[]>([]);
  const [workbenchFields, setWorkbenchFields] = useState<PromptStructure>({ ...emptyPromptStructure });
  const [workbenchNote, setWorkbenchNote] = useState("");
  const [editorStatus, setEditorStatus] = useState("");
  const [workbenchBasePrompt, setWorkbenchBasePrompt] = useState("");
  const [workbenchVariables, setWorkbenchVariables] = useState<Record<string, string>>({});
  const [workbenchDirtyKey, setWorkbenchDirtyKey] = useState<string | null>(null);
  const [caseAssetState, setCaseAssetState] = useState<CaseAssetState>({
    activeCollectionId: null,
    collections: [],
    notes: {}
  });
  const [accountSession, setAccountSession] = useState<Image2AccountSession | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [accountAuthMode, setAccountAuthMode] = useState<AccountAuthMode>("login");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountOtpCode, setAccountOtpCode] = useState("");
  const [accountOtpMode, setAccountOtpMode] = useState<AccountOtpMode>(null);
  const [accountPasswordVisible, setAccountPasswordVisible] = useState(false);
  const [accountAuthStatus, setAccountAuthStatus] = useState<AccountAuthStatus>({
    message: isSupabaseAuthConfigured ? "可以使用账号登录" : "账号登录未配置",
    tone: "idle"
  });
  const [assetsHydrated, setAssetsHydrated] = useState(false);
  const [assetSyncStatus, setAssetSyncStatus] = useState<MembershipStatus>({
    message: "收藏夹保存在当前浏览器",
    tone: "idle"
  });
  const [wallet, setWallet] = useState<Image2WalletStatus | null>(null);
  const [walletStatus, setWalletStatus] = useState<MembershipStatus>({
    message: isSupabaseAuthConfigured ? "登录后查看图片余额" : "余额系统未配置",
    tone: "idle"
  });
  const [licenseCodeDraft, setLicenseCodeDraft] = useState("");
  const [collectionNameDraft, setCollectionNameDraft] = useState("");
  const [caseNoteDraft, setCaseNoteDraft] = useState("");
  const [caseNoteDirtyKey, setCaseNoteDirtyKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStartedAt, setGenerationStartedAt] = useState<number | null>(null);
  const [generationTick, setGenerationTick] = useState(0);
  const [generationError, setGenerationError] = useState("");
  const [generation, setGeneration] = useState<GenerationResult | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStreamStatus | null>(null);
  const [generationHistory, setGenerationHistory] = useState<GenerationHistoryItem[]>([]);
  const [freeQuota, setFreeQuota] = useState<Image2FreeQuota | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [isCollectionPickerOpen, setIsCollectionPickerOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const [caseDetails, setCaseDetails] = useState<Record<string, Partial<Image2Case>>>({});
  const [loadingDetailKey, setLoadingDetailKey] = useState<string | null>(null);
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [visibleCaseCount, setVisibleCaseCount] = useState(initialVisibleCaseCount);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(max-width: 980px)").matches) return false;
    return window.localStorage.getItem(caseFiltersCollapsedStorageKey) === "1";
  });
  const assetStorageOwnerRef = useRef<string | null>(null);
  const draftSeenRef = useRef(new Map<string, string>());
  const draftFlushRef = useRef<(() => void) | null>(null);
  const draftStamp = (draft?: PromptWorkbenchDraft) => JSON.stringify([draft?.prompt, draft?.note, draft?.updatedAt]);
  const draftSlot = (owner: string | null, key: string) => JSON.stringify([owner, key]);
  const assetSyncSignatureRef = useRef("");
  const assetSyncHydratedSessionRef = useRef("");
  const assetSyncLoadingSessionRef = useRef("");
  const caseDetailHistoryRef = useRef(false);
  const historyRestoringRef = useRef(false);
  const detailRequestsRef = useRef(new Map<string, Promise<Image2Case>>());

  // The mobile detail layer pushes one marked history entry so the browser back button closes it first.
  const pushCaseDetailHistory = (caseKey: string) => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href); url.searchParams.set('case', caseKey);
    const nextState = { ...(window.history.state ?? {}), image2CaseDetail: caseKey };

    try {
      if (caseDetailHistoryRef.current) {
        window.history.replaceState(nextState, "", url);
        return;
      }

      window.history.replaceState({ ...window.history.state, image2Scroll: window.scrollY }, "", window.location.href);
      window.history.pushState(nextState, "", url);
      caseDetailHistoryRef.current = true;
    } catch {
      // Keep the detail layer usable when the browser blocks history updates.
    }
  };

  const closeCaseDetail = useCallback(() => {
    setIsDetailOpen(false);

    if (typeof window === "undefined" || !caseDetailHistoryRef.current) return;

    caseDetailHistoryRef.current = false;
    const state: unknown = window.history.state;

    if (state && typeof state === "object" && "image2CaseDetail" in state) {
      window.history.back();
    }
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state: unknown = event.state;
      const hasDetail = Boolean(state && typeof state === "object" && "image2CaseDetail" in state);
      const params = new URLSearchParams(window.location.search);
      historyRestoringRef.current = true;
      setQuery((params.get("q") ?? "").slice(0, 160));
      setSourceId(params.get("source") ?? "全部");
      setCategory(params.get("category") ?? "全部");
      setFavoritesOnly(params.get("favorites") === "1");
      setShowPromptVariants(params.get('variants') === '1');
      setSortOrder(['relevance','quality','newest'].includes(params.get('sort') ?? '') ? params.get('sort')! : 'relevance');
      setInputFilter(['text','reference','missing','text-only'].includes(params.get('input') ?? '') ? params.get('input')! : 'all');
      setPlanView(params.get('view') === 'plans');
      const requestedKey = params.get("case");
      const requestedCase = payload?.cases.find((item) => getCaseKey(item) === requestedKey || item.sourceDetailKey === requestedKey || item.caseCode === requestedKey || String(item.id) === requestedKey);
      if (requestedCase) setSelectedKey(getCaseKey(requestedCase));
      const requestedCollection = params.get('collection');
      setCaseAssetState(current => ({ ...current, activeCollectionId: current.collections.some(x => x.id === requestedCollection) ? requestedCollection : null }));
      setVisibleCaseCount(Math.max(initialVisibleCaseCount, Math.min(5000, Number(params.get('limit')) || initialVisibleCaseCount)));
      window.requestAnimationFrame(() => window.scrollTo(0, typeof event.state?.image2Scroll === 'number' ? event.state.image2Scroll : 0));
      caseDetailHistoryRef.current = hasDetail;
      setIsDetailOpen(hasDetail && window.matchMedia("(max-width: 980px)").matches);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [payload]);

  const buildCurrentAssetSnapshot = () =>
    buildAssetSnapshot({
      caseAssetState,
      favoriteCaseKeys,
      promptDrafts,
      promptReuseHistory
    });

  const applyAssetSnapshot = (snapshot: Image2AssetSnapshot) => {
    setFavoriteCaseKeys(persistFavoriteCaseKeys(new Set(snapshot.favoriteCaseKeys), assetStorageOwnerRef.current));
    setCaseAssetState(
      persistCaseAssetState({
        activeCollectionId: snapshot.activeCollectionId,
        collections: snapshot.collections,
        notes: snapshot.notes
      }, assetStorageOwnerRef.current)
    );
    setPromptDrafts(persistPromptWorkbenchDrafts(snapshot.promptDrafts, assetStorageOwnerRef.current));
    setPromptReuseHistory(persistPromptReuseHistory(snapshot.promptReuseHistory, assetStorageOwnerRef.current));
  };

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    let disposed = false;
    setLoadError(false);
    const loadCases = async () => {
      let data: CasePayload | null = null;
      // The lean index is primary; fallback only on a failed/invalid response.
      for (const resource of ["/data/image2-case-library.index.js", "/data/image2-case-library.json"]) {
        try {
          const response = await fetch(withDataVersion(resource), { signal: controller.signal });
          if (!response.ok) throw new Error("案例索引加载失败");
          const raw = await response.json() as CasePayload;
          if (!Array.isArray(raw.cases) || !raw.cases.length) throw new Error("案例索引为空");
          data = normalizeCaseImages(raw);
          break;
        } catch {
          if (controller.signal.aborted) break;
        }
      }
      if (disposed) return;
      if (!data) { setLoadError(true); return; }
      const params = new URLSearchParams(window.location.search);
      const requestedCase = params.get("case");
      const first = data.cases.find((item) => getCaseKey(item) === requestedCase || item.sourceDetailKey === requestedCase || item.caseCode === requestedCase || String(item.id) === requestedCase)
        ?? [...data.cases].sort((a, b) => b.valueScore - a.valueScore || b.id - a.id)[0];
      setQuery((params.get("q") ?? "").slice(0, 160));
      const requestedSource = params.get("source");
      const requestedCategory = params.get("category");
      setSourceId(data.cases.some((item) => (item.sourceId ?? "canghe") === requestedSource) ? requestedSource! : "全部");
      setCategory(data.cases.some((item) => item.category === requestedCategory) ? requestedCategory! : "全部");
      setFavoritesOnly(params.get("favorites") === "1");
      setShowPromptVariants(params.get('variants') === '1');
      setSortOrder(['relevance','quality','newest'].includes(params.get('sort') ?? '') ? params.get('sort')! : 'relevance');
      setInputFilter(['text','reference','missing','text-only'].includes(params.get('input') ?? '') ? params.get('input')! : 'all');
      setPlanView(params.get('view') === 'plans');
      historyRestoringRef.current = true;
      setVisibleCaseCount(Math.max(initialVisibleCaseCount, Math.min(5000, Number(params.get("limit")) || initialVisibleCaseCount)));
      setPayload(data);
      setSelectedKey(first ? getCaseKey(first) : null);
      if (requestedCase && first && window.matchMedia("(max-width: 980px)").matches) {
        setIsDetailOpen(true);
        pushCaseDetailHistory(getCaseKey(first));
      }
    };
    void loadCases().catch(() => { if (!disposed) setLoadError(true); }).finally(() => window.clearTimeout(timeout));
    return () => { disposed = true; window.clearTimeout(timeout); controller.abort(); };
  }, [loadAttempt]);

  useEffect(() => {
    if (payload && !historyRestoringRef.current) setVisibleCaseCount(initialVisibleCaseCount);
  }, [category, favoritesOnly, query, showPromptVariants, sourceId, inputFilter, sortOrder, caseAssetState.activeCollectionId]);

  const currentLibraryUrl = () => {
    const url = new URL(window.location.href);
    for (const [key, value] of [["q", query], ["source", sourceId === "全部" ? "" : sourceId],
      ["category", category === "全部" ? "" : category], ["favorites", favoritesOnly ? "1" : ""], ["case", selectedKey ?? ""],
      ['sort', sortOrder === 'relevance' ? '' : sortOrder], ['input', inputFilter === 'all' ? '' : inputFilter],
      ['variants', showPromptVariants ? '1' : ''], ['collection', caseAssetState.activeCollectionId ?? ''], ['view', planView ? 'plans' : ''],
      ['limit', visibleCaseCount > initialVisibleCaseCount ? String(visibleCaseCount) : '']]) {
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    return url;
  };
  useEffect(() => {
    if (!payload || !assetsHydrated) return;
    const url = currentLibraryUrl();
    if (historyRestoringRef.current) { historyRestoringRef.current = false; return; }
    if (url.href === window.location.href) return;
    const timer = window.setTimeout(() => {
      window.history.replaceState({ ...window.history.state, image2Scroll: window.scrollY }, '', window.location.href);
      window.history.pushState({ ...window.history.state, image2Scroll: window.scrollY }, '', url);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [payload, query, sourceId, category, favoritesOnly, selectedKey, sortOrder, inputFilter, showPromptVariants, caseAssetState.activeCollectionId, planView, visibleCaseCount, assetsHydrated]);

  useDialogFocus(imagePreview ? ".case-image-preview-panel" :
    isQuotaModalOpen ? ".case-quota-modal-panel" :
    isCollectionPickerOpen ? ".case-collection-modal-panel" :
    isHistoryOpen ? ".case-history-modal-panel" :
    isAuthModalOpen ? ".case-auth-modal-panel" :
    isDetailOpen ? ".case-mobile-detail-panel" : null);
  useEffect(() => {
    const shouldLock = isDetailOpen || isHistoryOpen || isQuotaModalOpen || isCollectionPickerOpen || isAuthModalOpen || Boolean(imagePreview);
    if (!shouldLock) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (imagePreview) {
        setImagePreview(null);
        return;
      }
      if (isQuotaModalOpen) {
        setIsQuotaModalOpen(false);
        return;
      }
      if (isCollectionPickerOpen) {
        setIsCollectionPickerOpen(false);
        return;
      }
      if (isHistoryOpen) {
        setIsHistoryOpen(false);
        return;
      }
      if (isAuthModalOpen) {
        setIsAuthModalOpen(false);
        return;
      }
      closeCaseDetail();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeCaseDetail, imagePreview, isDetailOpen, isHistoryOpen, isQuotaModalOpen, isCollectionPickerOpen, isAuthModalOpen]);

  useEffect(() => {
    setGenerationHistory(readGenerationHistory());
  }, []);

  useEffect(() => {
    assetStorageOwnerRef.current = readAccountSession()?.user.id ?? null;
    assetSyncSignatureRef.current = "";
    assetSyncHydratedSessionRef.current = "";
    assetSyncLoadingSessionRef.current = "";
    setFavoriteCaseKeys(readFavoriteCaseKeys());
    setPromptDrafts(readPromptWorkbenchDrafts());
    setPromptReuseHistory(readPromptReuseHistory());
    const localAssets = readCaseAssetState();
    const params = new URLSearchParams(window.location.search);
    if (params.has('collection')) localAssets.activeCollectionId = localAssets.collections.some(x => x.id === params.get('collection')) ? params.get('collection') : null;
    setCaseAssetState(localAssets);
    setGenerationHistory(readGenerationHistory());
    setEditorStatus(''); setWorkbenchBasePrompt(''); setWorkbenchVariables({}); setWorkbenchNote('');
    setWorkbenchDirtyKey(null);
    setCaseNoteDirtyKey(null);
    setAssetsHydrated(true);
  }, [accountSession?.user.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 980px)");
    const syncViewport = () => {
      if (media.matches) {
        setIsFiltersCollapsed(false);
      } else {
        setIsDetailOpen(false);
      }
    };

    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(caseFiltersCollapsedStorageKey, isFiltersCollapsed ? "1" : "0");
  }, [isFiltersCollapsed]);

  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === accountSessionStorageKey) { setAccountSession(readAccountSession()); return; }
      const owner = assetStorageOwnerRef.current;
      if (event.key === scopedAssetStorageKey(promptWorkbenchStorageKey, owner)) {
        // Reconcile the current tab's pending head before adopting a competing write.
        // Two tabs can read the same prior value before either setItem completes.
        draftFlushRef.current?.();
        setPromptDrafts(current => {
        const incoming = readPromptWorkbenchDrafts();
        for (const key of Object.keys(incoming)) if (current[key]) incoming[key] = { ...(current[key].updatedAt > incoming[key].updatedAt ? current[key] : incoming[key]), versions: mergePromptVersions(normalizePromptVersions(current[key].versions), normalizePromptVersions(incoming[key].versions)) };
        return { ...current, ...incoming };
        });
      }
      if (event.key === scopedAssetStorageKey(favoriteCaseStorageKey, owner)) setFavoriteCaseKeys(readFavoriteCaseKeys());
      if (event.key === scopedAssetStorageKey(caseAssetStorageKey, owner)) { setCaseAssetState(readCaseAssetState()); setCaseNoteDirtyKey(null); }
      if (event.key === scopedAssetStorageKey(promptReuseHistoryStorageKey, owner)) setPromptReuseHistory(readPromptReuseHistory());
      if (event.key === scopedAssetStorageKey(generationHistoryStorageKey, owner)) setGenerationHistory(readGenerationHistory());
    };
    const failed = () => { setEditorStatus('本机存储不可用，请立即导出备份'); setAssetBackupStatus('本机存储未写入成功。当前内容仍在页面内，请导出完整备份。'); };
    window.addEventListener('image2-storage-error', failed);
    window.addEventListener('storage', changed);
    return () => { window.removeEventListener('storage', changed); window.removeEventListener('image2-storage-error', failed); };
  }, []);

  useEffect(() => {
    if (!isSupabaseAuthConfigured) return;
    const saved = readAccountSession();
    if (!saved) return;

    setAccountSession(saved);
    setAccountAuthStatus({ message: "正在恢复账号...", tone: "busy" });
    let disposed = false;
    void getSupabaseUser(saved.accessToken)
      .then((user) => {
        if (disposed || readAccountSession()?.accessToken !== saved.accessToken) return;
        const session = persistAccountSession({ ...saved, user });
        setAccountSession(session);
        setAccountEmail(user.email ?? "");
        setAccountAuthStatus({ message: "账号已登录", tone: "success" });
      })
      .catch(() => {
        if (disposed || readAccountSession()?.accessToken !== saved.accessToken) return;
        clearAccountSession();
        setAccountSession(null);
        setAccountAuthStatus({ message: "登录状态已失效，请重新登录", tone: "error" });
      });
    return () => { disposed = true; };
  }, []);

  useEffect(() => {
    if (!assetsHydrated) return;
    if (!isSupabaseAuthConfigured) {
      setAssetSyncStatus({ message: "收藏夹保存在当前浏览器", tone: "idle" });
      return;
    }

    if (!accountSession) {
      assetSyncSignatureRef.current = "";
      assetSyncHydratedSessionRef.current = "";
      assetSyncLoadingSessionRef.current = "";
      setAssetSyncStatus({ message: "登录后同步收藏夹和抽卡来源", tone: "idle" });
      return;
    }

    const sessionKey = `${accountSession.user.id}:${accountSession.accessToken}`;
    if (assetSyncHydratedSessionRef.current === sessionKey || assetSyncLoadingSessionRef.current === sessionKey) return;

    let ignore = false;
    assetSyncLoadingSessionRef.current = sessionKey;
    const readScopedSnapshot = () => buildAssetSnapshot({
      caseAssetState: readCaseAssetState(), favoriteCaseKeys: readFavoriteCaseKeys(),
      promptDrafts: readPromptWorkbenchDrafts(), promptReuseHistory: readPromptReuseHistory()
    });
    setAssetSyncStatus({ message: "正在同步收藏夹...", tone: "busy" });

    void requestImage2Assets(accountSession)
      .then(async (cloudSnapshot) => {
        if (ignore || readAccountSession()?.user.id !== accountSession.user.id) return;
        const merged = mergeAssetSnapshots(readScopedSnapshot(), cloudSnapshot);
        const signature = assetSnapshotSignature(merged, accountSession.user.id);
        assetSyncSignatureRef.current = signature;
        assetSyncHydratedSessionRef.current = sessionKey;
        applyAssetSnapshot(merged);
        const saved = await saveImage2Assets(accountSession, merged);
        if (ignore) return;
        const nextSignature = assetSnapshotSignature(saved, accountSession.user.id);
        assetSyncSignatureRef.current = nextSignature;
        assetSyncHydratedSessionRef.current = sessionKey;
        setAssetSyncStatus({ message: "收藏夹已同步", tone: "success" });
      })
      .catch((error) => {
        if (ignore) return;
        assetSyncHydratedSessionRef.current = "";
        setAssetSyncStatus({
          message: toUserFacingError(error instanceof Error ? error.message : error, "收藏夹同步失败。"),
          tone: "error"
        });
      })
      .finally(() => {
        if (assetSyncLoadingSessionRef.current === sessionKey) {
          assetSyncLoadingSessionRef.current = "";
        }
      });

    return () => {
      ignore = true;
    };
  }, [accountSession?.accessToken, accountSession?.user.id, assetsHydrated, syncAttempt]);

  useEffect(() => {
    if (!assetsHydrated || !isSupabaseAuthConfigured || !accountSession) return;

    const sessionKey = `${accountSession.user.id}:${accountSession.accessToken}`;
    if (assetSyncHydratedSessionRef.current !== sessionKey) return;

    const snapshot = buildCurrentAssetSnapshot();
    const signature = assetSnapshotSignature(snapshot, accountSession.user.id);
    if (assetSyncSignatureRef.current === signature) return;

    setAssetSyncStatus({ message: "正在保存收藏夹...", tone: "busy" });
    let ignore = false;
    const timer = window.setTimeout(() => {
      if (readAccountSession()?.user.id !== accountSession.user.id) return;
      void saveImage2Assets(accountSession, snapshot)
        .then((saved) => {
          if (ignore || readAccountSession()?.user.id !== accountSession.user.id) return;
          assetSyncSignatureRef.current = assetSnapshotSignature(saved, accountSession.user.id);
          setAssetSyncStatus({ message: "收藏夹已同步", tone: "success" });
        })
        .catch((error) => {
          if (ignore) return;
          setAssetSyncStatus({
            message: toUserFacingError(error instanceof Error ? error.message : error, "收藏夹同步失败。"),
            tone: "error"
          });
        });
    }, 650);

    return () => { ignore = true; window.clearTimeout(timer); };
  }, [accountSession?.accessToken, accountSession?.user.id, assetsHydrated, caseAssetState, favoriteCaseKeys, promptDrafts, promptReuseHistory, syncAttempt]);

  useEffect(() => {
    if (!isSupabaseAuthConfigured) return;
    if (!accountSession) {
      setWallet(null);
      setWalletStatus({ message: "登录后查看图片余额", tone: "idle" });
      return;
    }

    let ignore = false;
    setWalletStatus({ message: "正在读取图片余额...", tone: "busy" });
    void requestImage2Wallet(accountSession)
      .then((data) => {
        if (ignore) return;
        setWallet(data);
        setWalletStatus({
          message: data.wallet.balance > 0 ? `当前可用 ${data.wallet.balance} ANS 积分（约 ${Math.floor(data.wallet.balance / 2)} 张图）` : "当前 ANS 积分为 0，可兑换卡密",
          tone: data.wallet.balance > 0 ? "success" : "idle"
        });
      })
      .catch((error) => {
        if (ignore) return;
        setWallet(null);
        setWalletStatus({
          message: toUserFacingError(error instanceof Error ? error.message : error, "图片余额读取失败。"),
          tone: "error"
        });
      });

    return () => {
      ignore = true;
    };
  }, [accountSession?.accessToken]);

  useEffect(() => {
    void requestImage2Quota().then((quota) => {
      if (quota) setFreeQuota(quota);
    });
  }, []);

  useEffect(() => {
    if (!isGenerating || !generationStartedAt) return;

    setGenerationTick(Date.now());
    const timer = window.setInterval(() => {
      setGenerationTick(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [generationStartedAt, isGenerating]);

  const cases = useMemo(() => payload?.cases ?? [], [payload]);
  const categories = payload?.categories ?? [];
  const sources = useMemo<SourceSummary[]>(() => {
    if (!payload) return [];
    if (payload.sources?.length) return payload.sources;
    if (payload.source) {
      return [
        {
          id: "canghe",
          label: "Canghe / awesome-gpt-image-2",
          site: payload.source.site,
          repository: payload.source.repository,
          count: payload.totalCases,
          licenseNote: payload.source.licenseNote
        }
      ];
    }
    return [];
  }, [payload]);
  const activeSource = sourceId === "全部" ? null : sources.find((item) => item.id === sourceId) ?? null;
  const activeCollection = caseAssetState.activeCollectionId
    ? caseAssetState.collections.find((item) => item.id === caseAssetState.activeCollectionId) ?? null
    : null;
  const activeCategoryLabel =
    category === "全部"
      ? pageCopy.filters.allCategories
      : localizedCategoryLabel(categories.find((item) => item.value === category)?.label ?? category, language);
  const galleryTitle = [favoritesOnly ? pageCopy.filters.favorites : null, activeCollection?.name, activeSource?.label, activeCategoryLabel]
    .filter(Boolean)
    .join(" · ");
  const heroCases = useMemo(() => {
    const curatedHeroIds = [20275, 20259, 20243, 30001, 20242, 20125, 20269, 30005, 20313];
    const ordered = [...cases].sort((a, b) => b.valueScore - a.valueScore || b.id - a.id);
    const picks: Image2Case[] = [];
    const seen = new Set<number>();
    const add = (item?: Image2Case) => {
      if (!item || seen.has(item.id)) return;
      seen.add(item.id);
      picks.push(item);
    };

    curatedHeroIds.forEach((id) => add(cases.find((item) => item.id === id)));

    for (const item of ordered) {
      if (picks.length >= 6) break;
      add(item);
    }

    return picks.slice(0, 6);
  }, [cases]);

  // Localized zh + en fields keep Chinese and English queries working in both languages.
  const caseSearchHaystacks = useMemo(() => {
    const haystacks = new Map<string, CaseSearchHaystack>();

    for (const item of cases) {
      const zh = localizedCaseText(item, "zh");
      const en = localizedCaseText(item, "en");
      const text = normalize(
        [
          item.id,
          item.caseCode,
          item.title,
          item.categoryLabel,
          item.sourceName,
          item.sourceCategory,
          item.author,
          item.styles.join(" "),
          item.styleLabels.join(" "),
          item.scenes.join(" "),
          item.sceneLabels.join(" "),
          item.promptPreview,
          item.sourceLabel,
          zh.title,
          zh.categoryLabel,
          zh.promptPreview,
          zh.imageAlt,
          zh.valueTier,
          zh.promptKind,
          en.title,
          en.categoryLabel,
          en.promptPreview,
          en.imageAlt,
          en.valueTier,
          en.promptKind
        ].join(" ")
      );

      haystacks.set(getCaseKey(item), { compact: stripSearchWhitespace(text), text });
    }

    return haystacks;
  }, [cases]);

  const filteredCases = useMemo(() => {
    const q = normalize(deferredQuery);
    const rows: Array<{ item: Image2Case; relevance: number }> = [];

    for (const item of cases) {
      const matchesSource = sourceId === "全部" || item.sourceId === sourceId || (!item.sourceId && sourceId === "canghe");
      const matchesCategory = category === "全部" || item.category === category;
      const matchesFavorite = !favoritesOnly || favoriteCaseKeys.has(getCaseKey(item));
      const matchesCollection = !activeCollection || activeCollection.caseKeys.includes(getCaseKey(item));
      const matchesPromptFamily =
        showPromptVariants || Boolean(q) || favoritesOnly || Boolean(activeCollection) || item.promptFamily?.primary !== false;
      const matchesInput = inputFilter === 'all' || (inputFilter === 'text' && !item.referenceRequired) || (inputFilter === 'reference' && item.referenceRequired) || (inputFilter === 'missing' && item.referenceRequired && item.inputCompleteness === 'missing') || (inputFilter === 'text-only' && item.imageStatus === 'text-only');
      if (!matchesInput || !matchesSource || !matchesCategory || !matchesFavorite || !matchesCollection || !matchesPromptFamily) continue;

      const haystack = caseSearchHaystacks.get(getCaseKey(item));
      const relevance = taskSearchScore(haystack?.text ?? '', q, [item.title, localizedCaseText(item, "zh").title, item.category].join(' '));
      if (relevance === null) continue;
      rows.push({ item, relevance });
    }

    return rows
      .sort((a, b) => (sortOrder === 'relevance' ? b.relevance - a.relevance : 0) || (sortOrder === 'newest' ? b.item.id - a.item.id : b.item.valueScore - a.item.valueScore) || b.item.id - a.item.id)
      .map((row) => row.item);
  }, [
    activeCollection,
    caseSearchHaystacks,
    cases,
    category,
    favoriteCaseKeys,
    favoritesOnly,
    deferredQuery,
    showPromptVariants,
    sourceId, inputFilter, sortOrder
  ]);
  const promptVariantExtraCount = useMemo(
    () => cases.filter((item) => item.promptFamily && !item.promptFamily.primary).length,
    [cases]
  );
  const visibleCases = useMemo(() => filteredCases.slice(0, visibleCaseCount), [filteredCases, visibleCaseCount]);



  const selectedCaseSummary = useMemo(
    () => cases.find((item) => getCaseKey(item) === selectedKey) ?? filteredCases[0] ?? (favoritesOnly ? undefined : cases[0]),
    [cases, favoritesOnly, filteredCases, selectedKey]
  );
  const selectedDetailKey = selectedCaseSummary?.detailKey ?? String(selectedCaseSummary?.id ?? "");
  const selectedCase = selectedCaseSummary
    ? ({ ...selectedCaseSummary, ...(caseDetails[selectedDetailKey] ?? {}) } as Image2Case)
    : undefined;
  const selectedCaseKey = selectedCase ? getCaseKey(selectedCase) : "";
  const selectedWorkbench = selectedCaseKey ? promptDrafts[selectedCaseKey] : undefined;
  const selectedCaseNote = selectedCaseKey ? caseAssetState.notes[selectedCaseKey] : undefined;
  const selectedCaseCollectionIds = useMemo(
    () =>
      selectedCaseKey
        ? caseAssetState.collections
            .filter((collection) => collection.caseKeys.includes(selectedCaseKey))
            .map((collection) => collection.id)
        : [],
    [caseAssetState.collections, selectedCaseKey]
  );
  const selectedRewritePrompt = selectedCase ? buildRewritePrompt(workbenchFields, workbenchBasePrompt, workbenchVariables) : "";
  const selectedReuseHistory = useMemo(
    () => (selectedCaseKey ? promptReuseHistory.filter((item) => item.caseKey === selectedCaseKey).slice(0, 12) : []),
    [promptReuseHistory, selectedCaseKey]
  );
  const generationElapsedSeconds =
    isGenerating && generationStartedAt
      ? Math.max(0, Math.floor(((generationTick || Date.now()) - generationStartedAt) / 1000))
      : 0;
  const isSelectedPromptLoading = Boolean(
    selectedCase && !selectedCase.prompt && loadingDetailKey === getCaseKey(selectedCase)
  );
  const selectedHasPrompt = Boolean(selectedCase?.prompt?.trim());
  const favoriteCount = useMemo(
    () => cases.filter((item) => favoriteCaseKeys.has(getCaseKey(item))).length,
    [cases, favoriteCaseKeys]
  );

  const saveCurrentDraft = (owner: string | null, applyState: boolean) => {
    if (!selectedCase || workbenchDirtyKey !== selectedCaseKey || !workbenchBasePrompt.trim()) return promptDrafts;
    const stored = readPromptWorkbenchDrafts(owner);
    const versions = mergePromptVersions(normalizePromptVersions(stored[selectedCaseKey]?.versions), normalizePromptVersions(promptDrafts[selectedCaseKey]?.versions));
    const prior = stored[selectedCaseKey];
    if (prior && (prior.prompt !== selectedRewritePrompt || prior.note !== workbenchNote) && draftStamp(prior) !== (draftSeenRef.current.get(draftSlot(owner, selectedCaseKey)) ?? draftStamp(promptDrafts[selectedCaseKey]))) {
      const id = 'draft-conflict-' + promptFingerprint(prior.prompt + prior.note);
      if (!versions.some(v => v.id === id)) versions.push({ id, name: '并行草稿（保留副本）', prompt: prior.prompt, note: prior.note, basePrompt: prior.basePrompt, variables: prior.variables, fields: { ...prior.fields }, createdAt: prior.updatedAt });
    }
    const next = { ...stored, [selectedCaseKey]: { ...promptDrafts[selectedCaseKey], caseTitle: selectedCase.title, fields: { ...workbenchFields }, basePrompt: workbenchBasePrompt, variables: { ...workbenchVariables }, note: workbenchNote, prompt: selectedRewritePrompt, updatedAt: new Date().toISOString(), versions } };
    try {
      window.localStorage.setItem(scopedAssetStorageKey(promptWorkbenchStorageKey, owner), JSON.stringify(next));
      draftSeenRef.current.set(draftSlot(owner, selectedCaseKey), draftStamp(next[selectedCaseKey]));
      if (applyState && owner === assetStorageOwnerRef.current && owner === (readAccountSession()?.user.id ?? null)) { setPromptDrafts(next); setEditorStatus('草稿已保存到本机'); }
    } catch { if (applyState) setEditorStatus('本机存储不可用，请导出备份或复制完整稿'); }
    return next;
  };
  const flushDraft = () => saveCurrentDraft(assetStorageOwnerRef.current, true);
  // Flush the latest draft on case/account transitions, not stale snapshots on every keystroke.
  useEffect(() => () => { draftFlushRef.current?.(); }, [selectedCaseKey, accountSession?.user.id]);
  useEffect(() => {
    if (!selectedCase || workbenchDirtyKey !== selectedCaseKey || !workbenchBasePrompt.trim()) { draftFlushRef.current = null; return; }
    const owner = assetStorageOwnerRef.current;
    const save = () => saveCurrentDraft(owner, true);
    draftFlushRef.current = () => {
      const current = readPromptWorkbenchDrafts(owner)[selectedCaseKey];
      const content = (row: { prompt?: string; note?: string; basePrompt?: string; variables?: Record<string, string>; fields?: Partial<PromptStructure> }) => JSON.stringify([row.prompt, row.note ?? '', row.basePrompt, row.variables ?? {}, row.fields ?? {}]);
      const localContent = content({ prompt: selectedRewritePrompt, note: workbenchNote, basePrompt: workbenchBasePrompt, variables: workbenchVariables, fields: workbenchFields });
      // Already-preserved heads must not echo writes between tabs indefinitely.
      if (current && (content(current) === localContent || normalizePromptVersions(current.versions).some(row => content(row) === localContent))) return;
      saveCurrentDraft(owner, false);
    };
    const timer = window.setTimeout(save, 450);
    window.addEventListener('pagehide', save);
    return () => { window.clearTimeout(timer); window.removeEventListener('pagehide', save); };
  }, [selectedCaseKey, workbenchDirtyKey, workbenchBasePrompt, workbenchVariables, workbenchFields, workbenchNote, selectedRewritePrompt]);

  const toggleFavoriteOnly = (item: Image2Case) => {
    const key = getCaseKey(item);
    setFavoriteCaseKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return persistFavoriteCaseKeys(next, assetStorageOwnerRef.current);
    });
  };

  const toggleFavorite = (item: Image2Case) => {
    const key = getCaseKey(item);
    setSelectedKey(key);
    setFavoriteCaseKeys((current) => {
      if (current.has(key)) return current;
      const next = new Set(current);
      next.add(key);
      return persistFavoriteCaseKeys(next, assetStorageOwnerRef.current);
    });
    setIsCollectionPickerOpen(true);
  };

  useEffect(() => {
    if (!selectedCase) return;
    const key = getCaseKey(selectedCase);
    if (workbenchDirtyKey === key) return;
    const savedDraft = promptDrafts[key];
    try {
      const raw = window.sessionStorage.getItem(CASE_RETURN_KEY);
      const returned = raw ? JSON.parse(raw) : null;
      if (returned && returned.owner === assetStorageOwnerRef.current && returned.caseKey === key && typeof returned.prompt === 'string') {
        setWorkbenchBasePrompt(returned.prompt); setWorkbenchFields({ ...emptyPromptStructure }); setWorkbenchVariables({});
        setWorkbenchNote(typeof returned.note === 'string' ? returned.note : ''); setWorkbenchDirtyKey(key);
        window.sessionStorage.removeItem(CASE_RETURN_KEY); return;
      }
    } catch { /* Keep the saved local copy available. */ }
    // Legacy saved prompts remain recoverable instead of being recomputed from their generic fields.
    setWorkbenchFields(savedDraft?.basePrompt !== undefined ? savedDraft.fields : { ...emptyPromptStructure });
    setWorkbenchBasePrompt(savedDraft?.basePrompt ?? savedDraft?.prompt ?? selectedCase.prompt ?? '');
    setWorkbenchVariables(savedDraft?.variables ?? {});
    setWorkbenchNote(savedDraft?.note ?? '');
  }, [promptDrafts, selectedCase?.prompt, selectedDetailKey, workbenchDirtyKey]);

  useEffect(() => {
    if (!selectedCaseKey) {
      setCaseNoteDraft("");
      setCaseNoteDirtyKey(null);
      return;
    }
    if (caseNoteDirtyKey === selectedCaseKey) return;
    setCaseNoteDraft(selectedCaseNote?.note ?? "");
  }, [caseNoteDirtyKey, selectedCaseKey, selectedCaseNote?.note]);

  const updateCaseAssets = (updater: (state: CaseAssetState) => CaseAssetState) => {
    setCaseAssetState((current) => persistCaseAssetState(updater(current), assetStorageOwnerRef.current));
  };

  const verifyPersistedSession = (session: Image2AccountSession, fallbackEmail: string) =>
    persistAccountSession({
      ...session,
      user: {
        ...session.user,
        email: session.user.email ?? fallbackEmail
      }
    });

  const submitAccountAuth = async (event: FormEvent) => {
    event.preventDefault();
    if (!isSupabaseAuthConfigured) return;

    const email = accountEmail.trim();
    const password = accountPassword.trim();

    if (accountOtpMode === "signup") {
      const token = accountOtpCode.trim();
      if (!email || !token) {
        setAccountAuthStatus({ message: "请输入邮箱验证码", tone: "error" });
        return;
      }

      setAccountAuthStatus({ message: "正在验证邮箱验证码...", tone: "busy" });
      try {
        const session = verifyPersistedSession(await verifySupabaseSignupCode(email, token), email);
        setAccountSession(session);
        setAccountEmail(session.user.email ?? email);
        setAccountPassword("");
        setAccountOtpCode("");
        setAccountOtpMode(null);
        setAccountAuthStatus({ message: "注册并登录成功", tone: "success" });
        closeAccountModal();
      } catch (error) {
        setAccountAuthStatus({
          message: toUserFacingError(error instanceof Error ? error.message : error, "验证码校验失败。"),
          tone: "error"
        });
      }
      return;
    }

    if (accountOtpMode === "recovery") {
      const token = accountOtpCode.trim();
      if (!email || !token || password.length < 6) {
        setAccountAuthStatus({ message: "请输入邮箱验证码和至少 6 位新密码", tone: "error" });
        return;
      }

      setAccountAuthStatus({ message: "正在验证并重置密码...", tone: "busy" });
      try {
        const session = verifyPersistedSession(await verifySupabaseEmailCode(email, token, "recovery"), email);
        await updateSupabasePassword(session.accessToken, password);
        setAccountSession(session);
        setAccountEmail(session.user.email ?? email);
        setAccountPassword("");
        setAccountOtpCode("");
        setAccountOtpMode(null);
        setAccountAuthStatus({ message: "密码已重置并登录", tone: "success" });
        closeAccountModal();
      } catch (error) {
        setAccountAuthStatus({
          message: toUserFacingError(error instanceof Error ? error.message : error, "验证码校验或密码重置失败。"),
          tone: "error"
        });
      }
      return;
    }

    if (accountAuthMode === "recover") {
      if (!email) {
        setAccountAuthStatus({ message: "请输入要找回密码的邮箱", tone: "error" });
        return;
      }

      setAccountAuthStatus({ message: "正在发送邮箱验证码...", tone: "busy" });

      try {
        await recoverSupabasePassword(email, getAuthCallbackUrl("recovery"));
        setAccountOtpMode("recovery");
        setAccountOtpCode("");
        setAccountPassword("");
        setAccountAuthStatus({ message: "验证码已发送，请输入验证码并设置新密码", tone: "success" });
      } catch (error) {
        setAccountAuthStatus({
          message: toUserFacingError(error instanceof Error ? error.message : error, "验证码发送失败。"),
          tone: "error"
        });
      }
      return;
    }

    if (!email || password.length < 6) {
      setAccountAuthStatus({ message: "请输入邮箱和至少 6 位密码", tone: "error" });
      return;
    }

    setAccountAuthStatus({ message: accountAuthMode === "login" ? "正在登录..." : "正在发送注册验证码...", tone: "busy" });

    try {
      const session =
        accountAuthMode === "login"
          ? await signInWithSupabasePassword(email, password)
          : await signUpWithSupabasePassword(email, password, getAuthCallbackUrl("confirm"));

      if (!session) {
        setAccountOtpMode("signup");
        setAccountOtpCode("");
        setAccountAuthStatus({ message: "注册验证码已发送，请查看邮箱并输入验证码", tone: "success" });
        return;
      }

      setAccountSession(verifyPersistedSession(session, email));
      setAccountEmail(session.user.email ?? email);
      setAccountPassword("");
      setAccountAuthStatus({ message: accountAuthMode === "login" ? "账号已登录" : "注册并登录成功", tone: "success" });
      closeAccountModal();
    } catch (error) {
      setAccountAuthStatus({
        message: toUserFacingError(error instanceof Error ? error.message : error, "账号请求失败。"),
        tone: "error"
      });
    }
  };

  const signOutAccount = async () => {
    if (!accountSession) return;
    setAccountAuthStatus({ message: "正在退出...", tone: "busy" });

    try {
      await signOutSupabaseSession(accountSession.accessToken);
    } catch {
      // A stale remote session should not prevent local logout.
    }

    clearAccountSession();
    setAccountSession(null);
    setAccountAuthMode("login");
    setWallet(null);
    setLicenseCodeDraft("");
    setAccountPassword("");
    setAccountOtpCode("");
    setAccountOtpMode(null);
    setAccountPasswordVisible(false);
    setAccountAuthStatus({ message: "已退出账号，本地资产仍保留", tone: "success" });
  };

  const submitLicenseRedeem = async (event: FormEvent) => {
    event.preventDefault();
    if (!isSupabaseAuthConfigured) return;
    if (!accountSession) {
      setWalletStatus({ message: "请先登录账号后再兑换卡密", tone: "error" });
      return;
    }

    const code = licenseCodeDraft.trim();
    if (code.length < 4) {
      setWalletStatus({ message: "请输入有效卡密", tone: "error" });
      return;
    }

    setWalletStatus({ message: "正在兑换卡密...", tone: "busy" });

    try {
      const data = await redeemImage2License(accountSession, code);
      if (data.wallet) setWallet(data.wallet);
      setLicenseCodeDraft("");
      setWalletStatus({
        message: data.wallet
          ? `兑换成功，已到账 ${data.redemption?.credits ?? data.wallet.wallet.balance} ANS 积分`
          : "兼容卡密兑换成功，图片额度状态已刷新",
        tone: "success"
      });
    } catch (error) {
      setWalletStatus({
        message: toUserFacingError(error instanceof Error ? error.message : error, "卡密兑换失败。"),
        tone: "error"
      });
    }
  };

  const createCollection = (event: FormEvent) => {
    event.preventDefault();
    const name = collectionNameDraft.trim();
    if (!name) return;

    const now = new Date().toISOString();
    const id = `collection-${Date.now()}`;
    updateCaseAssets((current) => ({
      ...current,
      activeCollectionId: id,
      collections: [
        ...current.collections,
        {
          id,
          name,
          caseKeys: selectedCaseKey ? [selectedCaseKey] : [],
          createdAt: now,
          updatedAt: now
        }
      ]
    }));
    setCollectionNameDraft("");
  };

  const setActiveCollection = (collectionId: string | null) => {
    updateCaseAssets((current) => ({
      ...current,
      activeCollectionId: collectionId
    }));
  };

  const toggleCaseCollection = (collectionId: string) => {
    if (!selectedCaseKey) return;

    const now = new Date().toISOString();
    updateCaseAssets((current) => ({
      ...current,
      collections: current.collections.map((collection) => {
        if (collection.id !== collectionId) return collection;
        const hasCase = collection.caseKeys.includes(selectedCaseKey);
        return {
          ...collection,
          caseKeys: hasCase
            ? collection.caseKeys.filter((key) => key !== selectedCaseKey)
            : [...collection.caseKeys, selectedCaseKey],
          updatedAt: now
        };
      })
    }));
  };

  const updateCaseNoteDraft = (value: string) => {
    setCaseNoteDirtyKey(selectedCaseKey || null);
    setCaseNoteDraft(value);
  };

  const saveCaseNote = () => {
    if (!selectedCaseKey) return;

    const note = caseNoteDraft.trim();
    const now = new Date().toISOString();
    updateCaseAssets((current) => {
      const notes = { ...current.notes };
      if (note) {
        notes[selectedCaseKey] = {
          caseKey: selectedCaseKey,
          note,
          updatedAt: now
        };
      } else {
        delete notes[selectedCaseKey];
      }

      return {
        ...current,
        notes
      };
    });
    setCaseNoteDirtyKey(null);
    setCaseNoteDraft(note);
  };

  const clearCaseNote = () => {
    if (!selectedCaseKey) return;

    updateCaseAssets((current) => {
      const notes = { ...current.notes };
      delete notes[selectedCaseKey];
      return {
        ...current,
        notes
      };
    });
    setCaseNoteDraft("");
    setCaseNoteDirtyKey(null);
  };

  const selectReuseRecord = (record: PromptReuseHistoryItem) => {
    setSelectedKey(record.caseKey);
    setGeneration(null);
    setGenerationError("");
    setGenerationStatus(null);
    if (window.matchMedia("(max-width: 980px)").matches) {
      setIsDetailOpen(true);
      pushCaseDetailHistory(record.caseKey);
    }
  };

  const ensureCaseDetail = async (item: Image2Case) => {
    if (item.prompt?.trim()) return item;

    const detailKey = getCaseKey(item);
    const cachedDetail = caseDetails[detailKey];
    if (cachedDetail?.prompt?.trim()) return { ...item, ...cachedDetail } as Image2Case;

    const pending = detailRequestsRef.current.get(detailKey);
    if (pending) return pending;
    setLoadingDetailKey(detailKey);
    const request = (async () => {
      try {
        const response = await fetch(withDataVersion(`/data/image2-cases/${detailKey}.js`), { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error("提示词加载失败。");
        const detail = (await response.json()) as Partial<Image2Case>;
        if (!detail.prompt?.trim()) throw new Error("提示词内容为空。");
        setCaseDetails((details) => ({ ...details, [detailKey]: detail }));
        return { ...item, ...detail } as Image2Case;
      } finally {
        detailRequestsRef.current.delete(detailKey);
        setLoadingDetailKey((current) => (current === detailKey ? null : current));
      }
    })();
    detailRequestsRef.current.set(detailKey, request);
    return request;
  };

  useEffect(() => {
    if (!selectedCaseSummary) return;
    const detailKey = getCaseKey(selectedCaseSummary);
    if (caseDetails[detailKey]?.prompt) return;
    void ensureCaseDetail(selectedCaseSummary).catch(() => {
      setGenerationError("完整提示词加载失败，请重新点开这个案例。");
    });
  }, [caseDetails, selectedCaseSummary]);

  const openCase = (item: Image2Case) => {
    const caseKey = getCaseKey(item);
    const isMobileDetail = window.matchMedia("(max-width: 980px)").matches;

    setSelectedKey(caseKey);
    setGeneration(null);
    setGenerationError("");
    setGenerationStatus(null);
    setIsDetailOpen(isMobileDetail);

    if (isMobileDetail) pushCaseDetailHistory(caseKey);
  };

  const previewCaseImage = (item: Image2Case, src = item.imageUrl) => {
    setImagePreview({
      alt: item.imageAlt,
      meta: [item.caseCode ?? `Case ${item.id}`, item.categoryLabel, item.resolution].filter(Boolean).join(" · "),
      src,
      title: item.title
    });
  };

  const recordPromptReuse = (item: Image2Case, action: PromptReuseHistoryItem["action"], prompt: string) => {
    const nextRecord: PromptReuseHistoryItem = {
      action,
      caseKey: getCaseKey(item),
      caseTitle: item.title,
      createdAt: new Date().toISOString(),
      id: `${getCaseKey(item)}-${action}-${Date.now()}`,
      prompt
    };

    setPromptReuseHistory((items) =>
      persistPromptReuseHistory([nextRecord, ...items.filter((entry) => entry.id !== nextRecord.id)], assetStorageOwnerRef.current)
    );
  };

  const markWorkbenchDirty = () => {
    if (!selectedCase) return;
    if (workbenchDirtyKey !== selectedCaseKey) draftSeenRef.current.set(draftSlot(assetStorageOwnerRef.current, selectedCaseKey), draftStamp(readPromptWorkbenchDrafts(assetStorageOwnerRef.current)[selectedCaseKey]));
    setWorkbenchDirtyKey(selectedCaseKey);
  };

  const updateWorkbenchField = (field: keyof PromptStructure, value: string) => {
    markWorkbenchDirty();
    setWorkbenchFields((fields) => ({ ...fields, [field]: value }));
  };

  const updateWorkbenchNote = (value: string) => {
    markWorkbenchDirty();
    setWorkbenchNote(value);
  };

  const updateBasePrompt = (value: string) => {
    markWorkbenchDirty();
    setWorkbenchBasePrompt(value);
  };
  const updateVariable = (token: string, value: string) => {
    markWorkbenchDirty();
    setWorkbenchVariables(current => ({ ...current, [token]: value }));
  };
  const restoreVariant = (value: string | PromptVersion) => {
    updateBasePrompt(typeof value === 'string' ? value : value.basePrompt ?? value.prompt);
    setWorkbenchFields(typeof value === 'string' ? { ...emptyPromptStructure } : normalizePromptStructure(value.fields, emptyPromptStructure));
    setWorkbenchVariables(typeof value === 'string' ? {} : value.variables ?? {});
    if (typeof value !== 'string') setWorkbenchNote(value.note ?? '');
  };
  const enterCaseWorkbench = () => {
    if (!selectedCase || !selectedRewritePrompt.trim()) return;
    try {
      flushDraft();
      window.sessionStorage.setItem(CASE_HANDOFF_KEY, JSON.stringify({
        owner: assetStorageOwnerRef.current, caseKey: selectedCaseKey, title: selectedCase.title,
        prompt: selectedRewritePrompt, original: selectedCase.prompt,
        referenceRequired: selectedCase.referenceRequired ?? false,
        inputCompleteness: selectedCase.inputCompleteness ?? 'unknown',
        references: (selectedCase.imageRoles ?? []).filter(image => image.role === 'reference').map(image => ({ ...image, role: 'reference' })),
        sourceUrl: selectedCase.sourceUrl, createdAt: new Date().toISOString(), schema: 'image2-plan-v2',
        versionId: selectedWorkbench?.versions?.find(v => v.prompt === selectedRewritePrompt)?.id ?? null,
        note: workbenchNote, aspect: selectedCase.aspect, resolution: selectedCase.resolution,
        constraints: promptConstraints(selectedCase.prompt ?? ''), returnUrl: currentLibraryUrl().pathname + currentLibraryUrl().search,
        missingInputs: selectedCase.referenceRequired && selectedCase.inputCompleteness === 'missing' ? ['用户参考图'] : [],
        model: 'gpt-image-2.5-sunburst-c', provider: 'OpenLux'
      }));
      window.location.assign('/workbench?from=case');
    } catch { setGenerationError('工作台暂存失败，请先复制完整提示词。'); }
  };

  const saveWorkbench = (name?: string) => {
    if (!selectedCase || !selectedRewritePrompt.trim()) return;
    const createdAt = new Date().toISOString();
    const owner = assetStorageOwnerRef.current;
    const stored = saveCurrentDraft(owner, false);
    const previous = stored[selectedCaseKey] ?? promptDrafts[selectedCaseKey];
    const otherVersions = normalizePromptVersions(stored[selectedCaseKey]?.versions);
    const legacy: PromptVersion[] = !previous?.versions && previous?.prompt ? [{ id: 'legacy-' + selectedCaseKey, name: '历史保存稿', prompt: previous.prompt, note: previous.note, createdAt: previous.updatedAt }] : [];
    const version: PromptVersion = { id: crypto.randomUUID(), name: name || '方案 ' + ((previous?.versions?.length ?? 0) + 1), prompt: selectedRewritePrompt,
      basePrompt: workbenchBasePrompt, variables: { ...workbenchVariables }, fields: { ...workbenchFields }, note: workbenchNote, createdAt };
    const next = { ...stored, [selectedCaseKey]: { caseTitle: selectedCase.title, fields: { ...workbenchFields }, basePrompt: workbenchBasePrompt,
      variables: { ...workbenchVariables }, note: workbenchNote, prompt: selectedRewritePrompt, updatedAt: createdAt, versions: [version, ...mergePromptVersions(otherVersions, normalizePromptVersions(previous?.versions ?? legacy))] } };
    try {
      window.localStorage.setItem(scopedAssetStorageKey(promptWorkbenchStorageKey, assetStorageOwnerRef.current), JSON.stringify(next));
      draftSeenRef.current.set(draftSlot(assetStorageOwnerRef.current, selectedCaseKey), draftStamp(next[selectedCaseKey]));
      setPromptDrafts(next); setEditorStatus('已保存版本「' + version.name + '」');
      recordPromptReuse(selectedCase, 'saved', selectedRewritePrompt);
    } catch { setEditorStatus('保存失败：本机存储空间不足或不可用，请导出或复制方案。'); }
  };

  const resetWorkbench = () => {
    if (!selectedCase) return;
    setWorkbenchFields({ ...emptyPromptStructure }); setWorkbenchBasePrompt(selectedCase.prompt ?? '');
    setWorkbenchVariables({}); setWorkbenchNote(''); setWorkbenchDirtyKey(selectedCaseKey);
    setEditorStatus('已恢复原文，保存的版本仍保留');
  };

  const handleCaseCardClick = (event: MouseEvent<HTMLButtonElement>, item: Image2Case) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (item.imageStatus !== "text-only" && target?.closest(".case-image-shell")) {
      previewCaseImage(item);
      return;
    }

    openCase(item);
  };

  const handleHeroCardClick = (event: MouseEvent<HTMLButtonElement>, item: Image2Case) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (item.imageStatus === "text-only" || target?.closest(".case-hero-card-overlay")) {
      openCase(item);
      return;
    }

    previewCaseImage(item);
  };

  const copyPrompt = async (item: Image2Case) => {
    try {
      const fullItem = await ensureCaseDetail(item);
      const prompt = fullItem.prompt?.trim();
      if (!prompt) throw new Error("提示词还没有加载完成。");
      await navigator.clipboard.writeText(prompt);
      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId(null), 1300);
      recordPromptReuse(fullItem, "copied", prompt);
    } catch (error) {
      setGenerationError(toUserFacingError(error instanceof Error ? error.message : error, "提示词复制失败。"));
    }
  };

  const copyRewritePrompt = async () => {
    if (!selectedCase) return;

    try {
      const prompt = selectedRewritePrompt.trim();
      if (!prompt) throw new Error("改写提示词还没有准备好。");
      await navigator.clipboard.writeText(prompt);
      setRewriteCopiedKey(getCaseKey(selectedCase));
      window.setTimeout(() => setRewriteCopiedKey(null), 1300);
      recordPromptReuse(selectedCase, "copied", prompt);
    } catch (error) {
      setGenerationError(toUserFacingError(error instanceof Error ? error.message : error, "改写提示词复制失败。"));
    }
  };

  const generateSimilar = async (promptOverride?: string) => {
    if (!selectedCase) return;

    const startedAt = Date.now();
    setGenerationError("");
    setGeneration(null);
    setGenerationStatus(null);

    try {
      const fullCase = await ensureCaseDetail(selectedCase);
      const prompt = promptOverride?.trim() || fullCase.prompt?.trim();
      if (!prompt) throw new Error("完整提示词还没有加载完成，请稍等后再生成。");

      setIsGenerating(true);
      setGenerationStartedAt(startedAt);
      setGenerationTick(startedAt);

      const payload = { prompt, size: "1024x1024", n: 1, images: [] };
      const data = await requestImage2Stream(payload, setGenerationStatus, accountSession?.accessToken);
      if (data.quota) setFreeQuota(data.quota);
      if (data.wallet) {
        const nextWallet = data.wallet;
        setWallet((current) =>
          current
            ? {
                ...current,
                wallet: nextWallet
              }
            : {
                recentTransactions: [],
                storageMode: "supabase-postgres",
                wallet: nextWallet
              }
        );
        setWalletStatus({ message: `当前可用 ${nextWallet.balance} ANS 积分（约 ${Math.floor(nextWallet.balance / 2)} 张图）`, tone: nextWallet.balance > 0 ? "success" : "idle" });
      }
      const elapsedSeconds =
        typeof data.elapsedSeconds === "number"
          ? Math.round(data.elapsedSeconds)
          : Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const result: GenerationResult = { ...data, elapsedSeconds };
      const historyItem: GenerationHistoryItem = {
        ...result, prompt, model: 'gpt-image-2.5-sunburst-c', provider: 'OpenLux', size: payload.size, versionId: selectedWorkbench?.versions?.find(v => v.prompt === prompt)?.id ?? null,
        id: `${fullCase.id}-${Date.now()}`,
        caseId: fullCase.id,
        caseKey: getCaseKey(fullCase),
        caseCode: fullCase.caseCode,
        caseTitle: fullCase.title,
        createdAt: new Date().toISOString()
      };

      setGeneration(result);
      setGenerationStatus(null);
      setGenerationHistory((items) =>
        persistGenerationHistory([historyItem, ...items.filter((entry) => entry.id !== historyItem.id)])
      );
      if (promptOverride?.trim()) {
        recordPromptReuse(fullCase, "generated", prompt);
      }
    } catch (error) {
      if (isFreeQuotaError(error)) {
        setFreeQuota(error.quota ?? { blocked: true, limit: freeQuota?.limit ?? 2, remaining: 0, used: freeQuota?.limit ?? 2 });
        setGenerationError("");
        setIsQuotaModalOpen(true);
      } else {
        setGenerationError(toUserFacingError(error instanceof Error ? error.message : error, "生成失败。"));
        void requestImage2Quota().then((quota) => {
          if (quota) setFreeQuota(quota);
        });
      }
    } finally {
      setIsGenerating(false);
      setGenerationStartedAt(null);
    }
  };

  const selectHistory = (record: GenerationHistoryItem) => {
    setSelectedKey(record.caseKey ?? String(record.caseId));
    setGenerationError("");
    setGenerationStatus(null);
    setGeneration({
      outDir: record.outDir,
      images: record.images,
      elapsedSeconds: record.elapsedSeconds
    });
    if (window.matchMedia("(max-width: 980px)").matches) {
      setIsDetailOpen(true);
      pushCaseDetailHistory(record.caseKey ?? String(record.caseId));
    }
  };

  if (!payload) {
    return (
      <main className="case-library loading">
        {loadError ? (
          <div role="alert">
            <p>案例库暂时加载失败，请检查网络后重试。</p>
            <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>重新加载</button>
          </div>
        ) : (
          <div role="status">
            <Loader2 className="case-spin" aria-hidden="true" />
            <p>正在加载 Image2 案例库...</p>
          </div>
        )}
      </main>
    );
  }

  const walletPanelLabel = accountSession ? `${wallet?.wallet.balance ?? 0} 积分` : "登录后兑换";
  const walletSummary = accountSession
    ? walletStatus.message
    : "已接入 ANS 统一算力积分（2 积分/张），登录后即可生成或兑换卡密。";
  const accountNeedsCode = Boolean(accountOtpMode);
  const accountSubmitLabel =
    accountOtpMode === "signup"
      ? "验证并完成注册"
      : accountOtpMode === "recovery"
        ? "验证并重置密码"
        : accountAuthMode === "login"
          ? "登录账号"
          : accountAuthMode === "signup"
            ? "发送注册验证码"
            : "发送找回验证码";
  const shouldShowAccountPassword =
    accountOtpMode === "signup" ? false : accountAuthMode !== "recover" || accountOtpMode === "recovery";
  const accountPasswordPlaceholder =
    accountOtpMode === "recovery" ? "新密码（至少 6 位）" : accountAuthMode === "signup" ? "设置密码（至少 6 位）" : "密码";
  const accountPasswordAutocomplete =
    accountOtpMode === "recovery" || accountAuthMode === "signup" ? "new-password" : "current-password";
  const accountModalTitle = accountSession
    ? "账号中心"
    : accountOtpMode === "signup"
      ? "输入注册验证码"
      : accountOtpMode === "recovery"
        ? "验证邮箱并重置密码"
        : accountAuthMode === "recover"
          ? "找回密码"
          : "登录 / 注册";
  const accountModalDescription = accountSession
    ? "退出后可以切换账号，继续使用收藏、备注和图片额度。"
    : accountOtpMode === "signup"
      ? "验证码已发送到邮箱，输入后即可完成注册。"
      : accountOtpMode === "recovery"
        ? "验证码已发送到邮箱，输入验证码并设置新密码。"
        : accountAuthMode === "signup"
          ? "填写邮箱和密码，下一步通过邮箱验证码完成注册。"
          : accountAuthMode === "recover"
            ? "填写邮箱后接收验证码，用验证码设置新密码。"
            : "登录后可保存收藏夹、备注，并兑换图片余额。";
  const openAccountModal = () => {
    if (!accountSession) {
      setAccountAuthMode("login");
      setAccountOtpMode(null);
      setAccountOtpCode("");
      setAccountAuthStatus({
        message: isSupabaseAuthConfigured ? "可以使用账号登录" : "账号登录未配置",
        tone: "idle"
      });
    } else {
      setAccountAuthStatus({ message: "账号已登录", tone: "success" });
    }
    setAccountPassword("");
    setAccountPasswordVisible(false);
    setIsAuthModalOpen(true);
  };
  const closeAccountModal = () => {
    setIsAuthModalOpen(false);
    setAccountPassword("");
    setAccountOtpCode("");
    setAccountOtpMode(null);
    setAccountPasswordVisible(false);
  };
  const switchAccountMode = (mode: AccountAuthMode) => {
    setAccountAuthMode(mode);
    setAccountOtpMode(null);
    setAccountOtpCode("");
    setAccountPassword("");
    setAccountPasswordVisible(false);
    setAccountAuthStatus({
      message:
        mode === "login"
          ? "输入邮箱和密码登录"
          : mode === "signup"
            ? "输入邮箱和密码后接收验证码"
            : "输入邮箱接收找回验证码",
      tone: "idle"
    });
  };
  const resendAccountOtp = async () => {
    if (!isSupabaseAuthConfigured || !accountOtpMode) return;
    const email = accountEmail.trim();
    if (!email) {
      setAccountAuthStatus({ message: "请输入邮箱", tone: "error" });
      return;
    }

    if (accountOtpMode === "signup") {
      const password = accountPassword.trim();
      if (password.length < 6) {
        setAccountAuthStatus({ message: "请先输入至少 6 位密码", tone: "error" });
        return;
      }
      setAccountAuthStatus({ message: "正在重新发送注册验证码...", tone: "busy" });
      try {
        await signUpWithSupabasePassword(email, password, getAuthCallbackUrl("confirm"));
        setAccountOtpCode("");
        setAccountAuthStatus({ message: "注册验证码已重新发送", tone: "success" });
      } catch (error) {
        setAccountAuthStatus({
          message: toUserFacingError(error instanceof Error ? error.message : error, "验证码重新发送失败。"),
          tone: "error"
        });
      }
      return;
    }

    setAccountAuthStatus({ message: "正在重新发送找回验证码...", tone: "busy" });
    try {
      await recoverSupabasePassword(email, getAuthCallbackUrl("recovery"));
      setAccountOtpCode("");
      setAccountAuthStatus({ message: "找回验证码已重新发送", tone: "success" });
    } catch (error) {
      setAccountAuthStatus({
        message: toUserFacingError(error instanceof Error ? error.message : error, "验证码重新发送失败。"),
        tone: "error"
      });
    }
  };
  const prepareWorkbenchEntry = () => {
    if (!accountSession) return false;
    persistAccountSession(accountSession);
    return true;
  };
  const openWorkbenchEntry = () => {
    flushDraft();
    if (accountSession) prepareWorkbenchEntry();
    enterCaseWorkbench();
  };

  const exportAssets = (drafts = flushDraft()) => {
    const backup = { schema: 'image2-personal-backup-v2', owner: assetStorageOwnerRef.current, exportedAt: new Date().toISOString(), snapshot: { ...buildCurrentAssetSnapshot(), promptDrafts: drafts }, generationHistory };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'image2-plans-' + new Date().toISOString().slice(0,10) + '.json'; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setAssetBackupStatus('完整备份已下载，包含草稿、版本、备注和生成记录');
  };
  const importAssets = async (file: File) => {
    const owner = assetStorageOwnerRef.current;
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error('备份超过 50MB，请拆分图片数据后恢复');
      const backup = JSON.parse(await file.text()); const incoming = backup.snapshot;
      if (owner !== assetStorageOwnerRef.current || owner !== (readAccountSession()?.user.id ?? null)) throw new Error('账号已切换，请在原账号下重新恢复备份');
      if (backup.schema !== 'image2-personal-backup-v2' || backup.owner !== owner) throw new Error('备份格式不兼容，或所属账号与当前账号不一致');
      if (!isRecord(incoming) || incoming.version !== 'image2-assets-v1' || !Array.isArray(incoming.favoriteCaseKeys) || !incoming.favoriteCaseKeys.every(x => typeof x === 'string') || !Array.isArray(incoming.collections) || !incoming.collections.every(c => isRecord(c) && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.createdAt === 'string' && typeof c.updatedAt === 'string' && Array.isArray(c.caseKeys) && c.caseKeys.every(k => typeof k === 'string')) || !isRecord(incoming.notes) || !Object.values(incoming.notes).every(n => isRecord(n) && typeof n.note === 'string' && typeof n.updatedAt === 'string' && typeof n.caseKey === 'string') || !isRecord(incoming.promptDrafts) || Object.keys(normalizeAssetPromptDrafts(incoming.promptDrafts)).length !== Object.keys(incoming.promptDrafts).length || !Array.isArray(incoming.promptReuseHistory) || !Array.isArray(backup.generationHistory) || !backup.generationHistory.every((r: GenerationHistoryItem) => r && typeof r.id === 'string' && typeof r.caseId === 'number' && typeof r.caseTitle === 'string' && (r.prompt === undefined || typeof r.prompt === 'string') && typeof r.createdAt === 'string' && Array.isArray(r.images))) throw new Error('备份内容不完整，未修改当前资产');
      const currentDrafts = flushDraft(); exportAssets(currentDrafts);
      const merged = mergeAssetSnapshots({ ...buildCurrentAssetSnapshot(), promptDrafts: currentDrafts }, incoming as unknown as Image2AssetSnapshot);
      const recordMap = new Map<string, GenerationHistoryItem>();
      for (const r of [...backup.generationHistory, ...generationHistory]) recordMap.set(r.id, r);
      const records = [...recordMap.values()].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
      commitAssetBackup(merged, records, assetStorageOwnerRef.current);
      applyAssetSnapshot(merged);
      setGenerationHistory(records);
      setWorkbenchDirtyKey(null); setCaseNoteDirtyKey(null);
      setAssetBackupStatus('备份已合并恢复，恢复前的本机内容也已下载备份');
    } catch (error) { setAssetBackupStatus(error instanceof Error ? error.message : '恢复失败，当前内容仍保留'); }
  };
  const openPersonalPlan = (key: string, version?: PromptVersion) => {
    flushDraft();
    if (version) window.sessionStorage.setItem(CASE_RETURN_KEY, JSON.stringify({ owner: assetStorageOwnerRef.current, caseKey: key, prompt: version.prompt, note: version.note }));
    const item = cases.find(c => getCaseKey(c) === key || String(c.id) === key);
    if (!item) { setAssetBackupStatus('源案例已不可用；个人完整稿仍可在此阅读并导出备份'); return; }
    setWorkbenchDirtyKey(null); setPlanView(false); openCase(item);
  };
  return (
    <main className="case-library">
      <header className="case-hero">
        <div className="case-hero-toolbar">
          <nav className="case-site-nav" aria-label="Image2 导航">
            <a className="case-site-brand" href="/">
              <Sparkles aria-hidden="true" />
              <span>Image2</span>
            </a>
            <a href="/">首页</a>
            <a href="/image2-cases">案例库</a>
            <a href="/workbench">作图中控台</a>
            <a href="/image2-cases/gacha">同款抽卡</a>
            <a href="/admin/image2-cases">运营台</a>
          </nav>
          <div className="case-hero-actions">
            <Image2LanguageToggle language={language} onChange={setLanguage} />
            <button className="case-auth-launcher" type="button" onClick={openAccountModal}>
              <UserRound aria-hidden="true" />
              <span>{accountSession ? accountSession.user.email ?? (language === "zh" ? "账号中心" : "Account") : pageCopy.account}</span>
            </button>
          </div>
        </div>

        <div className="case-hero-copy">
          <p className="case-kicker">
            <Sparkles aria-hidden="true" />
            {pageCopy.heroKicker}
          </p>
          <h1>{pageCopy.heroTitle}</h1>
          <p>{pageCopy.heroDescription}</p>

          <section className={styles.bridge} aria-label="案例到作图台">
            <div className={styles.bridgeCopy}>
              <span>
                <WandSparkles aria-hidden="true" />
                {pageCopy.bridge.kicker}
              </span>
              <strong>{pageCopy.bridge.title}</strong>
              <small>
                {selectedCase
                  ? `${language === "zh" ? "当前案例" : "Current case"}：${selectedCase.caseCode ?? `Case ${selectedCase.id}`} · ${localizedCaseText(selectedCase, language).title}`
                  : pageCopy.bridge.fallback}
              </small>
            </div>
            <div className={styles.bridgeSteps} aria-label="作图流程">
              <span>{pageCopy.bridge.steps[0]}</span>
              <i aria-hidden="true" />
              <span>{pageCopy.bridge.steps[1]}</span>
              <i aria-hidden="true" />
              <span>{pageCopy.bridge.steps[2]}</span>
            </div>
            <div className={styles.bridgeActions}>
              <button type="button" onClick={openWorkbenchEntry} disabled={!selectedHasPrompt || !selectedRewritePrompt.trim()}>
                <WandSparkles aria-hidden="true" />
                {pageCopy.bridge.enter()}
              </button>
            </div>
          </section>
        </div>

        <div className="case-hero-visual" aria-label="精选封面预览">
          <div className="case-hero-mosaic">
            {heroCases.map((item, index) => (
              <button
                className={
                  selectedCase && getCaseKey(selectedCase) === getCaseKey(item)
                    ? `case-hero-card is-selected hero-slot-${index + 1}`
                    : `case-hero-card hero-slot-${index + 1}`
                }
                key={getCaseKey(item)}
                type="button"
                onClick={(event) => handleHeroCardClick(event, item)}
              >
                {(() => {
                  const localized = localizedCaseText(item, language);
                  return (
                    <>
                <CaseImage
                  alt={localized.imageAlt}
                  loading="eager"
                  src={heroImageOverrides[item.id] ?? item.imageUrl}
                  textOnly={item.imageStatus === "text-only"}
                  timeoutMs={9000}
                />
                <span className="case-hero-card-overlay">
                  <small>{item.caseCode ?? `#${item.id}`}</small>
                  <strong>{localized.title}</strong>
                </span>
                    </>
                  );
                })()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {planView ? <Image2PlanSpace owner={accountSession?.user.id ?? null} snapshot={buildCurrentAssetSnapshot()} records={generationHistory} cases={cases.map(c => ({ key: getCaseKey(c), title: localizedCaseText(c, language).title, source: c.sourceName }))} onExport={() => exportAssets()} onImport={importAssets} onOpen={openPersonalPlan} onBrowse={() => setPlanView(false)} status={assetBackupStatus} /> : null}
      <section style={planView ? { display: 'none' } : undefined} className={`case-layout ${isFiltersCollapsed ? filterStyles.filtersCollapsed : ""}`}>
        <aside
          className={`case-filters ${isFiltersCollapsed ? filterStyles.sidebarCollapsed : ""}`}
          aria-label="案例筛选"
        >
          <div className={filterStyles.topbar}>
            <button
              aria-expanded={!isFiltersCollapsed}
              aria-label={isFiltersCollapsed ? "展开筛选栏" : "收起筛选栏"}
              className={filterStyles.toggleButton}
              title={isFiltersCollapsed ? "展开筛选栏" : "收起筛选栏"}
              type="button"
              onClick={() => setIsFiltersCollapsed((value) => !value)}
            >
              {isFiltersCollapsed ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
              <span className={filterStyles.toggleLabel}>{isFiltersCollapsed ? "展开筛选" : "收起筛选"}</span>
            </button>
          </div>

          {!isFiltersCollapsed ? (
            <div className={filterStyles.body}>
              <div className="filter-section category-list case-category-filter">
                <h2>{pageCopy.filters.category}</h2>
                <div className="case-filter-scroll">
                  <button
                    className={category === "全部" ? "active" : ""}
                    type="button"
                    onClick={() => setCategory("全部")}
                  >
                    <span>{language === "zh" ? "全部" : "All"}</span>
                    <b>{payload.totalCases}</b>
                  </button>
                  {categories.map((item) => (
                    <button
                      className={category === item.value ? "active" : ""}
                      key={item.value}
                      type="button"
                      onClick={() => setCategory(item.value)}
                    >
                      <span>{localizedCategoryLabel(item.label, language)}</span>
                      <b>{item.count}</b>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </aside>

        <section className="case-gallery" id="case-gallery" aria-label={pageCopy.filters.gallery}>
          <div className="case-gallery-controls" aria-label="案例操作区">
            <div className="case-gallery-search-row">
              <div className="case-search">
                <Search aria-hidden="true" />
                <input
                  aria-label="搜索案例"
                  placeholder={pageCopy.filters.search}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <select aria-label="排序方式" value={sortOrder} onChange={e => setSortOrder(e.target.value)}><option value="relevance">任务匹配优先</option><option value="quality">编辑评分优先</option><option value="newest">收录编号从新到旧</option></select>
              <select aria-label="输入条件" value={inputFilter} onChange={e => setInputFilter(e.target.value)}><option value="all">全部输入条件</option><option value="text">无需参考图</option><option value="reference">需要参考图</option><option value="missing">需要自备输入素材</option><option value="text-only">仅文本案例</option></select>
              {promptVariantExtraCount > 0 ? (
                <button
                  aria-pressed={showPromptVariants}
                  className={showPromptVariants ? "case-variant-toggle active" : "case-variant-toggle"}
                  type="button"
                  onClick={() => setShowPromptVariants((value) => !value)}
                >
                  {showPromptVariants ? "隐藏重复变体" : `显示 ${promptVariantExtraCount} 个同提示词变体`}
                </button>
              ) : null}
            </div>

            <div className="case-gallery-control-grid">
              <section className="case-gallery-filter-card case-gallery-favorites-card">
                <h3>{pageCopy.filters.favorites}</h3>
                <button
                  aria-pressed={favoritesOnly}
                  className={favoritesOnly ? "case-favorites-filter active" : "case-favorites-filter"}
                  type="button"
                  onClick={() => setFavoritesOnly((value) => !value)}
                >
                  <Heart aria-hidden="true" />
                  <span>{favoritesOnly ? pageCopy.filters.favoritesOnly : pageCopy.filters.favoritesAll}</span>
                  <b>{favoriteCount}</b>
                </button>
              </section>

              <section className="case-gallery-filter-card case-gallery-collection-card">
                <div className="case-assets-panel-head">
                  <h3>{pageCopy.filters.collection}</h3>
                  <span>{caseAssetState.collections.length}</span>
                </div>
                <div className="case-collection-list" aria-label="收藏夹筛选">
                  <button
                    className={!activeCollection ? "active" : ""}
                    type="button"
                    onClick={() => setActiveCollection(null)}
                  >
                    <span>{pageCopy.filters.allCollections}</span>
                    <b>{cases.length}</b>
                  </button>
                  {caseAssetState.collections.map((collection) => (
                    <button
                      className={activeCollection?.id === collection.id ? "active" : ""}
                      key={collection.id}
                      type="button"
                      onClick={() => setActiveCollection(collection.id)}
                    >
                      <span>{collection.name}</span>
                      <b>{collection.caseKeys.length}</b>
                    </button>
                  ))}
                </div>
                <button
                  className="case-collection-manage-button"
                  type="button"
                  onClick={() => setIsCollectionPickerOpen(true)}
                >
                  <FolderPlus aria-hidden="true" />
                  管理收藏夹
                </button>
                <div className={`case-asset-sync ${assetSyncStatus.tone}`} aria-label="收藏夹同步状态">
                  <strong>收藏夹同步</strong>
                  <small>{assetSyncStatus.message}</small>
                </div>
              </section>

              <section className="case-gallery-filter-card case-gallery-recent-card">
                <h3>{pageCopy.filters.recent}</h3>
                <div className="case-recent-list">
                  {promptReuseHistory.length ? (
                    promptReuseHistory.slice(0, 4).map((record) => (
                      <button key={record.id} type="button" onClick={() => selectReuseRecord(record)}>
                        <span>
                          <strong>{record.caseTitle}</strong>
                          <small>
                            {record.action === "saved"
                              ? "保存变体"
                              : record.action === "generated"
                                ? "生成改写"
                                : "复制提示词"}{" "}
                            · {formatHistoryTime(record.createdAt)}
                          </small>
                        </span>
                        <History aria-hidden="true" />
                      </button>
                    ))
                  ) : (
                    <p>复制、保存或生成后，这里会出现最近用过的案例。</p>
                  )}
                </div>
              </section>

              <section className="case-gallery-filter-card case-gallery-membership-card">
                <div className={`case-membership-panel ${walletStatus.tone}`} aria-label="图片余额">
                  <div className="case-membership-panel-head">
                    <span>
                      <WalletCards aria-hidden="true" />
                      <strong>{pageCopy.filters.membership}</strong>
                    </span>
                    <em>{walletPanelLabel}</em>
                  </div>
                  <p>{walletSummary}</p>
                  <div className="case-membership-features" aria-label="额度包">
                    {image2BalancePacks.map((pack) => (
                      <span key={pack.plan}>
                        {pack.label} {pack.price}
                      </span>
                    ))}
                  </div>
                  {isSupabaseAuthConfigured && accountSession ? (
                    <form className="case-membership-form" onSubmit={submitLicenseRedeem}>
                      <input
                        aria-label="Image2 卡密"
                        autoComplete="off"
                        placeholder="输入卡密"
                        value={licenseCodeDraft}
                        onChange={(event) => setLicenseCodeDraft(event.target.value)}
                      />
                      <button type="submit" disabled={walletStatus.tone === "busy"}>
                        {walletStatus.tone === "busy" ? (
                          <Loader2 className="spinning" aria-hidden="true" />
                        ) : (
                          <KeyRound aria-hidden="true" />
                        )}
                        兑换
                      </button>
                    </form>
                  ) : (
                    <button className="case-balance-login-button" type="button" onClick={openAccountModal}>
                      <LogIn aria-hidden="true" />
                      登录后兑换
                    </button>
                  )}
                </div>
              </section>
            </div>
          </div>

          <div className="case-gallery-head">
            <div>
              <p>{pageCopy.filters.results(filteredCases.length)}</p>
              <h2>{galleryTitle}</h2>
            </div>
          </div>

          {filteredCases.length ? (
            <>
              <div className="case-grid">
              {visibleCases.map((item) => {
                const caseKey = getCaseKey(item);
                const isFavorite = favoriteCaseKeys.has(caseKey);
                const reuse = inferReuseProfile(item);
                const localized = localizedCaseText(item, language);

                return (
                  <div className="case-card-shell" key={caseKey}>
                    <button
                      className={selectedCase && getCaseKey(selectedCase) === caseKey ? "case-card active" : "case-card"}
                      type="button"
                      onClick={(event) => handleCaseCardClick(event, item)}
                    >
                      <CaseImage alt={localized.imageAlt} src={item.imageUrl} textOnly={item.imageStatus === "text-only"} />
                      <div>
                        <small>
                          {item.caseCode ?? `Case ${item.id}`} · {localized.categoryLabel}
                          {item.promptFamily && item.promptFamily.size > 1
                            ? ` · 变体 ${item.promptFamily.variantIndex}/${item.promptFamily.size}`
                            : ""}
                        </small>
                        <strong>{localized.title}</strong>
                        <em className="case-card-original-title">{localized.titleSecondary}</em>
                        <p>{localized.promptPreview}</p>
                        <p className="case-card-original-prompt">{localized.promptPreviewSecondary}</p>
                        <footer>
                          <b>{item.valueScore}</b>
                          <span>{localized.promptKind || item.promptKind}</span>
                          <em>{reuse.label}</em>
                        </footer>
                      </div>
                    </button>
                    <button
                      aria-label={
                        language === "zh"
                          ? `${isFavorite ? "移出" : "加入"}收藏：${localized.title} 图片与提示词`
                          : `${isFavorite ? "Remove from" : "Add to"} favorites: ${localized.title}`
                      }
                      aria-pressed={isFavorite}
                      className={isFavorite ? "case-card-favorite active" : "case-card-favorite"}
                      title={isFavorite ? (language === "zh" ? "移出收藏" : "Remove favorite") : language === "zh" ? "收藏图片与提示词" : "Save image and prompt"}
                      type="button"
                      onClick={() => toggleFavorite(item)}
                    >
                      <Heart aria-hidden="true" />
                    </button>
                    <div className={isFavorite ? "case-card-gacha active" : "case-card-gacha"} aria-label="同款抽卡">
                      {isFavorite ? (
                        <>
                          <a href={`/image2-cases/gacha?case=${encodeURIComponent(caseKey)}&mode=single`}>
                            <WandSparkles aria-hidden="true" />
                            单抽
                          </a>
                          <a href={`/image2-cases/gacha?case=${encodeURIComponent(caseKey)}&mode=pack`}>
                            <PackageOpen aria-hidden="true" />
                            九抽
                          </a>
                        </>
                      ) : (
                        <button type="button" onClick={() => toggleFavorite(item)}>
                          <Heart aria-hidden="true" />
                          先收藏再抽
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
              {visibleCases.length < filteredCases.length ? (
                <div className="case-load-more">
                  <p>
                    已显示 {visibleCases.length} / {filteredCases.length} 个案例
                  </p>
                  <button type="button" onClick={() => setVisibleCaseCount((count) => count + visibleCasePageSize)}>
                    加载更多案例
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="case-empty-results">
              <Heart aria-hidden="true" />
              <strong>{favoritesOnly ? pageCopy.filters.emptyFavorites : pageCopy.filters.emptyResults}</strong>
              <p>
                {favoritesOnly
                  ? pageCopy.filters.emptyFavoritesNote
                  : pageCopy.filters.emptyResultsNote}
              </p>
            </div>
          )}
        </section>

        {selectedCase && (
          <aside className="case-detail" aria-label="案例详情">
            <CaseDetailContent
              editorScope={accountSession?.user.id ?? "anonymous"}
              key={(accountSession?.user.id ?? "anonymous") + ":" + selectedCaseKey}
              copiedId={copiedId}
              freeQuota={freeQuota}
              wallet={wallet?.wallet ?? null}
              generation={generation}
              generationError={generationError}
              generationElapsedSeconds={generationElapsedSeconds}
              generationHistory={generationHistory}
              generationStatus={generationStatus}
              isFavorite={favoriteCaseKeys.has(getCaseKey(selectedCase))}
              isPromptLoading={isSelectedPromptLoading}
              isGenerating={isGenerating}
              item={selectedCase}
              language={language}
              onCopy={copyPrompt}
              onCopyRewrite={copyRewritePrompt}
              onGenerate={() => generateSimilar()}
              onGenerateRewrite={() => generateSimilar(selectedRewritePrompt)}
              onToggleFavorite={toggleFavorite}
              onPreviewImage={setImagePreview}
              onOpenHistory={() => setIsHistoryOpen(true)}
              onOpenQuota={() => setIsQuotaModalOpen(true)}
              onResetWorkbench={resetWorkbench}
              onSaveWorkbench={saveWorkbench}
              onSaveCaseNote={saveCaseNote}
              onWorkbenchFieldChange={updateWorkbenchField}
              onWorkbenchNoteChange={updateWorkbenchNote}
              recentReuse={selectedReuseHistory}
              caseCollections={caseAssetState.collections}
              selectedCaseCollectionIds={selectedCaseCollectionIds}
              rewriteCopiedKey={rewriteCopiedKey}
              rewritePrompt={selectedRewritePrompt}
              editorStatus={editorStatus}
              savedWorkbench={selectedWorkbench}
              basePrompt={workbenchBasePrompt}
              variables={workbenchVariables}
              onBasePromptChange={updateBasePrompt}
              onVariableChange={updateVariable}
              onRestoreVariant={restoreVariant}
              onEnterWorkbench={enterCaseWorkbench}
              workbenchFields={workbenchFields}
              workbenchNote={workbenchNote}
              caseNoteDraft={caseNoteDraft}
              caseNoteUpdatedAt={selectedCaseNote?.updatedAt}
              onCaseNoteChange={updateCaseNoteDraft}
              onClearCaseNote={clearCaseNote}
              onToggleCaseCollection={toggleCaseCollection}
            />
          </aside>
        )}
      </section>

      {selectedCase && isDetailOpen && (
        <section className="case-mobile-detail-layer" aria-label="案例详情弹窗">
          <button
            aria-label="关闭案例详情"
            className="case-mobile-detail-backdrop"
            type="button"
            onClick={closeCaseDetail}
          />
          <aside className="case-mobile-detail-panel" role="dialog" aria-modal="true" aria-label={localizedCaseText(selectedCase, language).title}>
            <div className="case-mobile-detail-head">
              <div>
                <small>{language === "zh" ? "案例详情" : "Case details"}</small>
                <strong>{localizedCaseText(selectedCase, language).title}</strong>
              </div>
              <button aria-label="关闭案例详情" type="button" onClick={closeCaseDetail}>
                <X aria-hidden="true" />
              </button>
            </div>
            <CaseDetailContent
              editorScope={accountSession?.user.id ?? "anonymous"}
              key={(accountSession?.user.id ?? "anonymous") + ":" + selectedCaseKey}
              copiedId={copiedId}
              freeQuota={freeQuota}
              wallet={wallet?.wallet ?? null}
              generation={generation}
              generationError={generationError}
              generationElapsedSeconds={generationElapsedSeconds}
              generationHistory={generationHistory}
              generationStatus={generationStatus}
              isFavorite={favoriteCaseKeys.has(getCaseKey(selectedCase))}
              isPromptLoading={isSelectedPromptLoading}
              isGenerating={isGenerating}
              item={selectedCase}
              language={language}
              onCopy={copyPrompt}
              onCopyRewrite={copyRewritePrompt}
              onGenerate={() => generateSimilar()}
              onGenerateRewrite={() => generateSimilar(selectedRewritePrompt)}
              onToggleFavorite={toggleFavorite}
              onPreviewImage={setImagePreview}
              onOpenHistory={() => setIsHistoryOpen(true)}
              onOpenQuota={() => setIsQuotaModalOpen(true)}
              onResetWorkbench={resetWorkbench}
              onSaveWorkbench={saveWorkbench}
              onSaveCaseNote={saveCaseNote}
              onWorkbenchFieldChange={updateWorkbenchField}
              onWorkbenchNoteChange={updateWorkbenchNote}
              recentReuse={selectedReuseHistory}
              caseCollections={caseAssetState.collections}
              selectedCaseCollectionIds={selectedCaseCollectionIds}
              rewriteCopiedKey={rewriteCopiedKey}
              rewritePrompt={selectedRewritePrompt}
              editorStatus={editorStatus}
              savedWorkbench={selectedWorkbench}
              basePrompt={workbenchBasePrompt}
              variables={workbenchVariables}
              onBasePromptChange={updateBasePrompt}
              onVariableChange={updateVariable}
              onRestoreVariant={restoreVariant}
              onEnterWorkbench={enterCaseWorkbench}
              workbenchFields={workbenchFields}
              workbenchNote={workbenchNote}
              caseNoteDraft={caseNoteDraft}
              caseNoteUpdatedAt={selectedCaseNote?.updatedAt}
              onCaseNoteChange={updateCaseNoteDraft}
              onClearCaseNote={clearCaseNote}
              onToggleCaseCollection={toggleCaseCollection}
            />
          </aside>
          <div className="case-mobile-action-dock" aria-label="案例快捷操作">
            <button disabled={!selectedHasPrompt || isSelectedPromptLoading} type="button" onClick={() => copyPrompt(selectedCase)}>
              {copiedId === selectedCase.id ? <ClipboardCheck aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
              {copiedId === selectedCase.id ? "已复制" : "复制提示词"}
            </button>
            <button
              disabled={!selectedHasPrompt || isSelectedPromptLoading || isGenerating}
              type="button"
              onClick={() => generateSimilar()}
            >
              <WandSparkles aria-hidden="true" />
              {isSelectedPromptLoading
                ? "加载提示词"
                : isGenerating
                  ? `生成中 ${formatDuration(generationElapsedSeconds)}`
                  : freeQuota && freeQuota.remaining > 0
                    ? "生成同款（2 积分）"
                    : "生成同款"}
            </button>
          </div>
        </section>
      )}

      {isHistoryOpen && (
        <Image2HistoryModal
          history={generationHistory}
          onClose={() => setIsHistoryOpen(false)}
          onSelectHistory={selectHistory}
        />
      )}

      {selectedCase && isCollectionPickerOpen && (
        <Image2CollectionPickerModal
          collectionNameDraft={collectionNameDraft}
          collections={caseAssetState.collections}
          isFavorite={favoriteCaseKeys.has(getCaseKey(selectedCase))}
          item={selectedCase}
          onClose={() => setIsCollectionPickerOpen(false)}
          onCollectionNameChange={setCollectionNameDraft}
          onCreateCollection={createCollection}
          onToggleCollection={toggleCaseCollection}
          onToggleFavoriteOnly={toggleFavoriteOnly}
          selectedCollectionIds={selectedCaseCollectionIds}
        />
      )}

      {isQuotaModalOpen && (
        <Image2QuotaModal
          accountSession={accountSession}
          codeDraft={licenseCodeDraft}
          onClose={() => setIsQuotaModalOpen(false)}
          onCodeChange={setLicenseCodeDraft}
          onOpenLogin={() => {
            setIsQuotaModalOpen(false);
            openAccountModal();
          }}
          onSubmitCode={submitLicenseRedeem}
          quota={freeQuota}
          status={walletStatus}
          wallet={wallet?.wallet ?? null}
        />
      )}

      {imagePreview && <Image2ImagePreviewModal preview={imagePreview} onClose={() => setImagePreview(null)} />}

      {isAuthModalOpen && (
        <section className="case-auth-modal-layer" aria-label="账号中心">
          <button
            aria-label="关闭账号中心"
            className="case-auth-modal-backdrop"
            type="button"
            onClick={closeAccountModal}
          />
          <div className="case-auth-modal-panel" role="dialog" aria-modal="true" aria-labelledby="case-auth-title">
            <div className="case-auth-modal-head">
              <div className="case-auth-modal-copy">
                <small>Image2 账号</small>
                <h2 id="case-auth-title">{accountModalTitle}</h2>
                <p>{accountModalDescription}</p>
              </div>
              <button aria-label="关闭账号中心" type="button" onClick={closeAccountModal}>
                <X aria-hidden="true" />
              </button>
            </div>

            {isSupabaseAuthConfigured ? (
              accountSession ? (
                <div className={`case-account-session case-auth-session ${accountAuthStatus.tone}`}>
                  <UserRound aria-hidden="true" />
                  <span>
                    <strong>{accountSession.user.email ?? "Image2 账号"}</strong>
                    <small>{accountAuthStatus.message}</small>
                  </span>
                  <button type="button" onClick={signOutAccount} disabled={accountAuthStatus.tone === "busy"}>
                    <LogOut aria-hidden="true" />
                    退出账号
                  </button>
                </div>
              ) : (
                <>
                  <div className="case-auth-tabs" role="tablist" aria-label="账号模式切换">
                    <button
                      aria-pressed={accountAuthMode === "login"}
                      className={accountAuthMode === "login" ? "active" : ""}
                      disabled={accountAuthStatus.tone === "busy" || accountNeedsCode}
                      type="button"
                      onClick={() => switchAccountMode("login")}
                    >
                      登录
                    </button>
                    <button
                      aria-pressed={accountAuthMode === "signup"}
                      className={accountAuthMode === "signup" ? "active" : ""}
                      disabled={accountAuthStatus.tone === "busy" || accountNeedsCode}
                      type="button"
                      onClick={() => switchAccountMode("signup")}
                    >
                      注册
                    </button>
                    <button
                      aria-pressed={accountAuthMode === "recover"}
                      className={accountAuthMode === "recover" ? "active" : ""}
                      disabled={accountAuthStatus.tone === "busy" || accountNeedsCode}
                      type="button"
                      onClick={() => switchAccountMode("recover")}
                    >
                      找回密码
                    </button>
                  </div>

                  <form className="case-account-form case-auth-form" onSubmit={submitAccountAuth}>
                    <input
                      aria-label="账号邮箱"
                      autoComplete="email"
                      disabled={accountAuthStatus.tone === "busy" || accountNeedsCode}
                      placeholder="邮箱"
                      type="email"
                      value={accountEmail}
                      onChange={(event) => setAccountEmail(event.target.value)}
                    />
                    {accountNeedsCode ? (
                      <input
                        aria-label="邮箱验证码"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        placeholder="邮箱验证码"
                        value={accountOtpCode}
                        onChange={(event) => setAccountOtpCode(event.target.value.replace(/\s+/g, ""))}
                      />
                    ) : null}
                    {shouldShowAccountPassword ? (
                      <div className="case-password-field">
                        <input
                          aria-label={accountOtpMode === "recovery" ? "新密码" : "账号密码"}
                          autoComplete={accountPasswordAutocomplete}
                          placeholder={accountPasswordPlaceholder}
                          type={accountPasswordVisible ? "text" : "password"}
                          value={accountPassword}
                          onChange={(event) => setAccountPassword(event.target.value)}
                        />
                        <button
                          aria-label={accountPasswordVisible ? "隐藏密码" : "显示密码"}
                          className="case-password-toggle"
                          type="button"
                          onClick={() => setAccountPasswordVisible((value) => !value)}
                        >
                          {accountPasswordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                        </button>
                      </div>
                    ) : null}
                    <div className="case-account-actions case-auth-actions">
                      <button type="submit" disabled={accountAuthStatus.tone === "busy"}>
                        {accountAuthStatus.tone === "busy" ? (
                          <Loader2 className="spinning" aria-hidden="true" />
                        ) : accountNeedsCode ? (
                          <CheckCircle2 aria-hidden="true" />
                        ) : accountAuthMode === "recover" ? (
                          <RotateCcw aria-hidden="true" />
                        ) : (
                          <LogIn aria-hidden="true" />
                        )}
                        {accountSubmitLabel}
                      </button>
                      <button
                        type="button"
                        disabled={accountAuthStatus.tone === "busy"}
                        onClick={() => {
                          if (accountNeedsCode) {
                            void resendAccountOtp();
                            return;
                          }
                          switchAccountMode(accountAuthMode === "signup" ? "login" : "signup");
                        }}
                      >
                        {accountNeedsCode ? "重新发送验证码" : accountAuthMode === "signup" ? "去登录" : "去注册"}
                      </button>
                    </div>
                    {accountNeedsCode ? (
                      <button className="case-account-link" type="button" onClick={() => switchAccountMode(accountAuthMode)}>
                        重新填写邮箱
                      </button>
                    ) : accountAuthMode === "login" ? (
                      <button className="case-account-link" type="button" onClick={() => switchAccountMode("recover")}>
                        忘记密码
                      </button>
                    ) : accountAuthMode === "recover" ? (
                      <button className="case-account-link" type="button" onClick={() => switchAccountMode("login")}>
                        返回登录
                      </button>
                    ) : null}
                    <small>{accountAuthStatus.message}</small>
                  </form>
                </>
              )
            ) : (
              <p className="case-auth-config-note">账号登录未配置，当前继续使用本机浏览记录。</p>
            )}
          </div>
        </section>
      )}

      {Boolean(payload.sourceRadar?.length || sources.length) && (
        <section className={`case-radar-dock${isRadarOpen ? " open" : ""}`} aria-label="来源面板">
          <button
            aria-expanded={isRadarOpen}
            aria-label="来源面板"
            title="来源面板"
            className="case-radar-trigger"
            type="button"
            onClick={() => setIsRadarOpen((value) => !value)}
          >
            <Radar aria-hidden="true" />
          </button>
          <div className="case-radar-panel" hidden={!isRadarOpen}>
            <div className="case-radar-panel-head">
              <div>
                <small>隐藏信息层</small>
                <strong>来源面板</strong>
              </div>
              <button type="button" onClick={() => setIsRadarOpen(false)}>
                收起
              </button>
            </div>

            <div className="case-radar-block">
              <div className="case-radar-block-head">
                <strong>来源筛选</strong>
                <small>{activeSource?.label ?? "全部来源"}</small>
              </div>
              <div className="source-picker-list">
                <button className={sourceId === "全部" ? "active" : ""} type="button" onClick={() => setSourceId("全部")}>
                  <span>全部来源</span>
                  <b>{payload.totalCases}</b>
                </button>
                {sources.map((item) => (
                  <button
                    className={sourceId === item.id ? "active" : ""}
                    key={item.id}
                    type="button"
                    onClick={() => setSourceId(item.id)}
                  >
                    <span>{item.label}</span>
                    <b>{item.count}</b>
                  </button>
                ))}
              </div>
            </div>

            {Boolean(payload.sourceRadar?.length) && (
              <div className="case-radar-block">
                <div className="case-radar-block-head">
                  <strong>来源雷达</strong>
                  <small>{payload.sourceRadar?.length} 个候选站点</small>
                </div>
                <div className="radar-list">
                  {payload.sourceRadar?.map((item) => (
                    <a href={item.url} key={item.id} target="_blank" rel="noreferrer" title={item.note}>
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.status}</small>
                      </span>
                      <ExternalLink aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
