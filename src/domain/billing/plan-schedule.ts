import { getPlanSkuById, type PlanSkuId } from "./plan-catalog";

const DAY_MS = 24 * 60 * 60 * 1000;

export type PlannedGrant = Readonly<{
  sequence: number;
  operationKey: string;
  availableAt: string;
  expiresAt: string;
  points: number;
  purpose: "PERSONAL_COMPUTE";
}>;

/** Exact elapsed days, never calendar-month arithmetic or the host's timezone.
 * This is a pure issuance plan. It does not grant, expire or persist any credits. */
export function buildPlanSchedule(args: {
  membershipId: string;
  skuId: PlanSkuId;
  startsAt: Date;
}) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(args.membershipId)) {
    throw new Error("PLAN_MEMBERSHIP_ID_INVALID");
  }
  const startMs = args.startsAt instanceof Date ? args.startsAt.getTime() : NaN;
  if (!Number.isSafeInteger(startMs)) throw new Error("PLAN_START_TIME_INVALID");
  const sku = getPlanSkuById(args.skuId);
  const isoAfter = (days: number) => {
    const timestamp = startMs + days * DAY_MS;
    if (!Number.isSafeInteger(timestamp) || Math.abs(timestamp) > 8.64e15) {
      throw new Error("PLAN_START_TIME_INVALID");
    }
    return new Date(timestamp).toISOString();
  };
  return Object.freeze({
    membershipId: args.membershipId,
    skuId: sku.id,
    catalogVersion: sku.version,
    startsAt: isoAfter(0),
    endsAt: isoAfter(sku.durationDays),
    grants: Object.freeze(sku.grants.map((grant, sequence): PlannedGrant => Object.freeze({
      sequence,
      operationKey: `plan-grant:${args.membershipId}:${sku.version}:${sequence}`,
      availableAt: isoAfter(grant.offsetDays),
      expiresAt: isoAfter(grant.offsetDays + grant.validForDays),
      points: grant.points,
      purpose: grant.purpose,
    }))),
  });
}
