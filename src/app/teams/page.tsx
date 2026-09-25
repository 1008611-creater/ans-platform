import Link from "next/link";
import { Trophy, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listMyTeams } from "@/server/teams/service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateTeamForm } from "@/components/teams/create-team-form";
import { TeamInviteActions } from "@/components/teams/team-invite-actions";

export const metadata = {
  title: "团队与比赛 · ANS",
  description: "组建团队参加 AI / AIGC / 黑客松比赛，领取比赛算力助力。",
};

export const dynamic = "force-dynamic";

const COMPETITION_STATUS: Record<string, { text: string; variant: "default" | "secondary" | "outline" }> = {
  UPCOMING: { text: "即将开始", variant: "outline" },
  ONGOING: { text: "进行中", variant: "default" },
  ENDED: { text: "已结束", variant: "secondary" },
};

const ROLE_LABEL: Record<string, string> = { OWNER: "队长", ADMIN: "管理员", MEMBER: "成员" };

export default async function TeamsPage() {
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const [mine, competitions] = await Promise.all([
    viewerId ? listMyTeams(viewerId) : Promise.resolve({ teams: [], invites: [] }),
    db.competition.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 12,
      select: { id: true, title: true, organizer: true, url: true, status: true, startsAt: true, endsAt: true },
    }),
  ]);

  return (
    <div className="container py-10">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Users className="h-4 w-4" />
          <span>ANS 团队</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">组队参赛，平台给算力</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          我们组织参加北京及全国高校的 AI、AIGC、黑客松赛事。平台负责组队、发放比赛算力包、沉淀作品。
        </p>
      </header>

      <section className="mb-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">我的团队</h2>
          {viewerId ? (
            <CreateTeamForm />
          ) : (
            <Button asChild size="sm">
              <Link href="/login?callbackUrl=/teams">登录后查看</Link>
            </Button>
          )}
        </div>

        {!viewerId ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              登录后可以创建团队、接受邀请并管理成员额度。
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {mine.invites.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">待处理的邀请</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {mine.invites.map((invite) => (
                    <Card key={invite.id} className="border-primary/40">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">
                            <Link href={"/teams/" + invite.team.slug} className="hover:underline">
                              {invite.team.name}
                            </Link>
                          </CardTitle>
                          <Badge variant="outline">{ROLE_LABEL[invite.role] ?? invite.role}</Badge>
                        </div>
                        {invite.team.description ? (
                          <CardDescription className="line-clamp-2">{invite.team.description}</CardDescription>
                        ) : null}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <TeamInviteActions slug={invite.team.slug} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}

            {mine.teams.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  还没有加入团队。创建团队后可邀请同学一起参赛。
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mine.teams.map((m) => (
                  <Card key={m.team.id} className="transition-colors hover:border-primary/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">
                          <Link href={"/teams/" + m.team.slug} className="hover:underline">
                            {m.team.name}
                          </Link>
                        </CardTitle>
                        <Badge variant={m.role === "OWNER" ? "default" : "secondary"}>
                          {ROLE_LABEL[m.role] ?? m.role}
                        </Badge>
                      </div>
                      {m.team.description ? (
                        <CardDescription className="line-clamp-2">{m.team.description}</CardDescription>
                      ) : null}
                    </CardHeader>
                    <CardContent className="space-y-1 pt-0 text-sm text-muted-foreground">
                      <p>{m.team._count.members} 位成员</p>
                      <p>我的团队额度 {m.quotaAllowance} 点 · 已用 {m.quotaUsed} 点</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Trophy className="h-4 w-4" /> 相关比赛
        </h2>

        {competitions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              还没有登记比赛。管理员可在后台录入外部赛事信息。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {competitions.map((c) => {
              const st = COMPETITION_STATUS[c.status] ?? { text: c.status, variant: "outline" as const };
              return (
                <Card key={c.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{c.title}</CardTitle>
                      <Badge variant={st.variant}>{st.text}</Badge>
                    </div>
                    {c.organizer ? (
                      <CardDescription>主办：{c.organizer}</CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardContent className="flex items-center justify-between pt-0">
                    <span className="text-xs text-muted-foreground">
                      {c.startsAt ? c.startsAt.toLocaleDateString("zh-CN") : "待定"}
                      {c.endsAt ? " ~ " + c.endsAt.toLocaleDateString("zh-CN") : ""}
                    </span>
                    {c.url ? (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        赛事详情
                      </a>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
