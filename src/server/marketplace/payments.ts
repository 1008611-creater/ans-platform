import { randomUUID } from "node:crypto";
import { z } from "zod";
import { marketCashCheckoutSchema as checkoutSchema } from "@/contracts/marketplace-cash";
import { configuredCashProvider, cashListingPolicy } from "./providers/config";
import type { CashProvider, CashPaymentProvider, CashPaymentState } from "./providers/common";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { marketProviderEventSchema, marketQuoteSchema, type MarketProviderEvent } from "@/contracts/marketplace";
import { completionPostings, MarketRuleError, paymentPostings } from "@/domain/marketplace/order";
import { refundMarketPoints } from "./points";
import { marketPointsOnly } from "./policy";
import { appendCashJournal, marketHash, marketTransaction, requireMarketModerator, requireMarketActor } from "./shared";

/** A provider implementation must verify signature, merchant identity and event authenticity. */
export interface MarketPaymentAdapter {
  readonly provider: string;
  verifyWebhook(body: string, headers: Headers): Promise<unknown>;
  requestRefund(input: { orderId: string; paymentId: string; refundRequestId: string; amountMinor: number; currency: string }): Promise<void | MarketProviderEvent | null>;
}

/** Explicitly enabled merchant configuration only. Never accept a client-supplied paid status. */
export function configuredMarketPaymentAdapter(provider?: string): CashPaymentProvider {
  const selected = provider ?? process.env.ANS_MARKET_CASH_DEFAULT_PROVIDER;
  if (selected !== "wechat" && selected !== "alipay") throw new MarketRuleError("PAYMENT_NOT_CONFIGURED", 503);
  return configuredCashProvider(selected);
}

