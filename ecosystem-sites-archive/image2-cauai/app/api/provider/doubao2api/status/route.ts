import { NextResponse } from "next/server";
import { hiddenRouteResponse, isLegacySeedanceApiEnabled } from "@/lib/runtime-access";

export const runtime = "nodejs";

type AccountPayload = {
  id?: unknown;
  baseUrl?: unknown;
  reachable?: unknown;
  inFlight?: unknown;
  cooldownUntil?: unknown;
  loginRequiredUntil?: unknown;
  lastError?: unknown;
  payload?: {
    status?: unknown;
    logged_in?: unknown;
    needs_captcha?: unknown;
    last_error_code?: unknown;
  };
};

type PoolPayload = {
  cooldownUntil?: unknown;
  lastError?: unknown;
  lastRateLimitAt?: unknown;
};

const defaultDoubao2ApiBase = "http://127.0.0.1:7872/v1";

export async function GET() {
  if (!isLegacySeedanceApiEnabled()) return hiddenRouteResponse();
  const baseUrl = doubao2ApiBase();
  const rootUrl = baseUrl.replace(/\/v1$/i, "");

  try {
    const response = await fetch(`${rootUrl}/healthz`, {
      headers: doubao2ApiHeaders(),
      cache: "no-store"
    });
    const payload = await response.json().catch(() => ({}));
    const accounts = Array.isArray(payload?.provider?.upstream?.accounts)
      ? payload.provider.upstream.accounts.map(normalizeAccount)
      : [];

    return NextResponse.json({
      configured: Boolean(payload?.provider?.configured),
      reachable: response.ok && Boolean(payload?.provider?.upstream?.reachable),
      providerType: stringValue(payload?.provider?.type),
      rootUrl,
      pool: normalizePool(payload?.provider?.upstream?.pool),
      accounts
    });
  } catch (error) {
    return NextResponse.json({
      configured: false,
      reachable: false,
      providerType: "doubao2api-proxy",
      rootUrl,
      error: error instanceof Error ? error.message : "doubao2api 状态读取失败。",
      pool: {},
      accounts: []
    });
  }
}

function normalizeAccount(account: AccountPayload) {
  const baseUrl = stringValue(account?.baseUrl);
  const rootUrl = baseUrl.replace(/\/v1$/i, "");
  const loggedIn = Boolean(account?.payload?.logged_in);
  const needsCaptcha = Boolean(account?.payload?.needs_captcha);
  const cooldownUntil = numberValue(account?.cooldownUntil);
  const loginRequiredUntil = numberValue(account?.loginRequiredUntil);

  return {
    id: stringValue(account?.id) || "account",
    baseUrl,
    adminUrl: rootUrl ? `${rootUrl}/admin?tab=login&auto_qr=1` : "",
    reachable: Boolean(account?.reachable),
    loggedIn,
    status: stringValue(account?.payload?.status) || (loggedIn ? "ok" : "not_ready"),
    needsCaptcha,
    inFlight: Boolean(account?.inFlight),
    cooldownUntil,
    loginRequiredUntil,
    lastError: safeProviderError(account?.lastError),
    lastErrorCode: numberValue(account?.payload?.last_error_code)
  };
}

function normalizePool(pool: PoolPayload | undefined) {
  return {
    cooldownUntil: numberValue(pool?.cooldownUntil),
    lastError: safeProviderError(pool?.lastError),
    lastRateLimitAt: numberValue(pool?.lastRateLimitAt)
  };
}

function doubao2ApiBase() {
  return (process.env.DOUBAO2API_PROXY_BASE_URL ?? process.env.DOUBAO2API_BASE_URL ?? defaultDoubao2ApiBase).replace(/\/+$/, "");
}

function doubao2ApiHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/json"
  };
  const key = process.env.DOUBAO2API_API_KEY?.trim();
  if (key) headers.Authorization = `Bearer ${key}`;
  return headers;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function safeProviderError(value: unknown) {
  const message = stringValue(value);
  if (!message) return "";
  if (/710022002|当前服务访问频繁|访问频繁/.test(message)) return "豆包当前服务访问频繁，请稍后重试。";
  if (/710022004|rate limited|verify/i.test(message)) return "豆包触发风控验证或限流，请稍后重试。";
  return message.length > 120 ? `${message.slice(0, 120)}...` : message;
}
