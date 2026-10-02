import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { CompetitionError, getCompetitionWorkbench, listTeamsForCompetition } from "@/server/competitions/service";
import { CompetitionActions } from "@/components/competitions/competition-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Workbench = Awaited<ReturnType<typeof getCompetitionWorkbench>>;
type TimelineStep = Workbench["timeline"][number];

const stageLabels: Record<string, string> = {
  DISCOVER: "发现赛事", TEAM: "组队", REGISTER: "报名", PROJECT: "创建项目", CREATE: "创作", SUBMIT: "提交作品",
  REVIEW: "等待审核", RESUBMIT: "修改后重提", PUBLISH: "公开授权", SHOWCASE: "作品展示", REWARD: "获得奖励", ENDED: "赛事已结束",
};

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(value) : "未设置";
}

function competitionStatus(status: string) {
  if (status === "ENDED") return "已结束";
  if (status === "ONGOING") return "进行中";
  return "即将开始";
}

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  let workbench: Workbench;
  try {
    workbench = await getCompetitionWorkbench(id, session?.user?.id);
  } catch (error) {
    if (error instanceof CompetitionError && error.status === 404) notFound();
    throw error;
  }
  const teams = session?.user?.id ? await listTeamsForCompetition(session.user.id) : [];
  const competition = workbench.competition;
  const isEnded = competition.status === "ENDED" || workbench.currentStage === "ENDED";

  return (
    <main className="container space-y-8 py-6 sm:py-10">
      <Link href="/competitions" className="text-sm text-muted-foreground underline-offset-4 hover:underline">← 返回赛事列表</Link>
      <section className="grid gap-6 rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-amber-400/10 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2"><Badge>{competitionStatus(competition.status)}</Badge><Badge variant="secondary">{workbench.statusLabel}</Badge></div>
          <h1 className="break-words text-3xl font-bold tracking-tight sm:text-5xl">{competition.title}</h1>
          <p className="max-w-3xl break-words leading-7 text-muted-foreground">{competition.description || "和队友完成创作，提交指定版本接受评审。通过后，作品会展示在 ANS 作品广场。"}</p>
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4"><span className="rounded-full border bg-background/70 px-3 py-1.5">主办方：{competition.organizer || "ANS"}</span><span className="rounded-full border bg-background/70 px-3 py-1.5">奖励：{competition.rewardXp} XP</span><span className="rounded-full border bg-background/70 px-3 py-1.5">参赛队伍：{competition.participantTeams}{competition.maxTeams ? ` / ${competition.maxTeams}` : ""}</span><span className="rounded-full border bg-background/70 px-3 py-1.5">截止：{formatDate(competition.endsAt)}</span></div>
          <p className="text-sm text-muted-foreground">完成报名、组队、创作、提交和审核，作品通过后可公开展示并获得可追溯奖励。</p>
        </div>
        <div className="flex flex-col gap-2 sm:min-w-56"><Button asChild size="lg" className="min-h-12 whitespace-normal"><Link href={workbench.nextAction.href}>{workbench.nextAction.label} →</Link></Button><p className="max-w-xs text-sm leading-6 text-muted-foreground">{workbench.nextAction.description}</p>{workbench.blocker ? <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">卡点：{workbench.blocker}</p> : null}</div>
      </section>

      <section id="progress" className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-sm text-muted-foreground">我的参赛进度</p><h2 className="text-2xl font-bold">{stageLabels[workbench.currentStage] || workbench.statusLabel}</h2></div><span className="text-sm font-medium">{workbench.progressPercent}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={workbench.progressPercent}><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${workbench.progressPercent}%` }} /></div><ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{workbench.timeline.map((step: TimelineStep, index: number) => { const current = step.stage === workbench.currentStage || (workbench.currentStage === "RESUBMIT" && step.stage === "SUBMIT") || (workbench.currentStage === "PUBLISH" && step.stage === "SHOWCASE"); return <li key={step.stage}><Link href={step.href} aria-current={current ? "step" : undefined} className={`block h-full rounded-xl border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${current ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/50"}`}><div className="flex items-center justify-between gap-2"><span className="font-medium">{step.label}</span><span className="text-xs text-muted-foreground">{step.complete ? "已完成" : current ? "当前步骤" : step.blocked ? "待开始" : `第 ${index + 1} 步`}</span></div></Link></li>; })}</ol></section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]"><Card id="workspace" className="min-w-0"><CardHeader><CardTitle>我的参赛工作区</CardTitle></CardHeader><CardContent className="space-y-4">{!session?.user?.id ? <p className="text-sm leading-6 text-muted-foreground">登录后，这里会显示你的队伍、项目、提交版本、审核意见和奖励。</p> : workbench.team ? <><div className="rounded-xl border p-4"><p className="font-semibold">{workbench.team.name}</p><p className="mt-1 break-words text-sm text-muted-foreground">成员：{workbench.team.members.map((member) => `${member.name}（${member.role === "OWNER" ? "队长" : member.role === "ADMIN" ? "管理员" : "成员"}）`).join("、")}</p></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">当前项目</p>{workbench.project ? <Link className="mt-1 inline-block break-words font-medium text-primary underline-offset-4 hover:underline" href={`/projects/${workbench.project.id}`}>{workbench.project.title}</Link> : <Link className="mt-1 inline-block font-medium text-primary underline-offset-4 hover:underline" href={workbench.nextAction.href}>创建参赛项目 →</Link>}</div><div className="rounded-xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">提交与审核</p><p className="mt-1 font-medium">{workbench.submission ? `${workbench.submission.title} v${workbench.submission.version}` : workbench.participation?.status === "REJECTED" ? "需要修改后重新提交" : "尚未提交作品版本"}</p>{workbench.review?.note ? <p className="mt-2 break-words text-sm text-muted-foreground">审核意见：{workbench.review.note}</p> : null}</div></div><p className="text-sm text-muted-foreground">公开授权：{workbench.publication?.consent ? `已授权（${workbench.publication.status || "等待审核"}）` : "未授权；提交时可选择指定版本公开展示"}</p>{workbench.rewards.length ? <div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="font-semibold">已获得 {workbench.rewards.reduce((sum, reward) => sum + reward.amount, 0)} XP</p><Link className="mt-1 inline-block text-sm text-primary underline-offset-4 hover:underline" href="/workspace">查看奖励来源与账本 →</Link></div> : null}</> : <div className="rounded-xl border border-dashed p-5"><p className="font-medium">你还没有参赛队伍</p><p className="mt-1 text-sm text-muted-foreground">先创建队伍或加入已有队伍，再回来报名。</p><Link className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline" href="/teams">创建或加入队伍 →</Link></div>}</CardContent></Card>
        <Card id="showcase" className="min-w-0"><CardHeader><CardTitle>规则与公开成果</CardTitle></CardHeader><CardContent className="space-y-4"><div><h3 className="font-medium">参赛规则</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{competition.rules || "使用团队项目完成作品，提交具体版本接受评审。公开区域只展示审核通过且获得授权的版本。"}</p></div><div className="border-t pt-4"><h3 className="font-medium">已公开作品</h3>{workbench.publicArtifacts.length ? <ul className="mt-3 space-y-3">{workbench.publicArtifacts.map((artifact) => <li key={artifact.versionId} className="rounded-xl border p-3"><p className="break-words font-medium">{artifact.title} <span className="text-sm text-muted-foreground">v{artifact.version}</span></p><p className="mt-1 text-sm text-muted-foreground">{artifact.teamName} · 已通过审核 · 具体版本已获公开授权</p><Link className="mt-2 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline" href={artifact.href}>查看作品、互动与评审 →</Link></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">通过审核并授权的具体版本会显示在这里，撤回授权后会立即隐藏。</p>}</div></CardContent></Card></section>

      {session?.user?.id && !isEnded ? <section id="actions" className="space-y-3"><div><p className="text-sm text-muted-foreground">参赛操作</p><h2 className="text-xl font-bold">{workbench.nextAction.label}</h2></div><CompetitionActions competitionId={id} teams={teams} entryStatus={workbench.participation?.status ?? null} registeredTeamId={workbench.participation?.teamId ?? null} /></section> : null}
      <section className="grid gap-3 sm:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">评审标准</CardTitle></CardHeader><CardContent className="text-sm leading-6 text-muted-foreground">作品提交后会锁定具体版本，评审结果和修改意见会显示在你的参赛工作区。</CardContent></Card><Card><CardHeader><CardTitle className="text-base">奖励规则</CardTitle></CardHeader><CardContent className="text-sm leading-6 text-muted-foreground">赛事奖励预算为 {competition.rewardXp} XP。审核通过后按贡献快照发放，并保留账本来源。</CardContent></Card></section>
    </main>
  );
}
