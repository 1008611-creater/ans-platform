import { NextResponse } from "next/server";
import { TeamError } from "@/server/teams/service";

// 团队接口统一响应：禁止缓存；错误码与 HTTP 状态分离，内部异常不落到响应体。
export function teamJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function teamFailure(error: unknown) {
  if (error instanceof TeamError) {
    return teamJson({ error: error.code, message: error.message }, error.status);
  }
  console.error("团队接口异常", error);
  return teamJson({ error: "server_error", message: "操作失败，请稍后重试" }, 500);
}

// 写操作的同源校验：跨站请求直接拒绝，避免 CSRF 式误操作。
export function isCrossSite(request: Request) {
  const origin = request.headers.get("origin");
  const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();

  // A browser embedded behind a reverse proxy can report cross-site fetch
  // metadata while still sending the application's exact Origin. Prefer the
  // explicit Origin check and only fall back to fetch metadata when Origin is absent.
  if (!origin) return secFetchSite === "cross-site";

  const requestUrl = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const proxyOrigin = forwardedHost
    ? `${forwardedProto || requestUrl.protocol.replace(":", "")}://${forwardedHost}`
    : null;
  const configuredOrigins = [process.env.AUTH_URL, process.env.NEXTAUTH_URL, process.env.NEXT_PUBLIC_APP_URL]
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value as string).origin;
      } catch {
        return null;
      }
    })
    .filter((value): value is string => Boolean(value));

  const allowedOrigins = new Set([requestUrl.origin, proxyOrigin, ...configuredOrigins].filter(Boolean));
  return !allowedOrigins.has(origin);
}

export async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}
