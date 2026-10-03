import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  workflowCreateInputSchema,
  workflowDefinitionSchema,
  workflowVersionInputSchema,
  workflowRunInputSchema,
} from "@/contracts/workflow";
import { validateWorkflow } from "@/domain/workflows/graph";
import { debitQuota, QuotaError } from "@/server/quota/service";
import { canPublishAfterReview, reviewWorkflowDefinition } from "@/server/workflows/review";
import { RUN_REASONING_EFFORTS, type RunReasoningEffort } from "@/lib/run-models";

/**
 * 工作流领域服务。
 *
 * 规则：
 * - 定义先过 Zod，再过 DAG 校验（无环、节点合法、上限内）。
 * - 版本一经创建不可修改，只能追加新版本。
 * - 发布、审核、运行都写审计日志。
 * - 发布前必须有 AI 初审结论：PASS 才放行，BLOCKED 打回作者，
 *   UNAVAILABLE 仅在本服务端从未配置初审时退回纯人工把关。
 * - 运行先扣算力，失败在运行器中退费。
 */

export class WorkflowServiceError extends Error {
  constructor(
    message: string,
    public readonly code = "WORKFLOW_ERROR",
    public readonly status = 400,
  ) {
    super(message);
    this.name = "WorkflowServiceError";
  }
}

/** Register an immutable, platform-owned workflow version on first use. */
export async function ensureOfficialWorkflow(input: {
  officialId: string;
  slug: string;
  title: string;
  summary: string;
  estimatedCost: number;
  definition: unknown;
  actorId: string;
}) {
  const definition = assertDefinition(input.definition);
  await requireActor(input.actorId);

  const existing = await db.workflow.findUnique({
    where: { officialId: input.officialId },
    select: {
      id: true,
      slug: true,
      isOfficial: true,
      status: true,
      publishedVersion: true,
      versions: { where: { version: 1 }, select: { id: true } },
    },
  });
  if (existing) {
    if (
      !existing.isOfficial ||
      existing.slug !== input.slug ||
      existing.status !== "PUBLISHED" ||
      existing.publishedVersion !== 1 ||
      existing.versions !== undefined && existing.versions.length !== 1
    ) {
      throw new WorkflowServiceError("\u5b98\u65b9\u5de5\u4f5c\u6d41\u6ce8\u518c\u72b6\u6001\u4e0d\u4e00\u81f4\uff0c\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u3002", "OFFICIAL_WORKFLOW_INVALID", 409);
    }
    return { id: existing.id, slug: existing.slug };
  }

  const slugOwner = await db.workflow.findUnique({
    where: { slug: input.slug },
    select: { officialId: true },
  });
  if (slugOwner && slugOwner.officialId !== input.officialId) {
    throw new WorkflowServiceError("\u5b98\u65b9\u5de5\u4f5c\u6d41\u6807\u8bc6\u5df2\u88ab\u5360\u7528\uff0c\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u3002", "OFFICIAL_WORKFLOW_SLUG_CONFLICT", 409);
  }

  const owner = await db.user.findFirst({
    where: { role: "ADMIN", deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!owner) {
    throw new WorkflowServiceError("\u5e73\u53f0\u5c1a\u672a\u914d\u7f6e\u7ba1\u7406\u5458\uff0c\u4e0d\u80fd\u6ce8\u518c\u5b98\u65b9\u5de5\u4f5c\u6d41\u3002", "OFFICIAL_WORKFLOW_OWNER_REQUIRED", 503);
  }

  const workflow = await db.workflow.upsert({
    where: { officialId: input.officialId },
    create: {
      officialId: input.officialId,
      isOfficial: true,
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      estimatedCost: input.estimatedCost,
      authorId: owner.id,
      status: "PUBLISHED",
      publishedVersion: 1,
      versions: {
        create: { version: 1, definition: definition as Prisma.InputJsonValue, createdById: owner.id },
      },
    },
    update: {},
    select: {
      id: true,
      slug: true,
      isOfficial: true,
      status: true,
      publishedVersion: true,
      versions: { where: { version: 1 }, select: { id: true } },
    },
  });
  if (
    !workflow.isOfficial ||
    workflow.slug !== input.slug ||
    workflow.status !== "PUBLISHED" ||
    workflow.publishedVersion !== 1 ||
    workflow.versions !== undefined && workflow.versions.length !== 1
  ) {
    throw new WorkflowServiceError("\u5b98\u65b9\u5de5\u4f5c\u6d41\u6ce8\u518c\u72b6\u6001\u4e0d\u4e00\u81f4\uff0c\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u3002", "OFFICIAL_WORKFLOW_INVALID", 409);
  }
  return { id: workflow.id, slug: workflow.slug };
}

const authorSelect = { id: true, nickname: true, username: true, avatar: true } as const;

function assertDefinition(definition: unknown) {
  const parsed = workflowDefinitionSchema.safeParse(definition);
  if (!parsed.success) {
    throw new WorkflowServiceError("工作流定义格式不正确。", "INVALID_DEFINITION");
  }
  const validation = validateWorkflow(parsed.data);
  if (!validation.ok) {
    throw new WorkflowServiceError(
      validation.issues.map((issue) => issue.message).join(" "),
      "INVALID_GRAPH",
    );
  }
  return parsed.data;
}

async function requireActor(actorId: string) {
  const actor = await db.user.findUnique({
    where: { id: actorId },
    select: { id: true, role: true, emailVerified: true, deletedAt: true, flagged: true },
  });
  if (!actor || actor.deletedAt) throw new WorkflowServiceError("账号不可用。", "UNAUTHORIZED", 401);
  if (actor.flagged) throw new WorkflowServiceError("账号受限，暂时无法创作。", "FORBIDDEN", 403);
  return actor;
}

export async function createWorkflow(authorId: string, rawInput: unknown) {
  const parsed = workflowCreateInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new WorkflowServiceError("工作流信息不完整或格式不正确。", "INVALID_INPUT");
  }
  const input = parsed.data;
  if (input.slug.startsWith("ans-official-")) {
    throw new WorkflowServiceError("该工作流标识由平台官方工作流保留。", "RESERVED_SLUG", 409);
  }
  const definition = assertDefinition(input.definition);
  await requireActor(authorId);

  try {
    return await db.$transaction(async (tx) => {
      const workflow = await tx.workflow.create({
        data: {
          slug: input.slug,
          title: input.title,
          summary: input.summary ?? null,
          description: input.description ?? null,
          authorId,
          estimatedCost: input.estimatedCost,
          versions: {
            create: {
              version: 1,
              definition: definition as Prisma.InputJsonValue,
              createdById: authorId,
            },
          },
        },
        include: { versions: { orderBy: { version: "desc" } } },
      });
      await tx.auditLog.create({
        data: {
          actorId: authorId,
          action: "WORKFLOW_CREATED",
          resourceType: "workflow",
          resourceId: workflow.id,
          after: { slug: workflow.slug, status: workflow.status, version: 1 },
        },
      });
      return workflow;
    });
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
      throw new WorkflowServiceError("该工作流标识已经存在。", "SLUG_EXISTS", 409);
    }
    throw error;
  }
}

