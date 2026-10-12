import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { AgentInput } from "@/contracts/companion-agent";
import { validateCodexPayload } from "@/server/integrations/codex-gateway";
import { DEFAULT_RUN_MODEL, RUN_MODEL_METERING, type RunModelKey } from "@/lib/run-models";
export const AGENT_MODEL = DEFAULT_RUN_MODEL;
export const AGENT_CALL_LIMIT = 3;
export const AGENT_OUTPUT_LIMIT = 900;
export const AGENT_BODY_LIMIT = 48000;
// Same conservative rate calculation as the existing gateway, including its own
// reserve headroom. A ticket approves one specific model and bounded loop.
export function agentMaxPoints(model: RunModelKey) {
  const rates = RUN_MODEL_METERING[model];
  return AGENT_CALL_LIMIT * Math.ceil(((AGENT_BODY_LIMIT + 16384) * rates.inputReservePerMillion + AGENT_OUTPUT_LIMIT * rates.outputReservePerMillion) * rates.consumptionMultiplier) / 1e6;
}
export const AGENT_MAX_POINTS = agentMaxPoints(AGENT_MODEL);
export class AgentError extends Error {
  constructor(public readonly code: string, public readonly status = 409) { super(code); }
}
const ticketSchema = z.object({ version: z.literal(1), actor: z.string().min(1).max(128), hash: z.string().length(64), nonce: z.string().uuid(), model: z.string().min(1).max(80), maxPoints: z.number().positive().finite(), expiresAt: z.number().int().positive() }).strict();
export type AgentTicket = z.infer<typeof ticketSchema>;
export function inputHash(input: AgentInput) { return createHash("sha256").update(JSON.stringify(input)).digest("hex"); }
function secret() { const key = process.env.AUTH_SECRET; if (!key) throw new AgentError("AGENT_UNAVAILABLE", 503); return key; }
export function issueAgentTicket(actor: string, input: AgentInput, now = Date.now()) {
  const ticket: AgentTicket = { version: 1, actor, hash: inputHash(input), nonce: randomUUID(), model: input.model, maxPoints: agentMaxPoints(input.model), expiresAt: now + 300000 };
  const data = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  const signature = createHmac("sha256", secret()).update("ans-companion-v1:" + data).digest("base64url");
  return { ticket: data + "." + signature, requestId: ticket.nonce, expiresAt: ticket.expiresAt };
}
export function verifyAgentTicket(raw: string, actor: string, input?: AgentInput, now = Date.now()) {
  const parts = raw.split(".");
  if (parts.length !== 2) throw new AgentError("QUOTE_INVALID", 400);
  const expected = createHmac("sha256", secret()).update("ans-companion-v1:" + parts[0]).digest();
  const actual = Buffer.from(parts[1], "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new AgentError("QUOTE_INVALID", 400);
  let parsed: AgentTicket;
  try { parsed = ticketSchema.parse(JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"))); }
  catch { throw new AgentError("QUOTE_INVALID", 400); }
  if (parsed.actor !== actor) throw new AgentError("ACCOUNT_CHANGED", 409);
  // Status inspection is allowed for 24 hours; it never starts another request.
  if (now > parsed.expiresAt + (input ? 0 : 86400000)) throw new AgentError("QUOTE_EXPIRED", 409);
  if (input && (parsed.model !== input.model || parsed.maxPoints !== agentMaxPoints(input.model))) throw new AgentError("QUOTE_CHANGED", 409);
  if (input && parsed.hash !== inputHash(input)) throw new AgentError("QUOTE_CHANGED", 409);
  return parsed;
}
export function agentKey(nonce: string, index: number) { return `dino-agent:${nonce}:${index}`; }
export function checkAgentPayload(payload: unknown, model: RunModelKey = AGENT_MODEL) {
  const parsed = validateCodexPayload(payload);
  if (parsed.model !== model || parsed.limit !== AGENT_OUTPUT_LIMIT || Buffer.byteLength(parsed.text, "utf8") > AGENT_BODY_LIMIT || parsed.reserve * AGENT_CALL_LIMIT > agentMaxPoints(model) + 1e-9) throw new AgentError("AGENT_BUDGET_LIMIT", 422);
  return parsed;
}
