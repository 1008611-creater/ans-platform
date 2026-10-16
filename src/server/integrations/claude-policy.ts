import { z } from "zod";
import { readModelBillingSnapshot, reserveModelPoints, type ModelBillingSnapshot } from "./model-billing-policy";

const MODEL_ID = "claude-opus-5-5" as const;
const decimal = z.number().finite().min(0).max(1_000_000)
  .refine(value => value === Number(value.toFixed(6)));
const positiveDecimal = decimal.refine(value => value > 0);
const publicSource = z.string().url().max(1000).refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
});
const policySchema = z.object({
  version: z.string().trim().min(1).max(80),
  modelId: z.literal(MODEL_ID),
  // Each rate is an operator-verified upper bound for every accepted context size.
  reserveRatesUsdPerMillion: z.object({
    input: positiveDecimal, output: positiveDecimal,
    cacheWrite5m: decimal, cacheWrite1h: decimal, cacheRead: decimal,
  }).strict(),
  consumptionMultiplier: z.literal(1),
  verifiedSource: publicSource,
  // Optional upstream-reported catalog metadata, not an inferred release date.
  modelMetadata: z.object({ createdAt: z.iso.datetime({ offset: true }), source: publicSource,
    observedAt: z.iso.datetime({ offset: true }),
  }).strict().optional(),
  verifiedAt: z.iso.datetime({ offset: true }),
  maxBodyBytes: z.number().int().min(1024).max(256 * 1024),
  maxOutputTokens: z.number().int().min(1).max(8192),
  inputOverheadTokens: z.number().int().min(1024).max(16384),
  requestMaxPoints: positiveDecimal,
  rollingDayMaxPoints: positiveDecimal,
  maxConcurrent: z.literal(1),
  timeoutMs: z.number().int().min(1000).max(300_000),
}).strict().refine(policy => policy.requestMaxPoints <= policy.rollingDayMaxPoints);

export type ClaudePolicy = z.infer<typeof policySchema>;
export type ClaudePolicyErrorCode =
  | "CLAUDE_GATEWAY_DISABLED" | "CLAUDE_POLICY_INVALID" | "CLAUDE_INVALID_REQUEST"
  | "CLAUDE_BODY_TOO_LARGE" | "CLAUDE_REQUEST_BUDGET_EXCEEDED"
  | "CLAUDE_DAY_BUDGET_EXCEEDED" | "CLAUDE_CONCURRENCY_EXCEEDED"
  | "CLAUDE_BUDGET_UNAVAILABLE" | "CLAUDE_IDEMPOTENCY_KEY_REQUIRED"
  | "CLAUDE_API_VERSION_UNSUPPORTED" | "CLAUDE_BETA_UNSUPPORTED";

/** Stable codes only; never put raw configuration or customer messages in errors. */
export class ClaudePolicyError extends Error {
  constructor(public readonly code: ClaudePolicyErrorCode, public readonly status: number) {
    super(code);
    this.name = "ClaudePolicyError";
  }
}

export function readClaudePolicy(
  env: Readonly<Record<string, string | undefined>> = process.env,
  now = Date.now(),
): ClaudePolicy {
  if (env.ANS_CLAUDE_GATEWAY_ENABLED !== "1") throw new ClaudePolicyError("CLAUDE_GATEWAY_DISABLED", 503);
  try {
    const policy = policySchema.parse(JSON.parse(env.ANS_CLAUDE_POLICY ?? ""));
    if (!Number.isFinite(now) || Date.parse(policy.verifiedAt) > now ||
        (policy.modelMetadata && (Date.parse(policy.modelMetadata.observedAt) > now ||
          Date.parse(policy.modelMetadata.createdAt) > Date.parse(policy.modelMetadata.observedAt))))
      throw new Error("invalid verification date");
    return policy;
  } catch {
    throw new ClaudePolicyError("CLAUDE_POLICY_INVALID", 503);
  }
}

