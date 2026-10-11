import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createHash } from "node:crypto";

const LDXP_BASE_URL = (process.env.LDXP_BASE_URL || "https://www.ldxp.cn").replace(/\/$/, "");
const WECHAT_CHANNEL_ID = 4;
const LDXP_ORIGIN = new URL(LDXP_BASE_URL).origin;
const PENDING_STATES = new Set(["0", "pending", "wait_pay", "waiting", "unpaid", "created", "processing", "paying", "userpaying", "trade_created"]);
const PAID_STATES = new Set(["1", "2", "paid", "success", "succeeded", "trade_success", "payment_success", "已支付", "支付成功"]);
const FAILED_STATES = new Set(["failed", "fail", "cancel", "cancelled", "closed", "expired", "timeout", "交易关闭", "已关闭"]);

export class LdxpRechargeError extends Error {
  constructor(public readonly code: string, public readonly status = 503) { super(code); }
}

function configured() {
  return process.env.ANS_LDXP_RECHARGE_ENABLED === "1" && Boolean(process.env.LDXP_MERCHANT_TOKEN);
}

export function ldxpRechargeEnabled() { return configured(); }

function headers() {
  const token = process.env.LDXP_MERCHANT_TOKEN;
  if (!token) throw new LdxpRechargeError("LDXP_NOT_CONFIGURED");
  return { "content-type": "application/json", accept: "application/json", "Merchant-Token": token };
}

async function post(path: string, body: Record<string, unknown>) {
  if (!configured()) throw new LdxpRechargeError("LDXP_NOT_CONFIGURED");
  const response = await fetch(`${LDXP_BASE_URL}${path}`, { method: "POST", headers: headers(), body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(10_000) });
  const raw = await response.text();
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new LdxpRechargeError("LDXP_INVALID_RESPONSE", 502); }
  if (!response.ok) throw new LdxpRechargeError("LDXP_REQUEST_FAILED", 502);
  return data;
}

function responseObjects(value: unknown): Array<Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const root = value as Record<string, unknown>;
  const nested = [root.data, root.result, root.response].filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item));
  return [root, ...nested];
}

function stringField(value: unknown, keys: string[]): string | null {
  for (const object of responseObjects(value)) {
    for (const key of keys) {
      const candidate = object[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
      if (typeof candidate === "number" && Number.isFinite(candidate)) return String(candidate);
    }
  }
  return null;
}

function responseCode(value: unknown): string | null {
  const code = stringField(value, ["code", "errcode", "status_code", "statusCode"]);
  return code?.toLowerCase() ?? null;
}

function assertProviderSuccess(value: unknown) {
  const code = responseCode(value);
  const message = stringField(value, ["message", "msg", "error"]);
  if (code && !["0", "200", "ok", "success"].includes(code)) {
    throw new LdxpRechargeError(message ? `LDXP_PROVIDER_${code}` : "LDXP_PROVIDER_REJECTED", 502);
  }
}

function providerAmountCents(value: unknown): number | null {
  const raw = stringField(value, ["amount_cents", "amountCents", "total_amount_cents", "totalAmountCents"]);
  if (raw !== null) { const cents = Number(raw); return Number.isInteger(cents) && cents >= 0 ? cents : null; }
  const yuan = stringField(value, ["money", "amount", "total_amount", "totalAmount", "pay_money", "payMoney", "order_amount"]);
  if (yuan === null) return null;
  const parsed = Number(yuan);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
}

function providerState(value: unknown): "PAID" | "PENDING" | "FAILED" {
  const candidate = stringField(value, ["pay_status", "trade_status", "state", "status"]);
  if (!candidate) throw new LdxpRechargeError("LDXP_INVALID_STATUS_RESPONSE", 502);
  const normalized = candidate.trim().toLowerCase();
  if (PAID_STATES.has(normalized)) return "PAID";
  if (FAILED_STATES.has(normalized)) return "FAILED";
  if (PENDING_STATES.has(normalized)) return "PENDING";
  throw new LdxpRechargeError("LDXP_INVALID_STATUS_RESPONSE", 502);
}

function validatePayUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new LdxpRechargeError("LDXP_INVALID_RECHARGE_RESPONSE", 502); }
  if (url.protocol !== "https:" || url.origin !== LDXP_ORIGIN) throw new LdxpRechargeError("LDXP_INVALID_RECHARGE_RESPONSE", 502);
  return url.toString();
}

function providerStatus(value: unknown, expectedTradeNo: string, expectedAmountCents: number) {
  assertProviderSuccess(value);
  const tradeNo = stringField(value, ["trade_no", "tradeNo", "out_trade_no", "outTradeNo", "order_no", "orderNo"]);
  if (!tradeNo || tradeNo !== expectedTradeNo) throw new LdxpRechargeError("LDXP_TRADE_MISMATCH", 502);
  const amount = providerAmountCents(value);
  if (amount === null || amount !== expectedAmountCents) throw new LdxpRechargeError("LDXP_AMOUNT_MISMATCH", 502);
  return providerState(value);
}