/** 追加一个不可变版本；只有作者或管理员可以提交。 */
export async function createWorkflowVersion(slug: string, actorId: string, rawInput: unknown) {
  const parsed = workflowVersionInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new WorkflowServiceError("工作流定义格式不正确。", "INVALID_DEFINITION");
  }
  const definition = assertDefinition(parsed.data.definition);
  const workflow = await db.workflow.findUnique({
    where: { slug },
    select: {
      id: true,
      authorId: true,
      isOfficial: true,
      status: true,
      versions: { orderBy: { version: "desc" }, take: 1, select: { version: true } },
    },
  });
  if (!workflow) throw new WorkflowServiceError("工作流不存在。", "NOT_FOUND", 404);
  if (workflow.isOfficial) throw new WorkflowServiceError("官方工作流版本由平台管理，不能通过此接口修改。", "OFFICIAL_WORKFLOW_LOCKED", 403);
  const actor = await requireActor(actorId);
  if (workflow.authorId !== actorId && actor.role !== "ADMIN") {
    throw new WorkflowServiceError("没有编辑该工作流的权限。", "FORBIDDEN", 403);
  }
  const nextVersion = (workflow.versions[0]?.version ?? 0) + 1;

  return db.$transaction(async (tx) => {
    const version = await tx.workflowVersion.create({
      data: {
        workflowId: workflow.id,
        version: nextVersion,
        definition: definition as Prisma.InputJsonValue,
        createdById: actorId,
      },
    });
    const updated = await tx.workflow.update({
      where: { id: workflow.id },
      // 定义变了，旧的 AI 初审结论与人工复核理由都不再适用于新版本。
      data: {
        status: workflow.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
        reviewScore: Prisma.DbNull,
        reviewNote: null,
        reviewedAt: null,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "WORKFLOW_VERSION_CREATED",
        resourceType: "workflow",
        resourceId: workflow.id,
        after: { version: nextVersion, status: updated.status },
      },
    });
    return version;
  });
}

