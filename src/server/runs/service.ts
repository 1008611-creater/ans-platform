import { db } from "@/lib/db";

/** 「我的运行记录」列表：运行历史 + 当前额度余额。 */

const PAGE_SIZE = 20;

export async function listRecentRunsForUser(userId: string) {
  const runs = await db.run.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE,
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

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { quotaPoints: true },
  });

  return { runs, balance: user?.quotaPoints ?? 0 };
}