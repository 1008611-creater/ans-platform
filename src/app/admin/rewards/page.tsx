import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getRewardAdminOverview } from "@/server/rewards/service";
import { RewardGovernancePanel } from "@/components/admin/reward-governance-panel";

export const dynamic = "force-dynamic";

export default async function AdminRewardsPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/");
  const overview = await getRewardAdminOverview(session.user.id);
  return <main className="container space-y-7 py-8"><Link href="/admin/competitions" className="text-sm text-muted-foreground">← 赛事管理</Link><header><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">ANS · CREATOR REWARDS</p><h1 className="mt-2 text-3xl font-bold">创作者奖励治理</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">配置社区贡献奖励，处理用户申诉，并对可疑发放进行留痕复核。</p></header><RewardGovernancePanel initial={overview}/></main>;
}
