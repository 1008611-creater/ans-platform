import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { marketListingInputSchema, marketMessageSchema, marketOrderActionSchema, marketOrderCreateSchema, marketQuoteSchema, marketReviewSchema } from "@/contracts/marketplace";
import { buildMarketQuote, completionPostings, MarketRuleError, nextOrderStatus, selectMarketPricingTier } from "@/domain/marketplace/order";
import { isMarketOfferPurchasable } from "@/domain/marketplace/presentation";
import { appendCashJournal, marketHash, marketTransaction, requireMarketActor } from "./shared";

import { marketHistoryPageSize } from "@/contracts/marketplace-history";
import { presentHistoryPage, presentOrderEvent, presentOrderMessage } from "./history";
import { marketPointsOnly } from "./policy";
import { pointsPricingPolicy, settleMarketPoints } from "./points";
import { availableCashProviders, cashListingPolicy, configuredCashProvider } from "./providers/config";

export type MarketPricingPolicy = { commissionBps: number };

export function marketCheckoutAvailability() {
  try { pointsPricingPolicy(); return { checkoutAvailable: true, payoutAvailable: false, reason: "POINTS_ONLY" } as const; }
  catch { return { checkoutAvailable: false, payoutAvailable: false, reason: "PRICING_NOT_CONFIGURED" } as const; }
}
function configuredPricingPolicy(): MarketPricingPolicy { return pointsPricingPolicy(); }

const orderDetails = {
  events: { orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }], take: marketHistoryPageSize + 1 },
  deliveries: { orderBy: { orderRevision: "desc" as const } },
  messages: { orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }], take: marketHistoryPageSize + 1 },
  review: true,
} satisfies Prisma.MarketOrderInclude;

function presentOrder(order: Prisma.MarketOrderGetPayload<{ include: typeof orderDetails }>) {
  return {
    id: order.id, listingId: order.listingId, buyerId: order.buyerId, sellerId: order.sellerId,
    paymentMethod: order.paymentMethod === "CASH" && marketQuoteSchema.parse(order.quote).paymentProvider ? marketQuoteSchema.parse(order.quote).paymentProvider!.toUpperCase() : order.paymentMethod, status: order.status, quote: marketQuoteSchema.parse(order.quote), revision: order.revision,
    revisionRequests: order.revisionRequests, requirements: order.requirements,
    paidAt: order.paidAt?.toISOString() ?? null, completedAt: order.completedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString(),
    events: presentHistoryPage(order.events.map(presentOrderEvent)).items,
    deliveries: order.deliveries.map((delivery) => ({ id: delivery.id, revision: delivery.orderRevision, markdown: delivery.contentMarkdown, createdAt: delivery.createdAt.toISOString() })),
    messages: presentHistoryPage(order.messages.map(presentOrderMessage)).items,
    history: { messagesBefore: presentHistoryPage(order.messages).nextCursor, eventsBefore: presentHistoryPage(order.events).nextCursor },
    review: order.review ? { rating: order.review.rating, content: order.review.content, createdAt: order.review.createdAt.toISOString() } : null,
  };
}

export async function getMarketOrder(orderId: string, userId: string) {
  await requireMarketActor(db, userId);
  const order = await db.marketOrder.findFirst({ where: { id: orderId, OR: [{ buyerId: userId }, { sellerId: userId }] }, include: orderDetails });
  if (!order) throw new MarketRuleError("NOT_FOUND", 404);
  return presentOrder(order);
}

export async function listMarketOrders(userId: string) {
  await requireMarketActor(db, userId);
  const orders = await db.marketOrder.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    select: { id: true, buyerId: true, sellerId: true, paymentMethod: true, status: true, quote: true, revision: true, updatedAt: true },
    orderBy: { updatedAt: "desc" }, take: 100,
  });
  return orders.map((order) => ({ ...order, quote: marketQuoteSchema.parse(order.quote), updatedAt: order.updatedAt.toISOString() }));
}

