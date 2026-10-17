import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeading } from "@/components/layout/page-heading";
import { Trophy } from "lucide-react";
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

const COMPETITION_STATUS: Record<string, { zh: string; en: string; variant: "default" | "secondary" | "outline" }> = {
  UPCOMING: { zh: "即将开始", en: "Upcoming", variant: "outline" },
  ONGOING: { zh: "进行中", en: "Ongoing", variant: "default" },
  ENDED: { zh: "已结束", en: "Ended", variant: "secondary" },
};

const ROLE_LABEL: Record<string, { zh: string; en: string }> = {
  OWNER: { zh: "队长", en: "Owner" },
  ADMIN: { zh: "管理员", en: "Admin" },
  MEMBER: { zh: "成员", en: "Member" },
};

export default async function TeamsPage() {
  const [session, p, locale] = await Promise.all([auth(), getTranslations("product"), getLocale()]);
  const isEn = locale.startsWith("en");
  const viewerId = session?.user?.id ?? null;
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "ADMIN";

  const [mine, competitions] = await Promise.all([
    viewerId ? listMyTeams(viewerId) : Promise.resolve({ teams: [], invites: [] }),
    db.competition.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 12,
      select: { id: true, title: true, organizer: true, url: true, status: true, startsAt: true, endsAt: true },
    }),
  ]);

  return (
    <div className="ans-product-container ans-page-content ans-teams-page">
      <PageHeading
        eyebrow={isEn ? "ANS Teams" : "ANS 团队"}
        title={isEn ? "Team Up & Claim Competition Compute" : "组队参赛，平台给算力"}
        description={
          isEn
            ? "Join campus AI, AIGC, and hackathon competitions across universities. Form teams, claim shared compute grants, and ship real projects."
            : "我们组织参加北京及全国高校的 AI、AIGC、黑客松赛事。平台负责组队、发放比赛算力包、沉淀作品。"
        }
        actions={<Button asChild variant="outline"><Link href="/competitions">{p("nav.competitions")}</Link></Button>}
      />

      <section className="mb-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{isEn ? "My Teams" : "我的团队"}</h2>
          {viewerId ? (
            <CreateTeamForm />
          ) : (
            <Button asChild size="sm">
              <Link href="/login?callbackUrl=/teams">{isEn ? "Sign in to view" : "登录后查看"}</Link>
            </Button>
          )}
        </div>

        {!viewerId ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {isEn
                ? "Sign in to create a team, accept invitations, and manage member compute allowances."
                : "登录后可以创建团队、接受邀请并管理成员额度。"}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {mine.invites.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">{isEn ? "Pending Invitations" : "待处理的邀请"}</h3>
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
                          <Badge variant="outline">
                            {isEn ? ROLE_LABEL[invite.role]?.en ?? invite.role : ROLE_LABEL[invite.role]?.zh ?? invite.role}
                          </Badge>
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
                  {isEn
                    ? "You haven't joined any team yet. Create a team to invite teammates and compete together."
                    : "还没有加入团队。创建团队后可邀请同学一起参赛。"}
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
                          {isEn ? ROLE_LABEL[m.role]?.en ?? m.role : ROLE_LABEL[m.role]?.zh ?? m.role}
                        </Badge>
                      </div>
                      {m.team.description ? (
                        <CardDescription className="line-clamp-2">{m.team.description}</CardDescription>
                      ) : null}
                    </CardHeader>
                    <CardContent className="space-y-1 pt-0 text-sm text-muted-foreground">
                      <p>{isEn ? `${m.team._count.members} members` : `${m.team._count.members} 位成员`}</p>
                      <p>
                        {isEn
                          ? `Team allowance ${m.quotaAllowance} pts · Used ${m.quotaUsed} pts`
                          : `我的团队额度 ${m.quotaAllowance} 点 · 已用 ${m.quotaUsed} 点`}
                      </p>
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
          <Trophy className="h-4 w-4" /> {isEn ? "Partner & Campus Competitions" : "相关比赛"}
        </h2>

        {competitions.length === 0 ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Card className="overflow-hidden border-border/80 transition-colors hover:border-primary/50">
              <img src="/catalog/agrihackathon-v1/gitglow-hub.webp" alt="" loading="lazy" className="aspect-[16/9] w-full border-b object-cover object-top" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{isEn ? "AgriHackathon · Smart Agriculture Challenge" : "智耕黑客松 · 现代农业 AI 挑战赛"}</CardTitle>
                  <Badge>{isEn ? "Ongoing" : "进行中"}</Badge>
                </div>
                <CardDescription>
                  {isEn ? "Form a campus team, claim shared compute points, and build on real agricultural datasets." : "组队申领团队算力池，围绕温室传感、农情病虫害与智慧农机数据集交付真实可验证作品。"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild variant="outline" size="sm">
                  <Link href="/competitions/agrihackathon">{isEn ? "Enter AgriHackathon →" : "进入智耕黑客松 →"}</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-border/80 transition-colors hover:border-primary/50">
              <img src="/catalog/gitglow-v1/aigc-workspace.webp" alt="" loading="lazy" className="aspect-[16/9] w-full border-b object-cover object-top" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{isEn ? "AIGC Creative Track · Storyboard & Drama" : "AIGC 创作赛道 · 短剧分镜与多模态工坊"}</CardTitle>
                  <Badge variant="secondary">{isEn ? "Open" : "常驻开放"}</Badge>
                </div>
                <CardDescription>
                  {isEn ? "Connect Solara Canvas, Plane project tracking, and Toonflow script-to-video pipelines." : "直连 Solara 无限画布、Plane 团队排期与 Toonflow 漫剧流水线，一站式沉淀参赛作品集。"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild variant="outline" size="sm">
                  <Link href="/competitions/aigc">{isEn ? "Enter AIGC Studio →" : "进入 AIGC 赛事工坊 →"}</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {competitions.map((c) => {
              const st = COMPETITION_STATUS[c.status] ?? { zh: c.status, en: c.status, variant: "outline" as const };
              return (
                <Card key={c.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{c.title}</CardTitle>
                      <Badge variant={st.variant}>{isEn ? st.en : st.zh}</Badge>
                    </div>
                    {c.organizer ? (
                      <CardDescription>{isEn ? `Organizer: ${c.organizer}` : `主办：${c.organizer}`}</CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardContent className="flex items-center justify-between pt-0">
                    <span className="text-xs text-muted-foreground">
                      {c.startsAt ? c.startsAt.toLocaleDateString(isEn ? "en-US" : "zh-CN") : isEn ? "TBD" : "待定"}
                      {c.endsAt ? " ~ " + c.endsAt.toLocaleDateString(isEn ? "en-US" : "zh-CN") : ""}
                    </span>
                    {c.url ? (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        {isEn ? "Event details" : "赛事详情"}
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
