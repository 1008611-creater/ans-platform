// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ previous: vi.fn(), listing: vi.fn(), create: vi.fn(), read: vi.fn(), actor: vi.fn(), audit: vi.fn(), provider: vi.fn(), cashPolicy: vi.fn(), available: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { marketOrder: { findFirst: m.read, findUnique: m.read } } }));
vi.mock("@/server/marketplace/shared", () => ({
  marketHash: (value: unknown) => JSON.stringify(value), requireMarketActor: m.actor, requireMarketModerator: vi.fn(), appendCashJournal: vi.fn(),
  marketTransaction: (run: (tx: unknown) => Promise<unknown>) => run({ marketOrder: { findUnique: m.previous, create: m.create }, marketListing: { findFirst: m.listing }, auditLog: { create: m.audit } }),
}));
vi.mock("@/server/marketplace/points", () => ({ pointsPricingPolicy: () => ({ commissionBps: 0 }), settleMarketPoints: vi.fn(), refundMarketPoints: vi.fn() }));
vi.mock("@/server/marketplace/providers/config", () => ({ configuredCashProvider: m.provider, cashListingPolicy: m.cashPolicy, availableCashProviders: m.available }));
import { marketOrderCreateSchema } from "@/contracts/marketplace";
import { marketPointsOnly } from "@/server/marketplace/policy";
import { createMarketOrder, getMarketOrder, marketCashOffer } from "@/server/marketplace/orders";
import { createMarketCashCheckout } from "@/server/marketplace/payments";
const listing = { slug: "points-resource", title: "Credit resource", summary: "Resource used only in isolated validation", description: "An isolated resource fixture, never a published production offer.", category: "web", subcategory: "apps", fulfillment: "resource", priceMinor: 500, currency: "CNY", deliveryDays: 1, revisionLimit: 0, computeIncluded: false, deliverables: ["Files"], licenseTerms: "Personal use fixture terms" };
const quote = { ...listing, listingId: "listing", listingVersion: 1, sellerId: "seller", commissionBps: 0, platformFeeMinor: 0, sellerDueMinor: 500 };
const order = { id: "order", listingId: "listing", buyerId: "buyer", sellerId: "seller", paymentMethod: "POINTS", status: "AWAITING_PAYMENT", quote, revision: 0, revisionRequests: 0, requirements: "", createdAt: new Date(), updatedAt: new Date(), events: [], deliveries: [], messages: [], review: null };
const input = { listingId: "listing", expectedVersion: 1, idempotencyKey: "purchase-1", requirements: "" };
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("ANS_UNIFIED_POINTS_ENABLED", "1"); vi.stubEnv("ANS_MARKET_CASH_ENABLED", "true");
  m.previous.mockResolvedValue(null); m.actor.mockResolvedValue({ id: "buyer" }); m.create.mockResolvedValue({ id: "order" }); m.read.mockResolvedValue(order);
  m.listing.mockResolvedValue({ id: "listing", sellerId: "seller", publishedVersion: 1, versions: [{ version: 1, payload: listing }] });
  m.available.mockReturnValue(["wechat", "alipay"]); m.cashPolicy.mockReturnValue({ priceMinor: 19900, commissionBps: 0 });
});
afterEach(() => vi.unstubAllEnvs());
describe("unified points remain the only new-purchase currency", () => {
  it.each(["WECHAT", "ALIPAY"])("rejects new %s orders even if cash collection is configured", async paymentMethod => {
    await expect(createMarketOrder("buyer", { ...input, paymentMethod })).rejects.toMatchObject({ code: "POINTS_ONLY", status: 400 });
    expect(m.create).not.toHaveBeenCalled(); expect(m.listing).not.toHaveBeenCalled(); expect(m.provider).not.toHaveBeenCalled(); expect(m.cashPolicy).not.toHaveBeenCalled(); expect(m.audit).not.toHaveBeenCalled();
  });
  it.each([undefined, "POINTS"])("continues creating server-quoted points orders with payment method %s", async paymentMethod => {
    expect(await createMarketOrder("buyer", { ...input, ...(paymentMethod ? { paymentMethod } : {}) })).toMatchObject({ paymentMethod: "POINTS", quote: { priceMinor: 500 } });
    expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ paymentMethod: "POINTS", totalMinor: 500, quote: expect.not.objectContaining({ paymentProvider: expect.anything() }) }) }));
    expect(m.provider).not.toHaveBeenCalled(); expect(m.cashPolicy).not.toHaveBeenCalled();
  });
  it("hides cash purchase offers without loading any cash merchant", () => {
    expect(marketPointsOnly()).toBe(true); expect(marketCashOffer("listing", 1, "seller")).toBeNull(); expect(m.cashPolicy).not.toHaveBeenCalled(); expect(m.available).not.toHaveBeenCalled();
  });
  it("blocks direct cash checkout before any provider call or durable payment write", async () => {
    await expect(createMarketCashCheckout("order", "buyer", { expectedRevision: 0 })).rejects.toMatchObject({ code: "POINTS_ONLY", status: 400 }); expect(m.provider).not.toHaveBeenCalled(); expect(m.audit).not.toHaveBeenCalled(); expect(m.previous).not.toHaveBeenCalled();
  });
  it("keeps authenticated historical cash order reads and exact idempotent replay available", async () => {
    const oldInput = { ...input, paymentMethod: "WECHAT" }; m.previous.mockResolvedValue({ id: "order", requestHash: JSON.stringify(marketOrderCreateSchema.parse(oldInput)) });
    m.read.mockResolvedValue({ ...order, paymentMethod: "CASH", quote: { ...quote, paymentProvider: "wechat" } });
    expect(await getMarketOrder("order", "buyer")).toMatchObject({ paymentMethod: "WECHAT" });
    expect(await createMarketOrder("buyer", oldInput)).toMatchObject({ paymentMethod: "WECHAT" }); expect(m.create).not.toHaveBeenCalled(); expect(m.provider).not.toHaveBeenCalled();
  });
  it("still rejects a conflicting replay of a historical cash order", async () => {
    m.previous.mockResolvedValue({ id: "order", requestHash: "other-request" }); await expect(createMarketOrder("buyer", { ...input, paymentMethod: "WECHAT" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" }); expect(m.create).not.toHaveBeenCalled();
  });
  it("retains separately configured cash behavior for installations without unified points", () => {
    vi.stubEnv("ANS_UNIFIED_POINTS_ENABLED", "0"); expect(marketPointsOnly()).toBe(false); expect(marketCashOffer("listing", 1, "seller")).toEqual({ priceMinor: 19900, providers: ["wechat", "alipay"] });
  });
});
