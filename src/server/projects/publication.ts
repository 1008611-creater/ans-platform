import { Prisma } from "@prisma/client";
import { hasAdminPermission } from "@/lib/admin-permission-values";
import { z } from "zod";
import { db } from "@/lib/db";
import { artifactReviewDecisionInputSchema, artifactReviewRequestSchema } from "@/contracts/project-review";
import { publicReviewBlockers, type SensitiveFinding } from "@/domain/projects/review";
import type { FactRecord } from "@/domain/projects/pack";
import { ProjectServiceError } from "@/server/projects/service";
import { safeAwardGrowthEvent } from "@/server/growth/service";

const CONFIRM_FROM_DB = { MISSING: "missing", UNCONFIRMED: "unconfirmed", CONFIRMED: "confirmed" } as const;

async function loadOwnedVersion(projectId: string, artifactVersionId: string, userId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      ownerId: userId,
    },
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
  if (!parsed.success) throw new ProjectServiceError("请选择要公开的作品版本并提交。", "INVALID_INPUT");
  const { project, version } = await loadOwnedVersion(projectId, parsed.data.artifactVersionId, userId);
  const blockers = publicReviewBlockers(factsOf(project), version.contentMarkdown);
  if (blockers.length > 0) throw new ProjectServiceError(blockers.join(""), "PUBLICATION_BLOCKED", 409);

  try {
    return await db.$transaction(async (tx) => {
      const current = await tx.artifactPublication.findUnique({ where: { artifactVersionId: version.id } });
      if (current?.status === "APPROVED") return { artifactVersionId: version.id, status: "public" as const };
      if (current?.status === "PENDING") return { artifactVersionId: version.id, status: "pending" as const };

      await tx.artifactPublication.upsert({
        where: { artifactVersionId: version.id },
        create: { artifactVersionId: version.id, requestedById: userId, status: "PENDING" },
        update: { requestedById: userId, status: "PENDING", requestedAt: new Date(), reviewedById: null, reviewedAt: null, reviewNote: null, withdrawnAt: null },
      });
      await tx.auditLog.create({
        data: { actorId: userId, action: "PROJECT_PUBLICATION_REQUESTED", resourceType: "artifact_version", resourceId: version.id, metadata: { projectId, status: "pending" } },
      });
      return { artifactVersionId: version.id, status: "pending" as const };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
      const current = await db.artifactPublication.findUnique({ where: { artifactVersionId: version.id }, select: { status: true } });
      if (current?.status === "APPROVED") return { artifactVersionId: version.id, status: "public" as const };
      if (current?.status === "PENDING") return { artifactVersionId: version.id, status: "pending" as const };
      throw new ProjectServiceError("公开申请状态刚刚发生变化，请刷新后重试。", "PUBLICATION_CONFLICT", 409);
    }
    throw error;
  }
}

