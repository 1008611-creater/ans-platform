import crypto from "crypto";
import type { NextRequest } from "next/server";

export type TurnstileVerifySuccess = {
  disabled?: boolean;
  hostname?: string;
  mock?: boolean;
  ok: true;
};

export type TurnstileVerifyFailure = {
  code: string;
  errorCodes?: string[];
  message: string;
  ok: false;
  status: number;
};

export type TurnstileVerifyResult = TurnstileVerifySuccess | TurnstileVerifyFailure;

const siteverifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function truthy(value?: string) {
  return /^(1|true|yes|on)$/i.test(value ?? "");
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "";
}

function isProductionLike() {
  return process.env.NODE_ENV === "production" || truthy(process.env.UNIFIED_AUTH_TURNSTILE_REQUIRED);
}

function mockMode() {
  if (process.env.NODE_ENV === "production" && !truthy(process.env.UNIFIED_AUTH_ALLOW_MOCKS)) return "";
  return (process.env.UNIFIED_AUTH_TURNSTILE_MOCK ?? "").trim().toLowerCase();
}

function mockTurnstile(token: string): TurnstileVerifyResult | null {
  const mode = mockMode();
  if (!mode) return null;
  if (mode === "pass" || mode === "success" || mode === "true" || mode === "1") {
    return { ok: true, mock: true, hostname: "mock.local" };
  }
  if (mode === "fail" || mode === "failure") {
    return {
      ok: false,
      status: 403,
      code: "turnstile_mock_failed",
      message: "人机验证未通过，请刷新后重试。"
    };
  }
  if (mode === "auto") {
    return token === "smoke-pass"
      ? { ok: true, mock: true, hostname: "mock.local" }
      : {
          ok: false,
          status: 403,
          code: "turnstile_mock_failed",
          message: "人机验证未通过，请刷新后重试。"
        };
  }
  return null;
}

export async function verifyTurnstileToken(input: {
  request: NextRequest;
  token?: string;
}): Promise<TurnstileVerifyResult> {
  const token = input.token?.trim() ?? "";
  const mock = mockTurnstile(token);
  if (mock) return mock;

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim() ?? "";
  if (!secret) {
    if (isProductionLike()) {
      return {
        ok: false,
        status: 400,
        code: "turnstile_not_configured",
        message: "人机验证未配置，请先设置 TURNSTILE_SECRET_KEY。"
      };
    }

    return { ok: true, disabled: true };
  }

  if (!token) {
    return {
      ok: false,
      status: 403,
      code: "turnstile_token_missing",
      message: "请先完成人机验证。"
    };
  }

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  form.set("idempotency_key", crypto.randomUUID());
  const remoteIp = getClientIp(input.request);
  if (remoteIp) form.set("remoteip", remoteIp);

  const response = await fetch(siteverifyUrl, {
    method: "POST",
    body: form,
    cache: "no-store"
  });

  const data = (await response.json().catch(() => ({}))) as {
    "error-codes"?: string[];
    hostname?: string;
    success?: boolean;
  };

  if (!response.ok || !data.success) {
    return {
      ok: false,
      status: 403,
      code: "turnstile_failed",
      errorCodes: data["error-codes"],
      message: "人机验证未通过，请刷新后重试。"
    };
  }

  return {
    ok: true,
    hostname: data.hostname
  };
}
