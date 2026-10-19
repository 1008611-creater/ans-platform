import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GeneratedImage } from "@/lib/image2-generation";
import { parseSupabaseError, requireSupabaseConfig, serviceHeaders } from "@/lib/image2-membership";
import { normalizeImage2AssetSnapshot } from "@/lib/store";

export type Image2GachaMode = "single" | "pack";
export type Image2GachaRarity = "SSR" | "SR" | "R" | "废卡" | "待开";
export type Image2GachaCardStatus = "draft" | "locked" | "drawing" | "done" | "failed";
export type Image2GachaRunStatus = "draft" | "drawing" | "partial" | "done" | "failed";

export type Image2GachaSourceCase = {
  caseCode?: string;
  categoryLabel?: string;
  id?: number;
  imageUrl?: string;
  key: string;
  prompt?: string;
  promptPreview?: string;
  promptStructure?: Partial<Record<"subject" | "style" | "composition" | "lighting" | "materials" | "text", string>>;
  reuseProfile?: {
    difficulty?: string;
    label?: string;
    note?: string;
    stability?: string;
    verdict?: string;
  };
  title: string;
  valueScore?: number;
};

export type Image2GachaParams = {
  composition?: string;
  contentDirection?: string;
  lighting?: string;
  negative?: string;
  palette?: string;
  randomStrength?: number;
  realismStrength?: number;
  referenceFit?: number;
  seed?: string;
  size?: string;
  styleStrength?: number;
  texture?: string;
};

export type Image2GachaCard = {
  cardId: string;
  error?: string;
  favorite?: boolean;
  failureReason?: string;
  image?: Image2GachaImage;
  prompt: string;
  randomParams: Record<string, string | number>;
  rating?: Image2GachaRarity;
  rarity: Image2GachaRarity;
  slot: number;
  status: Image2GachaCardStatus;
};

export type Image2GachaImage = Pick<GeneratedImage, "name" | "path"> & {
  dataUrl?: string;
  url?: string;
};

export type Image2GachaRun = {
  cards: Image2GachaCard[];
  createdAt: string;
  drawCount: number;
  jobId?: string;
  mode: Image2GachaMode;
  params: Image2GachaParams;
  runId: string;
  sourceCase: Image2GachaSourceCase;
  status: Image2GachaRunStatus;
  targetSlots: number;
  updatedAt: string;
  userGoal: string;
};

export type Image2GachaRecipe = {
  cardId: string;
  createdAt: string;
  recipeId: string;
  runId: string;
  sourceCaseKey: string;
  title: string;
};

export type Image2GachaStoreContext = {
  userId?: string;
};

type Image2GachaStore = {
  recipes: Image2GachaRecipe[];
  runs: Image2GachaRun[];
  version: 1;
};

type SupabaseGachaRunRow = {
  cards: unknown;
  created_at: string;
  draw_count: number;
  job_id: string | null;
  mode: string;
  params: unknown;
  run_id: string;
  source_case: unknown;
  source_case_key: string;
  status: string;
  target_slots: number;
  updated_at: string;
  user_goal: string | null;
  user_id: string;
};

type SupabaseGachaRecipeRow = {
  card_id: string;
  created_at: string;
  recipe_id: string;
  run_id: string;
  source_case_key: string;
  title: string;
  user_id: string;
};

type SupabaseAssetSnapshotRow = {
  snapshot: unknown;
};

const storePath = path.join(process.cwd(), ".data", "image2-gacha-runs.json");
const maxRuns = 60;
const maxRecipes = 120;
const migrationFile = "supabase/migrations/202606030001_image2_gacha_runs.sql";

const runSelect =
  "run_id,user_id,source_case_key,mode,status,draw_count,target_slots,source_case,params,user_goal,cards,job_id,created_at,updated_at";
const recipeSelect = "recipe_id,user_id,run_id,card_id,source_case_key,title,created_at";

const emptyStore = (): Image2GachaStore => ({
  recipes: [],
  runs: [],
  version: 1
});

export function isImage2GachaSupabaseEnabled() {
  return process.env.IMAGE2_GACHA_BACKEND?.trim().toLowerCase() === "supabase";
}

function requireGachaUser(context?: Image2GachaStoreContext) {
  if (!context?.userId) throw new Error("请先登录账号后再使用云端抽卡。");
  return context.userId;
}