const cacheControl = z.object({ type: z.literal("ephemeral"), ttl: z.enum(["5m", "1h"]).optional() }).strict();
const textBlock = z.object({ type: z.literal("text"), text: z.string().min(1), cache_control: cacheControl.optional() }).strict();
const toolName = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/);
const toolUseBlock = z.object({
  type: z.literal("tool_use"), id: z.string().min(1).max(128), name: toolName,
  input: z.record(z.string(), z.json()), cache_control: cacheControl.optional(),
}).strict();
const toolResultBlock = z.object({
  type: z.literal("tool_result"), tool_use_id: z.string().min(1).max(128),
  content: z.union([z.string(), z.array(textBlock).max(1000)]), is_error: z.boolean().optional(),
  cache_control: cacheControl.optional(),
}).strict();
const thinkingBlock = z.object({ type: z.literal("thinking"), thinking: z.string(), signature: z.string().min(1) }).strict();
const redactedThinkingBlock = z.object({ type: z.literal("redacted_thinking"), data: z.string().min(1) }).strict();
const contentBlock = z.discriminatedUnion("type", [textBlock, toolUseBlock, toolResultBlock, thinkingBlock, redactedThinkingBlock]);
const toolDefinition = z.object({
  type: z.literal("custom").optional(), name: toolName, description: z.string().optional(),
  input_schema: z.object({ type: z.literal("object") }).catchall(z.json()),
  cache_control: cacheControl.optional(), strict: z.boolean().optional(),
}).strict();
const toolChoice = z.discriminatedUnion("type", [
  z.object({ type: z.literal("auto"), disable_parallel_tool_use: z.boolean().optional() }).strict(),
  z.object({ type: z.literal("any"), disable_parallel_tool_use: z.boolean().optional() }).strict(),
  z.object({ type: z.literal("tool"), name: toolName, disable_parallel_tool_use: z.boolean().optional() }).strict(),
  z.object({ type: z.literal("none") }).strict(),
]);
const payloadSchema = z.object({
  model: z.literal(MODEL_ID),
  max_tokens: z.number().int().positive().max(8192),
  stream: z.boolean().default(false),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]), content: z.union([z.string().min(1), z.array(contentBlock).min(1).max(1000)]),
  }).strict()).min(1).max(2000),
  system: z.union([z.string().min(1), z.array(textBlock).min(1).max(1000)]).optional(),
  tools: z.array(toolDefinition).max(256).optional(),
  tool_choice: toolChoice.optional(),
  temperature: z.number().finite().min(0).max(1).optional(),
  top_p: z.number().finite().min(0).max(1).optional(),
  top_k: z.number().int().min(0).max(500).optional(),
  stop_sequences: z.array(z.string().min(1).max(200)).max(128).optional(),
  metadata: z.object({ user_id: z.string().min(1).max(256) }).strict().optional(),
  thinking: z.discriminatedUnion("type", [
    z.object({ type: z.literal("disabled") }).strict(),
    z.object({ type: z.literal("enabled"), budget_tokens: z.number().int().min(1024).max(8191) }).strict(),
    z.object({ type: z.literal("adaptive") }).strict(),
  ]).optional(),
  output_config: z.object({ effort: z.enum(["low", "medium", "high", "max"]) }).strict().optional(),
}).strict();

export type ClaudePayload = z.infer<typeof payloadSchema>;
export type ValidatedClaudePayload = {
  body: ClaudePayload;
  text: string;
  bodyBytes: number;
  inputTokenUpperBound: number;
  reserve: number;
  billing: ModelBillingSnapshot;
  modelId: typeof MODEL_ID;
  maxOutputTokens: number;
  stream: boolean;
};

/** JSON requests cannot contain prototypes, cycles, non-finite values or unbounded nesting. */
function assertJson(value: unknown, depth = 0, seen = new Set<object>()): void {
  if (depth > 32) throw new ClaudePolicyError("CLAUDE_INVALID_REQUEST", 400);
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value !== "object" || seen.has(value)) throw new ClaudePolicyError("CLAUDE_INVALID_REQUEST", 400);
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
    throw new ClaudePolicyError("CLAUDE_INVALID_REQUEST", 400);
  seen.add(value);
  for (const item of Object.values(value)) assertJson(item, depth + 1, seen);
  seen.delete(value);
}

function micros(value: number): bigint { return BigInt(Math.round(value * 1_000_000)); }

/** Validate only local/client tools. No provider fetching, media or priced server tools. */
function assertConversation(body: ClaudePayload): void {
  const names = new Set<string>();
  for (const tool of body.tools ?? []) {
    if (names.has(tool.name)) throw new ClaudePolicyError("CLAUDE_INVALID_REQUEST", 400);
    names.add(tool.name);
  }
  if (body.tool_choice?.type === "tool" && !names.has(body.tool_choice.name)) throw new ClaudePolicyError("CLAUDE_INVALID_REQUEST", 400);
  if (body.tool_choice && ["tool", "any"].includes(body.tool_choice.type) && names.size === 0) throw new ClaudePolicyError("CLAUDE_INVALID_REQUEST", 400);
  const uses = new Set<string>(), results = new Set<string>();
  for (const message of body.messages) {
    if (typeof message.content === "string") continue;
    for (const block of message.content) {
      if (block.type === "tool_use") {
        if (message.role !== "assistant" || uses.has(block.id)) throw new ClaudePolicyError("CLAUDE_INVALID_REQUEST", 400);
        uses.add(block.id);
      } else if (block.type === "tool_result") {
        if (message.role !== "user" || !uses.has(block.tool_use_id) || results.has(block.tool_use_id)) throw new ClaudePolicyError("CLAUDE_INVALID_REQUEST", 400);
        results.add(block.tool_use_id);
      } else if (["thinking", "redacted_thinking"].includes(block.type) && message.role !== "assistant") {
        throw new ClaudePolicyError("CLAUDE_INVALID_REQUEST", 400);
      }
    }
  }
  if (body.thinking?.type === "enabled" && body.thinking.budget_tokens >= body.max_tokens)
    throw new ClaudePolicyError("CLAUDE_INVALID_REQUEST", 400);
}

