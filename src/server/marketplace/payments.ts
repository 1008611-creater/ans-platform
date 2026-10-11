import { z } from "zod";
import { marketCashCheckoutSchema as checkoutSchema } from "@/contracts/marketplace-cash";
import { configuredCashProvider, cashListingPolicy } from "./providers/config";
import type { CashProvider, CashCheckout, CashPaymentProvider } from "./providers/common";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { marketProviderEventSchema, marketQuoteSchema, type MarketProviderEvent } from "@/contracts/marketplace";
import { completionPostings, MarketRuleError, paymentPostings } from "@/domain/marketplace/order";
import { refundMarketPoints } from "./points";
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

/** A single durable reservation prevents concurrent or lost-response retries creating new payment attempts. */
export async function createMarketCashCheckout(orderId: string, buyerId: string, raw: unknown) {
  const input = cashPaySchema.parse(raw);
  const prepared = await marketTransaction(async tx => {
    await requireMarketActor(tx, buyerId);
    await tx.$queryRaw`SELECT id FROM market_orders WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.marketOrder.findFirst({ where: { id: orderId, buyerId } });
    if (!order) throw new MarketRuleError("NOT_FOUND", 404);
    await requireMarketActor(tx, order.sellerId);
    if (order.status !== "AWAITING_PAYMENT" || order.revision !== input.expectedRevision) throw new MarketRuleError("VERSION_CONFLICT");
    const provider = orderProvider(order.paymentMethod, order.quote); configuredMarketPaymentAdapter(provider);
    const quote = marketQuoteSchema.parse(order.quote); const approval = cashListingPolicy(order.listingId, quote.listingVersion, order.sellerId);
    if (approval.priceMinor !== order.totalMinor || approval.commissionBps !== quote.commissionBps) throw new MarketRuleError("CASH_PRICE_NOT_APPROVED", 503);
    const operationKey = `cash-checkout:${provider}`;
    const previous = await tx.marketOrderEvent.findUnique({ where: { orderId_operationKey: { orderId, operationKey } } });
    if (previous) {
      let checkout: CashCheckout; try { checkout = checkoutSchema.parse(JSON.parse(previous.message)); } catch { throw new MarketRuleError("PAYMENT_RECONCILIATION_REQUIRED", 409); }
      if (checkout.provider !== provider || new Date(checkout.expiresAt).getTime() <= Date.now()) throw new MarketRuleError("PAYMENT_CHECKOUT_EXPIRED", 409);
      return { order, provider, operationKey, checkout };
    }
    await tx.marketOrderEvent.create({ data: { orderId, actorId: buyerId, action: "CASH_CHECKOUT_RESERVED", fromStatus: order.status, toStatus: order.status, revision: order.revision, operationKey, requestHash: marketHash({ provider, amountMinor: order.totalMinor, currency: order.currency }), message: "RESERVED" } });
    return { order, provider, operationKey, checkout: null };
  });
  if (prepared.checkout) return prepared.checkout;
  // A timeout deliberately leaves the durable reservation for reconciliation. Never invent a paid flag.
  const checkout = checkoutSchema.parse(await configuredMarketPaymentAdapter(prepared.provider).createCheckout({ orderId, amountMinor: prepared.order.totalMinor, currency: prepared.order.currency, title: marketQuoteSchema.parse(prepared.order.quote).title }));
  await marketTransaction(async tx => {
    await tx.marketOrderEvent.update({ where: { orderId_operationKey: { orderId, operationKey: prepared.operationKey } }, data: { action: "CASH_CHECKOUT_READY", message: JSON.stringify(checkout) } });
  });
  const current = await db.marketOrder.findUnique({ where: { id: orderId }, select: { status: true } });
  if (current?.status !== "AWAITING_PAYMENT") throw new MarketRuleError("VERSION_CONFLICT");
  return checkout;
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
