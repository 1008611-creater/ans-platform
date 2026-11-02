import { Prisma, type CommunityBoard } from "@prisma/client";
import {
  communityPostActionSchema,
  createCommunityPostSchema,
  helpVerb,
  HELP_REWARD_XP,
  STALL_MAX_DAYS,
  teamRoleSchema,
  type CommunityTeamRole,
} from "@/contracts/community-posts";
import { db } from "@/lib/db";
import { CommunityError } from "@/server/community/errors";
import { notifyCommunity } from "@/server/community/notifications";
import { notifyFollowersOfPost } from "@/server/community/follows";
import { isPublishedCatalogSlug } from "@/server/community/remix";
import { awardGrowthEvent, safeAwardGrowthEvent } from "@/server/growth/service";
import { TEAM_MEMBER_CAP, teamPermissions } from "@/server/teams/service";

const DAY_MS = 86_400_000;
const POSTS_PER_DAY = 10;
const REPLIES_PER_DAY = 40;
/** 被不同的人举报到这个次数就先隐藏，等管理员复核。 */
const REPORTS_TO_HIDE = 3;
/** 同一个人这么短时间里发出一模一样的帖子，当作连点，回原来那条。 */
const DUPLICATE_WINDOW_MS = 2 * 60_000;

const authorSelect = { id: true, username: true, nickname: true, avatar: true } as const;
const VISIBLE = ["OPEN", "RESOLVED"] as const;

export type CommunityFeedSort = "latest" | "open";

function parseRoles(value: Prisma.JsonValue | null): CommunityTeamRole[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const role = teamRoleSchema.safeParse(item);
    return role.success ? [role.data] : [];
  });
}

/** 每个角色还剩几个位置：岗位数减去已通过的申请。 */
export function roleVacancies(roles: CommunityTeamRole[], accepted: Array<{ role: string }>) {
  return roles.map((role) => {
    const filled = accepted.filter((item) => item.role === role.name).length;
    return { name: role.name, slots: role.slots, filled: Math.min(filled, role.slots) };
  });
}

/** 摊位过了截止时间就不再收人或帮忙，和「已关闭」同等对待。 */
export function isPostActive(post: { status: string; expiresAt: Date | null }, now = new Date()) {
  return post.status === "OPEN" && (!post.expiresAt || post.expiresAt > now);
}

function oneDayAgo(now = new Date()) {
  return new Date(now.getTime() - DAY_MS);
}

export async function requireActiveUser(userId: string) {
  const user = await db.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true, flagged: true } });
  if (!user) throw new CommunityError(401, "UNAUTHORIZED");
  if (user.flagged) throw new CommunityError(403, "ACCOUNT_RESTRICTED");
  return user;
}

/**
 * 接力的目标：只能接笔记和一句话；接一条接力帖等于接它的原帖，所以串只有一层。
 * 板块跟着原帖走。
 */
async function resolveRelayRoot(relayOfId: string) {
  const select = { id: true, kind: true, status: true, board: true, authorId: true, title: true, body: true, relayOfId: true } as const;
  const target = await db.communityPost.findUnique({ where: { id: relayOfId }, select });
  const root = target?.relayOfId ? await db.communityPost.findUnique({ where: { id: target.relayOfId }, select }) : target;
  if (!root || root.status === "HIDDEN" || root.kind === "STALL") throw new CommunityError(400, "INVALID_RELAY");
  return root;
}

async function requireTeamLead(teamId: string, userId: string) {
  const membership = await db.teamMember.findFirst({ where: { teamId, userId, status: "ACTIVE" }, select: { role: true } });
  if (!membership || !teamPermissions(membership.role).canInvite) throw new CommunityError(403, "NOT_TEAM_LEAD");
}

