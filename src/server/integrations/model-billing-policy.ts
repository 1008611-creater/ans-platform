import { z } from "zod";

const positive = z.number().finite().positive().max(1_000_000).refine(n => Number(n.toFixed(6)) === n);
const source = z.string().url().max(1000).refine(value => { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password && !u.search && !u.hash; });
const evidence = z.object({ source, observedAt: z.iso.datetime({ offset: true }) }).strict();
const models = ["deepseek-v4.1-flash", "gpt-6-astra", "gpt-6.1-sol", "claude-opus-5-5"] as const;
const modelPolicy = z.object({
  requestMaxPoints: positive.max(10000),
  consumptionMultiplier: positive,
  // Factor already reflected in the APIC USD-credit receipt; remove it before
  // applying the ANS retail factor. Never apply a GPT .16 factor twice.
  receiptConsumptionMultiplier: positive,
  procurementMultiplier: positive,
  reserveRatesUsdPerMillion: z.object({ input: positive, output: positive }).strict(),
  priceEvidence: evidence,
  receiptEvidence: evidence,
}).strict();
const configSchema = z.object({
  version: z.string().min(1).max(80),
  fx: z.object({ usdCny: positive.max(100), source, observedAt: z.iso.datetime({ offset: true }) }).strict(),
  models: z.partialRecord(z.enum(models), modelPolicy),
}).strict();
const snapshotSchema = z.object({
  version: z.literal("usd-cny-points-v2"), configVersion: z.string().min(1).max(80),
  modelId: z.enum(models), pointsPerCny: z.literal(10),
  fx: configSchema.shape.fx,
  ...modelPolicy.shape,
}).strict();
export type ModelBillingSnapshot = z.infer<typeof snapshotSchema>;
export class ModelBillingError extends Error {
  get status() { return this.code === "MODEL_BILLING_REQUEST_LIMIT" ? 402 : 503; }
  constructor(public readonly code: "MODEL_BILLING_NOT_CONFIGURED" | "MODEL_BILLING_SNAPSHOT_INVALID" | "MODEL_BILLING_RECEIPT_INVALID" | "MODEL_BILLING_REQUEST_LIMIT") { super(code); }
}
const micros = (value: number) => BigInt(Math.round(value * 1e6));
const SCALE = BigInt(1_000_000);
function ceiling(numerator: bigint, denominator: bigint) {
  const value = (numerator + denominator - BigInt(1)) / denominator;
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new ModelBillingError("MODEL_BILLING_SNAPSHOT_INVALID");
  return Number(value) / 1e6;
}
function verifySnapshot(raw: unknown): ModelBillingSnapshot {
  const parsed = snapshotSchema.safeParse(raw);
  if (!parsed.success) throw new ModelBillingError("MODEL_BILLING_SNAPSHOT_INVALID");
  const value = parsed.data;
  // 零售倍率由 ANS_MODEL_BILLING_POLICY（权威定价表）决定，代码不再硬编码 0.16/1：
  // 2026-10-22 事故 —— 统一积分定价把 deepseek-v4.1-flash 定为 1.5x，而这里断言"非 gpt 必须 1"，
  // 于是默认模型换成 deepseek 后每一轮报价都抛 MODEL_BILLING_SNAPSHOT_INVALID → AGENT_UNAVAILABLE。
  // 这里只保留与倍率无关的既有约定（Claude 采购倍率 0.8）。
  if (value.modelId === "claude-opus-5-5" && value.procurementMultiplier !== 0.8)
    throw new ModelBillingError("MODEL_BILLING_SNAPSHOT_INVALID");
  return value;
}

/** No example/default FX or upstream-group assumptions are safe for real money. */
export function readModelBillingSnapshot(modelId: string, env: Readonly<Record<string, string | undefined>> = process.env, now = Date.now()): ModelBillingSnapshot {
  try {
    const config = configSchema.parse(JSON.parse(env.ANS_MODEL_BILLING_POLICY ?? ""));
    const model = config.models[modelId as typeof models[number]];
    if (!model || !Number.isFinite(now) || [config.fx.observedAt, model.priceEvidence.observedAt, model.receiptEvidence.observedAt].some(at => Date.parse(at) > now))
      throw new Error("unverified pricing");
    return verifySnapshot({ version: "usd-cny-points-v2", configVersion: config.version, modelId, pointsPerCny: 10, fx: config.fx, ...model });
  } catch { throw new ModelBillingError("MODEL_BILLING_NOT_CONFIGURED"); }
}

/** Pure price/unit conversion for catalog rates; a catalog amount is not a request.
 * Actual requests must still use reserveModelPoints to enforce their frozen cap.
 */
export function modelUsdToMemberPoints(snapshot: ModelBillingSnapshot, usdAmount: number): number {
  const quote = verifySnapshot(snapshot);
  if (!Number.isFinite(usdAmount) || usdAmount < 0 || !Number.isSafeInteger(Math.round(usdAmount * 1e6)) || Number(usdAmount.toFixed(6)) !== usdAmount)
    throw new ModelBillingError("MODEL_BILLING_SNAPSHOT_INVALID");
  return ceiling(micros(usdAmount) * micros(quote.fx.usdCny) * BigInt(10) * micros(quote.consumptionMultiplier), SCALE * SCALE);
}

/** USD list price -> CNY -> ANS points, with the independent member multiplier.
 * Rates may be conservative upper bounds; they are not advertised official prices.
 */
export function reserveModelPoints(snapshot: ModelBillingSnapshot, inputTokens: number, outputTokens: number, rates = snapshot.reserveRatesUsdPerMillion): number {
  const quote = verifySnapshot(snapshot);
  if (![inputTokens, outputTokens].every(n => Number.isSafeInteger(n) && n >= 0) || !positive.safeParse(rates.input).success || !positive.safeParse(rates.output).success)
    throw new ModelBillingError("MODEL_BILLING_SNAPSHOT_INVALID");
  const weighted = BigInt(inputTokens) * micros(rates.input) + BigInt(outputTokens) * micros(rates.output);
  const amount = ceiling(weighted * micros(quote.fx.usdCny) * BigInt(10) * micros(quote.consumptionMultiplier), SCALE * SCALE * SCALE);
  if (micros(amount) > micros(quote.requestMaxPoints)) throw new ModelBillingError("MODEL_BILLING_REQUEST_LIMIT");
  return amount;
}

/** Historical absent billing snapshot keeps the original USD-credit=point rule.
 * A present unknown/corrupt snapshot fails closed instead of silently downgrading.
 * This uses the request's immutable snapshot, never current environment settings.
 */
export function receiptToMemberPoints(price: unknown, quota: number): number {
  if (!Number.isSafeInteger(quota) || quota < 0 || quota > 500_000_000) throw new ModelBillingError("MODEL_BILLING_RECEIPT_INVALID");
  const record = price && typeof price === "object" && !Array.isArray(price) ? price as Record<string, unknown> : {};
  if (!Object.prototype.hasOwnProperty.call(record, "billing")) return quota / 500000;
  const quote = verifySnapshot(record.billing);
  return ceiling(BigInt(quota) * micros(quote.fx.usdCny) * BigInt(10) * micros(quote.consumptionMultiplier) * SCALE,
    BigInt(500000) * micros(quote.receiptConsumptionMultiplier) * SCALE);
}
