import { Prisma } from "@prisma/client";
import { FOLLOWER_NOTIFY_MAX, followActionSchema } from "@/contracts/community-posts";
import { db } from "@/lib/db";
import { CommunityError } from "@/server/community/errors";
import { notificationExcerpt, notifyCommunity } from "@/server/community/notifications";
import { requireActiveUser } from "@/server/community/posts";

const DAY_MS = 86_400_000;
const FOLLOWS_PER_DAY = 100;
const personSelect = { id: true, username: true, nickname: true, avatar: true } as const;

export type FollowRelation = { following: boolean; followedBy: boolean };

export async function runFollowAction(userId: string, raw: unknown) {
  const parsed = followActionSchema.safeParse(raw);
  if (!parsed.success) throw new CommunityError(400, "INVALID_INPUT");
  const { action, userId: targetId } = parsed.data;
  if (targetId === userId) throw new CommunityError(400, "SELF_ACTION");
  await requireActiveUser(userId);
  const key = { followerId_followeeId: { followerId: userId, followeeId: targetId } };

  if (action === "unfollow") {
    await db.communityFollow.deleteMany({ where: { followerId: userId, followeeId: targetId } });
    return { following: false };
  }

  const target = await db.user.findFirst({ where: { id: targetId, deletedAt: null, flagged: false }, select: { id: true } });
  if (!target) throw new CommunityError(404, "NOT_FOUND");
  if (await db.communityFollow.findUnique({ where: key, select: { followerId: true } })) return { following: true };
  const today = await db.communityFollow.count({ where: { followerId: userId, createdAt: { gte: new Date(Date.now() - DAY_MS) } } });
  if (today >= FOLLOWS_PER_DAY) throw new CommunityError(429, "DAILY_LIMIT");
  try {
    await db.communityFollow.create({ data: { followerId: userId, followeeId: targetId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { following: true };
    throw error;
  }
  await notifyCommunity({ userId: targetId, actorId: userId, type: "COMMUNITY_FOLLOWED" });
  return { following: true };
}

/** 我和对方的关系：我关注了他、他关注了我。 */
export async function getFollowRelation(viewerId: string | null, userId: string): Promise<FollowRelation> {
  if (!viewerId || viewerId === userId) return { following: false, followedBy: false };
  const rows = await db.communityFollow.findMany({
    where: { OR: [{ followerId: viewerId, followeeId: userId }, { followerId: userId, followeeId: viewerId }] },
    select: { followerId: true },
  });
  return { following: rows.some((row) => row.followerId === viewerId), followedBy: rows.some((row) => row.followerId === userId) };
}

export async function getFollowCounts(userId: string) {
  const [followers, following, relays] = await Promise.all([
    db.communityFollow.count({ where: { followeeId: userId } }),
    db.communityFollow.count({ where: { followerId: userId } }),
    db.communityPost.count({ where: { authorId: userId, relayOfId: { not: null }, status: { in: ["OPEN", "RESOLVED"] } } }),
  ]);
  return { followers, following, relays };
}

export async function listFollowingIds(userId: string) {
  const rows = await db.communityFollow.findMany({ where: { followerId: userId }, select: { followeeId: true }, take: 1000 });
  return rows.map((row) => row.followeeId);
}

/** 主页上的粉丝 / 关注列表，带上看的人和每个人的关系，用来显示「回关」「互相关注」。 */
export async function listFollowPeople(userId: string, list: "followers" | "following", viewerId: string | null) {
  const rows = list === "followers"
    ? (await db.communityFollow.findMany({ where: { followeeId: userId, follower: { deletedAt: null, flagged: false } }, orderBy: { createdAt: "desc" }, take: 60, select: { follower: { select: personSelect } } })).map((row) => row.follower)
    : (await db.communityFollow.findMany({ where: { followerId: userId, followee: { deletedAt: null, flagged: false } }, orderBy: { createdAt: "desc" }, take: 60, select: { followee: { select: personSelect } } })).map((row) => row.followee);
  if (!viewerId || rows.length === 0) return rows.map((person) => ({ ...person, relation: { following: false, followedBy: false } }));
  const ids = rows.map((person) => person.id);
  const edges = await db.communityFollow.findMany({
    where: { OR: [{ followerId: viewerId, followeeId: { in: ids } }, { followeeId: viewerId, followerId: { in: ids } }] },
    select: { followerId: true, followeeId: true },
  });
  return rows.map((person) => ({
    ...person,
    relation: {
      following: edges.some((edge) => edge.followerId === viewerId && edge.followeeId === person.id),
      followedBy: edges.some((edge) => edge.followerId === person.id && edge.followeeId === viewerId),
    },
  }));
}

/**
 * 「可能想关注」：先放关注了我、我还没回关的人，再放最近两周发帖和接力最多的人。
 * 理由文案只用真实计数，不编。
 */
export async function suggestFollows(userId: string, take = 3) {
  const following = new Set(await listFollowingIds(userId));
  const exclude = [userId, ...following];
  const fans = await db.communityFollow.findMany({
    where: { followeeId: userId, followerId: { notIn: exclude }, follower: { deletedAt: null, flagged: false } },
    orderBy: { createdAt: "desc" },
    take,
    select: { follower: { select: personSelect } },
  });
  const people: Array<{ id: string; username: string; nickname: string | null; avatar: string | null; reason: "fan" | "relays" | "posts"; count: number }> =
    fans.map((row) => ({ ...row.follower, reason: "fan" as const, count: 0 }));
  if (people.length < take) {
    const since = new Date(Date.now() - 14 * DAY_MS);
    const active = await db.communityPost.groupBy({
      by: ["authorId"],
      where: { createdAt: { gte: since }, status: { in: ["OPEN", "RESOLVED"] }, authorId: { notIn: [...exclude, ...people.map((person) => person.id)] } },
      _count: { _all: true, relayOfId: true },
      orderBy: { _count: { authorId: "desc" } },
      take: take - people.length,
    });
    const users = await db.user.findMany({ where: { id: { in: active.map((row) => row.authorId) }, deletedAt: null, flagged: false }, select: personSelect });
    for (const row of active) {
      const user = users.find((item) => item.id === row.authorId);
      if (!user) continue;
      const relays = row._count.relayOfId;
      people.push({ ...user, reason: relays > 0 ? "relays" : "posts", count: relays > 0 ? relays : row._count._all });
    }
  }
  return people;
}

/**
 * 发帖后提醒粉丝。同一个人连发、粉丝还没读，就把旧提醒改成最新这条，不再加一条。
 * 失败只记日志，不能拖垮发帖。
 */
export async function notifyFollowersOfPost(authorId: string, postId: string, text: string) {
  try {
    const followers = await db.communityFollow.findMany({
      where: { followeeId: authorId },
      orderBy: { createdAt: "asc" },
      take: FOLLOWER_NOTIFY_MAX,
      select: { followerId: true },
    });
    if (followers.length === 0) return;
    const userIds = followers.map((row) => row.followerId);
    const excerpt = notificationExcerpt(text);
    const existing = await db.notification.findMany({
      where: { userId: { in: userIds }, actorId: authorId, type: "COMMUNITY_FOLLOWEE_POST", read: false },
      select: { id: true, userId: true },
    });
    if (existing.length > 0) {
      await db.notification.updateMany({ where: { id: { in: existing.map((row) => row.id) } }, data: { communityPostId: postId, excerpt, createdAt: new Date() } });
    }
    const covered = new Set(existing.map((row) => row.userId));
    const fresh = userIds.filter((id) => !covered.has(id));
    if (fresh.length > 0) {
      await db.notification.createMany({ data: fresh.map((userId) => ({ userId, actorId: authorId, type: "COMMUNITY_FOLLOWEE_POST" as const, communityPostId: postId, excerpt })) });
    }
  } catch {
    console.error("COMMUNITY_FOLLOWER_NOTIFY_FAILED");
  }
}
