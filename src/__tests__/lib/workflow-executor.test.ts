import { afterEach, describe, expect, it, vi } from "vitest";
import { executeWorkflow, type WorkflowNodeExecutor } from "@/domain/workflows/executor";

const node = (id: string, type: "prompt" | "output" | "model" = "prompt", overrides = {}) => ({
  id,
  type,
  label: id,
  config: {},
  timeoutMs: 100,
  maxRetries: 0,
  ...overrides,
});

describe("workflow executor", () => {
  it("executes nodes in topological order and passes dependency outputs", async () => {
    const calls: string[] = [];
    const result = await executeWorkflow(
      {
        version: 1,
        nodes: [node("start"), node("finish", "output")],
        edges: [{ id: "edge", from: "start", to: "finish" }],
      },
      { topic: "campus" },
      {
        handlers: {
          prompt: ({ node: current }) => {
            calls.push(current.id);
            return "draft";
          },
          output: ({ dependencyOutputs }) => {
            calls.push("finish");
            return `${dependencyOutputs.start}:published`;
          },
        },
      },
    );

    expect(result.status).toBe("succeeded");
    expect(result.output).toBe("draft:published");
    expect(calls).toEqual(["start", "finish"]);
    expect(result.executions.map((item) => item.status)).toEqual([
      "succeeded",
      "succeeded",
    ]);
  });

  it("retries a failed node up to its configured limit", async () => {
    const handler = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValue("ok");

    const result = await executeWorkflow(
      {
        version: 1,
        nodes: [node("only", "output", { maxRetries: 1 })],
        edges: [],
      },
      null,
      { handlers: { output: handler } },
    );

    expect(result.status).toBe("succeeded");
    expect(result.output).toBe("ok");
    expect(handler).toHaveBeenCalledTimes(2);
    expect(result.executions[0]?.attempts).toBe(2);
  });

  it("stops on a timeout and records the failure", async () => {
    const result = await executeWorkflow(
      {
        version: 1,
        nodes: [node("slow", "output", { timeoutMs: 100 })],
        edges: [],
      },
      null,
      {
        handlers: {
          output: async () => new Promise((resolve) => setTimeout(resolve, 150)),
        },
      },
    );

    expect(result.status).toBe("failed");
    expect(result.executions[0]?.error).toContain("exceeded");
  });

  it("aborts a node at the total execution budget", async () => {
    const result = await executeWorkflow(
      {
        version: 1,
        nodes: [node("slow", "output", { timeoutMs: 100 })],
        edges: [],
      },
      null,
      {
        maxExecutionMs: 20,
        handlers: {
          output: async () => new Promise((resolve) => setTimeout(() => resolve("ok"), 30)),
        },
      },
    );

    expect(result.status).toBe("failed");
    expect(result.error).toContain("execution budget");
    expect(result.executions[0]?.status).toBe("failed");
  });
});


it("checkpoint persistence failure never retries a paid node", async () => {
  const paidCall = vi.fn().mockResolvedValue("paid response");
  await expect(executeWorkflow({ version: 1, nodes: [node("paid", "model", { maxRetries: 3 })], edges: [] }, {}, {
    handlers: { model: paidCall }, onNodeFinished: async () => { throw new Error("DB_UNAVAILABLE"); },
  })).rejects.toThrow("DB_UNAVAILABLE");
  expect(paidCall).toHaveBeenCalledTimes(1);
});