export async function createCommunityPost(userId: string, raw: unknown) {
  const parsed = createCommunityPostSchema.safeParse(raw);
  if (!parsed.success) throw new CommunityError(400, "INVALID_INPUT");
  const input = parsed.data;
  await requireActiveUser(userId);
  const duplicate = await db.communityPost.findFirst({ where: { authorId: userId, kind: input.kind, body: input.body, relayOfId: input.kind !== "STALL" ? input.relayOfId ?? null : null, createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) } }, select: { id: true } });
  if (duplicate) return duplicate;
  const today = await db.communityPost.count({ where: { authorId: userId, createdAt: { gte: oneDayAgo() } } });
  if (today >= POSTS_PER_DAY) throw new CommunityError(429, "DAILY_LIMIT");

  const relayRoot = input.kind !== "STALL" && input.relayOfId ? await resolveRelayRoot(input.relayOfId) : null;
  // 只有管理员能发官方帖；接力帖跟着原帖，不单独算官方。
  const official = input.kind !== "STALL" && input.official === true && !relayRoot;
  if (official) await requireAdmin(userId);
  const data: Prisma.CommunityPostUncheckedCreateInput = { authorId: userId, kind: input.kind, board: relayRoot?.board ?? input.board as CommunityBoard, body: input.body, images: [], relayOfId: relayRoot?.id ?? null, officialAt: official ? new Date() : null };
  if (input.kind === "NOTE") {
    if (input.catalogSlug && !(await isPublishedCatalogSlug(input.catalogSlug))) throw new CommunityError(400, "INVALID_PROJECT");
    Object.assign(data, { title: input.title, images: input.images, catalogSlug: input.catalogSlug ?? null });
  }
  if (input.kind === "STALL") {
    const now = Date.now();
    if (input.expiresAt.getTime() <= now || input.expiresAt.getTime() > now + STALL_MAX_DAYS * DAY_MS) throw new CommunityError(400, "INVALID_DEADLINE");
    if (input.teamId) await requireTeamLead(input.teamId, userId);
    if (input.competitionId) {
      const competition = await db.competition.findUnique({ where: { id: input.competitionId }, select: { status: true } });
      if (!competition || competition.status === "ENDED") throw new CommunityError(400, "INVALID_COMPETITION");
    }
    Object.assign(data, {
      title: input.title,
      stall: input.stall,
      expiresAt: input.expiresAt,
      competitionId: input.competitionId ?? null,
      teamId: input.teamId ?? null,
      roles: input.stall === "TEAM" ? input.roles : Prisma.DbNull,
    });
  }

  const post = await db.$transaction(async (tx) => {
    const created = await tx.communityPost.create({ data, select: { id: true } });
    await tx.auditLog.create({ data: { actorId: userId, action: "COMMUNITY_POST_CREATED", resourceType: "community_post", resourceId: created.id, metadata: { kind: input.kind, board: data.board, relayOfId: data.relayOfId ?? null, catalogSlug: data.catalogSlug ?? null } } });
    return created;
  });
  const label = (input.kind === "STALL" || input.kind === "NOTE" ? input.title : "") || input.body;
  // 同一条原帖被多人接，原作者没读之前合成一条提醒，点开看整串接力。
  if (relayRoot) await notifyCommunity({ userId: relayRoot.authorId, actorId: userId, type: "COMMUNITY_RELAY", communityPostId: relayRoot.id, excerpt: label });
  await notifyFollowersOfPost(userId, post.id, label);
  return post;
}

const feedInclude = {
  author: { select: authorSelect },
  helper: { select: authorSelect },
  team: { select: { name: true, slug: true } },
  competition: { select: { id: true, title: true } },
  applications: { where: { status: "ACCEPTED" }, select: { role: true } },
  relayOf: { select: { id: true, title: true, body: true, status: true } },
  relays: { where: { status: { in: [...VISIBLE] } }, orderBy: { createdAt: "asc" }, take: 3, select: { author: { select: authorSelect } } },
  _count: { select: { likes: true, replies: true, helpOffers: true, relays: { where: { status: { in: [...VISIBLE] } } } } },
} satisfies Prisma.CommunityPostInclude;

