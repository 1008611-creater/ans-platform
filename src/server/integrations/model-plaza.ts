import { z } from "zod";
import type { ModelPlazaCatalog, ModelPlazaModel, ModelPlazaPrice } from "@/lib/model-plaza";
import { readModelBillingSnapshot, modelUsdToMemberPoints } from "@/server/integrations/model-billing-policy";

const SOURCE_URL = "https://apic.cauai.fun/pricing";
const PRICING_URL = "https://apic.cauai.fun/api/pricing";
function resolvePricingUrl(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const runBase = env.RUN_BASE_URL?.trim();
  if (runBase) {
    try {
      const parsed = new URL(runBase);
      if (parsed.hostname === "apic.cauai.fun" && parsed.port === "3000") {
        return `${parsed.origin}/api/pricing`;
      }
    } catch { /* ignore invalid URL */ }
  }
  return PRICING_URL;
}
const MAX_BYTES = 1024 * 1024;
const rate = z.number().finite().nonnegative().max(1_000_000);
const publicSchema = z.object({
  success: z.literal(true),
  pricing_version: z.string().regex(/^[a-zA-Z0-9._-]{1,128}$/).optional(),
  data: z.array(z.object({
    model_name: z.string().min(1).max(120), quota_type: z.number().int(),
    model_ratio: rate.optional(), completion_ratio: rate.optional(), cache_ratio: rate.optional(),
    billing_mode: z.string().max(80).optional(), billing_expr: z.unknown().optional(),
    supported_endpoint_types: z.array(z.string().max(80)).max(30).optional(),
  })).max(2000),
});
const official = (sourceUrl: string, input: number, output: number, cacheRead: number, cacheWrite5m: number | null = null, cacheWrite1h: number | null = null): ModelPlazaPrice => ({
  input, output, cacheRead, cacheWrite5m, cacheWrite1h, source: "official", sourceUrl,
});
/** Verified 2026-10-16 standard USD/MTok references. These are neither
 * conservative authorization ceilings nor proof of supplier availability.
 * DeepSeek is the published peak tariff; GPT long-context/fast and Claude
 * fast/region/tool surcharges are not included in these reference figures.
 */
const REFERENCES: ModelPlazaModel[] = [
  { id: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash", vendor: "DeepSeek", endpoints: ["Chat Completions"], pricingType: "tokens", status: "not-listed", consumptionMultiplier: 1.5,
    usdPerMillion: official("https://api-docs.deepseek.com/quick_start/pricing/", 0.3, 1.2, 0.006), pointsPerMillion: null },
  { id: "gpt-6-astra", name: "GPT-6 Astra", vendor: "OpenAI", endpoints: ["Chat Completions", "Responses"], pricingType: "tokens", status: "not-listed", consumptionMultiplier: 0.16,
    usdPerMillion: { ...official("https://developers.openai.com/api/docs/models/gpt-6-astra", 10, 50, 1), cacheWrite: 12.5 }, pointsPerMillion: null },
  { id: "gpt-6.1-sol", name: "GPT-6.1 Sol", vendor: "OpenAI", endpoints: ["Chat Completions", "Responses"], pricingType: "tokens", status: "not-listed", consumptionMultiplier: 0.16,
    usdPerMillion: { ...official("https://developers.openai.com/api/docs/models/gpt-6.1-sol", 2, 10, 0.1), cacheWrite: 2.5 }, pointsPerMillion: null },
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", vendor: "Anthropic", endpoints: ["Messages"], pricingType: "tokens", status: "prepared", consumptionMultiplier: 1,
    usdPerMillion: official("https://platform.claude.com/docs/en/about-claude/pricing", 4, 20, 0.2, 5, 8), pointsPerMillion: null },
];
const endpointNames: Readonly<Record<string, string>> = { openai: "Chat Completions", openai_response: "Responses", anthropic: "Messages" };
async function readBoundedJson(response: Response): Promise<unknown> {
  const length = response.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BYTES)) throw new Error("MODEL_DIRECTORY_TOO_LARGE");
  if (!response.body) throw new Error("MODEL_DIRECTORY_EMPTY");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength; if (bytes > MAX_BYTES) throw new Error("MODEL_DIRECTORY_TOO_LARGE"); chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => undefined); }
  const joined = new Uint8Array(bytes); let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(joined));
}

/** Fetch only APIC's public catalog, without credentials or member data. Private
 * group metadata and arbitrary upstream endpoint URLs are never serialized.
 */
