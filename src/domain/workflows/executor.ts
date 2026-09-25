import type { WorkflowNode, WorkflowNodeType } from "@/contracts/workflow";
import { createExecutionPlan } from "./engine";

export type WorkflowNodeStatus = "succeeded" | "failed";

export type WorkflowNodeExecution = {
  nodeId: string;
  status: WorkflowNodeStatus;
  attempts: number;
  startedAt: number;
  endedAt: number;
  output?: unknown;
  error?: string;
};

export type WorkflowNodeContext = {
  node: WorkflowNode;
  input: unknown;
  dependencyOutputs: Record<string, unknown>;
  outputs: Readonly<Record<string, unknown>>;
  signal: AbortSignal;
};

export type WorkflowNodeExecutor = (
  context: WorkflowNodeContext,
) => Promise<unknown> | unknown;

export type WorkflowExecutionOptions = {
  handlers: Partial<Record<WorkflowNodeType, WorkflowNodeExecutor>>;
  maxExecutionMs?: number;
  clock?: () => number;
};

export type WorkflowExecutionResult = {
  status: "succeeded" | "failed";
  output?: unknown;
  error?: string;
  executions: WorkflowNodeExecution[];
  elapsedMs: number;
};

function timeoutError(node: WorkflowNode) {
  return new Error(`Node '${node.id}' exceeded its ${node.timeoutMs}ms timeout.`);
}

function executionBudgetError(maxExecutionMs: number) {
  return new Error(`Workflow exceeded its ${maxExecutionMs}ms execution budget.`);
}

async function executeAttempt(
  node: WorkflowNode,
  context: WorkflowNodeContext,
  handler: WorkflowNodeExecutor,
): Promise<unknown> {
  const controller = new AbortController();
  const attemptContext = { ...context, signal: controller.signal };
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      Promise.resolve(handler(attemptContext)),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          controller.abort();
          reject(timeoutError(node));
        }, node.timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export async function executeWorkflow(
  definition: unknown,
  input: unknown,
  options: WorkflowExecutionOptions,
): Promise<WorkflowExecutionResult> {
  const clock = options.clock ?? Date.now;
  const startedAt = clock();
  const plan = createExecutionPlan(definition);
  const outputs: Record<string, unknown> = {};
  const executions: WorkflowNodeExecution[] = [];
  const maxExecutionMs = options.maxExecutionMs ?? 120_000;

  for (const node of plan.nodes) {
    if (clock() - startedAt > maxExecutionMs) {
      const error = executionBudgetError(maxExecutionMs);
      return {
        status: "failed",
        error: error.message,
        executions,
        elapsedMs: clock() - startedAt,
      };
    }

    const handler = options.handlers[node.type];
    const dependencyOutputs = Object.fromEntries(
      plan.definition.edges
        .filter((edge) => edge.to === node.id)
        .map((edge) => [edge.from, outputs[edge.from]]),
    );
    const nodeStartedAt = clock();
    let lastError: Error | undefined;
    let attempts = 0;

    for (attempts = 1; attempts <= node.maxRetries + 1; attempts += 1) {
      try {
        if (!handler) {
          throw new Error(`No executor is registered for node type '${node.type}'.`);
        }
        const output = await executeAttempt(node, {
          node,
          input,
          dependencyOutputs,
          outputs,
          signal: new AbortController().signal,
        }, handler);
        outputs[node.id] = output;
        executions.push({
          nodeId: node.id,
          status: "succeeded",
          attempts,
          startedAt: nodeStartedAt,
          endedAt: clock(),
          output,
        });
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (lastError) {
      executions.push({
        nodeId: node.id,
        status: "failed",
        attempts: Math.min(attempts, node.maxRetries + 1),
        startedAt: nodeStartedAt,
        endedAt: clock(),
        error: lastError.message,
      });
      return {
        status: "failed",
        error: lastError.message,
        executions,
        elapsedMs: clock() - startedAt,
      };
    }

    if (clock() - startedAt > maxExecutionMs) {
      const error = executionBudgetError(maxExecutionMs);
      return {
        status: "failed",
        error: error.message,
        executions,
        elapsedMs: clock() - startedAt,
      };
    }
  }

  const finalNode = plan.nodes.at(-1);
  return {
    status: "succeeded",
    output: finalNode ? outputs[finalNode.id] : undefined,
    executions,
    elapsedMs: clock() - startedAt,
  };
}
