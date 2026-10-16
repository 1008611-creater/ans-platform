// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { fixtureModelBillingPolicy } from "./model-billing-fixture";
import { readClaudePolicy, validateClaudePayload, assertClaudeBudget, ClaudePolicyError, type ClaudePolicy } from "@/server/integrations/claude-policy";

// Deliberately synthetic prices: these are neither a production quote nor official pricing.
const fixture = () => ({
  version: "isolated-fixture-v1", modelId: "claude-opus-5-5",
  reserveRatesUsdPerMillion: { input: 3, output: 17, cacheWrite5m: 4, cacheWrite1h: 6, cacheRead: 0.1 },
  consumptionMultiplier: 1, verifiedSource: "https://fixture.invalid/pricing",
  verifiedAt: "2026-10-16T00:00:00Z", maxBodyBytes: 262144, maxOutputTokens: 8192,
  inputOverheadTokens: 1024, requestMaxPoints: 1, rollingDayMaxPoints: 2, maxConcurrent: 1, timeoutMs: 300000,
});
const enabledEnv = (config: unknown = fixture()) => ({ ANS_CLAUDE_GATEWAY_ENABLED: "1", ANS_CLAUDE_POLICY: JSON.stringify(config) });
const now = Date.parse("2026-10-16T12:00:00Z");
const request = (overrides: Record<string, unknown> = {}) => ({ model: "claude-opus-5-5", max_tokens: 2048, messages: [{ role: "user", content: "hello" }], ...overrides });
let policy: ClaudePolicy;
beforeEach(() => { vi.stubEnv("ANS_MODEL_BILLING_POLICY", JSON.stringify(fixtureModelBillingPolicy())); policy = readClaudePolicy(enabledEnv(), now); });

afterEach(() => vi.unstubAllEnvs());

it.each([{}, { ANS_CLAUDE_GATEWAY_ENABLED: "0" }, { ANS_CLAUDE_GATEWAY_ENABLED: "true", ANS_CLAUDE_POLICY: JSON.stringify(fixture()) }])("is off unless explicitly enabled", env => {
  expect(() => readClaudePolicy(env, now)).toThrowError(new ClaudePolicyError("CLAUDE_GATEWAY_DISABLED", 503));
});
it.each([undefined, "", "{bad", "null", "[]", "{}"])("fails closed on missing or invalid policy JSON %s", value => {
  expect(() => readClaudePolicy({ ANS_CLAUDE_GATEWAY_ENABLED: "1", ANS_CLAUDE_POLICY: value }, now))
    .toThrowError(new ClaudePolicyError("CLAUDE_POLICY_INVALID", 503));
});
it("accepts only explicit verified separate rates and multiplier", () => {
  expect(policy).toEqual(fixture());
  const config = fixture() as Record<string, unknown>;
  delete config.consumptionMultiplier;
  expect(() => readClaudePolicy(enabledEnv(config), now)).toThrow("CLAUDE_POLICY_INVALID");
  delete config.reserveRatesUsdPerMillion;
  expect(() => readClaudePolicy(enabledEnv(config), now)).toThrow("CLAUDE_POLICY_INVALID");
});
it.each([
  { modelId: "claude-opus-5.5" }, { modelId: "gpt-6.1-sol" }, { unknown: 1 },
  { consumptionMultiplier: 0 }, { consumptionMultiplier: -1 }, { consumptionMultiplier: 0.0000001 },
  { requestMaxPoints: 3 }, { requestMaxPoints: 0 }, { rollingDayMaxPoints: 0 },
  { maxBodyBytes: 262145 }, { maxBodyBytes: 0 }, { maxOutputTokens: 8193 }, { maxOutputTokens: 1.2 },
  { inputOverheadTokens: 0 }, { maxConcurrent: 2 }, { maxConcurrent: 0 }, { timeoutMs: 300001 },
  { verifiedSource: "http://fixture.invalid/pricing" }, { verifiedSource: "https://user:password@fixture.invalid/pricing" },
  { verifiedSource: "https://fixture.invalid/pricing?token=private" }, { verifiedAt: "not-a-date" },
  { verifiedAt: "2026-10-17T00:00:00Z" },
  { reserveRatesUsdPerMillion: { input: 3, output: 17, cacheRead: 0.1 } },
  { reserveRatesUsdPerMillion: { input: 3, output: 17, cacheWrite5m: 4, cacheWrite1h: 6, cacheRead: 0.1, long: 99 } },
])("rejects incomplete or unsafe policy overrides %j", override => {
  expect(() => readClaudePolicy(enabledEnv({ ...fixture(), ...override }), now)).toThrow("CLAUDE_POLICY_INVALID");
});
it("does not expose bad configuration or input in its errors", () => {
  const secret = "private-key-never-echo";
  try { readClaudePolicy({ ANS_CLAUDE_GATEWAY_ENABLED: "1", ANS_CLAUDE_POLICY: secret }, now); }
  catch (error) { expect(String(error)).not.toContain(secret); expect(String(error)).toContain("CLAUDE_POLICY_INVALID"); }
});

