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
    throw new CompetitionError(409, "COMPETITION_NOT_STARTED", "璧涗簨灏氭湭寮€濮嬶紝寮€濮嬪悗鍗冲彲鎶ュ悕鎴栨姇绋裤€");
  }
  if (competition.status === "ENDED" || (competition.endsAt && competition.endsAt < now)) {
    throw new CompetitionError(409, "COMPETITION_CLOSED", "璧涗簨宸茬粨鏉燂紝褰撳墠涓嶆帴鍙楁搷浣溿€");
  }
}

export async function createCompetition(actorId: string, rawInput: unknown) {
  const parsed = competitionCreateSchema.safeParse(rawInput);
  if (!parsed.success) throw new CompetitionError(400, "INVALID_INPUT", "璧涗簨淇℃伅涓嶅畬鏁存垨鏍煎紡鏃犳晥銆");
  const actor = await db.user.findUnique({ where: { id: actorId }, select: { role: true } });
  if (actor?.role !== "ADMIN") throw new CompetitionError(403, "FORBIDDEN", "鍙湁绠＄悊鍛樺彲浠ュ垱寤鸿禌浜嬨€");
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
  if (!parsed.success) throw new CompetitionError(400, "INVALID_INPUT", "璇锋鏌ヨ淇敼鐨勮禌浜嬪瓧娈靛拰鏃ユ湡鑼冨洿銆");
  const actor = await db.user.findUnique({ where: { id: actorId }, select: { role: true } });
  if (actor?.role !== "ADMIN") throw new CompetitionError(403, "FORBIDDEN", "鍙湁绠＄悊鍛樺彲浠ラ厤缃禌浜嬨€");
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
      throw new CompetitionError(404, "NOT_FOUND", "娌℃湁鎵惧埌杩欏満璧涗簨銆");
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
            select: { id: true, version: true, publication: { select: { status: true, withdrawnAt: true } }, artifact: { select: { title: true, projectId: true } } },
          },
        },
      },
    },
  });
  if (!competition) throw new CompetitionError(404, "NOT_FOUND", "璧涗簨涓嶅瓨鍦ㄣ€");
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
      submissionVersion: isMyTeam || (entry.entryStatus === "APPROVED" && entry.publicConsent && entry.submissionVersion?.publication?.status === "APPROVED" && !entry.submissionVersion.publication.withdrawnAt) ? entry.submissionVersion && { id: entry.submissionVersion.id, version: entry.submissionVersion.version, artifact: entry.submissionVersion.artifact } : null,
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
  if (!parsed.success) throw new CompetitionError(400, "INVALID_INPUT", "璇烽€夋嫨瑕佹姤鍚嶇殑鍥㈤槦銆");
  const teamId = parsed.data.teamId;

  try {
    return await db.$transaction(async (tx) => {
      const [membership, competition] = await Promise.all([
        tx.teamMember.findFirst({ where: { teamId, userId: actorId, status: "ACTIVE" }, select: { role: true } }),
        tx.competition.findUnique({ where: { id: competitionId } }),
      ]);
      if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
        throw new CompetitionError(403, "TEAM_PERMISSION_REQUIRED", "闇€瑕侀槦闀挎垨鍥㈤槦绠＄悊鍛樻姤鍚嶃€");
      }
      if (!competition) throw new CompetitionError(404, "NOT_FOUND", "璧涗簨涓嶅瓨鍦ㄣ€");
      ensureEntryOpen(competition);
      const existing = await tx.teamCompetition.findUnique({
        where: { teamId_competitionId: { teamId, competitionId } },
      });
      if (existing) {
        if (existing.entryStatus !== "REJECTED") return { entry: existing, created: false };
        if (competition.maxTeams !== null) {
          const count = await tx.teamCompetition.count({ where: { competitionId, entryStatus: { not: "REJECTED" } } });
          if (count >= competition.maxTeams) throw new CompetitionError(409, "COMPETITION_FULL", "璧涗簨闃熶紞鍚嶉宸叉弧锛屾殏鏃舵棤娉曢噸鏂版姤鍚嶃€");
        }
        const reset = await tx.teamCompetition.update({
          where: { id: existing.id },
          data: { entryStatus: "REGISTERED", submissionVersionId: null, submittedById: null, submittedAt: null, submissionNote: null, publicConsent: false, reviewedAt: null, reviewedById: null, reviewNote: null, awardedXp: 0 },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: "COMPETITION_TEAM_REREGISTERED",
            resourceType: "team_competition",
            resourceId: reset.id,
            before: { status: "REJECTED" },
            after: { status: "REGISTERED" },
            metadata: { competitionId, teamId, artifactVersionId: null },
          },
        });
        return { entry: reset, created: true };
      }
      if (competition.maxTeams !== null) {
        const count = await tx.teamCompetition.count({ where: { competitionId, entryStatus: { not: "REJECTED" } } });
        if (count >= competition.maxTeams) throw new CompetitionError(409, "COMPETITION_FULL", "璧涗簨闃熶紞鍚嶉宸叉弧銆");
      }
      const entry = await tx.teamCompetition.create({ data: { teamId, competitionId, entryStatus: "REGISTERED" } });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "COMPETITION_TEAM_REGISTERED",
          resourceType: "team_competition",
          resourceId: entry.id,
          before: { status: null },
          after: { status: "REGISTERED" },
          metadata: { competitionId, teamId, artifactVersionId: null },
        },
      });
      return { entry, created: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new CompetitionError(409, "REGISTRATION_CONFLICT", "鍚嶉鍒氳鍏朵粬闃熶紞鍗犵敤锛岃鍒锋柊鍚庨噸璇曘€");
    }
    throw error;
  }
}

