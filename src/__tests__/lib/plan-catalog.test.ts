// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CENTS_PER_POINT, POINTS_PER_YUAN } from "@/lib/credits-pricing";
import { PLAN_SKUS, getPlanSku, getPlanSkuById, PLAN_CATALOG_VERSION } from "@/domain/billing/plan-catalog";

describe("approved plan catalog", () => {
  it.each([
    ["plan-week", 1900, 100, 7], ["plan-month", 4900, 300, 30],
    ["plan-quarter", 12900, 900, 90], ["pro-week", 4900, 300, 7],
    ["pro-month", 12900, 800, 30], ["pro-quarter", 32900, 2400, 90],
  ])("preserves purchased terms for %s", (id, priceMinor, points, durationDays) => {
    expect(getPlanSkuById(id as string)).toMatchObject({ priceMinor, points, durationDays,
      version: PLAN_CATALOG_VERSION, autoRenew: false });
  });
  it("uses the single fixed CNY conversion without turning the whole plan fee into points", () => {
    expect(POINTS_PER_YUAN).toBe(10);
    expect(CENTS_PER_POINT).toBe(10);
    expect(getPlanSku("plan", "month")).toMatchObject({ priceMinor: 4900, pointsReferenceMinor: 3000 });
    for (const sku of PLAN_SKUS) expect(sku.pointsReferenceMinor).toBe(sku.points * CENTS_PER_POINT);
  });
  it("provides exactly six distinct SKUs and does not sell the future team plan", () => {
    expect(new Set(PLAN_SKUS.map(sku => sku.id)).size).toBe(6);
    expect(PLAN_SKUS).toHaveLength(6);
    expect(() => getPlanSkuById("team-month")).toThrow("PLAN_SKU_NOT_FOUND");
    expect(() => getPlanSku("plan", "year" as never)).toThrow("PLAN_SKU_NOT_FOUND");
  });
  it("keeps promises immutable and explicitly marks benefits as targets", () => {
    for (const sku of PLAN_SKUS) {
      expect(Object.isFrozen(sku)).toBe(true);
      expect(Object.isFrozen(sku.targetBenefits)).toBe(true);
      expect(sku.targetBenefits.implementationStatus).toBe("target");
      expect(Object.isFrozen(sku.grants)).toBe(true);
      for (const grant of sku.grants) expect(Object.isFrozen(grant)).toBe(true);
    }
    expect(() => Object.assign(getPlanSku("plan", "month"), { priceMinor: 1 })).toThrow();
  });
});
