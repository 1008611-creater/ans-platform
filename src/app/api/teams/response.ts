import { NextResponse } from "next/server";
import { TeamError } from "@/lib/team-service";

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
  return (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (origin !== null && origin !== new URL(request.url).origin)
  );
}

export async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}