// This processor is private: every call enters through the adapter's verified webhook.
async function processProviderEvent(event: MarketProviderEvent) {
  const payloadHash = marketHash(event);
  return marketTransaction(async (tx) => {
    const key = { provider: event.provider, providerEventId: event.eventId };
    const previous = await tx.marketPaymentEvent.findUnique({ where: { provider_providerEventId: key } });
    if (previous) {
      if (previous.payloadHash !== payloadHash) throw new MarketRuleError("PROVIDER_EVENT_CONFLICT");
      return { outcome: previous.outcome, duplicate: true };
    }
    const order = await tx.marketOrder.findUnique({ where: { id: event.orderId } });
    let outcome = "RECONCILIATION_REQUIRED";
    if (order && order.paymentMethod !== "POINTS") {
      const paymentKey = { provider: event.provider, providerPaymentId: event.paymentId };
      const existing = await tx.marketPayment.findUnique({ where: { provider_providerPaymentId: paymentKey } });
      if (event.type === "payment_succeeded") {
        if (existing) {
          if (existing.orderId === order.id && existing.amountMinor === event.amountMinor && existing.currency === event.currency) outcome = "PAYMENT_ALREADY_RECORDED";
        } else {
          const primary = await tx.marketPayment.findFirst({ where: { orderId: order.id, allocation: "ORDER" } });
          const allocate = !primary && (order.paymentMethod === "CASH" && (!marketQuoteSchema.parse(order.quote).paymentProvider || marketQuoteSchema.parse(order.quote).paymentProvider === event.provider)) && order.status === "AWAITING_PAYMENT" && order.totalMinor === event.amountMinor && order.currency === event.currency;
          const payment = await tx.marketPayment.create({ data: {
            orderId: order.id, ...paymentKey, amountMinor: event.amountMinor, currency: event.currency,
            allocation: allocate ? "ORDER" : "RETURN_REQUIRED",
          } });
          if (allocate) {
            const nextStatus = marketQuoteSchema.parse(order.quote).fulfillment === "resource" || order.requirements.trim() ? "IN_PROGRESS" : "AWAITING_REQUIREMENTS";
            await appendCashJournal(tx, order.id, `payment:${payment.id}`, event.currency, paymentPostings(event.amountMinor));
            await tx.marketOrder.update({ where: { id: order.id }, data: { status: nextStatus, paidAt: new Date(), revision: { increment: 1 } } });
            await tx.marketOrderEvent.create({ data: {
              orderId: order.id, action: "PAYMENT_CONFIRMED", fromStatus: order.status, toStatus: nextStatus,
              revision: order.revision + 1, operationKey: `payment:${payment.id}`, requestHash: payloadHash,
            } });
            outcome = "PAYMENT_APPLIED";
          } else {
            // A late, mismatched or additional real charge is still money that must be returned.
            await appendCashJournal(tx, order.id, `payment:${payment.id}`, event.currency, [
              { account: "PROVIDER_RECEIVABLE", amountMinor: event.amountMinor },
              { account: "REFUND_PAYABLE", amountMinor: -event.amountMinor },
            ]);
            await tx.marketRefund.create({ data: { orderId: order.id, paymentId: payment.id, amountMinor: event.amountMinor, reason: "UNALLOCATED_PAYMENT" } });
            outcome = "RETURN_REQUIRED";
          }
        }
      } else if (existing?.orderId === order.id && existing.amountMinor === event.amountMinor && existing.currency === event.currency) {
        const refund = await tx.marketRefund.findUnique({ where: { paymentId: existing.id } });
        if (refund?.completedAt) {
          outcome = refund.providerRefundId === event.refundId ? "REFUND_ALREADY_RECORDED" : "RECONCILIATION_REQUIRED";
        } else if (refund && (!event.refundRequestId || event.refundRequestId === refund.id) && refund.amountMinor === event.amountMinor && !await tx.marketRefund.findFirst({ where: { id: { not: refund.id }, providerRefundId: event.refundId, payment: { provider: event.provider } }, select: { id: true } })) {
          await appendCashJournal(tx, order.id, `refund:${refund.id}`, event.currency, [
            { account: "REFUND_PAYABLE", amountMinor: event.amountMinor },
            { account: "PROVIDER_RECEIVABLE", amountMinor: -event.amountMinor },
          ]);
          await tx.marketRefund.update({ where: { id: refund.id }, data: { completedAt: new Date(), providerRefundId: event.refundId } });
          if (existing.allocation === "ORDER") {
            if (order.status !== "REFUND_PENDING") throw new MarketRuleError("INVALID_REFUND_STATE");
            await tx.marketOrder.update({ where: { id: order.id }, data: { status: "REFUNDED", revision: { increment: 1 } } });
            await tx.marketOrderEvent.create({ data: {
              orderId: order.id, action: "REFUND_CONFIRMED", fromStatus: order.status, toStatus: "REFUNDED",
              revision: order.revision + 1, operationKey: `refund:${refund.id}`, requestHash: payloadHash,
            } });
          }
          outcome = "REFUND_APPLIED";
        }
      }
    }
    await tx.marketPaymentEvent.create({ data: { ...key, orderId: event.orderId, payloadHash, eventType: event.type, payload: event as Prisma.InputJsonValue, outcome } });
    await tx.auditLog.create({ data: { action: "MARKET_PROVIDER_EVENT", resourceType: "market_order", resourceId: event.orderId, metadata: { provider: event.provider, type: event.type, outcome } } });
    return { outcome, duplicate: false };
  });
}

export async function handleMarketWebhook(body: string, headers: Headers, adapter: MarketPaymentAdapter = configuredMarketPaymentAdapter()) {
  if (Buffer.byteLength(body, "utf8") > 64_000) throw new MarketRuleError("PAYLOAD_TOO_LARGE", 413);
  const verified = await adapter.verifyWebhook(body, headers);
  if (verified === null) return { outcome: "IGNORED", duplicate: false };
  const event = marketProviderEventSchema.parse(verified);
  if (event.provider !== adapter.provider) throw new MarketRuleError("PROVIDER_MISMATCH", 400);
  return processProviderEvent(event);
}

