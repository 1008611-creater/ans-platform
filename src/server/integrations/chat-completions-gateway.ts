import { RUN_MODEL_METERING, type RunModelKey } from "@/lib/run-models";

export interface UpstreamUsagePayload {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
    audio_tokens?: number;
  };
  input_tokens_details?: {
    cached_tokens?: number;
  };
  [key: string]: unknown;
}

export interface OfficialTokenPointsBreakdown {
  model: string;
  inputTokens: number;
  uncachedInputTokens: number;
  cachedReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  consumptionMultiplier: number;
  usdCost: number;
  billedPoints: number;
}

interface OfficialModelTariff {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  cacheReadUsdPerMillion: number;
  cacheWriteUsdPerMillion: number;
  consumptionMultiplier: number;
}

const OFFICIAL_MODEL_TARIFFS: Record<RunModelKey, OfficialModelTariff> = {
  "deepseek-v4.1-flash": {
    inputUsdPerMillion: 0.3,
    outputUsdPerMillion: 1.2,
    cacheReadUsdPerMillion: 0.006,
    cacheWriteUsdPerMillion: 0.3,
    consumptionMultiplier: RUN_MODEL_METERING["deepseek-v4.1-flash"].consumptionMultiplier,
  },
  "gpt-6-astra": {
    inputUsdPerMillion: 10,
    outputUsdPerMillion: 50,
    cacheReadUsdPerMillion: 1,
    cacheWriteUsdPerMillion: 12.5,
    consumptionMultiplier: RUN_MODEL_METERING["gpt-6-astra"].consumptionMultiplier,
  },
  "gpt-6.1-sol": {
    inputUsdPerMillion: 2,
    outputUsdPerMillion: 10,
    cacheReadUsdPerMillion: 0.1,
    cacheWriteUsdPerMillion: 2.5,
    consumptionMultiplier: RUN_MODEL_METERING["gpt-6.1-sol"].consumptionMultiplier,
  },
};

const USD_TO_CNY_RATE = 7.2;
const POINTS_PER_CNY = 10;
const POINTS_PER_USD = USD_TO_CNY_RATE * POINTS_PER_CNY; // 72 points / USD

function resolveTariff(modelKey: string): OfficialModelTariff {
  if (modelKey in OFFICIAL_MODEL_TARIFFS) {
    return OFFICIAL_MODEL_TARIFFS[modelKey as RunModelKey];
  }
  return OFFICIAL_MODEL_TARIFFS["deepseek-v4.1-flash"];
}

function estimateTokensFromText(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 2.5));
}

function roundMicro(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/**
 * Estimates the minimum pre-call points required before invoking an upstream model
 * so low-balance accounts fail fast with zero deduction.
 */
export function estimateMinPreCallPoints(modelKey: string, promptText: string): number {
  const tariff = resolveTariff(modelKey);
  const estimatedInputTokens = Math.max(64, estimateTokensFromText(promptText));
  const minExpectedOutputTokens = 128;

  const usdCost =
    (estimatedInputTokens * tariff.inputUsdPerMillion +
      minExpectedOutputTokens * tariff.outputUsdPerMillion) /
    1_000_000;

  const rawPoints = usdCost * POINTS_PER_USD * tariff.consumptionMultiplier;
  return Math.max(0.0001, roundMicro(rawPoints));
}

/**
 * Calculates settled points from upstream usage (or conservative text-length fallback)
 * using official USD/MTok tariffs and the model's consumption multiplier.
 */
export function calculateOfficialTokenPoints(
  modelKey: string,
  usage: UpstreamUsagePayload | null | undefined,
  fallbackInputText = "",
  fallbackOutputText = "",
): OfficialTokenPointsBreakdown {
  const tariff = resolveTariff(modelKey);

  const rawInputTokens =
    usage?.input_tokens ??
    usage?.prompt_tokens ??
    estimateTokensFromText(fallbackInputText);

  const rawOutputTokens =
    usage?.output_tokens ??
    usage?.completion_tokens ??
    estimateTokensFromText(fallbackOutputText);

  const rawCachedRead =
    usage?.cache_read_input_tokens ??
    usage?.prompt_cache_hit_tokens ??
    usage?.input_tokens_details?.cached_tokens ??
    usage?.prompt_tokens_details?.cached_tokens ??
    0;

  const rawCacheWrite = usage?.cache_creation_input_tokens ?? 0;

  const inputTokens = Math.max(0, Math.floor(Number(rawInputTokens) || 0));
  const outputTokens = Math.max(0, Math.floor(Number(rawOutputTokens) || 0));
  const cachedReadTokens = Math.min(
    inputTokens,
    Math.max(0, Math.floor(Number(rawCachedRead) || 0)),
  );
  const cacheWriteTokens = Math.max(0, Math.floor(Number(rawCacheWrite) || 0));
  const uncachedInputTokens = Math.max(
    0,
    usage?.prompt_cache_miss_tokens !== undefined
      ? Math.floor(Number(usage.prompt_cache_miss_tokens) || 0)
      : inputTokens - cachedReadTokens,
  );

  const baseUsdCost =
    (uncachedInputTokens * tariff.inputUsdPerMillion +
      cachedReadTokens * tariff.cacheReadUsdPerMillion +
      cacheWriteTokens * tariff.cacheWriteUsdPerMillion +
      outputTokens * tariff.outputUsdPerMillion) /
    1_000_000;

  const effectiveUsdCost = roundMicro(baseUsdCost * tariff.consumptionMultiplier);
  const billedPoints = Math.max(
    0.000001,
    roundMicro(baseUsdCost * POINTS_PER_USD * tariff.consumptionMultiplier),
  );

  return {
    model: modelKey,
    inputTokens,
    uncachedInputTokens,
    cachedReadTokens,
    cacheWriteTokens,
    outputTokens,
    consumptionMultiplier: tariff.consumptionMultiplier,
    usdCost: effectiveUsdCost,
    billedPoints,
  };
}
