import { Prisma } from "@prisma/client";
import { bottleActionSchema, throwBottleSchema } from "@/contracts/community-posts";
import { db } from "@/lib/db";
import { CommunityError } from "@/server/community/errors";
import { notifyCommunity } from "@/server/community/notifications";
import { requireActiveUser } from "@/server/community/posts";

const DAY_MS = 86_400_000;
const THROWS_PER_DAY = 3;
const PICKS_PER_DAY = 10;
/** 只捞最近一个月的瓶子，太旧的话题没人接得上。 */
const SEA_DAYS = 30;
/** 漂流瓶是匿名的，没法看作者主页判断，两个人举报就先收起来等复核。 */
const REPORTS_TO_HIDE = 2;

function oneDayAgo() {
  return new Date(Date.now() - DAY_MS);
}

export async function throwBottle(userId: string, raw: unknown) {
  const parsed = throwBottleSchema.safeParse(raw);
  if (!parsed.success) throw new CommunityError(400, "INVALID_INPUT");
  await requireActiveUser(userId);
  const today = await db.communityBottle.count({ where: { authorId: userId, createdAt: { gte: oneDayAgo() } } });
  if (today >= THROWS_PER_DAY) throw new CommunityError(429, "BOTTLE_THROW_LIMIT");
  const bottle = await db.communityBottle.create({ data: { authorId: userId, body: parsed.data.body }, select: { id: true } });
  await db.auditLog.create({ data: { actorId: userId, action: "COMMUNITY_BOTTLE_THROWN", resourceType: "community_bottle", resourceId: bottle.id } });
  return bottle;
}

/** 随机捞一个别人扔的、我还没捞过的瓶子；优先给还没人回过的瓶子。 */
export async function pickBottle(userId: string) {
  await requireActiveUser(userId);
  const today = await db.communityBottlePick.count({ where: { userId, createdAt: { gte: oneDayAgo() } } });
  if (today >= PICKS_PER_DAY) throw new CommunityError(429, "BOTTLE_PICK_LIMIT");

  const sea: Prisma.CommunityBottleWhereInput = {
    status: "OPEN",
    authorId: { not: userId },
    createdAt: { gte: new Date(Date.now() - SEA_DAYS * DAY_MS) },
    picks: { none: { userId } },
  };
  for (const where of [{ ...sea, replies: { none: {} } }, sea]) {
    const total = await db.communityBottle.count({ where });
    if (total === 0) continue;
    const bottle = await db.communityBottle.findFirst({ where, orderBy: { id: "asc" }, skip: Math.floor(Math.random() * total), select: { id: true, body: true, createdAt: true } });
    if (!bottle) continue;
    try {
      await db.communityBottlePick.create({ data: { bottleId: bottle.id, userId } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
    return { bottle };
  }
  return { bottle: null };
}

async function loadPickedBottle(userId: string, bottleId: string) {
  const bottle = await db.communityBottle.findUnique({ where: { id: bottleId }, select: { id: true, authorId: true, status: true } });
  if (!bottle || bottle.status === "HIDDEN") throw new CommunityError(404, "NOT_FOUND");
  if (bottle.authorId === userId) throw new CommunityError(400, "SELF_ACTION");
  // 只有捞到过这个瓶子的人能回或举报，瓶子 id 不能被拿来群发。
  const pick = await db.communityBottlePick.findUnique({ where: { bottleId_userId: { bottleId, userId } }, select: { id: true } });
  if (!pick) throw new CommunityError(403, "NOT_PICKED");
  return bottle;
}

export async function runBottleAction(userId: string, bottleId: string, raw: unknown) {
  const parsed = bottleActionSchema.safeParse(raw);
  if (!parsed.success) throw new CommunityError(400, "INVALID_INPUT");
  await requireActiveUser(userId);
  const bottle = await loadPickedBottle(userId, bottleId);
  const input = parsed.data;

  if (input.action === "reply") {
    try {
      await db.communityBottleReply.create({ data: { bottleId, authorId: userId, body: input.body } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new CommunityError(409, "ALREADY_REPLIED");
      throw error;
    }
    await notifyCommunity({ userId: bottle.authorId, actorId: null, type: "BOTTLE_REPLY", bottleId, excerpt: input.body });
    return { replied: true };
  }

  try {
    await db.communityBottleReport.create({ data: { bottleId, reporterId: userId, reason: input.reason } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { reported: true, hidden: false };
    throw error;
  }
  const pending = await db.communityBottleReport.count({ where: { bottleId, status: "PENDING" } });
  const hidden = pending >= REPORTS_TO_HIDE;
  if (hidden) await db.communityBottle.update({ where: { id: bottleId }, data: { status: "HIDDEN" } });
  await db.auditLog.create({ data: { actorId: userId, action: "COMMUNITY_BOTTLE_REPORTED", resourceType: "community_bottle", resourceId: bottleId, metadata: { reason: input.reason, hidden } } });
  return { reported: true, hidden };
}

/** 我扔出去的瓶子，以及别人回我的话（回复人匿名）。 */
export async function listMyBottles(userId: string) {
  return db.communityBottle.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      body: true,
      status: true,
      createdAt: true,
      _count: { select: { picks: true } },
      replies: { orderBy: { createdAt: "asc" }, select: { id: true, body: true, createdAt: true } },
    },
  });
}
export type MyBottle = Awaited<ReturnType<typeof listMyBottles>>[number];

/** 我最近捞到的瓶子，刷新页面后还能接着回。 */
export async function listMyPicks(userId: string) {
  const picks = await db.communityBottlePick.findMany({
    where: { userId, bottle: { status: "OPEN" } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      createdAt: true,
      bottle: { select: { id: true, body: true, createdAt: true, replies: { where: { authorId: userId }, select: { body: true } } } },
    },
  });
  return picks.map(({ bottle, createdAt }) => ({ id: bottle.id, body: bottle.body, createdAt: bottle.createdAt, pickedAt: createdAt, myReply: bottle.replies[0]?.body ?? null }));
}
export type PickedBottle = Awaited<ReturnType<typeof listMyPicks>>[number];

/** 海里现在还漂着多少个瓶子（最近一个月、没被收起的），给入口卡片用。 */
export async function countFloatingBottles() {
  return db.communityBottle.count({ where: { status: "OPEN", createdAt: { gte: new Date(Date.now() - SEA_DAYS * DAY_MS) } } });
}
