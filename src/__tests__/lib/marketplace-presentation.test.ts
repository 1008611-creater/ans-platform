import { describe, expect, it } from "vitest";
import { availableMarketActions, getMarketOfferMetrics, getMarketSamplePreview, marketPrice, parseMarketPrice } from "@/domain/marketplace/presentation";
import { marketListingActionSchema, marketModerationSchema } from "@/contracts/marketplace-actions";
describe("market presentation follows fulfillment contracts", () => {
  it("parses decimal prices into exact integer fen", () => { expect(parseMarketPrice("100.01")).toBe(10001); expect(parseMarketPrice("0.01")).toBe(1); expect(parseMarketPrice("1000000")).toBe(100000000); expect(marketPrice(10001)).toBe("\u00a5100.01"); });
  it.each(["0", "-1", "1.001", "1e3", "0x10", "1000000.01", "01", "", "Infinity"])("rejects invalid price %s", (input) => { expect(parseMarketPrice(input)).toBeNull(); });
  it("shows only role-valid actions and purchased revision allowance", () => {
    const order = { status: "DELIVERED" as const, revisionRequests: 0, revisionLimit: 1 };
    expect(availableMarketActions(order,"seller")).toEqual([]);
    expect(availableMarketActions(order,"buyer")).toEqual(["request_revision","accept","dispute"]);
    expect(availableMarketActions({ ...order, revisionRequests: 1 },"buyer")).toEqual(["accept","dispute"]);
    expect(availableMarketActions({ ...order, status: "AWAITING_PAYMENT" },"buyer")).toEqual(["cancel"]);
  });
  it("requires explicit versioned review and rejects client privilege overrides", () => {
    expect(marketModerationSchema.safeParse({ version: 1, approve: true, note: "approved", reviewerId: "fake" }).success).toBe(false);
    expect(marketListingActionSchema.safeParse({ action: "submit" }).success).toBe(false);
    expect(marketListingActionSchema.safeParse({ action: "withdraw", sellerId: "fake" }).success).toBe(false);
  });
  it("computes deterministic rating and popularity metrics and deliverable sample previews", () => {
    const metrics = getMarketOfferMetrics({ id: "offer-1", slug: "toonflow-drama", official: true, starCount: 4, listing: { category: "aigc" } });
    expect(["4.8", "4.9", "5.0"]).toContain(metrics.rating);
    expect(metrics.count).toBeGreaterThanOrEqual(120);
    expect(metrics.summaryLabel).toContain(`★ ${metrics.rating}`);
    const sample = getMarketSamplePreview({ title: "ToonFlow 漫剧工作流", category: "aigc", deliverables: ["分镜脚本模板", "角色一致性资产"] });
    expect(sample.highlights).toHaveLength(3);
    expect(sample.snippet).toContain("ToonFlow 漫剧工作流");
  });
});
