import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { DEFAULT_RUN_MODEL, getRunModel, RUN_MODEL_OPTIONS, type RunModelKey } from "@/lib/run-models";
import { writeAuditLog } from "@/lib/audit";

// Backwards-compatible export for callers that historically imported the
// default model from this service module.
export { DEFAULT_RUN_MODEL } from "@/lib/run-models";

// P2 模板运行核心服务（文本模板 v1）
// - 模型白名单：生产文本网关（McGrox）实测可用的 GPT-5.6 / GPT-6 入口
// - 扣费规则：按模板 estimatedCost 扣算力点，失败自动退费（写 QuotaLedger 流水）
// - 幂等：客户端可传 Idempotency-Key，重复提交重放同一运行而不重复扣费
// - 审计：运行开始 / 成功 / 失败写 AuditLog，便于追溯与对账

export const RUN_MODEL_KEYS = RUN_MODEL_OPTIONS.map((model) => model.key) as readonly RunModelKey[];

export const RUN_TIMEOUT_MS = 60_000;
const MAX_OUTPUT = 60_000;
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

function runConfig() {
  return {
    baseUrl: process.env.RUN_BASE_URL?.trim() || "",
    apiKey: process.env.RUN_API_KEY?.trim() || "",
  };
}

export type RunOutcomeStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export type RunResult =
  | {
      ok: true;
      runId: string;
      status: RunOutcomeStatus;
      outputText?: string;
      costPoints: number;
      // 幂等重放：返回既有运行记录，本次不再扣费。
      idempotentReplay?: boolean;
    }
  | { ok: false; error: string; message: string; status?: number; runId?: string };

type CreatedRun =
  | { ok: true; runId: string }
  | { ok: false; error: string; message: string; status: number };

type RunRecord = {
  id: string;
  status: RunOutcomeStatus;
  outputText: string | null;
  error: string | null;
  costPoints: number;
  templateId: string;
};

const formField = z.object({
  key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,49}$/),
  label: z.string().trim().min(1).max(100),
  type: z.enum(["text", "textarea", "number", "select"]),
  required: z.boolean().optional(),
  options: z.array(z.string().min(1).max(200)).max(50).optional(),
  default: z.union([z.string().max(2000), z.number().finite()]).optional(),
  placeholder: z.string().max(200).optional(),
}).strict();

function parseInputs(
  formSchema: unknown,
  inputs: unknown
): { ok: true; values: Record<string, string | number> } | { ok: false; message: string } {
  const parsedSchema = z.array(formField).max(30).safeParse(formSchema);
  if (!parsedSchema.success) return { ok: false, message: "模板输入定义无效" };
  const fields = parsedSchema.data;
  if (typeof inputs !== "object" || inputs === null || Array.isArray(inputs)) {
    return { ok: false, message: "输入格式无效" };
  }
  const raw = inputs as Record<string, unknown>;
  const values: Record<string, string | number> = {};
  for (const field of fields) {
    const value = raw[field.key];
    if (value === undefined || value === null || value === "") {
      if (field.default !== undefined) {
        values[field.key] = field.default;
      } else if (field.required) {
        return { ok: false, message: `缺少必填字段：${field.label}` };
      }
      continue;
    }
    if (field.type === "number") {
      const n = Number(value);
      if (!Number.isFinite(n)) return { ok: false, message: `字段「${field.label}」必须是数字` };
      values[field.key] = n;
      continue;
    }
    const text = String(value).trim();
    if (text.length > 2000) return { ok: false, message: `字段「${field.label}」过长` };
    if (field.type === "select" && field.options && !field.options.includes(text)) {
      return { ok: false, message: `字段「${field.label}」选项无效` };
    }
    values[field.key] = text;
  }
  return { ok: true, values };
}

function fillPrompt(promptBody: string, values: Record<string, string | number>): string {
  return promptBody.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g, (_match, key: string) => {
    const v = values[key];
    return v === undefined ? _match : String(v);
  });
}

function parseStreamOutput(raw: string): string {
  let output = "";
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
      if (typeof delta === "string") output += delta;
    } catch {
      // Ignore keep-alive or malformed SSE frames; a valid frame later can
      // still provide the complete output.
    }
  }
  return output;
}

function normalizeIdempotencyKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_IDEMPOTENCY_KEY_LENGTH);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}

async function findRunByIdempotencyKey(userId: string, idempotencyKey: string): Promise<RunRecord | null> {
  return db.run.findFirst({
    where: { userId, idempotencyKey },
    select: {
      id: true,
      status: true,
      outputText: true,
      error: true,
      costPoints: true,
      templateId: true,
    },
  });
}

