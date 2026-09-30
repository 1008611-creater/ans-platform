import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCompetition, listTeamsForCompetition } from "@/server/competitions/service";
import { listProjects } from "@/server/projects/service";
import { CompetitionActions } from "@/components/competitions/competition-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  let competition;
  try { competition = await getCompetition(id, session?.user?.id); } catch { notFound(); }
  const teams = session?.user?.id ? await listTeamsForCompetition(session.user.id) : [];
  const projects = session?.user?.id ? await listProjects(session.user.id) : [];
  const submitted = competition.teams.filter((entry) => ["SUBMITTED", "APPROVED"].includes(entry.entryStatus));
  const approved = competition.teams.filter((entry) => entry.entryStatus === "APPROVED");
  return <main className="container grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_390px]">
    <div className="space-y-7">
      <Link href="/competitions" className="text-sm text-muted-foreground hover:text-foreground">← 全部赛事</Link>
      <header className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-fuchsia-500/5 to-amber-400/10 p-6 sm:p-10"><div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl"/><div className="relative space-y-4"><Badge>{competition.status === "ENDED" ? "已结束" : competition.status === "ONGOING" ? "进行中" : "即将开始"}</Badge><h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">{competition.title}</h1><p className="max-w-2xl leading-7 text-muted-foreground">{competition.description || "组队完成作品，提交指定版本接受评审；通过后作品将展示在 ANS 创作广场。"}</p><div className="flex flex-wrap gap-3 text-sm"><span className="rounded-full border bg-background/70 px-3 py-1.5">主办：{competition.organizer || "ANS"}</span><span className="rounded-full border bg-background/70 px-3 py-1.5">奖励预算：{competition.rewardXp} XP</span><span className="rounded-full border bg-background/70 px-3 py-1.5">队伍：{competition.teams.length}{competition.maxTeams ? ` / ${competition.maxTeams}` : ""}</span></div></div></header>
      <section className="grid gap-3 sm:grid-cols-4">{[["01", "组队报名", "团队负责人报名"], ["02", "完成作品", "在项目空间协作"], ["03", "指定提交", "评审锁定版本"], ["04", "公开激励", "通过后展示并记账"]].map(([number, title, caption], index) => <div key={number} className={`rounded-2xl border p-4 ${index < (submitted.length ? 3 : 1) ? "border-primary/30 bg-primary/[0.04]" : "bg-card"}`}><p className="text-xs font-bold tracking-widest text-primary">STEP {number}</p><p className="mt-3 font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{caption}</p></div>)}</section>
      <Card><CardHeader><CardTitle>赛事说明</CardTitle></CardHeader><CardContent className="space-y-4"><p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{competition.rules || "使用团队项目沉淀过程；提交时选择具体作品版本。通过评审且完成公开授权后，版本进入作品广场。"}</p>{competition.startsAt || competition.endsAt ? <p className="text-sm">时间：{competition.startsAt?.toLocaleDateString("zh-CN") ?? "不限"} — {competition.endsAt?.toLocaleDateString("zh-CN") ?? "不限"}</p> : null}</CardContent></Card>
      <section className="space-y-3"><div className="flex items-end justify-between"><div><p className="text-sm text-muted-foreground">参赛进度</p><h2 className="text-2xl font-bold">作品与评审</h2></div><Badge variant="secondary">{approved.length} 件已通过 · {submitted.length} 件已提交</Badge></div><div className="grid gap-3">{competition.teams.map((entry) => <Card key={entry.id}><CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{entry.team.name}</p><p className="mt-1 text-sm text-muted-foreground">{entry.entryStatus === "REGISTERED" ? "已报名 · 等待提交" : entry.entryStatus === "SUBMITTED" ? "已提交 · 等待评审" : entry.entryStatus === "APPROVED" ? "评审通过" : "未通过"}{entry.reviewNote ? ` · ${entry.reviewNote}` : ""}</p></div><div className="flex items-center gap-3">{entry.awardedXp > 0 ? <Badge variant="secondary">+{entry.awardedXp} XP</Badge> : null}{entry.entryStatus === "APPROVED" && entry.submissionVersion ? <Link className="text-sm font-medium text-primary underline-offset-4 hover:underline" href={`/showcase/${entry.submissionVersion.id}`}>查看作品 →</Link> : null}</div></CardContent></Card>)}{competition.teams.length === 0 ? <Card className="border-dashed"><CardContent className="py-8 text-sm text-muted-foreground">还没有队伍报名。创建团队后开启第一份参赛作品。</CardContent></Card> : null}</div></section>
    </div>
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">{session?.user?.id ? <CompetitionActions competitionId={id} teams={teams} projects={projects} /> : <Card><CardHeader><CardTitle>准备参赛？</CardTitle></CardHeader><CardContent><p className="mb-4 text-sm text-muted-foreground">登录后创建或选择团队，和伙伴一起完成作品。</p><Link className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" href={`/login?callbackUrl=/competitions/${id}`}>登录并加入</Link></CardContent></Card>}<Card className="border-primary/20 bg-primary/[0.035]"><CardContent className="space-y-2 py-5"><p className="font-semibold">奖励按团队成员平分</p><p className="text-sm leading-6 text-muted-foreground">赛事预算为 {competition.rewardXp} XP。审核通过后，系统将激励写入每位有效队员的经验账本。</p></CardContent></Card></aside>
  </main>;
}