export async function submitCompetitionEntry(actorId: string, competitionId: string, rawInput: unknown) {
  const parsed = competitionSubmissionSchema.safeParse(rawInput);
  if (!parsed.success) throw new CompetitionError(400, "INVALID_INPUT", "璇锋鏌ユ姇绋跨殑鍥㈤槦銆侀」鐩€佷綔鍝佺増鏈拰 20鈥?000 瀛椾綔鍝佽鏄庛€");
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
    if (!membership) throw new CompetitionError(403, "TEAM_PERMISSION_REQUIRED", "浣犱笉鏄鍥㈤槦鐨勬湁鏁堟垚鍛橈紝鏃犳硶浠ｈ〃鍥㈤槦鎶曠銆");
    if (!competition) throw new CompetitionError(404, "NOT_FOUND", "娌℃湁鎵惧埌杩欏満璧涗簨銆");
    ensureEntryOpen(competition);
    if (!project || !version) throw new CompetitionError(404, "PROJECT_VERSION_NOT_FOUND", "鎵句笉鍒拌鍥㈤槦椤圭洰鎴栨寚瀹氫綔鍝佺増鏈€");
    if (!entry) throw new CompetitionError(409, "TEAM_NOT_REGISTERED", "璇峰厛涓鸿鍥㈤槦瀹屾垚璧涗簨鎶ュ悕銆");
    if (!activeMembers.some((member) => member.userId === actorId)) throw new CompetitionError(403, "TEAM_PERMISSION_REQUIRED", "浣犲綋鍓嶄笉鏄鍥㈤槦鐨勬湁鏁堟垚鍛樸€");
    if (!["REGISTERED", "REJECTED"].includes(entry.entryStatus)) throw new CompetitionError(409, "SUBMISSION_LOCKED", "璇ヨ禌浜嬫姇绋垮凡鎻愪氦鎴栧凡閫氳繃瀹℃牳锛屼笉鑳介噸澶嶆彁浜ゃ€");
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
    if (updated.count !== 1) throw new CompetitionError(409, "SUBMISSION_CONFLICT", "鎶曠鐘舵€佸垰鍒氬彂鐢熷彉鍖栵紝璇峰埛鏂拌禌浜嬮〉闈㈠悗纭褰撳墠鐘舵€併€");
    await tx.teamCompetitionContribution.deleteMany({ where: { teamCompetitionId: entry.id } });
    await tx.teamCompetitionContribution.createMany({ data: activeMembers.map((member) => ({ teamCompetitionId: entry.id, userId: member.userId, points: 1 })) });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "COMPETITION_ENTRY_SUBMITTED",
        resourceType: "team_competition",
        resourceId: entry.id,
        before: { status: entry.entryStatus, artifactVersionId: entry.submissionVersionId ?? null },
        after: { status: "SUBMITTED", artifactVersionId: version.id },
        metadata: {
          competitionId,
          teamId: input.teamId,
          projectId: input.projectId,
          artifactVersionId: version.id,
          publicConsent: input.publicConsent,
          contributorIds: activeMembers.map((member) => member.userId),
        },
      },
    });
    return { id: entry.id, status: "SUBMITTED", artifactVersionId: version.id, contributors: activeMembers.length };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new CompetitionError(409, "SUBMISSION_CONFLICT", "鍥㈤槦鎴愬憳鎴栨姇绋跨姸鎬佸垰鍒氬彉鍖栵紝璇峰埛鏂板悗閲嶆柊纭銆");
    }
    throw error;
  }
}

