import Link from "next/link";
import { Trophy, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "团队与比赛 · ANS",
  description: "组建团队参加 AI / AIGC / 黑客松比赛，领取比赛算力助力。",
};

const COMPETITION_STATUS: Record<string, { text: string; variant: "default" | "secondary" | "outline" }> = {
  UPCOMING: { text: "即将开始", variant: "outline" },
  ONGOING: { text: "进行中", variant: "default" },
  ENDED: { text: "已结束", variant: "secondary" },
};

export default async function TeamsPage() {
  const session = await auth();

  const [teams, competitions] = await Promise.all([
    session?.user?.id
      ? db.teamMember.findMany({
          where: { userId: session.user.id, status: "ACTIVE" },
          select: {
            role: true,
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                _count: { select: { members: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    db.competition.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 12,
      select: {
        id: true,
        title: true,
        organizer: true,
        url: true,
        status: true,
        startsAt: true,
        endsAt: true,
      },
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

      {/* 我的团队 */}
      <section className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">我的团队</h2>
          {session?.user?.id ? (
            <Button size="sm" disabled variant="outline">
              创建团队（即将开放）
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/login?callbackUrl=/teams">登录后查看</Link>
            </Button>
          )}
        </div>

        {!session?.user?.id ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              登录后可以查看并管理你的团队。
            </CardContent>
          </Card>
        ) : teams.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              还没有加入团队。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((m) => (
              <Card key={m.team.id} className="transition-colors hover:border-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      <Link href={`/teams/${m.team.slug}`} className="hover:underline">
                        {m.team.name}
                      </Link>
                    </CardTitle>
                    <Badge variant={m.role === "OWNER" ? "default" : "secondary"}>
                      {m.role === "OWNER" ? "队长" : m.role === "ADMIN" ? "管理员" : "成员"}
                    </Badge>
                  </div>
                  {m.team.description ? (
                    <CardDescription className="line-clamp-2">{m.team.description}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {m.team._count.members} 位成员
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 比赛 */}
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
                      {c.endsAt ? ` ~ ${c.endsAt.toLocaleDateString("zh-CN")}` : ""}
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
