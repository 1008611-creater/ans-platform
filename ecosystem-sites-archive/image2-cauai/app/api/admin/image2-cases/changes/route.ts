import { NextRequest, NextResponse } from "next/server";
import { adminAuthStatus, requireAdmin } from "@/lib/admin-auth";
import {
  listSupabaseImage2AssetChanges,
  shouldUseSupabaseImage2Assets,
  toImage2AssetChangeMigrationError,
  undoSupabaseImage2AssetChange
} from "@/lib/image2-asset-change-log";
import {
  listImage2AssetChanges,
  mutateStore,
  undoImage2AssetChange
} from "@/lib/store";
import { toUserFacingError } from "@/lib/user-facing-error";
import { requireAdminCsrf } from "@/lib/admin-session";

export const runtime = "nodejs";

const localStorageMode = process.env.VERCEL ? "temporary-vercel-runtime" : "local-json-store";
const supabaseStorageMode = "supabase-postgres";

function limitFromRequest(request: NextRequest) {
  const raw = Number(request.nextUrl.searchParams.get("limit") ?? 30);
  return Math.min(Math.max(Number.isFinite(raw) ? Math.floor(raw) : 30, 1), 100);
}

function statusForError(error: unknown, fallbackStatus: number) {
  return adminAuthStatus(error, fallbackStatus);
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const limit = limitFromRequest(request);

    if (shouldUseSupabaseImage2Assets()) {
      const changes = await listSupabaseImage2AssetChanges(limit);
      return NextResponse.json({
        changes,
        storageMode: supabaseStorageMode
      });
    }

    const changes = await mutateStore((state) => listImage2AssetChanges(state, limit));
    return NextResponse.json({
      changes,
      storageMode: localStorageMode
    });
  } catch (error) {
    const message = toUserFacingError(toImage2AssetChangeMigrationError(error), "变更记录读取失败。");
    return NextResponse.json({ error: message }, { status: statusForError(error, 400) });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireAdminCsrf(request);
    const admin = await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const changeId = typeof body.changeId === "string" ? body.changeId.trim() : "";
    if (!changeId) throw new Error("缺少要撤销的变更记录。");

    const adminId = admin.id;

    if (shouldUseSupabaseImage2Assets()) {
      const result = await undoSupabaseImage2AssetChange(changeId, adminId);
      return NextResponse.json({
        ...result,
        storageMode: supabaseStorageMode
      });
    }

    const result = await mutateStore((state) => undoImage2AssetChange(state, changeId, adminId));
    return NextResponse.json({
      ...result,
      storageMode: localStorageMode
    });
  } catch (error) {
    const message = toUserFacingError(toImage2AssetChangeMigrationError(error), "变更记录撤销失败。");
    return NextResponse.json({ error: message }, { status: statusForError(error, 400) });
  }
}
