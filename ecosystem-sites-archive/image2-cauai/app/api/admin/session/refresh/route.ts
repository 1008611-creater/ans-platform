import { NextRequest, NextResponse } from "next/server";
import { adminAuthStatus, requireAdminUser } from "@/lib/admin-auth";
import {
  AdminSessionError,
  clearAdminSessionCookies,
  getAdminRefreshToken,
  requireAdminCsrf,
  setAdminSessionCookies
} from "@/lib/admin-session";
import { refreshSupabaseSession } from "@/lib/unified-auth";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    requireAdminCsrf(request);
    const session = await refreshSupabaseSession(getAdminRefreshToken(request));
    const identity = await requireAdminUser(session.user);
    const response = NextResponse.json({ authenticated: true, identity });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    setAdminSessionCookies(response, session);
    return response;
  } catch (error) {
    const response = NextResponse.json(
      {
        authenticated: false,
        error: toUserFacingError(error instanceof Error ? error.message : error, "管理员会话刷新失败，请重新登录。")
      },
      { status: error instanceof AdminSessionError ? error.status : adminAuthStatus(error, 401) }
    );
    response.headers.set("Cache-Control", "no-store, max-age=0");
    clearAdminSessionCookies(response);
    return response;
  }
}
