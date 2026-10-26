import { createHash, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { TX_OPTIONS } from "@/lib/tx-options";
import { hashApiKey, isValidApiKeyFormat } from "@/lib/api-key";
import { RUN_MODEL_OPTIONS, type RunModelKey } from "@/lib/run-models";
import { ModelBillingError, readModelBillingSnapshot, type ModelBillingSnapshot } from "@/server/integrations/model-billing-policy";

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
  totalTokens: number;
  consumptionMultiplier: number;
  usdCost: number;
  billedPoints: number;
}

interface OfficialModelTariff {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  cacheReadUsdPerMillion: number;
  cacheWriteUsdPerMillion: number;
}

const OFFICIAL_MODEL_TARIFFS: Record<RunModelKey, OfficialModelTariff> = {
  "deepseek-v4.1-flash": {
    inputUsdPerMillion: 0.3,
    outputUsdPerMillion: 1.2,
    cacheReadUsdPerMillion: 0.006,
    cacheWriteUsdPerMillion: 0.3,
  },
  "gpt-6-astra": {
    inputUsdPerMillion: 10,
    outputUsdPerMillion: 50,
    cacheReadUsdPerMillion: 1,
    cacheWriteUsdPerMillion: 12.5,
  },
  "gpt-6.1-sol": {
    inputUsdPerMillion: 2,
    outputUsdPerMillion: 10,
    cacheReadUsdPerMillion: 0.1,
    cacheWriteUsdPerMillion: 2.5,
  },
};

const MODEL_ALIASES: Record<string, RunModelKey> = {
  "deepseek-v4.1-flash": "deepseek-v4.1-flash",
  "deepseek-chat": "deepseek-v4.1-flash",
  "deepseek-reasoner": "deepseek-v4.1-flash",
  "gpt-6.1-sol": "gpt-6.1-sol",
  "gpt-4o": "gpt-6.1-sol",
  "gpt-4o-mini": "gpt-6.1-sol",
  "gpt-4.1": "gpt-6.1-sol",
  "gpt-6-astra": "gpt-6-astra",
};

const POINTS_PER_CNY = 10;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Idempotency-Key",
  "Cache-Control": "no-store",
};