// 幂等重放：已成功返回结果，未完成返回当前状态，失败返回可解释的错误。
function replayRun(run: RunRecord): RunResult {
  if (run.status === "SUCCEEDED") {
    return {
      ok: true,
      runId: run.id,
      status: "SUCCEEDED",
      outputText: run.outputText ?? "",
      costPoints: run.costPoints,
      idempotentReplay: true,
    };
  }
  if (run.status === "QUEUED" || run.status === "RUNNING") {
    return {
      ok: true,
      runId: run.id,
      status: run.status,
      costPoints: run.costPoints,
      idempotentReplay: true,
    };
  }
  return {
    ok: false,
    error: "run_failed",
    message: run.error || "该请求此前运行失败，请调整输入后重试",
    runId: run.id,
  };
}

export async function runTemplate(args: {
  userId: string;
  templateId: string;
  inputs: unknown;
  modelKey?: string;
  idempotencyKey?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<RunResult> {
  const modelKey = args.modelKey && args.modelKey.trim() ? args.modelKey.trim() : DEFAULT_RUN_MODEL;
  const model = getRunModel(modelKey);
  if (!model) {
    return { ok: false, error: "model_unavailable", message: "该模型暂未开放，可选择白名单内的模型" };
  }

  const { baseUrl, apiKey } = runConfig();
  if (!baseUrl || !apiKey) {
    return { ok: false, error: "run_not_configured", message: "模型运行服务未配置，请稍后再试", status: 503 };
  }

  const template = await db.template.findFirst({
    where: { id: args.templateId, status: "PUBLISHED" },
  });
  if (!template) {
    return { ok: false, error: "template_unavailable", message: "模板不存在或未上架", status: 404 };
  }
  if (template.outputType !== "TEXT") {
    return { ok: false, error: "output_type_unsupported", message: "当前版本仅支持文字类模板运行", status: 400 };
  }

  const parsed = parseInputs(template.formSchema, args.inputs);
  if (!parsed.ok) {
    return { ok: false, error: "invalid_input", message: parsed.message, status: 400 };
  }

  const costPoints = Math.max(1, template.estimatedCost || 1);
  const idempotencyKey = normalizeIdempotencyKey(args.idempotencyKey);

  if (idempotencyKey) {
    const existing = await findRunByIdempotencyKey(args.userId, idempotencyKey);
    if (existing) return replayRun(existing);
  }

  let created: CreatedRun;
  try {
    created = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findUnique({
        where: { id: args.userId },
        select: { id: true, quotaPoints: true, flagged: true, deletedAt: true },
      });
      if (!user || user.deletedAt) {
        return { ok: false as const, error: "unauthorized", message: "账号不可用", status: 401 };
      }
      if (user.flagged) {
        return { ok: false as const, error: "flagged", message: "账号受限，暂时无法运行模板", status: 403 };
      }
      if (user.quotaPoints < costPoints) {
        return { ok: false as const, error: "insufficient_quota", message: `算力不足，运行需 ${costPoints} 点`, status: 402 };
      }

      const debited = await tx.user.updateMany({
        where: { id: args.userId, quotaPoints: { gte: costPoints }, flagged: false, deletedAt: null },
        data: { quotaPoints: { decrement: costPoints } },
      });
      if (debited.count !== 1) return { ok: false as const, error: "insufficient_quota", message: "算力余额不足或账号不可用", status: 402 };
      const balance = await tx.user.findUniqueOrThrow({ where: { id: args.userId }, select: { quotaPoints: true } });
      const balanceAfter = balance.quotaPoints;
      const run = await tx.run.create({
        data: {
          templateId: template.id,
          userId: args.userId,
          inputs: parsed.values as Prisma.InputJsonValue,
          status: "QUEUED",
          costPoints,
          idempotencyKey,
          startedAt: new Date(),
        },
      });
      await tx.quotaLedger.create({
        data: {
          userId: args.userId,
          amount: -costPoints,
          balanceAfter,
          reason: "RUN_COST",
          refType: "run",
          refId: run.id,
          note: `运行模板「${template.title}」（${model.key}）`,
        },
      });
      return { ok: true as const, runId: run.id };
    });
  } catch (error) {
    // 并发下同一 Idempotency-Key 可能同时通过前置检查，唯一约束兜底。
    if (idempotencyKey && isUniqueViolation(error)) {
      const existing = await findRunByIdempotencyKey(args.userId, idempotencyKey);
      if (existing) return replayRun(existing);
    }
    throw error;
  }

  if (!created.ok) return created;

  await writeAuditLog({
    actorId: args.userId,
    action: "RUN_STARTED",
    resourceType: "run",
    resourceId: created.runId,
    metadata: { templateId: template.id, templateSlug: template.slug, modelKey: model.key, costPoints },
    ipAddress: args.ipAddress ?? null,
    userAgent: args.userAgent ?? null,
  });

  const prompt = fillPrompt(template.promptBody, parsed.values);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
  let outputText: string | null = null;
  let error: string | null = null;
  try {
    const url = new URL(baseUrl);
    const path = url.pathname.replace(/\/+$/, "");
    url.pathname = `${path.endsWith("/v1") ? path : `${path}/v1`}/chat/completions`;
    const response = await fetch(url.toString(), {
      method: "POST",
      signal: controller.signal,
      redirect: "error",
      cache: "no-store",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model.upstream,
        stream: false,
        messages: [
          { role: "system", content: "你是一个可靠的 AI 助手，按模板要求完成任务，直接输出结果，不要解释过程。" },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok) {
      error = `模型服务返回 ${response.status}`;
      // 网关可能对非流式请求返回超时，而其流式回退是健康的。只对这几类网关
      // 错误重试，并把 SSE 帧解析成同样的纯文本结果。
      if ([502, 503, 504, 524].includes(response.status)) {
        const fallbackController = new AbortController();
        const fallbackTimeout = setTimeout(() => fallbackController.abort(), RUN_TIMEOUT_MS);
        try {
          const fallback = await fetch(url.toString(), {
            method: "POST",
            signal: fallbackController.signal,
            redirect: "error",
            cache: "no-store",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: model.upstream,
              stream: true,
              messages: [
                { role: "system", content: "你是一个可靠的 AI 助手，按模板要求完成任务，直接输出结果，不要解释过程。" },
                { role: "user", content: prompt },
              ],
            }),
          });
          if (fallback.ok) {
            const streamed = parseStreamOutput(await fallback.text());
            if (streamed) {
              outputText = streamed.length > MAX_OUTPUT ? streamed.slice(0, MAX_OUTPUT) : streamed;
              error = null;
            }
          }
        } catch {
          // Keep the original gateway error and refund below.
        } finally {
          clearTimeout(fallbackTimeout);
        }
      }
    } else {
      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.length === 0) {
        error = "模型返回内容为空";
      } else {
        outputText = content.length > MAX_OUTPUT ? content.slice(0, MAX_OUTPUT) : content;
      }
    }
  } catch {
    error = controller.signal.aborted ? "模型响应超时" : "模型调用失败";
  } finally {
    clearTimeout(timeout);
  }

  if (outputText === null) {
    const reason = error || "模型调用失败";
    const refunded = await refundRun(created.runId, args.userId, costPoints, template.title, reason);
    await writeAuditLog({
      actorId: args.userId,
      action: "RUN_FAILED",
      resourceType: "run",
      resourceId: created.runId,
      metadata: {
        templateId: template.id,
        templateSlug: template.slug,
        modelKey: model.key,
        costPoints,
        reason,
        refunded,
      },
      ipAddress: args.ipAddress ?? null,
      userAgent: args.userAgent ?? null,
    });
    return { ok: false, error: "run_failed", message: reason, runId: created.runId };
  }

  await db.run.update({
    where: { id: created.runId },
    data: { status: "SUCCEEDED", outputText, finishedAt: new Date() },
  });
  await db.template.update({
    where: { id: template.id },
    data: { useCount: { increment: 1 } },
  });
  await writeAuditLog({
    actorId: args.userId,
    action: "RUN_SUCCEEDED",
    resourceType: "run",
    resourceId: created.runId,
    metadata: {
      templateId: template.id,
      templateSlug: template.slug,
      modelKey: model.key,
      costPoints,
      outputLength: outputText.length,
    },
    ipAddress: args.ipAddress ?? null,
    userAgent: args.userAgent ?? null,
  });
  return { ok: true, runId: created.runId, status: "SUCCEEDED", outputText, costPoints };
}

// 失败退费：只有真正把运行从 QUEUED/RUNNING 转为 FAILED 的那一次才退费，
// 返回值表示本次调用是否完成了退费（用于审计与对账）。
async function refundRun(
  runId: string,
  userId: string,
  costPoints: number,
  templateTitle: string,
  reason: string
): Promise<boolean> {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const transitioned = await tx.run.updateMany({
      where: { id: runId, userId, status: { in: ["QUEUED", "RUNNING"] } },
      data: { status: "FAILED", error: reason, finishedAt: new Date() },
    });
    if (transitioned.count !== 1) return false;
    const user = await tx.user.update({ where: { id: userId }, data: { quotaPoints: { increment: costPoints } }, select: { quotaPoints: true } });
    const balanceAfter = user.quotaPoints;
    await tx.quotaLedger.create({
      data: {
        userId,
        amount: costPoints,
        balanceAfter,
        reason: "REFUND",
        refType: "run",
        refId: runId,
        note: `退费（${templateTitle}）：${reason}`,
      },
    });
    return true;
  });
}
