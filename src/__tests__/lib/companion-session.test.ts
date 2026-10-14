import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { activateCompanionActor, COMPANION_SESSION_TTL, readCompanionConversation, readSubmittedAgentTurns, saveCompanionConversation, saveSubmittedAgentTurns, submittedAgentTurn } from "@/components/mascot/companion-session";
const now = Date.now();
const threads = { agent: { draft: "未发送草稿", messages: [{ id: 1, role: "user" as const, text: "已发送问题" }, { id: 2, role: "guide" as const, text: "已收到回答" }] }, guide: { draft: "向导草稿", messages: [] } };
const quote = { ticket: "synthetic-approved-ticket-only", requestId: "turn-a", model: "gpt-6.1-sol", maxPoints: 1, balance: 2, expiresAt: now + 300000 };
beforeEach(() => { sessionStorage.clear(); activateCompanionActor("member-a"); });
afterEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });
it("round-trips only bounded text/mode and a submitted descriptor, never quote or consent", () => {
  saveCompanionConversation("member-a", "agent", threads, now);
  saveSubmittedAgentTurns("member-a", [submittedAgentTurn(quote, now)]);
  expect(readCompanionConversation("member-a", now)?.threads).toEqual(threads);
  expect(readSubmittedAgentTurns("member-a", now)).toEqual([{ ticket: quote.ticket, requestId: quote.requestId, model: quote.model, submittedAt: now, statusUntil: now + COMPANION_SESSION_TTL }]);
  const serialized = Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.getItem(sessionStorage.key(index)!)).join("");
  expect(serialized).not.toMatch(/privateAccess|balance|maxPoints|recommendations/);
});
it("bounds message count, message size, draft and total retained text", () => {
  const large = { draft: "a".repeat(2000), messages: Array.from({ length: 100 }, (_, index) => ({ id: index + 1, role: "guide" as const, text: "文".repeat(7000) })) };
  saveCompanionConversation("member-a", "agent", { agent: large, guide: large });
  const saved = readCompanionConversation("member-a")!;
  expect(saved.threads.agent.draft).toHaveLength(1200);
  expect(saved.threads.agent.messages.at(-1)?.id).toBe(100);
  expect(saved.threads.agent.messages.reduce((sum, item) => sum + item.text.length, 0)).toBeLessThanOrEqual(24000);
});
it.each(["invalid json", JSON.stringify({ version: 2 }), "x".repeat(120001)])("clears corrupt, unknown-version or oversized records", raw => {
  sessionStorage.setItem("ans.companion-session.v1:conversation:user%3Amember-a", raw);
  expect(readCompanionConversation("member-a")).toBeNull();
  expect(sessionStorage.getItem("ans.companion-session.v1:conversation:user%3Amember-a")).toBeNull();
});
it("clears stale conversations and expired receipt descriptors", () => {
  saveCompanionConversation("member-a", "agent", threads, now - COMPANION_SESSION_TTL);
  saveSubmittedAgentTurns("member-a", [{ ...submittedAgentTurn(quote, now), statusUntil: now }]);
  expect(readCompanionConversation("member-a", now)).toBeNull(); expect(readSubmittedAgentTurns("member-a", now)).toEqual([]);
});
it("logout/account changes remove prior actors; late callbacks cannot restore them", () => {
  saveCompanionConversation("member-a", "agent", threads, now); saveSubmittedAgentTurns("member-a", [submittedAgentTurn(quote, now)]);
  activateCompanionActor("member-b"); saveCompanionConversation("member-a", "agent", threads, now);
  expect([...Array(sessionStorage.length)].map((_, index) => sessionStorage.key(index)).join("")).not.toContain("member-a");
  saveCompanionConversation("member-b", "agent", threads, now); activateCompanionActor(null);
  expect(readCompanionConversation("member-b", now)).toBeNull();
});
it("storage rejection stays memory-only and does not throw", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Quota exceeded"); });
  expect(() => saveCompanionConversation("member-a", "agent", threads, now)).not.toThrow();
});
