import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { marketProviderEventSchema, marketQuoteSchema, type MarketProviderEvent } from "@/contracts/marketplace";
import { completionPostings, MarketRuleError, paymentPostings } from "@/domain/marketplace/order";
import { refundMarketPoints } from "./points";
import { appendCashJournal, marketHash, marketTransaction, requireMarketModerator } from "./shared";

/** A provider implementation must verify signature, merchant identity and event authenticity. */
export interface MarketPaymentAdapter {
  readonly provider: string;
  verifyWebhook(body: string, headers: Headers): Promise<unknown>;
  requestRefund(input: { orderId: string; paymentId: string; refundRequestId: string; amountMinor: number; currency: string }): Promise<void>;
}

/** No production provider is configured. Never accept a client-supplied paid status. */
export function configuredMarketPaymentAdapter(): MarketPaymentAdapter {
  throw new MarketRuleError("PAYMENT_NOT_CONFIGURED", 503);
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
          const allocate = !primary && order.status === "AWAITING_PAYMENT" && order.totalMinor === event.amountMinor && order.currency === event.currency;
          const payment = await tx.marketPayment.create({ data: {
            orderId: order.id, ...paymentKey, amountMinor: event.amountMinor, currency: event.currency,
            allocation: allocate ? "ORDER" : "RETURN_REQUIRED",
          } });
          if (allocate) {
            const nextStatus = order.requirements.trim() ? "IN_PROGRESS" : "AWAITING_REQUIREMENTS";
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
        } else if (refund && refund.amountMinor === event.amountMinor && !await tx.marketRefund.findFirst({ where: { id: { not: refund.id }, providerRefundId: event.refundId, payment: { provider: event.provider } }, select: { id: true } })) {
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
  if (body.length > 64_000) throw new MarketRuleError("PAYLOAD_TOO_LARGE", 413);
  const event = marketProviderEventSchema.parse(await adapter.verifyWebhook(body, headers));
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
export async function dispatchMarketRefund(refundId: string, adapter: MarketPaymentAdapter = configuredMarketPaymentAdapter()) {
  const refund = await db.marketRefund.findUnique({ where: { id: refundId }, include: { payment: true } });
  if (!refund) throw new MarketRuleError("NOT_FOUND", 404);
  if (refund.completedAt) return { completed: true };
  if (adapter.provider !== refund.payment.provider) throw new MarketRuleError("PROVIDER_MISMATCH", 400);
  await db.marketRefund.update({ where: { id: refund.id }, data: { dispatchAttempts: { increment: 1 }, lastDispatchedAt: new Date() } });
  await adapter.requestRefund({ orderId: refund.orderId, paymentId: refund.payment.providerPaymentId, refundRequestId: refund.id, amountMinor: refund.amountMinor, currency: refund.payment.currency });
  return { completed: false };
}
