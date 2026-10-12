// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ actor: vi.fn(), previous: vi.fn(), listing: vi.fn(), create: vi.fn(), read: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { marketOrder: { findFirst: m.read } } }));
vi.mock("@/server/marketplace/shared", () => ({
  marketHash: (raw: unknown) => JSON.stringify(raw), requireMarketActor: m.actor, appendCashJournal: vi.fn(),
  marketTransaction: (run: (tx: unknown) => Promise<unknown>) => run({ marketOrder: { findUnique: m.previous, create: m.create }, marketListing: { findFirst: m.listing }, auditLog: { create: m.audit } }),
}));
vi.mock("@/server/marketplace/points", () => ({ pointsPricingPolicy: () => ({ commissionBps: 1000 }), settleMarketPoints: vi.fn() }));
vi.mock("@/server/marketplace/providers/config", () => ({ configuredCashProvider: vi.fn(), cashListingPolicy: vi.fn(), availableCashProviders: vi.fn() }));
import { marketOrderCreateSchema } from "@/contracts/marketplace";
import { createMarketOrder } from "@/server/marketplace/orders";
const listing = { slug: "tier-resource", title: "Tiered resource", summary: "An isolated priced repository fixture", description: "This fixture has reviewed source and supported deployment options.", category: "web", subcategory: "documentation", fulfillment: "resource", priceMinor: 700, currency: "CNY", deliveryDays: 1, revisionLimit: 1, computeIncluded: false, deliverables: ["Source"], licenseTerms: "Personal use under the provided repository license.", pricingTiers: [{ id: "source", title: "Source files", description: "Source archive", priceMinor: 700, deliverables: ["Source archive"] }, { id: "deploy", title: "Deploy support", description: "Source plus deployment", priceMinor: 2300, deliverables: ["Source archive", "Deployment session"] }] };
const input = { listingId: "listing", expectedVersion: 4, tierId: "deploy", idempotencyKey: "tier-order-1" };
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("ANS_UNIFIED_POINTS_ENABLED", "1"); m.actor.mockResolvedValue({ id: "buyer" }); m.previous.mockResolvedValue(null);
  m.listing.mockResolvedValue({ id: "listing", sellerId: "seller", publishedVersion: 4, versions: [{ version: 4, payload: listing }, { version: 5, payload: { ...listing, pricingTiers: [{ ...listing.pricingTiers[1], priceMinor: 100 }] } }] });
  m.create.mockImplementation(async ({ data }) => {
    m.read.mockResolvedValue({ id: "order", ...data, status: "AWAITING_PAYMENT", revision: 0, revisionRequests: 0, requirements: data.requirements, createdAt: new Date(), updatedAt: new Date(), events: [], deliveries: [], messages: [], review: null });
    return { id: "order" };
  });
});
describe("order quotes select reviewed tiers", () => {
  it.each([undefined, "deploy"])("requires the workflow execution path before tier selection %s", async tierId => {
    m.listing.mockResolvedValue({ id: "listing", sellerId: "seller", publishedVersion: 4, versions: [{ version: 4, payload: { ...listing, execution: { workflowId: "workflow", versionId: "workflow-version", version: 1, definitionHash: "a".repeat(64) } } }] });
    await expect(createMarketOrder("buyer", { ...input, tierId })).rejects.toMatchObject({ code: "WORKFLOW_RUN_REQUIRED", status: 409 });
    expect(m.create).not.toHaveBeenCalled(); expect(m.audit).not.toHaveBeenCalled();
  });
  it("ignores a cheaper unreviewed draft and saves exact selected result and fee", async () => {
    const order = await createMarketOrder("buyer", input);
    expect(order).toMatchObject({ paymentMethod: "POINTS", quote: { selectedTierId: "deploy", selectedTierTitle: "Deploy support", priceMinor: 2300, platformFeeMinor: 230, sellerDueMinor: 2070, listingVersion: 4, deliverables: ["Source archive", "Deployment session"] } });
    expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ totalMinor: 2300, paymentMethod: "POINTS" }) }));
  });
  it.each([undefined, "deleted"])("rejects unavailable tier %s without order or audit writes", async tierId => {
    await expect(createMarketOrder("buyer", { ...input, tierId })).rejects.toMatchObject({ code: "INVALID_TIER", status: 400 }); expect(m.create).not.toHaveBeenCalled(); expect(m.audit).not.toHaveBeenCalled();
  });
  it("replays the original order even after the listing is unavailable", async () => {
    const order = await createMarketOrder("buyer", input);
    m.previous.mockResolvedValue({ id: order.id, requestHash: JSON.stringify(marketOrderCreateSchema.parse(input)) }); m.listing.mockRejectedValue(new Error("withdrawn")); m.create.mockClear();
    expect((await createMarketOrder("buyer", input)).quote.priceMinor).toBe(2300); expect(m.create).not.toHaveBeenCalled(); expect(m.listing).toHaveBeenCalledTimes(1);
  });
  it("rejects replaying the same key with a different tier", async () => {
    m.previous.mockResolvedValue({ id: "old", requestHash: JSON.stringify(marketOrderCreateSchema.parse(input)) });
    await expect(createMarketOrder("buyer", { ...input, tierId: "source" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" }); expect(m.create).not.toHaveBeenCalled(); expect(m.listing).not.toHaveBeenCalled();
  });
  it("retains self-purchase protection for any tier", async () => {
    await expect(createMarketOrder("seller", input)).rejects.toMatchObject({ code: "SELF_PURCHASE_FORBIDDEN", status: 403 }); expect(m.create).not.toHaveBeenCalled();
  });
  it("rejects stale published version before selecting a tier", async () => {
    await expect(createMarketOrder("buyer", { ...input, expectedVersion: 3 })).rejects.toMatchObject({ code: "VERSION_CONFLICT" }); expect(m.create).not.toHaveBeenCalled();
  });
});