/** policy injection is server/test-only; request bodies cannot override prices or fees. */
export async function createMarketOrder(buyerId: string, raw: unknown, policy?: MarketPricingPolicy) {
  const input = marketOrderCreateSchema.parse(raw);
  const requestHash = marketHash(input);
  const orderId = await marketTransaction(async (tx) => {
    await requireMarketActor(tx, buyerId);
    const previous = await tx.marketOrder.findUnique({ where: { buyerId_idempotencyKey: { buyerId, idempotencyKey: input.idempotencyKey } } });
    if (previous) {
      if (previous.requestHash !== requestHash) throw new MarketRuleError("IDEMPOTENCY_CONFLICT");
      return previous.id;
    }
    if (marketPointsOnly() && input.paymentMethod && input.paymentMethod !== "POINTS") throw new MarketRuleError("POINTS_ONLY", 400);
    const listing = await tx.marketListing.findFirst({ where: { id: input.listingId, status: "PUBLISHED" }, include: { versions: true } });
    if (!listing) throw new MarketRuleError("NOT_FOUND", 404);
    await requireMarketActor(tx, listing.sellerId);
    if (listing.sellerId === buyerId) throw new MarketRuleError("SELF_PURCHASE_FORBIDDEN", 403);
    if (listing.publishedVersion !== input.expectedVersion) throw new MarketRuleError("VERSION_CONFLICT");
    const version = listing.versions.find((row) => row.version === listing.publishedVersion);
    if (!version) throw new MarketRuleError("INVALID_LISTING_STATE");
    const paymentMethod = input.paymentMethod ?? "POINTS";
    const publishedInput = marketListingInputSchema.parse(version.payload);
    if (publishedInput.execution) throw new MarketRuleError("WORKFLOW_RUN_REQUIRED", 409);
    if (!isMarketOfferPurchasable({ slug: listing.slug, listing: publishedInput })) throw new MarketRuleError("DELIVERY_NOT_READY", 409);
    const selected = selectMarketPricingTier(publishedInput, input.tierId);
    const listingInput = selected.listing;
    let pricing = policy;
    if (paymentMethod !== "POINTS") {
      configuredCashProvider(paymentMethod === "WECHAT" ? "wechat" : "alipay");
      const cash = cashListingPolicy(listing.id, version.version, listing.sellerId);
      listingInput.priceMinor = cash.priceMinor; pricing = cash;
    }
    pricing ??= configuredPricingPolicy();
    const quote = { ...buildMarketQuote(listingInput, { listingId: listing.id, listingVersion: version.version, sellerId: listing.sellerId }, pricing.commissionBps), ...(selected.selectedTierId ? { selectedTierId: selected.selectedTierId, selectedTierTitle: selected.selectedTierTitle } : {}), ...(paymentMethod !== "POINTS" ? { paymentProvider: paymentMethod === "WECHAT" ? "wechat" as const : "alipay" as const } : {}) };
    const order = await tx.marketOrder.create({
      data: {
        paymentMethod: paymentMethod === "POINTS" ? "POINTS" : "CASH", buyerId, sellerId: listing.sellerId, listingId: listing.id, quote: quote as Prisma.InputJsonValue,
        totalMinor: quote.priceMinor, currency: quote.currency, requirements: input.requirements,
        idempotencyKey: input.idempotencyKey, requestHash,
        events: { create: { actorId: buyerId, action: "ORDER_CREATED", toStatus: "AWAITING_PAYMENT", revision: 0, operationKey: "created", requestHash } },
      },
      select: { id: true },
    });
    await tx.auditLog.create({ data: { actorId: buyerId, action: "MARKET_ORDER_CREATED", resourceType: "market_order", resourceId: order.id, metadata: { listingId: listing.id, listingVersion: version.version } } });
    return order.id;
  });
  return getMarketOrder(orderId, buyerId);
}