export async function listPublishedWorkflows(options: { query?: string; take?: number } = {}) {
  const query = options.query?.trim();
  return db.workflow.findMany({
    where: {
      status: "PUBLISHED",
      isOfficial: false,
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" as const } },
              { summary: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ useCount: "desc" }, { updatedAt: "desc" }],
    take: Math.min(Math.max(options.take ?? 24, 1), 60),
    include: {
      author: { select: authorSelect },
      versions: { orderBy: { version: "desc" }, take: 1, select: { version: true } },
    },
  });
}

export function listOwnWorkflows(authorId: string) {
  return db.workflow.findMany({
    where: { authorId, isOfficial: false },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { versions: { orderBy: { version: "desc" }, select: { version: true, createdAt: true } } },
  });
}

export function listWorkflowQueue() {
  return db.workflow.findMany({
    where: { status: "PENDING", isOfficial: false },
    orderBy: { updatedAt: "asc" },
    take: 100,
    include: {
      author: { select: { id: true, username: true, nickname: true } },
      versions: { orderBy: { version: "desc" }, take: 1 },
    },
  });
}

/** 公开详情：只有已发布且存在发布版本的工作流可见。 */
export async function getPublishedWorkflow(slug: string) {
  const workflow = await db.workflow.findFirst({
    where: { slug, status: "PUBLISHED", publishedVersion: { not: null }, isOfficial: false },
    include: {
      author: { select: authorSelect },
      versions: { orderBy: { version: "desc" } },
    },
  });
  if (!workflow) return null;
  const published = workflow.versions.find((version) => version.version === workflow.publishedVersion);
  return { ...workflow, publishedDefinition: published?.definition ?? null };
}

/** 作者视角详情：包含草稿与全部版本。 */
export async function getWorkflowForEditor(slug: string, actorId: string) {
  const workflow = await db.workflow.findUnique({
    where: { slug },
    include: {
      author: { select: authorSelect },
      versions: { orderBy: { version: "desc" } },
    },
  });
  if (!workflow) throw new WorkflowServiceError("工作流不存在。", "NOT_FOUND", 404);
  if (workflow.isOfficial) throw new WorkflowServiceError("官方工作流由平台管理。", "OFFICIAL_WORKFLOW_LOCKED", 403);
  const actor = await requireActor(actorId);
  if (workflow.authorId !== actorId && actor.role !== "ADMIN") {
    throw new WorkflowServiceError("没有查看该工作流的权限。", "FORBIDDEN", 403);
  }
  return workflow;
}

/**
 * 作者/管理员发布指定版本。
 *
 * 仍然要过 AI 初审这道门：否则「作者直接发布」会成为绕过审核的捷径，
 * 让审核队列形同虚设。需要重新初审时先走提交或管理员复查。
 */
export async function publishWorkflow(slug: string, actorId: string, version?: number) {
  const workflow = await db.workflow.findUnique({
    where: { slug },
    select: {
      id: true,
      authorId: true,
      isOfficial: true,
      status: true,
      reviewScore: true,
      versions: { orderBy: { version: "desc" } },
    },
  });
  if (!workflow) throw new WorkflowServiceError("工作流不存在。", "NOT_FOUND", 404);
  if (workflow.isOfficial) throw new WorkflowServiceError("官方工作流由平台管理。", "OFFICIAL_WORKFLOW_LOCKED", 403);
  const actor = await requireActor(actorId);
  if (workflow.authorId !== actorId && actor.role !== "ADMIN") {
    throw new WorkflowServiceError("没有发布该工作流的权限。", "FORBIDDEN", 403);
  }
  if (!canPublishAfterReview(workflow.reviewScore)) {
    throw new WorkflowServiceError(
      "AI 初审未通过或尚未完成，不能发布。",
      "REVIEW_REQUIRED",
      409,
    );
  }
  if (workflow.versions.length === 0) {
    throw new WorkflowServiceError("工作流还没有可发布的版本。", "NO_VERSION");
  }
  const target = version ?? workflow.versions[0].version;
  const targetVersion = workflow.versions.find((item) => item.version === target);
  if (!targetVersion) {
    throw new WorkflowServiceError("指定的版本不存在。", "NO_VERSION", 404);
  }
  // 发布前再次校验，防止旧版本携带已失效的定义。
  assertDefinition(targetVersion.definition);

  return db.$transaction(async (tx) => {
    const updated = await tx.workflow.update({
      where: { id: workflow.id },
      data: { status: "PUBLISHED", publishedVersion: targetVersion.version },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "WORKFLOW_PUBLISHED",
        resourceType: "workflow",
        resourceId: workflow.id,
        before: { status: workflow.status },
        after: { status: updated.status, publishedVersion: targetVersion.version },
      },
    });
    return updated;
  });
}

