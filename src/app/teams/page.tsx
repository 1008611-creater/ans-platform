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
          <div className="space-y-4" data-testid="teams-guest-preview">
            <Card className="border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
              <CardContent className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    {isEn ? "1–5 Members · Shared Compute" : "1–5 人跨学科组队 · 共享赛事算力池"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {isEn ? "Sign in to create a team and allocate shared points." : "登录后创建战队并分配赛事算力额度（下方为组队分工范例）"}
                  </span>
                </div>
                <Button asChild size="sm" className="shrink-0 rounded-xl">
                  <Link href="/login?callbackUrl=/teams">{isEn ? "Create / Join Team →" : "立即登录建队 →"}</Link>
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  name: isEn ? "Template A · Plant Protection & VLM Team" : "组队范例 A · 农情病虫害多模态识别组",
                  track: isEn ? "AgriHackathon · Crop Disease Track" : "智耕黑客松 · 病虫害早筛赛道",
                  roles: isEn ? "1 Agronomy + 2 CS/AI + 1 Frontend" : "农学/植保 1 人 + 算法/后端 2 人 + 前端 1 人",
                  badge: isEn ? "📖 Team Template" : "📖 组队范例",
                  lookingFor: isEn ? "Typical division: field dataset labeling, Qwen-VL fine-tuning, and mobile web UI." : "分工建议：田间病叶样本整理、多模态模型调用、移动端拍照诊断界面。",
                },
                {
                  name: isEn ? "Template B · Smart Greenhouse & IoT Team" : "组队范例 B · 日光温室水肥智能调控组",
                  track: isEn ? "AgriHackathon · Smart Irrigation Track" : "智耕黑客松 · 智慧水肥赛道",
                  roles: isEn ? "1 Water/Agri Eng + 1 Data + 1 Full-Stack" : "水院/农工 1 人 + 数据建模 1 人 + 全栈 1 人",
                  badge: isEn ? "📖 Team Template" : "📖 组队范例",
                  lookingFor: isEn ? "Typical division: sensor time-series modeling, agent decision rules, and dashboard." : "分工建议：温湿度传感时序分析、滴灌策略生成与可视化大屏展示。",
                },
                {
                  name: isEn ? "Template C · Campus AIGC Short Drama Team" : "组队范例 C · 校园科普漫剧与多模态创作组",
                  track: isEn ? "AIGC Studio · Open Track" : "AIGC 创作工坊 · 常驻赛道",
                  roles: isEn ? "1 Script/Design + 1 Prompt/Video" : "剧本分镜/美术 1 人 + AIGC 视觉工作流 1 人",
                  badge: isEn ? "📖 Team Template" : "📖 组队范例",
                  lookingFor: isEn ? "Typical division: storyboard scripting, character consistency, and video editing." : "分工建议：12 镜分镜脚本设计、角色三视图锁定与配音成片合成。",
                },
              ].map((sample, idx) => (
                <Card key={idx} title={sample.lookingFor} className="group border-border/70 bg-card/90 transition hover:border-primary/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[11px]">{sample.track}</Badge>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{sample.badge}</span>
                    </div>
                    <CardTitle className="pt-1 text-base">{sample.name}</CardTitle>
                    <CardDescription className="hidden text-xs group-hover:block">{sample.lookingFor}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between pt-0 text-xs text-muted-foreground">
                    <span>{sample.roles}</span>
                    <Link href="/login?callbackUrl=/teams" className="shrink-0 font-medium text-primary hover:underline">
                      {isEn ? "Use Template →" : "登录建队 →"}
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
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
            <Card className="group overflow-hidden border-border/80 transition-colors hover:border-primary/50">
              <img src="/competitions/agrihackathon/gitglow-hub.webp" alt="" loading="lazy" className="aspect-[16/9] w-full border-b object-cover object-top" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{isEn ? "AgriHackathon · Smart Agriculture Challenge" : "智耕黑客松 · 现代农业 AI 挑战赛"}</CardTitle>
                  <Badge>{isEn ? "Ongoing" : "进行中"}</Badge>
                </div>
                <CardDescription className="line-clamp-1 group-hover:line-clamp-none">
                  {isEn ? "Form a campus team, claim shared compute points, and build on real agricultural datasets." : "组队申领团队算力池，围绕温室传感、农情病虫害与智慧农机数据集交付真实可验证作品。"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild variant="outline" size="sm">
                  <Link href="/competitions/agrihackathon">{isEn ? "Enter AgriHackathon →" : "进入智耕黑客松 →"}</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="group overflow-hidden border-border/80 transition-colors hover:border-primary/50">
              <img src="/catalog/gitglow-v1/infinite-canvas.webp" alt="" loading="lazy" className="aspect-[16/9] w-full border-b object-cover object-top" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{isEn ? "AIGC Creative Track · Multimodal Canvas" : "AIGC 创作赛道 · 无限画布与多模态工坊"}</CardTitle>
                  <Badge variant="secondary">{isEn ? "Open" : "常驻开放"}</Badge>
                </div>
                <CardDescription className="line-clamp-1 group-hover:line-clamp-none">
                  {isEn ? "Connect CAUAI Infinite Canvas, Plane project tracking, and multimodal video pipelines." : "直连 CAUAI 无限画布、Plane 团队排期与多模态视频流水线，一站式沉淀参赛作品集。"}
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
          <div className="grid gap-5 sm:grid-cols-2">
            {competitions.map((c, idx) => {
              const st = COMPETITION_STATUS[c.status] ?? { zh: c.status, en: c.status, variant: "outline" as const };
              const isAgri = c.title.toLowerCase().includes("agri") || c.title.includes("农") || (c.url ?? "").includes("agrihackathon");
              const fallbackCovers = [
                "/catalog/gitglow-v1/infinite-canvas.webp",
                "/catalog/gitglow-v1/vibephoto.webp",
                "/catalog/gitglow-v1/hermes-agent.webp",
                "/catalog/gitglow-v1/ai-video-services.webp",
              ];
              const coverSrc = isAgri ? "/competitions/agrihackathon/gitglow-hub.webp" : fallbackCovers[idx % fallbackCovers.length];
              const targetHref = c.url || (isAgri ? "/competitions/agrihackathon" : "/competitions/aigc");
              return (
                <Card key={c.id} className="overflow-hidden border-border/80 transition-colors hover:border-primary/50">
                  <Link href={targetHref} className="block overflow-hidden border-b">
                    <img src={coverSrc} alt={c.title} loading="lazy" className="aspect-[16/9] w-full object-cover object-top transition duration-500 hover:scale-105" />
                  </Link>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">
                        <Link href={targetHref} className="hover:underline">{c.title}</Link>
                      </CardTitle>
                      <Badge variant={st.variant}>{isEn ? st.en : st.zh}</Badge>
                    </div>
                    {c.organizer ? (
                      <CardDescription>{isEn ? `Organizer: ${c.organizer}` : `主办：${c.organizer}`}</CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardContent className="flex items-center justify-between pt-0">
                    <span className="text-xs text-muted-foreground">
                      {c.startsAt ? c.startsAt.toLocaleDateString(isEn ? "en-US" : "zh-CN") : isEn ? "Ongoing · Campus Track" : "火热进行中 · 校级认证赛道"}
                      {c.endsAt ? " ~ " + c.endsAt.toLocaleDateString(isEn ? "en-US" : "zh-CN") : ""}
                    </span>
                    <Button asChild variant="outline" size="sm">
                      <Link href={targetHref}>
                        {isEn ? "Enter Competition →" : "进入赛事专区 →"}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            {competitions.length < 2 && (
              <Card className="group overflow-hidden border-border/80 transition-colors hover:border-primary/50">
                <Link href="/competitions/aigc" className="block overflow-hidden border-b">
                  <img src="/catalog/gitglow-v1/infinite-canvas.webp" alt="AIGC Creative Track" loading="lazy" className="aspect-[16/9] w-full object-cover object-top transition duration-500 hover:scale-105" />
                </Link>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">
                      <Link href="/competitions/aigc" className="hover:underline">
                        {isEn ? "AIGC Creative Track · Multimodal Canvas" : "AIGC 创作赛道 · 无限画布与多模态工坊"}
                      </Link>
                    </CardTitle>
                    <Badge variant="secondary">{isEn ? "Open" : "常驻开放"}</Badge>
                  </div>
                  <CardDescription className="line-clamp-1 group-hover:line-clamp-none">
                    {isEn ? "Connect CAUAI Infinite Canvas, Plane project tracking, and multimodal video pipelines." : "直连 CAUAI 无限画布、Plane 团队排期与多模态视频流水线，一站式沉淀参赛作品集。"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between pt-0">
                  <span className="text-xs text-muted-foreground">
                    {isEn ? "Open Year-Round · Compute Subsidized" : "全年常驻开放 · 算力积分补贴"}
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/competitions/aigc">{isEn ? "Enter AIGC Studio →" : "进入 AIGC 赛事工坊 →"}</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
