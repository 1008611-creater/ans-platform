"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  CopyCheck,
  Crown,
  FolderOpen,
  Gem,
  Heart,
  Images,
  Loader2,
  LogIn,
  Lock,
  PackageOpen,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  WandSparkles,
  WalletCards,
  X
} from "lucide-react";
import { localizedCaseText } from "@/lib/image2-language";
import type {
  Image2GachaCard,
  Image2GachaMode,
  Image2GachaParams,
  Image2GachaRarity,
  Image2GachaRun
} from "@/lib/image2-gacha-store";
import styles from "./image2-gacha-lab.module.css";

type PromptStructure = {
  composition: string;
  lighting: string;
  materials: string;
  style: string;
  subject: string;
  text: string;
};

type ReuseProfile = {
  difficulty: string;
  label: string;
  note: string;
  sourceConfidence: string;
  stability: string;
  verdict: string;
};

type Image2Case = {
  caseCode?: string;
  categoryLabel: string;
  detailKey?: string;
  id: number;
  imageAlt: string;
  imageUrl: string;
  prompt?: string;
  promptPreview: string;
  promptStructure?: PromptStructure;
  reuseProfile?: ReuseProfile;
  title: string;
  valueScore: number;
};

type CasePayload = {
  cases: Image2Case[];
  totalCases: number;
};

type CaseCollection = {
  caseKeys: string[];
  createdAt: string;
  id: string;
  name: string;
  updatedAt: string;
};

type CaseAssetState = {
  activeCollectionId: string | null;
  collections: CaseCollection[];
  notes: Record<string, unknown>;
};

type Image2AssetSnapshot = CaseAssetState & {
  favoriteCaseKeys?: string[];
  promptDrafts?: Record<string, unknown>;
  promptReuseHistory?: unknown[];
  updatedAt?: string;
  version?: string;
};

type Image2FreeQuota = {
  blocked: boolean;
  limit: number;
  remaining: number;
  used: number;
};

type Image2WalletSummary = {
  balance: number;
  lifetimeCredited?: number;
  lifetimeSpent?: number;
  updatedAt?: string;
};

type Image2AccountSession = {
  accessToken: string;
  user: {
    email?: string;
    id: string;
  };
};

type Image2GachaLabProps = {
  initialCaseKey?: string;
  initialMode?: Image2GachaMode;
};

type Image2GachaModeQuotaConfig = {
  drawCount: number;
  quotaCost: number;
  targetSlots: number;
};

type Image2GachaPublicConfig = {
  modes: {
    pack: Image2GachaModeQuotaConfig & {
      fullPack: boolean;
    };
    single: Image2GachaModeQuotaConfig;
  };
};

const image2DataVersion = "20260520-hide-broken-v4";
const favoriteCaseStorageKey = "image2-case-favorites:v1";
const caseAssetStorageKey = "image2-case-assets:v1";
const promptWorkbenchStorageKey = "image2-prompt-workbench:v1";
const promptReuseHistoryStorageKey = "image2-prompt-reuse-history:v1";
const accountSessionStorageKey = "image2-account-session:v1";
const workbenchAccountSessionStorageKey = "image2-workbench-team-session:v1";
const gachaLastRunStorageKey = "image2-gacha-last-run:v1";

const emptyAssetState: CaseAssetState = {
  activeCollectionId: null,
  collections: [],
  notes: {}
};

const defaultGachaConfig: Image2GachaPublicConfig = {
  modes: {
    pack: {
      drawCount: 2,
      fullPack: false,
      quotaCost: 2,
      targetSlots: 9
    },
    single: {
      drawCount: 1,
      quotaCost: 1,
      targetSlots: 1
    }
  }
};

const defaultParams: Image2GachaParams = {
  composition: "随机",
  contentDirection: "延续收藏图风格",
  lighting: "随机",
  negative: "低清晰度、脸部崩坏、手部畸形、文字乱码、过度磨皮、廉价塑料感、直接复制原图",
  palette: "随机",
  randomStrength: 55,
  realismStrength: 78,
  referenceFit: 72,
  seed: "",
  size: "1024x1536",
  styleStrength: 74,
  texture: "随机"
};

const compositionOptions = ["随机", "半身近景", "三分法主体", "低角度英雄构图", "俯视陈列", "居中海报构图", "电影横移视角"];
const lightingOptions = ["随机", "柔和棚拍光", "窗边自然光", "逆光轮廓光", "暖金主光", "冷暖对比光", "高亮商业光"];
const paletteOptions = ["随机", "奶油白 + 玫瑰红 + 墨黑", "薄荷绿 + 珍珠白 + 金色", "午夜蓝 + 珊瑚粉 + 银灰", "象牙白 + 胭脂红 + 青绿", "黑曜石 + 香槟金 + 云白"];
const textureOptions = ["随机", "细腻皮肤与织物纹理", "高级胶片颗粒", "干净商业质感", "手办级可爱抛光", "真实材质微反光", "轻奢包装质感"];

const withDataVersion = (url: string) => `${url}${url.includes("?") ? "&" : "?"}v=${image2DataVersion}`;
const getCaseKey = (item: Pick<Image2Case, "detailKey" | "id">) => item.detailKey ?? String(item.id);

function proxyRemoteImageUrl(value: string) {
  if (!value || value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return value;
    return `/api/image2/proxy?url=${encodeURIComponent(url.toString())}`;
  } catch {
    return value;
  }
}

function normalizeCaseImages(data: CasePayload): CasePayload {
  return {
    ...data,
    cases: data.cases.map((item) => ({
      ...item,
      imageUrl: proxyRemoteImageUrl(item.imageUrl)
    }))
  };
}

function readFavoriteCaseKeys() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(favoriteCaseStorageKey) || "[]");
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.filter((item): item is string => typeof item === "string" && Boolean(item.trim())));
  } catch {
    return new Set<string>();
  }
}

