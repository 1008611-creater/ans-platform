import { normalizePromptVersions } from "@/lib/image2-prompt-engine";
import crypto from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  DURATION_OPTIONS,
  RATIO_OPTIONS,
  VIDEO_MODES,
  type AdminQueueResponse,
  type DailyUsage,
  type DashboardResponse,
  type Entitlement,
  type Image2AssetChangeActor,
  type Image2AssetChangeAction,
  type Image2AssetChangeLog,
  type Image2AssetGachaState,
  type Image2AssetSnapshotSummary,
  type Generation,
  type Image2AssetSnapshot,
  type Image2CaseCollection,
  type Image2CaseNote,
  type Image2PromptReuseHistoryItem,
  type Image2PromptWorkbenchDraft,
  type Image2UserAssets,
  type LicenseCode,
  type QuotaSummary,
  type UserProfile
} from "./types";
import { configuredVideoProvider, retrieveSeedanceTask } from "./provider";
import {
  isSeedanceSupabaseStoreEnabled,
  readSeedanceSupabaseStore,
  writeSeedanceSupabaseStore
} from "./seedance-supabase-store";
import { addDaysIso, nextShanghaiMidnightIso, nowIso, shanghaiDateKey } from "./time";
import { toUserFacingError } from "./user-facing-error";

export type StoreState = {
  users: UserProfile[];
  licenseCodes: LicenseCode[];
  entitlements: Entitlement[];
  dailyUsage: DailyUsage[];
  generations: Generation[];
  image2Assets: Image2UserAssets[];
  image2AssetChanges: Image2AssetChangeLog[];
};

const demoCodes = ["WEEK-SEED-2026", "VIP-720P-7D", "FREEWEEK"];
const fallbackStore: { state?: StoreState } = {};

function storeFilePath() {
  if (process.env.SEEDANCE_STORE_FILE?.trim()) {
    return path.resolve(process.env.SEEDANCE_STORE_FILE.trim());
  }

  if (process.env.VERCEL) {
    return path.join("/tmp", "seedance-store.json");
  }

  return path.join(process.cwd(), ".data", "seedance-store.json");
}

export function codeHash(code: string) {
  return crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function providerMode() {
  return configuredVideoProvider();
}

function createDefaultStore(): StoreState {
  const now = nowIso();
  return {
    users: [],
    entitlements: [],
    dailyUsage: [],
    generations: [],
    image2Assets: [],
    image2AssetChanges: [],
    licenseCodes: demoCodes.map((code, index) => ({
      id: randomId("code"),
      codeHash: codeHash(code),
      plan: "weekly_free",
      maxRedemptions: index === 0 ? 500 : 50,
      redeemedBy: [],
      createdAt: now
    }))
  };
}

async function readStore(): Promise<StoreState> {
  if (isSeedanceSupabaseStoreEnabled()) {
    const state = await readSeedanceSupabaseStore();
    normalizeStoreShape(state);
    fallbackStore.state = state;
    return structuredClone(state);
  }

  const file = storeFilePath();
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as StoreState;
    normalizeStoreShape(parsed);
    fallbackStore.state = parsed;
    return structuredClone(parsed);
  } catch {
    if (fallbackStore.state) return structuredClone(fallbackStore.state);

    const state = createDefaultStore();
    fallbackStore.state = state;
    await writeStore(state);
    return structuredClone(state);
  }
}

async function writeStore(state: StoreState) {
  fallbackStore.state = structuredClone(state);
  if (isSeedanceSupabaseStoreEnabled()) {
    await writeSeedanceSupabaseStore(state);
    return;
  }

  const file = storeFilePath();
  try {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // Vercel functions can fall back to process memory when the filesystem is not durable.
  }
}

export async function mutateStore<T>(mutator: (state: StoreState) => T | Promise<T>) {
  const state = await readStore();
  normalizeStoreShape(state);
  const result = await mutator(state);
  await writeStore(state);
  return result;
}

