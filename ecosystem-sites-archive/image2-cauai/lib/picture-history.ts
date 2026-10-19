import { randomUUID } from "node:crypto";
import {
  parseSupabaseError,
  requireSupabaseConfig,
  serviceHeaders,
  type SupabaseUser
} from "@/lib/image2-membership";

export type PictureHistoryImage = {
  name: string;
  path: string;
  url: string;
};

export type PictureHistoryItem = {
  channel: "auto" | "fast" | "stable";
  createdAt: string;
  elapsedSeconds?: number;
  id: string;
  images: PictureHistoryImage[];
  mode: "text-to-image" | "image-to-image" | "smart-edit";
  prompt: string;
  ratio: "1:1" | "3:4" | "9:16" | "16:9";
  resolution: "1k" | "2k" | "4k";
  seed?: number;
};

type PictureHistoryRow = {
  channel: PictureHistoryItem["channel"];
  created_at: string;
  elapsed_seconds?: number | null;
  id: string;
  images: unknown;
  mode: PictureHistoryItem["mode"];
  prompt: string;
  ratio: PictureHistoryItem["ratio"];
  resolution: PictureHistoryItem["resolution"];
  seed?: number | null;
};

type Image2AssetSnapshotFallbackRow = {
  snapshot?: unknown;
  snapshot_version?: string | null;
  user_id: string;
};

type PublicPicturePayload = {
  channel?: string;
  elapsedSeconds?: number;
  images?: Array<{
    dataUrl?: string;
    name?: string;
    path?: string;
  }>;
  mode?: string;
  ratio?: string;
  resolution?: string;
  seed?: number;
};

const snapshotHistoryKey = "pictureStudioHistory";

function imageUrlForPath(pathValue: string) {
  return `/api/picture/output/${pathValue
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function toStoredImages(images: PublicPicturePayload["images"]): PictureHistoryImage[] {
  return (images ?? [])
    .map((image, index) => {
      const path = typeof image.path === "string" ? image.path : "";
      if (!path) return null;
      return {
        name: image.name || `picture-${String(index + 1).padStart(2, "0")}.png`,
        path,
        url: imageUrlForPath(path)
      };
    })
    .filter((image): image is PictureHistoryImage => Boolean(image));
}

function asHistoryItem(row: PictureHistoryRow): PictureHistoryItem {
  const images = Array.isArray(row.images)
    ? row.images
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const record = item as Record<string, unknown>;
          const path = typeof record.path === "string" ? record.path : "";
          if (!path) return null;
          return {
            name: typeof record.name === "string" ? record.name : "picture.png",
            path,
            url: typeof record.url === "string" ? record.url : imageUrlForPath(path)
          };
        })
        .filter((item): item is PictureHistoryImage => Boolean(item))
    : [];

  return {
    channel: row.channel,
    createdAt: row.created_at,
    elapsedSeconds: typeof row.elapsed_seconds === "number" ? row.elapsed_seconds : undefined,
    id: row.id,
    images,
    mode: row.mode,
    prompt: row.prompt,
    ratio: row.ratio,
    resolution: row.resolution,
    seed: typeof row.seed === "number" ? row.seed : undefined
  };
}

function isMissingHistoryTableMessage(message: string) {
  return /picture_generation_runs|schema cache|PGRST202|PGRST205|Could not find the table|relation .* does not exist|404/i.test(
    message
  );
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

function historyImagesFromUnknown(value: unknown): PictureHistoryImage[] {
  return Array.isArray(value)
    ? value
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const record = item as Record<string, unknown>;
          const path = typeof record.path === "string" ? record.path : "";
          if (!path) return null;
          return {
            name: typeof record.name === "string" ? record.name : "picture.png",
            path,
            url: typeof record.url === "string" ? record.url : imageUrlForPath(path)
          };
        })
        .filter((item): item is PictureHistoryImage => Boolean(item))
    : [];
}

function snapshotObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

function historyFromSnapshot(snapshot: unknown): PictureHistoryItem[] {
  const record = snapshotObject(snapshot);
  const rawHistory = Array.isArray(record[snapshotHistoryKey])
    ? record[snapshotHistoryKey]
    : Array.isArray(record.picture_history)
      ? record.picture_history
      : [];

  const items: PictureHistoryItem[] = [];
  for (const item of rawHistory) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const images = historyImagesFromUnknown(row.images);
    if (!images.length) continue;
    items.push({
      channel: asChannel(row.channel),
      createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
      elapsedSeconds: typeof row.elapsedSeconds === "number" ? row.elapsedSeconds : undefined,
      id: typeof row.id === "string" ? row.id : randomUUID(),
      images,
      mode: asMode(row.mode),
      prompt: typeof row.prompt === "string" ? row.prompt : "",
      ratio: asRatio(row.ratio),
      resolution: asResolution(row.resolution),
      seed: typeof row.seed === "number" ? row.seed : undefined
    });
  }
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function historyErrorMessage(message: string) {
  if (isMissingHistoryTableMessage(message)) {
    return "生成历史数据库还未完成迁移，请先执行公开制图台账号与历史迁移。";
  }
  return message;
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    throw new Error(historyErrorMessage(await parseSupabaseError(response, fallback)));
  }
  return (await response.json().catch(() => ({}))) as T;
}

async function readAssetSnapshotFallback(userId: string) {
  const config = requireSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/image2_asset_snapshots?user_id=eq.${encodeURIComponent(
      userId
    )}&select=user_id,snapshot_version,snapshot&limit=1`,
    {
      headers: serviceHeaders(),
      cache: "no-store"
    }
  );
  const rows = await readJson<Image2AssetSnapshotFallbackRow[]>(response, "生成历史读取失败。");
  return rows[0] ?? { user_id: userId, snapshot_version: "image2-assets-v1", snapshot: {} };
}