function normalizeCaseAssetState(value: unknown): CaseAssetState {
  try {
    const parsed = (value && typeof value === "object" ? value : {}) as Partial<CaseAssetState>;
    const collections = Array.isArray(parsed.collections)
      ? parsed.collections
          .filter((item): item is CaseCollection => {
            return Boolean(
              item &&
                typeof item.id === "string" &&
                typeof item.name === "string" &&
                Array.isArray(item.caseKeys) &&
                typeof item.createdAt === "string" &&
                typeof item.updatedAt === "string"
            );
          })
          .map((item) => ({
            ...item,
            caseKeys: [...new Set(item.caseKeys.filter((key): key is string => typeof key === "string" && Boolean(key.trim())))]
          }))
      : [];
    const activeCollectionId =
      typeof parsed.activeCollectionId === "string" && collections.some((item) => item.id === parsed.activeCollectionId)
        ? parsed.activeCollectionId
        : null;

    return {
      activeCollectionId,
      collections,
      notes: parsed.notes && typeof parsed.notes === "object" && !Array.isArray(parsed.notes) ? parsed.notes : {}
    };
  } catch {
    return emptyAssetState;
  }
}

function readCaseAssetState(): CaseAssetState {
  if (typeof window === "undefined") return emptyAssetState;
  try {
    return normalizeCaseAssetState(JSON.parse(window.localStorage.getItem(caseAssetStorageKey) || "{}"));
  } catch {
    return emptyAssetState;
  }
}

function readLocalRecord(key: string) {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function readLocalList(key: string) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeCaseAssetStates(local: CaseAssetState, cloud: CaseAssetState): CaseAssetState {
  const collectionMap = new Map<string, CaseCollection>();
  for (const collection of [...local.collections, ...cloud.collections]) {
    const existing = collectionMap.get(collection.id);
    collectionMap.set(collection.id, {
      ...collection,
      caseKeys: [...new Set([...(existing?.caseKeys ?? []), ...collection.caseKeys])]
    });
  }

  const activeCollectionId =
    local.activeCollectionId && collectionMap.has(local.activeCollectionId)
      ? local.activeCollectionId
      : cloud.activeCollectionId && collectionMap.has(cloud.activeCollectionId)
        ? cloud.activeCollectionId
        : null;

  return {
    activeCollectionId,
    collections: [...collectionMap.values()],
    notes: {
      ...cloud.notes,
      ...local.notes
    }
  };
}

function buildAssetSnapshot(input: {
  assetState: CaseAssetState;
  cloudSnapshot?: Image2AssetSnapshot | null;
  favoriteKeys: Set<string>;
}): Image2AssetSnapshot {
  const cloudState = normalizeCaseAssetState(input.cloudSnapshot);
  const mergedState = mergeCaseAssetStates(input.assetState, cloudState);
  const promptDrafts = {
    ...(input.cloudSnapshot?.promptDrafts ?? {}),
    ...readLocalRecord(promptWorkbenchStorageKey)
  };
  const historyMap = new Map<string, unknown>();

  for (const item of [...(input.cloudSnapshot?.promptReuseHistory ?? []), ...readLocalList(promptReuseHistoryStorageKey)]) {
    const id =
      item && typeof item === "object" && "id" in item && typeof (item as { id?: unknown }).id === "string"
        ? (item as { id: string }).id
        : JSON.stringify(item);
    historyMap.set(id, item);
  }

  return {
    ...mergedState,
    favoriteCaseKeys: [...new Set([...(input.cloudSnapshot?.favoriteCaseKeys ?? []), ...input.favoriteKeys])],
    promptDrafts,
    promptReuseHistory: [...historyMap.values()].slice(0, 120),
    updatedAt: new Date().toISOString(),
    version: "image2-assets-v1"
  };
}

function readAccountSession() {
  if (typeof window === "undefined") return null;
  for (const key of [accountSessionStorageKey, workbenchAccountSessionStorageKey]) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || "null") as Image2AccountSession | null;
      if (parsed?.accessToken && parsed.user?.id) return parsed;
    } catch {
      // Try the next storage key.
    }
  }
  return null;
}

function readLastRunId() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(gachaLastRunStorageKey) || "";
  } catch {
    return "";
  }
}

function rememberRun(run: Image2GachaRun | null) {
  if (typeof window === "undefined" || !run) return;
  try {
    window.localStorage.setItem(gachaLastRunStorageKey, run.runId);
  } catch {
    // Local run recovery is helpful but not required for drawing.
  }
}

async function loadCasePayload() {
  const indexResponse = await fetch(withDataVersion("/data/image2-case-library.index.js"), { cache: "no-store" });
  const response = indexResponse.ok ? indexResponse : await fetch(withDataVersion("/data/image2-case-library.json"), { cache: "no-store" });
  if (!response.ok) throw new Error("案例库加载失败。");
  return normalizeCaseImages((await response.json()) as CasePayload);
}

async function loadCaseDetail(item: Image2Case) {
  if (item.prompt?.trim()) return item;
  const response = await fetch(withDataVersion(`/data/image2-cases/${encodeURIComponent(getCaseKey(item))}.js`), { cache: "no-store" });
  if (!response.ok) return item;
  const detail = (await response.json()) as Partial<Image2Case>;
  return {
    ...item,
    ...detail,
    imageUrl: item.imageUrl
  };
}