export async function getDashboard(userId: string): Promise<DashboardResponse> {
  return mutateStore(async (state) => {
    normalizeLegacyGenerations(state);
    const user = ensureUser(state, userId);
    if (!activeEntitlement(state, user.id)) {
      activateWeeklyEntitlement(state, user.id);
    }
    const pendingJobs = state.generations.filter(
      (item) => item.userId === user.id && item.provider === "seedance" && item.providerTaskId && (item.status === "queued" || item.status === "running")
    );
    for (const job of pendingJobs) {
      try {
        const remote = await retrieveSeedanceTask(job.providerTaskId!);
        job.status = remote.status;
        if (remote.videoUrl) job.videoUrl = remote.videoUrl;
        if (remote.lastFrameUrl) job.lastFrameUrl = remote.lastFrameUrl;
        if (remote.errorMessage) job.errorMessage = remote.errorMessage;
        job.progress = remote.status === "succeeded" || remote.status === "failed" || remote.status === "expired" ? 100 : Math.min(95, (job.progress || 10) + 15);
        job.updatedAt = nowIso();
        if (remote.status === "succeeded") job.completedAt = job.updatedAt;
        if (remote.status === "failed" || remote.status === "expired") refundQuota(state, job);
      } catch {
        // ignore transient poll errors
      }
    }
    return dashboardForUser(state, user.id);
  });
}

export function ensureUser(state: StoreState, userId: string) {
  const id = userId || randomId("user");
  let user = state.users.find((item) => item.id === id);
  if (!user) {
    user = {
      id,
      displayName: `创作者_${id.slice(-4).toUpperCase()}`,
      createdAt: nowIso()
    };
    state.users.push(user);
  }
  return user;
}

function normalizeStoreShape(state: StoreState) {
  state.users ||= [];
  state.licenseCodes ||= [];
  state.entitlements ||= [];
  state.dailyUsage ||= [];
  state.generations ||= [];
  state.image2Assets ||= [];
  state.image2AssetChanges = normalizeImage2AssetChanges(state.image2AssetChanges);
}

export function updateUser(state: StoreState, userId: string, patch: Partial<UserProfile>) {
  const user = ensureUser(state, userId);
  user.displayName = patch.displayName?.trim() || user.displayName;
  user.email = patch.email?.trim() || user.email;
  return user;
}

export function activeEntitlement(state: StoreState, userId: string) {
  const now = Date.now();
  return state.entitlements
    .filter((item) => item.userId === userId && new Date(item.endsAt).getTime() > now)
    .sort((a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime())[0];
}

export function activateWeeklyEntitlement(state: StoreState, userId: string) {
  const now = nowIso();
  const entitlement: Entitlement = {
    id: randomId("ent"),
    userId,
    plan: "weekly_free",
    startsAt: now,
    endsAt: addDaysIso(now, 7),
    dailyLimit: 2,
    resolution: "720p",
    maxDurationSeconds: 15,
    createdAt: now
  };
  state.entitlements.push(entitlement);
  ensureUsage(state, userId, entitlement.dailyLimit);
  return entitlement;
}

export function redeemCode(state: StoreState, userId: string, code: string) {
  const normalizedHash = codeHash(code);
  const license = state.licenseCodes.find((item) => item.codeHash === normalizedHash);
  if (!license) throw new Error("卡密无效。");
  if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
    throw new Error("卡密已过期。");
  }
  if (license.redeemedBy.includes(userId)) {
    throw new Error("这个账号已经兑换过该卡密。");
  }
  if (license.redeemedBy.length >= license.maxRedemptions) {
    throw new Error("卡密已被兑换完。");
  }

  license.redeemedBy.push(userId);
  return activateWeeklyEntitlement(state, userId);
}

export function claimTrial(state: StoreState, userId: string) {
  const user = ensureUser(state, userId);
  if (user.claimedTrialAt) {
    throw new Error("这个账号已经领取过免费周卡。");
  }
  user.claimedTrialAt = nowIso();
  return activateWeeklyEntitlement(state, userId);
}

export function ensureUsage(state: StoreState, userId: string, limit = 2) {
  const usageDate = shanghaiDateKey();
  let usage = state.dailyUsage.find((item) => item.userId === userId && item.usageDate === usageDate);
  if (!usage) {
    usage = {
      id: randomId("usage"),
      userId,
      usageDate,
      usedCount: 0,
      limitCount: limit,
      updatedAt: nowIso()
    };
    state.dailyUsage.push(usage);
  }
  usage.limitCount = limit;
  return usage;
}