/** 接力帖上引用的原帖。原帖被隐藏了就只说「原帖已隐藏」，不露内容。 */
function relayQuote(relayOf: { id: string; title: string | null; body: string; status: string } | null) {
  if (!relayOf) return null;
  return relayOf.status === "HIDDEN" ? { id: relayOf.id, label: null } : { id: relayOf.id, label: relayOf.title || relayOf.body };
}

/** 推荐频道顶上最多放几条置顶帖。 */
export const PINNED_MAX = 2;

export async function listCommunityPosts({ board, sort = "latest", take = 40, authorIds, pinned = false, excludeIds }: { board?: CommunityBoard; sort?: CommunityFeedSort; take?: number; authorIds?: string[]; pinned?: boolean; excludeIds?: string[] }) {
  const now = new Date();
  const where: Prisma.CommunityPostWhereInput = {
    ...(board ? { board } : {}),
    ...(authorIds ? { authorId: { in: authorIds } } : {}),
    ...(pinned ? { pinnedAt: { not: null } } : {}),
    ...(excludeIds?.length ? { id: { notIn: excludeIds } } : {}),
    ...(sort === "open"
      ? { status: "OPEN", kind: "STALL", stall: { in: ["SEEK", "TEAM"] }, expiresAt: { gt: now } }
      : { status: { in: [...VISIBLE] }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }, { status: "RESOLVED" }] }),
  };
  // 置顶区里官方帖排在前面，其余按置顶时间。
  const orderBy: Prisma.CommunityPostOrderByWithRelationInput[] = pinned ? [{ officialAt: { sort: "desc", nulls: "last" } }, { pinnedAt: "desc" }] : [{ createdAt: "desc" }];
  const rows = await db.communityPost.findMany({ where, include: feedInclude, orderBy, take: Math.min(Math.max(take, 1), 60) });
  return rows.map(({ applications, roles, relayOf, relays, ...post }) => ({
    ...post,
    relayOf: relayQuote(relayOf),
    relayers: relays.map((relay) => relay.author),
    active: isPostActive(post, now),
    vacancies: roleVacancies(parseRoles(roles), applications),
  }));
}
export type CommunityPostSummary = Awaited<ReturnType<typeof listCommunityPosts>>[number];

export async function getCommunityPost(id: string, viewerId: string | null) {
  const post = await db.communityPost.findUnique({
    where: { id },
    include: {
      author: { select: authorSelect },
      helper: { select: authorSelect },
      competition: { select: { id: true, title: true, endsAt: true } },
      team: { select: { id: true, name: true, slug: true, members: { where: { status: "ACTIVE" }, orderBy: { joinedAt: "asc" }, select: { role: true, user: { select: authorSelect } } } } },
      replies: { where: { deletedAt: null }, orderBy: { createdAt: "asc" }, take: 200, select: { id: true, body: true, createdAt: true, author: { select: authorSelect } } },
      applications: { orderBy: { createdAt: "asc" }, select: { id: true, role: true, message: true, status: true, createdAt: true, applicantId: true, applicant: { select: authorSelect } } },
      helpOffers: { orderBy: { createdAt: "asc" }, select: { id: true, message: true, createdAt: true, userId: true, user: { select: authorSelect } } },
      relayOf: { select: { id: true, title: true, body: true, status: true } },
      // 详情页的接力串新的在前，刚接上的人马上能在最上面看到自己。
      relays: {
        where: { status: { in: [...VISIBLE] } },
        orderBy: { createdAt: "desc" },
        take: 60,
        select: { id: true, kind: true, title: true, body: true, images: true, board: true, createdAt: true, author: { select: authorSelect }, _count: { select: { likes: true } } },
      },
      _count: { select: { likes: true, relays: { where: { status: { in: [...VISIBLE] } } } } },
    },
  });
  if (!post) return null;
  const isAuthor = viewerId === post.authorId;
  if (post.status === "HIDDEN" && !isAuthor) return null;
  const liked = viewerId ? Boolean(await db.communityPostLike.findUnique({ where: { userId_postId: { userId: viewerId, postId: id } }, select: { userId: true } })) : false;
  const { applications, helpOffers, roles, relayOf, ...rest } = post;
  return {
    ...rest,
    relayOf: relayQuote(relayOf),
    isAuthor,
    liked,
    active: isPostActive(post),
    vacancies: roleVacancies(parseRoles(roles), applications.filter((item) => item.status === "ACCEPTED")),
    helpOfferCount: helpOffers.length,
    pendingApplicationCount: applications.filter((item) => item.status === "PENDING").length,
    myApplication: applications.find((item) => item.applicantId === viewerId) ?? null,
    myHelpOffer: helpOffers.some((item) => item.userId === viewerId),
    // 申请和「我能帮」的名单只给发帖人看。
    applications: isAuthor ? applications : [],
    helpOffers: isAuthor ? helpOffers : [],
  };
}
export type CommunityPostDetail = NonNullable<Awaited<ReturnType<typeof getCommunityPost>>>;

