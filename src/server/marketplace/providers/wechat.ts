import { createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import type { MarketProviderEvent } from "@/contracts/marketplace";
import { type CashPaymentProvider, type CashCheckoutInput, type CashRefundInput, keyFromFile, merchantOrderId, minorAmount, providerFailure, providerFetch, requiredEnv, rsaSign, rsaVerify, webhookUrl } from "./common";

const tradeSchema = z.object({ appid: z.string(), mchid: z.string(), out_trade_no: z.string(), transaction_id: z.string().optional(), trade_state: z.string(), amount: z.object({ total: z.number().int(), currency: z.literal("CNY") }) });
const refundSchema = z.object({ mchid: z.string().optional(), out_trade_no: z.string(), transaction_id: z.string(), refund_id: z.string(), out_refund_no: z.string(), status: z.string().optional(), refund_status: z.string().optional(), amount: z.object({ total: z.number().int(), refund: z.number().int(), currency: z.literal("CNY").optional() }) });
const notificationSchema = z.object({ id: z.string().min(1).max(120), event_type: z.string(), resource_type: z.literal("encrypt-resource"), resource: z.object({ algorithm: z.literal("AEAD_AES_256_GCM"), ciphertext: z.string(), nonce: z.string(), associated_data: z.string().optional() }) });

export class WechatMarketProvider implements CashPaymentProvider {
  readonly provider = "wechat" as const;
  private readonly mchid = requiredEnv("ANS_WECHAT_MCH_ID");
  private readonly appid = requiredEnv("ANS_WECHAT_APP_ID");
  private readonly serial = requiredEnv("ANS_WECHAT_CERT_SERIAL");
  private readonly publicId = requiredEnv("ANS_WECHAT_PUBLIC_KEY_ID");
  private readonly privateKey = keyFromFile("ANS_WECHAT_PRIVATE_KEY_FILE", "private");
  private readonly publicKey = keyFromFile("ANS_WECHAT_PUBLIC_KEY_FILE", "public");
  private readonly apiKey = Buffer.from(requiredEnv("ANS_WECHAT_API_V3_KEY"), "utf8");
  constructor() {
    if (!/^\d{6,32}$/.test(this.mchid) || !/^wx[a-zA-Z0-9]{8,30}$/.test(this.appid) || !/^[A-Fa-f0-9]{8,64}$/.test(this.serial) || !/^PUB_KEY_ID_[A-Za-z0-9_]+$/.test(this.publicId) || this.apiKey.length !== 32) throw providerFailure("PAYMENT_NOT_CONFIGURED", 503);
    webhookUrl(this.provider);
  }
  private verifySigned(body: string, headers: Headers) {
    const timestamp = headers.get("Wechatpay-Timestamp") ?? ""; const nonce = headers.get("Wechatpay-Nonce") ?? "";
    if (headers.get("Wechatpay-Serial") !== this.publicId || !/^\d{10,12}$/.test(timestamp) || !nonce || nonce.length > 128 || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw providerFailure("INVALID_PROVIDER_SIGNATURE", 400);
    rsaVerify(`${timestamp}\n${nonce}\n${body}\n`, headers.get("Wechatpay-Signature") ?? "", this.publicKey);
  }
  private async request(method: "GET" | "POST", path: string, payload?: unknown) {
    const body = payload === undefined ? "" : JSON.stringify(payload); const timestamp = String(Math.floor(Date.now() / 1000)); const nonce = randomBytes(24).toString("hex");
    const signature = rsaSign(`${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`, this.privateKey);
    const { response, text } = await providerFetch(`https://api.mch.weixin.qq.com${path}`, { method, headers: { "Content-Type": "application/json", Accept: "application/json", "Wechatpay-Serial": this.publicId, Authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchid}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${this.serial}",signature="${signature}"` }, ...(body ? { body } : {}) });
    // Non-success errors are never treated as signed payment evidence or shown to clients.
    if (!response.ok) throw providerFailure();
    this.verifySigned(text, response.headers);
    try { return JSON.parse(text) as unknown; } catch { throw providerFailure(); }
  }
  private paymentEvent(value: unknown, eventId?: string): MarketProviderEvent | null {
    const result = tradeSchema.parse(value);
    if (result.mchid !== this.mchid || result.appid !== this.appid) throw providerFailure("PROVIDER_MERCHANT_MISMATCH", 400);
    if (result.trade_state !== "SUCCESS") return null;
    if (!result.transaction_id) throw providerFailure("INVALID_PROVIDER_EVENT", 400);
    return { provider: this.provider, eventId: eventId ?? `query-payment:${result.transaction_id}`, orderId: merchantOrderId(result.out_trade_no), paymentId: result.transaction_id, type: "payment_succeeded", amountMinor: minorAmount(result.amount.total), currency: result.amount.currency };
  }
  private refundEvent(value: unknown, eventId?: string): MarketProviderEvent | null {
    const result = refundSchema.parse(value);
    if (result.mchid && result.mchid !== this.mchid) throw providerFailure("PROVIDER_MERCHANT_MISMATCH", 400);
    if ((result.refund_status ?? result.status) !== "SUCCESS") return null;
    // Partial refunds require an additional ledger model; this product supports full return only.
    if (result.amount.total !== result.amount.refund) throw providerFailure("INVALID_PROVIDER_AMOUNT", 400);
    return { provider: this.provider, eventId: eventId ?? `query-refund:${result.refund_id}`, orderId: merchantOrderId(result.out_trade_no), paymentId: result.transaction_id, type: "refund_succeeded", refundId: result.refund_id, refundRequestId: result.out_refund_no, amountMinor: minorAmount(result.amount.refund), currency: "CNY" };
  }
  async createCheckout(input: CashCheckoutInput) {
    if (input.currency !== "CNY") throw providerFailure("INVALID_PROVIDER_AMOUNT", 400);
    const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
    const result = z.object({ code_url: z.string().max(2048).startsWith("weixin://wxpay/bizpayurl?") }).parse(await this.request("POST", "/v3/pay/transactions/native", { appid: this.appid, mchid: this.mchid, out_trade_no: merchantOrderId(input.orderId), description: Array.from(input.title).slice(0, 40).join(""), notify_url: webhookUrl(this.provider), time_expire: expiresAt, amount: { total: minorAmount(input.amountMinor), currency: "CNY" } }));
    return { provider: this.provider, mode: "qr" as const, url: result.code_url, expiresAt };
  }
  async verifyWebhook(body: string, headers: Headers) {
    this.verifySigned(body, headers);
    const notification = notificationSchema.parse(JSON.parse(body));
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(notification.resource.ciphertext)) throw providerFailure("INVALID_PROVIDER_EVENT", 400);
    const encrypted = Buffer.from(notification.resource.ciphertext, "base64"); if (encrypted.length < 17 || Buffer.byteLength(notification.resource.nonce) !== 12) throw providerFailure("INVALID_PROVIDER_EVENT", 400);
    let decrypted: unknown;
    try { const cipher = createDecipheriv("aes-256-gcm", this.apiKey, Buffer.from(notification.resource.nonce)); cipher.setAuthTag(encrypted.subarray(-16)); cipher.setAAD(Buffer.from(notification.resource.associated_data ?? "")); decrypted = JSON.parse(Buffer.concat([cipher.update(encrypted.subarray(0, -16)), cipher.final()]).toString("utf8")); }
    catch { throw providerFailure("INVALID_PROVIDER_EVENT", 400); }
    if (notification.event_type === "TRANSACTION.SUCCESS") return this.paymentEvent(decrypted, notification.id);
    if (["REFUND.SUCCESS", "REFUND.CLOSED", "REFUND.ABNORMAL"].includes(notification.event_type)) {
      const identity = refundSchema.parse(decrypted); if (identity.mchid !== this.mchid) throw providerFailure("PROVIDER_MERCHANT_MISMATCH", 400);
      return this.refundEvent(decrypted, notification.id);
    }
    throw providerFailure("INVALID_PROVIDER_EVENT", 400);
  }
  async queryPayment(orderId: string) {
    const result = await this.request("GET", `/v3/pay/transactions/out-trade-no/${merchantOrderId(orderId)}?mchid=${this.mchid}`);
    if (tradeSchema.parse(result).out_trade_no !== orderId) throw providerFailure("INVALID_PROVIDER_EVENT", 400);
    return this.paymentEvent(result);
  }
  private checkedRefund(value: unknown, input: CashRefundInput) {
    const data = refundSchema.parse(value);
    if (data.out_trade_no !== input.orderId || data.transaction_id !== input.paymentId || data.out_refund_no !== input.refundRequestId || data.amount.refund !== input.amountMinor || data.amount.total !== input.amountMinor || input.currency !== "CNY") throw providerFailure("INVALID_PROVIDER_EVENT", 400);
    return this.refundEvent(data);
  }
  async queryRefund(input: CashRefundInput) { return this.checkedRefund(await this.request("GET", `/v3/refund/domestic/refunds/${encodeURIComponent(input.refundRequestId)}`), input); }
  async requestRefund(input: CashRefundInput) {
    const paid = await this.queryPayment(input.orderId);
    if (!paid || paid.paymentId !== input.paymentId || paid.amountMinor !== input.amountMinor || paid.currency !== input.currency) throw providerFailure("PAYMENT_RECONCILIATION_REQUIRED", 409);
    const value = await this.request("POST", "/v3/refund/domestic/refunds", { transaction_id: input.paymentId, out_refund_no: input.refundRequestId, reason: "ANS order refund", notify_url: webhookUrl(this.provider), amount: { refund: input.amountMinor, total: input.amountMinor, currency: "CNY" } });
    // Accepted/PROCESSING is not a completed refund.
    return this.checkedRefund(value, input);
  }
}