export function consumeQuota(state: StoreState, userId: string) {
  const entitlement = activeEntitlement(state, userId);
  if (!entitlement) throw new Error("周卡未生效，请先领取或兑换卡密。");

  const usage = ensureUsage(state, userId, entitlement.dailyLimit);
  if (usage.usedCount >= usage.limitCount) {
    throw new Error("今日额度已用完，明天 00:00 自动重置。");
  }

  usage.usedCount += 1;
  usage.updatedAt = nowIso();
  return { entitlement, usage };
}

export function refundQuota(state: StoreState, generation: Generation) {
  if (generation.refundedAt) return;
  const usage = state.dailyUsage.find(
    (item) => item.userId === generation.userId && item.usageDate === shanghaiDateKey(new Date(generation.createdAt))
  );
  if (usage) {
    usage.usedCount = Math.max(0, usage.usedCount - 1);
    usage.updatedAt = nowIso();
  }
  generation.refundedAt = nowIso();
}

export function dashboardForUser(state: StoreState, userId: string): DashboardResponse {
  const user = ensureUser(state, userId);
  const entitlement = activeEntitlement(state, userId);
  const quota = quotaForUser(state, userId, entitlement);
  const ownGenerations = state.generations
    .filter((item) => item.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    user,
    entitlement,
    quota,
    jobs: ownGenerations.filter((item) => item.status !== "succeeded").slice(0, 8),
    gallery: ownGenerations.filter((item) => item.status === "succeeded").slice(0, 12),
    providerMode: providerMode(),
    ratios: RATIO_OPTIONS,
    durations: DURATION_OPTIONS,
    modes: VIDEO_MODES
  };
}

function cleanString(value: unknown, fallback = "", maxLength = 4000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
}

function cleanIso(value: unknown, fallback = nowIso()) {
  if (typeof value !== "string") return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function cleanKeys(value: unknown, limit = 1200) {
  if (!Array.isArray(value)) return [] as string[];
  return [...new Set(value.map((item) => cleanString(item, "", 160)).filter(Boolean))].slice(0, limit);
}

function cleanObjectArray(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [] as unknown[];
  return value
    .filter((item) => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    .slice(0, limit);
}

function cleanRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeImage2AssetGachaState(value: unknown): Image2AssetGachaState | undefined {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  if (!record) return undefined;

  const runs = cleanObjectArray(record.runs, 60);
  const recipes = cleanObjectArray(record.recipes, 120);
  if (!runs.length && !recipes.length && record.version !== 1) return undefined;

  return {
    version: 1,
    runs,
    recipes,
    updatedAt: cleanIso(record.updatedAt)
  };
}

export function summarizeImage2AssetSnapshot(snapshot: Image2AssetSnapshot): Image2AssetSnapshotSummary {
  return {
    favoriteCaseKeys: snapshot.favoriteCaseKeys.length,
    collections: snapshot.collections.length,
    collectionCaseKeys: snapshot.collections.reduce((total, collection) => total + collection.caseKeys.length, 0),
    notes: Object.keys(snapshot.notes).length,
    promptDrafts: Object.keys(snapshot.promptDrafts).length,
    promptReuseHistory: snapshot.promptReuseHistory.length,
    gachaRuns: snapshot.gachaState?.runs.length ?? 0,
    gachaRecipes: snapshot.gachaState?.recipes.length ?? 0
  };
}

function normalizeImage2AssetActor(value: unknown): Image2AssetChangeActor {
  const record = cleanRecord(value);
  const type = record.type === "admin" || record.type === "system" ? record.type : "user";
  return {
    type,
    id: cleanString(record.id, "", 180) || undefined,
    email: cleanString(record.email, "", 240) || undefined
  };
}

function normalizeImage2AssetChangeAction(value: unknown): Image2AssetChangeAction {
  return value === "admin_undo_asset_snapshot" ? "admin_undo_asset_snapshot" : "asset_snapshot_save";
}

function normalizeImage2AssetChange(value: unknown): Image2AssetChangeLog | null {
  const record = cleanRecord(value);
  const id = cleanString(record.id, "", 180);
  const userId = cleanString(record.userId ?? record.user_id, "", 180);
  if (!id || !userId) return null;

  const beforeSnapshot = normalizeImage2AssetSnapshot(record.beforeSnapshot ?? record.before_snapshot);
  const afterSnapshot = normalizeImage2AssetSnapshot(record.afterSnapshot ?? record.after_snapshot);
  return {
    id,
    userId,
    action: normalizeImage2AssetChangeAction(record.action),
    source: cleanString(record.source, "image2-assets", 120),
    reason: cleanString(record.reason, "", 600),
    actor: normalizeImage2AssetActor(record.actor),
    beforeSnapshot,
    afterSnapshot,
    summary: {
      before: summarizeImage2AssetSnapshot(beforeSnapshot),
      after: summarizeImage2AssetSnapshot(afterSnapshot)
    },
    createdAt: cleanIso(record.createdAt ?? record.created_at),
    undoneAt: record.undoneAt || record.undone_at ? cleanIso(record.undoneAt ?? record.undone_at) : undefined,
    undoneBy: cleanString(record.undoneBy ?? record.undone_by, "", 180) || undefined,
    undoChangeId: cleanString(record.undoChangeId ?? record.undo_change_id, "", 180) || undefined
  };
}

function normalizeImage2AssetChanges(value: unknown): Image2AssetChangeLog[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeImage2AssetChange)
    .filter((item): item is Image2AssetChangeLog => Boolean(item))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 500);
}

