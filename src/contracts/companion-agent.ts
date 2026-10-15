import { z } from "zod";
import { DEFAULT_COMPANION_MODEL } from "./companion-model";
const message = z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2400) }).strict();
export const agentInputSchema = z.object({
  messages: z.array(message).min(1).max(12),
  pathname: z.string().max(180).regex(/^\/(?:[A-Za-z0-9_/-]*|@[A-Za-z0-9_-]+)$/).refine(path => !path.includes("//")),
  locale: z.enum(["zh", "en"]),
  privateAccess: z.boolean().default(false),
  model: z.enum(["deepseek-v4.1-flash", "gpt-6-astra", "gpt-6.1-sol"]).default(DEFAULT_COMPANION_MODEL),
}).strict().refine(input => input.messages.at(-1)?.role === "user", { message: "Last turn must be a user message" })
  .refine(input => input.messages.reduce((sum, item) => sum + item.content.length, 0) <= 9000, { message: "Conversation too large" });
export const agentRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("quote"), input: agentInputSchema }).strict(),
  z.object({ action: z.literal("execute"), input: agentInputSchema, ticket: z.string().min(20).max(2000) }).strict(),
  z.object({ action: z.literal("status"), ticket: z.string().min(20).max(2000) }).strict(),
]);
export type AgentInput = z.infer<typeof agentInputSchema>;
export type AgentLink = { href: string; title: string; detail: string; icon: "project" | "video" | "credits" | "team" | "discover" | "learn" };
export type AgentQuote = { ticket: string; requestId: string; model: string; maxPoints: number; balance: number; expiresAt: number };
export type AgentReceipt = { requestId: string; state: string; reservedPoints: number; settledPoints: number | null };
export type AgentEvent =
  | { type: "phase"; phase: "thinking" | "reading" | "answering"; tool?: string }
  | { type: "tool"; name: string; ok: boolean }
  | { type: "answer"; text: string; links: AgentLink[] }
  | { type: "receipt"; receipts: AgentReceipt[] }
  | { type: "error"; code: string }
  | { type: "done" };