it("preserves native text, system, client tool schemas and results in the metered body", () => {
  const value = request({ stream: true, system: [{ type: "text", text: "system", cache_control: { type: "ephemeral", ttl: "1h" } }],
    tools: [{ name: "Bash", description: "client tool", input_schema: { type: "object", properties: { command: { type: "string" } }, required: ["command"] }, cache_control: { type: "ephemeral", ttl: "5m" } }],
    tool_choice: { type: "auto", disable_parallel_tool_use: true },
    messages: [{ role: "user", content: "work" }, { role: "assistant", content: [{ type: "tool_use", id: "tool-one", name: "Bash", input: { command: "echo fixture" } }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "tool-one", content: [{ type: "text", text: "fixture result" }] }] }],
  });
  const result = validateClaudePayload(value, policy);
  expect(JSON.parse(result.text)).toEqual(value); expect(result.body).toEqual(value);
  expect(result.bodyBytes).toBe(Buffer.byteLength(result.text, "utf8"));
  expect(result.inputTokenUpperBound).toBe(result.bodyBytes + 1024);
  expect(result.stream).toBe(true); expect(result.maxOutputTokens).toBe(2048); expect(result.modelId).toBe("claude-opus-5-5");
});
it("reserves all UTF8 bytes and complete output at the highest input/cache rate and independent multiplier", () => {
  const result = validateClaudePayload(request({ messages: [{ role: "user", content: "中文🙂" }] }), policy);
  const expectedMicros = Math.ceil(((result.bodyBytes + 1024) * 6 + 2048 * 17) * 1);
  expect(result.reserve).toBe(expectedMicros / 1000000);
  expect(result.bodyBytes).toBeGreaterThan(result.text.length);
  expect(Number.isInteger(result.reserve * 1000000)).toBe(true);
});
it("uses exact ceiling arithmetic at the micro-point boundary", () => {
  policy.reserveRatesUsdPerMillion = { input: 0.000001, output: 0.000001, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0 };
  const billing = fixtureModelBillingPolicy(0.000001);
  vi.stubEnv("ANS_MODEL_BILLING_POLICY", JSON.stringify(billing));
  expect(validateClaudePayload(request(), policy).reserve).toBe(0.000001);
});
it("never assumes a cache hit and includes tool schemas/results in the quote", () => {
  const simple = validateClaudePayload(request(), policy);
  const tools = validateClaudePayload(request({ tools: [{ name: "large", input_schema: { type: "object", description: "x".repeat(10000) } }] }), policy);
  expect(tools.reserve).toBeGreaterThan(simple.reserve); expect(tools.inputTokenUpperBound - simple.inputTokenUpperBound).toBeGreaterThan(10000);
  policy.reserveRatesUsdPerMillion.cacheRead = 99;
  expect(validateClaudePayload(request(), policy).reserve).toBeGreaterThan(simple.reserve);
});
it.each([
  { model: "claude-opus-5.5" }, { max_tokens: 0 }, { max_tokens: 8193 }, { max_tokens: 1.5 }, { max_tokens: undefined },
  { stream: "true" }, { messages: [] }, { messages: [{ role: "system", content: "hidden" }] },
  { messages: [{ role: "user", content: "" }] }, { messages: [{ role: "user", content: [] }] },
  { service_tier: "auto" }, { speed: "fast" }, { batch: true }, { background: true },
  { context_management: {} }, { unknown_cost_parameter: true }, { system: [{ type: "image", source: { type: "url", url: "https://fixture.invalid/image" } }] },
  { tools: [{ type: "web_search_20250305", name: "web_search" }] },
  { tools: [{ name: "Bash", input_schema: { type: "object" }, defer_loading: true }] },
  { tool_choice: { type: "tool", name: "missing" } }, { tool_choice: { type: "any" } },
  { thinking: { type: "enabled", budget_tokens: 2048 } }, { thinking: { type: "enabled", budget_tokens: 999 } },
  { thinking: { type: "adaptive", budget_tokens: 1024 } }, { thinking: { type: "enabled", budget_tokens: 1024, extra_cost: true } },
  { metadata: { user_id: "safe", other: "unknown" } }, { output_config: { effort: "unlimited" } },
])("rejects unsupported or potentially differently-priced request fields %j", override => {
  expect(() => validateClaudePayload(request(override), policy)).toThrow("CLAUDE_INVALID_REQUEST");
});
it.each(["image", "document", "video", "audio", "server_tool_use", "web_search_tool_result"])("rejects native %s content including nested tool results", type => {
  expect(() => validateClaudePayload(request({ messages: [{ role: "user", content: [{ type, source: { type: "url", url: "https://fixture.invalid/media" } }] }] }), policy)).toThrow("CLAUDE_INVALID_REQUEST");
  expect(() => validateClaudePayload(request({ messages: [{ role: "user", content: [{ type: "tool_result", tool_use_id: "one", content: [{ type, text: "unsupported" }] }] }] }), policy)).toThrow("CLAUDE_INVALID_REQUEST");
});
it("validates thinking output within max_tokens and preserves signed assistant replay", () => {
  const result = validateClaudePayload(request({ thinking: { type: "enabled", budget_tokens: 1024 },
    messages: [{ role: "user", content: "hi" }, { role: "assistant", content: [{ type: "thinking", thinking: "private thinking", signature: "opaque-signature" }, { type: "redacted_thinking", data: "opaque-data" }, { type: "text", text: "reply" }] }, { role: "user", content: "next" }],
  }), policy);
  expect(result.body.thinking).toEqual({ type: "enabled", budget_tokens: 1024 });
  const adaptive = validateClaudePayload(request({ thinking: { type: "adaptive" }, output_config: { effort: "max" } }), policy);
  expect(adaptive.maxOutputTokens).toBe(2048);
});
it("enforces configured output/body limits, including tool definitions and non-ASCII bytes", () => {
  policy.maxOutputTokens = 1024;
  expect(() => validateClaudePayload(request(), policy)).toThrow("CLAUDE_INVALID_REQUEST");
  policy.maxOutputTokens = 8192; policy.maxBodyBytes = 1024;
  expect(() => validateClaudePayload(request({ messages: [{ role: "user", content: "中".repeat(400) }] }), policy)).toThrowError(new ClaudePolicyError("CLAUDE_BODY_TOO_LARGE", 413));
  expect(() => validateClaudePayload(request({ tools: [{ name: "large", input_schema: { type: "object", description: "x".repeat(1100) } }] }), policy)).toThrow("CLAUDE_BODY_TOO_LARGE");
});
it("rejects mismatched role, dangling and duplicate tool results", () => {
  const use = { type: "tool_use", id: "one", name: "Bash", input: {} };
  const result = { type: "tool_result", tool_use_id: "one", content: "ok" };
  for (const messages of [
    [{ role: "user", content: [use] }], [{ role: "assistant", content: [result] }], [{ role: "user", content: [result] }],
    [{ role: "assistant", content: [use, use] }], [{ role: "assistant", content: [use] }, { role: "user", content: [result, result] }],
    [{ role: "user", content: [{ type: "thinking", thinking: "bad role", signature: "sig" }] }],
  ]) expect(() => validateClaudePayload(request({ messages }), policy)).toThrow("CLAUDE_INVALID_REQUEST");
});
it("rejects duplicate tool definitions", () => {
  const tool = { name: "same", input_schema: { type: "object" } };
  expect(() => validateClaudePayload(request({ tools: [tool, tool] }), policy)).toThrow("CLAUDE_INVALID_REQUEST");
});
it("rejects cyclic/non-JSON/deep data without exposing private payloads", () => {
  const cycle: Record<string, unknown> = {}; cycle.self = cycle;
  expect(() => validateClaudePayload(request({ metadata: cycle }), policy)).toThrow("CLAUDE_INVALID_REQUEST");
  for (const invalid of [NaN, Infinity, undefined, new Date()]) expect(() => validateClaudePayload(request({ private: invalid }), policy)).toThrow("CLAUDE_INVALID_REQUEST");
  let deep: Record<string, unknown> = {}; for (let i = 0; i < 40; i++) deep = { deep };
  expect(() => validateClaudePayload(request({ private: deep }), policy)).toThrow("CLAUDE_INVALID_REQUEST");
});
it("rejects quotes above either configured request or full-day budget before any call", () => {
  policy.requestMaxPoints = 0.000001;
  expect(() => validateClaudePayload(request(), policy)).toThrowError(new ClaudePolicyError("CLAUDE_REQUEST_BUDGET_EXCEEDED", 402));
  policy.requestMaxPoints = 1; policy.rollingDayMaxPoints = 0.000001;
  expect(() => validateClaudePayload(request(), policy)).toThrowError(new ClaudePolicyError("CLAUDE_DAY_BUDGET_EXCEEDED", 429));
});
it("counts both past-day consumption and current holds, allowing exact cap equality", () => {
  expect(() => assertClaudeBudget(policy, { reserve: 0.123456, rollingDayPoints: 1.876544, concurrentRequests: 0 })).not.toThrow();
  expect(() => assertClaudeBudget(policy, { reserve: 0.123456, rollingDayPoints: 1.876545, concurrentRequests: 0 })).toThrow("CLAUDE_DAY_BUDGET_EXCEEDED");
  expect(() => assertClaudeBudget(policy, { reserve: 1.000001, rollingDayPoints: 0, concurrentRequests: 0 })).toThrow("CLAUDE_REQUEST_BUDGET_EXCEEDED");
  expect(() => assertClaudeBudget(policy, { reserve: 0.1, rollingDayPoints: 0, concurrentRequests: 1 })).toThrow("CLAUDE_CONCURRENCY_EXCEEDED");
});
it.each([
  { reserve: 0 }, { reserve: NaN }, { reserve: 0.0000001 }, { rollingDayPoints: NaN }, { rollingDayPoints: -1 },
  { concurrentRequests: 0.5 }, { concurrentRequests: -1 }, { concurrentRequests: Infinity },
])("fails closed when authoritative budget figures are unavailable or invalid %j", override => {
  expect(() => assertClaudeBudget(policy, { reserve: 0.1, rollingDayPoints: 0, concurrentRequests: 0, ...override })).toThrowError(new ClaudePolicyError("CLAUDE_BUDGET_UNAVAILABLE", 503));
});

it("requires explicit sourced model metadata and rejects secret URLs or impossible dates", () => {
  const metadata = { createdAt: "2026-10-14T00:00:00Z", source: "https://fixture.invalid/v1/models", observedAt: "2026-10-15T00:00:00Z" };
  expect(readClaudePolicy(enabledEnv({ ...fixture(), modelMetadata: metadata }), now).modelMetadata).toEqual(metadata);
  for (const override of [{ source: "https://fixture.invalid/models?key=secret" }, { createdAt: "2026-10-16T00:00:00Z" }, { observedAt: "2026-10-17T00:00:00Z" }, { createdAt: "unknown" }]) {
    expect(() => readClaudePolicy(enabledEnv({ ...fixture(), modelMetadata: { ...metadata, ...override } }), now)).toThrow("CLAUDE_POLICY_INVALID");
  }
});
