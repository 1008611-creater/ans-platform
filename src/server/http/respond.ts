import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * 统一 API 响应。
 *
 * 成功：`{ ok: true, data, requestId }`
 * 失败：`{ ok: false, error: { code, message, details? }, requestId }`
 *
 * 所有路由都从这里返回，客户端只需要处理一种信封结构。
 */

export function requestId(): string {
  return crypto.randomUUID();
}

export function ok<T>(data: T, init?: { status?: number; requestId?: string }) {
  return NextResponse.json(
    { ok: true, data, requestId: init?.requestId ?? requestId() },
    { status: init?.status ?? 200, headers: { "Cache-Control": "no-store" } },
  );
}

export function fail(
  code: string,
  message: string,
  init?: { status?: number; details?: unknown; requestId?: string },
) {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message, ...(init?.details === undefined ? {} : { details: init.details }) },
      requestId: init?.requestId ?? requestId(),
    },
    { status: init?.status ?? 400, headers: { "Cache-Control": "no-store" } },
  );
}

/** 服务层错误统一带 `code` 与 `status` 字段，可被直接映射为响应。 */
export type CodedError = Error & { code?: string; status?: number };

export function isCodedError(error: unknown): error is CodedError {
  return error instanceof Error && typeof (error as CodedError).status === "number";
}

export function respondWithError(error: unknown, fallbackMessage = "服务暂时不可用，请稍后再试。") {
  if (isCodedError(error)) {
    return fail(error.code ?? "ERROR", error.message, { status: error.status ?? 400 });
  }
  if (error instanceof ZodError) {
    return fail("INVALID_INPUT", "请求参数不正确。", { status: 400, details: error.issues });
  }
  if (error instanceof SyntaxError) {
    return fail("INVALID_JSON", "请求体不是有效 JSON。", { status: 400 });
  }
  console.error("API 请求失败", error);
  return fail("INTERNAL_ERROR", fallbackMessage, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw Object.assign(new SyntaxError("请求体不是有效 JSON。"), { status: 400, code: "INVALID_JSON" });
  }
}
