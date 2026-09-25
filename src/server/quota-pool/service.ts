import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * 首页免费算力池横幅的数据查询。
 *
 * `CONSTRAINTS.md` 规定组件层不得直接访问 Prisma，因此这里的查询和
 * 「当前用户是否已领取」的判断都放在服务层，组件只接收结果。
 * BigInt 在服务端即转成 Number，避免客户端序列化问题。
 */

export type QuotaPoolBannerState = {
  total: number;
  claimed: number;
  remaining: number;
  percent: number;
  perUserPoints: number;
  exhausted: boolean;
  claimState: "anonymous" | "claimed" | "available";
};

export async function getQuotaPoolBannerState(): Promise<QuotaPoolBannerState | null> {
  const session = await auth();

  const pool = await db.quotaPool.findFirst({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  if (!pool) return null;

  const total = Number(pool.totalPoints);
  const claimed = Number(pool.claimedPoints);
  const remaining = Math.max(0, total - claimed);
  const percent = total > 0 ? Math.min(100, (claimed / total) * 100) : 0;

  let claimState: QuotaPoolBannerState["claimState"] = "available";
  if (!session?.user?.id) {
    claimState = "anonymous";
  } else {
    const me = await db.user.findUnique({
      where: { id: session.user.id },
      select: { quotaClaimedAt: true, quotaPoints: true },
    });
    claimState = me?.quotaClaimedAt ? "claimed" : "available";
  }

  return {
    total,
    claimed,
    remaining,
    percent,
    perUserPoints: Number(pool.perUserPoints),
    exhausted: remaining <= 0,
    claimState,
  };
}