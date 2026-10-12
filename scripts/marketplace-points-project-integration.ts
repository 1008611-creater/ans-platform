/** Real isolated PostgreSQL acceptance: no provider, models or production writes. */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import type { MarketListingInput } from "../src/contracts/marketplace";

function isolatedDatabase(value: string | undefined) {
  if (!value) throw new Error("Explicit isolated DATABASE_URL is required");
  const url = new URL(value);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !/^\/(?:ans_)?(?:product_)?(?:test|verify)(?:[_-][a-z0-9_-]+)?$/.test(url.pathname)) {
    throw new Error("Refusing writes outside loopback test/verify database");
  }
}
isolatedDatabase(process.env.DATABASE_URL);
if (process.env.DIRECT_URL) isolatedDatabase(process.env.DIRECT_URL);
// Scenario-only configuration, applied after the isolation guard.
process.env.ANS_UNIFIED_POINTS_ENABLED = "1";
process.env.ANS_MARKET_COMMISSION_BPS = "1000";
const prefix = `market-points-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
const checks: { label: string; passed: boolean }[] = [];
async function check(label: string, run: () => Promise<void>) { await run(); checks.push({ label, passed: true }); console.log(`[market-points] PASS ${label}`); }
async function main() {
  const { db } = await import("../src/lib/db");
  const listings = await import("../src/server/marketplace/listings");
  const orders = await import("../src/server/marketplace/orders");
  const stars = await import("../src/server/marketplace/stars");
  const points = await import("../src/server/marketplace/points");
  const { marketOrderCreateSchema } = await import("../src/contracts/marketplace");
  const { marketHash } = await import("../src/server/marketplace/shared");
  const policy = { commissionBps: 1000 };
  const balance = async (id: string) => Number((await db.user.findUniqueOrThrow({ where: { id }, select: { quotaPoints: true } })).quotaPoints);
  try {
    const [seller, buyer, second, poor, disabled, moderator] = await Promise.all(["seller", "buyer", "second", "poor", "disabled", "moderator"].map(async role => {
      const initial = ["buyer", "second"].includes(role) ? 100 : 0;
      const user = await db.user.create({ data: { email: `${prefix}-${role}@example.invalid`, username: `${prefix}-${role}`, role: role === "moderator" ? "ADMIN" : "USER", quotaPoints: initial, flagged: role === "disabled" }, select: { id: true } });
      if (initial) await db.quotaLedger.create({ data: { userId: user.id, amount: initial, balanceAfter: initial, reason: "GRANT", refType: "isolated_seed", refId: prefix, note: "Isolated scenario opening balance" } });
      return user;
    }));
    const offer: MarketListingInput = { slug: prefix, title: "[Isolated] Repository project", summary: "Repository and deployment fixture, never sold to real users.", description: "An isolated acceptance fixture for reviewed pricing tiers, project delivery and points accounting.", category: "web", subcategory: "documentation", fulfillment: "resource", priceMinor: 0, currency: "CNY", deliveryDays: 1, revisionLimit: 1, computeIncluded: false, deliverables: ["Repository"], licenseTerms: "Only this isolated acceptance scenario may use these fixture records.", githubUrl: "https://github.com/example/project", usageUrl: "https://example.invalid/project", pricingTiers: [ { id: "source", title: "Source", description: "Source archive", priceMinor: 1250, deliverables: ["Source archive"] }, { id: "deploy", title: "Deploy", description: "Source plus deployment", priceMinor: 3500, deliverables: ["Source archive", "Deployment guidance"] } ] };
    const listing = await listings.createMarketListing(seller.id, offer);
    await check("draft project saves fields and tiers but stays private", async () => {
      const saved = await listings.getOwnedMarketListing(listing.id, seller.id);
      assert.equal(saved.listing.githubUrl, offer.githubUrl); assert.equal(saved.listing.usageUrl, offer.usageUrl); assert.deepEqual(saved.listing.pricingTiers, offer.pricingTiers); assert.equal(saved.listing.priceMinor, 1250);
      await assert.rejects(listings.getMarketListing(offer.slug), /NOT_FOUND/); await assert.rejects(stars.setMarketListingStar(listing.id, buyer.id, { starred: true }), /NOT_FOUND/);
      await listings.submitMarketListing(listing.id, seller.id, 1); await listings.reviewMarketListing(listing.id, moderator.id, 1, true, "Isolated approval");
      assert.equal((await listings.getMarketListing(offer.slug)).version, 1);
    });
    await check("concurrent desired stars are unique and count both accounts", async () => {
      await Promise.all([stars.setMarketListingStar(listing.id, buyer.id, { starred: true }), stars.setMarketListingStar(listing.id, buyer.id, { starred: true })]);
      assert.equal(await db.marketListingStar.count({ where: { listingId: listing.id, userId: buyer.id } }), 1);
      assert.deepEqual(await stars.setMarketListingStar(listing.id, second.id, { starred: true }), { starCount: 2, starred: true });
      const detail = await listings.getMarketListing(offer.slug, buyer.id); assert.equal(detail.starCount, 2); assert.equal(detail.starred, true);
      const publicRows = await listings.listMarketListings(undefined, second.id); assert.equal(publicRows.find(row => row.id === listing.id)?.starred, true);
      assert.deepEqual(await stars.getMarketListingStar(listing.id), { starCount: 2, starred: false });
    });
    await check("unstar retries and unavailable actors preserve real count", async () => {
      await Promise.all([stars.setMarketListingStar(listing.id, buyer.id, { starred: false }), stars.setMarketListingStar(listing.id, buyer.id, { starred: false })]);
      assert.deepEqual(await stars.getMarketListingStar(listing.id, buyer.id), { starCount: 1, starred: false });
      await assert.rejects(stars.setMarketListingStar(listing.id, disabled.id, { starred: true }), /ACCOUNT_UNAVAILABLE/);
      assert.equal(await db.marketListingStar.count({ where: { listingId: listing.id } }), 1);
    });
    const base = { listingId: listing.id, expectedVersion: 1, requirements: "Fixture deliverables only" };
    const basic = await orders.createMarketOrder(buyer.id, { ...base, tierId: "source", idempotencyKey: `${prefix}-source` }, policy);
    const deployed = await orders.createMarketOrder(buyer.id, { ...base, tierId: "deploy", idempotencyKey: `${prefix}-deploy` }, policy);
    await check("both tier quotes use published prices and exact results", async () => {
      assert.equal(basic.quote.priceMinor, 1250); assert.equal(basic.quote.selectedTierId, "source");
      assert.equal(deployed.quote.priceMinor, 3500); assert.equal(deployed.quote.selectedTierTitle, "Deploy"); assert.deepEqual(deployed.quote.deliverables, ["Source archive", "Deployment guidance"]);
      const same = await orders.createMarketOrder(buyer.id, { ...base, tierId: "deploy", idempotencyKey: `${prefix}-deploy` }, policy); assert.equal(same.id, deployed.id);
      await assert.rejects(orders.createMarketOrder(buyer.id, { ...base, tierId: "source", idempotencyKey: `${prefix}-deploy` }, policy), /IDEMPOTENCY_CONFLICT/);
      await assert.rejects(orders.createMarketOrder(buyer.id, { ...base, tierId: "missing", idempotencyKey: `${prefix}-missing` }, policy), /INVALID_TIER/);
      await assert.rejects(orders.createMarketOrder(seller.id, { ...base, tierId: "source", idempotencyKey: `${prefix}-self` }, policy), /SELF_PURCHASE_FORBIDDEN/);
      await assert.rejects(orders.createMarketOrder(buyer.id, { ...base, tierId: "source", priceMinor: 1, idempotencyKey: `${prefix}-tamper` }, policy));
    });
    await check("updated draft and publication never alter original tier quotes", async () => {
      await listings.reviseMarketListing(listing.id, seller.id, { expectedVersion: 1, listing: { ...offer, pricingTiers: offer.pricingTiers!.map(tier => ({ ...tier, priceMinor: tier.priceMinor + 500 })) } });
      assert.equal((await listings.getMarketListing(offer.slug)).version, 1);
      await listings.submitMarketListing(listing.id, seller.id, 2); await listings.reviewMarketListing(listing.id, moderator.id, 2, true, "Isolated v2 approval");
      assert.equal((await orders.getMarketOrder(deployed.id, buyer.id)).quote.priceMinor, 3500);
      const replay = await orders.createMarketOrder(buyer.id, { ...base, tierId: "deploy", idempotencyKey: `${prefix}-deploy` }, policy); assert.equal(replay.id, deployed.id);
    });
    await check("concurrent points payment debits once and creates one escrow", async () => {
      const pay = { expectedRevision: 0, operationKey: `${prefix}-pay` };
      await Promise.all([points.payMarketOrderPoints(deployed.id, buyer.id, pay), points.payMarketOrderPoints(deployed.id, buyer.id, pay)]);
      assert.equal(await balance(buyer.id), 65); assert.equal(await db.marketPointsEscrow.count({ where: { orderId: deployed.id } }), 1);
      assert.equal(await db.quotaLedger.count({ where: { userId: buyer.id, refType: "market_order", refId: deployed.id, reason: "RUN_COST" } }), 1);
      const escrow = await db.marketPointsEscrow.findUniqueOrThrow({ where: { orderId: deployed.id } }); assert.equal(Number(escrow.amount), 35); assert.equal(Number(escrow.sellerPoints), 31.5); assert.equal(Number(escrow.feePoints), 3.5);
      await points.payMarketOrderPoints(basic.id, buyer.id, { expectedRevision: 0, operationKey: `${prefix}-basic-pay` }); assert.equal(await balance(buyer.id), 52.5);
    });
    await check("insufficient balance leaves no paid event or escrow", async () => {
      const unpaid = await orders.createMarketOrder(poor.id, { listingId: listing.id, expectedVersion: 2, tierId: "source", idempotencyKey: `${prefix}-poor` }, policy);
      await assert.rejects(points.payMarketOrderPoints(unpaid.id, poor.id, { expectedRevision: 0, operationKey: `${prefix}-poor-pay` }));
      assert.equal(await balance(poor.id), 0); assert.equal(await db.marketPointsEscrow.count({ where: { orderId: unpaid.id } }), 0);
      assert.equal(await db.marketOrderEvent.count({ where: { orderId: unpaid.id, action: "POINTS_PAID" } }), 0); assert.equal((await orders.getMarketOrder(unpaid.id, poor.id)).status, "AWAITING_PAYMENT");
    });
    await check("delivery and concurrent acceptance settle seller income exactly once", async () => {
      let current = await orders.getMarketOrder(deployed.id, buyer.id);
      current = await orders.actOnMarketOrder(current.id, seller.id, { action: "deliver", expectedRevision: current.revision, idempotencyKey: `${prefix}-deliver`, message: "Isolated source archive and deployment guidance" });
      const accept = { action: "accept", expectedRevision: current.revision, idempotencyKey: `${prefix}-accept`, message: "" };
      await Promise.all([orders.actOnMarketOrder(current.id, buyer.id, accept), orders.actOnMarketOrder(current.id, buyer.id, accept)]);
      assert.equal(await balance(seller.id), 31.5); assert.equal((await db.marketPointsEscrow.findUniqueOrThrow({ where: { orderId: current.id } })).state, "SETTLED");
      assert.equal(await db.quotaLedger.count({ where: { userId: seller.id, refType: "market_income", refId: current.id } }), 1);
    });
    await check("accepted order dispute reverses seller income and refunds buyer once", async () => {
      const current = await orders.getMarketOrder(deployed.id, buyer.id);
      await orders.actOnMarketOrder(current.id, buyer.id, { action: "dispute", expectedRevision: current.revision, idempotencyKey: `${prefix}-dispute`, message: "Isolated refund acceptance" });
      await points.refundMarketPoints(current.id, moderator.id, "Isolated decision"); await points.refundMarketPoints(current.id, moderator.id, "Isolated decision");
      assert.equal(await balance(buyer.id), 87.5); assert.equal(await balance(seller.id), 0); assert.equal((await orders.getMarketOrder(current.id, buyer.id)).status, "REFUNDED");
      assert.equal(await db.quotaLedger.count({ where: { userId: buyer.id, refType: "market_order", refId: current.id, reason: "REFUND" } }), 1);
    });
    await check("new cash is refused while exact historical replay remains available", async () => {
      await assert.rejects(orders.createMarketOrder(buyer.id, { listingId: listing.id, expectedVersion: 2, paymentMethod: "WECHAT", tierId: "source", idempotencyKey: `${prefix}-cash` }, policy), /POINTS_ONLY/);
      const oldInput = { ...base, tierId: "source", paymentMethod: "WECHAT", idempotencyKey: `${prefix}-historical` };
      const old = await db.marketOrder.create({ data: { buyerId: buyer.id, sellerId: seller.id, listingId: listing.id, paymentMethod: "CASH", quote: { ...basic.quote, paymentProvider: "wechat" }, totalMinor: basic.quote.priceMinor, currency: basic.quote.currency, requirements: base.requirements, idempotencyKey: oldInput.idempotencyKey, requestHash: marketHash(marketOrderCreateSchema.parse(oldInput)) } });
      assert.equal((await orders.createMarketOrder(buyer.id, oldInput, policy)).id, old.id);
    });
    await check("withdrawn projects reject stars and new purchases without erasing history", async () => {
      await listings.withdrawMarketListing(listing.id, seller.id);
      await assert.rejects(stars.setMarketListingStar(listing.id, buyer.id, { starred: true }), /NOT_FOUND/);
      await assert.rejects(orders.createMarketOrder(buyer.id, { listingId: listing.id, expectedVersion: 2, tierId: "source", idempotencyKey: `${prefix}-withdrawn` }, policy), /NOT_FOUND/);
      assert.equal((await orders.getMarketOrder(basic.id, buyer.id)).quote.priceMinor, 1250);
    });
    await check("all fixture account balances reconcile to actual ledger", async () => {
      for (const user of [seller, buyer, second, poor, disabled, moderator]) {
        const sum = await db.quotaLedger.aggregate({ where: { userId: user.id }, _sum: { amount: true } }); assert.equal(Number(sum._sum.amount ?? 0), await balance(user.id));
      }
    });
    await mkdir(".workbuddy/evidence/marketplace-points-project", { recursive: true });
    await writeFile(".workbuddy/evidence/marketplace-points-project/integration.json", JSON.stringify({ environment: "Isolated PostgreSQL, no real buyer, no provider/model calls", prefix, checks, passed: checks.length }, null, 2));
    console.log(`[market-points] ${checks.length} checks passed`);
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(`[market-points] FAIL ${error instanceof Error ? error.message : "unknown"}`); process.exitCode = 1; });