/** 右侧「我的摊位」：还开着的摊位和等我处理的数量。 */
export async function listMyStalls(userId: string) {
  const rows = await db.communityPost.findMany({
    where: { authorId: userId, kind: "STALL", status: "OPEN", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, title: true, stall: true, _count: { select: { helpOffers: true, applications: { where: { status: "PENDING" } } } } },
  });
  return rows.map((row) => ({ id: row.id, title: row.title ?? "", stall: row.stall, pending: row.stall === "TEAM" ? row._count.applications : row._count.helpOffers }));
}

/** 发组队帖时能选的队伍（我是队长或管理员）和还没结束的比赛。 */
/** 还没结束的比赛，组队板块空的时候给个入口。农客松有自己的主会场。 */
export async function listOpenCompetitions(take = 2) {
  const rows = await db.competition.findMany({ where: { status: { not: "ENDED" } }, select: { id: true, title: true }, orderBy: { createdAt: "desc" }, take });
  return rows.map((row) => ({ ...row, href: row.id.startsWith("agrihackathon") ? "/competitions/agrihackathon" : `/competitions/${row.id}` }));
}

export async function getComposeOptions(userId: string) {
  const [memberships, competitions] = await Promise.all([
    db.teamMember.findMany({ where: { userId, status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] } }, select: { team: { select: { id: true, name: true } } }, orderBy: { joinedAt: "desc" }, take: 20 }),
    db.competition.findMany({ where: { status: { not: "ENDED" } }, select: { id: true, title: true }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return { teams: memberships.map((item) => item.team), competitions };
}

async function loadPostForAction(postId: string) {
  const post = await db.communityPost.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, kind: true, stall: true, status: true, expiresAt: true, teamId: true, roles: true, title: true, body: true },
  });
  if (!post || post.status === "HIDDEN") throw new CommunityError(404, "NOT_FOUND");
  return post;
}
type ActionPost = Awaited<ReturnType<typeof loadPostForAction>>;

/** 提醒里显示的帖子名：有标题用标题，一句话帖子用正文开头。 */
function postLabel(post: ActionPost) {
  return post.title || post.body;
}

function requireAuthor(post: ActionPost, userId: string) {
  if (post.authorId !== userId) throw new CommunityError(403, "FORBIDDEN");
}

function requireActive(post: ActionPost) {
  if (!isPostActive(post)) throw new CommunityError(409, "POST_CLOSED");
}

async function addReply(post: ActionPost, userId: string, body: string) {
  const today = await db.communityReply.count({ where: { authorId: userId, createdAt: { gte: oneDayAgo() } } });
  if (today >= REPLIES_PER_DAY) throw new CommunityError(429, "DAILY_LIMIT");
  const reply = await db.communityReply.create({ data: { postId: post.id, authorId: userId, body }, select: { id: true } });
  if (post.authorId !== userId) await safeAwardGrowthEvent({ userId, type: "COMMENT", reason: "COMMENT", sourceType: "community_reply", sourceId: reply.id });
  await notifyCommunity({ userId: post.authorId, actorId: userId, type: "COMMUNITY_REPLY", communityPostId: post.id, excerpt: body });
  return { replyId: reply.id };
}

