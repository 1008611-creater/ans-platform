import type { DbTransaction } from "@/lib/db";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  RESUME_WEBSITE_COST_POINTS, RESUME_WEBSITE_RECIPE_VERSION, RESUME_WEBSITE_TEMPLATE_VERSION, RESUME_WEBSITE_WORKFLOW_ID,
  resumeWebsiteEditSchema, resumeWebsiteInputSchema, resumeWebsiteRunSchema, resumeWebsiteSaveSchema, resumeWebsiteSnapshotSchema,
  type ResumeWebsiteSnapshot, type ResumeWebsiteState,
} from "@/contracts/resume-website";
import { buildResumeWebsitePrompt, parseResumeWebsiteCopy, renderResumeWebsite, resumeWebsiteMarkdown } from "@/domain/projects/resume-website";
import { createWorkflowRun, ensureOfficialWorkflow } from "@/server/workflows/service";
import { cancelWorkflowRun, executePersistedWorkflow } from "@/server/workflows/runner";
import type { WorkflowNodeExecutor } from "@/domain/workflows/executor";
import { refundQuota } from "@/server/quota/service";

export class ResumeWebsiteError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); this.name = "ResumeWebsiteError"; }
}
const recipeId = RESUME_WEBSITE_WORKFLOW_ID;
const runInputSchema = resumeWebsiteRunSchema.pick({ revision: true }).strip();

async function ownedProject(projectId: string, userId: string, editable = false) {
  const project = await db.project.findFirst({
    where: { id: projectId, ownerId: userId, owner: { deletedAt: null, flagged: false } },
    select: { id: true, title: true, status: true },
  });
  if (!project) throw new ResumeWebsiteError("NOT_FOUND", 404);
  if (editable && project.status !== "ACTIVE") throw new ResumeWebsiteError("ARCHIVED", 409);
  return project;
}

export async function getResumeWebsiteState(projectId: string, userId: string): Promise<ResumeWebsiteState> {
  const project = await ownedProject(projectId, userId);
  const [draft, artifact, runs] = await Promise.all([
    db.projectWorkflowInput.findUnique({ where: { projectId_workflowId: { projectId, workflowId: recipeId } } }),
    db.artifact.findUnique({ where: { projectId_workflowId: { projectId, workflowId: recipeId } }, include: { versions: { orderBy: { version: "desc" }, take: 20 } } }),
    db.workflowRun.findMany({ where: { projectId, userId, workflow: { officialId: recipeId } }, orderBy: { createdAt: "desc" }, take: 12, select: { id: true, status: true, costPoints: true, createdAt: true, finishedAt: true, idempotencyKey: true } }),
  ]);
  return {
    projectId, title: project.title, archived: project.status !== "ACTIVE", revision: draft?.revision ?? 0,
    input: draft ? resumeWebsiteInputSchema.parse(draft.content) : null,
    runs: runs.map(({ idempotencyKey, ...run }) => ({ ...run, requestKey: idempotencyKey?.split("/").at(-1) ?? null, createdAt: run.createdAt.toISOString(), finishedAt: run.finishedAt?.toISOString() ?? null })),
    versions: (artifact?.versions ?? []).flatMap((version) => {
      const snapshot = resumeWebsiteSnapshotSchema.safeParse(version.contentJson);
      return snapshot.success ? [{ id: version.id, version: version.version, createdAt: version.createdAt.toISOString(), snapshot: snapshot.data }] : [];
    }),
  };
}

