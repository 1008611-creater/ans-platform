import type { WorkflowDefinition } from "@/contracts/workflow";

/**
 * 工作流的输入变量发现。
 *
 * 变量有两个来源：
 * 1. 节点 config.variables 显式声明（可带 label / required / hint）；
 * 2. 节点提示词里出现的 `{{input.xxx}}` 占位符。
 *
 * 显式声明优先，占位符只作为补充，保证「运行页要填什么」永远可以从定义推导出来。
 */

export type WorkflowInputVariable = {
  key: string;
  label: string;
  required: boolean;
  hint?: string;
};

const INPUT_PLACEHOLDER = /\{\{\s*input\.([a-zA-Z][a-zA-Z0-9_-]*)/g;

function readDeclared(value: unknown): WorkflowInputVariable | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const key = typeof record.key === "string" ? record.key.trim() : "";
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key)) return null;
  const label = typeof record.label === "string" && record.label.trim() ? record.label.trim() : key;
  const hint = typeof record.hint === "string" && record.hint.trim() ? record.hint.trim() : undefined;
  return { key, label, required: record.required !== false, ...(hint ? { hint } : {}) };
}

export function extractInputVariables(definition: WorkflowDefinition): WorkflowInputVariable[] {
  const variables = new Map<string, WorkflowInputVariable>();

  for (const node of definition.nodes) {
    const declared = node.config.variables;
    if (Array.isArray(declared)) {
      for (const candidate of declared) {
        const variable = readDeclared(candidate);
        if (variable) variables.set(variable.key, variable);
      }
    }
  }

  for (const node of definition.nodes) {
    for (const candidate of [node.config.prompt, node.config.template, node.config.value]) {
      if (typeof candidate !== "string") continue;
      for (const match of candidate.matchAll(INPUT_PLACEHOLDER)) {
        const key = match[1];
        if (!variables.has(key)) variables.set(key, { key, label: key, required: true });
      }
    }
  }

  return [...variables.values()];
}

/** 运行页提交前的必填校验，返回缺失的变量标签。 */
export function missingRequiredVariables(
  variables: WorkflowInputVariable[],
  input: Record<string, unknown>,
): string[] {
  return variables
    .filter((variable) => {
      if (!variable.required) return false;
      const value = input[variable.key];
      return value === undefined || value === null || String(value).trim() === "";
    })
    .map((variable) => variable.label);
}
