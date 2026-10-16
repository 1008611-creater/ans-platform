// @vitest-environment node
import { describe, expect, it } from "vitest";
import { claudeIdempotencyKey, validateClaudeIdentityHeaders, validateClaudeProtocolHeaders } from "@/server/integrations/claude-client";
const session = "c727db46-3473-4f30-8d1f-b2185cb95b3c", prompt = "d180765a-969e-43e9-881b-4814b2536734";
const request = (headers: Record<string, string> = {}) => new Request("https://ans.invalid/api/claude/v1/messages", { headers: {
  "x-claude-code-session-id": session, "x-claude-code-prompt-id": prompt, ...headers,
} });

describe("Claude Code durable retry identity", () => {
  it("uses stable session/prompt/body identity across SDK retry and request headers", () => {
    const key = claudeIdempotencyKey(request(), '{"model":"fixture","messages":[]}');
    expect(key).toMatch(/^claude-code:[a-f0-9]{64}$/);
    expect(claudeIdempotencyKey(request({ "x-stainless-retry-count": "1", "x-client-request-id": "new-sdk-attempt-id" }), '{"model":"fixture","messages":[]}')).toBe(key);
    expect(claudeIdempotencyKey(request({ "x-claude-code-session-id": session.toUpperCase() }), '{"model":"fixture","messages":[]}')).toBe(key);
    expect(key).not.toContain(session); expect(key).not.toContain(prompt);
  });
  it("separates tool turns, prompt submissions, sessions and subagents", () => {
    const original = claudeIdempotencyKey(request(), "initial");
    for (const [req, body] of [
      [request(), "tool-result"],
      [request({ "x-claude-code-prompt-id": session }), "initial"],
      [request({ "x-claude-code-session-id": prompt }), "initial"],
      [request({ "x-claude-code-agent-id": "agent-1" }), "initial"],
    ] as const) expect(claudeIdempotencyKey(req, body)).not.toBe(original);
  });
  it("preserves an explicit per-message key for custom clients without Claude session headers", () => {
    expect(claudeIdempotencyKey(new Request("https://ans.invalid", { headers: { "Idempotency-Key": "my-custom-message:001" } }), "private request text")).toBe("my-custom-message:001");
  });
  it.each(["", "bad", "ans-internal-retry:hidden", "x".repeat(129), "contains space"])("never falls back from an invalid explicit key %j", key => {
    expect(() => validateClaudeIdentityHeaders(request({ "idempotency-key": key }))).toThrow("CLAUDE_IDEMPOTENCY_KEY_REQUIRED");
  });
  it.each<Record<string, string>>([
    {}, { "x-claude-code-session-id": session }, { "x-claude-code-prompt-id": prompt },
    { "x-claude-code-session-id": "malformed", "x-claude-code-prompt-id": prompt },
  ])("requires real stable client ids instead of inventing a new retry key %j", headers => {
    expect(() => validateClaudeIdentityHeaders(new Request("https://ans.invalid", { headers }))).toThrow("CLAUDE_IDEMPOTENCY_KEY_REQUIRED");
  });
  it("rejects malformed agent ids", () => {
    expect(() => validateClaudeIdentityHeaders(request({ "x-claude-code-agent-id": "bad agent" }))).toThrow("CLAUDE_IDEMPOTENCY_KEY_REQUIRED");
  });
});

describe("native protocol spend boundary", () => {
  it("accepts the supported version or SDK default", () => {
    expect(() => validateClaudeProtocolHeaders(request())).not.toThrow();
    expect(() => validateClaudeProtocolHeaders(request({ "anthropic-version": "2023-06-01" }))).not.toThrow();
  });
  it("never silently rewrites an unknown version or drops paid beta features", () => {
    expect(() => validateClaudeProtocolHeaders(request({ "anthropic-version": "future-version" }))).toThrow("CLAUDE_API_VERSION_UNSUPPORTED");
    expect(() => validateClaudeProtocolHeaders(request({ "anthropic-beta": "future-paid-feature" }))).toThrow("CLAUDE_BETA_UNSUPPORTED");
  });
});
