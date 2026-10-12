// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ actor: vi.fn(), integration: vi.fn(), previous: vi.fn(), receipt: vi.fn(), checkout: vi.fn(), create: vi.fn(), claim: vi.fn(), lock: vi.fn(), order: vi.fn(), pay: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/server/marketplace/orders", () => ({ createMarketOrder: m.order }));
vi.mock("@/server/marketplace/points", () => ({ payMarketOrderPoints: m.pay }));
vi.mock("@/server/marketplace/shared", () => ({ marketHash: (raw: unknown) => JSON.stringify(raw), requireMarketActor: m.actor,
  marketTransaction: (run: (tx: unknown) => Promise<unknown>) => run({ marketIntegration: { findUnique: m.integration },
    marketExternalCheckout: { findUnique: m.checkout, findFirst: m.receipt, create: m.create, update: m.claim, updateMany: m.claim }, $queryRaw: m.lock }),
}));
import { createExternalCheckout, externalReceipt, confirmExternalCheckout } from "@/server/marketplace/integration";
const execution = { workflowId: "workflow", versionId: "workflow-version", version: 1, definitionHash: "a".repeat(64) };
const payload = { slug: "external-resource", title: "External resource", summary: "An isolated fixture for external checkout.", description: "This resource tests that workflow and project checkout never mix billing.", category: "web", subcategory: "documentation", fulfillment: "resource", priceMinor: 100, currency: "CNY", deliveryDays: 1, revisionLimit: 0, computeIncluded: false, deliverables: ["Source"], licenseTerms: "Use according to the stated resource license." };
const input = { reference: "reference_1", returnUrl: "https://project.example/result" };
const row = () => ({ id: "checkout", integrationId: "integration", reference: input.reference, listingVersion: 1, tierId: null, amountMinor: 100, returnUrl: input.returnUrl, expiresAt: new Date(Date.now() + 60_000), buyerId: null, orderId: null, order: null });
function integration(binding: boolean, withTiers = false) {
  return { id: "integration", listingId: "listing", keyHash: "key-hash", revokedAt: null, returnOrigins: ["https://project.example"], listing: { id: "listing", sellerId: "seller", status: "PUBLISHED", publishedVersion: 1, versions: [{ version: 1, payload: { ...payload, ...(binding ? { execution } : {}), ...(withTiers ? { pricingTiers: [{ id: "paid", title: "Paid", description: "Paid tier", priceMinor: 100, deliverables: ["Source"] }] } : {}) } }] } };
}
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://ans.example");
  m.integration.mockResolvedValue(integration(false)); m.checkout.mockResolvedValue(null); m.create.mockResolvedValue({ id: "checkout" }); m.receipt.mockResolvedValue(row());
});
describe("external checkout cannot grant workflow entitlements", () => {
  it("continues to create a point-priced ordinary external resource checkout", async () => {
    const receipt = await createExternalCheckout("integration", input, "key-hash");
    expect(receipt).toMatchObject({ status: "pending", pricePoints: 1, entitlementActive: false });
    expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ listingVersion: 1, amountMinor: 100, tierId: null }) }));
  });
  it.each([false, true])("refuses execution before paid tier selection, with paid tiers %s", async withTiers => {
    m.integration.mockResolvedValue(integration(true, withTiers));
    await expect(createExternalCheckout("integration", { ...input, ...(withTiers ? { tierId: "paid" } : {}) }, "key-hash")).rejects.toMatchObject({ code: "WORKFLOW_RUN_REQUIRED", status: 409 });
    expect(m.create).not.toHaveBeenCalled(); expect(m.order).not.toHaveBeenCalled(); expect(m.pay).not.toHaveBeenCalled();
  });
  it("returns cancelled for an anomalous workflow checkout using its fixed version, even when latest version is ordinary", async () => {
    const stored = integration(true); stored.listing.publishedVersion = 2; stored.listing.versions.push({ version: 2, payload });
    m.integration.mockResolvedValue(stored);
    const paidAt = new Date();
    m.receipt.mockResolvedValue({ ...row(), buyerId: "buyer", orderId: "order", order: { id: "order", quote: { ...payload, listingId: "listing", listingVersion: 1, sellerId: "seller", commissionBps: 1000, platformFeeMinor: 10, sellerDueMinor: 90 }, paymentMethod: "POINTS", listingId: "listing", totalMinor: 100, buyerId: "buyer", paidAt, events: [{ action: "POINTS_PAID" }], pointsEscrow: { amount: 1, state: "HELD" }, status: "IN_PROGRESS" } });
    expect(await externalReceipt("checkout", "integration", "key-hash")).toMatchObject({ status: "cancelled", entitlementActive: false, paidAt: null });
  });
  it("does not accept a paid order quote carrying execution even if checkout version is ordinary", async () => {
    m.receipt.mockResolvedValue({ ...row(), buyerId: "buyer", orderId: "order", order: { id: "order", quote: { ...payload, execution, listingId: "listing", listingVersion: 1, sellerId: "seller", commissionBps: 1000, platformFeeMinor: 10, sellerDueMinor: 90 }, paymentMethod: "POINTS", listingId: "listing", totalMinor: 100, buyerId: "buyer", paidAt: new Date(), events: [{ action: "POINTS_PAID" }], pointsEscrow: { amount: 1, state: "HELD" }, status: "IN_PROGRESS" } });
    expect(await externalReceipt("checkout", "integration")).toMatchObject({ status: "cancelled", entitlementActive: false, paidAt: null });
  });
  it.each([false, true])("refuses anomalous execution confirmation before claim, order or payment, existing order %s", async hasOrder => {
    m.integration.mockResolvedValue(integration(true)); m.checkout.mockResolvedValue({ ...row(), ...(hasOrder ? { orderId: "order", buyerId: "buyer" } : {}) });
    await expect(confirmExternalCheckout("checkout", "buyer")).rejects.toMatchObject({ code: "WORKFLOW_RUN_REQUIRED", status: 409 });
    expect(m.claim).not.toHaveBeenCalled(); expect(m.order).not.toHaveBeenCalled(); expect(m.pay).not.toHaveBeenCalled();
  });
});
