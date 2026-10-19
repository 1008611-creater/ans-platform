import { NextRequest, NextResponse } from "next/server";
import {
  insertSupabaseImage2AssetChange,
  isImage2AssetChangeMigrationError,
  shouldUseSupabaseImage2Assets,
  toImage2AssetChangeMigrationError
} from "@/lib/image2-asset-change-log";
import {
  getImage2AssetsForUser,
  mutateStore,
  normalizeImage2AssetSnapshot,
  saveImage2AssetsForUser
} from "@/lib/store";
import { toUserFacingError } from "@/lib/user-facing-error";
import type { Image2AssetSnapshot } from "@/lib/types";
import { isProductionRuntime, productionConfigurationResponse } from "@/lib/runtime-access";

export const runtime = "nodejs";

type SupabaseUser = {
  id: string;
  email?: string;
};

type SupabaseAssetRow = {
  user_id: string;
  snapshot: Image2AssetSnapshot;
  created_at: string;
  updated_at: string;
};

const localStorageMode = process.env.VERCEL ? "temporary-vercel-runtime" : "local-json-store";
const supabaseStorageMode = "supabase-postgres";

function getSupabaseConfig() {
  return {
    url: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, ""),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  };
}

function shouldUseSupabaseAssets() {
  return shouldUseSupabaseImage2Assets();
}

function getUserId(request: NextRequest, bodyUserId?: unknown) {
  const fromBody = typeof bodyUserId === "string" ? bodyUserId.trim() : "";
  return (
    fromBody ||
    request.nextUrl.searchParams.get("userId")?.trim() ||
    request.headers.get("x-image2-user")?.trim() ||
    request.headers.get("x-seedance-user")?.trim() ||
    ""
  );
}

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

function requireSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey || !config.serviceRoleKey) {
    throw new Error("Supabase 资产同步未配置完整，请检查 URL、publishable/anon key 和 secret/service role key。");
  }
  return config;
}

async function parseSupabaseError(response: Response, fallback: string) {
  const text = await response.text().catch(() => "");
  if (!text) return fallback;

  try {
    const data = JSON.parse(text) as { error?: string; error_description?: string; message?: string };
    return data.error_description ?? data.message ?? data.error ?? fallback;
  } catch {
    return text.slice(0, 240) || fallback;
  }
}

async function getSupabaseUser(request: NextRequest): Promise<SupabaseUser> {
  const config = requireSupabaseConfig();
  const token = getBearerToken(request);
  if (!token) throw new Error("请先登录账号后再同步云端资产。");

  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(await parseSupabaseError(response, "登录状态已失效，请重新登录。"));
  }

  const user = (await response.json()) as { id?: string; email?: string };
  if (!user.id) throw new Error("无法识别当前登录账号。");

  return {
    id: user.id,
    email: user.email
  };
}

function serviceHeaders(prefer?: string) {
  const config = requireSupabaseConfig();
  const isSecretApiKey = config.serviceRoleKey.startsWith("sb_secret_");
  return {
    apikey: config.serviceRoleKey,
    ...(isSecretApiKey ? {} : { Authorization: `Bearer ${config.serviceRoleKey}` }),
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {})
  };
}

function toSupabaseAssetResponse(user: SupabaseUser, row?: SupabaseAssetRow | null) {
  const snapshot = normalizeImage2AssetSnapshot(row?.snapshot);
  const now = new Date().toISOString();

  return {
    storageMode: supabaseStorageMode,
    id: `image2_assets_${user.id}`,
    userId: user.id,
    user: {
      id: user.id,
      email: user.email
    },
    snapshot,
    createdAt: row?.created_at ?? now,
    updatedAt: row?.updated_at ?? snapshot.updatedAt ?? now
  };
}