/** A conservative authorization ceiling, never a settlement calculation.
 * All serialized input, including tools/schema/results, is charged at the
 * highest configured input/cache rate without assuming any cache discount.
 * The caller must settle only from an authoritative APIC receipt.
 */
export function validateClaudeInput(value: unknown, policy: ClaudePolicy): Omit<ValidatedClaudePayload, "reserve" | "billing"> {
  assertJson(value);
  const original = JSON.stringify(value);
  if (Buffer.byteLength(original, "utf8") > policy.maxBodyBytes) throw new ClaudePolicyError("CLAUDE_BODY_TOO_LARGE", 413);
  const parsed = payloadSchema.safeParse(value);
  if (!parsed.success || parsed.data.max_tokens > policy.maxOutputTokens) throw new ClaudePolicyError("CLAUDE_INVALID_REQUEST", 400);
  const body = parsed.data;
  assertConversation(body);
  const text = JSON.stringify(body), bodyBytes = Buffer.byteLength(text, "utf8");
  if (bodyBytes > policy.maxBodyBytes) throw new ClaudePolicyError("CLAUDE_BODY_TOO_LARGE", 413);
  const inputTokenUpperBound = bodyBytes + policy.inputOverheadTokens;
  return { body, text, bodyBytes, inputTokenUpperBound, modelId: MODEL_ID, maxOutputTokens: body.max_tokens, stream: body.stream };
}

/** Paid request validation adds immutable pricing and all spend ceilings. */
export function validateClaudePayload(value: unknown, policy: ClaudePolicy): ValidatedClaudePayload {
  const input = validateClaudeInput(value, policy);
  const { body, inputTokenUpperBound } = input;
  const rates = policy.reserveRatesUsdPerMillion;
  const inputRate = Math.max(rates.input, rates.cacheWrite5m, rates.cacheWrite1h, rates.cacheRead);
  const billing = readModelBillingSnapshot(MODEL_ID);
  if (billing.consumptionMultiplier !== policy.consumptionMultiplier) throw new ClaudePolicyError("CLAUDE_POLICY_INVALID", 503);
  const reserve = reserveModelPoints(billing, inputTokenUpperBound, body.max_tokens, { input: inputRate, output: rates.output });
  const reserveMicros = micros(reserve);
  if (reserveMicros > micros(policy.requestMaxPoints)) throw new ClaudePolicyError("CLAUDE_REQUEST_BUDGET_EXCEEDED", 402);
  if (reserveMicros > micros(policy.rollingDayMaxPoints)) throw new ClaudePolicyError("CLAUDE_DAY_BUDGET_EXCEEDED", 429);
  return { ...input, reserve, billing };
}

/** Call inside the same account lock/transaction as authorization creation.
 * rollingDayPoints must include settled usage AND outstanding authorizations;
 * concurrentRequests includes every still running/uncertain Claude request.
 */
export function assertClaudeBudget(policy: ClaudePolicy, usage: {
  reserve: number; rollingDayPoints: number; concurrentRequests: number;
}): void {
  if (!positiveDecimal.safeParse(usage.reserve).success || !decimal.safeParse(usage.rollingDayPoints).success ||
      !Number.isSafeInteger(usage.concurrentRequests) || usage.concurrentRequests < 0)
    throw new ClaudePolicyError("CLAUDE_BUDGET_UNAVAILABLE", 503);
  if (micros(usage.reserve) > micros(policy.requestMaxPoints)) throw new ClaudePolicyError("CLAUDE_REQUEST_BUDGET_EXCEEDED", 402);
  if (micros(usage.reserve) + micros(usage.rollingDayPoints) > micros(policy.rollingDayMaxPoints)) throw new ClaudePolicyError("CLAUDE_DAY_BUDGET_EXCEEDED", 429);
  if (usage.concurrentRequests >= policy.maxConcurrent) throw new ClaudePolicyError("CLAUDE_CONCURRENCY_EXCEEDED", 429);
}

