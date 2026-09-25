import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { checkInBonus, getLevelProgress, XP_RULES } from "@/lib/level";
import type {
  CommunityCheckInResult as CommunityCheckInResultContract,
  CommunityContributions as CommunityContributionsContract,
  CommunityMe as CommunityMeContract,
} from "@/contracts/community";

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

// ---------------------------------------------------------------------------
// 线上契约（JSON 形状）
// ---------------------------------------------------------------------------
// 客户端组件（src/components/community/community-panel.tsx）必须能描述这些
// 响应，但绝不能为了拿类型而 import 本模块——那会把 Prisma 拖进浏览器 bundle。
// 因此类型定义放在 src/contracts/community.ts，这里只做再导出。
export type {
  CommunityCheckIn,
  CommunityCheckInResult,
  CommunityContribution,
  CommunityContributions,
  CommunityErrorBody,
  CommunityLedgerEntry,
  CommunityMe,
} from "@/contracts/community";

// ---------------------------------------------------------------------------
// 契约一致性（编译期断言）
// ---------------------------------------------------------------------------
// 服务端返回 Date，JSON 序列化后是 ISO 字符串。这里按序列化规则转换一次，
// 再与 contracts 层的契约比对：任一侧改名、改类型或漏字段都会编译失败，
// 而不是等线上前端拿到 undefined 才发现。
type Serialized<T> = T extends Date
  ? string
  : T extends readonly (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;

type Assignable<From, To> = [From] extends [To] ? true : false;
type Expect<T extends true> = T;

type MeFromService = Serialized<Awaited<ReturnType<typeof getCommunityMe>>>;
type BoardFromService = Serialized<Awaited<ReturnType<typeof getContributions>>>;
type CheckInFromService = Serialized<Awaited<ReturnType<typeof checkIn>>>;

// 这些别名只用于编译期断言，运行时不产生任何代码，因此「未被使用」是预期状态。
/* eslint-disable @typescript-eslint/no-unused-vars */
type _MeMatchesContract = Expect<Assignable<MeFromService, CommunityMeContract>>;
type _MeHasNoExtraFields = Expect<Assignable<keyof MeFromService, keyof CommunityMeContract>>;
type _BoardMatchesContract = Expect<Assignable<BoardFromService, CommunityContributionsContract>>;
type _BoardHasNoExtraFields = Expect<Assignable<keyof BoardFromService, keyof CommunityContributionsContract>>;
type _CheckInMatchesContract = Expect<Assignable<CheckInFromService, CommunityCheckInResultContract>>;
/* eslint-enable @typescript-eslint/no-unused-vars */
