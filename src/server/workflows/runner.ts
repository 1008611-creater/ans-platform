import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { workflowDefinitionSchema, type WorkflowDefinition } from "@/contracts/workflow";
import {
  executeWorkflow,
  type WorkflowNodeContext,
  type WorkflowNodeExecutor,
  type WorkflowExecutionResult,
} from "@/domain/workflows/executor";
import { callModelText, resolvePlatformModel, ModelClientError, type ModelTarget } from "@/server/integrations/model-client";
import {
  assertModelKeyAvailable,
  loadOwnedCredential,
  resolveCredentialForRun,
} from "@/server/credentials/service";
import { refundQuota } from "@/server/quota/service";

/**
 * 工作流运行器：把不可变版本定义翻译成一次可审计的执行。
 *
 * - 节点执行前把运行置为 RUNNING，执行结果逐节点回写。
 * - 失败（含超时、模型不可用）会终止并退费，且只退一次。
 * - 模型节点支持平台模型池与用户自带 Key 两条通道，明文 Key 不落日志。
 */

export const MAX_WORKFLOW_EXECUTION_MS = 120_000;

function valueText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function readPath(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object") return (current as Record<string, unknown>)[part];
    return undefined;
  }, source);
}

export function interpolate(template: string, context: WorkflowNodeContext): string {
  const values: Record<string, unknown> = {
    input: context.input,
    ...context.dependencyOutputs,
  };
  return template.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9_.-]*)\s*\}\}/g, (match, key: string) => {
    const value = readPath(values, key);
    return value === undefined ? match : valueText(value);
  });
}

/** 节点文本：优先 config.prompt / config.template，其次节点标签。 */
function nodeTemplate(node: WorkflowNodeContext["node"]): string {
  const candidate = node.config.prompt ?? node.config.template ?? node.label;
  return typeof candidate === "string" ? candidate : node.label;
}

export type WorkflowHandlerContext = {
  userId: string;
  runId: string;
  /**
   * 本次运行的默认模型来源。节点 config 里显式写了 modelKey / credentialId 时以节点为准，
   * 否则回退到这里，让「同一个工作流换模型再跑」不需要改定义。
   */
  modelKey?: string;
  credentialId?: string;
  /** 允许测试注入模型调用，生产路径使用平台客户端。 */
  callModel?: (args: { target: ModelTarget; prompt: string; timeoutMs?: number; signal?: AbortSignal }) => Promise<string>;
};

async function modelTargetFor(node: WorkflowNodeContext["node"], context: WorkflowHandlerContext): Promise<ModelTarget> {
  const modelKey =
    typeof node.config.modelKey === "string" ? node.config.modelKey : context.modelKey;
  const credentialId =
    typeof node.config.credentialId === "string" ? node.config.credentialId : context.credentialId;
  if (credentialId) {
    const credential = await resolveCredentialForRun(context.userId, credentialId);
    return {
      baseUrl: credential.baseUrl,
      apiKey: credential.apiKey,
      upstream: modelKey?.trim() || "gpt-5.6-terra",
      label: `${credential.label}（自带 Key ${credential.keyMasked}）`,
    };
  }
  return resolvePlatformModel(modelKey);
}

export function createWorkflowHandlers(context: WorkflowHandlerContext): Partial<Record<string, WorkflowNodeExecutor>> {
  const call = context.callModel ?? callModelText;

  return {
    prompt: ({ node, ...rest }) => interpolate(nodeTemplate(node), { node, ...rest }),
    template: ({ node, ...rest }) => interpolate(nodeTemplate(node), { node, ...rest }),
    condition: ({ node, dependencyOutputs }) => {
      const expected = node.config.equals;
      const actual = Object.values(dependencyOutputs)[0];
      return expected === undefined ? Boolean(actual) : actual === expected;
    },
    output: ({ node, dependencyOutputs, input }) => {
      const values = Object.values(dependencyOutputs);
      const fallback = node.config.fallback;
      if (values.length === 0) return fallback === undefined ? input : fallback;
      return values.at(-1);
    },
    model: async ({ node, ...rest }) => {
      const prompt = interpolate(nodeTemplate(node), { node, ...rest });
      if (!prompt.trim()) throw new Error(`模型节点「${node.label}」缺少输入内容。`);
      const target = await modelTargetFor(node, context);
      try {
        return await call({ target, prompt, timeoutMs: node.timeoutMs, signal: rest.signal });
      } catch (error) {
        if (error instanceof ModelClientError) throw new Error(`${error.message}（${target.label}）`);
        throw error;
      }
    },
  };
}

async function loadRunnableRun(runId: string, userId: string) {
  return db.workflowRun.findFirst({
    where: { id: runId, userId },
    include: { version: true, nodeRuns: true, workflow: { select: { title: true } } },
  });
}

function definitionOf(run: { version: { definition: Prisma.JsonValue } }): WorkflowDefinition {
  return workflowDefinitionSchema.parse(run.version.definition);
}

/**
 * 执行一次已落库的运行。
 * 返回 null 表示运行不存在、不属于该用户，或已经不在可执行状态。
 */