export async function submitWorkflowForReview(slug: string, actorId: string) {
  const workflow = await db.workflow.findUnique({
    where: { slug },
    select: {
      id: true,
      authorId: true,
      status: true,
      isOfficial: true,
      title: true,
      summary: true,
      description: true,
      versions: { orderBy: { version: "desc" }, take: 1 },
    },
  });
  if (!workflow) throw new WorkflowServiceError("\u5de5\u4f5c\u6d41\u4e0d\u5b58\u5728\u3002", "NOT_FOUND", 404);
  if (workflow.isOfficial) {
    throw new WorkflowServiceError("\u5b98\u65b9\u5de5\u4f5c\u6d41\u7531\u5e73\u53f0\u7ba1\u7406\u3002", "OFFICIAL_WORKFLOW_LOCKED", 403);
  }
  const actor = await requireActor(actorId);
  if (workflow.authorId !== actorId && actor.role !== "ADMIN") {
    throw new WorkflowServiceError("\u6ca1\u6709\u63d0\u4ea4\u8be5\u5de5\u4f5c\u6d41\u7684\u6743\u9650\u3002", "FORBIDDEN", 403);
  }
  if (workflow.status === "PENDING") return workflow;
  if (workflow.status !== "DRAFT" && workflow.status !== "REJECTED") {
    throw new WorkflowServiceError("\u5de5\u4f5c\u6d41\u5f53\u524d\u72b6\u6001\u65e0\u6cd5\u63d0\u4ea4\u5ba1\u6838\u3002", "INVALID_STATE", 409);
  }
  if (workflow.versions.length === 0) {
    throw new WorkflowServiceError("\u5de5\u4f5c\u6d41\u8fd8\u6ca1\u6709\u53ef\u63d0\u4ea4\u7684\u7248\u672c\u3002", "NO_VERSION");
  }
  const definition = assertDefinition(workflow.versions[0].definition);
  const submission = await db.$transaction(async (tx) => {
    const claimed = await tx.workflow.updateMany({
      where: { id: workflow.id, status: workflow.status },
      data: { status: "PENDING" },
    });
    if (claimed.count === 0) {
      const current = await tx.workflow.findUnique({ where: { id: workflow.id }, select: { status: true } });
      if (current?.status === "PENDING") {
        return { workflow: { ...workflow, status: "PENDING" as const }, alreadyPending: true };
      }
      throw new WorkflowServiceError("\u5de5\u4f5c\u6d41\u72b6\u6001\u5df2\u53d8\u66f4\uff0c\u8bf7\u5237\u65b0\u9875\u9762\u540e\u91cd\u8bd5\u3002", "INVALID_STATE", 409);
    }
    await tx.auditLog.create({
      data: {
        actorId,
        action: "WORKFLOW_SUBMITTED",
        resourceType: "workflow",
        resourceId: workflow.id,
        before: { status: workflow.status },
        after: { status: "PENDING" },
      },
    });
    return { workflow: { ...workflow, status: "PENDING" as const }, alreadyPending: false };
  });

  if (submission.alreadyPending) return submission.workflow;

  // Submission is durable before the AI review. A review timeout never rolls back PENDING.
  await runAndStoreReview(workflow.id, actorId, {
    title: submission.workflow.title,
    summary: submission.workflow.summary,
    description: submission.workflow.description,
    definition,
  });
  return submission.workflow;
}

/**
 * 跑一次 AI 初审并把结论写进 workflow.reviewScore。
 *
 * 只更新 reviewScore，不改状态：状态流转始终由人工复核决定。
 */
