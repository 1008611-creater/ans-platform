import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  projectCreateSchema,
  projectFactsInputSchema,
  projectPackRunInputSchema,
  projectPackWorkflowIds,
  projectRunInputSchema,
  projectUpdateSchema,
  type FactKey,
  type OfficialWorkflowId,
} from "@/contracts/projects";
import {
  FACT_FIELDS,
  buildArtifactGenerationPrompt,
  generatedArtifactFromMarkdown,
  generateOfficialArtifact,
  normalizeFactValue,
  officialWorkflowDefinition,
  officialWorkflowSlug,
  renderProjectExport,
  snapshotText,
  workflowById,
  type FactRecord,
} from "@/domain/projects/pack";
import { executePersistedWorkflow } from "@/server/workflows/runner";
import { createWorkflowRun, ensureOfficialWorkflow } from "@/server/workflows/service";

export class ProjectServiceError extends Error {
  constructor(
    message: string,
    public readonly code = "PROJECT_ERROR",
    public readonly status = 400,
  ) {
    super(message);
    this.name = "ProjectServiceError";
  }
}

const GOAL_TO_DB = { career: "CAREER", contest: "CONTEST", portfolio: "PORTFOLIO" } as const;
const GOAL_FROM_DB = { CAREER: "career", CONTEST: "contest", PORTFOLIO: "portfolio" } as const;
const STATUS_TO_DB = { active: "ACTIVE", archived: "ARCHIVED" } as const;
const VISIBILITY_TO_DB = { private: "PRIVATE", team: "TEAM", public: "PUBLIC" } as const;
const VISIBILITY_FROM_DB = { PRIVATE: "private", TEAM: "team", PUBLIC: "public" } as const;
const CONFIRM_TO_DB = { missing: "MISSING", unconfirmed: "UNCONFIRMED", confirmed: "CONFIRMED" } as const;
const CONFIRM_FROM_DB = { MISSING: "missing", UNCONFIRMED: "unconfirmed", CONFIRMED: "confirmed" } as const;
const KIND_BY_WORKFLOW = {
  "project-facts": "PROJECT_FACTS",
  "resume-bullets": "RESUME_BULLETS",
  "readme-draft": "README_DRAFT",
  "project-one-pager": "PROJECT_ONE_PAGER",
  "contest-mvp": "CONTEST_MVP",
  "pitch-outline": "PITCH_OUTLINE",
  "defense-qa": "DEFENSE_QA",
  "project-retrospective": "PROJECT_RETROSPECTIVE",
} as const;

type ProjectWithRelations = Prisma.ProjectGetPayload<{ include: { facts: true; artifacts: { include: { versions: true } } } }>;

function present(project: ProjectWithRelations) {
  return {
    id: project.id,
    title: project.title,
    goal: GOAL_FROM_DB[project.goal],
    status: project.status === "ARCHIVED" ? "archived" : "active",
    visibility: VISIBILITY_FROM_DB[project.visibility],
    updatedAt: project.updatedAt.toISOString(),
    facts: FACT_FIELDS.map((field) => {
      const fact = project.facts.find((item) => item.key === field.key);
      return {
        key: field.key,
        label: field.label,
        hint: field.hint,
        value: fact?.value ?? "",
        evidenceUrl: fact?.evidenceUrl ?? "",
        confirmation: fact ? CONFIRM_FROM_DB[fact.confirmation] : "missing",
      };
    }),
    artifacts: project.artifacts
      .map((artifact) => ({
        id: artifact.id,
        workflowId: artifact.workflowId,
        title: artifact.title,
        currentVersion: artifact.currentVersion,
        versions: artifact.versions
          .sort((a, b) => b.version - a.version)
          .map((version) => ({
            id: version.id,
            version: version.version,
            markdown: version.contentMarkdown,
            createdAt: version.createdAt.toISOString(),
          })),
      }))
      .sort((a, b) => a.workflowId.localeCompare(b.workflowId)),
  };
}

