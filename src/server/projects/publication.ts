import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { artifactReviewDecisionInputSchema, artifactReviewRequestSchema } from "@/contracts/project-review";
import { publicReviewBlockers, type SensitiveFinding } from "@/domain/projects/review";
import type { FactRecord } from "@/domain/projects/pack";
import { ProjectServiceError } from "@/server/projects/service";

const CONFIRM_FROM_DB = { MISSING: "missing", UNCONFIRMED: "unconfirmed", CONFIRMED: "confirmed" } as const;

async function loadOwnedVersion(projectId: string, artifactVersionId: string, userId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, ownerId: userId },
    include: { facts: true, artifacts: { include: { versions: true } } },
  });
  if (!project) throw new ProjectServiceError("项目不存在或无权访问。", "NOT_FOUND", 404);
  const version = project.artifacts.flatMap((artifact) => artifact.versions).find((item) => item.id === artifactVersionId);
  if (!version) throw new ProjectServiceError("成果版本不存在。", "NOT_FOUND", 404);
  return { project, version };
}

function factsOf(project: { facts: Array<{ key: string; value: string; confirmation: keyof typeof CONFIRM_FROM_DB; evidenceUrl: string | null }> }): FactRecord[] {
  return project.facts.map((fact) => ({
    key: fact.key as FactRecord["key"],
    value: fact.value,
    confirmation: CONFIRM_FROM_DB[fact.confirmation],
    evidenceUrl: fact.evidenceUrl,
  }));
}

export async function requestArtifactPublication(projectId: string, userId: string, rawInput: unknown) {
  const parsed = artifactReviewRequestSchema.safeParse(rawInput);
  if (!parsed.success) throw new ProjectServiceError("请确认最终公开版本后再提交。", "INVALID_INPUT");
  const { project, version } = await loadOwnedVersion(projectId, parsed.data.artifactVersionId, userId);
  const blockers = publicReviewBlockers(factsOf(project), version.contentMarkdown);
  if (blockers.length > 0) throw new ProjectServiceError(blockers.join(""), "PUBLICATION_BLOCKED", 409);
  await db.auditLog.create({
    data: {
      actorId: userId,
      action: "PROJECT_PUBLICATION_REQUESTED",
      resourceType: "artifact_version",
      resourceId: version.id,
      metadata: { projectId, status: "pending" },
    },
  });
  return { artifactVersionId: version.id, status: "pending" as const };
}

export async function decideArtifactPublication(reviewerId: string, rawInput: unknown) {
  const reviewer = await db.user.findUnique({ where: { id: reviewerId }, select: { role: true } });
  if (reviewer?.role !== "ADMIN") throw new ProjectServiceError("只有管理员可以审核公开申请。", "FORBIDDEN", 403);
  const parsed = artifactReviewDecisionInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new ProjectServiceError("审核意见不完整。", "INVALID_INPUT");
  const version = await db.artifactVersion.findUnique({
    where: { id: parsed.data.artifactVersionId },
    include: { artifact: { include: { project: true } } },
  });
  if (!version) throw new ProjectServiceError("成果版本不存在。", "NOT_FOUND", 404);
  if (version.artifact.project.ownerId === reviewerId) throw new ProjectServiceError("不能审核自己的成果。", "SELF_REVIEW", 403);
  const approved = parsed.data.decision === "approve";
  await db.$transaction(async (tx) => {
    if (approved) {
      await tx.artifact.update({ where: { id: version.artifactId }, data: { visibility: "PUBLIC" } });
    }
    await tx.auditLog.create({
      data: {
        actorId: reviewerId,
        action: approved ? "PROJECT_PUBLICATION_APPROVED" : "PROJECT_PUBLICATION_REJECTED",
        resourceType: "artifact_version",
        resourceId: version.id,
        metadata: { note: parsed.data.note, projectId: version.artifact.projectId } as Prisma.InputJsonValue,
      },
    });
  });
  return { artifactVersionId: version.id, status: approved ? "public" as const : "rejected" as const };
}

export type { SensitiveFinding };