function emptyImage2AssetSnapshot(updatedAt = nowIso()): Image2AssetSnapshot {
  return {
    version: "image2-assets-v1",
    favoriteCaseKeys: [],
    activeCollectionId: null,
    collections: [],
    notes: {},
    promptDrafts: {},
    promptReuseHistory: [],
    updatedAt
  };
}

function normalizePromptFields(value: unknown): Image2PromptWorkbenchDraft["fields"] {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    subject: cleanString(record.subject, "", 1200),
    style: cleanString(record.style, "", 1200),
    composition: cleanString(record.composition, "", 1200),
    lighting: cleanString(record.lighting, "", 1200),
    materials: cleanString(record.materials, "", 1200),
    text: cleanString(record.text, "", 1200)
  };
}

export function normalizeImage2AssetSnapshot(value: unknown): Image2AssetSnapshot {
  const now = nowIso();
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const collections = Array.isArray(record.collections)
    ? record.collections
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
        .map((item): Image2CaseCollection => {
          const createdAt = cleanIso(item.createdAt, now);
          return {
            id: cleanString(item.id, randomId("collection"), 120),
            name: cleanString(item.name, "未命名项目夹", 80) || "未命名项目夹",
            caseKeys: cleanKeys(item.caseKeys, 600),
            createdAt,
            updatedAt: cleanIso(item.updatedAt, createdAt)
          };
        })
        .slice(0, 80)
    : [];

  const notes =
    record.notes && typeof record.notes === "object" && !Array.isArray(record.notes)
      ? Object.fromEntries(
          Object.entries(record.notes as Record<string, unknown>)
            .filter((entry): entry is [string, Record<string, unknown>] => Boolean(entry[1] && typeof entry[1] === "object"))
            .map(([key, item]) => {
              const caseKey = cleanString(item.caseKey, cleanString(key, "", 160), 160);
              const note: Image2CaseNote = {
                caseKey,
                note: cleanString(item.note, "", 6000),
                updatedAt: cleanIso(item.updatedAt, now)
              };
              return [caseKey, note] as const;
            })
            .filter(([key, item]) => Boolean(key && item.note))
            .slice(0, 1200)
        )
      : {};

  const promptDrafts =
    record.promptDrafts && typeof record.promptDrafts === "object" && !Array.isArray(record.promptDrafts)
      ? Object.fromEntries(
          Object.entries(record.promptDrafts as Record<string, unknown>)
            .filter((entry): entry is [string, Record<string, unknown>] => Boolean(entry[0] && entry[1] && typeof entry[1] === "object"))
            .map(([key, item]) => {
              const draft: Image2PromptWorkbenchDraft = {
                versions: normalizePromptVersions(item.versions),
                caseTitle: cleanString(item.caseTitle, "未命名案例", 240),
                fields: normalizePromptFields(item.fields),
                note: cleanString(item.note, "", 3000),
                prompt: cleanString(item.prompt, "", 100000),
                basePrompt: typeof item.basePrompt === "string" ? item.basePrompt.slice(0, 100000) : undefined,
                variables: item.variables && typeof item.variables === "object" && !Array.isArray(item.variables) ? Object.fromEntries(Object.entries(item.variables).filter(([key, value]) => key.length <= 3000 && typeof value === "string").slice(0, 100).map(([key, value]) => [key, String(value).slice(0, 12000)])) : undefined,
                updatedAt: cleanIso(item.updatedAt, now)
              };
              return [cleanString(key, "", 160), draft] as const;
            })
            .filter(([key, item]) => Boolean(key && item.prompt))
            .slice(0, 1200)
        )
      : {};

  const promptReuseHistory = Array.isArray(record.promptReuseHistory)
    ? record.promptReuseHistory
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
        .map((item): Image2PromptReuseHistoryItem => ({
          action: item.action === "generated" || item.action === "saved" ? item.action : "copied",
          caseKey: cleanString(item.caseKey, "", 160),
          caseTitle: cleanString(item.caseTitle, "未命名案例", 240),
          createdAt: cleanIso(item.createdAt, now),
          id: cleanString(item.id, randomId("reuse"), 180),
          prompt: cleanString(item.prompt, "", 100000)
        }))
        .filter((item) => Boolean(item.caseKey && item.prompt))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 120)
    : [];

  const activeCollectionId = cleanString(record.activeCollectionId, "", 120);
  const gachaState = normalizeImage2AssetGachaState(record.gachaState);

  return {
    version: "image2-assets-v1",
    favoriteCaseKeys: cleanKeys(record.favoriteCaseKeys, 1200),
    activeCollectionId: collections.some((item) => item.id === activeCollectionId) ? activeCollectionId : null,
    collections,
    ...(gachaState ? { gachaState } : {}),
    notes,
    promptDrafts,
    promptReuseHistory,
    updatedAt: cleanIso(record.updatedAt, now)
  };
}