async function toggleLike(post: ActionPost, userId: string) {
  const key = { userId_postId: { userId, postId: post.id } };
  const existing = await db.communityPostLike.findUnique({ where: key, select: { userId: true } });
  if (existing) {
    await db.communityPostLike.delete({ where: key });
    return { liked: false };
  }
  try { await db.communityPostLike.create({ data: { userId, postId: post.id } }); }
  catch (error) { if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error; }
  if (post.authorId !== userId) await safeAwardGrowthEvent({ userId, type: "LIKE", reason: "COMMUNITY_REWARD", sourceType: "community_like", sourceId: post.id, xp: 1, dailyCap: 10, note: "点赞社区帖子" });
  return { liked: true };
}

async function offerHelp(post: ActionPost, userId: string, message?: string) {
  if (post.kind !== "STALL" || !helpVerb(post.stall)) throw new CommunityError(400, "INVALID_ACTION");
  if (post.authorId === userId) throw new CommunityError(400, "SELF_ACTION");
  requireActive(post);
  try {
    await db.communityHelpOffer.create({ data: { postId: post.id, userId, message: message || null } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { offered: true };
    throw error;
  }
  await notifyCommunity({ userId: post.authorId, actorId: userId, type: "COMMUNITY_HELP_OFFER", communityPostId: post.id, excerpt: message || postLabel(post) });
  return { offered: true };
}

async function resolvePost(post: ActionPost, userId: string, helperId?: string) {
  requireAuthor(post, userId);
  if (post.kind !== "STALL" || post.status !== "OPEN") throw new CommunityError(409, "POST_CLOSED");
  if (helperId) {
    const offer = await db.communityHelpOffer.findUnique({ where: { postId_userId: { postId: post.id, userId: helperId } }, select: { id: true } });
    if (!offer) throw new CommunityError(400, "HELPER_NOT_OFFERED");
  }
  const updated = await db.communityPost.updateMany({ where: { id: post.id, status: "OPEN" }, data: { status: "RESOLVED", helperId: helperId ?? null, resolvedAt: new Date() } });
  if (updated.count !== 1) throw new CommunityError(409, "POST_CLOSED");
  await db.auditLog.create({ data: { actorId: userId, action: "COMMUNITY_POST_RESOLVED", resourceType: "community_post", resourceId: post.id, metadata: { helperId: helperId ?? null } } });
  // 只有「求 / 换」被帮到才给帮忙的人记 XP；「出」是发帖人自己送东西。
  let rewarded = false;
  if (helperId && helpVerb(post.stall) === "help") {
    const result = await awardGrowthEvent({ userId: helperId, type: "COMMUNITY_HELP", reason: "COMMUNITY_REWARD", sourceType: "community_help", sourceId: post.id, xp: HELP_REWARD_XP, dailyCap: 3, note: "在社区帮到了别人" });
    rewarded = result.awarded;
  }
  if (helperId) await notifyCommunity({ userId: helperId, actorId: userId, type: "COMMUNITY_HELPED", communityPostId: post.id, excerpt: postLabel(post) });
  return { status: "RESOLVED" as const, rewarded };
}

async function closePost(post: ActionPost, userId: string) {
  requireAuthor(post, userId);
  if (post.status !== "OPEN") return { status: post.status };
  await db.communityPost.update({ where: { id: post.id }, data: { status: "CLOSED" } });
  return { status: "CLOSED" as const };
}

async function applyToTeam(post: ActionPost, userId: string, roleName: string, message?: string) {
  if (post.stall !== "TEAM" || !post.teamId) throw new CommunityError(400, "INVALID_ACTION");
  if (post.authorId === userId) throw new CommunityError(400, "SELF_ACTION");
  requireActive(post);
  const role = parseRoles(post.roles).find((item) => item.name === roleName);
  if (!role) throw new CommunityError(400, "INVALID_ROLE");
  const [member, accepted] = await Promise.all([
    db.teamMember.findFirst({ where: { teamId: post.teamId, userId, status: "ACTIVE" }, select: { id: true } }),
    db.communityTeamApplication.count({ where: { postId: post.id, role: roleName, status: "ACCEPTED" } }),
  ]);
  if (member) throw new CommunityError(409, "ALREADY_MEMBER");
  if (accepted >= role.slots) throw new CommunityError(409, "ROLE_FULL");
  try {
    const application = await db.communityTeamApplication.create({ data: { postId: post.id, applicantId: userId, role: roleName, message: message || null }, select: { id: true } });
    await notifyCommunity({ userId: post.authorId, actorId: userId, type: "COMMUNITY_APPLICATION", communityPostId: post.id, excerpt: roleName });
    return { applicationId: application.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new CommunityError(409, "ALREADY_APPLIED");
    throw error;
  }
}

async function decideApplication(post: ActionPost, userId: string, applicationId: string, decision: "ACCEPT" | "DECLINE") {
  requireAuthor(post, userId);
  if (post.stall !== "TEAM" || !post.teamId) throw new CommunityError(400, "INVALID_ACTION");
  const teamId = post.teamId;
  const application = await db.communityTeamApplication.findFirst({ where: { id: applicationId, postId: post.id }, select: { id: true, applicantId: true, role: true, status: true } });
  if (!application) throw new CommunityError(404, "NOT_FOUND");
  if (application.status !== "PENDING") throw new CommunityError(409, "APPLICATION_STALE");

  if (decision === "DECLINE") {
    const declined = await db.communityTeamApplication.updateMany({ where: { id: application.id, status: "PENDING" }, data: { status: "DECLINED", decidedAt: new Date() } });
    if (declined.count === 1) await notifyCommunity({ userId: application.applicantId, actorId: userId, type: "COMMUNITY_APPLICATION_DECLINED", communityPostId: post.id, excerpt: postLabel(post) });
    return { status: "DECLINED" as const };
  }

  await requireTeamLead(teamId, userId);
  const roles = parseRoles(post.roles);
  const role = roles.find((item) => item.name === application.role);
  if (!role) throw new CommunityError(400, "INVALID_ROLE");

  const result = await db.$transaction(async (tx) => {
    // 先锁住帖子，两个队长端并发点同意时只有一个能占到最后一个位置。
    await tx.$queryRaw`SELECT id FROM community_posts WHERE id = ${post.id} FOR UPDATE`;
    const accepted = await tx.communityTeamApplication.findMany({ where: { postId: post.id, status: "ACCEPTED" }, select: { role: true } });
    if (accepted.filter((item) => item.role === role.name).length >= role.slots) throw new CommunityError(409, "ROLE_FULL");
    const activeCount = await tx.teamMember.count({ where: { teamId, status: "ACTIVE" } });
    if (activeCount >= TEAM_MEMBER_CAP) throw new CommunityError(409, "TEAM_FULL");
    const updated = await tx.communityTeamApplication.updateMany({ where: { id: application.id, status: "PENDING" }, data: { status: "ACCEPTED", decidedAt: new Date() } });
    if (updated.count !== 1) throw new CommunityError(409, "APPLICATION_STALE");

    const existing = await tx.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: application.applicantId } }, select: { id: true, status: true } });
    if (existing?.status === "ACTIVE") throw new CommunityError(409, "ALREADY_MEMBER");
    const member = existing
      ? await tx.teamMember.update({ where: { id: existing.id }, data: { status: "ACTIVE", role: "MEMBER", joinedAt: new Date() }, select: { id: true } })
      : await tx.teamMember.create({ data: { teamId, userId: application.applicantId, role: "MEMBER", status: "ACTIVE" }, select: { id: true } });
    await tx.auditLog.create({ data: { actorId: userId, action: "TEAM_MEMBER_JOINED", resourceType: "team_member", resourceId: member.id, after: { status: "ACTIVE", role: "MEMBER" }, metadata: { teamId, via: "community_post", postId: post.id, applicationId: application.id } } });

    // 所有角色都招满了，帖子自动收起。
    const vacancies = roleVacancies(roles, [...accepted, { role: role.name }]);
    const full = vacancies.every((item) => item.filled >= item.slots);
    if (full) await tx.communityPost.update({ where: { id: post.id }, data: { status: "RESOLVED", resolvedAt: new Date() } });
    return { status: "ACCEPTED" as const, postStatus: full ? "RESOLVED" as const : "OPEN" as const };
  });
  await notifyCommunity({ userId: application.applicantId, actorId: userId, type: "COMMUNITY_APPLICATION_ACCEPTED", communityPostId: post.id, excerpt: postLabel(post) });
  return result;
}

