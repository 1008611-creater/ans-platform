/** Real PostgreSQL integration; simulated provider only, never real funds or model calls. */
import assert from "node:assert/strict";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import type { MarketPaymentAdapter } from "../src/server/marketplace/payments";

function requireIsolatedDatabase(value: string | undefined) {
  if (!value) throw new Error("Explicit isolated DATABASE_URL is required");
  const url = new URL(value);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !/^\/(?:ans_)?(?:product_)?(?:test|verify)(?:[_-][a-z0-9_-]+)?$/.test(url.pathname) && url.pathname !== "/ans_product_verify") {
    throw new Error("Refusing integration writes: database must be loopback and explicitly test/verify");
  }
}

requireIsolatedDatabase(process.env.DATABASE_URL);
if (process.env.DIRECT_URL) requireIsolatedDatabase(process.env.DIRECT_URL);
const evidence: { label: string; passed: boolean }[] = [];
const prefix = `market-test-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;

async function main() {
  // Imports follow the guard so a production URL cannot trigger DB work on module load.
  const { db } = await import("../src/lib/db");
  const listings = await import("../src/server/marketplace/listings");
  const orders = await import("../src/server/marketplace/orders");
  const payments = await import("../src/server/marketplace/payments");
  const signingKey = randomBytes(32);
  const adapter: MarketPaymentAdapter = {
    provider: "isolated-test",
    async verifyWebhook(body, headers) {
      const expected = createHmac("sha256", signingKey).update(body).digest("hex");
      const actual = headers.get("x-test-signature") ?? "";
      if (!/^[a-f0-9]{64}$/.test(actual) || !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) throw new Error("BAD_SIGNATURE");
      return JSON.parse(body);
    },
    async requestRefund() { /* simulated transport; success arrives separately via signed event */ },
  };
  const policy = { commissionBps: 333 }; // explicit isolated scenario, not a platform pricing decision
  let eventNumber = 0;
  async function providerEvent(orderId: string, paymentId: string, extra: Record<string, unknown> = {}) {
    const body = JSON.stringify({ provider: adapter.provider, eventId: `${prefix}-${++eventNumber}`, orderId, paymentId, type: "payment_succeeded", amountMinor: 10001, currency: "CNY", ...extra });
    const headers = new Headers({ "x-test-signature": createHmac("sha256", signingKey).update(body).digest("hex") });
    return payments.handleMarketWebhook(body, headers, adapter);
  }
  async function check(label: string, run: () => Promise<void>) {
    await run(); evidence.push({ label, passed: true }); console.log(`[marketplace] PASS ${label}`);
  }
  try {
    const users = await Promise.all(["seller", "buyer", "outsider", "moderator", "scoped"].map((role) => db.user.create({ data: {
      email: `${prefix}-${role}@example.invalid`, username: `${prefix}-${role}`, role: ["moderator", "scoped"].includes(role) ? "ADMIN" : "USER",
      ...(role === "scoped" ? { adminPermissions: ["PROMPTS_VIEW"] } : {}),
    }, select: { id: true } })));
    const [seller, buyer, outsider, moderator, scoped] = users;
    const offer = {
      slug: prefix, title: "[隔离测试] 简历网站", summary: "隔离测试中的个人简历网站服务，不对外销售。",
      description: "使用买家确认的真实资料制作可预览的简历网站，此记录仅用于隔离测试。",
      category: "career", subcategory: "resume", fulfillment: "service", priceMinor: 10001, currency: "CNY",
      deliveryDays: 3, revisionLimit: 1, computeIncluded: true, deliverables: ["网站文件", "使用说明"], licenseTerms: "仅用于本次隔离验收，买家可查看交付内容。",
    };
    const listing = await listings.createMarketListing(seller.id, offer);
    await check("members cannot impersonate official sellers or moderate", async () => {
      await assert.rejects(listings.createMarketListing(seller.id, { ...offer, slug: `${prefix}-official` }, { official: true }), /FORBIDDEN/);
      await listings.submitMarketListing(listing.id, seller.id, 1);
      await assert.rejects(listings.reviewMarketListing(listing.id, scoped.id, 1, true, "test"), /FORBIDDEN/);
      await assert.rejects(listings.reviewMarketListing(listing.id, seller.id, 1, true, "test"), /FORBIDDEN/);
      await listings.reviewMarketListing(listing.id, moderator.id, 1, true, "isolated approval");
    });
    await check("creator profiles expose only their approved public offers", async () => {
      const other = await listings.createMarketListing(buyer.id, { ...offer, slug: `${prefix}-other-seller` });
      assert.deepEqual(await listings.listPublishedMarketListingsBySeller(buyer.id), []);
      await listings.submitMarketListing(other.id, buyer.id, 1);
      assert.deepEqual(await listings.listPublishedMarketListingsBySeller(buyer.id), []);
      await listings.reviewMarketListing(other.id, moderator.id, 1, true, "isolated profile approval");
      const profile = await listings.listPublishedMarketListingsBySeller(seller.id);
      assert.deepEqual(profile.map(row => row.id), [listing.id]);
      assert.equal(profile[0].reviewNote, null);
      await db.user.update({ where: { id: buyer.id }, data: { flagged: true } });
      assert.deepEqual(await listings.listPublishedMarketListingsBySeller(buyer.id), []);
      await db.user.update({ where: { id: buyer.id }, data: { flagged: false, deletedAt: new Date() } });
      assert.deepEqual(await listings.listPublishedMarketListingsBySeller(buyer.id), []);
      await db.user.update({ where: { id: buyer.id }, data: { deletedAt: null } });
      await listings.withdrawMarketListing(other.id, buyer.id);
      assert.deepEqual(await listings.listPublishedMarketListingsBySeller(buyer.id), []);
    });
    let order = await orders.createMarketOrder(buyer.id, { listingId: listing.id, expectedVersion: 1, idempotencyKey: `${prefix}-order`, requirements: "真实经历与网站范围" }, policy);
    await check("purchases are idempotent and cannot change historical quotes", async () => {
      const same = await orders.createMarketOrder(buyer.id, { listingId: listing.id, expectedVersion: 1, idempotencyKey: `${prefix}-order`, requirements: "真实经历与网站范围" }, policy);
      assert.equal(same.id, order.id);
      await assert.rejects(orders.createMarketOrder(buyer.id, { listingId: listing.id, expectedVersion: 1, idempotencyKey: `${prefix}-order`, requirements: "changed" }, policy), /IDEMPOTENCY_CONFLICT/);
      await assert.rejects(orders.createMarketOrder(seller.id, { listingId: listing.id, expectedVersion: 1, idempotencyKey: `${prefix}-self` }, policy), /SELF_PURCHASE_FORBIDDEN/);
      await listings.reviseMarketListing(listing.id, seller.id, { expectedVersion: 1, listing: { ...offer, title: "[隔离测试] 新版简历网站", priceMinor: 20002 } });
      const live = (await listings.listMarketListings()).find((row) => row.id === listing.id);
      assert.equal(live?.version, 1);
      const profile = await listings.listPublishedMarketListingsBySeller(seller.id);
      assert.equal(profile[0].version, 1); assert.equal(profile[0].listing.title, offer.title); assert.equal(profile[0].listing.priceMinor, offer.priceMinor);
      await listings.submitMarketListing(listing.id, seller.id, 2);
      await listings.reviewMarketListing(listing.id, moderator.id, 2, true, "isolated v2 approval");
      assert.equal((await orders.getMarketOrder(order.id, buyer.id)).quote.priceMinor, 10001);
      await assert.rejects(db.marketOrder.update({ where: { id: order.id }, data: { totalMinor: 2 } }));
    });
    await check("third-party accounts cannot read, message, deliver or accept", async () => {
      await assert.rejects(orders.getMarketOrder(order.id, outsider.id), /NOT_FOUND/);
      await assert.rejects(orders.addMarketOrderMessage(order.id, outsider.id, { content: "hi", idempotencyKey: `${prefix}-outsider` }), /NOT_FOUND/);
      await assert.rejects(orders.actOnMarketOrder(order.id, seller.id, { action: "accept", expectedRevision: order.revision, idempotencyKey: `${prefix}-bad`, message: "" }), /FORBIDDEN/);
    });
    await check("production checkout and unverifiable payment remain closed", async () => {
      assert.equal(orders.marketCheckoutAvailability().checkoutAvailable, false);
      // Valid explicit cash input must reach the provider gate; default checkout is POINTS.
      await assert.rejects(orders.createMarketOrder(buyer.id, { listingId: listing.id, expectedVersion: 2, idempotencyKey: `${prefix}-cash-disabled`, paymentMethod: "WECHAT" }), /PAYMENT_NOT_CONFIGURED/);
      await assert.rejects(payments.handleMarketWebhook("{}", new Headers()), /PAYMENT_NOT_CONFIGURED/);
      await assert.rejects(payments.handleMarketWebhook("{}", new Headers(), adapter), /BAD_SIGNATURE/);
    });
    // Historical cash fixtures exist only behind the loopback test/verify database guard above.
    // Current public checkout defaults to POINTS, so never rewrite its immutable payment method.
    // Copy its validated historical quote to a separate CASH order for signed simulated callbacks.
    // This bypasses real provider checkout only in isolation and proves no real collection/refund.
    async function cashFixture(sourceId: string) {
      const source = await db.marketOrder.findUniqueOrThrow({ where: { id: sourceId } });
      const fixture = await db.marketOrder.create({ data: {
        buyerId: source.buyerId, sellerId: source.sellerId, listingId: source.listingId,
        paymentMethod: "CASH", quote: source.quote!, totalMinor: source.totalMinor,
        currency: source.currency, requirements: source.requirements,
        idempotencyKey: `${source.idempotencyKey}-cash-fixture`, requestHash: source.requestHash,
      } });
      return orders.getMarketOrder(fixture.id, buyer.id);
    }
    order = await cashFixture(order.id);
    await check("concurrent verified callbacks apply exactly one payment journal", async () => {
      const event = { provider: adapter.provider, eventId: `${prefix}-paid`, orderId: order.id, paymentId: `${prefix}-payment`, type: "payment_succeeded", amountMinor: 10001, currency: "CNY" };
      const body = JSON.stringify(event);
      const headers = new Headers({ "x-test-signature": createHmac("sha256", signingKey).update(body).digest("hex") });
      const results = await Promise.all([payments.handleMarketWebhook(body, headers, adapter), payments.handleMarketWebhook(body, headers, adapter)]);
      assert.equal(results.filter((row) => row.duplicate).length, 1);
      order = await orders.getMarketOrder(order.id, buyer.id);
      assert.equal(order.status, "IN_PROGRESS");
      assert.equal(await db.marketPayment.count({ where: { orderId: order.id } }), 1);
      assert.equal(await db.marketCashEntry.count({ where: { orderId: order.id } }), 2);
      const changedBody = JSON.stringify({ ...event, amountMinor: 1 });
      await assert.rejects(payments.handleMarketWebhook(changedBody, new Headers({ "x-test-signature": createHmac("sha256", signingKey).update(changedBody).digest("hex") }), adapter), /PROVIDER_EVENT_CONFLICT/);
    });
    const project = await db.project.create({ data: { ownerId: seller.id, title: "[隔离测试] 私密交付", goal: "PORTFOLIO" } });
    const artifact = await db.artifact.create({ data: { projectId: project.id, createdById: seller.id, workflowId: prefix, kind: "README_DRAFT", title: "测试交付", currentVersion: 1 } });
    const version = await db.artifactVersion.create({ data: { artifactId: artifact.id, version: 1, contentJson: {}, contentMarkdown: "# 私密网站交付文件", factSnapshotHash: prefix, createdById: seller.id } });
    await check("delivery copies an owned artifact and preserves privacy and revision limits", async () => {
      order = await orders.actOnMarketOrder(order.id, seller.id, { action: "deliver", expectedRevision: order.revision, idempotencyKey: `${prefix}-deliver`, message: "初次交付", artifactVersionId: version.id });
      assert.match(order.deliveries[0].markdown, /私密网站交付文件/);
      await db.project.delete({ where: { id: project.id } });
      assert.match((await orders.getMarketOrder(order.id, buyer.id)).deliveries[0].markdown, /私密网站交付文件/);
      order = await orders.actOnMarketOrder(order.id, buyer.id, { action: "request_revision", expectedRevision: order.revision, idempotencyKey: `${prefix}-revise`, message: "修改标题" });
      order = await orders.actOnMarketOrder(order.id, seller.id, { action: "deliver", expectedRevision: order.revision, idempotencyKey: `${prefix}-deliver2`, message: "已修改标题" });
      await assert.rejects(orders.actOnMarketOrder(order.id, buyer.id, { action: "request_revision", expectedRevision: order.revision, idempotencyKey: `${prefix}-revise2`, message: "再修改" }), /REVISION_LIMIT_REACHED/);
    });
    await check("concurrent acceptance and messages never duplicate earnings or messages", async () => {
      const action = { action: "accept", expectedRevision: order.revision, idempotencyKey: `${prefix}-accept`, message: "" };
      const accepted = await Promise.all([orders.actOnMarketOrder(order.id, buyer.id, action), orders.actOnMarketOrder(order.id, buyer.id, action)]);
      order = accepted[0]; assert.equal(order.status, "COMPLETED");
      assert.equal(await db.marketCashEntry.count({ where: { orderId: order.id, journalKey: "completion" } }), 3);
      const message = { content: "感谢交付", idempotencyKey: `${prefix}-message` };
      const sent = await Promise.all([orders.addMarketOrderMessage(order.id, buyer.id, message), orders.addMarketOrderMessage(order.id, buyer.id, message)]);
      assert.equal(sent[0].id, sent[1].id);
      await assert.rejects(orders.addMarketOrderMessage(order.id, buyer.id, { ...message, content: "changed" }), /IDEMPOTENCY_CONFLICT/);
      await orders.reviewMarketOrder(order.id, buyer.id, { rating: 5, content: "[隔离测试] 已完成" });
      await assert.rejects(orders.reviewMarketOrder(order.id, seller.id, { rating: 5, content: "self" }), /NOT_FOUND/);
    });
    await check("second simulated charge is recorded separately and refunded without disturbing fulfillment", async () => {
      const result = await providerEvent(order.id, `${prefix}-second-payment`);
      assert.equal(result.outcome, "RETURN_REQUIRED");
      assert.equal((await orders.getMarketOrder(order.id, buyer.id)).status, "COMPLETED");
      const payment = await db.marketPayment.findUniqueOrThrow({ where: { provider_providerPaymentId: { provider: adapter.provider, providerPaymentId: `${prefix}-second-payment` } } });
      const refund = await db.marketRefund.findUniqueOrThrow({ where: { paymentId: payment.id } });
      await payments.dispatchMarketRefund(refund.id, adapter);
      assert.equal((await db.marketRefund.findUniqueOrThrow({ where: { id: refund.id } })).completedAt, null);
      await providerEvent(order.id, `${prefix}-second-payment`, { type: "refund_succeeded", refundId: `${prefix}-second-refund` });
      assert.equal((await orders.getMarketOrder(order.id, buyer.id)).status, "COMPLETED");
    });
    await check("dispute approval cannot claim a completed refund until verified provider success", async () => {
      order = await orders.actOnMarketOrder(order.id, buyer.id, { action: "dispute", expectedRevision: order.revision, idempotencyKey: `${prefix}-dispute`, message: "[隔离测试] 退款争议" });
      await assert.rejects(payments.approveMarketRefund(order.id, scoped.id, "test"), /FORBIDDEN/);
      const refund = await payments.approveMarketRefund(order.id, moderator.id, "[隔离测试] 同意退款");
      assert.equal((await orders.getMarketOrder(order.id, buyer.id)).status, "REFUND_PENDING");
      assert.equal((await db.marketRefund.findUniqueOrThrow({ where: { id: refund.id } })).completedAt, null);
      await providerEvent(order.id, `${prefix}-payment`, { type: "refund_succeeded", refundId: `${prefix}-primary-refund` });
      assert.equal((await orders.getMarketOrder(order.id, buyer.id)).status, "REFUNDED");
      const balance = await db.marketCashEntry.groupBy({ by: ["account", "currency"], where: { orderId: order.id }, _sum: { amountMinor: true } });
      assert.ok(balance.every((row) => row._sum.amountMinor === 0));
    });
    await check("late payment after cancellation and wrong amount/currency create return obligations", async () => {
      const late = await cashFixture((await orders.createMarketOrder(buyer.id, { listingId: listing.id, expectedVersion: 2, idempotencyKey: `${prefix}-late` }, policy)).id);
      await orders.actOnMarketOrder(late.id, buyer.id, { action: "cancel", expectedRevision: 0, idempotencyKey: `${prefix}-cancel`, message: "" });
      assert.equal((await providerEvent(late.id, `${prefix}-late-payment`, { amountMinor: 20002 })).outcome, "RETURN_REQUIRED");
      assert.equal((await orders.getMarketOrder(late.id, buyer.id)).status, "CANCELLED");
      const mismatch = await cashFixture((await orders.createMarketOrder(buyer.id, { listingId: listing.id, expectedVersion: 2, idempotencyKey: `${prefix}-mismatch` }, policy)).id);
      assert.equal((await providerEvent(mismatch.id, `${prefix}-wrong-money`, { amountMinor: 20001 })).outcome, "RETURN_REQUIRED");
      assert.equal((await providerEvent(mismatch.id, `${prefix}-wrong-currency`, { amountMinor: 20002, currency: "USD" })).outcome, "RETURN_REQUIRED");
      assert.equal((await orders.getMarketOrder(mismatch.id, buyer.id)).status, "AWAITING_PAYMENT");
      assert.equal(await db.marketRefund.count({ where: { orderId: mismatch.id } }), 2);
    });
    await check("withdrawal and account revocation prevent new commerce but preserve history", async () => {
      await listings.withdrawMarketListing(listing.id, seller.id);
      assert.deepEqual(await listings.listPublishedMarketListingsBySeller(seller.id), []);
      await assert.rejects(orders.createMarketOrder(buyer.id, { listingId: listing.id, expectedVersion: 2, idempotencyKey: `${prefix}-withdrawn` }, policy), /NOT_FOUND/);
      await db.user.update({ where: { id: outsider.id }, data: { flagged: true } });
      await assert.rejects(listings.createMarketListing(outsider.id, { ...offer, slug: `${prefix}-banned` }), /ACCOUNT_UNAVAILABLE/);
      assert.equal((await orders.getMarketOrder(order.id, buyer.id)).quote.title, offer.title);
    });
    await check("database rejects unbalanced journals and rewritten financial history", async () => {
      await assert.rejects(db.marketCashEntry.create({ data: { orderId: order.id, journalKey: `${prefix}-unbalanced`, account: "SELLER_PAYABLE", amountMinor: 1, currency: "CNY" } }));
      const entry = await db.marketCashEntry.findFirstOrThrow({ where: { orderId: order.id } });
      await assert.rejects(db.marketCashEntry.update({ where: { id: entry.id }, data: { amountMinor: 2 } }));
      await assert.rejects(db.marketListingVersion.update({ where: { listingId_version: { listingId: listing.id, version: 1 } }, data: { payload: { title: "tampered" } } }));
    });
    await mkdir(".workbuddy/evidence/marketplace", { recursive: true });
    await writeFile(".workbuddy/evidence/marketplace/integration.json", JSON.stringify({ environment: "isolated PostgreSQL; signed simulated provider; no real funds", prefix, checks: evidence, passed: evidence.length }, null, 2));
    console.log(`[marketplace] ${evidence.length}/${evidence.length} checks passed; simulated provider, no real funds`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`[marketplace] FAIL ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