export async function createLdxpWechatRecharge(userId: string, amountCents: number, requestKey: string) {
  if (!Number.isSafeInteger(amountCents) || amountCents < 100 || amountCents > 100_000_000) throw new LdxpRechargeError("INVALID_RECHARGE_AMOUNT", 400);
  if (!/^[A-Za-z0-9_.:-]{16,120}$/.test(requestKey)) throw new LdxpRechargeError("INVALID_RECHARGE_REQUEST_KEY", 400);
  const existing = await db.ldxpRechargeOrder.findFirst({ where: { userId, requestKey } });
  if (existing) return existing;
  const result = await post("/merchantApi/wallet/operateRecharge", { money: (amountCents / 100).toFixed(2), channel_id: WECHAT_CHANNEL_ID });
  assertProviderSuccess(result);
  const tradeNo = stringField(result, ["trade_no", "tradeNo", "out_trade_no", "outTradeNo"]);
  const rawPayUrl = stringField(result, ["payurl", "payUrl", "pay_url", "qr_code", "qrcode"]);
  if (!tradeNo || !rawPayUrl) throw new LdxpRechargeError("LDXP_INVALID_RECHARGE_RESPONSE", 502);
  const payUrl = validatePayUrl(rawPayUrl);
  return db.ldxpRechargeOrder.create({ data: { userId, requestKey, tradeNo, amountCents, points: amountCents / 100, channelId: WECHAT_CHANNEL_ID, payUrl, status: "PENDING", providerPayload: result as Prisma.InputJsonValue }, select: { id: true, tradeNo: true, amountCents: true, points: true, payUrl: true, status: true, createdAt: true } });
}

async function settlePaidOrder(orderId: string, providerPayload: unknown) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM ldxp_recharge_orders WHERE id = ${orderId} FOR UPDATE`;
    const current = await tx.ldxpRechargeOrder.findUniqueOrThrow({ where: { id: orderId } });
    if (current.status === "PAID") return current;
    const operationKey = `ldxp-topup:${current.tradeNo}`;
    const evidenceRef = `ldxp:${current.tradeNo}`;
    const previous = await tx.quotaOperation.findFirst({ where: { OR: [{ operationKey }, { evidenceRef }] }, select: { id: true } });
    if (!previous) {
      const changed = await tx.user.updateMany({ where: { id: current.userId, deletedAt: null, flagged: false }, data: { quotaPoints: { increment: current.points } } });
      if (changed.count !== 1) throw new LdxpRechargeError("ACCOUNT_UNAVAILABLE", 409);
      const user = await tx.user.findUniqueOrThrow({ where: { id: current.userId }, select: { quotaPoints: true } });
      const requestHash = createHash("sha256").update(JSON.stringify({ tradeNo: current.tradeNo, amountCents: current.amountCents, points: current.points.toString() })).digest("hex");
      const operation = await tx.quotaOperation.create({ data: { operationKey, requestHash, userId: current.userId, actorId: current.userId, kind: "TOP_UP", amount: current.points, balanceAfter: user.quotaPoints, evidenceRef, note: "LDXP WeChat recharge" } });
      await tx.quotaLedger.create({ data: { userId: current.userId, amount: current.points, balanceAfter: user.quotaPoints, reason: "RECHARGE", refType: "recharge", refId: operation.id, note: "LDXP WeChat recharge" } });
    }
    return tx.ldxpRechargeOrder.update({ where: { id: current.id }, data: { status: "PAID", paidAt: current.paidAt ?? new Date(), lastCheckedAt: new Date(), providerPayload: providerPayload as Prisma.InputJsonValue } });
  });
}

export async function queryLdxpRecharge(orderId: string, userId: string) {
  const order = await db.ldxpRechargeOrder.findFirst({ where: { id: orderId, userId } });
  if (!order) throw new LdxpRechargeError("RECHARGE_NOT_FOUND", 404);
  if (order.status === "PAID") return order;
  const result = await post("/payApi/Pay/query", { trade_no: order.tradeNo });
  const state = providerStatus(result, order.tradeNo, order.amountCents);
  if (state === "PAID") return settlePaidOrder(order.id, result);
  const nextStatus = state === "FAILED" ? "EXPIRED" : "PENDING";
  return db.ldxpRechargeOrder.update({ where: { id: order.id }, data: { status: nextStatus, lastCheckedAt: new Date(), providerPayload: result as Prisma.InputJsonValue } });
}

export async function reconcilePendingLdxpRecharges(limit = 50) {
  if (!configured()) return { checked: 0, paid: 0, expired: 0, failed: 0 };
  const orders = await db.ldxpRechargeOrder.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: Math.min(Math.max(limit, 1), 200) });
  let paid = 0, expired = 0, failed = 0;
  for (const order of orders) {
    try {
      const result = await post("/payApi/Pay/query", { trade_no: order.tradeNo });
      const state = providerStatus(result, order.tradeNo, order.amountCents);
      if (state === "PAID") { await settlePaidOrder(order.id, result); paid += 1; }
      else if (state === "FAILED") { await db.ldxpRechargeOrder.update({ where: { id: order.id }, data: { status: "EXPIRED", lastCheckedAt: new Date(), providerPayload: result as Prisma.InputJsonValue } }); expired += 1; }
      else await db.ldxpRechargeOrder.update({ where: { id: order.id }, data: { lastCheckedAt: new Date(), providerPayload: result as Prisma.InputJsonValue } });
    } catch (error) {
      if (error instanceof LdxpRechargeError && ["LDXP_AMOUNT_MISMATCH", "LDXP_TRADE_MISMATCH", "LDXP_INVALID_STATUS_RESPONSE", "LDXP_INVALID_RESPONSE"].includes(error.code)) { await db.ldxpRechargeOrder.update({ where: { id: order.id }, data: { status: "FAILED", lastCheckedAt: new Date() } }); failed += 1; }
    }
  }
  return { checked: orders.length, paid, expired, failed };
}

export async function listLdxpRechargeOrders(limit = 100) {
  const rows = await db.ldxpRechargeOrder.findMany({ orderBy: { createdAt: "desc" }, take: Math.min(Math.max(limit, 1), 200), select: { id: true, userId: true, tradeNo: true, amountCents: true, points: true, channelId: true, status: true, createdAt: true, paidAt: true, lastCheckedAt: true } });
  return rows.map(row => ({ ...row, points: Number(row.points), createdAt: row.createdAt.toISOString(), paidAt: row.paidAt?.toISOString() ?? null, lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null }));
}
