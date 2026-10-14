import { z } from "zod";
import type { AgentQuote } from "@/contracts/companion-agent";
import { RUN_MODEL_OPTIONS } from "@/lib/run-models";

export const COMPANION_SESSION_TTL = 86400000;
export const COMPANION_RECOVERY_LIMIT = 8;
const PREFIX = "ans.companion-session.v1:";
const OWNER = PREFIX + "owner";
const MAX_RECORD_LENGTH = 120000;
const messageSchema = z.object({ id: z.number().int().positive().safe(), role: z.enum(["guide", "user"]), text: z.string().min(1).max(6000) }).strict();
const threadSchema = z.object({ draft: z.string().max(1200), messages: z.array(messageSchema).max(40) }).strict();
const conversationSchema = z.object({ version: z.literal(1), actor: z.string().max(128), savedAt: z.number().int().positive(), mode: z.enum(["agent", "guide"]), threads: z.object({ agent: threadSchema, guide: threadSchema }).strict() }).strict();
const submittedSchema = z.object({ ticket: z.string().min(20).max(2000), requestId: z.string().min(1).max(128), model: z.enum(RUN_MODEL_OPTIONS.map(item => item.key)), submittedAt: z.number().int().positive(), statusUntil: z.number().int().positive() }).strict();
const submittedRecordSchema = z.object({ version: z.literal(1), actor: z.string().max(128), turns: z.array(submittedSchema).max(COMPANION_RECOVERY_LIMIT) }).strict();
export type SavedConversation = z.infer<typeof conversationSchema>;
export type SubmittedAgentTurn = z.infer<typeof submittedSchema>;
const actorName = (actor: string | null) => actor === null ? "guest" : "user:" + actor;
const recordKey = (actor: string | null, kind: string) => PREFIX + kind + ":" + encodeURIComponent(actorName(actor));
function storage() { try { return window.sessionStorage; } catch { return null; } }
function remove(key: string) { try { storage()?.removeItem(key); } catch { /* Optional tab storage. */ } }
/** Called only after authentication resolves. A loading session must not erase a saved actor. */
export function activateCompanionActor(actor: string | null) {
  const target = actorName(actor);
  try {
    const store = storage(); if (!store) return;
    // Remove other actors even if a previous logout was interrupted before effects ran.
    for (const key of Array.from({ length: store.length }, (_, index) => store.key(index))) {
      if (key?.startsWith(PREFIX) && key !== OWNER && key !== recordKey(actor, "conversation") && key !== recordKey(actor, "submitted")) store.removeItem(key);
    }
    store.setItem(OWNER, target);
  } catch { /* Memory-only operation is still available. */ }
}
function read(actor: string | null, kind: string): unknown {
  activateCompanionActor(actor);
  const key = recordKey(actor, kind);
  try {
    const raw = storage()?.getItem(key); if (!raw) return null;
    if (raw.length > MAX_RECORD_LENGTH) throw new Error("OVERSIZED_SESSION");
    return JSON.parse(raw);
  } catch { remove(key); return null; }
}
function write(actor: string | null, kind: string, value: unknown) {
  try {
    const store = storage();
    // A late callback from the previous actor cannot restore that actor's record.
    if (!store || store.getItem(OWNER) !== actorName(actor)) return;
    const raw = JSON.stringify(value); if (raw.length > MAX_RECORD_LENGTH) { store.removeItem(recordKey(actor, kind)); return; }
    store.setItem(recordKey(actor, kind), raw);
  } catch { /* Quota/security failures must not send or repeat a request. */ }
}
export function readCompanionConversation(actor: string | null, now = Date.now()): SavedConversation | null {
  const result = conversationSchema.safeParse(read(actor, "conversation"));
  if (!result.success || result.data.actor !== actorName(actor) || result.data.savedAt > now || now - result.data.savedAt >= COMPANION_SESSION_TTL || Object.values(result.data.threads).some(thread => thread.messages.reduce((sum, item) => sum + item.text.length, 0) > 24000 || new Set(thread.messages.map(item => item.id)).size !== thread.messages.length)) {
    remove(recordKey(actor, "conversation")); return null;
  }
  return result.data;
}
export function saveCompanionConversation(actor: string | null, mode: "agent" | "guide", threads: SavedConversation["threads"], now = Date.now()) {
  // Retain the newest bounded text only. Recommendations, consent and quotes are never serialized.
  const trim = (thread: SavedConversation["threads"]["agent"]) => {
    let remaining = 24000;
    const messages = thread.messages.slice(-40).map(item => ({ ...item, text: item.text.slice(0, 6000) })).reverse().filter(item => { remaining -= item.text.length; return remaining >= 0; }).reverse();
    return { draft: thread.draft.slice(0, 1200), messages };
  };
  const value = { version: 1, actor: actorName(actor), savedAt: now, mode, threads: { agent: trim(threads.agent), guide: trim(threads.guide) } };
  if (conversationSchema.safeParse(value).success) write(actor, "conversation", value);
}
export function readSubmittedAgentTurns(actor: string | null, now = Date.now()): SubmittedAgentTurn[] {
  activateCompanionActor(actor);
  if (!actor) { remove(recordKey(actor, "submitted")); return []; }
  const result = submittedRecordSchema.safeParse(read(actor, "submitted"));
  if (!result.success || result.data.actor !== actor || new Set(result.data.turns.map(item => item.requestId)).size !== result.data.turns.length) {
    remove(recordKey(actor, "submitted")); return [];
  }
  const turns = result.data.turns.filter(item => item.submittedAt <= now && item.statusUntil > now && item.statusUntil <= item.submittedAt + COMPANION_SESSION_TTL + 300000);
  write(actor, "submitted", { version: 1, actor, turns });
  return turns;
}
export function saveSubmittedAgentTurns(actor: string, turns: SubmittedAgentTurn[]) {
  const value = { version: 1, actor, turns };
  if (submittedRecordSchema.safeParse(value).success) write(actor, "submitted", value);
}
export function submittedAgentTurn(quote: AgentQuote, now = Date.now()): SubmittedAgentTurn {
  return submittedSchema.parse({ ticket: quote.ticket, requestId: quote.requestId, model: quote.model, submittedAt: now, statusUntil: Math.min(quote.expiresAt + COMPANION_SESSION_TTL, now + COMPANION_SESSION_TTL) });
}