async function runAndStoreReview(
  workflowId: string,
  actorId: string,
  input: {
    title: string;
    summary: string | null;
    description: string | null;
    definition: Parameters<typeof reviewWorkflowDefinition>[0]["definition"];
  },
) {
  const review = await reviewWorkflowDefinition(input);
  await db.workflow.update({
    where: { id: workflowId },
    data: { reviewScore: review as unknown as Prisma.InputJsonValue },
  });
  await db.auditLog.create({
    data: {
      actorId,
      action: "WORKFLOW_AI_REVIEWED",
      resourceType: "workflow",
      resourceId: workflowId,
      after: {
        verdict: review.verdict,
        unavailableReason: review.unavailableReason ?? null,
        scores: review.scores ?? null,
        model: review.model ?? null,
      },
    },
  });
  return review;
}

/**
 * 管理员重新发起 AI 初审。
 *
 * 先清空旧结论，避免「上一次 PASS 的旧结果」被拿来发布新定义；
 * 状态必须仍为 PENDING，且不能由作者本人发起。
 */
export async function recheckWorkflowReview(slug: string, adminId: string) {
  const workflow = await db.workflow.findUnique({
    where: { slug },
    select: {
      id: true,
      authorId: true,
      status: true,
      isOfficial: true,
      title: true,
      summary: true,
      description: true,
      versions: { orderBy: { version: "desc" }, take: 1 },
    },
  });
  if (!workflow) throw new WorkflowServiceError("工作流不存在。", "NOT_FOUND", 404);
  if (workflow.isOfficial) {
    throw new WorkflowServiceError("\u5b98\u65b9\u5de5\u4f5c\u6d41\u7531\u5e73\u53f0\u7ba1\u7406\u3002", "OFFICIAL_WORKFLOW_LOCKED", 403);
  }
  if (workflow.authorId === adminId) {
    throw new WorkflowServiceError("作者不能审核自己的工作流。", "SELF_REVIEW_FORBIDDEN", 403);
  }
  if (workflow.status !== "PENDING") {
    throw new WorkflowServiceError("工作流不在待审状态，请刷新后重试。", "INVALID_STATE", 409);
  }
  const version = workflow.versions[0];
  if (!version) throw new WorkflowServiceError("工作流还没有版本。", "NO_VERSION");
  const definition = assertDefinition(version.definition);

  await db.workflow.update({ where: { id: workflow.id }, data: { reviewScore: Prisma.DbNull } });
  await db.auditLog.create({
    data: {
      actorId: adminId,
      action: "WORKFLOW_AI_RECHECK_REQUESTED",
      resourceType: "workflow",
      resourceId: workflow.id,
      after: { version: version.version },
    },
  });
  const review = await runAndStoreReview(workflow.id, adminId, {
    title: workflow.title,
    summary: workflow.summary,
    description: workflow.description,
    definition,
  });
  return { workflowId: workflow.id, review };
}

export async function reviewWorkflow(
  slug: string,
  adminId: string,
  input: { action: "publish" | "reject"; note: string },
) {
  if (!input?.note?.trim()) {
    throw new WorkflowServiceError("请填写复核理由。", "INVALID_INPUT");
  }
  const workflow = await db.workflow.findUnique({
    where: { slug },
    select: {
      id: true,
      authorId: true,
      status: true,
      isOfficial: true,
      reviewScore: true,
      versions: { orderBy: { version: "desc" }, take: 1 },
    },
  });
  if (!workflow) throw new WorkflowServiceError("工作流不存在。", "NOT_FOUND", 404);
  if (workflow.isOfficial) {
    throw new WorkflowServiceError("\u5b98\u65b9\u5de5\u4f5c\u6d41\u7531\u5e73\u53f0\u7ba1\u7406\u3002", "OFFICIAL_WORKFLOW_LOCKED", 403);
  }
  if (workflow.authorId === adminId) {
    throw new WorkflowServiceError("作者不能审核自己的工作流。", "SELF_REVIEW_FORBIDDEN", 403);
  }
  if (workflow.status !== "PENDING") {
    throw new WorkflowServiceError("工作流不在待审状态，请刷新后重试。", "INVALID_STATE", 409);
  }
  const version = workflow.versions[0];
  if (!version) throw new WorkflowServiceError("工作流还没有版本。", "NO_VERSION");
  assertDefinition(version.definition);
  const published = input.action === "publish";
  // 人工复核不能绕过 AI 初审：只有 PASS，或「本服务端从未配置初审」时才是纯人工把关。
  if (published && !canPublishAfterReview(workflow.reviewScore)) {
    throw new WorkflowServiceError(
      "AI 初审未通过或尚未完成，请先重新发起 AI 初审或驳回给作者修改。",
      "REVIEW_REQUIRED",
      409,
    );
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.workflow.update({
      where: { id: workflow.id },
      data: {
        status: published ? "PUBLISHED" : "REJECTED",
        ...(published ? { publishedVersion: version.version } : {}),
        reviewNote: input.note.trim(),
        reviewedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: published ? "WORKFLOW_APPROVED" : "WORKFLOW_REJECTED",
        resourceType: "workflow",
        resourceId: workflow.id,
        before: { status: workflow.status },
        after: { status: updated.status, note: input.note.trim() },
      },
    });
    return updated;
  });
}

