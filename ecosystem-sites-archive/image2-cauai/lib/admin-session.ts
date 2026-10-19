import type { NextRequest, NextResponse } from "next/server";
import type { UnifiedAccountSession } from "@/lib/unified-auth";
import { isProductionRuntime } from "@/lib/runtime-access";

export const adminAccessCookieName = "image2_admin_access";
export const adminRefreshCookieName = "image2_admin_refresh";

export class AdminSessionError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AdminSessionError";
    this.status = status;
  }
}

function truthy(value: string | undefined) {
  return /^(1|true|yes|on)$/i.test(value?.trim() ?? "");
}

function falsey(value: string | undefined) {
  return /^(0|false|no|off)$/i.test(value?.trim() ?? "");
}

function secureCookies() {
  const configured = process.env.IMAGE2_ADMIN_COOKIE_SECURE;
  if (truthy(configured)) return true;
  if (falsey(configured)) return false;
  return isProductionRuntime();
}

const baseCookieOptions = () => ({
  httpOnly: true,
  path: "/",
  sameSite: "strict" as const,
  secure: secureCookies()
});

export function getAdminAccessToken(request: NextRequest) {
  return request.cookies.get(adminAccessCookieName)?.value?.trim() ?? "";
}

export function getAdminRefreshToken(request: NextRequest) {
  return request.cookies.get(adminRefreshCookieName)?.value?.trim() ?? "";
}

export function setAdminSessionCookies(response: NextResponse, session: UnifiedAccountSession) {
  const accessMaxAge = Math.min(Math.max(Math.floor(session.expiresIn ?? 3600), 60), 3600);
  response.cookies.set(adminAccessCookieName, session.accessToken, {
    ...baseCookieOptions(),
    maxAge: accessMaxAge
  });

  if (session.refreshToken) {
    response.cookies.set(adminRefreshCookieName, session.refreshToken, {
      ...baseCookieOptions(),
      maxAge: 60 * 60 * 24 * 30
    });
  }
}

export function clearAdminSessionCookies(response: NextResponse) {
  for (const name of [adminAccessCookieName, adminRefreshCookieName]) {
    response.cookies.set(name, "", {
      ...baseCookieOptions(),
      expires: new Date(0),
      maxAge: 0
    });
  }
}

function allowedOrigins(request: NextRequest) {
  const origins = new Set<string>([request.nextUrl.origin]);
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) {
    try {
      origins.add(new URL(appUrl).origin);
    } catch {
      // Invalid optional APP_URL values do not broaden the CSRF allowlist.
    }
  }
  return origins;
}

export function requireAdminCsrf(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.trim() ?? "";
  const breakGlass = request.headers.get("x-admin-token")?.trim() ?? "";
  if (/^Bearer\s+\S+$/i.test(bearer) || breakGlass) return;

  const origin = request.headers.get("origin")?.trim() ?? "";
  const marker = request.headers.get("x-image2-admin-csrf")?.trim() ?? "";
  if (marker !== "1" || !origin || !allowedOrigins(request).has(origin)) {
    throw new AdminSessionError("管理员请求来源验证失败，请刷新页面后重试。", 403);
  }
}