export async function decideArtifactPublication(reviewerId: string, rawInput: unknown) {
  const reviewer = await db.user.findUnique({ where: { id: reviewerId }, select: { role: true, deletedAt: true, flagged: true, adminPermissions: true } });
  if (reviewer?.role !== "ADMIN" || reviewer.deletedAt || reviewer.flagged || !hasAdminPermission(reviewer.adminPermissions, "PROMPTS_MANAGE")) throw new ProjectServiceError("仅管理员可以审核公开申请。", "FORBIDDEN", 403);
  const parsed = artifactReviewDecisionInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new ProjectServiceError("审核决定或说明格式无效。", "INVALID_INPUT");
  const version = await db.artifactVersion.findUnique({
    where: { id: parsed.data.artifactVersionId },
    include: { artifact: { include: { project: true } } },
  });
  if (!version) throw new ProjectServiceError("作品版本不存在。", "NOT_FOUND", 404);
  if (version.artifact.project.ownerId === reviewerId) throw new ProjectServiceError("不能审核自己的作品。", "SELF_REVIEW", 403);
  const approved = parsed.data.decision === "approve";
  const result = await db.$transaction(async (tx) => {
    const updated = await tx.artifactPublication.updateMany({
      where: { artifactVersionId: version.id, status: "PENDING" },
      data: {
        status: approved ? "APPROVED" : "REJECTED",
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNote: parsed.data.note,
      },
    });
    if (updated.count !== 1) {
      throw new ProjectServiceError("申请已被处理或已撤回,请刷新。", "REVIEW_NOT_PENDING", 409);
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
    return { artifactVersionId: version.id, status: approved ? "public" as const : "rejected" as const, ownerId: version.artifact.project.ownerId };
  });
  if (approved) {
    // Award only after the moderation transaction commits. The growth event is
    // idempotent by (user, type, source), so retries cannot duplicate XP.
    await safeAwardGrowthEvent({
      userId: result.ownerId,
      type: "PUBLISH_TEMPLATE",
      reason: "PUBLISH_TEMPLATE",
      sourceType: "artifact_publication",
      sourceId: result.artifactVersionId,
    });
  }
  return { artifactVersionId: result.artifactVersionId, status: result.status };
}

export async function withdrawArtifactPublication(projectId: string, userId: string, artifactVersionId: string) {
  if (!artifactVersionId.trim()) throw new ProjectServiceError("请选择要撤回授权的作品版本。", "INVALID_INPUT");
  const version = await db.artifactVersion.findFirst({
    where: { id: artifactVersionId, artifact: { projectId } },
    select: {
      id: true,
      createdById: true,
      publication: { select: { requestedById: true } },
      artifact: {
        select: {
          project: {
            select: {
              ownerId: true,
            },
          },
        },
      },
    },
  });
  if (!version) throw new ProjectServiceError("作品版本不存在。", "NOT_FOUND", 404);
  const isAuthorized = version.artifact.project.ownerId === userId
    || version.createdById === userId
    || version.publication?.requestedById === userId;
  if (!isAuthorized) throw new ProjectServiceError("只有项目所有者、作品作者或原申请人可以撤回公开授权。", "FORBIDDEN", 403);

  return db.$transaction(async (tx) => {
    const changed = await tx.artifactPublication.updateMany({
      where: { artifactVersionId: version.id, status: { in: ["PENDING", "APPROVED"] } },
      data: { status: "WITHDRAWN", withdrawnAt: new Date() },
    });
    if (changed.count !== 1) throw new ProjectServiceError("该版本当前没有生效的公开授权。", "PUBLICATION_NOT_ACTIVE", 409);
    await tx.auditLog.create({
      data: { actorId: userId, action: "PROJECT_PUBLICATION_WITHDRAWN", resourceType: "artifact_version", resourceId: version.id, metadata: { projectId } },
    });
    return { artifactVersionId: version.id, status: "withdrawn" as const };
  });
}
export async function listProjectPublications(projectId: string, userId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      ownerId: userId,
    },
    select: { id: true },
  });
  if (!project) throw new ProjectServiceError("项目不存在或无权查看其公开申请。", "NOT_FOUND", 404);
  return db.artifactPublication.findMany({
    where: { artifactVersion: { artifact: { projectId } } },
    orderBy: { requestedAt: "desc" },
    select: { artifactVersionId: true, status: true, requestedAt: true, reviewedAt: true, reviewNote: true },
  });
}

export async function listPublishedArtifacts(take = 24, authorId?: string) {
  if (process.env.NODE_ENV !== "test") {
    const limit = Math.min(Math.max(take, 1), 60);
    const rows = await db.$queryRaw<Array<{
      id: string;
      version: number;
      title: string;
      kind: string;
      markdown: string;
      createdAt: Date;
      publishedAt: Date | null;
      projectId: string;
      projectTitle: string;
      projectGoal: string | null;
      teamName: string | null;
      teamSlug: string | null;
      authorId: string;
      authorUsername: string;
      authorNickname: string | null;
      authorAvatar: string | null;
      reactionsCount: number;
      commentsCount: number;
    }>>`
      SELECT
        v."id",
        v."version",
        a."title",
        a."kind"::text AS "kind",
        v."contentMarkdown" AS "markdown",
        v."createdAt",
        ap."reviewedAt" AS "publishedAt",
        p."id" AS "projectId",
        p."title" AS "projectTitle",
        p."goal" AS "projectGoal",
        t."name" AS "teamName",
        t."slug" AS "teamSlug",
        u."id" AS "authorId",
        u."username" AS "authorUsername",
        u."nickname" AS "authorNickname",
        u."avatar" AS "authorAvatar",
        (SELECT count(*)::int FROM "artifact_reactions" r WHERE r."artifactVersionId" = v."id") AS "reactionsCount",
        (SELECT count(*)::int FROM "artifact_comments" c WHERE c."artifactVersionId" = v."id") AS "commentsCount"
      FROM "artifact_publications" ap
      JOIN "artifact_versions" v ON v."id" = ap."artifactVersionId"
      JOIN "artifacts" a ON a."id" = v."artifactId"
      JOIN "projects" p ON p."id" = a."projectId"
      LEFT JOIN "teams" t ON t."id" = p."teamId"
      JOIN "users" u ON u."id" = v."createdById"
      WHERE ap."status" = 'APPROVED'
        ${authorId ? Prisma.sql`AND v."createdById" = ${authorId}` : Prisma.empty}
      ORDER BY ap."reviewedAt" DESC NULLS LAST, ap."requestedAt" DESC
      LIMIT ${limit}
    `;
    return rows.map((row) => ({
      id: row.id,
      version: row.version,
      title: row.title,
      kind: row.kind as Awaited<ReturnType<typeof db.artifact.findFirstOrThrow>>["kind"],
      markdown: row.markdown,
      createdAt: row.createdAt,
      publishedAt: row.publishedAt,
      project: {
        id: row.projectId,
        title: row.projectTitle,
        goal: row.projectGoal,
        team: row.teamName && row.teamSlug ? { name: row.teamName, slug: row.teamSlug } : null,
      },
      author: {
        id: row.authorId,
        username: row.authorUsername,
        nickname: row.authorNickname,
        avatar: row.authorAvatar,
      },
      counts: {
        reactions: Number(row.reactionsCount ?? 0),
        comments: Number(row.commentsCount ?? 0),
      },
    }));
  }
  const publications = await db.artifactPublication.findMany({
    where: { status: "APPROVED", ...(authorId ? { artifactVersion: { createdById: authorId } } : {}) },
    orderBy: [{ reviewedAt: "desc" }, { requestedAt: "desc" }],
    take: Math.min(Math.max(take, 1), 60),
    include: {
      artifactVersion: {
        include: {
          artifact: {
            include: {
              project: { select: { id: true, title: true, goal: true, team: { select: { name: true, slug: true } } }, },
              createdBy: { select: { id: true, username: true, nickname: true, avatar: true } },
            },
          },
          createdBy: { select: { id: true, username: true, nickname: true, avatar: true } },
          _count: { select: { reactions: true, comments: true } },
        },
      },
    },
  });
  return publications.map(({ artifactVersion: version, ...publication }) => ({
    id: version.id,
    version: version.version,
    title: version.artifact.title,
    kind: version.artifact.kind,
    markdown: version.contentMarkdown,
    createdAt: version.createdAt,
    publishedAt: publication.reviewedAt,
    project: version.artifact.project,
    author: version.createdBy,
    counts: version._count,
  }));
}