function toGachaStorageError(message: string) {
  if (isGachaTableMissingMessage(message)) {
    return `抽卡数据库还未完成迁移，请先执行 ${migrationFile}。`;
  }
  return message;
}

function isGachaTableMissingMessage(message: string) {
  return /抽卡数据库还未完成迁移|image2_gacha_runs|image2_gacha_recipes|schema cache|PGRST202|PGRST205|404|relation .* does not exist/i.test(
    message
  );
}

function isGachaTableMissingError(error: unknown) {
  return isGachaTableMissingMessage(error instanceof Error ? error.message : String(error ?? ""));
}

async function readSupabaseJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    throw new Error(toGachaStorageError(await parseSupabaseError(response, fallback)));
  }

  return (await response.json()) as T;
}

function supabaseRestUrl(table: string, params: Record<string, string>) {
  const config = requireSupabaseConfig();
  const query = new URLSearchParams(params);
  return `${config.url}/rest/v1/${table}?${query.toString()}`;
}

function normalizedMode(value: string): Image2GachaMode {
  return value === "single" ? "single" : "pack";
}

function normalizedRunStatus(value: string): Image2GachaRunStatus {
  if (value === "drawing" || value === "partial" || value === "done" || value === "failed") return value;
  return "draft";
}

function toIso(value: string | undefined, fallback = new Date().toISOString()) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeSourceCase(value: unknown, fallbackKey: string): Image2GachaSourceCase {
  const input = asObject(value);
  const key = typeof input.key === "string" && input.key.trim() ? input.key.trim() : fallbackKey;
  const title = typeof input.title === "string" && input.title.trim() ? input.title.trim() : "收藏图";
  return {
    ...(input as Partial<Image2GachaSourceCase>),
    key,
    title
  };
}

function normalizeCards(value: unknown): Image2GachaCard[] {
  return Array.isArray(value) ? (value as Image2GachaCard[]) : [];
}

function normalizeStoredCard(value: unknown): Image2GachaCard | null {
  const input = asObject(value);
  const cardId = typeof input.cardId === "string" && input.cardId.trim() ? input.cardId.trim() : "";
  if (!cardId) return null;
  const rarity =
    input.rarity === "SSR" || input.rarity === "SR" || input.rarity === "R" || input.rarity === "废卡" || input.rarity === "待开"
      ? input.rarity
      : "待开";
  const status =
    input.status === "locked" || input.status === "drawing" || input.status === "done" || input.status === "failed"
      ? input.status
      : "draft";
  const rating =
    input.rating === "SSR" || input.rating === "SR" || input.rating === "R" || input.rating === "废卡" || input.rating === "待开"
      ? input.rating
      : undefined;

  return {
    cardId,
    error: typeof input.error === "string" ? input.error : undefined,
    favorite: typeof input.favorite === "boolean" ? input.favorite : undefined,
    failureReason: typeof input.failureReason === "string" ? input.failureReason : undefined,
    image: asObject(input.image) as Image2GachaImage,
    prompt: typeof input.prompt === "string" ? input.prompt : "",
    randomParams: asObject(input.randomParams) as Record<string, string | number>,
    rating,
    rarity,
    slot: Math.max(1, Number(input.slot) || 1),
    status
  };
}

function normalizeStoredCards(value: unknown): Image2GachaCard[] {
  return Array.isArray(value) ? value.map(normalizeStoredCard).filter((item): item is Image2GachaCard => Boolean(item)) : [];
}

function normalizeParams(value: unknown): Image2GachaParams {
  return asObject(value) as Image2GachaParams;
}

