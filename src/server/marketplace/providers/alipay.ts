import { z } from "zod";
import type { MarketProviderEvent } from "@/contracts/marketplace";
import { type CashPaymentProvider, type CashCheckoutInput, type CashRefundInput, cashOrigin, fenToYuan, keyFromFile, merchantOrderId, providerFailure, providerFetch, requiredEnv, rsaSign, rsaVerify, webhookUrl, yuanToFen } from "./common";

export function alipayCanonical(params: Record<string, string>, notification = false) {
  return Object.keys(params).filter(key => key !== "sign" && (!notification || key !== "sign_type") && params[key] !== "").sort().map(key => `${key}=${params[key]}`).join("&");
}
/** Extract the exact signed JSON bytes, rejecting ambiguous duplicate top-level names. */
export function alipaySignedResponse(raw: string, responseKey: string): { payload: string; signature: string } {
  JSON.parse(raw);
  let i = 0; const skip = () => { while (/\s/.test(raw[i] ?? "") && i < raw.length) i++; };
  function stringEnd() { i++; while (i < raw.length) { const ch = raw[i++]; if (ch === "\\") i++; else if (ch === '"') return; } throw providerFailure(); }
  function valueEnd() {
    skip(); if (raw[i] === '"') { stringEnd(); return; }
    if (raw[i] === "{" || raw[i] === "[") { const close = raw[i++] === "{" ? "}" : "]"; skip(); while (raw[i] !== close) { if (raw[i] === '"') stringEnd(); else if (raw[i] === "{" || raw[i] === "[") valueEnd(); else i++; if (i >= raw.length) throw providerFailure(); } i++; return; }
    while (i < raw.length && ![",", "}"].includes(raw[i])) i++;
  }
  const fields = new Map<string, string>(); skip(); if (raw[i++] !== "{") throw providerFailure(); skip();
  while (raw[i] !== "}") { const keyStart = i; if (raw[i] !== '"') throw providerFailure(); stringEnd(); const key = JSON.parse(raw.slice(keyStart, i)) as string; skip(); if (raw[i++] !== ":" || fields.has(key)) throw providerFailure("INVALID_PROVIDER_SIGNATURE", 400); skip(); const start = i; valueEnd(); fields.set(key, raw.slice(start, i).trim()); skip(); if (raw[i] === ",") { i++; skip(); } else if (raw[i] !== "}") throw providerFailure(); }
  const payload = fields.get(responseKey); const signature = fields.get("sign");
  if (!payload || !signature || !payload.startsWith("{")) throw providerFailure("INVALID_PROVIDER_SIGNATURE", 400);
  const parsedSign: unknown = JSON.parse(signature); if (typeof parsedSign !== "string") throw providerFailure("INVALID_PROVIDER_SIGNATURE", 400);
  return { payload, signature: parsedSign };
}
const tradeSchema = z.object({ out_trade_no: z.string(), trade_no: z.string().optional(), total_amount: z.string(), trade_status: z.string(), seller_id: z.string().optional(), app_id: z.string().optional() });
export class AlipayMarketProvider implements CashPaymentProvider {
  readonly provider = "alipay" as const;
  private readonly appid = requiredEnv("ANS_ALIPAY_APP_ID");
  private readonly sellerId = requiredEnv("ANS_ALIPAY_SELLER_ID");
  private readonly privateKey = keyFromFile("ANS_ALIPAY_PRIVATE_KEY_FILE", "private");
  private readonly publicKey = keyFromFile("ANS_ALIPAY_PUBLIC_KEY_FILE", "public");
  constructor() { if (!/^\d{16,32}$/.test(this.appid) || !/^2088\d{12}$/.test(this.sellerId)) throw providerFailure("PAYMENT_NOT_CONFIGURED", 503); webhookUrl(this.provider); }
  private params(method: string, biz: unknown, extra: Record<string, string> = {}) {
    const params: Record<string, string> = { app_id: this.appid, method, format: "JSON", charset: "utf-8", sign_type: "RSA2", timestamp: new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 19).replace("T", " "), version: "1.0", biz_content: JSON.stringify(biz), ...extra };
    params.sign = rsaSign(alipayCanonical(params), this.privateKey); return params;
  }
  private async request(method: string, biz: unknown) {
    const { response, text } = await providerFetch("https://openapi.alipay.com/gateway.do", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" }, body: new URLSearchParams(this.params(method, biz)).toString() });
    if (!response.ok) throw providerFailure();
    const verified = alipaySignedResponse(text, `${method.replaceAll(".", "_")}_response`);
    rsaVerify(verified.payload, verified.signature, this.publicKey);
    const value: unknown = JSON.parse(verified.payload); const status = z.object({ code: z.string() }).parse(value);
    if (status.code !== "10000") throw providerFailure(); return value;
  }
  private paymentEvent(value: unknown, eventId?: string): MarketProviderEvent | null {
    const result = tradeSchema.parse(value);
    if ((result.seller_id && result.seller_id !== this.sellerId) || (result.app_id && result.app_id !== this.appid)) throw providerFailure("PROVIDER_MERCHANT_MISMATCH", 400);
    if (!["TRADE_SUCCESS", "TRADE_FINISHED"].includes(result.trade_status)) return null;
    if (!result.trade_no) throw providerFailure("INVALID_PROVIDER_EVENT", 400);
    return { provider: this.provider, eventId: eventId ?? `query-payment:${result.trade_no}`, orderId: merchantOrderId(result.out_trade_no), paymentId: result.trade_no, type: "payment_succeeded", amountMinor: yuanToFen(result.total_amount), currency: "CNY" };
  }
  async createCheckout(input: CashCheckoutInput) {
    if (input.currency !== "CNY") throw providerFailure("INVALID_PROVIDER_AMOUNT", 400);
    const params = this.params("alipay.trade.page.pay", { out_trade_no: merchantOrderId(input.orderId), seller_id: this.sellerId, product_code: "FAST_INSTANT_TRADE_PAY", total_amount: fenToYuan(input.amountMinor), subject: Array.from(input.title).slice(0, 100).join(""), timeout_express: "30m" }, { notify_url: webhookUrl(this.provider), return_url: `${cashOrigin()}/market/orders/${input.orderId}` });
    return { provider: this.provider, mode: "redirect" as const, url: `https://openapi.alipay.com/gateway.do?${new URLSearchParams(params)}`, expiresAt: new Date(Date.now() + 30 * 60_000).toISOString() };
  }
  async verifyWebhook(body: string, headers: Headers) {
    if (!(headers.get("content-type") ?? "").toLowerCase().startsWith("application/x-www-form-urlencoded")) throw providerFailure("INVALID_PROVIDER_EVENT", 400);
    const params: Record<string, string> = Object.create(null);
    for (const [key, value] of new URLSearchParams(body)) { if (Object.hasOwn(params, key)) throw providerFailure("INVALID_PROVIDER_SIGNATURE", 400); params[key] = value; }
    if (params.sign_type !== "RSA2") throw providerFailure("INVALID_PROVIDER_SIGNATURE", 400);
    rsaVerify(alipayCanonical(params, true), params.sign ?? "", this.publicKey);
    if (params.app_id !== this.appid || params.seller_id !== this.sellerId || !params.notify_id) throw providerFailure("PROVIDER_MERCHANT_MISMATCH", 400);
    // Refund notifications are not proof of refund completion; use the authenticated query.
    if (params.refund_fee || params.gmt_refund) return null;
    return this.paymentEvent(params, params.notify_id);
  }
  async queryPayment(orderId: string) {
    const result = await this.request("alipay.trade.query", { out_trade_no: merchantOrderId(orderId) });
    if (tradeSchema.parse(result).out_trade_no !== orderId) throw providerFailure("INVALID_PROVIDER_EVENT", 400);
    return this.paymentEvent(result);
  }
  async queryRefund(input: CashRefundInput) {
    const value = z.object({ trade_no: z.string().optional(), out_trade_no: z.string().optional(), out_request_no: z.string().optional(), refund_status: z.string().optional(), refund_amount: z.string().optional(), total_amount: z.string().optional() }).parse(await this.request("alipay.trade.fastpay.refund.query", { out_trade_no: merchantOrderId(input.orderId), trade_no: input.paymentId, out_request_no: input.refundRequestId }));
    if (value.refund_status !== "REFUND_SUCCESS") return null;
    if (value.trade_no !== input.paymentId || value.out_trade_no !== input.orderId || value.out_request_no !== input.refundRequestId || yuanToFen(value.refund_amount) !== input.amountMinor || yuanToFen(value.total_amount) !== input.amountMinor || input.currency !== "CNY") throw providerFailure("INVALID_PROVIDER_EVENT", 400);
    const refundId = `${input.paymentId}:${input.refundRequestId}`;
    return { provider: this.provider, eventId: `query-refund:${input.refundRequestId}`, orderId: input.orderId, paymentId: input.paymentId, type: "refund_succeeded" as const, refundId, refundRequestId: input.refundRequestId, amountMinor: input.amountMinor, currency: input.currency };
  }
  async requestRefund(input: CashRefundInput) {
    const paid = await this.queryPayment(input.orderId);
    if (!paid || paid.paymentId !== input.paymentId || paid.amountMinor !== input.amountMinor || paid.currency !== input.currency) throw providerFailure("PAYMENT_RECONCILIATION_REQUIRED", 409);
    const result = z.object({ trade_no: z.string(), out_trade_no: z.string(), refund_fee: z.string() }).parse(await this.request("alipay.trade.refund", { out_trade_no: input.orderId, trade_no: input.paymentId, out_request_no: input.refundRequestId, refund_amount: fenToYuan(input.amountMinor), refund_reason: "ANS order refund" }));
    if (result.trade_no !== input.paymentId || result.out_trade_no !== input.orderId || yuanToFen(result.refund_fee) !== input.amountMinor) throw providerFailure("INVALID_PROVIDER_EVENT", 400);
    return null;
  }
}
