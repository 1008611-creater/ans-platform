import { db } from "@/lib/db";

/**
 * 首页与发现页的内容查询。
 *
 * `CONSTRAINTS.md` 规定组件层不得直接访问 Prisma，因此「精选 / 今日最多赞 /
 * 最新 / 最近更新 / 贡献最多」这五组列表的查询与归一化集中在这里，
 * 组件只负责渲染。查询条件与原实现保持一致。
 */

const promptInclude = {
  author: {
    select: { id: true, name: true, username: true, avatar: true, verified: true },
  },
  category: {
    include: {
      parent: {
        select: { id: true, name: true, slug: true },
      },
    },
  },
  tags: {
    include: { tag: true },
  },
  contributors: {
    select: { id: true, username: true, name: true, avatar: true },
  },
  _count: {
    select: {
      votes: true,
      contributors: true,
      outgoingConnections: { where: { label: { not: "related" } } },
      incomingConnections: { where: { label: { not: "related" } } },
    },
  },
};

export async function getDiscoverySections(limit: number) {
  // 今日零点用于筛选「今天被赞过」的内容。
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [featuredPromptsRaw, todaysMostUpvotedRaw, latestPromptsRaw, recentlyUpdatedRaw, mostContributedRaw] =
    await Promise.all([
      db.prompt.findMany({
        where: {
          isPrivate: false,
          isUnlisted: false,
          deletedAt: null,
          isFeatured: true,
        },
        orderBy: { featuredAt: "desc" },
        take: limit,
        include: promptInclude,
      }),
      // 今日最多赞：只统计今天的投票，按票数排序。
      db.prompt.findMany({
        where: {
          isPrivate: false,
          isUnlisted: false,
          deletedAt: null,
          votes: {
            some: {
              createdAt: {
                gte: today,
              },
            },
          },
        },
        orderBy: {
          votes: {
            _count: "desc",
          },
        },
        take: limit,
        include: promptInclude,
      }),
      db.prompt.findMany({
        where: {
          isPrivate: false,
          isUnlisted: false,
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: promptInclude,
      }),
      db.prompt.findMany({
        where: {
          isPrivate: false,
          isUnlisted: false,
          deletedAt: null,
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        include: promptInclude,
      }),
      db.prompt.findMany({
        where: {
          isPrivate: false,
          isUnlisted: false,
          deletedAt: null,
        },
        orderBy: {
          contributors: {
            _count: "desc",
          },
        },
        take: limit,
        include: promptInclude,
      }),
    ]);

  const mapPrompt = (p: (typeof featuredPromptsRaw)[number]) => ({
    ...p,
    voteCount: p._count?.votes ?? 0,
    contributorCount: p._count?.contributors ?? 0,
    contributors: p.contributors,
  });

  return {
    featuredPrompts: featuredPromptsRaw.map(mapPrompt),
    todaysMostUpvoted: todaysMostUpvotedRaw.map(mapPrompt),
    latestPrompts: latestPromptsRaw.map(mapPrompt),
    recentlyUpdated: recentlyUpdatedRaw.map(mapPrompt),
    mostContributed: mostContributedRaw.map(mapPrompt),
  };
}