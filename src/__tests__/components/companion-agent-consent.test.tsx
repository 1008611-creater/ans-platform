import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useCompanionAgent } from "@/components/mascot/use-companion-agent";

const quote = () => ({ ticket: "consent-ticket-1234567890", requestId: "turn-consent", model: "gpt-6.1-sol", maxPoints: 1, balance: 100, expiresAt: Date.now() + 300000 });
const stream = (events: unknown[]) => new Response(events.map(event => JSON.stringify(event)).join("\n") + "\n", { headers: { "content-type": "application/x-ndjson" } });
const answered = () => stream([{ type: "phase", phase: "thinking" }, { type: "answer", text: "好的", links: [] }, { type: "done" }]);
const failed = (code: string) => stream([{ type: "phase", phase: "thinking" }, { type: "error", code }, { type: "done" }]);
const actions = (fetch: ReturnType<typeof vi.fn>) => fetch.mock.calls.map(call => JSON.parse(call[1].body).action);

function mount() {
  return renderHook(({ actor, ready }) => useCompanionAgent(actor, "/explore", "zh", vi.fn(), vi.fn(), "gpt-6.1-sol", ready), { initialProps: { actor: "member-a" as string | null, ready: true } });
}

beforeEach(() => { window.localStorage.clear(); sessionStorage.clear(); });
afterEach(() => { cleanup(); window.localStorage.clear(); sessionStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("确认一次后记住授权，下一轮拿到报价就直接执行", async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json(quote()))
    .mockResolvedValueOnce(answered())
    .mockResolvedValueOnce(Response.json(quote()))
    .mockResolvedValueOnce(answered());
  vi.stubGlobal("fetch", fetch);
  const view = mount();
  expect(view.result.current.autoApprove).toBe(false);

  await act(() => view.result.current.ask([], "第一问"));
  expect(view.result.current.phase).toBe("confirm");
  await act(() => view.result.current.confirm(true));
  await waitFor(() => expect(view.result.current.phase).toBe("complete"));
  expect(view.result.current.autoApprove).toBe(true);

  await act(() => view.result.current.ask([], "第二问"));
  await waitFor(() => expect(view.result.current.phase).toBe("complete"));
  expect(actions(fetch)).toEqual(["quote", "execute", "quote", "execute"]);
});

it("取消勾选后不记住授权，下一轮仍会弹确认", async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json(quote()))
    .mockResolvedValueOnce(answered())
    .mockResolvedValueOnce(Response.json(quote()));
  vi.stubGlobal("fetch", fetch);
  const view = mount();
  await act(() => view.result.current.ask([], "第一问"));
  await act(() => view.result.current.confirm(false));
  await waitFor(() => expect(view.result.current.phase).toBe("complete"));
  expect(view.result.current.autoApprove).toBe(false);
  await act(() => view.result.current.ask([], "第二问"));
  expect(view.result.current.phase).toBe("confirm");
  expect(view.result.current.quote).not.toBeNull();
  expect(actions(fetch)).toEqual(["quote", "execute", "quote"]);
});

it("明确没开始执行的失败保留输入并提供重试，不需要先对账", async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json(quote()))
    .mockResolvedValueOnce(failed("GATEWAY_RESERVATION_FAILED"))
    .mockResolvedValueOnce(Response.json(quote()));
  vi.stubGlobal("fetch", fetch);
  const view = mount();
  await act(() => view.result.current.ask([], "问题"));
  await act(() => view.result.current.confirm(false));
  await waitFor(() => expect(view.result.current.phase).toBe("error"));
  expect(view.result.current.error).toBe("GATEWAY_RESERVATION_FAILED");
  expect(view.result.current.canRetryQuote).toBe(true);
  await act(() => view.result.current.retryQuote());
  expect(actions(fetch)).toEqual(["quote", "execute", "quote"]);
  expect(view.result.current.phase).toBe("confirm");
});

it("结果不确定的失败不提供重试，必须先对账", async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json(quote()))
    .mockResolvedValueOnce(failed("BILLING_PENDING"));
  vi.stubGlobal("fetch", fetch);
  const view = mount();
  await act(() => view.result.current.ask([], "问题"));
  await act(() => view.result.current.confirm(false));
  await waitFor(() => expect(view.result.current.phase).toBe("error"));
  expect(view.result.current.canRetryQuote).toBe(false);
});
