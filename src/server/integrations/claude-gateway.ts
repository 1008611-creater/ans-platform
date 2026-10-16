import { readModelBillingSnapshot, ModelBillingError } from "./model-billing-policy";
import { claudeIdempotencyKey, validateClaudeIdentityHeaders, validateClaudeProtocolHeaders } from "./claude-client";
import { authenticateCodex, meteredGatewayRequest, type MeteredGatewayAdapter } from "./codex-gateway";
import { ClaudePolicyError, readClaudePolicy, validateClaudePayload, validateClaudeInput, type ClaudePolicy } from "./claude-policy";

function failure(code: string, status: number) {
  return Response.json({ type: "error", error: { type: status === 401 ? "authentication_error" : status === 429 ? "rate_limit_error" : status >= 500 ? "api_error" : "invalid_request_error", message: code } }, {
    status, headers: { "Cache-Control": "private, no-store" },
  });
}

/** Never send a personal ANS key upstream. Native Claude and Codex both use
 * the same existing, isolated APIC infrastructure token and receipt bridge. */
function requireClaudeInfrastructure() {
  let base: URL;
  try { base = new URL(process.env.RUN_BASE_URL ?? ""); } catch { throw new ClaudePolicyError("CLAUDE_POLICY_INVALID", 503); }
  if (base.hostname !== "apic.cauai.fun" || base.protocol !== "https:" ||
      base.pathname.replace(/\/$/, "") !== "/v1" || base.username || base.password || base.search || base.hash ||
      !process.env.RUN_API_KEY || !process.env.APIC_COST_BRIDGE_URL || !process.env.APIC_COST_BRIDGE_SECRET ||
      process.env.ANS_APIC_BILLING_ENABLED !== "1" || process.env.ANS_CLAUDE_UPSTREAM_VERIFIED !== "1" ||
      process.env.ANS_CLAUDE_BILLING_VERIFIED !== "1") throw new ClaudePolicyError("CLAUDE_POLICY_INVALID", 503);
}

function claudeAdapter(policy: ClaudePolicy): MeteredGatewayAdapter {
  return {
    idempotencyKey: claudeIdempotencyKey,
    path: "messages", maxBodyBytes: policy.maxBodyBytes, policyVersion: policy.version,
    maxConcurrent: 1, rollingDayMaxPoints: policy.rollingDayMaxPoints, timeoutMs: policy.timeoutMs,
    priceSnapshot: { protocol: "anthropic-messages", policy, billing: readModelBillingSnapshot(policy.modelId) },
    parse(value) {
      const parsed = validateClaudePayload(value, policy);
      return { text: parsed.text, model: parsed.modelId, limit: parsed.maxOutputTokens, reserve: parsed.reserve, streaming: parsed.stream, billing: parsed.billing };
    },
  };
}

export async function claudeMessages(request: Request) {
  let policy: ClaudePolicy;
  try { policy = readClaudePolicy(); requireClaudeInfrastructure(); readModelBillingSnapshot(policy.modelId); }
  catch (error) { return failure(error instanceof ClaudePolicyError || error instanceof ModelBillingError ? error.code : "CLAUDE_POLICY_INVALID", 503); }
  // These are deliberate per-request spend authorizations. Do not infer permission
  // for an expensive request from the wallet balance or a GPT client's defaults.
  const capText = request.headers.get("x-ans-max-points") ?? "";
  const cap = Number(capText);
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(capText) || !Number.isFinite(cap) || cap <= 0 || cap > policy.requestMaxPoints)
    return failure("CLAUDE_REQUEST_BUDGET_REQUIRED", 400);
  try { validateClaudeProtocolHeaders(request); validateClaudeIdentityHeaders(request); }
  catch (error) { return failure(error instanceof ClaudePolicyError || error instanceof ModelBillingError ? error.code : "CLAUDE_INVALID_REQUEST", 400); }
  const authorization = request.headers.get("authorization") || (request.headers.get("x-api-key") ? `Bearer ${request.headers.get("x-api-key")}` : "");
  const user = await authenticateCodex(new Request(request.url, { headers: { Authorization: authorization } }));
  if (!user) return failure("INVALID_API_KEY", 401);
  return meteredGatewayRequest(request, user.id, undefined, { memberPointsCap: cap }, claudeAdapter(policy));
}


/** Lightweight native endpoints share readiness/authentication, never a debit. */
async function authorizeClaudeMetadata(request: Request) {
  const policy = readClaudePolicy(); requireClaudeInfrastructure();
  validateClaudeProtocolHeaders(request);
  const authorization = request.headers.get("authorization") || (request.headers.get("x-api-key") ? `Bearer ${request.headers.get("x-api-key")}` : "");
  // Metadata reads must not trigger receipt reconciliation or any wallet mutation.
  const user = await authenticateCodex(new Request(request.url, { headers: { Authorization: authorization } }), { reconcile: false });
  return user ? policy : null;
}

export async function claudeModels(request: Request) {
  try {
    const policy = await authorizeClaudeMetadata(request);
    if (!policy) return failure("INVALID_API_KEY", 401);
    if (!policy.modelMetadata) return failure("CLAUDE_MODEL_METADATA_UNAVAILABLE", 503);
    return Response.json({
      data: [{ id: policy.modelId, type: "model", display_name: "Claude Opus 5.5", created_at: policy.modelMetadata.createdAt }],
      has_more: false, first_id: policy.modelId, last_id: policy.modelId,
    }, { headers: { "Cache-Control": "private, no-store", "x-ans-model-metadata-kind": "upstream-reported" } });
  } catch (error) { return failure(error instanceof ClaudePolicyError || error instanceof ModelBillingError ? error.code : "CLAUDE_POLICY_INVALID", error instanceof ClaudePolicyError ? error.status : 503); }
}

/** This local UTF8 ceiling aids compaction; it is not the supplier tokenizer
 * and is never a billable-usage or settlement authority. */
export async function claudeCountTokens(request: Request) {
  try {
    const policy = await authorizeClaudeMetadata(request);
    if (!policy) return failure("INVALID_API_KEY", 401);
    if (Number(request.headers.get("content-length")) > policy.maxBodyBytes) return failure("CLAUDE_BODY_TOO_LARGE", 413);
    const reader = request.body?.getReader();
    if (!reader) return failure("CLAUDE_INVALID_REQUEST", 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const next = await reader.read(); if (next.done) break;
      size += next.value.byteLength;
      if (size > policy.maxBodyBytes) { await reader.cancel(); return failure("CLAUDE_BODY_TOO_LARGE", 413); }
      chunks.push(next.value);
    }
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
    if (!value || typeof value !== "object" || Array.isArray(value)) return failure("CLAUDE_INVALID_REQUEST", 400);
    const allowed = new Set(["model", "messages", "system", "tools", "tool_choice", "thinking"]);
    if (Object.keys(value).some(name => !allowed.has(name))) return failure("CLAUDE_INVALID_REQUEST", 400);
    // Count endpoints have no spend; an over-budget quote must still be countable.
    const parsed = validateClaudeInput({ ...value, max_tokens: policy.maxOutputTokens }, policy);
    return Response.json({ input_tokens: parsed.inputTokenUpperBound }, {
      headers: { "Cache-Control": "private, no-store", "x-ans-token-count-kind": "conservative-utf8-upper-bound" },
    });
  } catch (error) { return failure(error instanceof ClaudePolicyError || error instanceof ModelBillingError ? error.code : "CLAUDE_INVALID_REQUEST", error instanceof ClaudePolicyError ? error.status : 400); }
}
