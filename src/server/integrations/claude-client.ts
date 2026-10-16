import { createHash } from "node:crypto";
import { ClaudePolicyError } from "./claude-policy";

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const key = /^[A-Za-z0-9_.:-]{8,128}$/;

/** Claude Code supplies stable session/prompt ids but no per-message
 * Idempotency-Key. Include the normalized body so distinct tool turns within
 * one prompt remain distinct while SDK retries cannot silently spend twice. */
export function validateClaudeIdentityHeaders(request: Request) {
  const explicit = request.headers.get("idempotency-key");
  if (explicit !== null) {
    if (!key.test(explicit) || explicit.startsWith("ans-internal-retry:"))
      throw new ClaudePolicyError("CLAUDE_IDEMPOTENCY_KEY_REQUIRED", 400);
    return;
  }
  if (!uuid.test(request.headers.get("x-claude-code-session-id") ?? "") ||
      !uuid.test(request.headers.get("x-claude-code-prompt-id") ?? ""))
    throw new ClaudePolicyError("CLAUDE_IDEMPOTENCY_KEY_REQUIRED", 400);
  const agent = request.headers.get("x-claude-code-agent-id");
  if (agent !== null && (!agent || !/^[A-Za-z0-9_.:-]{1,128}$/.test(agent)))
    throw new ClaudePolicyError("CLAUDE_IDEMPOTENCY_KEY_REQUIRED", 400);
}

export function claudeIdempotencyKey(request: Request, normalizedBody: string) {
  validateClaudeIdentityHeaders(request);
  const explicit = request.headers.get("idempotency-key");
  if (explicit) return explicit;
  return "claude-code:" + createHash("sha256").update(JSON.stringify([
    request.headers.get("x-claude-code-session-id")!.toLowerCase(),
    request.headers.get("x-claude-code-prompt-id")!.toLowerCase(),
    request.headers.get("x-claude-code-agent-id") ?? null,
    createHash("sha256").update(normalizedBody).digest("hex"),
  ])).digest("hex");
}

/** Fail before spending: unsupported versions/features can change token and
 * tool pricing. A client may opt out of its experimental beta headers. */
export function validateClaudeProtocolHeaders(request: Request) {
  const version = request.headers.get("anthropic-version");
  if (version !== null && version !== "2023-06-01")
    throw new ClaudePolicyError("CLAUDE_API_VERSION_UNSUPPORTED", 400);
  if (request.headers.get("anthropic-beta"))
    throw new ClaudePolicyError("CLAUDE_BETA_UNSUPPORTED", 400);
}
