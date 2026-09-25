import { describe, expect, it } from "vitest";
import { extractInputVariables, missingRequiredVariables } from "@/domain/workflows/variables";
import type { WorkflowDefinition } from "@/contracts/workflow";

const node = (id: string, type: "prompt" | "model" | "output", config: Record<string, unknown> = {}) => ({
  id,
  type,
  label: id,
  config,
  timeoutMs: 1000,
  maxRetries: 0,
});

const definition = (nodes: WorkflowDefinition["nodes"]): WorkflowDefinition => ({
  version: 1,
  maxNodes: 20,
  nodes,
  edges: [],
});

describe("workflow input variables", () => {
  it("discovers placeholders in prompts", () => {
    const variables = extractInputVariables(
      definition([node("draft", "prompt", { prompt: "写一篇关于 {{input.topic}} 的稿子" })]),
    );

    expect(variables).toEqual([{ key: "topic", label: "topic", required: true }]);
  });

  it("prefers declared variables and keeps their metadata", () => {
    const variables = extractInputVariables(
      definition([
        node("draft", "prompt", {
          prompt: "语气：{{input.tone}}",
          variables: [
            { key: "tone", label: "语气", required: false, hint: "正式或轻松" },
            { key: "topic", label: "主题", required: true },
          ],
        }),
      ]),
    );

    expect(variables).toEqual([
      { key: "tone", label: "语气", required: false, hint: "正式或轻松" },
      { key: "topic", label: "主题", required: true },
    ]);
  });

  it("ignores malformed declarations and reads config.value and config.template", () => {
    const variables = extractInputVariables(
      definition([
        node("a", "model", { template: "{{ input.audience }}" }),
        node("b", "output", {
          value: "{{input.format}}",
          variables: [{ key: "9bad", label: "坏键" }, "not-an-object", { label: "缺少 key" }],
        }),
      ]),
    );

    expect(variables.map((item) => item.key)).toEqual(["audience", "format"]);
  });

  it("deduplicates repeated placeholders", () => {
    const variables = extractInputVariables(
      definition([
        node("a", "prompt", { prompt: "{{input.topic}}" }),
        node("b", "prompt", { prompt: "再次 {{input.topic}}" }),
      ]),
    );

    expect(variables).toHaveLength(1);
  });

  it("reports missing required values and accepts optional blanks", () => {
    const variables = [
      { key: "topic", label: "主题", required: true },
      { key: "tone", label: "语气", required: false },
    ];

    expect(missingRequiredVariables(variables, {})).toEqual(["主题"]);
    expect(missingRequiredVariables(variables, { topic: "   " })).toEqual(["主题"]);
    expect(missingRequiredVariables(variables, { topic: "校园 AI", tone: "" })).toEqual([]);
    expect(missingRequiredVariables(variables, { topic: 0 })).toEqual([]);
  });
});
