import Link from "next/link";
import { notFound } from "next/navigation";
import { Coins, Trophy, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { TeamError, getTeamDetail } from "@/lib/team-service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamMemberPanel } from "@/components/teams/team-member-panel";
import { TeamDangerZone } from "@/components/teams/team-danger-zone";

export const dynamic = "force-dynamic";

const COMPETITION_STATUS: Record<string, { text: string; variant: "default" | "secondary" | "outline" }> = {
  UPCOMING: { text: "即将开始", variant: "outline" },
  ONGOING: { text: "进行中", variant: "default" },
  ENDED: { text: "已结束", variant: "secondary" },
};

const RUN_STATUS: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  QUEUED: { text: "排队中", variant: "outline" },
  RUNNING: { text: "运行中", variant: "secondary" },
  SUCCEEDED: { text: "已完成", variant: "default" },
  FAILED: { text: "失败", variant: "destructive" },
  CANCELLED: { text: "已取消", variant: "outline" },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const detail = await getTeamDetail(slug, null);
    return { title: detail.team.name + " · ANS 团队", description: detail.team.description || undefined };
  } catch {
    return { title: "团队 · ANS" };
  }
}

export default async function TeamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  let detail;
  try {
    detail = await getTeamDetail(slug, viewerId);
  } catch (error) {
    if (error instanceof TeamError && error.status === 404) notFound();
    throw error;
  }

  const { team, viewer, members, quota, runs, competitions } = detail;

  return (
    <div className="container max-w-4xl space-y-8 py-10">
      <Link href="/teams" className="text-sm text-primary">返回团队列表</Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
          {viewer.isMember ? <Badge variant="secondary">{viewer.role === "OWNER" ? "队长" : viewer.role === "ADMIN" ? "管理员" : "成员"}</Badge> : null}
        </div>
        {team.description ? <p className="text-muted-foreground">{team.description}</p> : null}
        <p className="text-sm text-muted-foreground">
          队长 {team.owner.nickname || team.owner.username} · {team.memberCount} 位成员
        </p>
      </header>

      {!viewer.isMember && viewerId ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-sm text-muted-foreground">
            你不是该团队成员。团队名单、额度与运行记录仅对成员可见。
          </CardContent>
        </Card>
      ) : null}

      {!viewerId ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-sm text-muted-foreground">
            <Link href={"/login?callbackUrl=/teams/" + slug} className="text-primary underline">登录</Link> 后可查看团队详情与邀请。
          </CardContent>
        </Card>
      ) : null}

      {viewer.isMember && quota ? (
        <section className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>团队已发放额度</CardDescription>
              <CardTitle className="text-2xl">{quota.granted}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>已分配给成员</CardDescription>
              <CardTitle className="text-2xl">{quota.allocated}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>可分配余额</CardDescription>
              <CardTitle className="text-2xl">{quota.available}</CardTitle>
            </CardHeader>
          </Card>
        </section>
      ) : null}

      {viewer.isMember && members ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">成员</h2>
          <TeamMemberPanel
            slug={slug}
            members={members}
            permissions={viewer.permissions}
            viewerId={viewerId ?? ""}
            quotaAvailable={quota?.available ?? 0}
          />
        </section>
      ) : null}

      {viewer.isMember && runs ? (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Coins className="h-4 w-4" /> 团队运行记录</h2>
          {runs.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-8 text-center text-sm text-muted-foreground">团队还没有运行记录。</CardContent></Card>
          ) : (
            <ul className="divide-y rounded-lg border">
              {runs.map((run) => {
                const st = RUN_STATUS[run.status] ?? { text: run.status, variant: "outline" as const };
                return (
                  <li key={run.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                    <span className="flex-1 font-medium">{run.template.title}</span>
                    <span className="text-muted-foreground">{run.user.nickname || run.user.username}</span>
                    <span className="text-muted-foreground">{run.costPoints} 点</span>
                    <Badge variant={st.variant}>{st.text}</Badge>
                    <span className="text-xs text-muted-foreground">{run.createdAt.toLocaleDateString("zh-CN")}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Trophy className="h-4 w-4" /> 参加的比赛</h2>
        {competitions.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-8 text-center text-sm text-muted-foreground">该团队还没有报名比赛。</CardContent></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {competitions.map((entry) => {
              const st = COMPETITION_STATUS[entry.competition.status] ?? { text: entry.competition.status, variant: "outline" as const };
              return (
                <Card key={entry.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{entry.competition.title}</CardTitle>
                      <Badge variant={st.variant}>{st.text}</Badge>
                    </div>
                    {entry.competition.organizer ? <CardDescription>主办：{entry.competition.organizer}</CardDescription> : null}
                  </CardHeader>
                  <CardContent className="pt-0 text-sm text-muted-foreground">
                    比赛额度 {entry.quotaGranted} 点 · 已用 {entry.quotaUsed} 点{entry.frozen ? " · 已冻结" : ""}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {viewer.isMember ? (
        <TeamDangerZone
          slug={slug}
          teamName={team.name}
          canDelete={viewer.permissions.canDeleteTeam}
          canLeave={viewer.role !== "OWNER"}
        />
      ) : null}
    </div>
  );
}
