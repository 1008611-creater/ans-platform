import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCompetitionAdminOverview } from "@/server/competitions/service";
import { CompetitionAdminPanel } from "@/components/admin/competition-admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminCompetitionsPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/");
  const { competitions, reviewQueue } = await getCompetitionAdminOverview(session.user.id);
  return <main className="container space-y-7 py-8">
    <Link href="/admin" className="text-sm text-muted-foreground">← 管理后台</Link>
    <header><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">ANS · OPERATIONS</p><h1 className="mt-2 text-3xl font-bold">赛事与创作者激励</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">奖励来自赛事配置。审核通过后系统按提交时记录的团队贡献写入 XP 账本，并保留评审和发放记录。</p></header>
    <CompetitionAdminPanel initial={competitions} reviewQueue={reviewQueue}/>
  </main>;
}