export async function reviewCompetitionEntry(reviewerId: string, rawInput: unknown) {
  const parsed = competitionReviewSchema.safeParse(rawInput);
  if (!parsed.success) throw new CompetitionError(400, "INVALID_INPUT", "璇锋鏌ュ鏍哥粨璁恒€佽鏄庡拰濂栧姳棰濆害銆");
  const input = parsed.data;
  const reviewer = await db.user.findUnique({ where: { id: reviewerId }, select: { role: true } });
  if (reviewer?.role !== "ADMIN") throw new CompetitionError(403, "FORBIDDEN", "鍙湁绠＄悊鍛樺彲浠ュ鏍歌禌浜嬫姇绋裤€");

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
      if (!entry || entry.entryStatus !== "SUBMITTED" || !entry.submissionVersion) throw new CompetitionError(409, "REVIEW_NOT_PENDING", "璇ユ姇绋垮凡琚鐞嗘垨浣滃搧鐗堟湰宸蹭笉瀛樺湪锛岃鍒锋柊瀹℃牳闃熷垪銆");
      if (input.decision === "approve" && entry.publicConsent) {
        const blockers = publicReviewBlockers(asFacts(entry.submissionVersion.artifact.project.facts), entry.submissionVersion.contentMarkdown);
        if (blockers.length) throw new CompetitionError(409, "PUBLICATION_BLOCKED", blockers.join(" "));
      }
      if (input.decision === "approve" && input.awardedXp > 0 && entry.contributions.length === 0) {
        throw new CompetitionError(409, "CONTRIBUTION_SNAPSHOT_MISSING", "鎻愪氦鏃舵湭璁板綍鍥㈤槦璐＄尞锛屾殏涓嶈兘鍙戞斁 XP銆");
      }
      const award = input.decision === "approve" ? input.awardedXp : 0;
      const alreadyAwarded = await tx.teamCompetition.aggregate({
        where: { competitionId: entry.competitionId, entryStatus: "APPROVED" },
        _sum: { awardedXp: true },
      });
      const remaining = Math.max(0, entry.competition.rewardXp - (alreadyAwarded._sum.awardedXp ?? 0));
      if (award > remaining) throw new CompetitionError(409, "REWARD_BUDGET_EXCEEDED", "赛事剩余奖励预算为 " + remaining + " XP。");
      const nextStatus = input.decision === "approve" ? "APPROVED" : "REJECTED";
      const changed = await tx.teamCompetition.updateMany({
        where: { id: entry.id, entryStatus: "SUBMITTED" },
        data: { entryStatus: nextStatus, reviewedAt: new Date(), reviewedById: reviewerId, reviewNote: input.note, awardedXp: award },
      });
      if (changed.count !== 1) throw new CompetitionError(409, "REVIEW_CONFLICT", "鍙︿竴浣嶇鐞嗗憳鍒氬垰澶勭悊浜嗚鎶曠锛岃鍒锋柊瀹℃牳闃熷垪銆");

      if (input.decision === "approve" && entry.publicConsent && entry.submittedById) {
        await tx.artifactPublication.upsert({
          where: { artifactVersionId: entry.submissionVersion.id },
          create: { artifactVersionId: entry.submissionVersion.id, requestedById: entry.submittedById, status: "APPROVED", reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: input.note },
          update: { status: "APPROVED", reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: input.note, withdrawnAt: null },
        });
        await tx.auditLog.create({ data: { actorId: reviewerId, action: "PROJECT_PUBLICATION_APPROVED", resourceType: "artifact_version", resourceId: entry.submissionVersion.id, before: { status: "PENDING" }, after: { status: "APPROVED" }, metadata: { competitionId: entry.competitionId, projectId: entry.submissionVersion.artifact.projectId, artifactVersionId: entry.submissionVersion.id, source: "competition_review", teamCompetitionId: entry.id, note: input.note } } });
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
          await tx.xpLedger.create({ data: { userId: allocation.userId, amount: allocation.amount, reason: "COMPETITION_AWARD", refType: "team_competition", refId: entry.id, note: `Competition award: ${entry.competition.title}` } });
        }
      }

      await tx.auditLog.create({ data: { actorId: reviewerId, action: "COMPETITION_ENTRY_REVIEWED", resourceType: "team_competition", resourceId: entry.id, before: { status: "SUBMITTED", awardedXp: 0 }, after: { status: nextStatus, awardedXp: award }, metadata: { competitionId: entry.competitionId, note: input.note, artifactVersionId: entry.submissionVersion.id, contributorIds: entry.contributions.map((row) => row.userId) } } });
      return { id: entry.id, status: nextStatus, awardedXp: award, publishedArtifactVersionId: input.decision === "approve" && entry.publicConsent ? entry.submissionVersion.id : null };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new CompetitionError(409, "REVIEW_CONFLICT", "瀹℃牳闃熷垪鎴栧鍔遍绠楀垰鍒氬彂鐢熷彉鍖栵紝璇峰埛鏂板悗閲嶈瘯銆");
    }
    throw error;
  }
}

