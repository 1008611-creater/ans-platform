import { describe, expect, it } from "vitest";
import { marketListingInputSchema, marketOrderCreateSchema, marketQuoteSchema } from "@/contracts/marketplace";
import { buildMarketQuote, selectMarketPricingTier } from "@/domain/marketplace/order";

const listing = marketListingInputSchema.parse({
  slug: "real-project", title: "Project repository", summary: "A project with two separately priced deliveries.",
  description: "The seller delivers repository files or repository files plus deployment guidance.",
  category: "web", subcategory: "app", fulfillment: "service", priceMinor: 500,
  currency: "CNY", deliveryDays: 2, revisionLimit: 1, computeIncluded: false,
  deliverables: ["Repository files"], licenseTerms: "Buyer may use the delivered files under the provided license.",
  githubUrl: "https://github.com/example/project", usageUrl: "https://example.org/app",
  pricingTiers: [
    { id: "basic", title: "Source", description: "Repository delivery", priceMinor: 1250, deliverables: ["Source archive"] },
    { id: "deploy", title: "Deployment", description: "Source and deployment", priceMinor: 3500, deliverables: ["Source archive", "Deployment guidance"] },
  ],
});

describe("reviewed project pricing tiers", () => {
  it.each(["basic", "deploy"])("selects only the reviewed %s tier and freezes its quote", tierId => {
    const selected = selectMarketPricingTier(listing, tierId);
    const quote = marketQuoteSchema.parse({ ...buildMarketQuote(selected.listing, { listingId: "listing", listingVersion: 3, sellerId: "seller" }, 1000), selectedTierId: selected.selectedTierId, selectedTierTitle: selected.selectedTierTitle });
    const tier = listing.pricingTiers!.find(item => item.id === tierId)!;
    expect(quote.priceMinor).toBe(tier.priceMinor);
    expect(quote.deliverables).toEqual(tier.deliverables);
    expect(quote.selectedTierTitle).toBe(tier.title);
    expect(quote.listingVersion).toBe(3);
    expect(quote.platformFeeMinor + quote.sellerDueMinor).toBe(quote.priceMinor);
    expect(listing.priceMinor).toBe(500);
  });
  it.each([undefined, "removed"])("requires an available tier instead of falling back for %s", tierId => {
    expect(() => selectMarketPricingTier(listing, tierId)).toThrow("INVALID_TIER");
  });
  it("keeps old single-price payloads usable without a tier", () => {
    const { pricingTiers: _tiers, ...legacy } = listing;
    void _tiers;
    expect(selectMarketPricingTier(legacy).listing.priceMinor).toBe(500);
    expect(() => selectMarketPricingTier(legacy, "basic")).toThrow("INVALID_TIER");
  });
  it.each([0, 1.1, -1, 100_000_001])("rejects invalid tier prices %s", priceMinor => {
    expect(marketListingInputSchema.safeParse({ ...listing, pricingTiers: [{ ...listing.pricingTiers![0], priceMinor }] }).success).toBe(false);
  });
  it("rejects duplicate IDs and more than six tiers", () => {
    const basic = listing.pricingTiers![0];
    expect(marketListingInputSchema.safeParse({ ...listing, pricingTiers: [basic, basic] }).success).toBe(false);
    expect(marketListingInputSchema.safeParse({ ...listing, pricingTiers: Array.from({ length: 7 }, (_, index) => ({ ...basic, id: `tier-${index}` })) }).success).toBe(false);
  });
  it.each(["https://github.com:8443/example/project", "http://github.com/example/project", "https://github.com/example", "https://github.com/example/project/issues", "https://github.com.evil.org/example/project", "https://github.com/example/project?token=secret"])("rejects non-repository GitHub URLs %s", githubUrl => {
    expect(marketListingInputSchema.safeParse({ ...listing, githubUrl }).success).toBe(false);
  });
  it("rejects insecure app URLs and client-supplied price/identity", () => {
    expect(marketListingInputSchema.safeParse({ ...listing, usageUrl: "http://example.org" }).success).toBe(false);
    const request = { listingId: "listing", expectedVersion: 3, tierId: "basic", idempotencyKey: "checkout-1" };
    expect(marketOrderCreateSchema.safeParse(request).success).toBe(true);
    expect(marketOrderCreateSchema.safeParse({ ...request, priceMinor: 1 }).success).toBe(false);
    expect(marketOrderCreateSchema.safeParse({ ...request, buyerId: "other" }).success).toBe(false);
  });
});