async function requestQuota() {
  const response = await fetch("/api/image2/quota", { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  return response.ok ? (data.quota as Image2FreeQuota) : null;
}

async function requestGachaConfig() {
  const response = await fetch("/api/image2-gacha/config", { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  return response.ok && data.config ? (data.config as Image2GachaPublicConfig) : defaultGachaConfig;
}

async function requestWallet(session: Image2AccountSession | null) {
  if (!session?.accessToken) return null;
  const response = await fetch("/api/image2/balance", {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${session.accessToken}`
    }
  });
  const data = await response.json().catch(() => ({}));
  return response.ok ? (data.wallet as Image2WalletSummary) : null;
}

async function requestCloudAssets(session: Image2AccountSession | null) {
  if (!session?.user.id) return null;
  const response = await fetch(`/api/image2/assets?userId=${encodeURIComponent(session.user.id)}`, {
    cache: "no-store",
    headers: {
      "x-image2-user": session.user.id,
      ...(session.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.snapshot) return null;
  return data.snapshot as Image2AssetSnapshot;
}

async function saveCloudAssets(session: Image2AccountSession | null, snapshot: Image2AssetSnapshot) {
  if (!session?.user.id) return snapshot;
  const response = await fetch("/api/image2/assets", {
    method: "POST",
    headers: gachaRequestHeaders(session, true),
    body: JSON.stringify({ snapshot })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "收藏夹同步失败。");
  return (data.snapshot ?? snapshot) as Image2AssetSnapshot;
}

function gachaRequestHeaders(session: Image2AccountSession | null, includeJson = false): HeadersInit {
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(session?.user.id ? { "x-image2-user": session.user.id } : {}),
    ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {})
  };
}

async function requestGachaRun(runId: string, session: Image2AccountSession | null) {
  if (!runId) return null;
  const response = await fetch(`/api/image2-gacha/runs/${encodeURIComponent(runId)}`, {
    cache: "no-store",
    headers: gachaRequestHeaders(session)
  });
  const data = await response.json().catch(() => ({}));
  return response.ok ? (data.run as Image2GachaRun | null) : null;
}

async function requestLatestGachaRun(sourceCaseKey: string | undefined, session: Image2AccountSession | null) {
  const suffix = sourceCaseKey ? `&sourceCaseKey=${encodeURIComponent(sourceCaseKey)}` : "";
  const response = await fetch(`/api/image2-gacha/runs?latest=1${suffix}`, {
    cache: "no-store",
    headers: gachaRequestHeaders(session)
  });
  const data = await response.json().catch(() => ({}));
  return response.ok ? (data.run as Image2GachaRun | null) : null;
}

function formatCaseTitle(item: Image2Case) {
  const localized = localizedCaseText(item, "zh");
  return localized.title;
}

function shortCaseMeta(item: Image2Case) {
  return [item.caseCode ?? `Case ${item.id}`, item.categoryLabel, `${item.valueScore}分`].filter(Boolean).join(" · ");
}

function compactText(value: string | undefined, maxLength = 86) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function formatRunTime(value: string | undefined) {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "暂无";
  return date.toLocaleString("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  });
}

function rarityClass(rarity: Image2GachaRarity) {
  if (rarity === "SSR") return styles.ssr;
  if (rarity === "SR") return styles.sr;
  if (rarity === "R") return styles.r;
  if (rarity === "废卡") return styles.reject;
  return styles.pending;
}

function buildSourceCase(item: Image2Case) {
  return {
    caseCode: item.caseCode,
    categoryLabel: item.categoryLabel,
    id: item.id,
    imageUrl: item.imageUrl,
    key: getCaseKey(item),
    prompt: item.prompt,
    promptPreview: item.promptPreview,
    promptStructure: item.promptStructure,
    reuseProfile: item.reuseProfile,
    title: formatCaseTitle(item),
    valueScore: item.valueScore
  };
}

export function Image2GachaLab({ initialCaseKey, initialMode = "pack" }: Image2GachaLabProps) {
  const [payload, setPayload] = useState<CasePayload | null>(null);
  const [localFavoriteKeys, setLocalFavoriteKeys] = useState<Set<string>>(() => new Set());
  const [cloudFavoriteKeys, setCloudFavoriteKeys] = useState<Set<string>>(() => new Set());
  const [localAssetState, setLocalAssetState] = useState<CaseAssetState>(emptyAssetState);
  const [cloudAssetState, setCloudAssetState] = useState<CaseAssetState>(emptyAssetState);
  const [selectedCollectionId, setSelectedCollectionId] = useState("all");
  const [selectedKey, setSelectedKey] = useState(initialCaseKey || "");
  const [mode, setMode] = useState<Image2GachaMode>(initialMode);
  const [params, setParams] = useState<Image2GachaParams>(defaultParams);
  const [userGoal, setUserGoal] = useState("换成我想要的主体，但保留这张收藏图最抓眼球的质感、构图和光线。");
  const [run, setRun] = useState<Image2GachaRun | null>(null);
  const [quota, setQuota] = useState<Image2FreeQuota | null>(null);
  const [wallet, setWallet] = useState<Image2WalletSummary | null>(null);
  const [gachaConfig, setGachaConfig] = useState<Image2GachaPublicConfig>(defaultGachaConfig);
  const [accountSession, setAccountSession] = useState<Image2AccountSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [error, setError] = useState("");
  const [copiedCardId, setCopiedCardId] = useState("");
  const [savedRecipeCardId, setSavedRecipeCardId] = useState("");
  const [ssrCard, setSsrCard] = useState<Image2GachaCard | null>(null);
  const [assetSyncLabel, setAssetSyncLabel] = useState("本地收藏");
  const [isRestoringRun, setIsRestoringRun] = useState(false);

  const refreshLocalAssets = () => {
    setLocalFavoriteKeys(readFavoriteCaseKeys());
    setLocalAssetState(readCaseAssetState());
    setAccountSession(readAccountSession());
  };

  useEffect(() => {
    let ignore = false;
    refreshLocalAssets();
    setIsLoading(true);
    loadCasePayload()
      .then((data) => {
        if (!ignore) setPayload(data);
      })
      .catch((loadError) => {
        if (!ignore) setError(loadError instanceof Error ? loadError.message : "案例库加载失败。");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    window.addEventListener("storage", refreshLocalAssets);
    return () => {
      ignore = true;
      window.removeEventListener("storage", refreshLocalAssets);
    };
  }, []);

  useEffect(() => {
    void requestQuota().then(setQuota);
    void requestGachaConfig().then(setGachaConfig);
  }, []);

  useEffect(() => {
    void requestWallet(accountSession).then(setWallet);
  }, [accountSession]);

  useEffect(() => {
    let ignore = false;

    if (!accountSession?.user.id) {
      setCloudFavoriteKeys(new Set());
      setCloudAssetState(emptyAssetState);
      setAssetSyncLabel("本地收藏");
      return;
    }

    setAssetSyncLabel("正在合并云端收藏");
    requestCloudAssets(accountSession)
      .then((snapshot) => {
        if (ignore) return;
        if (!snapshot) {
          setCloudFavoriteKeys(new Set());
          setCloudAssetState(emptyAssetState);
          setAssetSyncLabel("本地收藏");
          return;
        }
        setCloudFavoriteKeys(new Set(snapshot.favoriteCaseKeys ?? []));
        setCloudAssetState(normalizeCaseAssetState(snapshot));
        setAssetSyncLabel("本地 + 云端");
      })
      .catch(() => {
        if (!ignore) {
          setCloudFavoriteKeys(new Set());
          setCloudAssetState(emptyAssetState);
          setAssetSyncLabel("本地收藏");
        }
      });

    return () => {
      ignore = true;
    };
  }, [accountSession]);

  useEffect(() => {
    let ignore = false;

    const restoreRun = async () => {
      if (!accountSession?.accessToken || !accountSession.user.id) {
        setRun(null);
        setIsRestoringRun(false);
        return;
      }
      setIsRestoringRun(true);
      try {
        const storedRun = await requestGachaRun(readLastRunId(), accountSession);
        const latestRun = storedRun ?? (await requestLatestGachaRun(initialCaseKey, accountSession));
        if (ignore || !latestRun) return;
        setRun(latestRun);
        setMode(latestRun.mode);
        setParams({ ...defaultParams, ...latestRun.params });
        setUserGoal(latestRun.userGoal || "换成我想要的主体，但保留这张收藏图最抓眼球的质感、构图和光线。");
        setSelectedKey(latestRun.sourceCase.key);
        rememberRun(latestRun);
      } finally {
        if (!ignore) setIsRestoringRun(false);
      }
    };

    void restoreRun();
    return () => {
      ignore = true;
    };
  }, [accountSession, initialCaseKey]);

  const favoriteKeys = useMemo(
    () => new Set([...localFavoriteKeys, ...cloudFavoriteKeys]),
    [cloudFavoriteKeys, localFavoriteKeys]
  );

  const assetState = useMemo(
    () => mergeCaseAssetStates(localAssetState, cloudAssetState),
    [cloudAssetState, localAssetState]
  );

  const collectionKeySets = useMemo(() => {
    const fromCollections = new Set<string>();
    for (const collection of assetState.collections) {
      for (const key of collection.caseKeys) fromCollections.add(key);
    }
    const all = new Set([...favoriteKeys, ...fromCollections]);
    return { all, fromCollections };
  }, [assetState.collections, favoriteKeys]);

  const visibleSourceCases = useMemo(() => {
    if (!payload) return [];
    const wantedKeys =
      selectedCollectionId === "favorites"
        ? favoriteKeys
        : selectedCollectionId === "all"
          ? collectionKeySets.all
          : new Set(assetState.collections.find((collection) => collection.id === selectedCollectionId)?.caseKeys ?? []);

    return payload.cases.filter((item) => wantedKeys.has(getCaseKey(item))).sort((a, b) => b.valueScore - a.valueScore || b.id - a.id);
  }, [assetState.collections, collectionKeySets.all, favoriteKeys, payload, selectedCollectionId]);

  const selectedCase = useMemo(() => {
    return visibleSourceCases.find((item) => getCaseKey(item) === selectedKey) ?? visibleSourceCases[0] ?? null;
  }, [selectedKey, visibleSourceCases]);

  const activeRun = useMemo(() => {
    if (!run || !selectedCase) return null;
    return run.sourceCase.key === getCaseKey(selectedCase) ? run : null;
  }, [run, selectedCase]);

  useEffect(() => {
    if (!visibleSourceCases.length) {
      setSelectedKey("");
      return;
    }
    const hasSelected = visibleSourceCases.some((item) => getCaseKey(item) === selectedKey);
    if (!hasSelected) {
      const preferred = initialCaseKey ? visibleSourceCases.find((item) => getCaseKey(item) === initialCaseKey) : undefined;
      setSelectedKey(getCaseKey(preferred ?? visibleSourceCases[0]));
    }
  }, [initialCaseKey, selectedKey, visibleSourceCases]);

  const selectedDna = selectedCase?.promptStructure;
  const selectedReuse = selectedCase?.reuseProfile;
  const modeQuotaConfig = gachaConfig.modes[mode];
  const packModeConfig = gachaConfig.modes.pack;
  const drawPriceLabel =
    mode === "single"
      ? `单抽消耗 ${modeQuotaConfig.quotaCost} 张图片额度`
      : packModeConfig.fullPack
        ? `九抽消耗 ${packModeConfig.quotaCost} 张图片额度`
        : `九抽预览包消耗 ${packModeConfig.quotaCost} 张图片额度`;
  const quotaLabel = quota ? `${quota.remaining}/${quota.limit}` : "读取中";
  const paidLabel = accountSession ? `${wallet?.balance ?? 0} 张` : "登录后查看";
  const targetCardCount = activeRun?.targetSlots ?? modeQuotaConfig.targetSlots;
  const resultCards = activeRun?.cards ?? Array.from({ length: targetCardCount }, () => null);
  const doneCardCount = activeRun?.cards.filter((card) => card.status === "done").length ?? 0;
  const lockedCardCount = activeRun?.cards.filter((card) => card.status === "locked").length ?? 0;
  const protectedSlotLabel = lockedCardCount ? ` · 候补方向 ${lockedCardCount} 个` : "";
  const packQuotaNote = gachaConfig.modes.pack.fullPack
    ? `九抽 = ${gachaConfig.modes.pack.quotaCost} 张图片额度`
    : `九抽预览包 = ${gachaConfig.modes.pack.quotaCost} 张图片额度`;
  const protectedCardNote = gachaConfig.modes.pack.fullPack
    ? "本轮会一次开满 9 张结果。"
    : `本轮生成 ${gachaConfig.modes.pack.drawCount} 张成图，候补方向不扣额度。`;
  const runStatusLabel =
    activeRun?.status === "done"
      ? "已完成"
      : activeRun?.status === "partial"
        ? "部分完成"
        : activeRun?.status === "failed"
          ? "有失败"
          : activeRun?.status === "drawing"
            ? "生成中"
            : "待抽";
  const isSignedIn = Boolean(accountSession?.accessToken && accountSession.user.id);
  const allSourceCount = collectionKeySets.all.size;
  const collectionCount = assetState.collections.length;
  const generatedCards = activeRun?.cards.filter((card) => card.status === "done") ?? [];
  const ssrCount = generatedCards.filter((card) => card.rarity === "SSR").length;
  const srCount = generatedCards.filter((card) => card.rarity === "SR").length;
  const rejectedCount = activeRun?.cards.filter((card) => card.status === "failed" || card.rating === "废卡").length ?? 0;
  const savedCardCount = activeRun?.cards.filter((card) => card.favorite).length ?? 0;
  const runTimeLabel = formatRunTime(activeRun?.updatedAt);
  const drawDisabled = isDrawing || !selectedCase || !isSignedIn;
  const drawButtonLabel = !isSignedIn ? "先登录账号" : isDrawing ? "正在抽卡" : mode === "single" ? "开始单抽" : "开始九抽";
  const resultIntro = activeRun
    ? `已生成 ${doneCardCount}/${activeRun.drawCount} 张，SSR ${ssrCount} 张，SR ${srCount} 张`
    : mode === "pack"
      ? `准备 ${gachaConfig.modes.pack.targetSlots} 个方向，本轮生成 ${gachaConfig.modes.pack.drawCount} 张成图`
      : "先用单抽验证这张收藏图的风格迁移效果";

  const refreshAssetsNow = () => {
    const nextSession = readAccountSession();
    setLocalFavoriteKeys(readFavoriteCaseKeys());
    setLocalAssetState(readCaseAssetState());
    setAccountSession(nextSession);
    if (!nextSession?.user.id) {
      setAssetSyncLabel("本地收藏");
      return;
    }

    setAssetSyncLabel("正在刷新收藏");
    requestCloudAssets(nextSession)
      .then((snapshot) => {
        if (!snapshot) {
          setCloudFavoriteKeys(new Set());
          setCloudAssetState(emptyAssetState);
          setAssetSyncLabel("本地收藏");
          return;
        }
        setCloudFavoriteKeys(new Set(snapshot.favoriteCaseKeys ?? []));
        setCloudAssetState(normalizeCaseAssetState(snapshot));
        setAssetSyncLabel("收藏已刷新");
      })
      .catch(() => setAssetSyncLabel("刷新失败，使用本地收藏"));
  };

  const applyPreset = (preset: "balanced" | "real" | "wild") => {
    setParams((current) => {
      if (preset === "real") {
        return {
          ...current,
          composition: "半身近景",
          lighting: "窗边自然光",
          palette: "象牙白 + 胭脂红 + 青绿",
          randomStrength: 36,
          realismStrength: 90,
          referenceFit: 82,
          styleStrength: 68,
          texture: "真实材质微反光"
        };
      }

      if (preset === "wild") {
        return {
          ...current,
          composition: "随机",
          lighting: "冷暖对比光",
          palette: "午夜蓝 + 珊瑚粉 + 银灰",
          randomStrength: 82,
          realismStrength: 72,
          referenceFit: 58,
          styleStrength: 88,
          texture: "高级胶片颗粒"
        };
      }

      return {
        ...current,
        composition: "随机",
        lighting: "随机",
        palette: "随机",
        randomStrength: 55,
        realismStrength: 78,
        referenceFit: 72,
        styleStrength: 74,
        texture: "随机"
      };
    });
  };

  const updateParam = <K extends keyof Image2GachaParams>(key: K, value: Image2GachaParams[K]) => {
    setParams((current) => ({ ...current, [key]: value }));
  };

  const syncAssetsBeforeDraw = async () => {
    if (!accountSession?.user.id) return;
    setAssetSyncLabel("正在同步收藏");
    const cloudSnapshot = await requestCloudAssets(accountSession);
    const localFavorites = readFavoriteCaseKeys();
    const localAssets = readCaseAssetState();
    const snapshot = buildAssetSnapshot({
      assetState: mergeCaseAssetStates(localAssets, cloudAssetState),
      cloudSnapshot,
      favoriteKeys: new Set([...(cloudSnapshot?.favoriteCaseKeys ?? []), ...favoriteKeys, ...localFavorites])
    });
    const saved = await saveCloudAssets(accountSession, snapshot);
    setCloudFavoriteKeys(new Set(saved.favoriteCaseKeys ?? []));
    setCloudAssetState(normalizeCaseAssetState(saved));
    setAssetSyncLabel("收藏已同步");
  };

  const startDraw = async () => {
    if (!selectedCase) return;
    if (!isSignedIn) {
      setError("请先在案例库登录账号，同步收藏夹后再抽卡。抽卡记录、评分和配方会保存到你的账号。");
      return;
    }
    setError("");
    setIsDrawing(true);
    setSsrCard(null);
    setSavedRecipeCardId("");

    try {
      await syncAssetsBeforeDraw();
      const fullCase = await loadCaseDetail(selectedCase);
      const runResponse = await fetch("/api/image2-gacha/runs", {
        method: "POST",
        headers: gachaRequestHeaders(accountSession, true),
        body: JSON.stringify({
          mode,
          params,
          sourceCase: buildSourceCase(fullCase),
          userGoal
        })
      });
      const runData = await runResponse.json().catch(() => ({}));
      if (!runResponse.ok) throw new Error(runData.error || "创建抽卡任务失败。");
      const nextRun = runData.run as Image2GachaRun;
      setRun(nextRun);
      rememberRun(nextRun);

      const drawResponse = await fetch(`/api/image2-gacha/runs/${nextRun.runId}/draw`, {
        method: "POST",
        headers: gachaRequestHeaders(accountSession, true)
      });
      const drawData = await drawResponse.json().catch(() => ({}));
      if (!drawResponse.ok) throw new Error(drawData.error || "抽卡生成失败。");
      const drawnRun = drawData.run as Image2GachaRun;
      setRun(drawnRun);
      rememberRun(drawnRun);
      if (drawData.quota) setQuota(drawData.quota);
      if (drawData.wallet) setWallet(drawData.wallet);

      const firstSsr = drawnRun.mode === "pack" ? drawnRun.cards.find((card) => card.status === "done" && card.rarity === "SSR") : null;
      if (firstSsr) setSsrCard(firstSsr);
    } catch (drawError) {
      setError(drawError instanceof Error ? drawError.message : "抽卡失败。");
      void requestQuota().then(setQuota);
      void requestWallet(accountSession).then(setWallet);
    } finally {
      setIsDrawing(false);
    }
  };

  const copyPrompt = async (card: Image2GachaCard) => {
    await navigator.clipboard.writeText(card.prompt);
    setCopiedCardId(card.cardId);
    window.setTimeout(() => setCopiedCardId(""), 1300);
  };

  const patchCard = async (cardId: string, body: Record<string, unknown>) => {
    const response = await fetch(`/api/image2-gacha/cards/${cardId}`, {
      method: "PATCH",
      headers: gachaRequestHeaders(accountSession, true),
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "保存失败。");
    setRun(data.run as Image2GachaRun);
    rememberRun(data.run as Image2GachaRun);
  };

  const saveRecipe = async (card: Image2GachaCard) => {
    if (!activeRun) return;
    const response = await fetch("/api/image2-gacha/recipes", {
      method: "POST",
      headers: gachaRequestHeaders(accountSession, true),
      body: JSON.stringify({ cardId: card.cardId, runId: activeRun.runId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "保存配方失败。");
      return;
    }
    await patchCard(card.cardId, { favorite: true, rating: card.rating || card.rarity });
    setSavedRecipeCardId(card.cardId);
  };

  const continueFromCard = (card: Image2GachaCard) => {
    setMode("single");
    setUserGoal(`基于第 ${card.slot} 张${card.rarity === "待开" ? "" : `（${card.rarity}）`}继续抽，保留它有效的构图、光线和材质，换一个新的细节变体。`);
    setRun(null);
  };

  if (isLoading) {
    return (
      <main className={styles.shell}>
        <div className={styles.loading}>
          <Loader2 aria-hidden="true" />
          <span>正在读取你的案例库收藏...</span>
        </div>
      </main>
    );
  }

  const noFavorites = !visibleSourceCases.length;

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <nav className={styles.nav} aria-label="Image2 导航">
          <a className={styles.brand} href="/image2-cases">
            <Sparkles aria-hidden="true" />
            Image2
          </a>
          <a href="/">首页</a>
          <a href="/image2-cases">案例库</a>
          <a href="/workbench">作图中控台</a>
          <a href="/admin/image2-cases">运营入口</a>
        </nav>
        <div className={styles.walletStrip} aria-label="图片额度">
          <a href="/image2-cases">
            {isSignedIn ? <ShieldCheck aria-hidden="true" /> : <LogIn aria-hidden="true" />}
            {isSignedIn ? <b>{accountSession?.user.email ?? "已登录"}</b> : <b>去登录</b>}
          </a>
          <span>
            <Gem aria-hidden="true" />
            计费标准 <b>{quotaLabel}</b>
          </span>
          <span>
            <WalletCards aria-hidden="true" />
            ANS 积分 <b>{paidLabel}</b>
          </span>
        </div>
      </header>

      <section className={styles.hero}>
        <div>
          <a className={styles.backLink} href="/image2-cases">
            <ArrowLeft aria-hidden="true" />
            返回案例库
          </a>
          <p className={styles.kicker}>
            <PackageOpen aria-hidden="true" />
            Image2 案例库同款抽卡
          </p>
          <h1>从收藏图里抽出下一张高分图</h1>
          <p>先收藏你觉得好看的案例，再用它的视觉 DNA 做单抽试手或九抽开包。</p>
          <div className={styles.heroStats} aria-label="抽卡状态">
            <span>
              <Heart aria-hidden="true" />
              可抽收藏 <b>{allSourceCount}</b>
            </span>
            <span>
              <FolderOpen aria-hidden="true" />
              收藏夹 <b>{collectionCount}</b>
            </span>
            <span>
              <Gem aria-hidden="true" />
              本次 {drawPriceLabel}
            </span>
          </div>
        </div>
        <div className={styles.modeSwitch} aria-label="抽卡模式">
          <button className={mode === "single" ? styles.activeMode : ""} type="button" onClick={() => setMode("single")}>
            <WandSparkles aria-hidden="true" />
            单抽试手
          </button>
          <button className={mode === "pack" ? styles.activeMode : ""} type="button" onClick={() => setMode("pack")}>
            <Images aria-hidden="true" />
            九抽开包
          </button>
        </div>
      </section>

      {noFavorites ? (
        <section className={styles.emptyState}>
          <Heart aria-hidden="true" />
          <h2>先在案例库收藏图片</h2>
          <p>抽卡源图只允许使用你收藏过或收进收藏夹的案例。这样抽出来的方向才是你真正喜欢的风格。</p>
          <a href="/image2-cases">
            去案例库收藏
            <ChevronRight aria-hidden="true" />
          </a>
        </section>
      ) : (
        <section className={styles.workspace}>
          <aside className={styles.sourcePanel} aria-label="收藏来源">
            <div className={styles.panelHead}>
              <span>
                <Heart aria-hidden="true" />
                收藏来源
              </span>
              <b>{visibleSourceCases.length}</b>
            </div>
            <div className={styles.sourceToolbar}>
              <p className={styles.panelSubline}>{assetSyncLabel}</p>
              <button type="button" onClick={refreshAssetsNow}>
                <RotateCcw aria-hidden="true" />
                刷新
              </button>
            </div>
            {!isSignedIn && (
              <div className={styles.signinNotice}>
                <LogIn aria-hidden="true" />
                <span>登录后会同步云端收藏，并保存抽卡记录。</span>
                <a href="/image2-cases">去登录</a>
              </div>
            )}
            <div className={styles.collectionTabs} aria-label="收藏夹筛选">
              <button className={selectedCollectionId === "all" ? styles.activeTab : ""} type="button" onClick={() => setSelectedCollectionId("all")}>
                全部收藏
              </button>
              <button className={selectedCollectionId === "favorites" ? styles.activeTab : ""} type="button" onClick={() => setSelectedCollectionId("favorites")}>
                爱心收藏
              </button>
              {assetState.collections.map((collection) => (
                <button
                  className={selectedCollectionId === collection.id ? styles.activeTab : ""}
                  key={collection.id}
                  type="button"
                  onClick={() => setSelectedCollectionId(collection.id)}
                >
                  {collection.name}
                </button>
              ))}
            </div>
            <div className={styles.sourceList}>
              {visibleSourceCases.map((item) => {
                const key = getCaseKey(item);
                const isSelected = selectedCase && getCaseKey(selectedCase) === key;
                return (
                  <button className={isSelected ? styles.selectedSource : ""} key={key} type="button" onClick={() => setSelectedKey(key)}>
                    <img alt={item.imageAlt} src={item.imageUrl} />
                    <span>
                      <strong>{formatCaseTitle(item)}</strong>
                      <small>{shortCaseMeta(item)}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={styles.drawPanel} aria-label="抽卡工作台">
            {selectedCase && (
              <div className={styles.sourceStage}>
                <div className={styles.sourceImage}>
                  <img alt={selectedCase.imageAlt} src={selectedCase.imageUrl} />
                  <span>{shortCaseMeta(selectedCase)}</span>
                </div>
                <div className={styles.sourceDna}>
                  <span className={styles.stageBadge}>
                    <Crown aria-hidden="true" />
                    已选收藏图
                  </span>
                  <h2>{formatCaseTitle(selectedCase)}</h2>
                  <div className={styles.dnaGrid}>
                    <span>
                      <b>主体</b>
                      {compactText(selectedDna?.subject || "复用主体关系")}
                    </span>
                    <span>
                      <b>风格</b>
                      {compactText(selectedDna?.style || selectedCase.promptPreview)}
                    </span>
                    <span>
                      <b>光线</b>
                      {compactText(selectedDna?.lighting || "保留源图光感")}
                    </span>
                    <span>
                      <b>材质</b>
                      {compactText(selectedDna?.materials || "提取质感")}
                    </span>
                  </div>
                  <p>{compactText(selectedReuse?.note || "抽卡会复用画面机制，不复刻第三方原图和具体资产。", 148)}</p>
                </div>
              </div>
            )}

            <div className={styles.goalRow}>
              <label>
                <span>这次想抽什么</span>
                <textarea value={userGoal} rows={3} onChange={(event) => setUserGoal(event.target.value)} />
              </label>
              <button disabled={drawDisabled} type="button" onClick={startDraw}>
                {isDrawing ? <Loader2 className={styles.spin} aria-hidden="true" /> : <PackageOpen aria-hidden="true" />}
                {drawButtonLabel}
                <small>{drawPriceLabel}</small>
              </button>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            {(isRestoringRun || activeRun) && (
              <div className={styles.runStrip} aria-label="抽卡结果状态">
                <span>
                  {isRestoringRun ? <Loader2 className={styles.spin} aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                  {isRestoringRun ? "正在恢复最近抽卡" : "最近卡包"}
                </span>
                {activeRun ? (
                  <>
                    <b>{runStatusLabel}</b>
                    <small>
                      已出 {doneCardCount}/{activeRun.drawCount} 张
                      {protectedSlotLabel}
                    </small>
                  </>
                ) : null}
              </div>
            )}

            <div className={styles.resultHeader} aria-label="结果概览">
              <div>
                <span>
                  <Trophy aria-hidden="true" />
                  本轮结果
                </span>
                <strong>{resultIntro}</strong>
              </div>
              <div className={styles.resultStats}>
                <span>
                  SSR <b>{ssrCount}</b>
                </span>
                <span>
                  SR <b>{srCount}</b>
                </span>
                <span>
                  废卡 <b>{rejectedCount}</b>
                </span>
                <span>
                  收藏 <b>{savedCardCount}</b>
                </span>
                <span>
                  更新时间 <b>{runTimeLabel}</b>
                </span>
              </div>
            </div>

            <div className={mode === "pack" ? styles.cardGrid : styles.singleGrid} aria-label="抽卡结果">
              {resultCards.map((card, index) =>
                card ? (
                  <article className={`${styles.gachaCard} ${rarityClass(card.rarity)}`} key={card.cardId}>
                    <div className={styles.cardTop}>
                      <span>#{card.slot}</span>
                      <b>{card.status === "locked" ? "候补方向" : card.rarity}</b>
                    </div>
                    <div className={styles.cardImage}>
                      {card.status === "locked" ? (
                        <Lock aria-hidden="true" />
                      ) : card.image?.dataUrl || card.image?.url ? (
                        <img alt={`第 ${card.slot} 张抽卡结果`} src={card.image.dataUrl || card.image.url} />
                      ) : card.status === "failed" ? (
                        <X aria-hidden="true" />
                      ) : (
                        <Loader2 className={styles.spin} aria-hidden="true" />
                      )}
                    </div>
                    <div className={styles.cardMeta}>
                      <strong>{card.status === "locked" ? "候补方向" : card.randomParams.composition}</strong>
                      <span>
                        {card.status === "locked"
                          ? protectedCardNote
                          : card.status === "failed"
                            ? card.error
                            : `${card.randomParams.lighting} · ${card.randomParams.texture}`}
                      </span>
                    </div>
                    {card.status !== "locked" && (
                      <div className={styles.cardActions}>
                        {(["SSR", "SR", "R", "废卡"] as Image2GachaRarity[]).map((rating) => (
                          <button
                            className={card.rating === rating ? styles.activeRating : ""}
                            key={rating}
                            type="button"
                            onClick={() => patchCard(card.cardId, { rating }).catch((saveError) => setError(saveError.message))}
                          >
                            {rating}
                          </button>
                        ))}
                        <button type="button" onClick={() => copyPrompt(card)}>
                          {copiedCardId === card.cardId ? <CopyCheck aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
                          提示词
                        </button>
                        <button
                          className={card.favorite ? styles.activeFavorite : ""}
                          disabled={card.status !== "done"}
                          type="button"
                          onClick={() => patchCard(card.cardId, { favorite: !card.favorite }).catch((saveError) => setError(saveError.message))}
                        >
                          <Star aria-hidden="true" />
                          {card.favorite ? "已收藏" : "收藏"}
                        </button>
                        <button type="button" onClick={() => continueFromCard(card)}>
                          <RotateCcw aria-hidden="true" />
                          续抽
                        </button>
                        <button disabled={card.status !== "done"} type="button" onClick={() => saveRecipe(card)}>
                          {savedRecipeCardId === card.cardId ? <CheckCircle2 aria-hidden="true" /> : <Save aria-hidden="true" />}
                          配方
                        </button>
                      </div>
                    )}
                  </article>
                ) : (
                  <article className={styles.gachaCard} key={`placeholder-${index + 1}`}>
                    <div className={styles.cardTop}>
                      <span>#{index + 1}</span>
                      <b>待抽</b>
                    </div>
                    <div className={styles.cardImage}>
                      <PackageOpen aria-hidden="true" />
                    </div>
                    <div className={styles.cardMeta}>
                      <strong>准备卡位</strong>
                      <span>
                        {mode === "pack"
                          ? `九抽会准备 ${gachaConfig.modes.pack.targetSlots} 个变体方向，本轮生成 ${gachaConfig.modes.pack.drawCount} 张成图`
                          : "单抽会生成 1 张图"}
                      </span>
                    </div>
                  </article>
                )
              )}
            </div>
          </section>

          <aside className={styles.paramPanel} aria-label="创作参数">
            <div className={styles.panelHead}>
              <span>
                <WandSparkles aria-hidden="true" />
                创作参数
              </span>
              <b>{mode === "pack" ? `${gachaConfig.modes.pack.targetSlots}卡位` : "1卡位"}</b>
            </div>

            <div className={styles.presetGrid} aria-label="快速参数预设">
              <button type="button" onClick={() => applyPreset("balanced")}>
                <Sparkles aria-hidden="true" />
                平衡出片
              </button>
              <button type="button" onClick={() => applyPreset("real")}>
                <ShieldCheck aria-hidden="true" />
                真实质感
              </button>
              <button type="button" onClick={() => applyPreset("wild")}>
                <WandSparkles aria-hidden="true" />
                风格探索
              </button>
            </div>

            <label>
              <span>内容方向</span>
              <input value={params.contentDirection} onChange={(event) => updateParam("contentDirection", event.target.value)} />
            </label>

            <div className={styles.selectGrid}>
              <label>
                <span>构图</span>
                <select value={params.composition} onChange={(event) => updateParam("composition", event.target.value)}>
                  {compositionOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>光线</span>
                <select value={params.lighting} onChange={(event) => updateParam("lighting", event.target.value)}>
                  {lightingOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>色彩</span>
                <select value={params.palette} onChange={(event) => updateParam("palette", event.target.value)}>
                  {paletteOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>质感</span>
                <select value={params.texture} onChange={(event) => updateParam("texture", event.target.value)}>
                  {textureOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.sliderStack}>
              {[
                ["styleStrength", "风格强度"],
                ["realismStrength", "真实感"],
                ["referenceFit", "参考贴合"],
                ["randomStrength", "随机性"]
              ].map(([key, label]) => (
                <label key={key}>
                  <span>
                    {label}
                    <b>{params[key as keyof Image2GachaParams]}</b>
                  </span>
                  <input
                    max={100}
                    min={0}
                    type="range"
                    value={Number(params[key as keyof Image2GachaParams])}
                    onChange={(event) => updateParam(key as keyof Image2GachaParams, Number(event.target.value) as never)}
                  />
                </label>
              ))}
            </div>

            <details className={styles.advanced}>
              <summary>技术参数</summary>
              <label>
                <span>尺寸</span>
                <select value={params.size} onChange={(event) => updateParam("size", event.target.value)}>
                  <option>1024x1536</option>
                  <option>1024x1024</option>
                  <option>1536x1024</option>
                </select>
              </label>
              <label>
                <span>Seed</span>
                <input placeholder="留空则随机" value={params.seed} onChange={(event) => updateParam("seed", event.target.value)} />
              </label>
              <label>
                <span>负面约束</span>
                <textarea rows={3} value={params.negative} onChange={(event) => updateParam("negative", event.target.value)} />
              </label>
            </details>

            <div className={styles.quotaCard}>
              <strong>额度规则</strong>
              <span>单抽 = {gachaConfig.modes.single.quotaCost} ANS 积分（1 张图）</span>
              <span>{packQuotaNote}</span>
              <small>
                {gachaConfig.modes.pack.fullPack
                  ? "九抽会一次开满 9 张结果。"
                  : "九宫格用于筛方向，候补方向不会扣额度。"}
              </small>
            </div>
          </aside>
        </section>
      )}

      {ssrCard && (
        <section className={styles.ssrOverlay} aria-label="SSR 命中">
          <button aria-label="关闭 SSR 动效" type="button" onClick={() => setSsrCard(null)} />
          <div>
            <Crown aria-hidden="true" />
            <span>SSR</span>
            <h2>抽到高分卡</h2>
            <p>第 {ssrCard.slot} 张可以保存成配方，再从它继续单抽压质量。</p>
            <button type="button" onClick={() => setSsrCard(null)}>
              收下
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
