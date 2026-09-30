import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  competitionCreateSchema,
  competitionUpdateSchema,
  competitionRegisterSchema,
  competitionReviewSchema,
  competitionSubmissionSchema,
} from "@/contracts/competitions";
import { publicReviewBlockers } from "@/domain/projects/review";
import type { FactRecord } from "@/domain/projects/pack";
import { db } from "@/lib/db";

export class CompetitionError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "CompetitionError";
  }
}

const confirmed = { MISSING: "missing", UNCONFIRMED: "unconfirmed", CONFIRMED: "confirmed" } as const;

function asFacts(facts: Array<{ key: string; value: string; confirmation: keyof typeof confirmed; evidenceUrl: string | null }>): FactRecord[] {
  return facts.map((fact) => ({
    key: fact.key as FactRecord["key"],
    value: fact.value,
    confirmation: confirmed[fact.confirmation],
    evidenceUrl: fact.evidenceUrl,
  }));
}

function ensureEntryOpen(competition: { status: string; startsAt: Date | null; endsAt: Date | null }, now = new Date()) {
  if (competition.status === "UPCOMING" || (competition.startsAt && competition.startsAt > now)) {
    throw new CompetitionError(409, "COMPETITION_NOT_STARTED", "赛事尚未开始，开始后即可报名或投稿。");
  }
  if (competition.status === "ENDED" || (competition.endsAt && competition.endsAt < now)) {
    throw new CompetitionError(409, "COMPETITION_CLOSED", "赛事已结束，当前不接受操作。");
  }
}

export async function createCompetition(actorId: string, rawInput: unknown) {
  const parsed = competitionCreateSchema.safeParse(rawInput);
  if (!parsed.success) throw new CompetitionError(400, "INVALID_INPUT", "赛事信息不完整或格式无效。");
  const actor = await db.user.findUnique({ where: { id: actorId }, select: { role: true } });
  if (actor?.role !== "ADMIN") throw new CompetitionError(403, "FORBIDDEN", "只有管理员可以创建赛事。");
  const input = parsed.data;
  return db.competition.create({
    data: {
      title: input.title,
      organizer: input.organizer || null,
      url: input.url || null,
      description: input.description || null,
      rules: input.rules || null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      maxTeams: input.maxTeams ?? null,
      rewardXp: input.rewardXp,
      status: input.status,
    },
  });
}

