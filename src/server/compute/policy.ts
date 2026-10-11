import { computePolicySchema, computePriceSchema, type ComputePrice } from "@/contracts/compute";

export class ComputeError extends Error {
  constructor(public readonly code: string, public readonly status = 409) { super(code); }
}
export function computeEnabled() { return process.env.ANS_TOONFLOW_COMPUTE_ENABLED === "1"; }
export function requireComputeEnabled() {
  if (!computeEnabled()) throw new ComputeError("COMPUTE_NOT_CONFIGURED", 503);
}
export function loadComputePolicy() {
  const raw = process.env.ANS_TOONFLOW_COMPUTE_POLICY;
  if (!raw) throw new ComputeError("COMPUTE_POLICY_UNAVAILABLE", 503);
  try {
    const policy = computePolicySchema.parse(JSON.parse(raw));
    if (!Object.keys(policy.models).length) throw new Error();
    return policy;
  } catch { throw new ComputeError("COMPUTE_POLICY_UNAVAILABLE", 503); }
}
export function computePoints(price: ComputePrice, units: number) {
  if (!computePriceSchema.safeParse(price).success || !Number.isSafeInteger(units) || units < 1 || units > price.maxUnits) {
    throw new ComputeError("COMPUTE_USAGE_INVALID", 422);
  }
  // Integer arithmetic, including rates per million tokens. Never round down,
  // accept unknown usage as zero, or silently clamp above the agreed budget.
  const numerator = BigInt(price.ratePoints) * BigInt(units);
  const denominator = BigInt(price.rateUnits);
  const points = Number((numerator + denominator - BigInt(1)) / denominator);
  if (points < 1 || points > 2_000_000_000) throw new ComputeError("COMPUTE_BUDGET_INVALID", 422);
  return points;
}
export function computeQuote(modelId: string, maxUnits: number) {
  requireComputeEnabled();
  const policy = loadComputePolicy();
  if (!Object.hasOwn(policy.models, modelId)) throw new ComputeError("COMPUTE_MODEL_UNAVAILABLE", 503);
  const price = policy.models[modelId];
  return { policyVersion: policy.version, price, maxUnits, authorizedPoints: computePoints(price, maxUnits), concurrentMax: policy.concurrentMax };
}
