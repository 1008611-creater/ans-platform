import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { getPublicDisplayName } from "@/lib/public-identity";

// Cache leaderboard data for 1 hour (3600 seconds)
const getLeaderboard = unstable_cache(
  async (period: string) => {
    // Calculate date filters
    const now = new Date();
    let dateFilter: Date | undefined;

    if (period === "week") {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Use database aggregation instead of loading all data into memory
    // Group votes by prompt author to get total upvotes per user
    const votesByAuthor = await db.promptVote.groupBy({
      by: ["promptId"],
      where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined,
      _count: { promptId: true },
    });

    // Get prompt author mapping for voted prompts only
    const votedPromptIds = votesByAuthor.map((v) => v.promptId);
    const promptAuthors = await db.prompt.findMany({
      where: {
        id: { in: votedPromptIds },
        author: { deletedAt: null, flagged: false },
        isPrivate: false,
        deletedAt: null,
      },
      select: {
        id: true,
        authorId: true,
      },
    });

    const promptToAuthor = new Map(promptAuthors.map((p) => [p.id, p.authorId]));

    // Aggregate votes by author
    const authorVoteCounts = new Map<string, number>();
    for (const vote of votesByAuthor) {
      const authorId = promptToAuthor.get(vote.promptId);
      if (authorId) {
        authorVoteCounts.set(authorId, (authorVoteCounts.get(authorId) || 0) + vote._count.promptId);
      }
    }

    // 有效用户按得票取前20名，过滤已在聚合前完成。
    const topAuthorIds = Array.from(authorVoteCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id]) => id);

    // Fetch user details and prompt counts for top users
    const topUsers = await db.user.findMany({
      where: { id: { in: topAuthorIds }, deletedAt: null, flagged: false },
      select: {
        id: true,
        nickname: true,
        username: true,
        avatar: true,
        _count: {
          select: {
            prompts: {
              where: {
                isPrivate: false,
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    // Build leaderboard with vote counts
    let leaderboard = topUsers
      .map((user) => ({
        id: user.id,
        name: getPublicDisplayName(user),
        username: user.username,
        avatar: user.avatar,
        totalUpvotes: authorVoteCounts.get(user.id) || 0,
        promptCount: user._count.prompts,
      }))
      .sort((a, b) => b.totalUpvotes - a.totalUpvotes)
      .slice(0, 20);

    const MIN_USERS = 10;

    // If less than 10 users, fill with users who have most prompts
    if (leaderboard.length < MIN_USERS) {
      const existingUserIds = new Set(leaderboard.map((u) => u.id));

      const usersWithPrompts = await db.user.findMany({
        where: {
          id: { notIn: Array.from(existingUserIds) },
          deletedAt: null,
          flagged: false,
          prompts: {
            some: {
              isPrivate: false,
              deletedAt: null,
              ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
            },
          },
        },
        select: {
          id: true,
          nickname: true,
          username: true,
          avatar: true,
          _count: {
            select: {
              prompts: {
                where: {
                  isPrivate: false,
                  deletedAt: null,
                  ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
                },
              },
            },
          },
        },
        orderBy: {
          prompts: {
            _count: "desc",
          },
        },
        take: MIN_USERS - leaderboard.length,
      });

      const additionalUsers = usersWithPrompts.map((user) => ({
        id: user.id,
        name: getPublicDisplayName(user),
        username: user.username,
        avatar: user.avatar,
        totalUpvotes: 0,
        promptCount: user._count.prompts,
      }));

      leaderboard = [...leaderboard, ...additionalUsers];
    }

    return { period, leaderboard };
  },
  ["leaderboard-public-identity-v2"],
  { tags: ["leaderboard"], revalidate: 3600 } // Cache for 1 hour
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all"; // all, month, week

    const result = await getLeaderboard(period);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "server_error", message: "Something went wrong" },
      { status: 500 }
    );
  }
}
