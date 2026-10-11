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
  signal?: AbortSignal;
  clock?: () => number;
  /** Durable successes are replayed locally, without calling their executor again. */
  checkpoints?: readonly WorkflowNodeExecution[];
  onNodeStarted?: (node: WorkflowNode, startedAt: number) => Promise<void>;
  onNodeFinished?: (execution: WorkflowNodeExecution) => Promise<void>;
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
  signal?: AbortSignal,
): Promise<unknown> {
  if (signal?.aborted) throw new Error("Workflow execution was cancelled.");
  const controller = new AbortController();
  const attemptContext = { ...context, signal: controller.signal };
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  let abortListener: (() => void) | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    abortListener = () => {
      controller.abort();
      reject(new Error("Workflow execution was cancelled."));
    };
    if (signal?.aborted) abortListener();
    else signal?.addEventListener("abort", abortListener, { once: true });
  });

  try {
    return await Promise.race([
      Promise.resolve(handler(attemptContext)),
      cancelled,
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          controller.abort();
          reject(timeoutError(node));
        }, node.timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (signal && abortListener) signal.removeEventListener("abort", abortListener);
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
    const checkpoint = options.checkpoints?.find(item => item.nodeId === node.id && item.status === "succeeded");
    if (checkpoint) {
      outputs[node.id] = checkpoint.output;
      executions.push(checkpoint);
      continue;
    }
    if (options.signal?.aborted) {
      return {
        status: "failed",
        error: "Workflow execution was cancelled.",
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

    const handler = options.handlers[node.type];
    const dependencyOutputs = Object.fromEntries(
      plan.definition.edges
        .filter((edge) => edge.to === node.id)
        .map((edge) => [edge.from, outputs[edge.from]]),
    );
    const nodeStartedAt = clock();
    await options.onNodeStarted?.(node, nodeStartedAt);
    let lastError: Error | undefined;
    let attempts = 0;

    for (attempts = 1; attempts <= node.maxRetries + 1; attempts += 1) {
      try {
        if (!handler) {
          throw new Error(`No executor is registered for node type '${node.type}'.`);
        }
        const budgetRemaining = maxExecutionMs - (clock() - startedAt);
        if (budgetRemaining <= 0) throw executionBudgetError(maxExecutionMs);
        const output = await executeAttempt({ ...node, timeoutMs: Math.min(node.timeoutMs, budgetRemaining) }, {
          node,
          input,
          dependencyOutputs,
          outputs,
          signal: new AbortController().signal,
        }, handler, options.signal);
        outputs[node.id] = output;
        const execution: WorkflowNodeExecution = {
          nodeId: node.id,
          status: "succeeded",
          attempts,
          startedAt: nodeStartedAt,
          endedAt: clock(),
          output,
        };
        executions.push(execution);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = clock() - startedAt >= maxExecutionMs ? executionBudgetError(maxExecutionMs) : error instanceof Error ? error : new Error(String(error));
      }
    }

    if (lastError) {
      const execution: WorkflowNodeExecution = {
        nodeId: node.id,
        status: "failed",
        attempts: Math.min(attempts, node.maxRetries + 1),
        startedAt: nodeStartedAt,
        endedAt: clock(),
        error: lastError.message,
      };
      await options.onNodeFinished?.(execution);
      executions.push(execution);
      return {
        status: "failed",
        error: lastError.message,
        executions,
        elapsedMs: clock() - startedAt,
      };
    }

    await options.onNodeFinished?.(executions[executions.length - 1]);
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
