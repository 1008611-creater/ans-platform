import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { checkInBonus, getLevelProgress, XP_RULES } from "@/lib/level";

const eligibleUser = { deletedAt: null, flagged: false, emailVerified: { not: null } } as const;
const checkInSelect = { id: true, day: true, streak: true, xpAwarded: true, createdAt: true } as const;
const contributionSelect = { id: true, nickname: true, xp: true } as const;
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
});

export class CommunityError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code);
  }
}

export function getCommunityDay(now: Date): string {
  const parts = dayFormatter.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

async function requireCommunityUser(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findFirst({
    where: { id: userId, ...eligibleUser },
    select: { id: true, xp: true, nickname: true, checkInStreak: true, lastCheckInAt: true },
  });
  if (!user) throw new CommunityError(403, "COMMUNITY_INELIGIBLE");
  return user;
}

export async function checkIn(userId: string) {
  return db.$transaction(async (tx) => {
    // 用户行锁串行化同一用户的请求；唯一键(userId, day)是数据库最终幂等防线。
    await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE`;
    const user = await requireCommunityUser(tx, userId);
    // 在获得锁后取服务端时间，避免等待跨越上海午夜时使用旧日期。
    const now = new Date();
    const day = getCommunityDay(now);
    const existing = await tx.checkIn.findUnique({
      where: { userId_day: { userId, day } }, select: checkInSelect,
    });
    if (existing) return { alreadyCheckedIn: true, checkIn: existing };

    const yesterday = new Date(`${day}T00:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const streak = user.lastCheckInAt && getCommunityDay(user.lastCheckInAt) === yesterday.toISOString().slice(0, 10)
      ? user.checkInStreak + 1 : 1;
    const xpAwarded = XP_RULES.CHECK_IN.base + checkInBonus(streak);
    const record = await tx.checkIn.create({
      data: { userId, day, streak, xpAwarded, createdAt: now }, select: checkInSelect,
    });
    await tx.user.update({
      where: { id: userId },
      data: { xp: { increment: xpAwarded }, checkInStreak: streak, lastCheckInAt: now },
      select: { id: true },
    });
    await tx.xpLedger.create({
      data: { userId, amount: xpAwarded, reason: "CHECK_IN", refType: "checkIn", refId: record.id, note: XP_RULES.CHECK_IN.note, createdAt: now },
      select: { id: true },
    });
    return { alreadyCheckedIn: false, checkIn: record };
  }, { isolationLevel: "ReadCommitted" });
}

export async function getCommunityMe(userId: string) {
  return db.$transaction(async (tx) => {
    const user = await requireCommunityUser(tx, userId);
    const ledger = await tx.xpLedger.findMany({
      where: { userId }, take: 50,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, amount: true, reason: true, note: true, createdAt: true },
    });
    const todayCheckIn = await tx.checkIn.findUnique({
      where: { userId_day: { userId, day: getCommunityDay(new Date()) } }, select: checkInSelect,
    });
    return { xp: user.xp, level: getLevelProgress(user.xp), checkInStreak: user.checkInStreak, todayCheckIn, ledger };
  }, { isolationLevel: "RepeatableRead" });
}

function contribution(user: { id: string; xp: number; nickname: string | null }, rank: number) {
  return { id: user.id, nickname: user.nickname?.trim() || "匿名同学", xp: user.xp, level: getLevelProgress(user.xp), rank };
}

export async function getContributions(userId: string) {
  // 同一快照内计算榜单和本人名次，避免并发签到让两处排名不一致。
  return db.$transaction(async (tx) => {
    const user = await requireCommunityUser(tx, userId);
    const leaders = await tx.user.findMany({
      where: eligibleUser, select: contributionSelect, take: 20,
      orderBy: [{ xp: "desc" }, { id: "asc" }],
    });
    let rank = 0;
    const top = leaders.map((leader, index) => {
      if (index === 0 || leader.xp !== leaders[index - 1].xp) rank = index + 1;
      return contribution(leader, rank);
    });
    const ahead = await tx.user.count({ where: { ...eligibleUser, xp: { gt: user.xp } } });
    return { top, me: contribution(user, ahead + 1) };
  }, { isolationLevel: "RepeatableRead" });
}

export type CommunityMe = Awaited<ReturnType<typeof getCommunityMe>>;
export type Contributions = Awaited<ReturnType<typeof getContributions>>;