export async function actOnMarketOrder(orderId: string, userId: string, raw: unknown) {
  const input = marketOrderActionSchema.parse(raw);
  const requestHash = marketHash(input);
  await marketTransaction(async (tx) => {
    await requireMarketActor(tx, userId);
    const order = await tx.marketOrder.findFirst({ where: { id: orderId, OR: [{ buyerId: userId }, { sellerId: userId }] } });
    if (!order) throw new MarketRuleError("NOT_FOUND", 404);
    const operationKey = `user:${userId}:${input.idempotencyKey}`;
    const oldEvent = await tx.marketOrderEvent.findUnique({ where: { orderId_operationKey: { orderId, operationKey } } });
    if (oldEvent) {
      if (oldEvent.requestHash !== requestHash) throw new MarketRuleError("IDEMPOTENCY_CONFLICT");
      return;
    }
    if (order.revision !== input.expectedRevision) throw new MarketRuleError("VERSION_CONFLICT");
    const quote = marketQuoteSchema.parse(order.quote);
    const role = order.buyerId === userId ? "buyer" : "seller";
    const status = nextOrderStatus({ status: order.status, revisionRequests: order.revisionRequests, revisionLimit: quote.revisionLimit }, input.action, role);
    const nextRevision = order.revision + 1;
    let deliveryMarkdown = input.message;
    if (input.artifactVersionId) {
      const artifact = await tx.artifactVersion.findFirst({
        where: { id: input.artifactVersionId, artifact: { project: { ownerId: userId } } },
        select: { contentMarkdown: true },
      });
      if (!artifact) throw new MarketRuleError("ARTIFACT_PERMISSION_REQUIRED", 403);
      deliveryMarkdown += `\n\n${artifact.contentMarkdown}`;
    }
    const changed = await tx.marketOrder.updateMany({
      where: { id: orderId, revision: input.expectedRevision, status: order.status },
      data: {
        status, revision: { increment: 1 },
        ...(input.action === "submit_requirements" ? { requirements: input.message } : {}),
        ...(input.action === "request_revision" ? { revisionRequests: { increment: 1 } } : {}),
        ...(input.action === "accept" ? { completedAt: new Date() } : {}),
      },
    });
    if (changed.count !== 1) throw new MarketRuleError("VERSION_CONFLICT");
    if (input.action === "deliver") {
      await tx.marketDelivery.create({ data: { orderId, orderRevision: nextRevision, contentMarkdown: deliveryMarkdown, sourceArtifactVersionId: input.artifactVersionId ?? null } });
    }
    if (input.action === "accept") {
      if (order.paymentMethod === "POINTS") await settleMarketPoints(tx, orderId, order.sellerId);
      else await appendCashJournal(tx, orderId, "completion", quote.currency, completionPostings(quote));
    }
    await tx.marketOrderEvent.create({ data: { orderId, actorId: userId, action: input.action, fromStatus: order.status, toStatus: status, revision: nextRevision, message: input.message, operationKey, requestHash } });
    await tx.auditLog.create({ data: { actorId: userId, action: `MARKET_ORDER_${input.action.toUpperCase()}`, resourceType: "market_order", resourceId: orderId, metadata: { revision: nextRevision } } });
  });
  return getMarketOrder(orderId, userId);
}

export async function addMarketOrderMessage(orderId: string, userId: string, raw: unknown) {
  const input = marketMessageSchema.parse(raw);
  return marketTransaction(async (tx) => {
    await requireMarketActor(tx, userId);
    const order = await tx.marketOrder.findFirst({ where: { id: orderId, OR: [{ buyerId: userId }, { sellerId: userId }] }, select: { id: true } });
    if (!order) throw new MarketRuleError("NOT_FOUND", 404);
    const key = { orderId, authorId: userId, idempotencyKey: input.idempotencyKey };
    const previous = await tx.marketOrderMessage.findUnique({ where: { orderId_authorId_idempotencyKey: key } });
    if (previous) {
      if (previous.content !== input.content) throw new MarketRuleError("IDEMPOTENCY_CONFLICT");
      return { id: previous.id };
    }
    const message = await tx.marketOrderMessage.create({ data: { ...key, content: input.content }, select: { id: true } });
    await tx.marketOrder.update({ where: { id: orderId }, data: { updatedAt: new Date() } });
    return message;
  });
}

export async function reviewMarketOrder(orderId: string, userId: string, raw: unknown) {
  const input = marketReviewSchema.parse(raw);
  return marketTransaction(async (tx) => {
    await requireMarketActor(tx, userId);
    const order = await tx.marketOrder.findFirst({ where: { id: orderId, buyerId: userId }, select: { status: true } });
    if (!order) throw new MarketRuleError("NOT_FOUND", 404);
    if (order.status !== "COMPLETED") throw new MarketRuleError("INVALID_ORDER_STATE");
    const previous = await tx.marketReview.findUnique({ where: { orderId } });
    if (previous) {
      if (previous.rating !== input.rating || previous.content !== input.content) throw new MarketRuleError("REVIEW_ALREADY_SUBMITTED");
      return { id: previous.id };
    }
    const review = await tx.marketReview.create({ data: { orderId, authorId: userId, ...input }, select: { id: true } });
    await tx.auditLog.create({ data: { actorId: userId, action: "MARKET_ORDER_REVIEWED", resourceType: "market_order", resourceId: orderId } });
    return review;
  });
}

export function marketCashOffer(listingId: string, version: number, sellerId: string) {
  if (marketPointsOnly()) return null;
  try { const approval = cashListingPolicy(listingId, version, sellerId); const providers = availableCashProviders();
    return providers.length ? { priceMinor: approval.priceMinor, providers } : null;
  } catch { return null; }
}