async function requireAdmin(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") throw new CommunityError(403, "FORBIDDEN");
}

/** 置顶只有管理员能做，用来把每天的官方挑战帖放到推荐频道最上面。摊位会过期，不给置顶。 */
async function pinPost(post: ActionPost, userId: string, pinned: boolean) {
  await requireAdmin(userId);
  if (post.kind === "STALL") throw new CommunityError(400, "INVALID_ACTION");
  await db.communityPost.update({ where: { id: post.id }, data: { pinnedAt: pinned ? new Date() : null } });
  await db.auditLog.create({ data: { actorId: userId, action: pinned ? "COMMUNITY_POST_PINNED" : "COMMUNITY_POST_UNPINNED", resourceType: "community_post", resourceId: post.id } });
  return { pinned };
}

/** 标成官方帖或取消，只有管理员能做。已经发在别的板块的官方帖（比如 Day 03）也能事后补标。 */
async function markOfficial(post: ActionPost, userId: string, official: boolean) {
  await requireAdmin(userId);
  if (post.kind === "STALL") throw new CommunityError(400, "INVALID_ACTION");
  await db.communityPost.update({ where: { id: post.id }, data: { officialAt: official ? new Date() : null } });
  await db.auditLog.create({ data: { actorId: userId, action: official ? "COMMUNITY_POST_OFFICIAL" : "COMMUNITY_POST_UNOFFICIAL", resourceType: "community_post", resourceId: post.id } });
  return { official };
}

