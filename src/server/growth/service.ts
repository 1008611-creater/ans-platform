import { Prisma } from "@prisma/client";
import type { DbTransaction } from "@/lib/db";
import { activeCheckInStreak, getCommunityDay } from "@/domain/growth/check-in";
import { LEVELS } from "@/domain/growth/levels";
import { db } from "@/lib/db";
import { getLevelProgress, XP_RULES, type XpRuleKey } from "@/lib/level";
import { getLevelPointReward, getUnlockedRewards, ALL_REWARDS } from "@/domain/growth/rewards";

type GrowthTx = DbTransaction;
export type GrowthEventInput = {
  userId: string;
  type: XpRuleKey | string;
  sourceType: string;
  sourceId: string;
  reason?: Exclude<XpRuleKey, "LIKE"> | "COMMUNITY_REWARD";
  xp?: number;
  points?: number;
  note?: string;
  dailyCap?: number;
};

function startOfCommunityDay(now = new Date()) { return new Date(`${getCommunityDay(now)}T00:00:00+08:00`); }

export function levelUpPointsBetween(previousXp: number, nextXp: number) {
  const before = getLevelProgress(previousXp).level.index;
  const after = getLevelProgress(nextXp).level.index;
  let points = 0;
  for (let index = before + 1; index <= after; index += 1) points += getLevelPointReward(index);
  return points;
}

/** Caller holds the user row lock. Each reached tier pays exactly once,
 * including existing members whose historical XP already unlocked that tier. */
export async function grantReachedLevelRewards(tx: GrowthTx, userId: string, nextXp: number) {
  const reached = LEVELS.filter((level) => getLevelPointReward(level.index) > 0 && nextXp >= level.minXp);
  if (!reached.length) return 0;
  const existing = await tx.growthEvent.findMany({
    where: { userId, type: "LEVEL_REWARD", sourceType: "level", sourceId: { in: reached.map((level) => String(level.index)) } },
    select: { sourceId: true },
  });
  const paid = new Set(existing.map((event) => event.sourceId));
  const unpaid = reached.filter((level) => !paid.has(String(level.index)));
  if (!unpaid.length) return 0;
  await tx.growthEvent.createMany({ data: unpaid.map((level) => ({ userId, type: "LEVEL_REWARD", sourceType: "level", sourceId: String(level.index), xp: 0, points: getLevelPointReward(level.index) })) });
  return unpaid.reduce((sum, level) => sum + getLevelPointReward(level.index), 0);
}