export function handleGatewayOptions(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function resolveGatewayModel(model: string): RunModelKey | null {
  const normalized = String(model || "").trim().toLowerCase();
  if (normalized in MODEL_ALIASES) {
    return MODEL_ALIASES[normalized];
  }
  const direct = RUN_MODEL_OPTIONS.find(item => item.key === normalized);
  return direct ? direct.key : null;
}

/** Token list prices live here; the retail multiplier and USD/CNY rate come from
 * ANS_MODEL_BILLING_POLICY, the same source the /responses path charges with.
 * Pass the snapshot read before the upstream call so pre-check and settlement
 * use one frozen price; without it the current policy is read (and may throw
 * ModelBillingError when the model has no verified policy entry). */
function resolveTariff(modelKey: string, snapshot: ModelBillingSnapshot = readModelBillingSnapshot(modelKey)): OfficialModelTariff & { consumptionMultiplier: number; pointsPerUsd: number } {
  const tariff = modelKey in OFFICIAL_MODEL_TARIFFS ? OFFICIAL_MODEL_TARIFFS[modelKey as RunModelKey] : OFFICIAL_MODEL_TARIFFS["deepseek-v4.1-flash"];
  return { ...tariff, consumptionMultiplier: snapshot.consumptionMultiplier, pointsPerUsd: snapshot.fx.usdCny * POINTS_PER_CNY };
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
export function estimateMinPreCallPoints(modelKey: string, promptText: string, snapshot?: ModelBillingSnapshot): number {
  const tariff = resolveTariff(modelKey, snapshot);
  const estimatedInputTokens = Math.max(64, estimateTokensFromText(promptText));
  const minExpectedOutputTokens = 128;

  const usdCost =
    (estimatedInputTokens * tariff.inputUsdPerMillion +
      minExpectedOutputTokens * tariff.outputUsdPerMillion) /
    1_000_000;

  const rawPoints = usdCost * tariff.pointsPerUsd * tariff.consumptionMultiplier;
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
  snapshot?: ModelBillingSnapshot,
): OfficialTokenPointsBreakdown {
  const tariff = resolveTariff(modelKey, snapshot);

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
  const totalTokens = inputTokens + outputTokens;

  const baseUsdCost =
    (uncachedInputTokens * tariff.inputUsdPerMillion +
      cachedReadTokens * tariff.cacheReadUsdPerMillion +
      cacheWriteTokens * tariff.cacheWriteUsdPerMillion +
      outputTokens * tariff.outputUsdPerMillion) /
    1_000_000;

  const effectiveUsdCost = roundMicro(baseUsdCost * tariff.consumptionMultiplier);
  const billedPoints = Math.max(
    0.000001,
    // Trim float noise (e.g. 162648.00000000003) before rounding up to a micro-point.
    Math.ceil(Number((baseUsdCost * tariff.pointsPerUsd * tariff.consumptionMultiplier * 1_000_000).toFixed(6))) / 1_000_000,
  );

  return {
    model: modelKey,
    inputTokens,
    uncachedInputTokens,
    cachedReadTokens,
    cacheWriteTokens,
    outputTokens,
    totalTokens,
    consumptionMultiplier: tariff.consumptionMultiplier,
    usdCost: effectiveUsdCost,
    billedPoints,
  };
}

function gatewayFailure(code: string, status: number, message = code): Response {
  return Response.json(
    { error: { message, type: "ans_gateway_error", code } },
    { status, headers: CORS_HEADERS },
  );
}

async function authenticateGatewayUser(request: Request) {
  if (process.env.ANS_CODEX_GATEWAY_ENABLED !== "1") return null;
  const key = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  if (!isValidApiKeyFormat(key)) return null;
  return db.user.findFirst({
    where: { apiKey: hashApiKey(key), flagged: false, deletedAt: null },
    select: { id: true, quotaPoints: true },
  });
}

export async function v1Models(request: Request): Promise<Response> {
  const user = await authenticateGatewayUser(request);
  if (!user) return gatewayFailure("INVALID_API_KEY", 401);
  return Response.json(
    {
      object: "list",
      data: RUN_MODEL_OPTIONS.map(m => ({
        id: m.key,
        object: "model",
        owned_by: "ANS",
      })),
    },
    { status: 200, headers: CORS_HEADERS },
  );
}

export async function chatCompletionsGateway(request: Request): Promise<Response> {
  const user = await authenticateGatewayUser(request);
  if (!user) return gatewayFailure("INVALID_API_KEY", 401);

  let rawBody: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return gatewayFailure("INVALID_REQUEST", 400);
    }
    rawBody = parsed as Record<string, unknown>;
  } catch {
    return gatewayFailure("INVALID_JSON", 400);
  }

  const resolvedModel = resolveGatewayModel(String(rawBody.model ?? ""));
  if (!resolvedModel) {
    return gatewayFailure("MODEL_UNAVAILABLE", 400);
  }

  const messagesText = JSON.stringify(rawBody.messages ?? []);
  let pricing: ModelBillingSnapshot;
  try {
    pricing = readModelBillingSnapshot(resolvedModel);
  } catch (error) {
    if (error instanceof ModelBillingError) return gatewayFailure(error.code, error.status);
    throw error;
  }
  const minPreCallPoints = estimateMinPreCallPoints(resolvedModel, messagesText, pricing);
  const currentBalance = Number(user.quotaPoints ?? 0);
  if (currentBalance <= 0 || currentBalance < minPreCallPoints) {
    return gatewayFailure(
      "INSUFFICIENT_QUOTA",
      402,
      `Insufficient ANS points balance (${currentBalance} pts).`,
    );
  }

  const baseUrl = (process.env.RUN_BASE_URL || "https://apic.cauai.fun/v1").replace(/\/$/, "");
  const apiKey = process.env.RUN_API_KEY || "";
  if (!apiKey) {
    return gatewayFailure("UPSTREAM_NOT_CONFIGURED", 503);
  }

  const upstreamPayload = JSON.stringify({
    ...rawBody,
    model: resolvedModel,
    stream: false,
  });

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: upstreamPayload,
    });
  } catch {
    return gatewayFailure("UPSTREAM_UNREACHABLE", 502);
  }

  if (!upstreamRes.ok) {
    return gatewayFailure("UPSTREAM_ERROR", upstreamRes.status);
  }

  const data = (await upstreamRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: UpstreamUsagePayload;
    [key: string]: unknown;
  };
  const replyText = data?.choices?.[0]?.message?.content ?? "";
  const billing = calculateOfficialTokenPoints(
    resolvedModel,
    data?.usage,
    messagesText,
    replyText,
    pricing,
  );
  const upstreamRequestId =
    upstreamRes.headers.get("x-oneapi-request-id") ||
    upstreamRes.headers.get("x-request-id") ||
    randomUUID();
  const requestId = randomUUID();
  const payloadHash = createHash("sha256").update(upstreamPayload).digest("hex");

  await db.$transaction(async tx => {
    const freshUser = await tx.user.findUnique({
      where: { id: user.id },
      select: { quotaPoints: true },
    });
    const updated = await tx.user.update({
      where: { id: user.id },
      data: { quotaPoints: { decrement: billing.billedPoints } },
      select: { quotaPoints: true },
    });
    const nextBalance = Number(
      updated?.quotaPoints ?? Math.max(0, Number(freshUser?.quotaPoints ?? currentBalance) - billing.billedPoints),
    );
    await tx.quotaLedger.create({
      data: {
        userId: user.id,
        amount: -billing.billedPoints,
        balanceAfter: nextBalance,
        reason: "RUN_COST",
        refType: "api_compute_request",
        refId: requestId,
        note: `Gateway /v1/chat/completions (${resolvedModel})`,
      },
    });
    await tx.apiComputeRequest.create({
      data: {
        id: requestId,
        userId: user.id,
        provider: "apic-codex",
        modelId: resolvedModel,
        idempotencyKey: `chatcmpl:${requestId}`,
        requestHash: payloadHash,
        policyVersion: "official-token-v1",
        maxUnits: Math.max(1, billing.totalTokens),
        authorizedPoints: billing.billedPoints,
        settledPoints: billing.billedPoints,
        state: "SETTLED",
        outcome: upstreamRequestId,
        price: {
          protocol: "openai-chat-completions",
          model: resolvedModel,
          uncachedInputTokens: billing.uncachedInputTokens,
          cachedReadTokens: billing.cachedReadTokens,
          cacheWriteTokens: billing.cacheWriteTokens,
          outputTokens: billing.outputTokens,
          consumptionMultiplier: billing.consumptionMultiplier,
          usdCost: billing.usdCost,
          billedPoints: billing.billedPoints,
        },
        finishedAt: new Date(),
      },
    });
  }, TX_OPTIONS);

  return Response.json(
    {
      ...data,
      ans_billing: {
        model: resolvedModel,
        charged_points: billing.billedPoints,
        uncached_input_tokens: billing.uncachedInputTokens,
        cached_read_tokens: billing.cachedReadTokens,
        cache_write_tokens: billing.cacheWriteTokens,
        output_tokens: billing.outputTokens,
        total_tokens: billing.totalTokens,
        multiplier: billing.consumptionMultiplier,
        official_usd_cost: billing.usdCost,
      },
    },
    {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "x-ans-model": resolvedModel,
        "x-ans-charged-points": String(billing.billedPoints),
      },
    },
  );
}
