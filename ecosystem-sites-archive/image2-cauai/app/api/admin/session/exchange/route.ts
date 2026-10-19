import { NextRequest, NextResponse } from "next/server";
import { adminAuthStatus, requireAdminUser } from "@/lib/admin-auth";
import { AdminSessionError, clearAdminSessionCookies, requireAdminCsrf, setAdminSessionCookies } from "@/lib/admin-session";
import { getSupabaseUserFromAccessToken } from "@/lib/image2-membership";
import { refreshSupabaseSession, type UnifiedAccountSession } from "@/lib/unified-auth";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

function boundedToken(value: unknown, required: boolean) {
  const token = typeof value === "string" ? value.trim() : "";
  if (required && !token) throw new AdminSessionError("登录链接缺少访问令牌。", 400);
  if (token.length > 12_000) throw new AdminSessionError("登录令牌格式不正确。", 400);
  return token;
}

export async function POST(request: NextRequest) {
  try {
    requireAdminCsrf(request);
    const body = await request.json().catch(() => ({}));
    const accessToken = boundedToken(body.accessToken, true);
    const refreshToken = boundedToken(body.refreshToken, false) || undefined;
    const expiresInValue = Number(body.expiresIn);
    const expiresIn = Number.isFinite(expiresInValue) ? Math.min(Math.max(Math.floor(expiresInValue), 60), 3600) : 3600;
    let session: UnifiedAccountSession;
    try {
      const user = await getSupabaseUserFromAccessToken(accessToken, "管理员登录链接已失效，请重新发送。" );
      session = { accessToken, expiresIn, refreshToken, user };
    } catch (error) {
      if (!refreshToken) throw error;
      session = await refreshSupabaseSession(refreshToken);
    }
    const identity = await requireAdminUser(session.user);
    const response = NextResponse.json({ admin: true, identity });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    setAdminSessionCookies(response, session);
    return response;
  } catch (error) {
    const response = NextResponse.json(
      { error: toUserFacingError(error instanceof Error ? error.message : error, "管理员登录链接验证失败。") },
      { status: error instanceof AdminSessionError ? error.status : adminAuthStatus(error, 401) }
    );
    response.headers.set("Cache-Control", "no-store, max-age=0");
    clearAdminSessionCookies(response);
    return response;
  }
}
