import Link from "next/link";
import { Sparkles, Zap } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { QuotaClaimButton } from "@/components/quota-claim-button";

function formatPoints(n: number): string {
  if (n >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(2)} 亿`;
  if (n >= 1_0000) return `${(n / 1_0000).toFixed(1)} 万`;
  return String(n);
}

/**
 * 首页免费算力池横幅（引流钩子）
 * 数据来自 QuotaPool 表中 active 的池子；BigInt 在服务端即转 Number，避免序列化问题。
 */
export async function QuotaPoolBanner() {
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
  const exhausted = remaining <= 0;

  let claimState: "anonymous" | "claimed" | "available" = "available";
  if (!session?.user?.id) {
    claimState = "anonymous";
  } else {
    const me = await db.user.findUnique({
      where: { id: session.user.id },
      select: { quotaClaimedAt: true, quotaPoints: true },
    });
    claimState = me?.quotaClaimedAt ? "claimed" : "available";
  }

  return (
    <section className="border-y bg-gradient-to-r from-primary/[0.06] via-primary/[0.03] to-transparent">
      <div className="container py-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              <span>ANS 免费算力池</span>
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl font-bold tracking-tight">
                {formatPoints(remaining)}
              </span>
              <span className="text-sm text-muted-foreground">
                点剩余 · 总量 {formatPoints(total)} 点
              </span>
            </div>

            <div className="mt-3 max-w-xl">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                <span>已领取 {formatPoints(claimed)} 点</span>
                <span>{percent.toFixed(1)}%</span>
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              注册即可领取{" "}
              <span className="font-medium text-foreground">
                {formatPoints(pool.perUserPoints)} 点
              </span>{" "}
              算力，用于在模板广场直接运行 AI 任务。每人限领一次，领完即止。
            </p>
          </div>

          <div className="shrink-0">
            {exhausted ? (
              <Button disabled variant="outline" size="lg">
                已被领完
              </Button>
            ) : claimState === "anonymous" ? (
              <Button asChild size="lg">
                <Link href="/login">
                  <Zap className="me-2 h-4 w-4" />
                  登录后领取
                </Link>
              </Button>
            ) : claimState === "claimed" ? (
              <Button disabled variant="outline" size="lg">
                已领取
              </Button>
            ) : (
              <QuotaClaimButton points={pool.perUserPoints} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
