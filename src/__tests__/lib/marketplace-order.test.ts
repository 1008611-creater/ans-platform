import { describe, expect, it } from "vitest";
import { marketListingInputSchema, marketOrderActionSchema } from "@/contracts/marketplace";
import { buildMarketQuote, completionPostings, nextOrderStatus, paymentPostings } from "@/domain/marketplace/order";

const listing = marketListingInputSchema.parse({
  slug: "resume-site", title: "简历网站", summary: "把本人经历变成可查看的个人网站。",
  description: "根据买家确认的真实材料制作简历网站，提供文件并包含一次修改。",
  category: "career", subcategory: "resume", fulfillment: "service", priceMinor: 10001,
  currency: "CNY", deliveryDays: 3, revisionLimit: 1, computeIncluded: true,
  deliverables: ["网站文件"], licenseTerms: "买家可以使用交付文件作为个人简历网站。",
});

describe("marketplace cash and fulfillment rules", () => {
  it("freezes an integer-fen quote and rounds commission once", () => {
    const quote = buildMarketQuote(listing, { listingId: "listing", listingVersion: 1, sellerId: "seller" }, 333);
    expect(quote.platformFeeMinor).toBe(333);
    expect(quote.sellerDueMinor).toBe(9668);
    expect(completionPostings(quote).reduce((sum, row) => sum + row.amountMinor, 0)).toBe(0);
    expect(paymentPostings(quote.priceMinor).reduce((sum, row) => sum + row.amountMinor, 0)).toBe(0);
    expect(listing).not.toHaveProperty("sellerDueMinor");
  });
  it.each([-1, 10001, 0.1, Number.NaN])("rejects unapproved commission %s", (fee) => {
    expect(() => buildMarketQuote(listing, { listingId: "x", listingVersion: 1, sellerId: "s" }, fee)).toThrow("PRICING_NOT_CONFIGURED");
  });
  it("rejects fractional cash, unsafe URLs, hidden input and silent deliveries", () => {
    expect(marketListingInputSchema.safeParse({ ...listing, priceMinor: 1.1 }).success).toBe(false);
    expect(marketListingInputSchema.safeParse({ ...listing, previewUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(marketListingInputSchema.safeParse({ ...listing, previewUrl: "https://name:password@example.org" }).success).toBe(false);
    expect(marketListingInputSchema.safeParse({ ...listing, sellerId: "impersonated" }).success).toBe(false);
    expect(marketOrderActionSchema.safeParse({ action: "deliver", expectedRevision: 0, idempotencyKey: "delivery-1", message: " " }).success).toBe(false);
  });
  it("protects actor roles and never advances payment from a user action", () => {
    expect(() => nextOrderStatus({ status: "AWAITING_PAYMENT", revisionRequests: 0, revisionLimit: 1 }, "deliver", "seller")).toThrow("INVALID_ORDER_STATE");
    expect(() => nextOrderStatus({ status: "DELIVERED", revisionRequests: 0, revisionLimit: 1 }, "accept", "seller")).toThrow("FORBIDDEN");
    expect(nextOrderStatus({ status: "DELIVERED", revisionRequests: 0, revisionLimit: 1 }, "accept", "buyer")).toBe("COMPLETED");
  });
  it("enforces purchased revision limits and paid cancellation goes to dispute", () => {
    expect(() => nextOrderStatus({ status: "DELIVERED", revisionRequests: 1, revisionLimit: 1 }, "request_revision", "buyer")).toThrow("REVISION_LIMIT_REACHED");
    expect(() => nextOrderStatus({ status: "IN_PROGRESS", revisionRequests: 0, revisionLimit: 1 }, "cancel", "buyer")).toThrow("INVALID_ORDER_STATE");
    expect(nextOrderStatus({ status: "IN_PROGRESS", revisionRequests: 0, revisionLimit: 1 }, "dispute", "buyer")).toBe("DISPUTED");
  });
});