async function reportPost(post: ActionPost, userId: string, reason: string, details?: string) {
  if (post.authorId === userId) throw new CommunityError(400, "SELF_ACTION");
  try {
    await db.communityPostReport.create({ data: { postId: post.id, reporterId: userId, reason, details: details || null } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { reported: true, hidden: false };
    throw error;
  }
  const pending = await db.communityPostReport.count({ where: { postId: post.id, status: "PENDING" } });
  const hidden = pending >= REPORTS_TO_HIDE;
  if (hidden) await db.communityPost.update({ where: { id: post.id }, data: { status: "HIDDEN" } });
  await db.auditLog.create({ data: { actorId: userId, action: "COMMUNITY_POST_REPORTED", resourceType: "community_post", resourceId: post.id, metadata: { reason, hidden } } });
  return { reported: true, hidden };
}

export async function runCommunityPostAction(userId: string, postId: string, raw: unknown) {
  const parsed = communityPostActionSchema.safeParse(raw);
  if (!parsed.success) throw new CommunityError(400, "INVALID_INPUT");
  await requireActiveUser(userId);
  const post = await loadPostForAction(postId);
  const input = parsed.data;
  switch (input.action) {
    case "reply": return addReply(post, userId, input.body);
    case "like": return toggleLike(post, userId);
    case "help": return offerHelp(post, userId, input.message);
    case "resolve": return resolvePost(post, userId, input.helperId);
    case "close": return closePost(post, userId);
    case "apply": return applyToTeam(post, userId, input.role, input.message);
    case "decide": return decideApplication(post, userId, input.applicationId, input.decision);
    case "report": return reportPost(post, userId, input.reason, input.details);
    case "pin": return pinPost(post, userId, input.pinned);
    case "official": return markOfficial(post, userId, input.official);
  }
}
