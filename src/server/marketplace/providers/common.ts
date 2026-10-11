import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { MarketRuleError } from "@/domain/marketplace/order";
import type { MarketProviderEvent } from "@/contracts/marketplace";

export type CashProvider = "wechat" | "alipay";
export type CashCheckoutInput = { orderId: string; amountMinor: number; currency: string; title: string };
export type CashCheckout = { provider: CashProvider; mode: "qr" | "redirect"; url: string; expiresAt: string };
export type CashRefundInput = { orderId: string; paymentId: string; refundRequestId: string; amountMinor: number; currency: string };
export interface CashPaymentProvider {
  readonly provider: CashProvider;
  createCheckout(input: CashCheckoutInput): Promise<CashCheckout>;
  verifyWebhook(body: string, headers: Headers): Promise<MarketProviderEvent | null>;
  queryPayment(orderId: string): Promise<MarketProviderEvent | null>;
  requestRefund(input: CashRefundInput): Promise<MarketProviderEvent | null>;
  queryRefund(input: CashRefundInput): Promise<MarketProviderEvent | null>;
}
export const providerFailure = (code = "PAYMENT_PROVIDER_UNAVAILABLE", status = 502) => new MarketRuleError(code, status);
export function requiredEnv(name: string) { const value = process.env[name]?.trim(); if (!value) throw providerFailure("PAYMENT_NOT_CONFIGURED", 503); return value; }
export function keyFromFile(name: string, kind: "private" | "public") {
  try { const text = readFileSync(requiredEnv(name), "utf8"); const key = kind === "private" ? createPrivateKey(text) : createPublicKey(text);
    if (key.asymmetricKeyType !== "rsa" || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) throw new Error(); return key;
  } catch { throw providerFailure("PAYMENT_NOT_CONFIGURED", 503); }
}
export function rsaSign(text: string, key: ReturnType<typeof createPrivateKey>) { return sign("RSA-SHA256", Buffer.from(text, "utf8"), key).toString("base64"); }
export function rsaVerify(text: string, signature: string, key: ReturnType<typeof createPublicKey>) {
  if (!signature || !/^[A-Za-z0-9+/]+={0,2}$/.test(signature)) throw providerFailure("INVALID_PROVIDER_SIGNATURE", 400);
  try { if (!verify("RSA-SHA256", Buffer.from(text, "utf8"), key, Buffer.from(signature, "base64"))) throw new Error(); }
  catch { throw providerFailure("INVALID_PROVIDER_SIGNATURE", 400); }
}
export function merchantOrderId(value: string) {
  // Prisma cuid values are short enough for both providers. Never truncate or alias an order ID.
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(value)) throw providerFailure("INVALID_PROVIDER_ORDER", 400); return value;
}
export function minorAmount(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > 100_000_000) throw providerFailure("INVALID_PROVIDER_AMOUNT", 400); return Number(value);
}
export function fenToYuan(value: number) { minorAmount(value); return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`; }
export function yuanToFen(value: unknown) {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,6})(\.\d{1,2})?$/.test(value)) throw providerFailure("INVALID_PROVIDER_AMOUNT", 400);
  const [whole, fraction = ""] = value.split("."); return minorAmount(Number(whole) * 100 + Number(fraction.padEnd(2, "0")));
}
export function cashOrigin() { const url = new URL(requiredEnv("ANS_MARKET_CASH_ORIGIN"));
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash || ["localhost", "127.0.0.1", "::1"].includes(url.hostname)) throw providerFailure("PAYMENT_NOT_CONFIGURED", 503);
  return url.origin;
}
export function webhookUrl(provider: CashProvider) { return `${cashOrigin()}/api/market/payments/${provider}/webhook`; }
export async function providerFetch(url: string, init: RequestInit) {
  try { const response = await fetch(url, { ...init, signal: AbortSignal.timeout(12_000), redirect: "error", cache: "no-store" });
    if (Number(response.headers.get("content-length")) > 128_000) throw providerFailure();
    const text = await response.text(); if (Buffer.byteLength(text, "utf8") > 128_000) throw providerFailure(); return { response, text };
  } catch { throw providerFailure(); }
}
