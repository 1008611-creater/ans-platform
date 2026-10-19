import { mutateStore, getImage2AssetsForUser, normalizeImage2AssetSnapshot } from "@/lib/store";
import type { Image2AssetSnapshot } from "@/lib/types";
import { parseSupabaseError, requireSupabaseConfig, serviceHeaders } from "@/lib/image2-membership";

type SupabaseAssetRow = {
  snapshot: unknown;
};

const assetMigrationFile = "supabase/migrations/202605230002_image2_asset_sync_minimal.sql";

export function isImage2AssetSyncSupabaseEnabled() {
  return process.env.IMAGE2_ASSET_SYNC_BACKEND?.trim().toLowerCase() === "supabase";
}

function toAssetStorageError(message: string) {
  if (/image2_asset_snapshots|schema cache|PGRST202|PGRST205|404|relation .* does not exist/i.test(message)) {
    return `收藏夹数据库还未完成迁移，请先执行 ${assetMigrationFile}。`;
  }
  return message;
}

function supabaseRestUrl(table: string, params: Record<string, string>) {
  const config = requireSupabaseConfig();
  const query = new URLSearchParams(params);
  return `${config.url}/rest/v1/${table}?${query.toString()}`;
}

async function readSupabaseAssetSnapshot(userId: string) {
  const response = await fetch(
    supabaseRestUrl("image2_asset_snapshots", {
      limit: "1",
      select: "snapshot",
      user_id: `eq.${userId}`
    }),
    {
      headers: serviceHeaders(),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(toAssetStorageError(await parseSupabaseError(response, "收藏夹读取失败。")));
  }

  const rows = (await response.json()) as SupabaseAssetRow[];
  return normalizeImage2AssetSnapshot(rows[0]?.snapshot);
}

async function readLocalAssetSnapshot(userId: string) {
  const assets = await mutateStore((state) => getImage2AssetsForUser(state, userId));
  return normalizeImage2AssetSnapshot(assets.snapshot);
}

export async function readImage2AssetSnapshotForUser(userId: string): Promise<Image2AssetSnapshot> {
  if (!userId) return normalizeImage2AssetSnapshot(null);
  if (isImage2AssetSyncSupabaseEnabled()) return readSupabaseAssetSnapshot(userId);
  return readLocalAssetSnapshot(userId);
}

export function image2AssetSnapshotHasCaseKey(snapshot: Image2AssetSnapshot, caseKey: string) {
  const key = caseKey.trim();
  if (!key) return false;
  if (snapshot.favoriteCaseKeys.includes(key)) return true;
  return snapshot.collections.some((collection) => collection.caseKeys.includes(key));
}