export function getImage2AssetsForUser(state: StoreState, userId: string) {
  normalizeStoreShape(state);
  const user = ensureUser(state, userId);
  const existing = state.image2Assets.find((item) => item.userId === user.id);
  return (
    existing ?? {
      id: randomId("image2_assets"),
      userId: user.id,
      snapshot: emptyImage2AssetSnapshot(),
      createdAt: nowIso(),
      updatedAt: nowIso()
    }
  );
}

type SaveImage2AssetsOptions = {
  action?: Image2AssetChangeAction;
  actor?: Image2AssetChangeActor;
  mergeExistingGachaState?: boolean;
  preserveUpdatedAt?: boolean;
  reason?: string;
  recordChange?: boolean;
  source?: string;
};

function appendImage2AssetChange(
  state: StoreState,
  input: {
    action: Image2AssetChangeAction;
    actor: Image2AssetChangeActor;
    afterSnapshot: Image2AssetSnapshot;
    beforeSnapshot: Image2AssetSnapshot;
    reason?: string;
    source?: string;
    undoChangeId?: string;
    userId: string;
  }
) {
  const now = nowIso();
  const change: Image2AssetChangeLog = {
    id: randomId("image2_asset_change"),
    userId: input.userId,
    action: input.action,
    source: cleanString(input.source, "image2-assets", 120),
    reason: cleanString(input.reason, "", 600),
    actor: input.actor,
    beforeSnapshot: normalizeImage2AssetSnapshot(input.beforeSnapshot),
    afterSnapshot: normalizeImage2AssetSnapshot(input.afterSnapshot),
    summary: {
      before: summarizeImage2AssetSnapshot(normalizeImage2AssetSnapshot(input.beforeSnapshot)),
      after: summarizeImage2AssetSnapshot(normalizeImage2AssetSnapshot(input.afterSnapshot))
    },
    createdAt: now,
    undoChangeId: input.undoChangeId
  };
  state.image2AssetChanges.unshift(change);
  state.image2AssetChanges = normalizeImage2AssetChanges(state.image2AssetChanges);
  return change;
}