/**
 * 创建一次运行：先扣算力，再落运行记录与节点记录。
 * 扣费与建单在同一事务内，避免出现“扣了钱没有记录”。
 */
export async function createWorkflowRun(
  slug: string,
  userId: string,
  rawInput: unknown,
  options: { projectId?: string } = {},
) {
  const parsed = workflowRunInputSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw new WorkflowServiceError("运行参数格式不正确。", "INVALID_INPUT");
  }
  const workflow = await db.workflow.findFirst({
    where: { slug, status: "PUBLISHED", publishedVersion: { not: null } },
    select: {
      id: true,
      title: true,
      estimatedCost: true,
      isOfficial: true,
      publishedVersion: true,
      versions: { orderBy: { version: "desc" } },
    },
  });
  if (!workflow || workflow.publishedVersion === null) {
    throw new WorkflowServiceError("工作流不存在或尚未发布。", "NOT_FOUND", 404);
  }
  if (workflow.isOfficial && !options.projectId) {
    throw new WorkflowServiceError("官方项目工作流必须从所属项目启动。", "PROJECT_LINK_REQUIRED", 403);
  }
  if (options.projectId && !workflow.isOfficial) {
    throw new WorkflowServiceError("项目只能运行平台注册的官方工作流。", "OFFICIAL_WORKFLOW_REQUIRED", 403);
  }
  if (options.projectId) {
    const project = await db.project.findFirst({
      where: { id: options.projectId, ownerId: userId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!project) throw new WorkflowServiceError("项目不存在、已归档或无权访问。", "NOT_FOUND", 404);
  }
  const idempotencyKey = parsed.data.idempotencyKey
    ? `${options.projectId ? `project/${options.projectId}` : "workflow"}/${slug}/${parsed.data.idempotencyKey}`
    : undefined;
  if (idempotencyKey) {
    const existing = await db.workflowRun.findFirst({
      where: { userId, idempotencyKey },
      include: { nodeRuns: { orderBy: { nodeId: "asc" } } },
    });
    if (existing) return existing;
  }
  const version = workflow.versions.find((item) => item.version === workflow.publishedVersion);
  if (!version) throw new WorkflowServiceError("发布版本缺失，请联系管理员。", "NO_VERSION", 409);
  const definition = assertDefinition(version.definition);
  const costPoints = Math.max(1, workflow.estimatedCost || 1);

  try {
    return await db.$transaction(async (tx) => {
      const run = await tx.workflowRun.create({
        data: {
          workflowId: workflow.id,
          versionId: version.id,
          userId,
          ...(options.projectId ? { projectId: options.projectId } : {}),
          ...(idempotencyKey ? { idempotencyKey } : {}),
          input: parsed.data.input as Prisma.InputJsonValue,
          status: "QUEUED",
          costPoints,
        },
      });
      await debitQuota(tx, {
        userId,
        costPoints,
        ref: { type: "workflow_run", id: run.id },
        note: `运行工作流「${workflow.title}」`,
      });
      await tx.workflowNodeRun.createMany({
        data: definition.nodes.map((node) => ({
          runId: run.id,
          nodeId: node.id,
          status: "QUEUED" as const,
          input: parsed.data.input as Prisma.InputJsonValue,
        })),
      });
      await tx.workflow.update({ where: { id: workflow.id }, data: { useCount: { increment: 1 } } });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "WORKFLOW_RUN_QUEUED",
          resourceType: "workflow_run",
          resourceId: run.id,
          metadata: { slug, version: version.version, costPoints },
        },
      });
      return tx.workflowRun.findUniqueOrThrow({
        where: { id: run.id },
        include: { nodeRuns: { orderBy: { nodeId: "asc" } } },
      });
    });
  } catch (error) {
    if (idempotencyKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await db.workflowRun.findFirst({
        where: { userId, idempotencyKey },
        include: { nodeRuns: { orderBy: { nodeId: "asc" } } },
      });
      if (existing) return existing;
    }
    if (error instanceof QuotaError) {
      throw new WorkflowServiceError(error.message, error.code, error.status);
    }
    throw error;
  }
}

