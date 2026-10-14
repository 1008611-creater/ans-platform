import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useCompanionAgent } from "@/components/mascot/use-companion-agent";
import type { RunModelKey } from "@/lib/run-models";
const quote = { ticket: "isolated-approved-ticket", requestId: "local-turn", model: "deepseek-v4.1-flash", maxPoints: 1, balance: 2, expiresAt: Date.now() + 300000 };
function mount() {
  const onAnswer = vi.fn(), onUser = vi.fn();
  const view = renderHook(({ model, path, actor }: { model: RunModelKey; path: string; actor: string }) => useCompanionAgent(actor, path, "zh", onAnswer, onUser, model), { initialProps: { model: "deepseek-v4.1-flash" as RunModelKey, path: "/explore", actor: "member-a" } });
  return { ...view, onAnswer, onUser };
}
const failure = () => Response.json({ error: "AGENT_UNAVAILABLE" }, { status: 503 });
const ndjson = (events: unknown[]) => new Response(events.map(event => JSON.stringify(event)).join("\n"), { headers: { "content-type": "application/x-ndjson" } });
afterEach(() => { cleanup(); sessionStorage.clear(); vi.unstubAllGlobals(); });
it("offers a quote-only retry before execution and accepts a final event without newline", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(failure()).mockResolvedValueOnce(Response.json(quote)).mockResolvedValueOnce(ndjson([{ type: "answer", text: "回复", links: [] }, { type: "done" }]));
  vi.stubGlobal("fetch", fetch); const view = mount();
  await act(async () => { await view.result.current.ask([], "问题"); });
  expect(view.result.current.canRetryQuote).toBe(true); expect(view.result.current.hasTicket).toBe(false);
  await act(async () => { await view.result.current.retryQuote(); });
  expect(view.result.current.phase).toBe("confirm"); expect(view.onUser).not.toHaveBeenCalled();
  expect(JSON.parse(fetch.mock.calls[1][1].body).action).toBe("quote");
  await act(async () => { await view.result.current.confirm(); });
  expect(view.result.current.phase).toBe("complete"); expect(view.onAnswer).toHaveBeenCalledOnce();
});
it("retains the submitted ticket through model changes and deduplicates receipt checks", async () => {
  let finish: (value: Response) => void = () => {};
  const fetch = vi.fn().mockResolvedValueOnce(Response.json(quote)).mockResolvedValueOnce(failure()).mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
  vi.stubGlobal("fetch", fetch); const view = mount();
  await act(async () => { await view.result.current.ask([], "问题"); });
  await act(async () => { await view.result.current.confirm(); });
  expect(view.result.current.hasTicket).toBe(true); expect(view.result.current.canRetryQuote).toBe(false);
  view.rerender({ model: "gpt-6.1-sol", path: "/explore", actor: "member-a" });
  expect(view.result.current.hasTicket).toBe(true);
  let request: Promise<void>;
  act(() => { request = view.result.current.refreshReceipts(); void view.result.current.refreshReceipts(); });
  expect(fetch).toHaveBeenCalledTimes(3); expect(view.result.current.checkingReceipts).toBe(true);
  await act(async () => { finish(Response.json({ receipts: [{ requestId: "local-turn", state: "SETTLED", reservedPoints: 1, settledPoints: .1 }] })); await request!; });
  expect(view.result.current.receiptChecked).toBe(true);
  expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ action: "status", ticket: quote.ticket });
});
it("never recovers an old ticket as a newly failed quote", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json(quote)).mockResolvedValueOnce(failure()).mockResolvedValueOnce(failure()));
  const view = mount();
  await act(async () => { await view.result.current.ask([], "当前轮问题"); });
  await act(async () => { await view.result.current.confirm(); });
  await act(async () => { await view.result.current.ask([], "当前轮问题"); });
  expect(view.result.current.hasTicket).toBe(false); expect(view.result.current.canRetryQuote).toBe(true);
});
it("drops a late private answer after account changes", async () => {
  let finish: (value: Response) => void = () => {};
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json(quote)).mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; })));
  const view = mount(); await act(async () => { await view.result.current.ask([], "私密问题"); });
  let operation: Promise<void>;
  act(() => { operation = view.result.current.confirm(); });
  view.rerender({ model: "deepseek-v4.1-flash", path: "/explore", actor: "member-b" });
  await act(async () => { finish(ndjson([{ type: "answer", text: "旧账号回复", links: [] }, { type: "done" }])); await operation!; });
  expect(view.onAnswer).not.toHaveBeenCalled(); expect(view.result.current.hasTicket).toBe(false);
});
it("cancels an unsubmitted quote on navigation without calling it stopped execution", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(quote)));
  const view = mount(); await act(async () => { await view.result.current.ask([], "问题"); });
  view.rerender({ model: "deepseek-v4.1-flash", path: "/hubs", actor: "member-a" });
  await waitFor(() => expect(view.result.current.phase).toBe("idle"));
  expect(view.result.current.quote).toBeNull(); expect(view.result.current.hasTicket).toBe(false);
});