export function listImage2AssetChanges(state: StoreState, limit = 30) {
  normalizeStoreShape(state);
  const size = Math.min(Math.max(Number.isFinite(limit) ? Math.floor(limit) : 30, 1), 100);
  return state.image2AssetChanges
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, size);
}

export function saveImage2AssetsForUser(state: StoreState, userId: string, value: unknown, options: SaveImage2AssetsOptions = {}) {
  normalizeStoreShape(state);
  const user = ensureUser(state, userId);
  const snapshot = normalizeImage2AssetSnapshot(value);
  if (!options.preserveUpdatedAt) snapshot.updatedAt = nowIso();
  let assets = state.image2Assets.find((item) => item.userId === user.id);
  const beforeSnapshot = assets ? normalizeImage2AssetSnapshot(assets.snapshot) : emptyImage2AssetSnapshot(snapshot.updatedAt);
  const previousGachaState = assets ? normalizeImage2AssetSnapshot(assets.snapshot).gachaState : undefined;
  if (options.mergeExistingGachaState !== false && !snapshot.gachaState && previousGachaState) snapshot.gachaState = previousGachaState;

  if (!assets) {
    assets = {
      id: randomId("image2_assets"),
      userId: user.id,
      snapshot,
      createdAt: snapshot.updatedAt,
      updatedAt: snapshot.updatedAt
    };
    state.image2Assets.push(assets);
  } else {
    assets.snapshot = snapshot;
    assets.updatedAt = snapshot.updatedAt;
  }

  if (options.recordChange !== false) {
    appendImage2AssetChange(state, {
      action: options.action ?? "asset_snapshot_save",
      actor: options.actor ?? { type: "user", id: user.id },
      beforeSnapshot,
      afterSnapshot: snapshot,
      reason: options.reason,
      source: options.source ?? "image2-cases",
      userId: user.id
    });
  }

  return assets;
}

export function undoImage2AssetChange(state: StoreState, changeId: string, adminId = "admin") {
  normalizeStoreShape(state);
  const id = cleanString(changeId, "", 180);
  const changeIndex = state.image2AssetChanges.findIndex((item) => item.id === id);
  const change = changeIndex >= 0 ? state.image2AssetChanges[changeIndex] : undefined;
  if (!change) throw new Error("变更记录不存在。");
  if (change.undoneAt) throw new Error("这条变更已经撤销过。");
  if (change.action === "admin_undo_asset_snapshot") throw new Error("撤销记录不能再次撤销。");

  const beforeSnapshot = normalizeImage2AssetSnapshot(change.afterSnapshot);
  const restoreSnapshot = normalizeImage2AssetSnapshot(change.beforeSnapshot);
  const assets = saveImage2AssetsForUser(state, change.userId, restoreSnapshot, {
    action: "admin_undo_asset_snapshot",
    actor: { type: "admin", id: adminId },
    mergeExistingGachaState: false,
    preserveUpdatedAt: true,
    reason: `撤销变更 ${change.id}`,
    source: "admin/image2-cases",
    recordChange: false
  });
  const undoChange = appendImage2AssetChange(state, {
    action: "admin_undo_asset_snapshot",
    actor: { type: "admin", id: adminId },
    beforeSnapshot,
    afterSnapshot: assets.snapshot,
    reason: `撤销变更 ${change.id}`,
    source: "admin/image2-cases",
    undoChangeId: change.id,
    userId: change.userId
  });
  const currentChangeIndex = state.image2AssetChanges.findIndex((item) => item.id === change.id);
  if (currentChangeIndex >= 0) state.image2AssetChanges[currentChangeIndex] = {
    ...change,
    undoneAt: undoChange.createdAt,
    undoneBy: adminId,
    undoChangeId: undoChange.id
  };
  state.image2AssetChanges = normalizeImage2AssetChanges(state.image2AssetChanges);
  return {
    assets,
    change: state.image2AssetChanges.find((item) => item.id === id) ?? change,
    undoChange
  };
}