/** Approval persists a refund obligation. Only a provider success event confirms return of money. */
export async function approveMarketRefund(orderId: string, moderatorId: string, reason: string) {
  const method = await db.marketOrder.findUnique({ where: { id: orderId }, select: { paymentMethod: true } });
  if (method?.paymentMethod === "POINTS") return refundMarketPoints(orderId, moderatorId, reason);
  if (!reason.trim() || reason.length > 2000) throw new MarketRuleError("INVALID_INPUT", 400);
  return marketTransaction(async (tx) => {
    await requireMarketModerator(tx, moderatorId);
    const order = await tx.marketOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new MarketRuleError("NOT_FOUND", 404);
    const payment = await tx.marketPayment.findFirst({ where: { orderId, allocation: "ORDER" } });
    if (!payment) throw new MarketRuleError("PAYMENT_REQUIRED");
    const previous = await tx.marketRefund.findUnique({ where: { paymentId: payment.id } });
    if (previous) return { id: previous.id };
    if (order.status !== "DISPUTED") throw new MarketRuleError("DISPUTE_REQUIRED");
    const quote = marketQuoteSchema.parse(order.quote);
    // Payout is not enabled. Reverse earned obligations if delivery was previously accepted.
    if (order.completedAt) await appendCashJournal(tx, orderId, "refund:reverse-completion", quote.currency, completionPostings(quote).map((row) => ({ ...row, amountMinor: -row.amountMinor })));
    await appendCashJournal(tx, orderId, "refund:reserve", quote.currency, [
      { account: "BUYER_HELD", amountMinor: order.totalMinor },
      { account: "REFUND_PAYABLE", amountMinor: -order.totalMinor },
    ]);
    const refund = await tx.marketRefund.create({ data: { orderId, paymentId: payment.id, amountMinor: order.totalMinor, requestedById: moderatorId, reason: reason.trim() }, select: { id: true } });
    await tx.marketOrder.update({ where: { id: orderId }, data: { status: "REFUND_PENDING", revision: { increment: 1 } } });
    await tx.marketOrderEvent.create({ data: { orderId, actorId: moderatorId, action: "REFUND_APPROVED", fromStatus: order.status, toStatus: "REFUND_PENDING", revision: order.revision + 1, operationKey: "refund:approved", requestHash: marketHash({ moderatorId, reason: reason.trim() }), message: reason.trim() } });
    await tx.auditLog.create({ data: { actorId: moderatorId, action: "MARKET_REFUND_APPROVED", resourceType: "market_order", resourceId: orderId, metadata: { refundId: refund.id } } });
    return refund;
  });
}

/** Retry-safe provider command. The provider must use refundRequestId as its idempotency key. */
export async function dispatchMarketRefund(refundId: string, adapter?: MarketPaymentAdapter) {
  const refund = await db.marketRefund.findUnique({ where: { id: refundId }, include: { payment: true } });
  if (!refund) throw new MarketRuleError("NOT_FOUND", 404);
  if (refund.completedAt) return { completed: true };
  adapter ??= configuredMarketPaymentAdapter(refund.payment.provider);
  if (adapter.provider !== refund.payment.provider) throw new MarketRuleError("PROVIDER_MISMATCH", 400);
  await db.marketRefund.update({ where: { id: refund.id }, data: { dispatchAttempts: { increment: 1 }, lastDispatchedAt: new Date() } });
  const confirmed = await adapter.requestRefund({ orderId: refund.orderId, paymentId: refund.payment.providerPaymentId, refundRequestId: refund.id, amountMinor: refund.amountMinor, currency: refund.payment.currency });
  if (confirmed) {
    const event = marketProviderEventSchema.parse(confirmed);
    if (event.provider !== adapter.provider || event.orderId !== refund.orderId || event.paymentId !== refund.payment.providerPaymentId || event.refundRequestId !== refund.id || event.type !== "refund_succeeded") throw new MarketRuleError("PROVIDER_MISMATCH", 400);
    const result = await processProviderEvent(event); return { completed: result.outcome === "REFUND_APPLIED" || result.outcome === "REFUND_ALREADY_RECORDED" };
  }
  return { completed: false };
}
const cashPaySchema = z.object({ expectedRevision: z.number().int().nonnegative() }).strict();
function orderProvider(method: string, quote: unknown): CashProvider {
  const provider = marketQuoteSchema.parse(quote).paymentProvider;
  if (method === "CASH" && provider) return provider;
  throw new MarketRuleError("CASH_PAYMENT_REQUIRED", 400);
}

const checkoutAttemptSchema = z.object({
  version: z.literal(1), merchantIdentity: z.string().min(1), paymentExpiresAt: z.string().datetime().nullable(),
  leaseUntil: z.string().datetime(), leaseToken: z.string().uuid(), checkout: checkoutSchema.nullable(),
}).strict();
const CHECKOUT_LEASE_MS = 60_000;