function imageOutputUrl(imagePath: string) {
  return `/api/image2/output/${imagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function normalizeCardForResponse(card: Image2GachaCard): Image2GachaCard {
  if (!card.image?.path) return card;
  return {
    ...card,
    image: {
      name: card.image.name,
      path: card.image.path,
      url: card.image.url || imageOutputUrl(card.image.path)
    }
  };
}

function normalizeRunForResponse(run: Image2GachaRun): Image2GachaRun {
  return {
    ...run,
    cards: run.cards.map(normalizeCardForResponse)
  };
}

function rowToRun(row: SupabaseGachaRunRow): Image2GachaRun {
  return normalizeRunForResponse({
    cards: normalizeCards(row.cards),
    createdAt: toIso(row.created_at),
    drawCount: Math.max(1, Number(row.draw_count) || 1),
    jobId: row.job_id ?? undefined,
    mode: normalizedMode(row.mode),
    params: normalizeParams(row.params),
    runId: row.run_id,
    sourceCase: normalizeSourceCase(row.source_case, row.source_case_key),
    status: normalizedRunStatus(row.status),
    targetSlots: Math.max(1, Number(row.target_slots) || 1),
    updatedAt: toIso(row.updated_at),
    userGoal: row.user_goal ?? ""
  });
}

function rowToRecipe(row: SupabaseGachaRecipeRow): Image2GachaRecipe {
  return {
    cardId: row.card_id,
    createdAt: toIso(row.created_at),
    recipeId: row.recipe_id,
    runId: row.run_id,
    sourceCaseKey: row.source_case_key,
    title: row.title
  };
}

function normalizeStoredRun(value: unknown): Image2GachaRun | null {
  const input = asObject(value);
  const runId = typeof input.runId === "string" && input.runId.trim() ? input.runId.trim() : "";
  if (!runId) return null;
  const sourceCaseKey =
    typeof input.sourceCaseKey === "string" && input.sourceCaseKey.trim()
      ? input.sourceCaseKey.trim()
      : typeof asObject(input.sourceCase).key === "string"
        ? String(asObject(input.sourceCase).key)
        : "favorite-source";

  return normalizeRunForResponse({
    cards: normalizeStoredCards(input.cards),
    createdAt: toIso(typeof input.createdAt === "string" ? input.createdAt : undefined),
    drawCount: Math.max(1, Number(input.drawCount) || 1),
    jobId: typeof input.jobId === "string" ? input.jobId : undefined,
    mode: normalizedMode(typeof input.mode === "string" ? input.mode : "pack"),
    params: normalizeParams(input.params),
    runId,
    sourceCase: normalizeSourceCase(input.sourceCase, sourceCaseKey),
    status: normalizedRunStatus(typeof input.status === "string" ? input.status : "draft"),
    targetSlots: Math.max(1, Number(input.targetSlots) || 1),
    updatedAt: toIso(typeof input.updatedAt === "string" ? input.updatedAt : undefined),
    userGoal: typeof input.userGoal === "string" ? input.userGoal : ""
  });
}

function normalizeStoredRecipe(value: unknown): Image2GachaRecipe | null {
  const input = asObject(value);
  const recipeId = typeof input.recipeId === "string" && input.recipeId.trim() ? input.recipeId.trim() : "";
  if (!recipeId) return null;

  return {
    cardId: typeof input.cardId === "string" ? input.cardId : "",
    createdAt: toIso(typeof input.createdAt === "string" ? input.createdAt : undefined),
    recipeId,
    runId: typeof input.runId === "string" ? input.runId : "",
    sourceCaseKey: typeof input.sourceCaseKey === "string" ? input.sourceCaseKey : "",
    title: typeof input.title === "string" ? input.title : "抽卡配方"
  };
}

function runToSupabaseRow(run: Image2GachaRun, userId: string) {
  return {
    cards: run.cards,
    created_at: run.createdAt,
    draw_count: run.drawCount,
    job_id: run.jobId ?? null,
    mode: run.mode,
    params: run.params,
    run_id: run.runId,
    source_case: run.sourceCase,
    source_case_key: run.sourceCase.key,
    status: run.status,
    target_slots: run.targetSlots,
    updated_at: run.updatedAt,
    user_goal: run.userGoal,
    user_id: userId
  };
}

function runToSupabasePatch(run: Image2GachaRun) {
  return {
    cards: run.cards,
    draw_count: run.drawCount,
    job_id: run.jobId ?? null,
    mode: run.mode,
    params: run.params,
    source_case: run.sourceCase,
    source_case_key: run.sourceCase.key,
    status: run.status,
    target_slots: run.targetSlots,
    user_goal: run.userGoal
  };
}

async function readStore(): Promise<Image2GachaStore> {
  try {
    const parsed = JSON.parse(await readFile(storePath, "utf-8")) as Partial<Image2GachaStore>;
    return {
      recipes: Array.isArray(parsed.recipes) ? parsed.recipes : [],
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      version: 1
    };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: Image2GachaStore) {
  await mkdir(path.dirname(storePath), { recursive: true });
  const next: Image2GachaStore = {
    recipes: store.recipes.slice(0, maxRecipes),
    runs: store.runs
      .slice()
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, maxRuns),
    version: 1
  };
  await writeFile(storePath, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

function trimStore(store: Image2GachaStore): Image2GachaStore {
  return {
    recipes: store.recipes
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, maxRecipes),
    runs: store.runs
      .slice()
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, maxRuns),
    version: 1
  };
}

function storeFromAssetSnapshot(snapshot: unknown): Image2GachaStore {
  const normalized = normalizeImage2AssetSnapshot(snapshot);
  return trimStore({
    recipes: (normalized.gachaState?.recipes ?? [])
      .map(normalizeStoredRecipe)
      .filter((item): item is Image2GachaRecipe => Boolean(item)),
    runs: (normalized.gachaState?.runs ?? [])
      .map(normalizeStoredRun)
      .filter((item): item is Image2GachaRun => Boolean(item)),
    version: 1
  });
}

async function readSupabaseAssetSnapshot(userId: string) {
  const response = await fetch(
    supabaseRestUrl("image2_asset_snapshots", {
      limit: "1",
      select: "snapshot",
      user_id: `eq.${userId}`
    }),
    {
      cache: "no-store",
      headers: serviceHeaders()
    }
  );

  if (!response.ok) {
    throw new Error(await parseSupabaseError(response, "收藏夹快照读取失败。"));
  }

  const rows = (await response.json()) as SupabaseAssetSnapshotRow[];
  return rows[0]?.snapshot ?? null;
}

async function writeSupabaseAssetSnapshot(userId: string, snapshot: unknown) {
  const normalized = normalizeImage2AssetSnapshot(snapshot);
  const response = await fetch(
    supabaseRestUrl("image2_asset_snapshots", {
      on_conflict: "user_id",
      select: "user_id"
    }),
    {
      method: "POST",
      headers: serviceHeaders("resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify({
        user_id: userId,
        snapshot_version: normalized.version,
        snapshot: normalized,
        merged_from_local_at: normalized.updatedAt,
        updated_at: normalized.updatedAt
      }),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(await parseSupabaseError(response, "收藏夹快照保存失败。"));
  }
}

async function mutateAssetSnapshotStore<T>(
  context: Image2GachaStoreContext | undefined,
  mutator: (store: Image2GachaStore) => T | Promise<T>
) {
  const userId = requireGachaUser(context);
  const currentSnapshot = normalizeImage2AssetSnapshot(await readSupabaseAssetSnapshot(userId));
  const store = storeFromAssetSnapshot(currentSnapshot);
  const result = await mutator(store);
  const now = new Date().toISOString();
  const nextStore = trimStore(store);
  currentSnapshot.gachaState = {
    ...nextStore,
    updatedAt: now
  };
  currentSnapshot.updatedAt = now;
  await writeSupabaseAssetSnapshot(userId, currentSnapshot);
  return result;
}

async function readAssetSnapshotStore(context?: Image2GachaStoreContext) {
  const userId = requireGachaUser(context);
  return storeFromAssetSnapshot(await readSupabaseAssetSnapshot(userId));
}

async function createAssetSnapshotRun(run: Image2GachaRun, context?: Image2GachaStoreContext) {
  return mutateAssetSnapshotStore(context, (store) => {
    store.runs = [run, ...store.runs.filter((item) => item.runId !== run.runId)];
    return normalizeRunForResponse(run);
  });
}

async function getAssetSnapshotRun(runId: string, context?: Image2GachaStoreContext) {
  const store = await readAssetSnapshotStore(context);
  const run = store.runs.find((item) => item.runId === runId) ?? null;
  return run ? normalizeRunForResponse(run) : null;
}

async function listAssetSnapshotRuns(input: { limit?: number; sourceCaseKey?: string } | undefined, context?: Image2GachaStoreContext) {
  const store = await readAssetSnapshotStore(context);
  const limit = Math.min(Math.max(Number(input?.limit) || 12, 1), 60);
  return store.runs
    .filter((run) => !input?.sourceCaseKey || run.sourceCase.key === input.sourceCaseKey)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit)
    .map(normalizeRunForResponse);
}

async function getAssetSnapshotJob(jobId: string, context?: Image2GachaStoreContext) {
  const store = await readAssetSnapshotStore(context);
  const run = store.runs.find((item) => item.jobId === jobId) ?? null;
  return run ? normalizeRunForResponse(run) : null;
}

async function updateAssetSnapshotRun(
  runId: string,
  updater: (run: Image2GachaRun) => Image2GachaRun,
  context?: Image2GachaStoreContext
) {
  return mutateAssetSnapshotStore(context, (store) => {
    const index = store.runs.findIndex((run) => run.runId === runId);
    if (index < 0) return null;
    const next = {
      ...updater(store.runs[index]),
      updatedAt: new Date().toISOString()
    };
    store.runs[index] = next;
    return normalizeRunForResponse(next);
  });
}

async function createAssetSnapshotRecipe(input: Omit<Image2GachaRecipe, "createdAt" | "recipeId">, context?: Image2GachaStoreContext) {
  const recipe: Image2GachaRecipe = {
    ...input,
    createdAt: new Date().toISOString(),
    recipeId: `recipe-${randomUUID().slice(0, 12)}`
  };
  return mutateAssetSnapshotStore(context, (store) => {
    store.recipes = [recipe, ...store.recipes.filter((item) => item.recipeId !== recipe.recipeId)];
    return recipe;
  });
}

function mergeRuns(primary: Image2GachaRun[], fallback: Image2GachaRun[], limit: number) {
  const byId = new Map<string, Image2GachaRun>();
  for (const run of [...primary, ...fallback]) {
    if (!byId.has(run.runId)) byId.set(run.runId, run);
  }
  return [...byId.values()]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit)
    .map(normalizeRunForResponse);
}

async function createSupabaseRun(run: Image2GachaRun, context?: Image2GachaStoreContext) {
  const userId = requireGachaUser(context);
  const response = await fetch(supabaseRestUrl("image2_gacha_runs", { select: runSelect }), {
    method: "POST",
    headers: serviceHeaders("return=representation"),
    body: JSON.stringify(runToSupabaseRow(run, userId)),
    cache: "no-store"
  });
  const rows = await readSupabaseJson<SupabaseGachaRunRow[]>(response, "抽卡任务保存失败。");
  return rows[0] ? rowToRun(rows[0]) : run;
}

async function getSupabaseRun(runId: string, context?: Image2GachaStoreContext) {
  const userId = requireGachaUser(context);
  const response = await fetch(
    supabaseRestUrl("image2_gacha_runs", {
      limit: "1",
      run_id: `eq.${runId}`,
      select: runSelect,
      user_id: `eq.${userId}`
    }),
    {
      headers: serviceHeaders(),
      cache: "no-store"
    }
  );
  const rows = await readSupabaseJson<SupabaseGachaRunRow[]>(response, "抽卡任务读取失败。");
  return rows[0] ? rowToRun(rows[0]) : null;
}

async function listSupabaseRuns(input: { limit?: number; sourceCaseKey?: string } | undefined, context?: Image2GachaStoreContext) {
  const userId = requireGachaUser(context);
  const limit = Math.min(Math.max(Number(input?.limit) || 12, 1), 60);
  const params: Record<string, string> = {
    limit: String(limit),
    order: "updated_at.desc",
    select: runSelect,
    user_id: `eq.${userId}`
  };
  if (input?.sourceCaseKey) params.source_case_key = `eq.${input.sourceCaseKey}`;

  const response = await fetch(supabaseRestUrl("image2_gacha_runs", params), {
    headers: serviceHeaders(),
    cache: "no-store"
  });
  const rows = await readSupabaseJson<SupabaseGachaRunRow[]>(response, "抽卡任务列表读取失败。");
  return rows.map(rowToRun);
}

async function getSupabaseJob(jobId: string, context?: Image2GachaStoreContext) {
  const userId = requireGachaUser(context);
  const response = await fetch(
    supabaseRestUrl("image2_gacha_runs", {
      job_id: `eq.${jobId}`,
      limit: "1",
      select: runSelect,
      user_id: `eq.${userId}`
    }),
    {
      headers: serviceHeaders(),
      cache: "no-store"
    }
  );
  const rows = await readSupabaseJson<SupabaseGachaRunRow[]>(response, "抽卡任务读取失败。");
  return rows[0] ? rowToRun(rows[0]) : null;
}

async function updateSupabaseRun(
  runId: string,
  updater: (run: Image2GachaRun) => Image2GachaRun,
  context?: Image2GachaStoreContext
) {
  const userId = requireGachaUser(context);
  const current = await getSupabaseRun(runId, context);
  if (!current) return null;

  const next = {
    ...updater(current),
    updatedAt: new Date().toISOString()
  };
  const response = await fetch(
    supabaseRestUrl("image2_gacha_runs", {
      run_id: `eq.${runId}`,
      select: runSelect,
      user_id: `eq.${userId}`
    }),
    {
      method: "PATCH",
      headers: serviceHeaders("return=representation"),
      body: JSON.stringify(runToSupabasePatch(next)),
      cache: "no-store"
    }
  );
  const rows = await readSupabaseJson<SupabaseGachaRunRow[]>(response, "抽卡任务更新失败。");
  return rows[0] ? rowToRun(rows[0]) : next;
}

async function createSupabaseRecipe(input: Omit<Image2GachaRecipe, "createdAt" | "recipeId">, context?: Image2GachaStoreContext) {
  const userId = requireGachaUser(context);
  const recipe: Image2GachaRecipe = {
    ...input,
    createdAt: new Date().toISOString(),
    recipeId: `recipe-${randomUUID().slice(0, 12)}`
  };
  const response = await fetch(supabaseRestUrl("image2_gacha_recipes", { select: recipeSelect }), {
    method: "POST",
    headers: serviceHeaders("return=representation"),
    body: JSON.stringify({
      card_id: recipe.cardId,
      created_at: recipe.createdAt,
      recipe_id: recipe.recipeId,
      run_id: recipe.runId,
      source_case_key: recipe.sourceCaseKey,
      title: recipe.title,
      user_id: userId
    }),
    cache: "no-store"
  });
  const rows = await readSupabaseJson<SupabaseGachaRecipeRow[]>(response, "配方保存失败。");
  return rows[0] ? rowToRecipe(rows[0]) : recipe;
}

export async function createImage2GachaRun(
  input: Omit<Image2GachaRun, "createdAt" | "runId" | "status" | "updatedAt">,
  context?: Image2GachaStoreContext
) {
  const now = new Date().toISOString();
  const run: Image2GachaRun = {
    ...input,
    createdAt: now,
    runId: `gacha-${randomUUID().slice(0, 12)}`,
    status: "draft",
    updatedAt: now
  };

  if (isImage2GachaSupabaseEnabled()) {
    try {
      return await createSupabaseRun(run, context);
    } catch (error) {
      if (!isGachaTableMissingError(error)) throw error;
      return createAssetSnapshotRun(run, context);
    }
  }

  const store = await readStore();
  store.runs.unshift(run);
  await writeStore(store);
  return normalizeRunForResponse(run);
}

export async function getImage2GachaRun(runId: string, context?: Image2GachaStoreContext) {
  if (isImage2GachaSupabaseEnabled()) {
    try {
      return (await getSupabaseRun(runId, context)) ?? getAssetSnapshotRun(runId, context);
    } catch (error) {
      if (!isGachaTableMissingError(error)) throw error;
      return getAssetSnapshotRun(runId, context);
    }
  }

  const store = await readStore();
  const run = store.runs.find((item) => item.runId === runId) ?? null;
  return run ? normalizeRunForResponse(run) : null;
}

export async function listImage2GachaRuns(input?: { limit?: number; sourceCaseKey?: string }, context?: Image2GachaStoreContext) {
  if (isImage2GachaSupabaseEnabled()) {
    try {
      const limit = Math.min(Math.max(Number(input?.limit) || 12, 1), 60);
      const [supabaseRuns, fallbackRuns] = await Promise.all([
        listSupabaseRuns({ ...input, limit }, context),
        listAssetSnapshotRuns({ ...input, limit }, context).catch(() => [])
      ]);
      return mergeRuns(supabaseRuns, fallbackRuns, limit);
    } catch (error) {
      if (!isGachaTableMissingError(error)) throw error;
      return listAssetSnapshotRuns(input, context);
    }
  }

  const store = await readStore();
  const limit = Math.min(Math.max(Number(input?.limit) || 12, 1), 60);
  return store.runs
    .filter((run) => !input?.sourceCaseKey || run.sourceCase.key === input.sourceCaseKey)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit)
    .map(normalizeRunForResponse);
}

export async function getLatestImage2GachaRun(input?: { sourceCaseKey?: string }, context?: Image2GachaStoreContext) {
  const [run] = await listImage2GachaRuns({ limit: 1, sourceCaseKey: input?.sourceCaseKey }, context);
  return run ?? null;
}

export async function getImage2GachaJob(jobId: string, context?: Image2GachaStoreContext) {
  if (isImage2GachaSupabaseEnabled()) {
    try {
      return (await getSupabaseJob(jobId, context)) ?? getAssetSnapshotJob(jobId, context);
    } catch (error) {
      if (!isGachaTableMissingError(error)) throw error;
      return getAssetSnapshotJob(jobId, context);
    }
  }

  const store = await readStore();
  const run = store.runs.find((item) => item.jobId === jobId) ?? null;
  return run ? normalizeRunForResponse(run) : null;
}

export async function updateImage2GachaRun(
  runId: string,
  updater: (run: Image2GachaRun) => Image2GachaRun,
  context?: Image2GachaStoreContext
) {
  if (isImage2GachaSupabaseEnabled()) {
    try {
      return (await updateSupabaseRun(runId, updater, context)) ?? updateAssetSnapshotRun(runId, updater, context);
    } catch (error) {
      if (!isGachaTableMissingError(error)) throw error;
      return updateAssetSnapshotRun(runId, updater, context);
    }
  }

  const store = await readStore();
  const index = store.runs.findIndex((run) => run.runId === runId);
  if (index < 0) return null;
  const next = updater(store.runs[index]);
  store.runs[index] = {
    ...next,
    updatedAt: new Date().toISOString()
  };
  await writeStore(store);
  return normalizeRunForResponse(store.runs[index]);
}

export async function updateImage2GachaCard(
  cardId: string,
  updater: (card: Image2GachaCard, run: Image2GachaRun) => Image2GachaCard,
  context?: Image2GachaStoreContext
) {
  if (isImage2GachaSupabaseEnabled()) {
    const runs = await listImage2GachaRuns({ limit: maxRuns }, context);
    const run = runs.find((item) => item.cards.some((card) => card.cardId === cardId));
    if (!run) return null;
    const updatedRun = await updateImage2GachaRun(
      run.runId,
      (current) => {
        const cards = current.cards.map((card) => (card.cardId === cardId ? updater(card, current) : card));
        return {
          ...current,
          cards
        };
      },
      context
    );
    const card = updatedRun?.cards.find((item) => item.cardId === cardId);
    return updatedRun && card ? { card, run: updatedRun } : null;
  }

  const store = await readStore();
  for (const [runIndex, run] of store.runs.entries()) {
    const cardIndex = run.cards.findIndex((card) => card.cardId === cardId);
    if (cardIndex < 0) continue;
    const cards = [...run.cards];
    cards[cardIndex] = updater(cards[cardIndex], run);
    store.runs[runIndex] = {
      ...run,
      cards,
      updatedAt: new Date().toISOString()
    };
    await writeStore(store);
    const normalizedRun = normalizeRunForResponse(store.runs[runIndex]);
    const normalizedCard = normalizedRun.cards[cardIndex];
    return {
      card: normalizedCard,
      run: normalizedRun
    };
  }
  return null;
}

export async function createImage2GachaRecipe(
  input: Omit<Image2GachaRecipe, "createdAt" | "recipeId">,
  context?: Image2GachaStoreContext
) {
  if (isImage2GachaSupabaseEnabled()) {
    try {
      return await createSupabaseRecipe(input, context);
    } catch (error) {
      if (!isGachaTableMissingError(error)) throw error;
      return createAssetSnapshotRecipe(input, context);
    }
  }

  const recipe: Image2GachaRecipe = {
    ...input,
    createdAt: new Date().toISOString(),
    recipeId: `recipe-${randomUUID().slice(0, 12)}`
  };
  const store = await readStore();
  store.recipes.unshift(recipe);
  await writeStore(store);
  return recipe;
}