export async function updateCompetition(actorId: string, competitionId: string, rawInput: unknown) {
  const parsed = competitionUpdateSchema.safeParse(rawInput);
  if (!parsed.success) throw new CompetitionError(400, "INVALID_INPUT", "请检查要修改的赛事字段和日期范围。");
  const actor = await db.user.findUnique({ where: { id: actorId }, select: { role: true } });
  if (actor?.role !== "ADMIN") throw new CompetitionError(403, "FORBIDDEN", "只有管理员可以配置赛事。");
  const input = parsed.data;
  try {
    return await db.competition.update({
      where: { id: competitionId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.organizer !== undefined ? { organizer: input.organizer || null } : {}),
        ...(input.url !== undefined ? { url: input.url || null } : {}),
        ...(input.description !== undefined ? { description: input.description || null } : {}),
        ...(input.rules !== undefined ? { rules: input.rules || null } : {}),
        ...(input.startsAt !== undefined ? { startsAt: input.startsAt ? new Date(input.startsAt) : null } : {}),
        ...(input.endsAt !== undefined ? { endsAt: input.endsAt ? new Date(input.endsAt) : null } : {}),
        ...(input.maxTeams !== undefined ? { maxTeams: input.maxTeams } : {}),
        ...(input.rewardXp !== undefined ? { rewardXp: input.rewardXp } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new CompetitionError(404, "NOT_FOUND", "没有找到这场赛事。");
    }
    throw error;
  }
}

export async function listCompetitions() {
  return db.competition.findMany({
    orderBy: [{ status: "asc" }, { startsAt: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { teams: true } } },
  });
}

export async function getCompetition(competitionId: string, viewerId?: string | null) {
  const competition = await db.competition.findUnique({
    where: { id: competitionId },
    include: {
      teams: {
        where: { entryStatus: { not: "REJECTED" } },
        orderBy: { createdAt: "asc" },
        include: {
          team: { select: { id: true, name: true, slug: true, ownerId: true } },
          submissionVersion: {
            select: { id: true, version: true, publication: { select: { status: true } }, artifact: { select: { title: true, projectId: true } } },
          },
        },
      },
    },
  });
  if (!competition) throw new CompetitionError(404, "NOT_FOUND", "赛事不存在。");
  const viewerTeamIds = viewerId
    ? await db.teamMember.findMany({
      where: { userId: viewerId, status: "ACTIVE", teamId: { in: competition.teams.map((entry) => entry.team.id) } },
      select: { teamId: true },
    }).then((rows) => new Set(rows.map((row) => row.teamId)))
    : new Set<string>();
  const teams = competition.teams.map(({ team, ...entry }) => {
    const isMyTeam = viewerTeamIds.has(team.id);
    return {
      id: entry.id,
      entryStatus: entry.entryStatus,
      createdAt: entry.createdAt,
      submittedAt: entry.submittedAt,
      awardedXp: entry.entryStatus === "APPROVED" ? entry.awardedXp : 0,
      reviewNote: entry.entryStatus === "APPROVED" || isMyTeam ? entry.reviewNote : null,
      submissionNote: isMyTeam ? entry.submissionNote : null,
      submissionVersion: isMyTeam || (entry.entryStatus === "APPROVED" && entry.publicConsent && entry.submissionVersion?.publication?.status === "APPROVED") ? entry.submissionVersion && { id: entry.submissionVersion.id, version: entry.submissionVersion.version, artifact: entry.submissionVersion.artifact } : null,
      team: { id: team.id, name: team.name, slug: team.slug },
      isMyTeam,
    };
  });
  return { ...competition, teams };
}

export async function listTeamsForCompetition(userId: string) {
  return db.teamMember.findMany({
    where: { userId, status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] } },
    orderBy: { joinedAt: "asc" },
    select: { team: { select: { id: true, name: true, slug: true } }, role: true },
  }).then((items) => items.map((item) => ({ ...item.team, role: item.role })));
}