/** Frozen merchant/order identity + durable lease. Recovery always inspects ambiguous provider state first. */
export async function createMarketCashCheckout(orderId: string, buyerId: string, raw: unknown) {
  const input = cashPaySchema.parse(raw);
  // Querying or refunding historical cash remains separate from creating a new charge.
  if (marketPointsOnly()) throw new MarketRuleError("POINTS_ONLY", 400);
  const prepared = await marketTransaction(async tx => {
    await requireMarketActor(tx, buyerId);
    await tx.$queryRaw`SELECT id FROM market_orders WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.marketOrder.findFirst({ where: { id: orderId, buyerId } });
    if (!order) throw new MarketRuleError("NOT_FOUND", 404);
    await requireMarketActor(tx, order.sellerId);
    if (order.status !== "AWAITING_PAYMENT" || order.revision !== input.expectedRevision) throw new MarketRuleError("VERSION_CONFLICT");
    const provider = orderProvider(order.paymentMethod, order.quote); const adapter = configuredMarketPaymentAdapter(provider);
    const quote = marketQuoteSchema.parse(order.quote); const approval = cashListingPolicy(order.listingId, quote.listingVersion, order.sellerId);
    if (approval.priceMinor !== order.totalMinor || approval.commissionBps !== quote.commissionBps) throw new MarketRuleError("CASH_PRICE_NOT_APPROVED", 503);
    const operationKey = `cash-checkout:${provider}`;
    const previous = await tx.marketOrderEvent.findUnique({ where: { orderId_operationKey: { orderId, operationKey } } });
    let attempt: z.infer<typeof checkoutAttemptSchema>;
    if (previous) {
      let stored: unknown; try { stored = JSON.parse(previous.message); } catch { stored = null; }
      const current = checkoutAttemptSchema.safeParse(stored);
      if (current.success) {
        attempt = current.data;
        if (attempt.merchantIdentity !== adapter.merchantIdentity) throw new MarketRuleError("PROVIDER_MERCHANT_MISMATCH", 409);
        if (attempt.checkout && attempt.checkout.provider === provider && Date.parse(attempt.checkout.expiresAt) > Date.now()) return { order, provider, operationKey, attempt, recovery: true, cached: attempt.checkout };
        if (Date.parse(attempt.leaseUntil) > Date.now()) throw new MarketRuleError("PAYMENT_REQUEST_IN_PROGRESS", 409);
      } else {
        // Legacy bare RESERVED has no exact request deadline. Query/close is safe; guessing a new unpaid request is not.
        const legacy = checkoutSchema.safeParse(stored);
        if (previous.message !== "RESERVED" && !legacy.success) throw new MarketRuleError("PAYMENT_RECONCILIATION_REQUIRED", 409);
        if (legacy.success && legacy.data.provider !== provider) throw new MarketRuleError("PROVIDER_MISMATCH", 409);
        if (legacy.success && Date.parse(legacy.data.expiresAt) > Date.now()) return { order, provider, operationKey, attempt: null, recovery: true, cached: legacy.data };
        attempt = { version: 1, merchantIdentity: adapter.merchantIdentity, paymentExpiresAt: legacy.success ? legacy.data.expiresAt : null, leaseUntil: new Date(0).toISOString(), leaseToken: randomUUID(), checkout: legacy.success ? legacy.data : null };
      }
      attempt.leaseUntil = new Date(Date.now() + CHECKOUT_LEASE_MS).toISOString(); attempt.leaseToken = randomUUID();
      await tx.marketOrderEvent.update({ where: { orderId_operationKey: { orderId, operationKey } }, data: { action: "CASH_CHECKOUT_RECOVERING", message: JSON.stringify(attempt) } });
    } else {
      attempt = { version: 1, merchantIdentity: adapter.merchantIdentity, paymentExpiresAt: new Date(Math.floor((Date.now() + 30 * 60_000) / 1000) * 1000).toISOString(), leaseUntil: new Date(Date.now() + CHECKOUT_LEASE_MS).toISOString(), leaseToken: randomUUID(), checkout: null };
      await tx.marketOrderEvent.create({ data: { orderId, actorId: buyerId, action: "CASH_CHECKOUT_RESERVED", fromStatus: order.status, toStatus: order.status, revision: order.revision, operationKey, requestHash: marketHash({ provider, amountMinor: order.totalMinor, currency: order.currency }), message: JSON.stringify(attempt) } });
    }
    return { order, provider, operationKey, attempt, recovery: !!previous, cached: null };
  });
  if (prepared.cached) return prepared.cached;
  const attempt = prepared.attempt!; const adapter = configuredMarketPaymentAdapter(prepared.provider);
  if (adapter.merchantIdentity !== attempt.merchantIdentity) throw new MarketRuleError("PROVIDER_MERCHANT_MISMATCH", 409);
  async function saveAttempt(action: string) {
    await marketTransaction(async tx => {
      await tx.$queryRaw`SELECT id FROM market_orders WHERE id = ${orderId} FOR UPDATE`;
      const stored = await tx.marketOrderEvent.findUnique({ where: { orderId_operationKey: { orderId, operationKey: prepared.operationKey } } });
      let record: z.infer<typeof checkoutAttemptSchema>; try { record = checkoutAttemptSchema.parse(JSON.parse(stored?.message ?? "")); } catch { throw new MarketRuleError("PAYMENT_RECONCILIATION_REQUIRED", 409); }
      if (record.leaseToken !== attempt.leaseToken) throw new MarketRuleError("PAYMENT_REQUEST_IN_PROGRESS", 409);
      await tx.marketOrderEvent.update({ where: { orderId_operationKey: { orderId, operationKey: prepared.operationKey } }, data: { action, message: JSON.stringify(attempt) } });
    });
  }
  function checkState(state: CashPaymentState) {
    const amount = state.status === "PAID" ? state.event.amountMinor : state.status === "NOT_FOUND" ? null : state.amountMinor;
    const currency = state.status === "PAID" ? state.event.currency : state.status === "NOT_FOUND" ? null : state.currency;
    if (amount !== null && (amount !== prepared.order.totalMinor || currency !== prepared.order.currency)) throw new MarketRuleError("PAYMENT_RECONCILIATION_REQUIRED", 409);
    if (state.status === "PAID" && (state.event.provider !== prepared.provider || state.event.orderId !== orderId || state.event.type !== "payment_succeeded")) throw new MarketRuleError("PROVIDER_MISMATCH", 400);
  }
  async function recordPaid(state: Extract<CashPaymentState, { status: "PAID" }>) {
    checkState(state); const result = await processProviderEvent(marketProviderEventSchema.parse(state.event));
    if (!["PAYMENT_APPLIED", "PAYMENT_ALREADY_RECORDED"].includes(result.outcome)) throw new MarketRuleError("PAYMENT_RECONCILIATION_REQUIRED", 409);
    throw new MarketRuleError("PAYMENT_ALREADY_CONFIRMED", 409);
  }
  async function recordClosed() {
    await marketTransaction(async tx => {
      await tx.$queryRaw`SELECT id FROM market_orders WHERE id = ${orderId} FOR UPDATE`;
      const order = await tx.marketOrder.findUnique({ where: { id: orderId } });
      if (!order || order.status !== "AWAITING_PAYMENT") return;
      await tx.marketOrder.update({ where: { id: orderId }, data: { status: "CANCELLED", revision: { increment: 1 } } });
      await tx.marketOrderEvent.create({ data: { orderId, actorId: buyerId, action: "CASH_PAYMENT_CLOSED", fromStatus: order.status, toStatus: "CANCELLED", revision: order.revision + 1, operationKey: `cash-close:${prepared.provider}`, requestHash: marketHash({ provider: prepared.provider, closed: true }) } });
    });
    throw new MarketRuleError("PAYMENT_CHECKOUT_CLOSED", 409);
  }
  try {
    if (prepared.recovery) {
      let state = await adapter.inspectPayment(orderId); checkState(state);
      if (state.status === "PAID") await recordPaid(state);
      if (state.status === "CLOSED") await recordClosed();
      if (state.status === "PROCESSING" || state.status === "REFUNDED") throw new MarketRuleError("PAYMENT_RECONCILIATION_REQUIRED", 409);
      if (state.status === "NOT_FOUND") {
        // Only authenticated absence allows a request with this same merchant order ID and frozen price.
        if (!attempt.paymentExpiresAt || Date.parse(attempt.paymentExpiresAt) <= Date.now() + 60_000) {
          attempt.paymentExpiresAt = new Date(Math.floor((Date.now() + 30 * 60_000) / 1000) * 1000).toISOString(); attempt.checkout = null;
          await saveAttempt("CASH_CHECKOUT_RECOVERING");
        }
      } else if (state.status === "UNPAID" && (!attempt.paymentExpiresAt || Date.parse(attempt.paymentExpiresAt) <= Date.now() + 60_000)) {
        // Close first; success/timeout during close must be resolved by a subsequent authenticated query.
        try { await adapter.closePayment(orderId); } catch { /* query decides; transport acknowledgement cannot decide state */ }
        state = await adapter.inspectPayment(orderId); checkState(state);
        if (state.status === "PAID") await recordPaid(state);
        if (state.status === "CLOSED") await recordClosed();
        throw new MarketRuleError("PAYMENT_RECONCILIATION_REQUIRED", 409);
      }
      // UNPAID retains the original deadline and order ID; never relabel it NOT_FOUND.
    }
    const checkout = checkoutSchema.parse(await adapter.createCheckout({ orderId, amountMinor: prepared.order.totalMinor, currency: prepared.order.currency, title: marketQuoteSchema.parse(prepared.order.quote).title, paymentExpiresAt: attempt.paymentExpiresAt! }));
    if (checkout.provider !== prepared.provider || checkout.expiresAt !== attempt.paymentExpiresAt) throw new MarketRuleError("INVALID_PROVIDER_EVENT", 400);
    attempt.checkout = checkout; attempt.leaseUntil = new Date(0).toISOString(); await saveAttempt("CASH_CHECKOUT_READY");
    const current = await db.marketOrder.findUnique({ where: { id: orderId }, select: { status: true } });
    if (current?.status !== "AWAITING_PAYMENT") throw new MarketRuleError("VERSION_CONFLICT");
    return checkout;
  } catch (error) {
    // The original request metadata survives all failures. Releasing this lease enables safe inspect-first retries.
    attempt.leaseUntil = new Date(0).toISOString();
    try { await saveAttempt(attempt.checkout ? "CASH_CHECKOUT_READY" : "CASH_CHECKOUT_RESERVED"); } catch { /* lease expires naturally if persistence is unavailable */ }
    throw error;
  }
}

/** Explicit authenticated command: viewing an order never calls a provider or writes payment state. */
export async function reconcileMarketCashPayment(orderId: string, userId: string) {
  await requireMarketActor(db, userId);
  const order = await db.marketOrder.findFirst({ where: { id: orderId, OR: [{ buyerId: userId }, { sellerId: userId }] } });
  if (!order) throw new MarketRuleError("NOT_FOUND", 404);
  const adapter = configuredMarketPaymentAdapter(orderProvider(order.paymentMethod, order.quote));
  const verified = await adapter.queryPayment(orderId);
  if (!verified) return { paid: false, outcome: "PAYMENT_NOT_CONFIRMED" };
  const event = marketProviderEventSchema.parse(verified);
  if (event.provider !== adapter.provider || event.orderId !== orderId || event.type !== "payment_succeeded") throw new MarketRuleError("PROVIDER_MISMATCH", 400);
  const result = await processProviderEvent(event);
  return { paid: ["PAYMENT_APPLIED", "PAYMENT_ALREADY_RECORDED"].includes(result.outcome), outcome: result.outcome };
}

export async function reconcileMarketRefund(refundId: string) {
  const refund = await db.marketRefund.findUnique({ where: { id: refundId }, include: { payment: true } });
  if (!refund) throw new MarketRuleError("NOT_FOUND", 404);
  if (refund.completedAt) return { completed: true };
  const adapter = configuredMarketPaymentAdapter(refund.payment.provider);
  const verified = await adapter.queryRefund({ orderId: refund.orderId, paymentId: refund.payment.providerPaymentId, refundRequestId: refund.id, amountMinor: refund.amountMinor, currency: refund.payment.currency });
  if (!verified) return { completed: false };
  const event = marketProviderEventSchema.parse(verified);
  if (event.provider !== adapter.provider || event.orderId !== refund.orderId || event.paymentId !== refund.payment.providerPaymentId || event.refundRequestId !== refund.id || event.type !== "refund_succeeded") throw new MarketRuleError("PROVIDER_MISMATCH", 400);
  const result = await processProviderEvent(event);
  return { completed: ["REFUND_APPLIED", "REFUND_ALREADY_RECORDED"].includes(result.outcome) };
}
const refundCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), reason: z.string().trim().min(1).max(2000) }).strict(),
  z.object({ action: z.enum(["dispatch", "reconcile"]), refundId: z.string().min(1).max(100) }).strict(),
]);
export async function administerMarketRefund(orderId: string, moderatorId: string, raw: unknown) {
  await requireMarketModerator(db, moderatorId);
  const input = refundCommandSchema.parse(raw);
  if (input.action === "approve") return approveMarketRefund(orderId, moderatorId, input.reason);
  const refund = await db.marketRefund.findFirst({ where: { id: input.refundId, orderId }, select: { id: true } });
  if (!refund) throw new MarketRuleError("NOT_FOUND", 404);
  return input.action === "dispatch" ? dispatchMarketRefund(refund.id) : reconcileMarketRefund(refund.id);
}
