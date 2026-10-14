import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useCompanionAgent } from "@/components/mascot/use-companion-agent";
import { activateCompanionActor, readSubmittedAgentTurns, saveSubmittedAgentTurns, submittedAgentTurn } from "@/components/mascot/companion-session";
const quote = () => ({ ticket: "synthetic-recovery-ticket-123", requestId: "turn-a", model: "gpt-6.1-sol", maxPoints: 1, balance: 2, expiresAt: Date.now() + 300000 });
function seed() { activateCompanionActor("member-a"); saveSubmittedAgentTurns("member-a", [submittedAgentTurn(quote())]); }
const receipt = (state = "SETTLED", settledPoints: number | null = .0123) => ({ requestId: "call-a", state, reservedPoints: 1, settledPoints });
function mount() { return renderHook(({ actor, ready }) => useCompanionAgent(actor, "/explore", "zh", vi.fn(), vi.fn(), "deepseek-v4.1-flash", ready), { initialProps: { actor: "member-a" as string | null, ready: true } }); }
beforeEach(() => { sessionStorage.clear(); });
afterEach(() => { cleanup(); sessionStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
it.each(["SETTLED", "RELEASED", "UNCERTAIN", "RUNNING"])("refresh recovers %s through status only with no execution, quote or private consent", async state => {
  seed(); const fetch = vi.fn().mockResolvedValue(Response.json({ receipts: [receipt(state, state === "SETTLED" ? .0123 : state === "RELEASED" ? 0 : null)] })); vi.stubGlobal("fetch", fetch);
  const view = mount(); await waitFor(() => expect(view.result.current.recovery.turns[0]?.checked).toBe(true));
  expect(view.result.current.recovery.turns[0].receipts[0].state).toBe(state);
  expect(view.result.current.phase).toBe("idle"); expect(view.result.current.quote).toBeNull(); expect(view.result.current.privateAccess).toBe(false); expect(view.result.current.hasTicket).toBe(false);
  expect(fetch.mock.calls.every(([, init]) => JSON.parse(init.body).action === "status")).toBe(true);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ action: "status", ticket: quote().ticket });
});
it("failed or malformed status retains a retryable descriptor and never invents settlement", async () => {
  seed(); const fetch = vi.fn().mockRejectedValueOnce(new TypeError("offline")).mockResolvedValueOnce(Response.json({ receipts: [{ ...receipt(), settledPoints: -1 }] })).mockResolvedValueOnce(Response.json({ receipts: [receipt()] })); vi.stubGlobal("fetch", fetch);
  const view = mount(); await waitFor(() => expect(view.result.current.recovery.turns[0]?.error).toBe(true));
  expect(view.result.current.recovery.turns[0].receipts).toEqual([]);
  await act(() => view.result.current.recovery.check("turn-a")); expect(view.result.current.recovery.turns[0].error).toBe(true);
  await act(() => view.result.current.recovery.check("turn-a")); expect(view.result.current.recovery.turns[0].receipts).toEqual([receipt()]);
  expect(fetch.mock.calls.every(([, init]) => JSON.parse(init.body).action === "status")).toBe(true);
});
it("empty receipts stay unknown and duplicate checks share one pending request", async () => {
  seed(); let finish!: (value: Response) => void;
  const fetch = vi.fn().mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; })); vi.stubGlobal("fetch", fetch);
  const view = mount(); act(() => { void view.result.current.recovery.check("turn-a"); void view.result.current.recovery.check("turn-a"); });
  expect(fetch).toHaveBeenCalledTimes(1);
  await act(async () => finish(Response.json({ receipts: [] })));
  expect(view.result.current.recovery.turns[0]).toMatchObject({ checked: true, receipts: [], error: false });
});
it("late private results cannot recreate a switched or logged-out actor's recovery", async () => {
  seed(); let finish!: (value: Response) => void;
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; })));
  const view = mount(); view.rerender({ actor: "member-b", ready: true });
  await act(async () => finish(Response.json({ receipts: [receipt()] })));
  expect(view.result.current.recovery.turns).toEqual([]); expect(readSubmittedAgentTurns("member-a")).toEqual([]);
  seed(); view.rerender({ actor: null, ready: true }); expect(readSubmittedAgentTurns("member-a")).toEqual([]);
});
it("authentication loading does not clear or read saved recovery", async () => {
  seed(); const fetch = vi.fn().mockResolvedValue(Response.json({ receipts: [receipt()] })); vi.stubGlobal("fetch", fetch);
  const view = renderHook(({ ready }) => useCompanionAgent("member-a", "/explore", "zh", vi.fn(), vi.fn(), "deepseek-v4.1-flash", ready), { initialProps: { ready: false } });
  expect(fetch).not.toHaveBeenCalled(); expect(readSubmittedAgentTurns("member-a")).toHaveLength(1);
  view.rerender({ ready: true }); await waitFor(() => expect(view.result.current.recovery.turns[0]?.checked).toBe(true));
});
it.each(["QUOTE_EXPIRED", "ACCOUNT_CHANGED", "UNAUTHORIZED"])("clears a recovery rejected with %s without retrying execute", async error => {
  seed(); const fetch = vi.fn().mockResolvedValue(Response.json({ error }, { status: 409 })); vi.stubGlobal("fetch", fetch);
  const view = mount(); await waitFor(() => expect(view.result.current.recovery.turns).toEqual([]));
  expect(readSubmittedAgentTurns("member-a")).toEqual([]); expect(fetch).toHaveBeenCalledTimes(1);
});
it("records a submission before the execute request and keeps it after a new quote fails", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(Response.json(quote())).mockImplementationOnce(() => {
    expect(readSubmittedAgentTurns("member-a")).toHaveLength(1);
    return Promise.reject(new TypeError("lost response"));
  }).mockResolvedValueOnce(Response.json({ error: "AGENT_UNAVAILABLE" }, { status: 503 })); vi.stubGlobal("fetch", fetch);
  const view = mount(); await act(() => view.result.current.ask([], "问题")); await act(() => view.result.current.confirm()); await act(() => view.result.current.ask([], "新问题"));
  expect(view.result.current.recovery.turns).toHaveLength(1); expect(readSubmittedAgentTurns("member-a")).toHaveLength(1);
  expect(fetch.mock.calls.map(([, init]) => JSON.parse(init.body).action)).toEqual(["quote", "execute", "quote"]);
});
