import { getImage2PublicConfig } from "@/lib/image2-generation";
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  getSupabaseConfig,
  parseSupabaseError,
  requireSupabaseConfig,
  serviceHeaders
} from "@/lib/image2-membership";
import { publicImageUrlForPath, type PictureHistoryItem } from "@/lib/picture-history";

type PictureAccountRow = {
  created_at?: string;
  last_login_at?: string | null;
  login_count?: number | null;
  updated_at?: string;
  user_id: string;
  username: string;
};

type PictureProfileRow = {
  created_at?: string;
  display_name?: string | null;
  last_login_at?: string | null;
  login_count?: number | null;
  source_host?: string | null;
  source_site?: string | null;
  updated_at?: string;
  user_id: string;
};

type PictureHistoryRow = {
  channel?: PictureHistoryItem["channel"] | null;
  created_at?: string;
  elapsed_seconds?: number | null;
  id: string;
  images?: unknown;
  metadata?: unknown;
  mode?: PictureHistoryItem["mode"] | null;
  prompt?: string | null;
  ratio?: PictureHistoryItem["ratio"] | null;
  resolution?: PictureHistoryItem["resolution"] | null;
  seed?: number | null;
  user_id: string;
};

type SnapshotFallbackRow = {
  snapshot?: unknown;
  updated_at?: string;
  user_id: string;
};

export type PictureAdminAccount = {
  createdAt?: string;
  generationCount: number;
  lastGenerationAt?: string;
  lastLoginAt?: string;
  loginCount: number;
  sourceHost?: string;
  updatedAt?: string;
  userId: string;
  username: string;
};

export type PictureAdminImage = PictureHistoryItem["images"][number] & {
  available: boolean;
  downloadUrl: string;
  missingReason?: string;
};

export type PictureAdminRun = Omit<PictureHistoryItem, "images"> & {
  images: PictureAdminImage[];
  userId: string;
  username?: string;
};

type RawPictureAdminRun = Omit<PictureHistoryItem, "images"> & {
  images: PictureHistoryItem["images"];
  userId: string;
  username?: string;
};

const snapshotHistoryKey = "pictureStudioHistory";
const outputRoot = path.resolve(
  process.env.DAIHUO_OUTPUT_ROOT
    ? path.join(process.env.DAIHUO_OUTPUT_ROOT, "image2-studio")
    : process.env.VERCEL
      ? path.join(os.tmpdir(), "image2-studio")
      : path.join(process.cwd(), "outputs", "image2-studio")
);

function isMissingTableMessage(message: string) {
  return /picture_accounts|picture_generation_runs|schema cache|PGRST202|PGRST205|Could not find the table|relation .* does not exist|404/i.test(
    message
  );
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    throw new Error(await parseSupabaseError(response, fallback));
  }
  return (await response.json().catch(() => ({}))) as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asChannel(value: unknown): PictureHistoryItem["channel"] {
  return value === "auto" || value === "stable" || value === "fast" ? value : "fast";
}

function asMode(value: unknown): PictureHistoryItem["mode"] {
  return value === "image-to-image" || value === "smart-edit" || value === "text-to-image" ? value : "text-to-image";
}

function asRatio(value: unknown): PictureHistoryItem["ratio"] {
  return value === "1:1" || value === "3:4" || value === "16:9" || value === "9:16" ? value : "9:16";
}

function asResolution(value: unknown): PictureHistoryItem["resolution"] {
  return value === "1k" || value === "2k" || value === "4k" ? value : "2k";
}

function parseImages(value: unknown): PictureHistoryItem["images"] {
  return Array.isArray(value)
    ? value
        .map((item, index) => {
          const record = asRecord(item);
          const path = typeof record.path === "string" ? record.path : "";
          if (!path) return null;
          return {
            name: typeof record.name === "string" ? record.name : `picture-${String(index + 1).padStart(2, "0")}.png`,
            path,
            url: typeof record.url === "string" ? record.url : publicImageUrlForPath(path)
          };
        })
        .filter((image): image is PictureHistoryItem["images"][number] => Boolean(image))
    : [];
}