async function loadOwned(projectId: string, userId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, ownerId: userId },
    include: { facts: true, artifacts: { include: { versions: true } } },
  });
  if (!project) throw new ProjectServiceError("项目不存在或无权访问。", "NOT_FOUND", 404);
  return project;
}

export async function listProjects(userId: string) {
  const projects = await db.project.findMany({
    where: { ownerId: userId, status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
    include: { facts: true, artifacts: { include: { versions: true } } },
  });
  return projects.map(present);
}

export async function createProject(userId: string, rawInput: unknown) {
  const parsed = projectCreateSchema.safeParse(rawInput);
  if (!parsed.success) throw new ProjectServiceError("项目信息不完整。", "INVALID_INPUT");
  const project = await db.project.create({
    data: {
      ownerId: userId,
      title: parsed.data.title,
      goal: GOAL_TO_DB[parsed.data.goal],
      visibility: "PRIVATE",
    },
    include: { facts: true, artifacts: { include: { versions: true } } },
  });
  await db.auditLog.create({
    data: { actorId: userId, action: "PROJECT_CREATED", resourceType: "project", resourceId: project.id, after: { goal: parsed.data.goal } },
  });
  return present(project);
}

export async function getProject(projectId: string, userId: string) {
  return present(await loadOwned(projectId, userId));
}

export async function updateProject(projectId: string, userId: string, rawInput: unknown) {
  const parsed = projectUpdateSchema.safeParse(rawInput);
  if (!parsed.success) throw new ProjectServiceError("项目修改内容不正确。", "INVALID_INPUT");
  await loadOwned(projectId, userId);
  if (parsed.data.visibility && parsed.data.visibility !== "private") {
    throw new ProjectServiceError("项目成果默认私密，当前不能改为公开或团队可见。", "PRIVATE_ONLY", 403);
  }
  const project = await db.project.update({
    where: { id: projectId },
    data: {
      ...(parsed.data.title ? { title: parsed.data.title } : {}),
      ...(parsed.data.status ? { status: STATUS_TO_DB[parsed.data.status] } : {}),
      ...(parsed.data.visibility ? { visibility: VISIBILITY_TO_DB[parsed.data.visibility] } : {}),
    },
    include: { facts: true, artifacts: { include: { versions: true } } },
  });
  return present(project);
}

export async function saveProjectFacts(projectId: string, userId: string, rawInput: unknown) {
  const parsed = projectFactsInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new ProjectServiceError("事实内容格式不正确。", "INVALID_INPUT");
  await loadOwned(projectId, userId);
  await db.$transaction(async (tx) => {
    for (const fact of parsed.data.facts) {
      const normalized = normalizeFactValue(fact.value);
      const confirmation = normalized.value && fact.confirmation === "confirmed" && normalized.confirmation !== "missing"
        ? "CONFIRMED"
        : normalized.value
          ? CONFIRM_TO_DB[normalized.confirmation]
          : "MISSING";
      await tx.projectFact.upsert({
        where: { projectId_key: { projectId, key: fact.key } },
        create: {
          projectId,
          key: fact.key,
          value: normalized.value,
          confirmation,
          evidenceUrl: fact.evidenceUrl || null,
          updatedById: userId,
        },
        update: {
          value: normalized.value,
          confirmation,
          evidenceUrl: fact.evidenceUrl || null,
          updatedById: userId,
        },
      });
    }
  });
  return getProject(projectId, userId);
}

const PROJECT_WORKFLOW_COST_POINTS = 2;

async function savedProjectRunResult(
  runId: string,
  projectId: string,
  userId: string,
  workflowId: keyof typeof KIND_BY_WORKFLOW,
  projectTitle: string,
) {
  const version = await db.artifactVersion.findFirst({
    where: { workflowRunId: runId },
    select: { id: true, version: true, contentMarkdown: true },
  });
  if (!version) throw new ProjectServiceError("运行已完成，但没有找到关联成果。", "ARTIFACT_MISSING", 500);
  const spec = workflowById(workflowId)!;
  return {
    workflowRunId: runId,
    artifactVersionId: version.id,
    version: version.version,
    workflowId,
    title: `${spec.title}：${projectTitle}`,
    markdown: version.contentMarkdown,
    project: await getProject(projectId, userId),
  };
}

function projectFacts(project: ProjectWithRelations): FactRecord[] {
  return FACT_FIELDS.map((field) => {
    const stored = project.facts.find((item) => item.key === field.key);
    return {
      key: field.key,
      value: stored?.value ?? "",
      confirmation: stored ? CONFIRM_FROM_DB[stored.confirmation] : "missing",
      evidenceUrl: stored?.evidenceUrl,
    };
  });
}

function assertWorkflowFacts(workflowId: OfficialWorkflowId, projectTitle: string, facts: FactRecord[]) {
  try {
    generateOfficialArtifact(workflowId, projectTitle, facts);
  } catch (error) {
    throw new ProjectServiceError(error instanceof Error ? error.message : "事实不足，不能生成。", "FACTS_INCOMPLETE");
  }
}

async function runProjectWorkflowForProject(
  project: ProjectWithRelations,
  projectId: string,
  userId: string,
  input: { workflowId: OfficialWorkflowId; idempotencyKey?: string },
) {
  if (project.status === "ARCHIVED") throw new ProjectServiceError("已归档项目不能继续生成。", "ARCHIVED", 409);
  const facts = projectFacts(project);
  assertWorkflowFacts(input.workflowId, project.title, facts);

  const spec = workflowById(input.workflowId)!;
  const registration = await ensureOfficialWorkflow({
    officialId: input.workflowId,
    slug: officialWorkflowSlug(input.workflowId),
    title: spec.title,
    summary: spec.summary,
    estimatedCost: PROJECT_WORKFLOW_COST_POINTS,
    definition: officialWorkflowDefinition(input.workflowId),
    actorId: userId,
  });
  const run = await createWorkflowRun(registration.slug, userId, {
    input: {
      projectTitle: project.title,
      facts,
      prompt: buildArtifactGenerationPrompt(input.workflowId, project.title, facts),
    },
    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
  }, { projectId });

  if (run.status === "SUCCEEDED") {
    return savedProjectRunResult(run.id, projectId, userId, input.workflowId, project.title);
  }
  if (run.status !== "QUEUED") {
    throw new ProjectServiceError(
      run.status === "FAILED" ? run.error ?? "工作流运行失败。" : "该请求已在处理中，请稍后刷新项目。",
      run.status === "FAILED" ? "WORKFLOW_FAILED" : "RUN_IN_PROGRESS",
      409,
    );
  }

  const hash = createHash("sha256").update(snapshotText(facts)).digest("hex");
  const execution = await executePersistedWorkflow(run.id, userId, {
    onSucceeded: async (tx, result) => {
      if (typeof result.output !== "string") throw new Error("工作流没有返回可用成果文本。");
      const generated = generatedArtifactFromMarkdown(input.workflowId, project.title, facts, result.output);
      const artifact = await tx.artifact.upsert({
        where: { projectId_workflowId: { projectId, workflowId: input.workflowId } },
        create: {
          projectId,
          workflowId: input.workflowId,
          kind: KIND_BY_WORKFLOW[input.workflowId],
          title: spec.title,
          createdById: userId,
          currentVersion: 1,
        },
        update: { currentVersion: { increment: 1 } },
      });
      const version = await tx.artifactVersion.create({
        data: {
          artifactId: artifact.id,
          version: artifact.currentVersion,
          contentJson: generated.json as Prisma.InputJsonValue,
          contentMarkdown: generated.markdown,
          factSnapshotHash: hash,
          createdById: userId,
          workflowRunId: run.id,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "PROJECT_ARTIFACT_SAVED",
          resourceType: "artifact",
          resourceId: artifact.id,
          metadata: { projectId, workflowId: input.workflowId, workflowRunId: run.id, version: version.version },
        },
      });
    },
  });

  if (!execution) {
    const current = await db.workflowRun.findFirst({ where: { id: run.id, userId }, select: { status: true, error: true } });
    if (current?.status === "SUCCEEDED") {
      return savedProjectRunResult(run.id, projectId, userId, input.workflowId, project.title);
    }
    if (current?.status === "FAILED") {
      throw new ProjectServiceError("工作流运行失败，额度已退回。", "WORKFLOW_FAILED", 502);
    }
    if (current?.status === "CANCELLED") {
      throw new ProjectServiceError("工作流已取消，额度已退回。", "RUN_CANCELLED", 409);
    }
    throw new ProjectServiceError("该请求已在处理中，请稍后刷新项目。", "RUN_IN_PROGRESS", 409);
  }
  if (execution.status !== "succeeded") {
    throw new ProjectServiceError(execution.error ?? "工作流运行失败，额度已退回。", "WORKFLOW_FAILED", 502);
  }
  return savedProjectRunResult(run.id, projectId, userId, input.workflowId, project.title);
}

export async function runProjectWorkflow(projectId: string, userId: string, rawInput: unknown) {
  const parsed = projectRunInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new ProjectServiceError("请选择一条官方工作流。", "INVALID_INPUT");
  const project = await loadOwned(projectId, userId);
  return runProjectWorkflowForProject(project, projectId, userId, parsed.data);
}

export async function runProjectPack(projectId: string, userId: string, rawInput: unknown) {
  const parsed = projectPackRunInputSchema.safeParse(rawInput ?? {});
  if (!parsed.success) throw new ProjectServiceError("项目包运行参数不正确。", "INVALID_INPUT");
  const project = await loadOwned(projectId, userId);
  if (project.status === "ARCHIVED") throw new ProjectServiceError("已归档项目不能继续生成。", "ARCHIVED", 409);
  const facts = projectFacts(project);
  for (const workflowId of projectPackWorkflowIds) assertWorkflowFacts(workflowId, project.title, facts);

  const results = await Promise.allSettled(projectPackWorkflowIds.map((workflowId) =>
    runProjectWorkflowForProject(project, projectId, userId, {
      workflowId,
      ...(parsed.data.idempotencyKey ? { idempotencyKey: parsed.data.idempotencyKey } : {}),
    }),
  ));
  const artifacts: Array<Awaited<ReturnType<typeof runProjectWorkflowForProject>>> = [];
  const failures: Array<{ workflowId: OfficialWorkflowId; code: string; error: string }> = [];
  results.forEach((result, index) => {
    const workflowId = projectPackWorkflowIds[index];
    if (result.status === "fulfilled") {
      artifacts.push(result.value);
      return;
    }
    const error = result.reason;
    failures.push({
      workflowId,
      code: error instanceof ProjectServiceError ? error.code : "WORKFLOW_FAILED",
      error: error instanceof Error ? error.message : "成果生成失败。",
    });
  });

  return {
    projectId,
    status: failures.length === 0 ? "succeeded" as const : artifacts.length > 0 ? "partial" as const : "failed" as const,
    estimatedCostPoints: PROJECT_WORKFLOW_COST_POINTS * projectPackWorkflowIds.length,
    artifacts,
    failures,
  };
}

export async function exportProject(projectId: string, userId: string) {
  const project = await loadOwned(projectId, userId);
  const artifacts = project.artifacts.flatMap((artifact) => {
    const latest = [...artifact.versions].sort((a, b) => b.version - a.version)[0];
    return latest
      ? [{ workflowId: artifact.workflowId, title: artifact.title, markdown: latest.contentMarkdown, version: latest.version }]
      : [];
  });
  if (artifacts.length === 0) throw new ProjectServiceError("\u8fd8\u6ca1\u6709\u53ef\u5bfc\u51fa\u7684\u6210\u679c\u3002", "NOTHING_TO_EXPORT", 409);
  return {
    filename: `${project.title.replace(/[^\w\u4e00-\u9fa5-]+/g, "-").replace(/^-|-$/g, "") || "project"}.md`,
    markdown: renderProjectExport({ title: project.title, goal: GOAL_FROM_DB[project.goal] }, artifacts),
    artifacts,
  };
}

export const FACT_KEYS: FactKey[] = FACT_FIELDS.map((field) => field.key);
