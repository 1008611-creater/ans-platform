import { describe, expect, it } from "vitest";
import { createExecutionPlan } from "@/domain/workflows/engine";
import { validateWorkflow } from "@/domain/workflows/graph";

const node = (id: string) => ({
  id,
  type: "prompt" as const,
  label: id,
  config: {},
  timeoutMs: 30_000,
  maxRetries: 1,
});

describe("workflow graph", () => {
  it("returns a deterministic topological order", () => {
    const result = validateWorkflow({
      version: 1,
      maxNodes: 20,
      nodes: [node("finish"), node("start"), node("middle")],
      edges: [
        { id: "e2", from: "middle", to: "finish", mapping: {} },
        { id: "e1", from: "start", to: "middle", mapping: {} },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.executionOrder).toEqual(["start", "middle", "finish"]);
  });

  it("rejects cycles", () => {
    const result = validateWorkflow({
      version: 1,
      maxNodes: 20,
      nodes: [node("a"), node("b")],
      edges: [
        { id: "ab", from: "a", to: "b", mapping: {} },
        { id: "ba", from: "b", to: "a", mapping: {} },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "cycle")).toBe(true);
    expect(result.executionOrder).toEqual([]);
  });

  it("builds an execution plan from validated input", () => {
    const plan = createExecutionPlan({
      version: 1,
      nodes: [node("input"), node("output")],
      edges: [{ id: "io", from: "input", to: "output" }],
    });

    expect(plan.order).toEqual(["input", "output"]);
    expect(plan.nodes.map((item) => item.id)).toEqual(["input", "output"]);
  });
});

