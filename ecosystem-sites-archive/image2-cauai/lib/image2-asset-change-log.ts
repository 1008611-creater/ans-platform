import {
  normalizeImage2AssetSnapshot,
  randomId,
  summarizeImage2AssetSnapshot
} from "./store";
import type {
  Image2AssetChangeAction,
  Image2AssetChangeActor,
  Image2AssetChangeLog,
  Image2AssetSnapshot
} from "./types";
import { getSupabaseConfig, parseSupabaseError, serviceHeaders } from "./image2-membership";

type SupabaseAssetChangeRow = {
  action: Image2AssetChangeAction;
  actor: Image2AssetChangeActor;
  after_snapshot: Image2AssetSnapshot;
  before_snapshot: Image2AssetSnapshot;
  change_id: string;
  created_at: string;
  reason: string;
  source: string;
  undone_at?: string | null;
  undone_by?: string | null;
  undo_change_id?: string | null;
  user_id: string;
};

export const image2AssetChangeLogMigration = "supabase/migrations/202606040001_image2_asset_change_logs.sql";

export function shouldUseSupabaseImage2Assets() {
  return process.env.IMAGE2_ASSET_SYNC_BACKEND?.trim().toLowerCase() === "supabase";
}

export function isImage2AssetChangeMigrationError(value: unknown) {
  const message = value instanceof Error ? value.message : String(value ?? "");
  return /image2_asset_change_logs|schema cache|PGRST20[245]|Could not find the table|relation .* does not exist/i.test(message);
}

export function toImage2AssetChangeMigrationError(value: unknown) {
  const message = value instanceof Error ? value.message : String(value ?? "");
  if (!isImage2AssetChangeMigrationError(message)) return message || "Image2 资产变更记录操作失败。";
  return `Image2 资产变更记录表未迁移，请执行 ${image2AssetChangeLogMigration}。`;
}

function toChangeLog(row: SupabaseAssetChangeRow): Image2AssetChangeLog {
  const beforeSnapshot = normalizeImage2AssetSnapshot(row.before_snapshot);
  const afterSnapshot = normalizeImage2AssetSnapshot(row.after_snapshot);
  return {
    id: row.change_id,
    userId: row.user_id,
    action: row.action === "admin_undo_asset_snapshot" ? "admin_undo_asset_snapshot" : "asset_snapshot_save",
    source: row.source || "image2-assets",
    reason: row.reason || "",
    actor: row.actor?.type ? row.actor : { type: "system" },
    beforeSnapshot,
    afterSnapshot,
    summary: {
      before: summarizeImage2AssetSnapshot(beforeSnapshot),
      after: summarizeImage2AssetSnapshot(afterSnapshot)
    },
    createdAt: row.created_at,
    undoneAt: row.undone_at || undefined,
    undoneBy: row.undone_by || undefined,
    undoChangeId: row.undo_change_id || undefined
  };
}

function changePayload(input: {
  action: Image2AssetChangeAction;
  actor: Image2AssetChangeActor;
  afterSnapshot: Image2AssetSnapshot;
  beforeSnapshot: Image2AssetSnapshot;
  reason?: string;
  source?: string;
  undoChangeId?: string;
  userId: string;
}) {
  const beforeSnapshot = normalizeImage2AssetSnapshot(input.beforeSnapshot);
  const afterSnapshot = normalizeImage2AssetSnapshot(input.afterSnapshot);
  return {
    change_id: randomId("image2_asset_change"),
    user_id: input.userId,
    action: input.action,
    source: (input.source || "image2-assets").slice(0, 120),
    reason: (input.reason || "").slice(0, 600),
    actor: input.actor,
    before_snapshot: beforeSnapshot,
    after_snapshot: afterSnapshot,
    summary: {
      before: summarizeImage2AssetSnapshot(beforeSnapshot),
      after: summarizeImage2AssetSnapshot(afterSnapshot)
    },
    undo_change_id: input.undoChangeId
  };
}

async function readSupabaseJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    throw new Error(toImage2AssetChangeMigrationError(await parseSupabaseError(response, fallback)));
  }
  return (await response.json()) as T;
}

