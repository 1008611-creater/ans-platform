// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CENTS_PER_POINT, POINTS_PER_YUAN } from "@/lib/credits-pricing";
import { PLAN_SKUS, getPlanSku, getPlanSkuById, PLAN_CATALOG_VERSION } from "@/domain/billing/plan-catalog";
import { buildPlanSchedule } from "@/domain/billing/plan-schedule";

describe("approved plan catalog", () => {
  it.each([
    ["plan-week", 1900, 230, 7], ["plan-month", 4900, 650, 30],
    ["plan-quarter", 12900, 1800, 90], ["pro-week", 4900, 600, 7],
    ["pro-month", 12900, 1800, 30], ["pro-quarter", 32900, 4950, 90],
  ])("preserves purchased terms for %s", (id, priceMinor, points, durationDays) => {
    expect(getPlanSkuById(id as string)).toMatchObject({ priceMinor, points, durationDays,
      version: PLAN_CATALOG_VERSION, autoRenew: false });
  });
  it("uses the single fixed CNY conversion and grants 1.2x-1.5x bonus points on plans", () => {
    expect(POINTS_PER_YUAN).toBe(10);
    expect(CENTS_PER_POINT).toBe(10);
    expect(getPlanSku("plan", "month")).toMatchObject({ priceMinor: 4900, pointsReferenceMinor: 6500 });
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

describe("pure plan issuance schedule", () => {
  const startsAt = new Date("2026-10-12T00:00:00+08:00");
  it("plans quarterly issuance on day 0/30/60 without issuing all credits upfront", () => {
    const schedule = buildPlanSchedule({ membershipId: "m-1", skuId: "pro-quarter", startsAt });
    expect(schedule.startsAt).toBe("2026-10-11T16:00:00.000Z");
    expect(schedule.endsAt).toBe("2027-01-09T16:00:00.000Z");
    expect(schedule.grants.map(grant => [grant.points, grant.availableAt, grant.expiresAt])).toEqual([
      [1650, "2026-10-11T16:00:00.000Z", "2026-12-10T16:00:00.000Z"],
      [1650, "2026-11-10T16:00:00.000Z", "2027-01-09T16:00:00.000Z"],
      [1650, "2026-12-10T16:00:00.000Z", "2027-02-08T16:00:00.000Z"],
    ]);
    expect(new Set(schedule.grants.map(grant => grant.operationKey)).size).toBe(3);
    expect(schedule.grants.every(grant => grant.purpose === "PERSONAL_COMPUTE")).toBe(true);
  });
  it("weekly credits outlive membership by seven days", () => {
    const schedule = buildPlanSchedule({ membershipId: "m-2", skuId: "plan-week", startsAt });
    expect(Date.parse(schedule.grants[0].expiresAt) - Date.parse(schedule.endsAt)).toBe(7 * 86400000);
  });
  it("monthly credits remain valid for sixty elapsed days rather than one calendar month", () => {
    const schedule = buildPlanSchedule({ membershipId: "m-3", skuId: "plan-month", startsAt: new Date("2028-01-31T12:00:00Z") });
    expect(schedule.endsAt).toBe("2028-03-01T12:00:00.000Z");
    expect(schedule.grants[0].expiresAt).toBe("2028-03-31T12:00:00.000Z");
  });
  it("is deterministic and isolates grant operation keys by membership", () => {
    const args = { membershipId: "m-1", skuId: "plan-quarter" as const, startsAt };
    expect(buildPlanSchedule(args)).toEqual(buildPlanSchedule(args));
    expect(buildPlanSchedule(args).grants[0].operationKey)
      .not.toEqual(buildPlanSchedule({ ...args, membershipId: "m-2" }).grants[0].operationKey);
    expect(startsAt.toISOString()).toBe("2026-10-11T16:00:00.000Z");
  });
  it.each(["", "invalid:id", "x".repeat(101)])("rejects unsafe membership key %s", membershipId => {
    expect(() => buildPlanSchedule({ membershipId, skuId: "plan-week", startsAt })).toThrow("PLAN_MEMBERSHIP_ID_INVALID");
  });
  it.each([new Date(NaN), new Date(8.64e15)])("rejects invalid or overflowing timestamp %s", invalidStart => {
    expect(() => buildPlanSchedule({ membershipId: "m-1", skuId: "plan-quarter", startsAt: invalidStart })).toThrow("PLAN_START_TIME_INVALID");
  });
});