export async function saveResumeWebsiteInput(projectId: string, userId: string, raw: unknown) {
  const { expectedRevision, input } = resumeWebsiteSaveSchema.parse(raw);
  await ownedProject(projectId, userId, true);
  try {
    await db.$transaction(async (tx) => {
      await lockEditableProject(tx, projectId, userId);
      if (expectedRevision === 0) {
        await tx.projectWorkflowInput.create({ data: { projectId, workflowId: recipeId, content: input as Prisma.InputJsonValue } });
      } else {
        const updated = await tx.projectWorkflowInput.updateMany({
          where: { projectId, workflowId: recipeId, revision: expectedRevision, project: { ownerId: userId, status: "ACTIVE" } },
          data: { content: input as Prisma.InputJsonValue, revision: { increment: 1 } },
        });
        if (updated.count !== 1) throw new ResumeWebsiteError("REVISION_CONFLICT", 409);
      }
      await tx.auditLog.create({ data: { actorId: userId, action: "PROJECT_WORKFLOW_INPUT_SAVED", resourceType: "project", resourceId: projectId, metadata: { recipeId, revision: expectedRevision + 1 } } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ResumeWebsiteError("REVISION_CONFLICT", 409);
    throw error;
  }
  return { revision: expectedRevision + 1, input };
}

export async function enqueueResumeWebsite(projectId: string, userId: string, raw: unknown) {
  const request = resumeWebsiteRunSchema.parse(raw);
  await ownedProject(projectId, userId, true);
  const slug = `ans-official-${recipeId}`;
  const scopedKey = `project/${projectId}/${slug}/${request.idempotencyKey}`;
  const previous = await db.workflowRun.findFirst({ where: { userId, projectId, idempotencyKey: scopedKey }, select: { id: true, status: true, costPoints: true, input: true } });
  if (previous) {
    const saved = runInputSchema.safeParse(previous.input);
    if (!saved.success || saved.data.revision !== request.revision) throw new ResumeWebsiteError("IDEMPOTENCY_CONFLICT", 409);
    return { id: previous.id, status: previous.status, costPoints: previous.costPoints };
  }
  if (process.env.ANS_PROJECT_WORKER_DISABLED === "true") throw new ResumeWebsiteError("WORKER_UNAVAILABLE", 503);
  const active = await db.workflowRun.findFirst({ where: { projectId, userId, status: { in: ["QUEUED", "RUNNING"] }, workflow: { officialId: recipeId } }, select: { id: true } });
  if (active) throw new ResumeWebsiteError("RUN_IN_PROGRESS", 409);
  const draft = await db.projectWorkflowInput.findUnique({ where: { projectId_workflowId: { projectId, workflowId: recipeId } } });
  if (!draft || draft.revision !== request.revision) throw new ResumeWebsiteError("REVISION_CONFLICT", 409);
  const input = resumeWebsiteInputSchema.parse(draft.content);
  await ensureOfficialWorkflow({
    officialId: recipeId, slug, title: "简历网站", summary: "个人资料 → AI 文案 → 完整网页与文件", estimatedCost: RESUME_WEBSITE_COST_POINTS, actorId: userId,
    definition: { version: 1, maxNodes: 2, nodes: [{ id: "copy", type: "model", label: "整理个人文案", config: { prompt: "{{input.prompt}}" }, timeoutMs: 90_000, maxRetries: 0 }, { id: "output", type: "output", label: "生成网站", config: {}, timeoutMs: 5_000, maxRetries: 0 }], edges: [{ id: "copy-output", from: "copy", to: "output", mapping: {} }] },
  });
  try {
    const run = await createWorkflowRun(slug, userId, {
      idempotencyKey: request.idempotencyKey,
      input: { recipeId, recipeVersion: RESUME_WEBSITE_RECIPE_VERSION, templateVersion: RESUME_WEBSITE_TEMPLATE_VERSION, revision: draft.revision, profile: input, prompt: buildResumeWebsitePrompt(input) },
    }, { projectId, beforeCreate: async (tx) => {
      await lockEditableProject(tx, projectId, userId);
      const current = await tx.projectWorkflowInput.findUnique({ where: { projectId_workflowId: { projectId, workflowId: recipeId } } });
      if (!current || current.revision !== request.revision) throw new ResumeWebsiteError("REVISION_CONFLICT", 409);
    } });
    const accepted = runInputSchema.safeParse(run.input);
    if (!accepted.success || accepted.data.revision !== request.revision) throw new ResumeWebsiteError("IDEMPOTENCY_CONFLICT", 409);
    return { id: run.id, status: run.status, costPoints: run.costPoints };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ResumeWebsiteError("RUN_IN_PROGRESS", 409);
    throw error;
  }
}

/** Only this adapter may execute the recipe; the generic run endpoint cannot omit its artifact callback. */
export async function executeResumeWebsiteRun(runId: string, userId: string, options: { handlers?: Partial<Record<string, WorkflowNodeExecutor>> } = {}) {
  const run = await db.workflowRun.findFirst({ where: { id: runId, userId, workflow: { officialId: recipeId } }, select: { id: true, projectId: true, input: true, status: true } });
  if (!run?.projectId || run.status !== "QUEUED") return null;
  const project = await db.project.findFirst({ where: { id: run.projectId, ownerId: userId, status: "ACTIVE", owner: { deletedAt: null, flagged: false } }, select: { id: true } });
  if (!project) return cancelWorkflowRun(run.id, userId);
  const raw = run.input as Record<string, unknown>;
  return executePersistedWorkflow(runId, userId, {
    ...(options.handlers ? { handlers: options.handlers } : {}),
    onSucceeded: async (tx, result) => {
      await lockEditableProject(tx, project.id, userId);
      if (raw.recipeVersion !== 1 || raw.templateVersion !== 1 || typeof raw.revision !== "number") throw new Error("Recipe snapshot version is not supported.");
      const input = resumeWebsiteInputSchema.parse(raw.profile);
      if (typeof result.output !== "string") throw new Error("No structured copy returned.");
      const copy = parseResumeWebsiteCopy(result.output, input);
      // Validate the deliverable before the success transaction commits.
      renderResumeWebsite(input, copy);
      const snapshot: ResumeWebsiteSnapshot = { recipeVersion: 1, templateVersion: 1, inputRevision: raw.revision, input, copy, editKind: "generated", sourceWorkflowRunId: runId };
      const artifact = await tx.artifact.upsert({
        where: { projectId_workflowId: { projectId: project.id, workflowId: recipeId } },
        create: { projectId: project.id, workflowId: recipeId, kind: "RESUME_WEBSITE", title: "简历网站", createdById: userId, currentVersion: 1 },
        update: { currentVersion: { increment: 1 } },
      });
      const version = await tx.artifactVersion.create({ data: {
        artifactId: artifact.id, version: artifact.currentVersion, contentJson: snapshot as Prisma.InputJsonValue, contentMarkdown: resumeWebsiteMarkdown(input, copy),
        factSnapshotHash: createHash("sha256").update(JSON.stringify(input)).digest("hex"), createdById: userId, workflowRunId: runId,
      } });
      await tx.auditLog.create({ data: { actorId: userId, action: "PROJECT_ARTIFACT_SAVED", resourceType: "artifact", resourceId: artifact.id, metadata: { projectId: project.id, recipeId, workflowRunId: runId, version: version.version } } });
    },
  });
}

export async function saveResumeWebsiteCopy(projectId: string, userId: string, raw: unknown) {
  const request = resumeWebsiteEditSchema.parse(raw);
  await ownedProject(projectId, userId, true);
  return db.$transaction(async (tx) => {
    await lockEditableProject(tx, projectId, userId);
    const base = await tx.artifactVersion.findFirst({ where: { id: request.baseVersionId, artifact: { projectId, workflowId: recipeId, project: { ownerId: userId } } } });
    if (!base) throw new ResumeWebsiteError("NOT_FOUND", 404);
    const source = resumeWebsiteSnapshotSchema.parse(base.contentJson);
    if (source.copy.projects.length !== request.copy.projects.length) throw new ResumeWebsiteError("INVALID_INPUT", 400);
    const snapshot = { ...source, copy: request.copy, editKind: "manual" as const };
    renderResumeWebsite(snapshot.input, snapshot.copy);
    const changed = await tx.artifact.updateMany({ where: { id: base.artifactId, currentVersion: request.expectedVersion, project: { ownerId: userId, status: "ACTIVE" } }, data: { currentVersion: { increment: 1 } } });
    if (changed.count !== 1) throw new ResumeWebsiteError("VERSION_CONFLICT", 409);
    const version = await tx.artifactVersion.create({ data: { artifactId: base.artifactId, version: request.expectedVersion + 1, contentJson: snapshot as Prisma.InputJsonValue, contentMarkdown: resumeWebsiteMarkdown(snapshot.input, snapshot.copy), factSnapshotHash: base.factSnapshotHash, createdById: userId, workflowRunId: null } });
    await tx.auditLog.create({ data: { actorId: userId, action: "PROJECT_ARTIFACT_EDITED", resourceType: "artifact", resourceId: base.artifactId, metadata: { projectId, baseVersionId: base.id, version: version.version, recipeId } } });
    return { id: version.id, version: version.version, createdAt: version.createdAt.toISOString(), snapshot };
  });
}

export async function downloadResumeWebsite(projectId: string, userId: string, versionId: string) {
  await ownedProject(projectId, userId);
  const version = await db.artifactVersion.findFirst({ where: { id: versionId, artifact: { projectId, workflowId: recipeId, project: { ownerId: userId } } }, select: { contentJson: true } });
  if (!version) throw new ResumeWebsiteError("NOT_FOUND", 404);
  const snapshot = resumeWebsiteSnapshotSchema.parse(version.contentJson);
  return { html: renderResumeWebsite(snapshot.input, snapshot.copy), filename: `resume-v${versionId.replace(/[^a-zA-Z0-9_-]/g, "")}.html` };
}

/** Interrupted work fails visibly and refunds exactly once; it never silently repeats a paid upstream call. */
export async function expireResumeWebsiteRun(runId: string, cutoff: Date) {
  return db.$transaction(async (tx) => {
    const run = await tx.workflowRun.findFirst({ where: { id: runId, status: "RUNNING", startedAt: { lt: cutoff }, workflow: { officialId: recipeId } }, select: { id: true, userId: true, startedAt: true, costPoints: true } });
    if (!run) return false;
    const changed = await tx.workflowRun.updateMany({ where: { id: run.id, status: "RUNNING", startedAt: run.startedAt }, data: { status: "FAILED", error: "EXECUTION_INTERRUPTED", finishedAt: new Date() } });
    if (changed.count !== 1) return false;
    await refundQuota(tx, { userId: run.userId, costPoints: run.costPoints, ref: { type: "workflow_run", id: run.id }, note: "Interrupted resume website run refund" });
    await tx.auditLog.create({ data: { actorId: run.userId, action: "WORKFLOW_RUN_FAILED", resourceType: "workflow_run", resourceId: run.id, metadata: { code: "EXECUTION_INTERRUPTED", costPoints: run.costPoints, recipeId } } });
    return true;
  });
}


async function lockEditableProject(tx: DbTransaction, projectId: string, userId: string) {
  await tx.$queryRaw`SELECT "id" FROM "projects" WHERE "id" = ${projectId} AND "ownerId" = ${userId} FOR UPDATE`;
  const project = await tx.project.findFirst({ where: { id: projectId, ownerId: userId, owner: { deletedAt: null, flagged: false } }, select: { status: true } });
  if (!project) throw new ResumeWebsiteError("NOT_FOUND", 404);
  if (project.status !== "ACTIVE") throw new ResumeWebsiteError("ARCHIVED", 409);
}

export async function cancelResumeWebsiteRun(projectId: string, userId: string, runId: string) {
  await ownedProject(projectId, userId);
  const run = await db.workflowRun.findFirst({ where: { id: runId, projectId, userId, workflow: { officialId: recipeId } }, select: { id: true } });
  if (!run) throw new ResumeWebsiteError("NOT_FOUND", 404);
  return cancelWorkflowRun(run.id, userId);
}