export async function insertSupabaseImage2AssetChange(input: {
  action: Image2AssetChangeAction;
  actor: Image2AssetChangeActor;
  afterSnapshot: Image2AssetSnapshot;
  beforeSnapshot: Image2AssetSnapshot;
  reason?: string;
  source?: string;
  undoChangeId?: string;
  userId: string;
}) {
  const config = getSupabaseConfig();
  const response = await fetch(`${config.url}/rest/v1/image2_asset_change_logs?select=*`, {
    method: "POST",
    headers: serviceHeaders("return=representation"),
    body: JSON.stringify(changePayload(input))
  });
  const rows = await readSupabaseJson<SupabaseAssetChangeRow[]>(response, "Image2 资产变更记录写入失败。");
  const row = rows[0];
  if (!row) throw new Error("Image2 资产变更记录写入失败。");
  return toChangeLog(row);
}

export async function listSupabaseImage2AssetChanges(limit = 30) {
  const config = getSupabaseConfig();
  const size = Math.min(Math.max(Number.isFinite(limit) ? Math.floor(limit) : 30, 1), 100);
  const params = new URLSearchParams({
    order: "created_at.desc",
    limit: String(size),
    select: "*"
  });
  const response = await fetch(`${config.url}/rest/v1/image2_asset_change_logs?${params.toString()}`, {
    headers: serviceHeaders(),
    cache: "no-store"
  });
  const rows = await readSupabaseJson<SupabaseAssetChangeRow[]>(response, "Image2 资产变更记录读取失败。");
  return rows.map(toChangeLog);
}

async function readSupabaseAssetChange(changeId: string) {
  const config = getSupabaseConfig();
  const params = new URLSearchParams({
    change_id: `eq.${changeId}`,
    limit: "1",
    select: "*"
  });
  const response = await fetch(`${config.url}/rest/v1/image2_asset_change_logs?${params.toString()}`, {
    headers: serviceHeaders(),
    cache: "no-store"
  });
  const rows = await readSupabaseJson<SupabaseAssetChangeRow[]>(response, "Image2 资产变更记录读取失败。");
  return rows[0] ? toChangeLog(rows[0]) : null;
}

async function upsertSupabaseAssetSnapshot(userId: string, snapshot: Image2AssetSnapshot) {
  const config = getSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/image2_asset_snapshots?on_conflict=user_id&select=user_id,snapshot,created_at,updated_at`,
    {
      method: "POST",
      headers: serviceHeaders("resolution=merge-duplicates,return=representation"),
      body: JSON.stringify({
        user_id: userId,
        snapshot_version: snapshot.version,
        snapshot,
        merged_from_local_at: snapshot.updatedAt,
        updated_at: snapshot.updatedAt
      })
    }
  );

  if (!response.ok) {
    throw new Error(await parseSupabaseError(response, "云端资产撤销写入失败。"));
  }
}

async function markSupabaseAssetChangeUndone(changeId: string, undoChange: Image2AssetChangeLog, adminId: string) {
  const config = getSupabaseConfig();
  const params = new URLSearchParams({
    change_id: `eq.${changeId}`,
    undone_at: "is.null",
    select: "*"
  });
  const response = await fetch(`${config.url}/rest/v1/image2_asset_change_logs?${params.toString()}`, {
    method: "PATCH",
    headers: serviceHeaders("return=representation"),
    body: JSON.stringify({
      undone_at: undoChange.createdAt,
      undone_by: adminId,
      undo_change_id: undoChange.id
    })
  });
  const rows = await readSupabaseJson<SupabaseAssetChangeRow[]>(response, "Image2 资产变更记录标记撤销失败。");
  if (!rows.length) throw new Error("这条变更已经撤销过。");
  return toChangeLog(rows[0]);
}

export async function undoSupabaseImage2AssetChange(changeId: string, adminId = "admin") {
  const id = String(changeId || "").trim();
  if (!id) throw new Error("缺少要撤销的变更记录。");

  const change = await readSupabaseAssetChange(id);
  if (!change) throw new Error("变更记录不存在。");
  if (change.undoneAt) throw new Error("这条变更已经撤销过。");
  if (change.action === "admin_undo_asset_snapshot") throw new Error("撤销记录不能再次撤销。");

  const restoreSnapshot = normalizeImage2AssetSnapshot(change.beforeSnapshot);
  await upsertSupabaseAssetSnapshot(change.userId, restoreSnapshot);
  const undoChange = await insertSupabaseImage2AssetChange({
    action: "admin_undo_asset_snapshot",
    actor: { type: "admin", id: adminId },
    beforeSnapshot: change.afterSnapshot,
    afterSnapshot: restoreSnapshot,
    reason: `撤销变更 ${change.id}`,
    source: "admin/image2-cases",
    undoChangeId: change.id,
    userId: change.userId
  });
  const markedChange = await markSupabaseAssetChangeUndone(change.id, undoChange, adminId);

  return {
    change: markedChange,
    undoChange
  };
}