export async function executePersistedWorkflow(
  runId: string,
  userId: string,
  options: {
    handlers?: Partial<Record<string, WorkflowNodeExecutor>>;
    maxExecutionMs?: number;
    /** 本次运行的模型来源覆盖项；缺省时用平台模型池与节点默认值。 */
    modelKey?: string;
    credentialId?: string;
  } = {},
): Promise<WorkflowExecutionResult | null> {
  const run = await loadRunnableRun(runId, userId);
  if (!run) return null;

  // 自带 Key 必须先校验归属，避免用户拿到别人的凭证编号去跑自己的任务。
  if (options.credentialId) {
    await loadOwnedCredential(userId, options.credentialId);
  }
  const modelKey = assertModelKeyAvailable(options.modelKey);

  // 条件更新保证同一运行不会被两个请求同时执行。
  const claimed = await db.workflowRun.updateMany({
    where: { id: run.id, userId, status: "QUEUED" },
    data: { status: "RUNNING", startedAt: new Date() },
  });
  if (claimed.count !== 1) return null;

  let definition: WorkflowDefinition;
  try {
    definition = definitionOf(run);
  } catch (error) {
    return finalizeFailure(run, error instanceof Error ? error.message : "工作流定义已失效。");
  }

  const handlers =
    options.handlers ??
    createWorkflowHandlers({
      userId,
      runId: run.id,
      modelKey,
      credentialId: options.credentialId,
    });
  const result = await executeWorkflow(definition, run.input, {
    handlers,
    maxExecutionMs: options.maxExecutionMs ?? MAX_WORKFLOW_EXECUTION_MS,
  });

  await persistResult(run.id, userId, run.costPoints, run.workflow.title, result);
  return result;
}

async function finalizeFailure(
  run: { id: string; userId: string; costPoints: number; workflow: { title: string } },
  message: string,
): Promise<WorkflowExecutionResult> {
  const result: WorkflowExecutionResult = {
    status: "failed",
    error: message,
    executions: [],
    elapsedMs: 0,
  };
  await persistResult(run.id, run.userId, run.costPoints, run.workflow.title, result);
  return result;
}

async function persistResult(
  runId: string,
  userId: string,
  costPoints: number,
  workflowTitle: string,
  result: WorkflowExecutionResult,
) {
  const succeeded = result.status === "succeeded";
  await db.$transaction(async (tx) => {
    for (const execution of result.executions) {
      await tx.workflowNodeRun.updateMany({
        where: { runId, nodeId: execution.nodeId },
        data: {
          status: execution.status === "succeeded" ? "SUCCEEDED" : "FAILED",
          attempts: execution.attempts,
          output: (execution.output ?? undefined) as Prisma.InputJsonValue | undefined,
          error: execution.error ?? null,
          startedAt: new Date(execution.startedAt),
          finishedAt: new Date(execution.endedAt),
        },
      });
    }
    const transitioned = await tx.workflowRun.updateMany({
      where: { id: runId, userId, status: "RUNNING" },
      data: {
        status: succeeded ? "SUCCEEDED" : "FAILED",
        output: (result.output ?? undefined) as Prisma.InputJsonValue | undefined,
        error: result.error ?? null,
        finishedAt: new Date(),
      },
    });
    if (transitioned.count !== 1) return;

    if (!succeeded && costPoints > 0) {
      await refundQuota(tx, {
        userId,
        costPoints,
        ref: { type: "workflow_run", id: runId },
        note: `运行失败退费（${workflowTitle}）：${result.error ?? "未知错误"}`,
      });
    }
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: succeeded ? "WORKFLOW_RUN_SUCCEEDED" : "WORKFLOW_RUN_FAILED",
        resourceType: "workflow_run",
        resourceId: runId,
        metadata: { elapsedMs: result.elapsedMs, error: result.error ?? null, costPoints },
      },
    });
  });
}

/** 取消仍在排队的运行并退费。 */
export async function cancelWorkflowRun(runId: string, userId: string) {
  return db.$transaction(async (tx) => {
    const run = await tx.workflowRun.findFirst({
      where: { id: runId, userId },
      select: { id: true, status: true, costPoints: true, workflow: { select: { title: true } } },
    });
    if (!run) return null;
    const cancelled = await tx.workflowRun.updateMany({
      where: { id: runId, userId, status: { in: ["QUEUED", "RUNNING"] } },
      data: { status: "CANCELLED", finishedAt: new Date(), error: "用户取消" },
    });
    if (cancelled.count !== 1) return null;
    if (run.costPoints > 0) {
      await refundQuota(tx, {
        userId,
        costPoints: run.costPoints,
        ref: { type: "workflow_run", id: runId },
        note: `取消运行退费（${run.workflow.title}）`,
      });
    }
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "WORKFLOW_RUN_CANCELLED",
        resourceType: "workflow_run",
        resourceId: runId,
        before: { status: run.status },
        after: { status: "CANCELLED" },
      },
    });
    return { id: runId, status: "CANCELLED" as const };
  });
}