export async function getPublishedArtifact(artifactVersionId: string, viewerId?: string | null) {
  const publication = await db.artifactPublication.findFirst({
    where: { artifactVersionId, status: "APPROVED" },
    include: {
      artifactVersion: {
        include: {
          artifact: {
            include: {
              project: { select: { id: true, title: true, goal: true, team: { select: { name: true, slug: true } } } },
              createdBy: { select: { id: true, username: true, nickname: true, avatar: true } },
            },
          },
          createdBy: { select: { id: true, username: true, nickname: true, avatar: true } },
          reactions: { select: { userId: true } },
          comments: { where: { deletedAt: null }, orderBy: { createdAt: "asc" }, take: 100, include: { user: { select: { id: true, username: true, nickname: true, avatar: true, avatarFrameKey: true, chatBubbleKey: true } } } },
        },
      },
    },
  });
  if (!publication) throw new ProjectServiceError("作品未公开或授权已撤回。", "NOT_FOUND", 404);
  const version = publication.artifactVersion;
  const [favoriteCount, favorite] = await Promise.all([
    db.contentFavorite.count({ where: { targetType: "ARTIFACT_VERSION", targetId: version.id } }),
    viewerId ? db.contentFavorite.findFirst({ where: { userId: viewerId, targetType: "ARTIFACT_VERSION", targetId: version.id }, select: { id: true } }) : null,
  ]);
  return {
    id: version.id,
    version: version.version,
    title: version.artifact.title,
    kind: version.artifact.kind,
    markdown: version.contentMarkdown,
    createdAt: version.createdAt,
    publishedAt: publication.reviewedAt,
    project: version.artifact.project,
    author: version.createdBy,
    reactionCount: version.reactions.length,
    liked: Boolean(viewerId && version.reactions.some((item) => item.userId === viewerId)),
    favoriteCount,
    favorited: Boolean(favorite),
    comments: version.comments,
  };
}

export async function toggleArtifactReaction(userId: string, artifactVersionId: string) {
  return db.$transaction(async (tx) => {
    const publication = await tx.artifactPublication.findFirst({ where: { artifactVersionId, status: "APPROVED" }, select: { id: true } });
    if (!publication) throw new ProjectServiceError("作品未公开或授权已撤回。", "NOT_FOUND", 404);
    const existing = await tx.artifactReaction.findUnique({ where: { userId_artifactVersionId: { userId, artifactVersionId } } });
    if (existing) {
      await tx.artifactReaction.delete({ where: { userId_artifactVersionId: { userId, artifactVersionId } } });
      await tx.auditLog.create({ data: { actorId: userId, action: "ARTIFACT_UNLIKED", resourceType: "artifact_version", resourceId: artifactVersionId } });
      return { liked: false };
    }
    await tx.artifactReaction.create({ data: { userId, artifactVersionId } });
    await tx.auditLog.create({ data: { actorId: userId, action: "ARTIFACT_LIKED", resourceType: "artifact_version", resourceId: artifactVersionId } });
    return { liked: true };
  }).then(async (result) => {
    if (result.liked) await safeAwardGrowthEvent({ userId, type: "LIKE", reason: "COMMUNITY_REWARD", sourceType: "artifact_like", sourceId: artifactVersionId, xp: 1, dailyCap: 10, note: "\u70b9\u8d5e\u516c\u5f00\u4f5c\u54c1" });
    return result;
  });
}

