import type { ModelBillingSnapshot } from "./model-billing-policy";
import { ModelBillingError, modelUsdToMemberPoints } from "./model-billing-policy";

const SCALE = BigInt(1_000_000);
const fail = (): never => { throw new ModelBillingError("MODEL_BILLING_RECEIPT_INVALID"); };
function ceiling(n: bigint, d: bigint): bigint {
  if (n < BigInt(0) || d <= BigInt(0)) return fail();
  return (n + d - BigInt(1)) / d;
}
function micro(value: number): bigint {
  if (!Number.isFinite(value) || value <= 0 || !Number.isSafeInteger(Math.round(value * 1e6)) || Number(value.toFixed(6)) !== value) return fail();
  return BigInt(Math.round(value * 1e6));
}
/** Gift balances are official list USD, before retail or procurement factors. */
export function reserveOfficialUsdMicros(snapshot: ModelBillingSnapshot, inputTokens: number, outputTokens: number): bigint {
  // Validate the full frozen schema, without using the retail conversion result.
  modelUsdToMemberPoints(snapshot, 0);
  if (![inputTokens, outputTokens].every(n => Number.isSafeInteger(n) && n >= 0)) return fail();
  return ceiling(BigInt(inputTokens) * micro(snapshot.reserveRatesUsdPerMillion.input)
    + BigInt(outputTokens) * micro(snapshot.reserveRatesUsdPerMillion.output), SCALE);
}
/** APIC credit may contain .16 already: undo it once to get the official USD.
 * The result never applies the paid member multiplier, FX or procurement .8. */
export function officialUsdMicrosFromReceipt(price: unknown, quota: number): bigint {
  const record = price && typeof price === "object" && !Array.isArray(price) ? price as Record<string, unknown> : {};
  const snapshot = record.billing as ModelBillingSnapshot;
  modelUsdToMemberPoints(snapshot, 0);
  if (!Number.isSafeInteger(quota) || quota < 0 || quota > 500_000_000) return fail();
  return ceiling(BigInt(quota) * SCALE * SCALE, BigInt(500_000) * micro(snapshot.receiptConsumptionMultiplier));
}
export interface BenefitFunding { version: "official-usd-gift-v1"; grantId: string; reservedUsdMicros: string }
/** Missing means historical/paid; malformed present data must never downgrade. */
export function readBenefitFunding(price: unknown): BenefitFunding | null {
  const record = price && typeof price === "object" && !Array.isArray(price) ? price as Record<string, unknown> : {};
  if (!Object.prototype.hasOwnProperty.call(record, "benefitFunding")) return null;
  const raw = record.benefitFunding;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail();
  const value = raw as Record<string, unknown>;
  if (Object.keys(value).length !== 3 || value.version !== "official-usd-gift-v1"
    || typeof value.grantId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value.grantId)
    || typeof value.reservedUsdMicros !== "string" || !/^[1-9]\d{0,9}$/.test(value.reservedUsdMicros)
    || BigInt(value.reservedUsdMicros) > BigInt(1_000_000_000)) return fail();
  return value as unknown as BenefitFunding;
}

/** Reverse only the conservative paid quote, to preserve adapter cache ceilings.
 * Paid quote rounding is upward, so this cannot under-reserve gift USD. */
export function officialUsdMicrosForPointsReserve(snapshot: ModelBillingSnapshot, points: number): bigint {
  modelUsdToMemberPoints(snapshot, 0);
  return ceiling(micro(points) * SCALE * SCALE,
    micro(snapshot.fx.usdCny) * BigInt(10) * micro(snapshot.consumptionMultiplier));
}