export async function readModelPlazaCatalog(options: {
  fetcher?: typeof fetch; environment?: Readonly<Record<string, string | undefined>>; now?: Date;
} = {}): Promise<ModelPlazaCatalog> {
  const now = options.now ?? new Date();
  const env = options.environment ?? process.env;
  const result: ModelPlazaCatalog = {
    sourceUrl: SOURCE_URL, observedAt: null, pricingVersion: null, referenceDate: "2026-10-16", state: "unavailable",
    models: structuredClone(REFERENCES),
    billing: { pointsPerCny: 10, usdCny: null, fxSource: null, fxAsOf: null },
  };
  try {
    const response = await (options.fetcher ?? fetch)(resolvePricingUrl(env), {
      cache: "no-store", redirect: "error", credentials: "omit", signal: AbortSignal.timeout(6000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("MODEL_DIRECTORY_UNAVAILABLE");
    const data = publicSchema.parse(await readBoundedJson(response));
    const unique = new Set<string>();
    for (const entry of data.data) {
      if (unique.has(entry.model_name)) throw new Error("MODEL_DIRECTORY_DUPLICATE"); unique.add(entry.model_name);
    }
    for (const model of result.models) {
      const entry = data.data.find(entry => entry.model_name === model.id);
      if (!entry || entry.quota_type !== 0 || entry.model_ratio === undefined || entry.completion_ratio === undefined || model.status === "prepared") continue;
      model.status = "listed";
      model.endpoints = (entry.supported_endpoint_types ?? []).map(name => endpointNames[name]).filter((name): name is string => Boolean(name));
      // Legacy ratio fields are not effective prices when a tiered expression is
      // present. Never evaluate untrusted expressions or advertise stale ratios.
      if ((entry.billing_mode !== undefined && entry.billing_mode !== "ratio") || entry.billing_expr !== undefined) continue;
      // New API's ratio basis is USD 2/MTok (APIC published example: .15 => .30).
      const input = entry.model_ratio * 2;
      const prices: ModelPlazaPrice = { input, output: input * entry.completion_ratio,
        cacheRead: entry.cache_ratio === undefined ? null : input * entry.cache_ratio,
        cacheWrite5m: null, cacheWrite1h: null, source: "apic", sourceUrl: SOURCE_URL };
      if (![prices.input, prices.output, prices.cacheRead ?? 0].every(value => Number.isFinite(value) && value >= 0 && value <= 1_000_000)) throw new Error("MODEL_DIRECTORY_RATE_INVALID");
      model.status = "listed"; model.usdPerMillion = prices;
      model.endpoints = (entry.supported_endpoint_types ?? []).map(name => endpointNames[name]).filter((name): name is string => Boolean(name));
    }
    result.state = "current"; result.observedAt = now.toISOString(); result.pricingVersion = data.pricing_version ?? null;
  } catch {
    // Keep only explicitly labeled official reference figures; no stale live state.
    result.models = structuredClone(REFERENCES);
  }
  for (const model of result.models) {
    try {
      const snapshot = readModelBillingSnapshot(model.id, options.environment ?? process.env, now.getTime());
      model.consumptionMultiplier = snapshot.consumptionMultiplier;
      const reference = REFERENCES.find(item => item.id === model.id)!.usdPerMillion!;
      const price = model.usdPerMillion;
      // A differing supplier tariff must be reconciled before advertising a retail conversion.
      if (!price || price.input !== reference.input || price.output !== reference.output ||
        (price.cacheRead !== null && price.cacheRead !== reference.cacheRead) ||
        snapshot.priceEvidence.source !== reference.sourceUrl) continue;
      result.billing = { pointsPerCny: 10, usdCny: snapshot.fx.usdCny, fxSource: snapshot.fx.source, fxAsOf: snapshot.fx.observedAt };
      const convert = (value: number | null): number | null => value === null ? null : value === 0 ? 0 : modelUsdToMemberPoints(snapshot, value);
      model.pointsPerMillion = { input: convert(price.input)!, output: convert(price.output)!, cacheRead: convert(price.cacheRead), cacheWrite: convert(price.cacheWrite ?? null), cacheWrite5m: convert(price.cacheWrite5m), cacheWrite1h: convert(price.cacheWrite1h) };
    } catch { /* Missing/unverified FX or model policy is never guessed. */ }
  }
  return result;
}