async function readSupabaseAssets(user: SupabaseUser) {
  const config = requireSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/image2_asset_snapshots?user_id=eq.${encodeURIComponent(
      user.id
    )}&select=user_id,snapshot,created_at,updated_at&limit=1`,
    {
      headers: serviceHeaders(),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(await parseSupabaseError(response, "云端资产读取失败。"));
  }

  const rows = (await response.json()) as SupabaseAssetRow[];
  return toSupabaseAssetResponse(user, rows[0] ?? null);
}

async function writeSupabaseAssetEvent(user: SupabaseUser, snapshot: Image2AssetSnapshot) {
  const config = requireSupabaseConfig();
  const summary = {
    favorites: snapshot.favoriteCaseKeys.length,
    collections: snapshot.collections.length,
    notes: Object.keys(snapshot.notes).length,
    promptDrafts: Object.keys(snapshot.promptDrafts).length,
    promptReuseHistory: snapshot.promptReuseHistory.length
  };

  await fetch(`${config.url}/rest/v1/image2_asset_events`, {
    method: "POST",
    headers: serviceHeaders("return=minimal"),
    body: JSON.stringify({
      user_id: user.id,
      event_type: "sync_upload",
      source: "image2-cases",
      snapshot_version: snapshot.version,
      snapshot_summary: summary
    })
  }).catch(() => {
    // Asset event telemetry must never block the user's snapshot sync.
  });
}

async function saveSupabaseAssets(user: SupabaseUser, value: unknown, options: { reason?: unknown; source?: unknown } = {}) {
  const config = requireSupabaseConfig();
  const existing = await readSupabaseAssets(user);
  const snapshot = normalizeImage2AssetSnapshot(value);
  if (!snapshot.gachaState && existing.snapshot.gachaState) {
    snapshot.gachaState = existing.snapshot.gachaState;
  }
  snapshot.updatedAt = new Date().toISOString();

  const response = await fetch(
    `${config.url}/rest/v1/image2_asset_snapshots?on_conflict=user_id&select=user_id,snapshot,created_at,updated_at`,
    {
      method: "POST",
      headers: serviceHeaders("resolution=merge-duplicates,return=representation"),
      body: JSON.stringify({
        user_id: user.id,
        snapshot_version: snapshot.version,
        snapshot,
        merged_from_local_at: snapshot.updatedAt,
        updated_at: snapshot.updatedAt
      })
    }
  );

  if (!response.ok) {
    throw new Error(await parseSupabaseError(response, "云端资产保存失败。"));
  }

  const rows = (await response.json()) as SupabaseAssetRow[];
  await writeSupabaseAssetEvent(user, snapshot);
  const result = toSupabaseAssetResponse(user, rows[0] ?? { user_id: user.id, snapshot, created_at: snapshot.updatedAt, updated_at: snapshot.updatedAt });
  let changeLogWarning: string | undefined;

  try {
    await insertSupabaseImage2AssetChange({
      action: "asset_snapshot_save",
      actor: { type: "user", id: user.id, email: user.email },
      beforeSnapshot: existing.snapshot,
      afterSnapshot: result.snapshot,
      reason: typeof options.reason === "string" ? options.reason : "用户资产快照同步",
      source: typeof options.source === "string" ? options.source : "image2-cases",
      userId: user.id
    });
  } catch (error) {
    if (!isImage2AssetChangeMigrationError(error)) throw error;
    changeLogWarning = toImage2AssetChangeMigrationError(error);
  }

  return {
    ...result,
    ...(changeLogWarning ? { changeLogWarning } : {})
  };
}

export async function GET(request: NextRequest) {
  try {
    // Allow local JSON store when IMAGE2_ASSET_SYNC_BACKEND=local
    if (shouldUseSupabaseAssets()) {
      const user = await getSupabaseUser(request);
      return NextResponse.json(await readSupabaseAssets(user));
    }

    const userId = getUserId(request);
    const assets = await mutateStore((state) => getImage2AssetsForUser(state, userId));
    return NextResponse.json({
      storageMode: localStorageMode,
      ...assets
    });
  } catch (error) {
    const message = toUserFacingError(error instanceof Error ? error.message : error, "资产读取失败。");
    const status = shouldUseSupabaseAssets() && message.includes("登录") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  // Allow local JSON store when IMAGE2_ASSET_SYNC_BACKEND=local
  const body = await request.json().catch(() => ({}));

  try {
    if (shouldUseSupabaseAssets()) {
      const user = await getSupabaseUser(request);
      return NextResponse.json(await saveSupabaseAssets(user, body.snapshot, { reason: body.reason, source: body.source }));
    }

    const userId = getUserId(request, body.userId);
    const assets = await mutateStore((state) =>
      saveImage2AssetsForUser(state, userId, body.snapshot, {
        actor: { type: "user", id: userId },
        reason: typeof body.reason === "string" ? body.reason : "用户资产快照同步",
        source: typeof body.source === "string" ? body.source : "image2-cases"
      })
    );
    return NextResponse.json({
      storageMode: localStorageMode,
      ...assets
    });
  } catch (error) {
    const message = toUserFacingError(error instanceof Error ? error.message : error, "资产同步失败。");
    const status = shouldUseSupabaseAssets() && message.includes("登录") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