export async function registerCompetitionTeam(actorId: string, competitionId: string, rawInput: unknown) {
  const parsed = competitionRegisterSchema.safeParse(rawInput);
  if (!parsed.success) throw new CompetitionError(400, "INVALID_INPUT", "请选择要报名的团队。");
  const teamId = parsed.data.teamId;

  try {
    return await db.$transaction(async (tx) => {
      const [membership, competition] = await Promise.all([
        tx.teamMember.findFirst({ where: { teamId, userId: actorId, status: "ACTIVE" }, select: { role: true } }),
        tx.competition.findUnique({ where: { id: competitionId } }),
      ]);
      if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
        throw new CompetitionError(403, "TEAM_PERMISSION_REQUIRED", "需要队长或团队管理员报名。");
      }
      if (!competition) throw new CompetitionError(404, "NOT_FOUND", "赛事不存在。");
      ensureEntryOpen(competition);
      const existing = await tx.teamCompetition.findUnique({
        where: { teamId_competitionId: { teamId, competitionId } },
      });
      if (existing) {
        if (existing.entryStatus !== "REJECTED") return { entry: existing, created: false };
        if (competition.maxTeams !== null) {
          const count = await tx.teamCompetition.count({ where: { competitionId, entryStatus: { not: "REJECTED" } } });
          if (count >= competition.maxTeams) throw new CompetitionError(409, "COMPETITION_FULL", "赛事队伍名额已满，暂时无法重新报名。");
        }
        const reset = await tx.teamCompetition.update({
          where: { id: existing.id },
          data: { entryStatus: "REGISTERED", submissionVersionId: null, submittedById: null, submittedAt: null, submissionNote: null, publicConsent: false, reviewedAt: null, reviewedById: null, reviewNote: null, awardedXp: 0 },
        });
        await tx.auditLog.create({ data: { actorId, action: "COMPETITION_TEAM_REREGISTERED", resourceType: "team_competition", resourceId: reset.id, metadata: { competitionId, teamId } } });
        return { entry: reset, created: true };
      }
      if (competition.maxTeams !== null) {
        const count = await tx.teamCompetition.count({ where: { competitionId, entryStatus: { not: "REJECTED" } } });
        if (count >= competition.maxTeams) throw new CompetitionError(409, "COMPETITION_FULL", "赛事队伍名额已满。");
      }
      const entry = await tx.teamCompetition.create({ data: { teamId, competitionId, entryStatus: "REGISTERED" } });
      await tx.auditLog.create({ data: { actorId, action: "COMPETITION_TEAM_REGISTERED", resourceType: "team_competition", resourceId: entry.id, metadata: { competitionId, teamId } } });
      return { entry, created: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new CompetitionError(409, "REGISTRATION_CONFLICT", "名额刚被其他队伍占用，请刷新后重试。");
    }
    throw error;
  }
}

export async function submitCompetitionEntry(actorId: string, competitionId: string, rawInput: unknown) {
  const parsed = competitionSubmissionSchema.safeParse(rawInput);
  if (!parsed.success) throw new CompetitionError(400, "INVALID_INPUT", "请检查投稿的团队、项目、作品版本和 20–3000 字作品说明。");
  const input = parsed.data;
  try {
    return await db.$transaction(async (tx) => {
    const [membership, activeMembers, competition, project, version, entry] = await Promise.all([
      tx.teamMember.findFirst({ where: { teamId: input.teamId, userId: actorId, status: "ACTIVE" }, select: { id: true } }),
      tx.teamMember.findMany({ where: { teamId: input.teamId, status: "ACTIVE" }, orderBy: [{ joinedAt: "asc" }, { userId: "asc" }], select: { userId: true } }),
      tx.competition.findUnique({ where: { id: competitionId }, select: { status: true, startsAt: true, endsAt: true } }),
      tx.project.findFirst({
        where: {
          id: input.projectId,
          teamId: input.teamId,
          status: { not: "ARCHIVED" },
          OR: [
            { ownerId: actorId },
            { team: { members: { some: { userId: actorId, status: "ACTIVE" } } } },
          ],
        },
        select: { id: true },
      }),
      tx.artifactVersion.findFirst({ where: { id: input.artifactVersionId, artifact: { projectId: input.projectId } }, select: { id: true } }),
      tx.teamCompetition.findUnique({ where: { teamId_competitionId: { teamId: input.teamId, competitionId } } }),
    ]);
    if (!membership) throw new CompetitionError(403, "TEAM_PERMISSION_REQUIRED", "你不是该团队的有效成员，无法代表团队投稿。");
    if (!competition) throw new CompetitionError(404, "NOT_FOUND", "没有找到这场赛事。");
    ensureEntryOpen(competition);
    if (!project || !version) throw new CompetitionError(404, "PROJECT_VERSION_NOT_FOUND", "找不到该团队项目或指定作品版本。");
    if (!entry) throw new CompetitionError(409, "TEAM_NOT_REGISTERED", "请先为该团队完成赛事报名。");
    if (!activeMembers.some((member) => member.userId === actorId)) throw new CompetitionError(403, "TEAM_PERMISSION_REQUIRED", "你当前不是该团队的有效成员。");
    if (!["REGISTERED", "REJECTED"].includes(entry.entryStatus)) throw new CompetitionError(409, "SUBMISSION_LOCKED", "该赛事投稿已提交或已通过审核，不能重复提交。");
    const updated = await tx.teamCompetition.updateMany({
      where: { id: entry.id, entryStatus: entry.entryStatus },
      data: {
        entryStatus: "SUBMITTED",
        submissionVersionId: version.id,
        submittedById: actorId,
        submittedAt: new Date(),
        submissionNote: input.summary,
        publicConsent: input.publicConsent,
        reviewedAt: null,
        reviewedById: null,
        reviewNote: null,
        awardedXp: 0,
      },
    });
    if (updated.count !== 1) throw new CompetitionError(409, "SUBMISSION_CONFLICT", "投稿状态刚刚发生变化，请刷新赛事页面后确认当前状态。");
    await tx.teamCompetitionContribution.deleteMany({ where: { teamCompetitionId: entry.id } });
    await tx.teamCompetitionContribution.createMany({ data: activeMembers.map((member) => ({ teamCompetitionId: entry.id, userId: member.userId, points: 1 })) });
    await tx.auditLog.create({ data: { actorId, action: "COMPETITION_ENTRY_SUBMITTED", resourceType: "team_competition", resourceId: entry.id, metadata: { competitionId, teamId: input.teamId, projectId: input.projectId, artifactVersionId: version.id, publicConsent: input.publicConsent, contributorIds: activeMembers.map((member) => member.userId) } } });
    return { id: entry.id, status: "SUBMITTED", artifactVersionId: version.id, contributors: activeMembers.length };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new CompetitionError(409, "SUBMISSION_CONFLICT", "团队成员或投稿状态刚刚变化，请刷新后重新确认。");
    }
    throw error;
  }
}

export async function reviewCompetitionEntry(reviewerId: string, rawInput: unknown) {
  const parsed = competitionReviewSchema.safeParse(rawInput);
  if (!parsed.success) throw new CompetitionError(400, "INVALID_INPUT", "请检查审核结论、说明和奖励额度。");
  const input = parsed.data;
  const reviewer = await db.user.findUnique({ where: { id: reviewerId }, select: { role: true } });
  if (reviewer?.role !== "ADMIN") throw new CompetitionError(403, "FORBIDDEN", "只有管理员可以审核赛事投稿。");

  try {
    return await db.$transaction(async (tx) => {
      const entry = await tx.teamCompetition.findUnique({
        where: { id: input.teamCompetitionId },
        include: {
          competition: true,
          contributions: { orderBy: [{ capturedAt: "asc" }, { userId: "asc" }], select: { userId: true, points: true } },
          submissionVersion: { include: { artifact: { include: { project: { include: { facts: true } } } } } },
        },
      });
      if (!entry || entry.entryStatus !== "SUBMITTED" || !entry.submissionVersion) throw new CompetitionError(409, "REVIEW_NOT_PENDING", "该投稿已被处理或作品版本已不存在，请刷新审核队列。");
      if (input.decision === "approve" && entry.publicConsent) {
        const blockers = publicReviewBlockers(asFacts(entry.submissionVersion.artifact.project.facts), entry.submissionVersion.contentMarkdown);
        if (blockers.length) throw new CompetitionError(409, "PUBLICATION_BLOCKED", blockers.join(" "));
      }
      if (input.decision === "approve" && input.awardedXp > 0 && entry.contributions.length === 0) {
        throw new CompetitionError(409, "CONTRIBUTION_SNAPSHOT_MISSING", "提交时未记录团队贡献，暂不能发放 XP。");
      }
      const award = input.decision === "approve" ? input.awardedXp : 0;
      const alreadyAwarded = await tx.teamCompetition.aggregate({
        where: { competitionId: entry.competitionId, entryStatus: "APPROVED" },
        _sum: { awardedXp: true },
      });
      const remaining = Math.max(0, entry.competition.rewardXp - (alreadyAwarded._sum.awardedXp ?? 0));
      if (award > remaining) throw new CompetitionError(409, "REWARD_BUDGET_EXCEEDED", `赛事剩余激励预算为 ${remaining} XP。`);
      const nextStatus = input.decision === "approve" ? "APPROVED" : "REJECTED";
      const changed = await tx.teamCompetition.updateMany({
        where: { id: entry.id, entryStatus: "SUBMITTED" },
        data: { entryStatus: nextStatus, reviewedAt: new Date(), reviewedById: reviewerId, reviewNote: input.note, awardedXp: award },
      });
      if (changed.count !== 1) throw new CompetitionError(409, "REVIEW_CONFLICT", "另一位管理员刚刚处理了该投稿，请刷新审核队列。");

      if (input.decision === "approve" && entry.publicConsent && entry.submittedById) {
        await tx.artifactPublication.upsert({
          where: { artifactVersionId: entry.submissionVersion.id },
          create: { artifactVersionId: entry.submissionVersion.id, requestedById: entry.submittedById, status: "APPROVED", reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: input.note },
          update: { status: "APPROVED", reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: input.note, withdrawnAt: null },
        });
        await tx.auditLog.create({ data: { actorId: reviewerId, action: "PROJECT_PUBLICATION_APPROVED", resourceType: "artifact_version", resourceId: entry.submissionVersion.id, metadata: { projectId: entry.submissionVersion.artifact.projectId, source: "competition_review", teamCompetitionId: entry.id, note: input.note } } });
      }

      if (award > 0) {
        const totalWeight = entry.contributions.reduce((total, row) => total + row.points, 0);
        const allocations = entry.contributions.map((row) => ({ userId: row.userId, amount: Math.floor((award * row.points) / totalWeight) }));
        let remainder = award - allocations.reduce((total, row) => total + row.amount, 0);
        for (const allocation of allocations) {
          if (remainder === 0) break;
          allocation.amount += 1;
          remainder -= 1;
        }
        for (const allocation of allocations) {
          if (allocation.amount === 0) continue;
          await tx.user.update({ where: { id: allocation.userId }, data: { xp: { increment: allocation.amount } }, select: { id: true } });
          await tx.xpLedger.create({ data: { userId: allocation.userId, amount: allocation.amount, reason: "COMPETITION_AWARD", refType: "team_competition", refId: entry.id, note: `赛事「${entry.competition.title}」团队激励` } });
        }
      }

      await tx.auditLog.create({ data: { actorId: reviewerId, action: "COMPETITION_ENTRY_REVIEWED", resourceType: "team_competition", resourceId: entry.id, before: { status: "SUBMITTED" }, after: { status: nextStatus, awardedXp: award }, metadata: { note: input.note, artifactVersionId: entry.submissionVersion.id, contributorIds: entry.contributions.map((row) => row.userId) } } });
      return { id: entry.id, status: nextStatus, awardedXp: award, publishedArtifactVersionId: input.decision === "approve" && entry.publicConsent ? entry.submissionVersion.id : null };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new CompetitionError(409, "REVIEW_CONFLICT", "审核队列或奖励预算刚刚发生变化，请刷新后重试。");
    }
    throw error;
  }
}

export async function getCompetitionAdminOverview(reviewerId: string) {
  const reviewer = await db.user.findUnique({ where: { id: reviewerId }, select: { role: true } });
  if (reviewer?.role !== "ADMIN") throw new CompetitionError(403, "FORBIDDEN", "只有管理员可以查看赛事管理数据。");
  const [competitions, reviewQueue] = await Promise.all([
    db.competition.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { teams: true } } } }),
    db.teamCompetition.findMany({
      where: { entryStatus: "SUBMITTED" },
      orderBy: { submittedAt: "asc" },
      include: {
        competition: { select: { id: true, title: true, rewardXp: true } },
        team: { select: { name: true } },
        submissionVersion: { select: { id: true, version: true, contentMarkdown: true, artifact: { select: { title: true } } } },
      },
    }),
  ]);
  return { competitions, reviewQueue };
}
export async function listPendingCompetitionEntries(reviewerId: string) {
  const reviewer = await db.user.findUnique({ where: { id: reviewerId }, select: { role: true } });
  if (reviewer?.role !== "ADMIN") throw new CompetitionError(403, "FORBIDDEN", "只有管理员可以审核赛事投稿。");
  return db.teamCompetition.findMany({
    where: { entryStatus: "SUBMITTED" },
    orderBy: { submittedAt: "asc" },
    include: {
      competition: { select: { id: true, title: true, rewardXp: true } },
      team: { select: { name: true } },
      submissionVersion: { select: { id: true, version: true, contentMarkdown: true, artifact: { select: { title: true } } } },
    },
  });
}

export function isCompetitionValidationError(error: unknown): error is CompetitionError | z.ZodError {
  return error instanceof CompetitionError || error instanceof z.ZodError;
}
