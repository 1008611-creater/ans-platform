import { createHash, randomUUID } from "node:crypto";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkflowRunForm } from "@/components/workflows/workflow-run-form";
import { MarketAccountBoundary } from "@/components/marketplace/account-boundary";
const m = vi.hoisted(() => ({ actor: "member-a", status: "authenticated", refresh: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: m.actor } }, status: m.status }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));
const fetchMock = vi.fn();
const wrap = (actorId = "member-a", defaultModelKey?: string) => <MarketAccountBoundary actorId={actorId}><WorkflowRunForm slug="weekly" variables={[{ key: "topic", label: "主题", required: true }]} estimatedCost={3} defaultModelKey={defaultModelKey} /></MarketAccountBoundary>;
function deferred() { let resolve!: (value: unknown) => void; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
const reply = (data: unknown) => ({ ok: true, json: async () => ({ ok: true, data }) });
function fill(topic = "原账号输入") { fireEvent.change(screen.getByRole("textbox", { name: /主题/ }), { target: { value: topic } }); }
function clickRun() { fireEvent.click(screen.getByRole("button", { name: "billingRun" })); }
beforeEach(() => { vi.clearAllMocks(); fetchMock.mockReset(); m.actor = "member-a"; m.status = "authenticated"; vi.stubGlobal("fetch", fetchMock); sessionStorage.clear(); vi.stubGlobal("crypto", { randomUUID, subtle: { digest: async (_algorithm: string, bytes: Uint8Array) => new Uint8Array(createHash("sha256").update(bytes).digest()).buffer } }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("普通工作流运行防重复与账号隔离", () => {
  it("全部创建、执行、详情请求绑定同一个账号，重复点击只创建一次", async () => {
    const task = deferred(); fetchMock.mockReturnValueOnce(task.promise).mockResolvedValueOnce(reply({ result: { status: "succeeded", output: "完整真实结果" } })).mockResolvedValueOnce(reply({ run: { id: "run-a", status: "SUCCEEDED", nodeRuns: [] } }));
    render(wrap()); fill(); clickRun();
    expect(screen.getByRole("textbox", { name: /主题/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /运行中/ })); await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const createBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(createBody.input).toEqual({ topic: "原账号输入" }); expect(createBody.idempotencyKey).toEqual(expect.any(String));
    await act(async () => task.resolve(reply({ run: { id: "run-a" } })));
    expect(await screen.findByText("完整真实结果")).toBeInTheDocument(); expect(m.refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/workflows/weekly/run", "/api/workflows/runs/run-a/execute", "/api/workflows/runs/run-a"]);
    for (const [, init] of fetchMock.mock.calls) expect(init).toMatchObject({ headers: { "x-ans-actor": "member-a" }, credentials: "same-origin" });
    expect(fetchMock.mock.calls[2][1].method).toBe("GET"); expect(fetchMock.mock.calls[2][1].body).toBeUndefined();
  });
  it("创建回执丢失不自动重试收费，人工同输入重试复用编号，修改输入换编号", async () => {
    fetchMock.mockRejectedValue(new Error("connection interrupted"));
    render(wrap()); fill(); clickRun(); await screen.findByText("connection interrupted");
    expect(fetchMock).toHaveBeenCalledTimes(1); const first = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    clickRun(); await waitFor(() => expect(screen.getByRole("button", { name: "billingRun" })).toBeEnabled());
    const second = JSON.parse(fetchMock.mock.calls[1][1].body as string); expect(second).toEqual(first);
    fill("修改后的输入"); clickRun(); await waitFor(() => expect(screen.getByRole("button", { name: "billingRun" })).toBeEnabled());
    const third = JSON.parse(fetchMock.mock.calls[2][1].body as string); expect(third.idempotencyKey).not.toBe(first.idempotencyKey); expect(third.input.topic).toBe("修改后的输入");
  });
  it("换号时创建请求中止，迟到运行编号不能执行或刷新新账号", async () => {
    const task = deferred(); fetchMock.mockReturnValueOnce(task.promise);
    const view = render(wrap()); fill(); clickRun(); await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1)); const init = fetchMock.mock.calls[0][1] as RequestInit;
    m.actor = "member-b"; view.rerender(wrap()); expect(init.signal?.aborted).toBe(true); expect(screen.queryByDisplayValue("原账号输入")).not.toBeInTheDocument();
    view.rerender(wrap("member-b"));
    await act(async () => task.resolve(reply({ run: { id: "old-member-run" } })));
    expect(fetchMock).toHaveBeenCalledTimes(1); expect(m.refresh).not.toHaveBeenCalled(); expect(screen.queryByText(/old-member/)).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /主题/ })).toHaveValue("");
  });
  it("执行回执迟到不恢复旧结果，也不发起旧账号轮询", async () => {
    const task = deferred(); fetchMock.mockResolvedValueOnce(reply({ run: { id: "run-a" } })).mockReturnValueOnce(task.promise);
    const view = render(wrap()); fill(); clickRun(); await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const signal = fetchMock.mock.calls[1][1].signal as AbortSignal;
    m.actor = "member-b"; view.rerender(wrap("member-b")); expect(signal.aborted).toBe(true);
    await act(async () => task.resolve(reply({ result: { status: "succeeded", output: "旧账号私密结果" } })));
    expect(screen.queryByText("旧账号私密结果")).not.toBeInTheDocument(); expect(fetchMock).toHaveBeenCalledTimes(2); expect(m.refresh).not.toHaveBeenCalled();
  });
  it("执行连接中断仅轮询原运行，迟到轮询回执也绑定账号", async () => {
    const task = deferred(); fetchMock.mockResolvedValueOnce(reply({ run: { id: "run-a" } })).mockRejectedValueOnce(new Error("lost execute ack")).mockReturnValueOnce(task.promise);
    const view = render(wrap()); fill(); clickRun(); await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][0]).toBe("/api/workflows/runs/run-a"); expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: "GET", headers: { "x-ans-actor": "member-a" } });
    m.actor = "member-b"; view.rerender(wrap("member-b"));
    await act(async () => task.resolve(reply({ run: { id: "run-a", status: "SUCCEEDED", output: "旧轮询私密结果" } })));
    expect(screen.queryByText("旧轮询私密结果")).not.toBeInTheDocument(); expect(fetchMock).toHaveBeenCalledTimes(3); expect(m.refresh).not.toHaveBeenCalled();
  });
  it("同账号丢失执行回执能够从原运行恢复结果而不再次发起创建或执行", async () => {
    fetchMock.mockResolvedValueOnce(reply({ run: { id: "run-a" } })).mockRejectedValueOnce(new Error("lost execute ack")).mockResolvedValueOnce(reply({ run: { id: "run-a", status: "SUCCEEDED", output: "已提交运行结果", nodeRuns: [] } }));
    render(wrap()); fill(); clickRun(); expect(await screen.findByText("已提交运行结果")).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === "POST")).toHaveLength(2); expect(m.refresh).toHaveBeenCalledTimes(1);
  });
});


