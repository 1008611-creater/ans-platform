import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, Award, Compass, Flame, Gift, MessageCircle, Rocket, Sparkles, Trophy, UserRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { getGrowthProfile } from "@/server/growth/service";
import { CommunityPanel } from "@/components/community/community-panel";
import { ProfileGrowthPanel } from "@/components/growth/profile-growth-panel";
import { PageHeading } from "@/components/layout/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("product.communityPage");
  return { title: `${t("title")} · ANS`, description: t("description") };
}

export default async function CommunityPage() {
  const [session, locale] = await Promise.all([auth(), getLocale().catch(() => "zh")]);
  if (!session?.user?.id) {
    const t = await getTranslations("product.communityPage");
    const isEn = locale === "en";
    const guestLinks = [
      { href: "/showcase", title: t("works"), desc: isEn ? "3D Interactive Gallery & Featured Builds" : "3D 交互展厅与精选学生作品", icon: MessageCircle },
      { href: "/explore", title: isEn ? "Public Project Directory" : "公开项目库", desc: isEn ? "40+ Curated AI & Open-Source Tools" : "40+ 精选可运行 AI 与开源工具", icon: Compass },
      { href: "/explore/submit", title: t("publish"), desc: isEn ? "Submit Repo or Demo to Earn XP & Stars" : "提交项目上墙，赢取 XP 与算力奖励", icon: Rocket },
    ];
    const featuredPosts = [
      {
        title: isEn ? "Greenhouse Tomato Late Blight Early-Warning Agent" : "温室番茄晚疫病多模态早期预警终端",
        author: isEn ? "AgriHackathon Track" : "智耕黑客松赛道",
        badge: isEn ? "📖 Guide Sample" : "📖 新手参考范例",
        cover: "/competitions/agrihackathon/gitglow-hub.webp",
        href: "/competitions/agrihackathon",
        summary: isEn ? "Reference architecture combining leaf image inspection with greenhouse humidity sensors." : "展示如何结合叶片视觉识别与温湿度传感器数据构建参赛原型，点击可查看农客松参赛指南。",
      },
      {
        title: isEn ? "3D Interactive Starry Portfolio & Bilingual Resume" : "3D 星空交互式个人作品集与双语简历站",
        author: isEn ? "3D Resume Studio" : "3D 简历工坊",
        badge: isEn ? "📖 Guide Sample" : "📖 新手参考范例",
        cover: "/catalog/ans-pro-v1/magic-resume.webp",
        href: "/market/resume-website",
        summary: isEn ? "One-click WebGL character showcase + bilingual resume export for internship applications." : "基于 ANS 3D 个人网站工坊生成，支持单文件 HTML 导出与 3D 角色互动，适合直接改造成求职简历。",
      },
      {
        title: isEn ? "Multimodal Visual & Video Pipeline on Infinite Canvas" : "用 CAUAI 无限画布跑通 12 镜多模态短片",
        author: isEn ? "AIGC Studio" : "AIGC 视觉工坊",
        badge: isEn ? "📖 Guide Sample" : "📖 新手参考范例",
        cover: "/catalog/ans-pro-v1/infinite-canvas.webp",
        href: "/competitions/aigc",
        summary: isEn ? "Character consistency prompt sheet + storyboard keyframes and video workflow." : "提供角色特征锁定 Prompt 模板与分镜关键帧画布工作流，零基础也能按步骤完成短片。",
      },
      {
        title: isEn ? "Vibe Coding Full-Stack Starter Playbook" : "Vibe Coding 零代码到全栈上线实操手册",
        author: isEn ? "VibeHub" : "VibeHub 实训",
        badge: isEn ? "📖 Guide Sample" : "📖 新手参考范例",
        cover: "/catalog/ans-pro-v1/vibephoto.webp",
        href: "/vibe-hub",
        summary: isEn ? "Step-by-step guide from requirement breakdown and schema design to deploying a Next.js app." : "从需求拆解、数据库建模到界面调优的分步实操指南，附可直接复用的开发提示词。",
      },
    ];
    const xpEarnSteps = [
      { step: "01", name: isEn ? "Daily Check-In & Onboarding Survey" : "每日签到与 30 秒新手问卷", reward: "+20~50 XP", desc: isEn ? "Unlock 50 starter compute points + daily claw machine tokens" : "完成问卷立得 50 算力积分，每日签到再领 5 积分与抓娃娃币" },
      { step: "02", name: isEn ? "VibeHub 60s Interactive Reading" : "VibeHub 课程实训阅读满 60 秒", reward: "+25 XP", desc: isEn ? "Learn practical AI workflows while earning compute points" : "边看 AI 实战教程边领 5 算力积分与抓娃娃机代币" },
      { step: "03", name: isEn ? "Publish a Project or Workflow" : "发布公开项目或上架工作流模板", reward: "+100~150 XP", desc: isEn ? "Share your repo in the project directory or list a workflow in the marketplace" : "在公开项目库提交作品或在工具与工作流市场发布模板，获得算力分成" },
      { step: "04", name: isEn ? "AgriHackathon M1–M4 Milestones" : "参与农客松 M1–M4 阶段里程碑", reward: "+100~200 XP", desc: isEn ? "Complete team registration, code snapshot, and showcase wall" : "完成报名、代码存证与作品上墙，累计解锁 60 赛事积分" },
    ];
    const levelTiers = [
      { lv: "Lv.1", title: isEn ? "Rookie Explorer" : "新星探索者", req: "0+ XP", perk: isEn ? "Daily check-in +5 pts & 3D Dino pet" : "解锁每日签到领积分 + 专属 3D 小恐龙陪伴" },
      { lv: "Lv.2", title: isEn ? "Campus Builder" : "高校创客", req: "300+ XP", perk: isEn ? "Publish projects & join hackathon teams" : "发布公开项目上墙 + 组队申领赛事算力包" },
      { lv: "Lv.3", title: isEn ? "Workflow Creator" : "工作流创作者", req: "1,000+ XP", perk: isEn ? "List workflows on ANS Market & earn points" : "在 ANS 市场发布工作流赚取算力积分分成" },
      { lv: "Lv.4+", title: isEn ? "Campus Fellow" : "资深领航员", req: "2,500+ XP", perk: isEn ? "SSR Dino skins + priority GPU quota" : "解锁 3D 小恐龙限定装扮 + 赛事专属算力额度" },
    ];
    return (
      <div className="ans-product-container ans-page-content ans-community-page space-y-8">
        <PageHeading
          title={t("title")}
          description={isEn ? "Explore campus creator guides, XP growth rules, and open-source AI builds." : "浏览高校 AI 创客作品范例、XP 成长段位指南与 3D 小恐龙养成权益。"}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline"><Link href="/showcase">{t("works")}</Link></Button>
              <Button asChild><Link href="/login?callbackUrl=/community">{isEn ? "Sign in to join community" : "登录查看我的真实社区档案"}</Link></Button>
            </div>
          }
        />

        <section className="grid gap-3 sm:grid-cols-3" aria-label={t("participate")}>
          {guestLinks.map(({ href, title, desc, icon: Icon }) => (
            <Link key={href} href={href} className="group flex items-start gap-3.5 rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 motion-reduce:transition-none">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="flex items-center justify-between gap-2 text-sm font-semibold group-hover:text-primary">
                  <span>{title}</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{desc}</p>
              </div>
            </Link>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.55fr_0.95fr]">
          <section className="space-y-4" aria-labelledby="community-featured-heading">
            <div className="flex items-center justify-between gap-2">
              <h2 id="community-featured-heading" className="flex items-center gap-2 text-lg font-semibold">
                <Flame className="h-5 w-5 text-orange-500" aria-hidden="true" />
                {isEn ? "📖 Community Post & Project Examples" : "📖 社区作品与参赛参考范例"}
              </h2>
              <Link href="/explore" className="text-xs font-medium text-primary hover:underline">
                {isEn ? "View all 40+ projects →" : "查看全部 40+ 精选项目 →"}
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {featuredPosts.map((post) => (
                <Link
                  key={post.title}
                  href={post.href}
                  title={post.summary}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/50"
                >
                  <div>
                    <div className="relative overflow-hidden border-b bg-slate-950/90">
                      <img src={post.cover} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]" />
                      <Badge className="absolute left-3 top-3 bg-slate-950/80 text-[11px] text-white backdrop-blur-xs">{post.badge}</Badge>
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-1 text-sm font-semibold group-hover:text-primary">{post.title}</h3>
                      <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground group-hover:line-clamp-2">{post.summary}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground/80">{post.author}</span>
                    <span className="font-medium text-primary group-hover:underline">
                      {isEn ? "Open Guide →" : "查看详情 →"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-2xl border bg-card p-5 space-y-4" aria-labelledby="community-leaderboard-heading">
              <div className="flex items-center justify-between gap-2">
                <h2 id="community-leaderboard-heading" className="flex items-center gap-2 text-base font-semibold">
                  <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  {isEn ? "📖 How to Earn XP & Compute Points" : "📖 社区经验值 (XP) 获取指南"}
                </h2>
                <Badge variant="secondary" className="text-[11px]">{isEn ? "Onboarding Guide" : "新手必读"}</Badge>
              </div>
              <ol className="divide-y">
                {xpEarnSteps.map((item) => (
                  <li key={item.step} title={item.desc} className="group flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary">
                        {item.step}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="hidden truncate text-xs text-muted-foreground group-hover:block">{item.desc}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold text-primary">{item.reward}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-2xl border bg-card p-5 space-y-3.5" aria-labelledby="community-tiers-heading">
              <h2 id="community-tiers-heading" className="flex items-center gap-2 text-base font-semibold">
                <Award className="h-4 w-4 text-primary" aria-hidden="true" />
                {isEn ? "Creator Growth & 3D Dino Perks" : "创客成长段位与权益"}
              </h2>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
                {levelTiers.map((tier) => (
                  <div key={tier.lv} title={tier.perk} className="group flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-3.5 py-2.5 text-xs">
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-primary">{tier.lv}</span>
                      <span className="ms-2 font-semibold text-foreground">{tier.title}</span>
                      <p className="mt-0.5 hidden text-muted-foreground group-hover:block">{tier.perk}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 font-mono text-[10px]">{tier.req}</Badge>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <section className="flex flex-col justify-between gap-3 rounded-2xl border bg-card/70 px-5 py-4 sm:flex-row sm:items-center" data-testid="community-guest-preview">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold">{isEn ? "Sign in to unlock daily check-ins, XP profile, and 3D Dino perks" : "登录后解锁每日签到、个人 XP 成长档案与作品发布互动"}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm"><Link href="/login?callbackUrl=/community">{isEn ? "Sign in" : "立即登录"}</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/register?callbackUrl=/community">{isEn ? "Create account" : "免费注册"}</Link></Button>
            <Button asChild size="sm" variant="ghost"><Link href="/showcase"><Gift className="me-1.5 h-4 w-4" />{isEn ? "3D Showcase" : "3D 展厅"}</Link></Button>
          </div>
        </section>
      </div>
    );
  }
  const [growth, t] = await Promise.all([
    getGrowthProfile(session.user.id),
    getTranslations("product.communityPage"),
  ]);
  if (!growth) notFound();
  const links = [
    { href: "/showcase", title: t("works"), icon: MessageCircle },
    { href: `/@${encodeURIComponent(session.user.username)}`, title: t("profile"), icon: UserRound },
    { href: "/explore/submit", title: t("publish"), icon: Rocket },
  ];

  return (
    <div className="ans-product-container ans-page-content ans-community-page space-y-8">
      <PageHeading title={t("title")}
        actions={<Button asChild variant="outline"><Link href="/workspace">{t("workspace")}</Link></Button>} />
      <AccountContentBoundary actorId={session.user.id}>
        <section className="grid gap-2 sm:grid-cols-3" aria-label={t("participate")}>
          {links.map(({ href, title, icon: Icon }) => <Link key={href} href={href} className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 motion-reduce:transition-none">
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="flex flex-1 items-center justify-between gap-2 font-semibold">{title}<ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /></h2>
          </Link>)}
        </section>
        <ProfileGrowthPanel key={session.user.id} actorId={session.user.id} editable showActivity={false} avatarFallback={(session.user.username ?? "A").charAt(0)} user={{ ...growth, checkedInToday: growth.checkIns.some(record => record.day === growth.growthDay) }} />
        <CommunityPanel key={`${session.user.id}:${growth.xp}:${growth.checkIns[0]?.id ?? "none"}`} actorId={session.user.id} showGrowth={false} />
      </AccountContentBoundary>
    </div>
  );
}
