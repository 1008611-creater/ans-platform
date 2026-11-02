import type { DbTransaction } from "@/lib/db";
import { z } from "zod";
import { marketQuoteSchema } from "@/contracts/marketplace";
import { debitQuota, refundQuota } from "@/server/quota/service";
import { MarketRuleError } from "@/domain/marketplace/order";
import { marketTransaction, requireMarketActor, requireMarketModerator, marketHash } from "./shared";
import { OFFICIAL_MARKET_DELIVERIES, getOfficialDeliveryMarkdown } from "./official-deliveries";
import { marketCommissionBpsForTier, type MarketSellerTier } from "@/domain/billing/plan-catalog";

const paySchema = z.object({ expectedRevision: z.number().int().nonnegative(), operationKey: z.string().regex(/^[A-Za-z0-9_-]{8,80}$/) }).strict();
/** The fee follows the seller's plan. Plan and Pro are not sold yet (see
 * plan-readiness), so every seller currently settles at the free-tier rate. */
export function pointsPricingPolicy(sellerTier: MarketSellerTier = "free") {
  return { commissionBps: marketCommissionBpsForTier(sellerTier) };
}
export async function payMarketOrderPoints(orderId: string, buyerId: string, raw: unknown) {
  const input = paySchema.parse(raw);
  return marketTransaction(async tx => {
    await requireMarketActor(tx, buyerId);
    await tx.$queryRaw`SELECT id FROM market_orders WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.marketOrder.findFirst({ where: { id: orderId, buyerId, paymentMethod: "POINTS" } });
    if (!order) throw new MarketRuleError("NOT_FOUND", 404);
    const key = `points-pay:${buyerId}:${input.operationKey}`;
    const hash = marketHash(input);
    const event = await tx.marketOrderEvent.findUnique({ where: { orderId_operationKey: { orderId, operationKey: key } } });
    if (event) {
      if (event.requestHash !== hash) throw new MarketRuleError("IDEMPOTENCY_CONFLICT");
      return { paid: true, duplicate: true };
    }
    if (order.status !== "AWAITING_PAYMENT" || order.revision !== input.expectedRevision) throw new MarketRuleError("VERSION_CONFLICT");
    await requireMarketActor(tx, order.sellerId);
    const quote = marketQuoteSchema.parse(order.quote);
    const amount = quote.priceMinor / 100;
    await debitQuota(tx, { userId: buyerId, costPoints: amount, ref: { type: "market_order", id: orderId }, note: "Market order points escrow" });
    await tx.marketPointsEscrow.create({ data: { orderId, amount, sellerPoints: quote.sellerDueMinor / 100, feePoints: quote.platformFeeMinor / 100, state: "HELD" } });
    const status = quote.fulfillment === "resource" || order.requirements.trim() ? "IN_PROGRESS" : "AWAITING_REQUIREMENTS";
    await tx.marketOrder.update({ where: { id: orderId }, data: { status, revision: { increment: 1 }, paidAt: new Date() } });
    await tx.marketOrderEvent.create({ data: { orderId, actorId: buyerId, action: "POINTS_PAID", fromStatus: order.status, toStatus: status, revision: order.revision + 1, operationKey: key, requestHash: hash } });
    await tx.auditLog.create({ data: { actorId: buyerId, action: "MARKET_POINTS_PAID", resourceType: "market_order", resourceId: orderId, metadata: { points: amount } } });
    if ("marketDelivery" in tx && tx.marketDelivery && (quote.slug in OFFICIAL_MARKET_DELIVERIES || quote.fulfillment === "resource")) {
      const deliveryMd = getOfficialDeliveryMarkdown(quote.slug, quote.title, quote.deliverables);
      const nextRev = order.revision + 2;
      await tx.marketDelivery.create({ data: { orderId, orderRevision: nextRev, contentMarkdown: deliveryMd } });
      await tx.marketOrder.update({ where: { id: orderId }, data: { status: "DELIVERED", revision: { increment: 1 } } });
      await tx.marketOrderEvent.create({ data: { orderId, actorId: order.sellerId, action: "deliver", fromStatus: status, toStatus: "DELIVERED", revision: nextRev, message: "ANS 官方自动秒发交付包已送达", operationKey: `auto-deliver:${orderId}:${nextRev}`, requestHash: hash } });
    }
    return { paid: true, duplicate: false };
  });
}

/** Called only after the caller has atomically advanced order state. */
export async function settleMarketPoints(tx: DbTransaction, orderId: string, sellerId: string) {
  const escrow = await tx.marketPointsEscrow.findUnique({ where: { orderId } });
  if (!escrow || escrow.state !== "HELD") throw new MarketRuleError("INVALID_ESCROW_STATE");
  const changed = await tx.marketPointsEscrow.updateMany({ where: { orderId, state: "HELD" }, data: { state: "SETTLED", settledAt: new Date() } });
  if (changed.count !== 1) throw new MarketRuleError("VERSION_CONFLICT");
  const income = Number(escrow.sellerPoints);
  // Do not freeze already-earned seller income just because spending is disabled.
  const seller = await tx.user.update({ where: { id: sellerId }, data: { quotaPoints: { increment: income } }, select: { quotaPoints: true } });
  if (income > 0) await tx.quotaLedger.create({ data: { userId: sellerId, amount: income, balanceAfter: seller.quotaPoints, reason: "GRANT", refType: "market_income", refId: orderId, note: "Accepted order seller income" } });
}

export async function refundMarketPoints(orderId: string, adminId: string, reason: string) {
  if (!reason.trim() || reason.length > 2000) throw new MarketRuleError("INVALID_INPUT", 400);
  return marketTransaction(async tx => {
    await requireMarketModerator(tx, adminId);
    await tx.$queryRaw`SELECT id FROM market_orders WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.marketOrder.findUnique({ where: { id: orderId } });
    if (!order || order.paymentMethod !== "POINTS") throw new MarketRuleError("NOT_FOUND", 404);
    const escrow = await tx.marketPointsEscrow.findUnique({ where: { orderId } });
    if (!escrow) throw new MarketRuleError("PAYMENT_REQUIRED");
    if (escrow.state === "REFUNDED") return { id: orderId, duplicate: true };
    if (order.status !== "DISPUTED") throw new MarketRuleError("DISPUTE_REQUIRED");
    // Lock both balances in a deterministic order when reversing a settled sale.
    for (const id of [order.buyerId, order.sellerId].sort()) await tx.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR UPDATE`;
    if (escrow.state === "SETTLED" && Number(escrow.sellerPoints) > 0) {
      const income = Number(escrow.sellerPoints);
      const reversed = await tx.user.updateMany({ where: { id: order.sellerId, quotaPoints: { gte: income } }, data: { quotaPoints: { decrement: income } } });
      if (reversed.count !== 1) throw new MarketRuleError("SELLER_REVERSAL_REQUIRES_REVIEW", 409);
      const seller = await tx.user.findUniqueOrThrow({ where: { id: order.sellerId }, select: { quotaPoints: true } });
      await tx.quotaLedger.create({ data: { userId: order.sellerId, amount: -income, balanceAfter: seller.quotaPoints, reason: "RUN_COST", refType: "market_income_reversal", refId: orderId, note: "Market dispute seller income reversal" } });
    }
    const changed = await tx.marketPointsEscrow.updateMany({ where: { orderId, state: escrow.state }, data: { state: "REFUNDED", refundedAt: new Date() } });
    if (changed.count !== 1) throw new MarketRuleError("VERSION_CONFLICT");
    await refundQuota(tx, { userId: order.buyerId, costPoints: Number(escrow.amount), ref: { type: "market_order", id: orderId }, note: reason.trim() });
    await tx.marketOrder.update({ where: { id: orderId }, data: { status: "REFUNDED", revision: { increment: 1 } } });
    await tx.marketOrderEvent.create({ data: { orderId, actorId: adminId, action: "POINTS_REFUNDED", fromStatus: order.status, toStatus: "REFUNDED", revision: order.revision + 1, operationKey: "points-refund", requestHash: marketHash({ adminId, reason: reason.trim() }), message: reason.trim() } });
    await tx.auditLog.create({ data: { actorId: adminId, action: "MARKET_POINTS_REFUND", resourceType: "market_order", resourceId: orderId, metadata: { amount: Number(escrow.amount) } } });
    return { id: orderId, duplicate: false };
  });
}