export async function addArtifactComment(userId: string, artifactVersionId: string, rawInput: unknown) {
  const input = z.object({ content: z.string().trim().min(2).max(2000) }).safeParse(rawInput);
  if (!input.success) throw new ProjectServiceError("评论长度须为 2 到 2000 个字符。", "INVALID_INPUT");
  return db.$transaction(async (tx) => {
    const publication = await tx.artifactPublication.findFirst({ where: { artifactVersionId, status: "APPROVED" }, select: { id: true } });
    if (!publication) throw new ProjectServiceError("作品未公开或授权已撤回。", "NOT_FOUND", 404);
    const comment = await tx.artifactComment.create({ data: { userId, artifactVersionId, content: input.data.content }, include: { user: { select: { id: true, username: true, nickname: true, avatar: true, avatarFrameKey: true, chatBubbleKey: true } } } });
    await tx.auditLog.create({ data: { actorId: userId, action: "ARTIFACT_COMMENTED", resourceType: "artifact_comment", resourceId: comment.id, metadata: { artifactVersionId } } });
    return comment;
  }).then(async (comment) => {
    await safeAwardGrowthEvent({ userId, type: "COMMENT", reason: "COMMENT", sourceType: "artifact_comment", sourceId: comment.id });
    return comment;
  });
}

export async function reportArtifact(userId: string, artifactVersionId: string, rawInput: unknown) {
  const input = z.object({ reason: z.enum(["SPAM", "INAPPROPRIATE", "COPYRIGHT", "MISLEADING", "OTHER"]), details: z.string().trim().max(1000).optional() }).safeParse(rawInput);
  if (!input.success) throw new ProjectServiceError("举报原因或补充说明格式无效。", "INVALID_INPUT");
  const version = await db.artifactVersion.findUnique({ where: { id: artifactVersionId }, include: { artifact: { include: { project: { select: { ownerId: true } } } } } });
  if (!version || !(await db.artifactPublication.findFirst({ where: { artifactVersionId, status: "APPROVED" }, select: { id: true } }))) {
    throw new ProjectServiceError("作品未公开或授权已撤回。", "NOT_FOUND", 404);
  }
  if (version.artifact.project.ownerId === userId) throw new ProjectServiceError("不能举报自己的作品。", "SELF_REPORT", 403);
  const pending = await db.artifactReport.findFirst({ where: { reporterId: userId, artifactVersionId, status: "PENDING" }, select: { id: true } });
  if (pending) return { created: false, id: pending.id };
  try {
    const report = await db.$transaction(async (tx) => {
      const created = await tx.artifactReport.create({ data: { reporterId: userId, artifactVersionId, reason: input.data.reason, details: input.data.details || null } });
      await tx.auditLog.create({ data: { actorId: userId, action: "ARTIFACT_REPORTED", resourceType: "artifact_report", resourceId: created.id, metadata: { artifactVersionId, reason: input.data.reason } } });
      return created;
    });
    return { created: true, id: report.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await db.artifactReport.findFirst({ where: { reporterId: userId, artifactVersionId, status: "PENDING" }, select: { id: true } });
      if (duplicate) return { created: false, id: duplicate.id };
    }
    throw error;
  }
}
export type { SensitiveFinding };

export async function toggleArtifactFavorite(userId: string, artifactVersionId: string) {
  return db.$transaction(async (tx) => {
    const publication = await tx.artifactPublication.findFirst({ where: { artifactVersionId, status: "APPROVED" }, select: { id: true } });
    if (!publication) throw new ProjectServiceError("作品未公开或授权已撤回。", "NOT_FOUND", 404);
    const existing = await tx.contentFavorite.findFirst({ where: { userId, targetType: "ARTIFACT_VERSION", targetId: artifactVersionId }, select: { id: true } });
    if (existing) {
      await tx.contentFavorite.delete({ where: { id: existing.id } });
      await tx.auditLog.create({ data: { actorId: userId, action: "ARTIFACT_UNFAVORITED", resourceType: "artifact_version", resourceId: artifactVersionId } });
      return { favorited: false };
    }
    await tx.contentFavorite.create({ data: { userId, targetType: "ARTIFACT_VERSION", targetId: artifactVersionId } });
    await tx.auditLog.create({ data: { actorId: userId, action: "ARTIFACT_FAVORITED", resourceType: "artifact_version", resourceId: artifactVersionId } });
    return { favorited: true };
  });
}
