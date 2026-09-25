import { db } from "@/lib/db";

/** 「我的运行记录」列表：运行历史 + 当前额度余额。 */

const DEFAULT_PAGE_SIZE = 20;

export async function listRecentRunsForUser(
  userId: string,
  options: { limit?: number; cursor?: string | null } = {},
) {
  const limit = options.limit ?? DEFAULT_PAGE_SIZE;
  const cursor = options.cursor ?? null;
  const rows = await db.run.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit + 1,
    select: {
      id: true,
      status: true,
      costPoints: true,
      outputText: true,
      error: true,
      createdAt: true,
      finishedAt: true,
      template: { select: { slug: true, title: true } },
    },
  });
  const hasMore = rows.length > limit;
  const runs = hasMore ? rows.slice(0, limit) : rows;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { quotaPoints: true },
  });

  return {
    runs,
    nextCursor: hasMore ? runs[runs.length - 1]?.id ?? null : null,
    balance: user?.quotaPoints ?? 0,
  };
}

export async function getRunForViewer(runId: string, viewer: { id: string; role?: string | null }) {
  return db.run.findFirst({
    where: {
      id: runId,
      ...(viewer.role === "ADMIN" ? {} : { userId: viewer.id }),
    },
    select: {
      id: true,
      status: true,
      outputText: true,
      error: true,
      costPoints: true,
      createdAt: true,
      finishedAt: true,
      template: { select: { slug: true, title: true } },
    },
  });
}