async function savePictureGenerationHistoryInSnapshotFallback(input: {
  images: PictureHistoryImage[];
  prompt: string;
  result: PublicPicturePayload;
  user: SupabaseUser & { username?: string };
}) {
  const config = requireSupabaseConfig();
  const row = await readAssetSnapshotFallback(input.user.id);
  const snapshot = snapshotObject(row.snapshot);
  const existing = historyFromSnapshot(snapshot);
  const item: PictureHistoryItem = {
    channel: asChannel(input.result.channel),
    createdAt: new Date().toISOString(),
    elapsedSeconds: input.result.elapsedSeconds,
    id: randomUUID(),
    images: input.images,
    mode: asMode(input.result.mode),
    prompt: input.prompt,
    ratio: asRatio(input.result.ratio),
    resolution: asResolution(input.result.resolution),
    seed: typeof input.result.seed === "number" ? input.result.seed : undefined
  };
  snapshot[snapshotHistoryKey] = [item, ...existing.filter((historyItem) => historyItem.id !== item.id)].slice(0, 100);
  if (input.user.username) snapshot.pictureStudioUsername = input.user.username;

  const response = await fetch(
    `${config.url}/rest/v1/image2_asset_snapshots?on_conflict=user_id`,
    {
      method: "POST",
      headers: serviceHeaders("resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify({
        user_id: input.user.id,
        snapshot_version: row.snapshot_version || "image2-assets-v1",
        snapshot
      })
    }
  );
  if (!response.ok) {
    throw new Error(await parseSupabaseError(response, "生成历史保存失败。"));
  }
  return item;
}

export async function savePictureGenerationHistory(input: {
  prompt: string;
  result: PublicPicturePayload;
  user: SupabaseUser & { username?: string };
}) {
  const images = toStoredImages(input.result.images);
  if (!images.length) {
    throw new Error("生成历史缺少可保存的图片路径。");
  }

  const config = requireSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/picture_generation_runs?select=id,user_id,prompt,mode,channel,ratio,resolution,seed,images,elapsed_seconds,created_at`,
    {
      method: "POST",
      headers: serviceHeaders("return=representation"),
      body: JSON.stringify({
        user_id: input.user.id,
        prompt: input.prompt,
        mode: input.result.mode,
        channel: input.result.channel,
        ratio: input.result.ratio,
        resolution: input.result.resolution,
        seed: input.result.seed,
        images,
        elapsed_seconds: input.result.elapsedSeconds,
        metadata: {
          imageCount: images.length,
          username: input.user.username
        }
      })
    }
  );
  if (!response.ok) {
    const message = await parseSupabaseError(response, "生成历史保存失败。");
    if (isMissingHistoryTableMessage(message)) {
      return savePictureGenerationHistoryInSnapshotFallback({
        images,
        prompt: input.prompt,
        result: input.result,
        user: input.user
      });
    }
    throw new Error(historyErrorMessage(message));
  }
  const rows = await readJson<PictureHistoryRow[]>(response, "生成历史保存失败。");
  if (!rows[0]) throw new Error("生成历史保存失败。");
  return asHistoryItem(rows[0]);
}

export async function listPictureGenerationHistory(user: SupabaseUser, limit = 30) {
  const config = requireSupabaseConfig();
  const safeLimit = Math.min(Math.max(Math.floor(limit) || 30, 1), 100);
  const response = await fetch(
    `${config.url}/rest/v1/picture_generation_runs?user_id=eq.${encodeURIComponent(
      user.id
    )}&select=id,user_id,prompt,mode,channel,ratio,resolution,seed,images,elapsed_seconds,created_at&order=created_at.desc&limit=${safeLimit}`,
    {
      headers: serviceHeaders(),
      cache: "no-store"
    }
  );
  if (!response.ok) {
    const message = await parseSupabaseError(response, "生成历史读取失败。");
    if (isMissingHistoryTableMessage(message)) {
      const row = await readAssetSnapshotFallback(user.id);
      return historyFromSnapshot(row.snapshot).slice(0, safeLimit);
    }
    throw new Error(historyErrorMessage(message));
  }
  const rows = await readJson<PictureHistoryRow[]>(response, "生成历史读取失败。");
  return rows.map(asHistoryItem);
}

export function publicImageUrlForPath(pathValue?: string) {
  return pathValue ? imageUrlForPath(pathValue) : "";
}
