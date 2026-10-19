import { NextRequest, NextResponse } from "next/server";
import { adminAuthStatus, requireAdmin } from "@/lib/admin-auth";
import {
  clearAdminSessionCookies,
  getAdminAccessToken,
  getAdminRefreshToken,
  requireAdminCsrf
} from "@/lib/admin-session";
import { toUserFacingError } from "@/lib/user-facing-error";
import { revokeSupabaseSession } from "@/lib/unified-auth";

export const runtime = "nodejs";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function GET(request: NextRequest) {
  const accessToken = getAdminAccessToken(request);
  const canRefresh = Boolean(getAdminRefreshToken(request));
  if (!accessToken) {
    return noStore(NextResponse.json({ authenticated: false, canRefresh }));
  }

  try {
    const identity = await requireAdmin(request);
    return noStore(NextResponse.json({ authenticated: true, identity }));
  } catch (error) {
    const status = adminAuthStatus(error, 401);
    const response = NextResponse.json(
      {
        authenticated: false,
        canRefresh,
        error: toUserFacingError(error instanceof Error ? error.message : error, "管理员登录状态读取失败。")
      },
      { status: status === 403 ? 403 : 200 }
    );
    return noStore(response);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    requireAdminCsrf(request);
    const token = getAdminAccessToken(request);
    if (token) await revokeSupabaseSession(token).catch(() => undefined);
    const response = NextResponse.json({ authenticated: false, ok: true });
    clearAdminSessionCookies(response);
    return noStore(response);
  } catch (error) {
    return noStore(
      NextResponse.json(
        { error: toUserFacingError(error instanceof Error ? error.message : error, "退出管理员账号失败。") },
        { status: 403 }
      )
    );
  }
}