it("换号清理待执行轮询计时器，连接恢复也不继续旧账号请求", async () => {
  vi.useFakeTimers();
  try {
    fetchMock.mockResolvedValueOnce(reply({ run: { id: "run-a" } })).mockRejectedValueOnce(new Error("lost ack")).mockResolvedValue(reply({ run: { id: "run-a", status: "RUNNING" } }));
    const view = render(wrap()); fill(); clickRun();
    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledTimes(3); expect(vi.getTimerCount()).toBeGreaterThan(0);
    m.actor = "member-b"; view.rerender(wrap("member-b"));
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(fetchMock).toHaveBeenCalledTimes(3); expect(m.refresh).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  } finally { vi.useRealTimers(); }
});


describe("普通工作流刷新后的请求恢复", () => {
  it("丢失创建回执后重新挂载，同账号同输入沿用原编号且不存个人输入", async () => {
    fetchMock.mockRejectedValue(new Error("lost create acknowledgement"));
    const firstView = render(wrap()); fill("私密简历内容，仅用于生成摘要"); clickRun();
    await screen.findByText("lost create acknowledgement");
    const first = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sessionStorage.length).toBe(1);
    const slot = sessionStorage.key(0)!; expect(slot).toMatch(/^ans:workflow-run:member-a:weekly:[a-f0-9]{64}$/);
    expect(sessionStorage.getItem(slot)).toBe(first.idempotencyKey);
    expect(JSON.stringify(sessionStorage)).not.toContain("私密简历");
    firstView.unmount(); render(wrap());
    expect(screen.getByRole("textbox", { name: /主题/ })).toHaveValue("");
    fill("私密简历内容，仅用于生成摘要"); clickRun(); await screen.findByText("lost create acknowledgement");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual(first);
  });
  it("另一账号即使使用相同输入与工作流也不能沿用旧账号编号", async () => {
    fetchMock.mockRejectedValue(new Error("lost acknowledgement"));
    const firstView = render(wrap()); fill(); clickRun(); await screen.findByText("lost acknowledgement");
    const first = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    firstView.unmount(); m.actor = "member-b"; render(wrap("member-b")); fill(); clickRun(); await screen.findByText("lost acknowledgement");
    const second = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
    expect(fetchMock.mock.calls[1][1].headers).toMatchObject({ "x-ans-actor": "member-b" });
    expect(sessionStorage.length).toBe(2);
  });
  it("已完成运行清除恢复编号，下次明确运行得到新编号", async () => {
    fetchMock.mockImplementation(async (url: string) => reply(url.endsWith("/execute") ? { result: { status: "succeeded", output: "已完成结果" } } : { run: { id: "run-a", status: "SUCCEEDED", nodeRuns: [] } }));
    const firstView = render(wrap()); fill(); clickRun(); await screen.findByText("已完成结果");
    await waitFor(() => expect(m.refresh).toHaveBeenCalledTimes(1));
    const first = JSON.parse(fetchMock.mock.calls[0][1].body as string); expect(sessionStorage.length).toBe(0);
    firstView.unmount(); render(wrap()); fill(); clickRun(); await screen.findByText("已完成结果");
    const second = JSON.parse(fetchMock.mock.calls[3][1].body as string);
    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
  });
  it("修改输入保留原未知结果请求的摘要编号，改回后仍可找回原请求", async () => {
    fetchMock.mockRejectedValue(new Error("lost acknowledgement"));
    render(wrap()); fill("原始私密输入"); clickRun(); await screen.findByText("lost acknowledgement");
    const first = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    fill("改变后的私密输入"); clickRun(); await waitFor(() => expect(screen.getByRole("button", { name: "billingRun" })).toBeEnabled());
    const second = JSON.parse(fetchMock.mock.calls[1][1].body as string); expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
    fill("原始私密输入"); clickRun(); await waitFor(() => expect(screen.getByRole("button", { name: "billingRun" })).toBeEnabled());
    expect(JSON.parse(fetchMock.mock.calls[2][1].body as string).idempotencyKey).toBe(first.idempotencyKey);
    expect(sessionStorage.length).toBe(2);
  });
});


