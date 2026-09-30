import Link from "next/link";
import { listCompetitions } from "@/server/competitions/service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function CompetitionsPage() {
  const competitions = await listCompetitions();
  return <main className="container space-y-8 py-10">
    <header className="max-w-3xl space-y-3"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">ANS · CREATE TOGETHER</p><h1 className="text-4xl font-bold tracking-tight">把 AI 灵感，做成能被看见的作品。</h1><p className="text-muted-foreground">找到赛事、拉起团队、提交明确版本，经过评审后进入作品广场。每一步都有状态，也有下一步提示。</p></header>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{competitions.map((competition) => <Link key={competition.id} href={`/competitions/${competition.id}`} className="group"><Card className="h-full overflow-hidden transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"><div className="h-1.5 bg-gradient-to-r from-primary via-fuchsia-500 to-amber-400"/><CardHeader className="space-y-4"><div className="flex items-center justify-between"><Badge variant={competition.status === "ENDED" ? "secondary" : "default"}>{competition.status === "ENDED" ? "已结束" : competition.status === "ONGOING" ? "进行中" : "即将开始"}</Badge><span className="text-xs text-muted-foreground">{competition._count.teams} 支队伍</span></div><CardTitle className="text-xl leading-snug group-hover:text-primary">{competition.title}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-muted-foreground">{competition.description || "用团队协作完成一个 AI 原生作品，提交指定版本参与评审。"}</p><div className="flex items-center justify-between border-t pt-4 text-sm"><span>{competition.organizer || "ANS 创作者社区"}</span><span className="font-semibold text-primary">{competition.rewardXp} XP 激励</span></div></CardContent></Card></Link>)}</div>
    {competitions.length === 0 ? <Card className="border-dashed"><CardContent className="py-12 text-center"><p className="font-semibold">新赛事正在准备中</p><p className="mt-2 text-sm text-muted-foreground">稍后再来，或先创建项目并邀请队友。</p></CardContent></Card> : null}
  </main>;
}