async function awardInTransaction(tx: GrowthTx, input: GrowthEventInput) {
  // Serialize all growth mutations for one account. The daily-cap count and the
  // subsequent XP update must observe the same state; a plain READ COMMITTED
  // transaction lets concurrent likes/comments both pass the cap check.
  const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM users WHERE id = ${input.userId} FOR UPDATE`;
  if (!locked[0]) return { awarded: false, reason: "USER_NOT_FOUND" as const };
  const rule = input.reason && input.reason in XP_RULES ? XP_RULES[input.reason as XpRuleKey] : undefined;
  const dailyCap = input.dailyCap ?? rule?.dailyCap;
  if (dailyCap) {
    const count = await tx.growthEvent.count({
      where: { userId: input.userId, type: input.type, createdAt: { gte: startOfCommunityDay() } },
    });
    if (count >= dailyCap) return { awarded: false, reason: "DAILY_CAP" as const };
  }
  const existing = await tx.growthEvent.findUnique({
    where: { userId_type_sourceType_sourceId: { userId: input.userId, type: input.type, sourceType: input.sourceType, sourceId: input.sourceId } },
    select: { id: true, xp: true, points: true },
  });
  if (existing) return { awarded: false, reason: "DUPLICATE" as const, event: existing };

  const user = await tx.user.findFirst({ where: { id: input.userId, deletedAt: null, flagged: false }, select: { xp: true, communityPoints: true } });
  if (!user) return { awarded: false, reason: "USER_NOT_FOUND" as const };
  const xp = Math.max(0, input.xp ?? rule?.base ?? 0);
  const points = Math.max(0, input.points ?? 0);
  const event = await tx.growthEvent.create({
    data: { userId: input.userId, type: input.type, sourceType: input.sourceType, sourceId: input.sourceId, xp, points },
    select: { id: true, xp: true, points: true },
  });
  const levelPoints = await grantReachedLevelRewards(tx, input.userId, user.xp + xp);
  await tx.user.update({
    where: { id: input.userId },
    data: { xp: { increment: xp }, communityPoints: { increment: points + levelPoints } },
  });
  if (xp > 0 && input.reason) {
    await tx.xpLedger.create({
      data: { userId: input.userId, amount: xp, reason: input.reason as "COMMUNITY_REWARD" | Exclude<XpRuleKey, "LIKE">, refType: input.sourceType, refId: input.sourceId, note: input.note ?? rule?.note ?? null },
    });
  }
  return { awarded: true, event, levelPoints };
}

export async function awardGrowthEvent(input: GrowthEventInput) {
  try {
    return await db.$transaction((tx) => awardInTransaction(tx, input), { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 30000, maxWait: 10000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { awarded: false, reason: "DUPLICATE" as const };
    }
    throw error;
  }
}

export async function safeAwardGrowthEvent(input: GrowthEventInput) {
  try { return await awardGrowthEvent(input); }
  catch { console.error("[growth] award failed", { type: input.type, sourceType: input.sourceType }); return { awarded: false, reason: "FAILED" as const }; }
}

export async function getGrowthProfile(userId: string) {
  type Event = { id: string; type: string; xp: number; points: number; sourceType: string; createdAt: string };
  type CheckIn = { id: string; day: string; streak: number; xpAwarded: number; createdAt: string };
  const rows = await db.$queryRaw<Array<{
    id: string; xp: number; communityPoints: number; checkInStreak: number; lastCheckInAt: Date | null;
    avatarFrameKey: string; chatBubbleKey: string; recentEvents: Event[]; checkIns: CheckIn[];
  }>>`
    SELECT u.id, u.xp, u."communityPoints", u."checkInStreak", u."lastCheckInAt", u."avatarFrameKey", u."chatBubbleKey",
      COALESCE((SELECT jsonb_agg(e ORDER BY e."createdAt" DESC, e.id DESC) FROM
        (SELECT id, type, xp, points, "sourceType", "createdAt" FROM growth_events WHERE "userId" = u.id ORDER BY "createdAt" DESC, id DESC LIMIT 12) e), '[]'::jsonb) AS "recentEvents",
      COALESCE((SELECT jsonb_agg(c ORDER BY c.day DESC) FROM
        (SELECT id, day, streak, "xpAwarded", "createdAt" FROM check_ins WHERE "userId" = u.id ORDER BY day DESC LIMIT 35) c), '[]'::jsonb) AS "checkIns"
    FROM users u WHERE u.id = ${userId} AND u."deletedAt" IS NULL AND u.flagged = false
  `;
  const snapshot = rows[0];
  if (!snapshot) return null;
  const { recentEvents: rawEvents, checkIns: rawCheckIns, ...user } = snapshot;
  const recentEvents = rawEvents.map((event) => ({ ...event, createdAt: new Date(event.createdAt) }));
  const checkIns = rawCheckIns.map((record) => ({ ...record, createdAt: new Date(record.createdAt) }));
  const progress = getLevelProgress(user.xp), now = new Date();
  return {
    ...user,
    checkInStreak: activeCheckInStreak(user.checkInStreak, user.lastCheckInAt, now),
    growthDay: getCommunityDay(now),
    level: progress,
    unlockedRewards: getUnlockedRewards(progress.level.index),
    nextReward: progress.nextLevel ? {
      level: progress.nextLevel,
      points: getLevelPointReward(progress.nextLevel.index),
      unlocks: ALL_REWARDS.filter((reward) => reward.levelIndex === progress.nextLevel!.index),
    } : null,
    recentEvents,
    checkIns,
  };
}

export async function equipGrowthReward(userId: string, kind: "avatar-frame" | "chat-bubble", key: string) {
  const field = kind === "avatar-frame" ? "avatarFrameKey" : "chatBubbleKey";
  const reward = ALL_REWARDS.find((item) => item.key === key && item.kind === kind);
  if (!reward) throw new Error("REWARD_NOT_FOUND");
  const user = await db.user.findFirst({ where: { id: userId, deletedAt: null, flagged: false }, select: { xp: true } });
  if (!user || reward.levelIndex > getLevelProgress(user.xp).level.index) throw new Error("REWARD_LOCKED");
  await db.user.update({ where: { id: userId }, data: { [field]: key } });
  return { kind, key };
}


export type GrowthShareTarget = "prompt" | "artifact" | "project";

/** Validate that a shared target is publicly visible before awarding share XP. */
export async function recordGrowthShare(userId: string, targetType: GrowthShareTarget, targetId: string) {
  const id = targetId.trim();
  if (!id || id.length > 128) throw new Error("INVALID_SHARE_TARGET");
  let visible = false;
  if (targetType === "prompt") {
    visible = Boolean(await db.prompt.findFirst({
      where: { id, isPrivate: false, isUnlisted: false, deletedAt: null },
      select: { id: true },
    }));
  } else if (targetType === "artifact") {
    visible = Boolean(await db.artifactVersion.findFirst({
      where: { id, publication: { is: { status: "APPROVED", withdrawnAt: null } } },
      select: { id: true },
    }));
  } else {
    visible = Boolean(await db.project.findFirst({
      where: { id, status: "ACTIVE", visibility: "PUBLIC" },
      select: { id: true },
    }));
  }
  if (!visible) throw new Error("SHARE_TARGET_NOT_PUBLIC");
  return safeAwardGrowthEvent({
    userId,
    type: "SHARE",
    reason: "SHARE",
    sourceType: `share:${targetType}`,
    sourceId: id,
  });
}