it("相同输入切换模型后使用独立请求摘要，不复用原模型的运行编号", async () => {
  fetchMock.mockRejectedValue(new Error("lost acknowledgement"));
  const view = render(wrap("member-a", "gpt-6.1-sol")); fill(); clickRun(); await screen.findByText("lost acknowledgement");
  const first = JSON.parse(fetchMock.mock.calls[0][1].body as string);
  view.unmount(); render(wrap("member-a", "gpt-6-astra")); fill(); clickRun(); await screen.findByText("lost acknowledgement");
  const second = JSON.parse(fetchMock.mock.calls[1][1].body as string);
  expect(second.input).toEqual(first.input); expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
  expect(sessionStorage.length).toBe(2);
  for (let index = 0; index < sessionStorage.length; index += 1) expect(sessionStorage.key(index)).not.toMatch(/gpt|原账号输入/);
});


describe("accepted run recovery", () => {
  it("blocks creation while restoring, then resumes an unknown connection with reads only", async () => {
    vi.useFakeTimers();
    try {
      sessionStorage.setItem("ans:workflow-run-id:member-a:weekly", "accepted-run");
      const restore = deferred();
      fetchMock.mockReturnValueOnce(restore.promise).mockResolvedValueOnce(reply({ run: { id: "accepted-run", status: "SUCCEEDED", output: "Recovered result", nodeRuns: [{ nodeId: "copy", status: "SUCCEEDED", attempts: 1, error: null }] } }));
      render(wrap()); fill();
      expect(screen.getByRole("button", { name: /运行中/ })).toBeDisabled();
      await act(async () => restore.resolve(Promise.reject(new Error("network offline"))));
      expect(screen.getByRole("button", { name: "billingRun" })).toBeDisabled();
      await act(async () => { await vi.advanceTimersByTimeAsync(400); });
      expect(screen.getByText("Recovered result")).toBeVisible();
      expect(screen.getByText("copy")).toBeInTheDocument();
      expect(fetchMock.mock.calls.every(([, init]) => init.method === "GET")).toBe(true);
      expect(sessionStorage.length).toBe(0);
    } finally { vi.useRealTimers(); }
  });
  it("reload restores the accepted run and removes its exact intent after completion", async () => {
    const intentSlot = "ans:workflow-run:member-a:weekly:" + "a".repeat(64);
    sessionStorage.setItem(intentSlot, "pending-key");
    sessionStorage.setItem("ans:workflow-run-id:member-a:weekly", JSON.stringify({ id: "accepted-run", intentSlot }));
    fetchMock.mockResolvedValueOnce(reply({ run: { id: "accepted-run", status: "SUCCEEDED", output: "Saved result", nodeRuns: [] } }));
    render(wrap()); expect(await screen.findByText("Saved result")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);expect(fetchMock.mock.calls[0][1].method).toBe("GET");
    expect(sessionStorage.length).toBe(0);
  });
  it("keeps known node records if the final detail read fails", async () => {
    vi.useFakeTimers();
    try {
      const executed = deferred();
      fetchMock.mockResolvedValueOnce(reply({ run: { id: "run-a" } })).mockReturnValueOnce(executed.promise)
        .mockResolvedValueOnce(reply({ run: { id: "run-a", status: "RUNNING", nodeRuns: [{ nodeId: "copy", status: "SUCCEEDED", attempts: 1, error: null }] } }))
        .mockRejectedValueOnce(new Error("final read offline"));
      render(wrap()); fill(); clickRun(); await act(async () => {});
      await act(async () => { await vi.advanceTimersByTimeAsync(400); });
      expect(screen.getByText("copy")).toBeInTheDocument();
      await act(async () => executed.resolve(reply({ result: { status: "succeeded", output: "Delivered" } })));
      expect(screen.getByText("Delivered")).toBeVisible();expect(screen.getByText("copy")).toBeInTheDocument();
      expect(m.refresh).toHaveBeenCalledTimes(1);
    } finally { vi.useRealTimers(); }
  });
});