export function adminQueue(state: StoreState): AdminQueueResponse {
  normalizeLegacyGenerations(state);
  const jobs = state.generations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return {
    jobs,
    totals: {
      queued: jobs.filter((item) => item.status === "queued").length,
      running: jobs.filter((item) => item.status === "running").length,
      succeeded: jobs.filter((item) => item.status === "succeeded").length,
      failed: jobs.filter((item) => item.status === "failed").length,
      expired: jobs.filter((item) => item.status === "expired").length
    },
    providerMode: providerMode()
  };
}

export function updateManualGeneration(
  state: StoreState,
  id: string,
  patch: Partial<Pick<
    Generation,
    | "status"
    | "progress"
    | "videoUrl"
    | "coverUrl"
    | "operatorName"
    | "externalAccount"
    | "sourceTaskUrl"
    | "operatorNote"
    | "userMessage"
    | "errorMessage"
  >>
) {
  const generation = state.generations.find((item) => item.id === id);
  if (!generation) throw new Error("任务不存在。");

  const previousStatus = generation.status;
  const nextVideoUrl = patch.videoUrl?.trim() || generation.videoUrl;
  generation.status = patch.status ?? generation.status;
  generation.progress = patch.progress ?? generation.progress;
  generation.videoUrl = nextVideoUrl;
  generation.coverUrl = patch.coverUrl?.trim() || generation.coverUrl;
  generation.operatorName = patch.operatorName?.trim() || generation.operatorName;
  generation.externalAccount = patch.externalAccount?.trim() || generation.externalAccount;
  generation.sourceTaskUrl = patch.sourceTaskUrl?.trim() || generation.sourceTaskUrl;
  generation.operatorNote = patch.operatorNote?.trim() || generation.operatorNote;
  generation.userMessage = patch.userMessage?.trim() || generation.userMessage;
  generation.errorMessage = patch.errorMessage
    ? toUserFacingError(patch.errorMessage, "任务处理失败。")
    : generation.errorMessage;
  generation.updatedAt = nowIso();

  if (generation.status === "running") {
    generation.progress = Math.max(generation.progress, 18);
    generation.userMessage ||= "制作中，管理员已接手。";
  }

  if (generation.status === "succeeded") {
    if (!generation.videoUrl) throw new Error("发布成片前需要填写视频链接。");
    if (!isPublicHttpUrl(generation.videoUrl)) throw new Error("成片链接必须是 http(s) 可打开地址。");
    generation.progress = 100;
    generation.completedAt = generation.updatedAt;
    generation.errorMessage = undefined;
  }

  if ((generation.status === "failed" || generation.status === "expired") && previousStatus !== generation.status) {
    generation.progress = 100;
    if (generation.errorMessage) {
      const hasRefundNote = /退额|退回|已退/i.test(generation.errorMessage);
      if (!hasRefundNote) {
        generation.errorMessage = `${generation.errorMessage}；今日额度已退回。`;
      }
    } else {
      generation.errorMessage = "任务处理失败，今日额度已退回。";
    }
    if (!generation.userMessage) {
      generation.userMessage = "任务失败，今日额度已退回。";
    } else if (!/退额|退回|已退/i.test(generation.userMessage)) {
      generation.userMessage = `${generation.userMessage}；今日额度已退回。`;
    }
    refundQuota(state, generation);
  }

  return generation;
}

function isPublicHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function quotaForUser(state: StoreState, userId: string, entitlement?: Entitlement): QuotaSummary {
  const limit = entitlement?.dailyLimit ?? 0;
  const usage = entitlement ? ensureUsage(state, userId, limit) : undefined;
  const used = usage?.usedCount ?? 0;
  return {
    active: Boolean(entitlement),
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetAt: nextShanghaiMidnightIso()
  };
}

export function normalizeLegacyGenerations(state: StoreState) {
  for (const generation of state.generations) {
    if ((generation.provider as string) === "mock") {
      generation.provider = "manual";
      if (generation.status === "running") {
        generation.status = "queued";
        generation.progress = 8;
      }
      if (generation.videoUrl?.includes("interactive-examples.mdn.mozilla.net")) {
        generation.videoUrl = undefined;
        generation.completedAt = undefined;
        generation.status = "queued";
        generation.progress = 8;
      }
      generation.updatedAt = nowIso();
    }
    if (generation.errorMessage) {
      generation.errorMessage = toUserFacingError(generation.errorMessage, "任务处理失败。");
    }
  }
}