export function safePictureOutputPath(pathValue: string) {
  const cleanSegments = pathValue
    .split("/")
    .map((segment) => decodeURIComponent(segment).trim())
    .filter(Boolean);
  if (!cleanSegments.length || cleanSegments.some((segment) => segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\"))) {
    throw new Error("图片路径不可读取。");
  }

  const filePath = path.resolve(outputRoot, ...cleanSegments);
  const rootWithSep = `${outputRoot}${path.sep}`;
  if (filePath !== outputRoot && !filePath.startsWith(rootWithSep)) {
    throw new Error("图片路径不可读取。");
  }
  if (![".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(path.extname(filePath).toLowerCase())) {
    throw new Error("只允许读取图片文件。");
  }
  return filePath;
}

export function contentTypeForPictureOutput(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/png";
}

async function annotateImages(images: PictureHistoryItem["images"]): Promise<PictureAdminImage[]> {
  return Promise.all(
    images.map(async (image) => {
      const url = publicImageUrlForPath(image.path);
      const downloadUrl = `/api/admin/picture/output?path=${encodeURIComponent(image.path)}`;
      try {
        await access(/* turbopackIgnore: true */ safePictureOutputPath(image.path));
        return {
          ...image,
          available: true,
          downloadUrl,
          url
        };
      } catch {
        return {
          ...image,
          available: false,
          downloadUrl,
          missingReason: "历史记录存在，但原图文件不在当前服务器输出目录。",
          url
        };
      }
    })
  );
}

async function annotateRuns(runs: RawPictureAdminRun[]): Promise<PictureAdminRun[]> {
  return Promise.all(
    runs.map(async (run) => ({
      ...run,
      images: await annotateImages(run.images)
    }))
  );
}

function fallbackRunsFromSnapshot(row: SnapshotFallbackRow): RawPictureAdminRun[] {
  const snapshot = asRecord(row.snapshot);
  const rawHistory = Array.isArray(snapshot[snapshotHistoryKey])
    ? snapshot[snapshotHistoryKey]
    : Array.isArray(snapshot.picture_history)
      ? snapshot.picture_history
      : [];
  const username = typeof snapshot.pictureStudioUsername === "string" ? snapshot.pictureStudioUsername : undefined;

  return rawHistory
    .map((item): RawPictureAdminRun | null => {
      const record = asRecord(item);
      const images = parseImages(record.images);
      if (!images.length) return null;
      return {
        channel: asChannel(record.channel),
        createdAt: typeof record.createdAt === "string" ? record.createdAt : row.updated_at || new Date().toISOString(),
        elapsedSeconds: typeof record.elapsedSeconds === "number" ? record.elapsedSeconds : undefined,
        id: typeof record.id === "string" ? record.id : `${row.user_id}-${String(record.createdAt ?? row.updated_at ?? "")}`,
        images,
        mode: asMode(record.mode),
        prompt: typeof record.prompt === "string" ? record.prompt : "",
        ratio: asRatio(record.ratio),
        resolution: asResolution(record.resolution),
        seed: typeof record.seed === "number" ? record.seed : undefined,
        userId: row.user_id,
        username
      };
    })
    .filter((item): item is RawPictureAdminRun => Boolean(item));
}

function runFromRow(row: PictureHistoryRow): RawPictureAdminRun {
  const metadata = asRecord(row.metadata);
  return {
    channel: asChannel(row.channel),
    createdAt: row.created_at || new Date().toISOString(),
    elapsedSeconds: typeof row.elapsed_seconds === "number" ? row.elapsed_seconds : undefined,
    id: row.id,
    images: parseImages(row.images),
    mode: asMode(row.mode),
    prompt: row.prompt || "",
    ratio: asRatio(row.ratio),
    resolution: asResolution(row.resolution),
    seed: typeof row.seed === "number" ? row.seed : undefined,
    userId: row.user_id,
    username: typeof metadata.username === "string" ? metadata.username : undefined
  };
}

function accountFromDedicated(row: PictureAccountRow): PictureAdminAccount {
  return {
    createdAt: row.created_at,
    generationCount: 0,
    lastGenerationAt: undefined,
    lastLoginAt: row.last_login_at ?? undefined,
    loginCount: row.login_count ?? 0,
    updatedAt: row.updated_at,
    userId: row.user_id,
    username: row.username
  };
}

function accountFromProfile(row: PictureProfileRow): PictureAdminAccount | null {
  const username = (row.display_name || "").trim().toLowerCase();
  if (!username) return null;
  return {
    createdAt: row.created_at,
    generationCount: 0,
    lastGenerationAt: undefined,
    lastLoginAt: row.last_login_at ?? undefined,
    loginCount: row.login_count ?? 0,
    sourceHost: row.source_host ?? undefined,
    updatedAt: row.updated_at,
    userId: row.user_id,
    username
  };
}

async function listDedicatedAccounts(limit: number) {
  const config = requireSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/picture_accounts?select=user_id,username,last_login_at,login_count,created_at,updated_at&order=created_at.desc&limit=${limit}`,
    {
      cache: "no-store",
      headers: serviceHeaders()
    }
  );
  if (!response.ok) {
    const message = await parseSupabaseError(response, "制图台账号读取失败。");
    if (isMissingTableMessage(message)) return null;
    throw new Error(message);
  }
  return (await readJson<PictureAccountRow[]>(response, "制图台账号读取失败。")).map(accountFromDedicated);
}

async function listFallbackAccounts(limit: number) {
  const config = requireSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/user_profiles?source_site=eq.picture&select=user_id,display_name,source_host,source_site,last_login_at,login_count,created_at,updated_at&order=created_at.desc&limit=${limit}`,
    {
      cache: "no-store",
      headers: serviceHeaders()
    }
  );
  return (await readJson<PictureProfileRow[]>(response, "制图台账号读取失败。"))
    .map(accountFromProfile)
    .filter((account): account is PictureAdminAccount => Boolean(account));
}

async function listDedicatedRuns(limit: number) {
  const config = requireSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/picture_generation_runs?select=id,user_id,prompt,mode,channel,ratio,resolution,seed,images,elapsed_seconds,metadata,created_at&order=created_at.desc&limit=${limit}`,
    {
      cache: "no-store",
      headers: serviceHeaders()
    }
  );
  if (!response.ok) {
    const message = await parseSupabaseError(response, "制图台生成记录读取失败。");
    if (isMissingTableMessage(message)) return null;
    throw new Error(message);
  }
  return (await readJson<PictureHistoryRow[]>(response, "制图台生成记录读取失败。")).map(runFromRow);
}

async function listFallbackRuns(limit: number) {
  const config = requireSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/image2_asset_snapshots?select=user_id,snapshot,updated_at&order=updated_at.desc&limit=200`,
    {
      cache: "no-store",
      headers: serviceHeaders()
    }
  );
  const rows = await readJson<SnapshotFallbackRow[]>(response, "制图台生成记录读取失败。");
  return rows
    .flatMap(fallbackRunsFromSnapshot)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

function hydrateAccountStats(accounts: PictureAdminAccount[], runs: PictureAdminRun[]) {
  const byId = new Map(accounts.map((account) => [account.userId, { ...account }]));
  for (const run of runs) {
    const current =
      byId.get(run.userId) ??
      ({
        generationCount: 0,
        loginCount: 0,
        userId: run.userId,
        username: run.username || "未知用户"
      } satisfies PictureAdminAccount);
    current.generationCount += 1;
    if (!current.lastGenerationAt || new Date(run.createdAt).getTime() > new Date(current.lastGenerationAt).getTime()) {
      current.lastGenerationAt = run.createdAt;
    }
    if (run.username && current.username === "未知用户") current.username = run.username;
    byId.set(run.userId, current);
  }
  return [...byId.values()].sort((a, b) => {
    const aTime = new Date(a.lastLoginAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.lastLoginAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

export async function listPictureAdminOverview(limit = 80) {
  const safeLimit = Math.min(Math.max(Math.floor(limit) || 80, 1), 200);
  const config = getSupabaseConfig();
  const imageConfig = await getImage2PublicConfig();
  const configReady = Boolean(config.url && config.anonKey && config.serviceRoleKey);

  if (!configReady) {
    return {
      accounts: [],
      generatedAt: new Date().toISOString(),
      health: {
        authConfigured: false,
        channelsConfigured: imageConfig.configured,
        supabaseConfigured: false
      },
      runs: [],
      storageMode: "unavailable",
      totals: {
        accounts: 0,
        generatedImages: 0,
        runs: 0
      }
    };
  }

  const dedicatedAccounts = await listDedicatedAccounts(safeLimit);
  const dedicatedRuns = await listDedicatedRuns(120);
  const storageMode = dedicatedAccounts && dedicatedRuns ? "dedicated-picture-tables" : "fallback-profile-snapshots";
  const rawAccounts = dedicatedAccounts ?? (await listFallbackAccounts(safeLimit));
  const runs = await annotateRuns(dedicatedRuns ?? (await listFallbackRuns(120)));
  const accounts = hydrateAccountStats(rawAccounts, runs).slice(0, safeLimit);

  return {
    accounts,
    generatedAt: new Date().toISOString(),
    health: {
      authConfigured: true,
      channelsConfigured: imageConfig.configured,
      stableChannel: imageConfig.channels.runninghub,
      supabaseConfigured: true,
      fastChannel: imageConfig.channels.ikun
    },
    runs,
    storageMode,
    totals: {
      accounts: accounts.length,
      generatedImages: runs.reduce((sum, run) => sum + run.images.length, 0),
      runs: runs.length
    }
  };
}
