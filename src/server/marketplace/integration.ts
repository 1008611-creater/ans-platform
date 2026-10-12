import { createHash, randomBytes } from "node:crypto";
import type { DbTransaction } from "@/lib/db";
import { db } from "@/lib/db";
import { marketListingInputSchema, marketQuoteSchema } from "@/contracts/marketplace";
import { externalCheckoutSchema, integrationSetupSchema } from "@/contracts/market-integration";
import { MarketRuleError, selectMarketPricingTier } from "@/domain/marketplace/order";
import { marketHash, marketTransaction, requireMarketActor } from "./shared";
import { createMarketOrder } from "./orders";
import { payMarketOrderPoints } from "./points";
import { RateLimiter } from "@/lib/rate-limit";

const keyHash = (key: string) => createHash("sha256").update(key).digest("hex");
const limiter = new RateLimiter({ max: 120, windowSeconds: 60 });
export function marketPublicOrigin() {
  const value = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "https://ans.cauai.fun";
  const u = new URL(value);
  if (u.protocol !== "https:" || u.username || u.password) throw new MarketRuleError("INTEGRATION_NOT_CONFIGURED", 503);
  return u.origin;
}
export async function getMarketIntegration(listingId: string, sellerId: string) {
  await requireMarketActor(db, sellerId);
  const listing = await db.marketListing.findFirst({ where: { id: listingId, sellerId }, select: { id: true } });
  if (!listing) throw new MarketRuleError("NOT_FOUND", 404);
  return db.marketIntegration.findUnique({ where: { listingId }, select: { id: true, keyPrefix: true, returnOrigins: true, revokedAt: true, updatedAt: true } });
}
export async function configureMarketIntegration(listingId: string, sellerId: string, raw: unknown) {
  const input = integrationSetupSchema.parse(raw);
  return marketTransaction(async tx => {
    await requireMarketActor(tx, sellerId);
    const listing = await tx.marketListing.findFirst({ where: { id: listingId, sellerId }, select: { id: true } });
    if (!listing) throw new MarketRuleError("NOT_FOUND", 404);
    if (input.action === "revoke") {
      await tx.marketIntegration.updateMany({ where: { listingId }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({ data: { actorId: sellerId, action: "MARKET_INTEGRATION_REVOKED", resourceType: "market_listing", resourceId: listingId } });
      return { revoked: true };
    }
    if (!input.returnOrigins) throw new MarketRuleError("INVALID_INPUT", 400);
    const origins = [...new Set(input.returnOrigins.map(value => new URL(value).origin))];
    const secret = "ansm_" + randomBytes(32).toString("base64url");
    const data = { keyHash: keyHash(secret), keyPrefix: secret.slice(0, 13), returnOrigins: origins, revokedAt: null };
    const row = await tx.marketIntegration.upsert({ where: { listingId }, create: { listingId, ...data }, update: data });
    await tx.auditLog.create({ data: { actorId: sellerId, action: "MARKET_INTEGRATION_ROTATED", resourceType: "market_listing", resourceId: listingId } });
    return { id: row.id, key: secret, keyPrefix: row.keyPrefix, returnOrigins: origins };
  });
}
export async function integrationActor(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  if (!/^Bearer ansm_[A-Za-z0-9_-]{43}$/.test(value)) throw new MarketRuleError("UNAUTHORIZED", 401);
  const hash = keyHash(value.slice(7));
  if (!limiter.check(hash).allowed) throw new MarketRuleError("RATE_LIMITED", 429);
  const actor = await db.marketIntegration.findUnique({ where: { keyHash: hash }, include: { listing: { select: { sellerId: true } } } });
  if (!actor || actor.revokedAt) throw new MarketRuleError("UNAUTHORIZED", 401);
  await requireMarketActor(db, actor.listing.sellerId);
  return { id: actor.id, listingId: actor.listingId, keyHash: hash };
}
async function requireIntegration(tx: DbTransaction, id: string, expectedKeyHash?: string) {
  const row = await tx.marketIntegration.findUnique({ where: { id }, include: { listing: { include: { versions: true } } } });
  if (!row || row.revokedAt || (expectedKeyHash && row.keyHash !== expectedKeyHash)) throw new MarketRuleError("UNAUTHORIZED", 401);
  await requireMarketActor(tx, row.listing.sellerId);
  return row;
}
export async function createExternalCheckout(integrationId: string, raw: unknown, expectedKeyHash?: string) {
  const input = externalCheckoutSchema.parse(raw); const hash = marketHash(input);
  const id = await marketTransaction(async tx => {
    const integration = await requireIntegration(tx, integrationId, expectedKeyHash);
    const old = await tx.marketExternalCheckout.findUnique({ where: { integrationId_reference: { integrationId, reference: input.reference } } });
    if (old) { if (old.requestHash !== hash) throw new MarketRuleError("IDEMPOTENCY_CONFLICT"); return old.id; }
    if (!integration.returnOrigins.includes(new URL(input.returnUrl).origin)) throw new MarketRuleError("RETURN_ORIGIN_FORBIDDEN", 400);
    const listing = integration.listing;
    if (listing.status !== "PUBLISHED" || !listing.publishedVersion) throw new MarketRuleError("NOT_FOUND", 404);
    const version = listing.versions.find(v => v.version === listing.publishedVersion);
    if (!version) throw new MarketRuleError("INVALID_LISTING_STATE");
    const publishedInput = marketListingInputSchema.parse(version.payload);
    if (publishedInput.execution) throw new MarketRuleError("WORKFLOW_RUN_REQUIRED", 409);
    const selected = selectMarketPricingTier(publishedInput, input.tierId);
    if (selected.listing.priceMinor <= 0) throw new MarketRuleError("FREE_RESOURCE", 400);
    const checkout = await tx.marketExternalCheckout.create({ data: { integrationId, reference: input.reference, requestHash: hash,
      listingVersion: version.version, tierId: input.tierId ?? null, amountMinor: selected.listing.priceMinor,
      returnUrl: input.returnUrl, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    return checkout.id;
  });
  return externalReceipt(id, integrationId, expectedKeyHash);
}
export async function externalReceipt(id: string, integrationId: string, expectedKeyHash?: string) {
  return marketTransaction(async tx => {
    const integration = await requireIntegration(tx, integrationId, expectedKeyHash);
    const row = await tx.marketExternalCheckout.findFirst({ where: { id, integrationId }, include: { order: { include: { pointsEscrow: true, events: { where: { action: "POINTS_PAID" }, take: 1 } } } } });
    if (!row) throw new MarketRuleError("NOT_FOUND", 404);
    const order = row.order; let status: "pending" | "paid" | "refunded" | "disputed" | "cancelled" = "pending";
    const quote = order ? marketQuoteSchema.parse(order.quote) : null;
    const checkoutVersion = integration.listing.versions.find(version => version.version === row.listingVersion);
    const executionCheckout = Boolean(checkoutVersion && marketListingInputSchema.parse(checkoutVersion.payload).execution);
    const valid = Boolean(order && quote && !quote.execution && !executionCheckout && order.paymentMethod === "POINTS" && order.listingId === integration.listingId &&
      quote.listingVersion === row.listingVersion && (quote.selectedTierId ?? null) === row.tierId && order.totalMinor === row.amountMinor && order.buyerId === row.buyerId &&
      order.paidAt && order.events.length && order.pointsEscrow && Number(order.pointsEscrow.amount) === row.amountMinor / 100);
    if (executionCheckout || quote?.execution) status = "cancelled";
    else if (order?.status === "REFUNDED" || order?.pointsEscrow?.state === "REFUNDED") status = "refunded";
    else if (order?.status === "DISPUTED" || order?.status === "REFUND_PENDING") status = "disputed";
    else if (order?.status === "CANCELLED" || (!order?.paidAt && row.expiresAt <= new Date()) || (!row.orderId && (integration.listing.status !== "PUBLISHED" || integration.listing.publishedVersion !== row.listingVersion))) status = "cancelled";
    else if (valid && ["HELD", "SETTLED"].includes(order!.pointsEscrow!.state)) status = "paid";
    return { id: row.id, reference: row.reference, checkoutUrl: marketPublicOrigin() + "/market/checkout/" + row.id,
      status, pricePoints: row.amountMinor / 100, listingId: integration.listingId, listingVersion: row.listingVersion, tierId: row.tierId,
      orderId: row.orderId, paidAt: valid ? order!.paidAt!.toISOString() : null, entitlementActive: status === "paid", ansUserId: row.buyerId };
  });
}
export async function getExternalCheckoutForBuyer(id: string, buyerId: string) {
  await requireMarketActor(db, buyerId);
  const row = await db.marketExternalCheckout.findUnique({ where: { id }, include: { integration: { include: { listing: { include: { versions: true } } } } } });
  if (!row || (row.buyerId && row.buyerId !== buyerId)) throw new MarketRuleError("NOT_FOUND", 404);
  const receipt = await externalReceipt(id, row.integrationId);
  const version = row.integration.listing.versions.find(v => v.version === row.listingVersion);
  if (!version) throw new MarketRuleError("NOT_FOUND", 404);
  const selected = selectMarketPricingTier(marketListingInputSchema.parse(version.payload), row.tierId ?? undefined);
  return { receipt, title: selected.listing.title, tierTitle: selected.selectedTierTitle ?? null, deliverables: selected.listing.deliverables,
    sellerId: row.integration.listing.sellerId, returnUrl: row.returnUrl, expiresAt: row.expiresAt.toISOString() };
}
/** Claim, order creation and payment each resume with fixed keys after interruption. */
export async function confirmExternalCheckout(id: string, buyerId: string) {
  const row = await marketTransaction(async tx => {
    await requireMarketActor(tx, buyerId);
    await tx.$queryRaw`SELECT id FROM market_external_checkouts WHERE id = ${id} FOR UPDATE`;
    const checkout = await tx.marketExternalCheckout.findUnique({ where: { id } });
    if (!checkout) throw new MarketRuleError("NOT_FOUND", 404);
    const integration = await requireIntegration(tx, checkout.integrationId);
    const checkoutVersion = integration.listing.versions.find(version => version.version === checkout.listingVersion);
    if (checkoutVersion && marketListingInputSchema.parse(checkoutVersion.payload).execution) throw new MarketRuleError("WORKFLOW_RUN_REQUIRED", 409);
    if (integration.listing.sellerId === buyerId) throw new MarketRuleError("SELF_PURCHASE_FORBIDDEN", 403);
    if (checkout.buyerId && checkout.buyerId !== buyerId) throw new MarketRuleError("FORBIDDEN", 403);
    if (!checkout.orderId && (integration.listing.status !== "PUBLISHED" || integration.listing.publishedVersion !== checkout.listingVersion)) throw new MarketRuleError("VERSION_CONFLICT");
    if (!checkout.orderId && checkout.expiresAt <= new Date()) throw new MarketRuleError("CHECKOUT_EXPIRED", 410);
    if (!checkout.buyerId) await tx.marketExternalCheckout.update({ where: { id }, data: { buyerId } });
    return { ...checkout, listingId: integration.listingId };
  });
  if (!row.orderId) {
    const order = await createMarketOrder(buyerId, { listingId: row.listingId, expectedVersion: row.listingVersion, ...(row.tierId ? { tierId: row.tierId } : {}),
      paymentMethod: "POINTS", idempotencyKey: "external_" + row.id, requirements: "External project reference: " + row.reference });
    if (order.quote.priceMinor !== row.amountMinor) throw new MarketRuleError("VERSION_CONFLICT");
    await marketTransaction(async tx => {
      await requireIntegration(tx, row.integrationId);
      const updated = await tx.marketExternalCheckout.updateMany({ where: { id, buyerId, orderId: null }, data: { orderId: order.id } });
      if (!updated.count) { const current = await tx.marketExternalCheckout.findUniqueOrThrow({ where: { id } }); if (current.orderId !== order.id) throw new MarketRuleError("VERSION_CONFLICT"); }
    });
    row.orderId = order.id;
  }
  const receipt = await externalReceipt(id, row.integrationId);
  if (receipt.status === "paid") return receipt;
  if (receipt.status !== "pending" || row.expiresAt <= new Date()) throw new MarketRuleError("CHECKOUT_EXPIRED", 410);
  await payMarketOrderPoints(row.orderId, buyerId, { expectedRevision: 0, operationKey: "external_" + row.id });
  return externalReceipt(id, row.integrationId);
}
