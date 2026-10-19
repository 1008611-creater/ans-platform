import { NextRequest, NextResponse } from "next/server";
import { adminAuthStatus, requireAdmin } from "@/lib/admin-auth";
import { listPictureAdminOverview } from "@/lib/picture-admin";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

function limitFromRequest(request: NextRequest) {
  const raw = Number(request.nextUrl.searchParams.get("limit") ?? 80);
  return Math.min(Math.max(Number.isFinite(raw) ? Math.floor(raw) : 80, 1), 200);
}

function statusForError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const authStatus = adminAuthStatus(error, 0);
  if (authStatus) return authStatus;
  return 400;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return NextResponse.json(await listPictureAdminOverview(limitFromRequest(request)));
  } catch (error) {
    return NextResponse.json(
      { error: toUserFacingError(error instanceof Error ? error.message : error, "制图台管理数据读取失败。") },
      { status: statusForError(error) }
    );
  }
}