export function getWorkflowRun(runId: string, userId: string) {
  return loadWorkflowRunWithAudit(
    db.workflowRun.findFirst({
      where: { id: runId, userId },
      include: {
        nodeRuns: { orderBy: { nodeId: "asc" } },
        workflow: { select: { slug: true, title: true } },
      },
    }),
  );
}

type WorkflowRunAudit = {
  action: string;
  models: string[];
  modelCalls: number;
  tokenUsage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
  reasoningEffort: RunReasoningEffort | null;
};

function parseWorkflowRunAudit(value: Prisma.JsonValue, action: string): WorkflowRunAudit | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const metadata = value as Record<string, unknown>;
  const models = Array.isArray(metadata.models)
    ? metadata.models.filter((model): model is string => typeof model === "string")
    : [];
  const modelCalls = typeof metadata.modelCalls === "number" && Number.isSafeInteger(metadata.modelCalls)
    ? metadata.modelCalls
    : 0;
  const rawTokenUsage = metadata.tokenUsage;
  const tokenUsage = rawTokenUsage && typeof rawTokenUsage === "object" && !Array.isArray(rawTokenUsage)
    ? rawTokenUsage as Record<string, unknown>
    : {};
  const readTokenCount = (key: string) =>
    typeof tokenUsage[key] === "number" && Number.isSafeInteger(tokenUsage[key]) ? tokenUsage[key] as number : null;
  const reasoningEffort = RUN_REASONING_EFFORTS.includes(metadata.reasoningEffort as RunReasoningEffort)
    ? metadata.reasoningEffort as RunReasoningEffort
    : null;
  if (models.length === 0 && modelCalls === 0 && rawTokenUsage === undefined && reasoningEffort === null) return null;
  return {
    action,
    models,
    modelCalls,
    tokenUsage: {
      inputTokens: readTokenCount("inputTokens"),
      outputTokens: readTokenCount("outputTokens"),
      totalTokens: readTokenCount("totalTokens"),
    },
    reasoningEffort,
  };
}

async function loadWorkflowRunWithAudit<T extends { id: string } | null>(runPromise: Promise<T>) {
  const run = await runPromise;
  if (!run) return null;
  const audit = await db.auditLog.findFirst({
    where: {
      resourceType: "workflow_run",
      resourceId: run.id,
      action: { in: ["WORKFLOW_RUN_SUCCEEDED", "WORKFLOW_RUN_FAILED", "WORKFLOW_RUN_CANCELLED"] },
    },
    orderBy: { createdAt: "desc" },
    select: { action: true, metadata: true },
  });
  return {
    ...run,
    audit: audit ? parseWorkflowRunAudit(audit.metadata, audit.action) : null,
  };
}

export async function listWorkflowRuns(userId: string, take = 50) {
  const runs = await db.workflowRun.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(take, 1), 100),
    include: { workflow: { select: { slug: true, title: true } } },
  });
  if (runs.length === 0) return runs.map((run) => ({ ...run, audit: null }));
  const audits = await db.auditLog.findMany({
    where: {
      resourceType: "workflow_run",
      resourceId: { in: runs.map((run) => run.id) },
      action: { in: ["WORKFLOW_RUN_SUCCEEDED", "WORKFLOW_RUN_FAILED", "WORKFLOW_RUN_CANCELLED"] },
    },
    orderBy: { createdAt: "desc" },
    select: { resourceId: true, action: true, metadata: true },
  });
  const auditByRun = new Map<string, WorkflowRunAudit>();
  for (const audit of audits) {
    if (!audit.resourceId || auditByRun.has(audit.resourceId)) continue;
    const parsed = parseWorkflowRunAudit(audit.metadata, audit.action);
    if (parsed) auditByRun.set(audit.resourceId, parsed);
  }
  return runs.map((run) => ({ ...run, audit: auditByRun.get(run.id) ?? null }));
}
