import { describe, expect, it, vi } from "vitest";
import { executeWorkflow } from "@/domain/workflows/executor";

const node = (id: string, type: "prompt" | "output" = "prompt", overrides = {}) => ({
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

  it("enforces the workflow execution budget after a node completes", async () => {
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
    expect(result.executions[0]?.status).toBe("succeeded");
  });
});