describe("workflow deadline causes", () => {
  afterEach(() => vi.useRealTimers());

  it("reports a budget-limited timer even when the sampled clock remains 1ms short", async () => {
    vi.useFakeTimers();
    let elapsed = 0;
    const handler = vi.fn<WorkflowNodeExecutor>(() => new Promise(() => {}));
    const finished = vi.fn();
    const promise = executeWorkflow({ version: 1, nodes: [node("slow", "output")], edges: [] }, null, {
      maxExecutionMs: 20, clock: () => elapsed, handlers: { output: handler },
      onNodeStarted: async () => { elapsed = 1; }, onNodeFinished: finished,
    });
    await vi.advanceTimersByTimeAsync(0);
    elapsed = 19;
    await vi.advanceTimersByTimeAsync(19);
    const result = await promise;
    expect(result.error).toBe("Workflow exceeded its 20ms execution budget.");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.executions[0].attempts).toBe(1);
    expect(finished).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not retry a budget-limited timer despite retries and the 1ms clock gap", async () => {
    vi.useFakeTimers();
    let elapsed = 0;
    const handler = vi.fn<WorkflowNodeExecutor>(() => new Promise(() => {}));
    const promise = executeWorkflow({ version: 1, nodes: [node("slow", "output", { maxRetries: 3 })], edges: [] }, null, {
      maxExecutionMs: 20, clock: () => elapsed, handlers: { output: handler },
      onNodeStarted: async () => { elapsed = 1; },
    });
    await vi.advanceTimersByTimeAsync(0);
    elapsed = 19;
    await vi.advanceTimersByTimeAsync(22);
    const result = await promise;
    expect(result.error).toBe("Workflow exceeded its 20ms execution budget.");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.executions[0].attempts).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the configured node timeout and retries it while total budget remains", async () => {
    vi.useFakeTimers();
    const handler = vi.fn<WorkflowNodeExecutor>(() => new Promise(() => {}));
    const promise = executeWorkflow({ version: 1, nodes: [node("slow", "output", { maxRetries: 1 })], edges: [] }, null, {
      maxExecutionMs: 1000, clock: () => 0, handlers: { output: handler },
    });
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;
    expect(result.error).toBe("Node 'slow' exceeded its 100ms timeout.");
    expect(handler).toHaveBeenCalledTimes(2);
    expect(result.executions[0].attempts).toBe(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("treats a node and workflow deadline tie as the total budget without retrying", async () => {
    vi.useFakeTimers();
    const handler = vi.fn<WorkflowNodeExecutor>(() => new Promise(() => {}));
    const promise = executeWorkflow({ version: 1, nodes: [node("slow", "output", { maxRetries: 3 })], edges: [] }, null, {
      maxExecutionMs: 100, clock: () => 0, handlers: { output: handler },
    });
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;
    expect(result.error).toBe("Workflow exceeded its 100ms execution budget.");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.executions[0].attempts).toBe(1);
  });

  it("keeps cancellation distinct even if its catch samples an exhausted total budget", async () => {
    vi.useFakeTimers();
    let elapsed = 0;
    const controller = new AbortController();
    const handler = vi.fn<WorkflowNodeExecutor>(() => new Promise(() => {}));
    const promise = executeWorkflow({ version: 1, nodes: [node("slow", "output", { maxRetries: 3 })], edges: [] }, null, {
      maxExecutionMs: 20, clock: () => elapsed, signal: controller.signal, handlers: { output: handler },
    });
    await vi.advanceTimersByTimeAsync(0);
    elapsed = 20;
    controller.abort();
    const result = await promise;
    expect(result.error).toBe("Workflow execution was cancelled.");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.executions[0].attempts).toBe(1);
    expect(handler.mock.calls[0][0].signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not begin or retry a cancelled node after its start callback exhausts the budget", async () => {
    let elapsed = 0;
    const controller = new AbortController();
    const handler = vi.fn().mockResolvedValue("unexpected");
    const result = await executeWorkflow({ version: 1, nodes: [node("only", "output", { maxRetries: 3 })], edges: [] }, null, {
      maxExecutionMs: 20, clock: () => elapsed, signal: controller.signal, handlers: { output: handler },
      onNodeStarted: async () => { elapsed = 20; controller.abort(); },
    });
    expect(result.error).toBe("Workflow execution was cancelled.");
    expect(handler).not.toHaveBeenCalled();
    expect(result.executions[0].attempts).toBe(1);
  });

  it("preserves the executor deadline cause when abort-aware handler rejects immediately", async () => {
    vi.useFakeTimers();
    const handler = vi.fn(({ signal }) => new Promise((_, reject) => {
      signal.addEventListener("abort", () => reject(new Error("handler abort consequence")), { once: true });
    }));
    const promise = executeWorkflow({ version: 1, nodes: [node("slow", "output", { maxRetries: 3 })], edges: [] }, null, {
      maxExecutionMs: 20, clock: () => 0, handlers: { output: handler },
    });
    await vi.advanceTimersByTimeAsync(20);
    expect((await promise).error).toBe("Workflow exceeded its 20ms execution budget.");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not start a node at the exact total deadline", async () => {
    const handler = vi.fn().mockResolvedValue("unexpected");
    const clock = vi.fn().mockReturnValueOnce(0).mockReturnValue(20);
    const started = vi.fn();
    const result = await executeWorkflow({ version: 1, nodes: [node("only")], edges: [] }, null, {
      maxExecutionMs: 20, clock, handlers: { prompt: handler }, onNodeStarted: started,
    });
    expect(result.error).toBe("Workflow exceeded its 20ms execution budget.");
    expect(handler).not.toHaveBeenCalled();
    expect(started).not.toHaveBeenCalled();
    expect(result.executions).toEqual([]);
  });
});