export async function getCompetitionAdminOverview(reviewerId: string) {
  const reviewer = await db.user.findUnique({ where: { id: reviewerId }, select: { role: true } });
  if (reviewer?.role !== "ADMIN") throw new CompetitionError(403, "FORBIDDEN", "鍙湁绠＄悊鍛樺彲浠ユ煡鐪嬭禌浜嬬鐞嗘暟鎹€");
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
  if (reviewer?.role !== "ADMIN") throw new CompetitionError(403, "FORBIDDEN", "鍙湁绠＄悊鍛樺彲浠ュ鏍歌禌浜嬫姇绋裤€");
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

export type CompetitionStage = "DISCOVER" | "REGISTER" | "TEAM" | "PROJECT" | "CREATE" | "SUBMIT" | "REVIEW" | "RESUBMIT" | "PUBLISH" | "SHOWCASE" | "REWARD" | "ENDED";
export type CompetitionNextAction = { label: string; href: string; description: string };
export type CompetitionProgress = {
  currentStage: CompetitionStage;
  nextAction: CompetitionNextAction;
  progressPercent: number;
  statusLabel: string;
  blocker: string | null;
};

export function deriveCompetitionProgress(input: {
  competitionId: string;
  status: string;
  endsAt?: Date | null;
  viewerId?: string | null;
  hasTeam?: boolean;
  entry?: { id: string; teamId?: string; entryStatus: string; awardedXp: number; publicConsent: boolean; submissionVersionId?: string | null; publicationStatus?: string | null; publicationWithdrawnAt?: Date | null } | null;
  hasProject?: boolean;
  now?: Date;
}): CompetitionProgress {
  const ended = input.status === "ENDED" || Boolean(input.endsAt && input.endsAt < (input.now ?? new Date()));
  const base = `/competitions/${input.competitionId}`;
  const endedProgress = (progressPercent: number): CompetitionProgress => ({
    currentStage: "ENDED",
    nextAction: { label: "查看赛事成果", href: `${base}#showcase`, description: "赛事已结束，查看公开作品和结果。" },
    progressPercent,
    statusLabel: "赛事已结束",
    blocker: "赛事已结束，不能再报名或提交。",
  });
  if (ended) return endedProgress(input.entry ? 35 : 0);
  if (!input.viewerId) return {
    currentStage: "DISCOVER",
    nextAction: { label: "登录后报名", href: `/login?callbackUrl=${encodeURIComponent(base)}`, description: "登录后选择队伍，开始参赛。" },
    progressPercent: 0,
    statusLabel: "等你参加",
    blocker: null,
  };
  if (!input.entry) {
    if (input.hasTeam) return {
      currentStage: "REGISTER",
      nextAction: { label: "立即报名", href: `${base}#actions`, description: "选择一支你管理的队伍，报名参加这场赛事。" },
      progressPercent: 0,
      statusLabel: "尚未报名",
      blocker: null,
    };
    return {
      currentStage: "TEAM",
      nextAction: { label: "创建或加入队伍", href: "/teams", description: "先创建队伍或加入已有队伍，再回来报名。" },
      progressPercent: 0,
      statusLabel: "需要队伍",
      blocker: "报名必须由队长或队伍管理员发起。",
    };
  }
  const entry = input.entry;
  if (entry.entryStatus === "APPROVED") {
    if (entry.awardedXp > 0) return {
      currentStage: "REWARD",
      nextAction: { label: "查看奖励记录", href: "/workspace", description: `你已获得 ${entry.awardedXp} XP，前往账本查看奖励来源。` },
      progressPercent: 100,
      statusLabel: "已获得奖励",
      blocker: null,
    };
    if (entry.publicationStatus === "APPROVED" && !entry.publicationWithdrawnAt && entry.publicConsent && entry.submissionVersionId) return {
      currentStage: "SHOWCASE",
      nextAction: { label: "查看公开作品", href: `/showcase/${entry.submissionVersionId}`, description: "作品已通过评审并公开展示。" },
      progressPercent: 88,
      statusLabel: "作品已公开",
      blocker: null,
    };
    return {
      currentStage: "PUBLISH",
      nextAction: { label: "查看公开进度", href: `${base}#workspace`, description: "作品已通过评审，查看指定版本的授权和公开状态。" },
      progressPercent: 78,
      statusLabel: "评审已通过",
      blocker: entry.publicConsent ? null : "提交时未授权公开展示。",
    };
  }
  if (entry.entryStatus === "SUBMITTED") return {
    currentStage: "REVIEW",
    nextAction: { label: "查看审核进度", href: `${base}#workspace`, description: "指定作品版本已提交，审核期间不能重复提交。" },
    progressPercent: 68,
    statusLabel: "等待审核",
    blocker: "审核完成前不能重复提交。",
  };
  if (entry.entryStatus === "REJECTED") return {
    currentStage: "RESUBMIT",
    nextAction: { label: "修改后重新提交", href: `${base}#actions`, description: "先阅读审核意见、修改作品，再提交新版本。" },
    progressPercent: 50,
    statusLabel: "需要修改",
    blocker: "上一次提交未通过，请根据审核意见修改。",
  };
  if (!input.hasProject) return {
    currentStage: "PROJECT",
    nextAction: { label: "创建参赛项目", href: `/projects?goal=contest&teamId=${encodeURIComponent(entry.teamId ?? "")}`, description: "创建团队项目，用它制作并提交参赛作品。" },
    progressPercent: 28,
    statusLabel: "已报名，待创建项目",
    blocker: null,
  };
  return {
    currentStage: "SUBMIT",
    nextAction: { label: "继续创作并提交", href: `${base}#actions`, description: "完成作品后，选择具体版本提交评审。" },
    progressPercent: 42,
    statusLabel: "已报名，待提交作品",
    blocker: null,
  };
}

export async function getCompetitionWorkbench(competitionId: string, viewerId?: string | null) {
  const competition = await getCompetition(competitionId, viewerId);
  const [ownEntries, manageableTeams] = viewerId ? await Promise.all([db.teamCompetition.findMany({
    where: { competitionId, team: { members: { some: { userId: viewerId, status: "ACTIVE" } } } },
    orderBy: { createdAt: "asc" },
    include: {
      team: { select: { id: true, name: true, slug: true, members: { where: { status: "ACTIVE" }, orderBy: { joinedAt: "asc" }, select: { role: true, user: { select: { id: true, username: true, nickname: true } } } } } },
      submissionVersion: { select: { id: true, version: true, createdAt: true, publication: { select: { status: true, reviewedAt: true, withdrawnAt: true } }, artifact: { select: { title: true, project: { select: { id: true, title: true } } } } } },
      contributions: { select: { userId: true, points: true, capturedAt: true } },
    },
  }), listTeamsForCompetition(viewerId)]) : [[], []];
  const selected = ownEntries.find((entry) => entry.entryStatus !== "REJECTED") ?? ownEntries[0] ?? null;
  const rewardLedger = viewerId && selected ? await db.xpLedger.findMany({
    where: { userId: viewerId, reason: "COMPETITION_AWARD", refType: "team_competition", refId: selected.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, amount: true, note: true, createdAt: true },
  }) : [];
  const viewerRewardXp = rewardLedger.reduce((total, row) => total + row.amount, 0);
  const ownProject = selected && viewerId ? await db.project.findFirst({ where: { teamId: selected.teamId, status: { not: "ARCHIVED" }, OR: [{ ownerId: viewerId }, { team: { members: { some: { userId: viewerId, status: "ACTIVE" } } } }] }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true } }) : null;
  const progress = deriveCompetitionProgress({ competitionId, status: competition.status, endsAt: competition.endsAt, viewerId, hasTeam: manageableTeams.length > 0, entry: selected ? { id: selected.id, teamId: selected.teamId, entryStatus: selected.entryStatus, awardedXp: viewerRewardXp || selected.awardedXp, publicConsent: selected.publicConsent, submissionVersionId: selected.submissionVersionId, publicationStatus: selected.submissionVersion?.publication?.status, publicationWithdrawnAt: selected.submissionVersion?.publication?.withdrawnAt } : null, hasProject: Boolean(ownProject || selected?.submissionVersion?.artifact.project.id) });
  const team = selected ? { id: selected.team.id, name: selected.team.name, slug: selected.team.slug, members: selected.team.members.map((member) => ({ userId: member.user.id, name: member.user.nickname || member.user.username || "Member", role: member.role })), contributions: selected.contributions.map((row) => ({ userId: row.userId, points: row.points, capturedAt: row.capturedAt })) } : null;
  const submission = selected?.submissionVersion ? { id: selected.submissionVersion.id, version: selected.submissionVersion.version, title: selected.submissionVersion.artifact.title, createdAt: selected.submissionVersion.createdAt, project: selected.submissionVersion.artifact.project } : null;
  const timeline = [
    { stage: "REGISTER", label: "报名", href: `${basePath(competitionId)}#actions`, complete: Boolean(selected), blocked: false },
    { stage: "TEAM", label: "组队", href: "/teams", complete: Boolean(selected), blocked: !selected },
    { stage: "PROJECT", label: "项目", href: selected?.submissionVersion?.artifact.project.id ? `/projects/${selected.submissionVersion.artifact.project.id}` : "/projects?goal=contest", complete: Boolean(ownProject || selected?.submissionVersion), blocked: !selected },
    { stage: "CREATE", label: "创作", href: ownProject ? `/projects/${ownProject.id}` : `${basePath(competitionId)}#actions`, complete: Boolean(selected?.submissionVersion), blocked: !selected },
    { stage: "SUBMIT", label: "提交", href: `${basePath(competitionId)}#actions`, complete: ["SUBMITTED", "APPROVED"].includes(selected?.entryStatus ?? ""), blocked: !selected },
    { stage: "REVIEW", label: "审核", href: `${basePath(competitionId)}#workspace`, complete: selected?.entryStatus === "APPROVED", blocked: !["SUBMITTED", "APPROVED"].includes(selected?.entryStatus ?? "") },
    { stage: "SHOWCASE", label: "展示", href: selected?.submissionVersionId ? `/showcase/${selected.submissionVersionId}` : "#showcase", complete: selected?.entryStatus === "APPROVED" && selected.publicConsent && selected.submissionVersion?.publication?.status === "APPROVED" && !selected.submissionVersion?.publication?.withdrawnAt, blocked: selected?.entryStatus !== "APPROVED" },
    { stage: "REWARD", label: "奖励", href: "/workspace", complete: (viewerRewardXp || selected?.awardedXp || 0) > 0, blocked: selected?.entryStatus !== "APPROVED" },
  ];
  const publicArtifacts = competition.teams.filter((entry) => entry.entryStatus === "APPROVED" && Boolean(entry.submissionVersion)).map((entry) => ({ versionId: entry.submissionVersion!.id, version: entry.submissionVersion!.version, title: entry.submissionVersion!.artifact.title, teamName: entry.team.name, href: `/showcase/${entry.submissionVersion!.id}` }));
  return { competition: { id: competition.id, title: competition.title, organizer: competition.organizer, description: competition.description, rules: competition.rules, status: competition.status, startsAt: competition.startsAt, endsAt: competition.endsAt, rewardXp: competition.rewardXp, maxTeams: competition.maxTeams, participantTeams: competition.teams.length }, viewer: viewerId ? { id: viewerId, registered: Boolean(selected) } : null, participation: selected ? { id: selected.id, teamId: selected.teamId, status: selected.entryStatus, submittedAt: selected.submittedAt, reviewNote: selected.reviewNote, awardedXp: viewerRewardXp || selected.awardedXp } : null, ...progress, timeline, team, project: ownProject ?? submission?.project ?? null, submission, review: selected ? { status: selected.entryStatus, note: selected.reviewNote, reviewedAt: selected.reviewedAt } : null, publication: selected ? { consent: selected.publicConsent, status: selected.submissionVersion?.publication?.status ?? null, withdrawnAt: selected.submissionVersion?.publication?.withdrawnAt ?? null } : null, rewards: rewardLedger.map((row) => ({ id: row.id, amount: row.amount, source: row.note || `赛事奖励：${competition.title}`, createdAt: row.createdAt, href: "/workspace" })), publicArtifacts };
}

function basePath(competitionId: string) { return `/competitions/${competitionId}`; }
