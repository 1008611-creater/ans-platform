import { NextRequest, NextResponse } from "next/server";
import { adminAuthStatus, requireAdmin } from "@/lib/admin-auth";
import { readImage2AdminOverview } from "@/lib/image2-admin-overview";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

function limitFromRequest(request: NextRequest) {
  const raw = Number(request.nextUrl.searchParams.get("limit") ?? 50);
  return Math.min(Math.max(Number.isFinite(raw) ? Math.floor(raw) : 50, 1), 200);
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const overview = await readImage2AdminOverview();
    const response = NextResponse.json({
      resourceStatus: overview.users.status,
      storageMode: overview.storageMode,
      totals: { users: overview.users.total },
      users: overview.users.recent.slice(0, limitFromRequest(request)).map((user) => ({
        createdAt: user.createdAt,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        userId: user.id
      }))
    });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (error) {
    const response = NextResponse.json(
      { error: toUserFacingError(error instanceof Error ? error.message : error, "用户列表读取失败。") },
      { status: adminAuthStatus(error, 503) }
    );
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }
}
