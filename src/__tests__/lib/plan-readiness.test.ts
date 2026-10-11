// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { getPlanSalesReadiness, requirePlanSaleReady, PlanSaleUnavailableError } from "@/server/billing/plan-readiness";
import { PLAN_SKUS } from "@/domain/billing/plan-catalog";

afterEach(() => vi.unstubAllEnvs());
describe("server plan sales boundary", () => {
  it("does not confuse approved prices with an operational membership", () => {
    const readiness = getPlanSalesReadiness();
    expect(readiness).toMatchObject({ status: "blocked", canPurchase: false, checkoutUrl: null });
    expect(readiness.skus).toHaveLength(6);
    for (const sku of readiness.skus) {
      expect(sku).toMatchObject({ status: "blocked", canPurchase: false, checkoutUrl: null });
      expect(sku.blockerCodes).toContain("CREDIT_PURPOSE_ISOLATION_MISSING");
      expect(sku.blockerCodes).toContain("PROCUREMENT_COST_UNVERIFIED");
      expect(sku.blockerCodes).toContain("REFUND_REVOCATION_INCOMPLETE");
    }
  });
  it("does not let an enable flag or configured merchant URL open sales", () => {
    vi.stubEnv("ANS_VIBEPLAN_ENABLED", "1");
    vi.stubEnv("ANS_VIBEPLAN_PLAN_MONTH_URL", "https://wzyp.cn/item/example");
    expect(getPlanSalesReadiness().canPurchase).toBe(false);
    expect(getPlanSalesReadiness().checkoutUrl).toBeNull();
    expect(() => requirePlanSaleReady("plan-month")).toThrow(PlanSaleUnavailableError);
  });
  it.each(PLAN_SKUS.map(sku => [sku.id]))("rejects issuance/purchase for %s", skuId => {
    expect(() => requirePlanSaleReady(skuId)).toThrow(PlanSaleUnavailableError);
    try { requirePlanSaleReady(skuId); } catch (error) {
      expect(error).toMatchObject({ code: "PLAN_SALE_UNAVAILABLE", status: 503, skuId });
    }
  });
  it("provides readable concrete gap descriptions", () => {
    for (const blocker of getPlanSalesReadiness().blockers) {
      expect(blocker.detail).toMatch(/[\u4e00-\u9fff]/);
      expect(blocker.detail).not.toContain("??");
    }
  });
  it("keeps the additional Pro delivery gap confined to Pro SKUs", () => {
    for (const sku of getPlanSalesReadiness().skus) {
      expect(sku.blockerCodes.includes("PRO_DELIVERY_INCOMPLETE")).toBe(sku.skuId.startsWith("pro-"));
    }
  });
  it("rejects unknown SKUs before any checkout is inferred", () => {
    expect(() => requirePlanSaleReady("not-a-plan")).toThrow("PLAN_SKU_NOT_FOUND");
  });
  it("can cross the server/client boundary as serializable, immutable public status", () => {
    const readiness = getPlanSalesReadiness();
    expect(JSON.parse(JSON.stringify(readiness))).toEqual(readiness);
    expect(Object.isFrozen(readiness)).toBe(true);
    expect(() => Object.assign(readiness.skus[0], { canPurchase: true })).toThrow();
  });
});
