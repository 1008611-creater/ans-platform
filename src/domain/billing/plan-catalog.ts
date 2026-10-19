import { CENTS_PER_POINT } from "./credit-value";

/** Change this version when any commercial promise changes. Purchased terms must
 * retain their own snapshot rather than being recalculated from this catalog. */
export const PLAN_CATALOG_VERSION = "2026-10-12.v1";
export const PLAN_TIERS = ["plan", "pro"] as const;
export const PLAN_PERIODS = ["week", "month", "quarter"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];
export type PlanPeriod = (typeof PLAN_PERIODS)[number];
export type PlanSkuId = `${PlanTier}-${PlanPeriod}`;

export type PlanGrant = Readonly<{
  offsetDays: number;
  points: number;
  validForDays: number;
  purpose: "PERSONAL_COMPUTE";
}>;

/** Approved targets, not evidence that a benefit is available or enforced. */
export type PlanTargetBenefits = Readonly<{
  implementationStatus: "target";
  activeProjects: number;
  storageGb: number;
  concurrentTasks: number;
  automaticHistoryDays: number;
  marketCommissionBps: number;
  workflow: "mature-recipes" | "batch-branches-delivery";
  presentation: "custom-layout" | "client-delivery";
  collaboration: "project-collaboration" | "granular-client-feedback";
  support: "priority" | "higher-priority";
  decoration: "plan" | "pro";
}>;

export type PlanSku = Readonly<{
  id: PlanSkuId;
  version: typeof PLAN_CATALOG_VERSION;
  tier: PlanTier;
  period: PlanPeriod;
  priceMinor: number;
  points: number;
  pointsReferenceMinor: number;
  durationDays: number;
  autoRenew: false;
  grants: readonly PlanGrant[];
  targetBenefits: PlanTargetBenefits;
}>;

export const FREE_PLAN_TARGET_BENEFITS = Object.freeze({
  implementationStatus: "target" as const,
  activeProjects: 5,
  storageGb: 1,
  concurrentTasks: 1,
  automaticHistoryDays: 7,
  marketCommissionBps: 1000,
});

const targetBenefits: Readonly<Record<PlanTier, PlanTargetBenefits>> = Object.freeze({
  plan: Object.freeze({
    implementationStatus: "target", activeProjects: 30, storageGb: 10,
    concurrentTasks: 2, automaticHistoryDays: 30, marketCommissionBps: 800,
    workflow: "mature-recipes", presentation: "custom-layout",
    collaboration: "project-collaboration", support: "priority", decoration: "plan",
  }),
  pro: Object.freeze({
    implementationStatus: "target", activeProjects: 100, storageGb: 50,
    concurrentTasks: 4, automaticHistoryDays: 90, marketCommissionBps: 600,
    workflow: "batch-branches-delivery", presentation: "client-delivery",
    collaboration: "granular-client-feedback", support: "higher-priority", decoration: "pro",
  }),
});

function sku(tier: PlanTier, period: PlanPeriod, priceMinor: number, grantPoints: number): PlanSku {
  const durationDays = period === "week" ? 7 : period === "month" ? 30 : 90;
  const offsets = period === "quarter" ? [0, 30, 60] : [0];
  const grants = Object.freeze(offsets.map((offsetDays) => Object.freeze({
    offsetDays, points: grantPoints,
    validForDays: period === "week" ? 14 : 60,
    purpose: "PERSONAL_COMPUTE" as const,
  })));
  const points = grantPoints * grants.length;
  return Object.freeze({
    id: `${tier}-${period}` as PlanSkuId, version: PLAN_CATALOG_VERSION,
    tier, period, priceMinor, points, pointsReferenceMinor: points * CENTS_PER_POINT,
    durationDays, autoRenew: false, grants, targetBenefits: targetBenefits[tier],
  });
}

export const PLAN_SKUS: readonly PlanSku[] = Object.freeze([
  sku("plan", "week", 1900, 230),
  sku("plan", "month", 4900, 650),
  sku("plan", "quarter", 12900, 600),
  sku("pro", "week", 4900, 600),
  sku("pro", "month", 12900, 1800),
  sku("pro", "quarter", 32900, 1650),
]);

export function getPlanSku(tier: PlanTier, period: PlanPeriod): PlanSku {
  const found = PLAN_SKUS.find((entry) => entry.tier === tier && entry.period === period);
  if (!found) throw new Error("PLAN_SKU_NOT_FOUND");
  return found;
}

export function getPlanSkuById(id: string): PlanSku {
  const found = PLAN_SKUS.find((entry) => entry.id === id);
  if (!found) throw new Error("PLAN_SKU_NOT_FOUND");
  return found;
}
