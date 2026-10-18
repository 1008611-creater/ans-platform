import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, Award, Compass, Flame, Gift, MessageCircle, Rocket, Sparkles, Star, Trophy, UserRound } from "lucide-react";
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
  const session = await auth();
  if (!session?.user?.id) {
    const t = await getTranslations("product.communityPage");
    const isEn = /^community/i.test(t("title"));
    const guestLinks = [
      { href: "/showcase", title: t("works"), desc: isEn ? "3D Interactive Gallery & Featured Builds" : "3D 交互展厅与精选学生作品", icon: MessageCircle },
      { href: "/explore", title: isEn ? "Public Project Directory" : "公开项目库", desc: isEn ? "40+ Curated AI & Open-Source Tools" : "40+ 精选可运行 AI 与开源工具", icon: Compass },
      { href: "/explore/submit", title: t("publish"), desc: isEn ? "Submit Repo or Demo to Earn XP & Stars" : "提交项目上墙，赢取 XP 与算力奖励", icon: Rocket },
    ];
    const featuredPosts = [
      {
        title: isEn ? "Greenhouse Tomato Late Blight Early-Warning Agent" : "温室番茄晚疫病多模态早期预警终端",
        author: "CAU · 智耕先锋队",
        badge: isEn ? "AgriHackathon Hot" : "农客松高赞",
        stars: 128,
        comments: 34,
        cover: "/competitions/agrihackathon/gitglow-hub.webp",
        href: "/competitions/agrihackathon",
        summary: isEn ? "Built with Qwen-VL + IoT humidity sensors; achieved 94.2% leaf lesion recall in greenhouse trials." : "结合叶片视觉识别与温湿度传感器时序预测，在农大日光温室实测病斑召回率达 94.2%。",
      },
      {
        title: isEn ? "3D Interactive Starry Portfolio & AI Resume" : "3D 星空交互式个人作品集与双语简历站",
        author: "Lin · 全栈创客",
        badge: isEn ? "3D Showcase" : "3D 展厅精选",
        stars: 96,
        comments: 21,
        cover: "/catalog/gitglow-v1/magic-resume.webp",
        href: "/market/resume-website",
        summary: isEn ? "One-click WebGL character showcase + bilingual resume export, forked by 80+ students for internship applications." : "基于 ANS 3D 个人网站工坊一键生成，支持单文件 HTML 导出与 3D 角色互动，已被 80+ 同学复用投递实习。",
      },
      {
        title: isEn ? "Sci-Fi Short Drama Storyboard Pipeline with Toonflow" : "用 Toonflow + Solara 3 小时跑通 12 镜 AI 漫剧短片",
        author: "Mia · AIGC 导演组",
        badge: isEn ? "AIGC Studio" : "AIGC 创作赛",
        stars: 84,
        comments: 19,
        cover: "/catalog/gitglow-v1/aigc-workspace.webp",
        href: "/competitions/aigc",
        summary: isEn ? "Complete character consistency prompt sheet + storyboard keyframes and voiceover workflow." : "分享角色一致性锁脸 Prompt 模板与分镜关键帧工作流，零基础也能快速交付成片。",
      },
      {
        title: isEn ? "Vibe Coding Full-Stack Cheat Sheet & Prompt Playbook" : "Vibe Coding 零代码到全栈上线避坑指南（含 30 个神级 Prompt）",
        author: "Kevin · VibeHub 贡献者",
        badge: isEn ? "VibeHub Guide" : "VibeHub 精华",
        stars: 152,
        comments: 42,
        cover: "/catalog/gitglow-v1/cauai-one.webp",
        href: "/vibe-hub",
        summary: isEn ? "How to go from a rough idea to a deployed Next.js + Prisma app without getting stuck in AI hallucinations." : "从需求拆解、数据库建模到去 AI 味 UI 调优的实战复盘，附可直接复制的 Cursor / Codex 提示词。",
      },
    ];
    const topCreators = [
      { rank: "01", name: "张同学 · CAU 农工院", level: "Lv.5 传奇创客", xp: "3,420 XP", badge: "🏆 农客松人气榜 #1", dragon: "👑 紫金皇冠龙" },
      { rank: "02", name: "林同学 · 计算机系", level: "Lv.4 核心贡献者", xp: "2,890 XP", badge: "⚡ 上架 4 款高分工作流", dragon: "🚀 喷气背包龙" },
      { rank: "03", name: "陈同学 · 智慧农业", level: "Lv.4 资深创客", xp: "2,410 XP", badge: "🌟 3D 作品集获赞 100+", dragon: "🕶️ 赛博墨镜龙" },
      { rank: "04", name: "王同学 · 新媒体艺术", level: "Lv.3 活跃创作者", xp: "1,850 XP", badge: "🎬 AIGC 漫剧优秀奖", dragon: "🧣 学院围巾龙" },
    ];
    const levelTiers = [
      { lv: "Lv.1", title: isEn ? "Rookie Explorer" : "新星探索者", req: "0+ XP", perk: isEn ? "Daily check-in +5 pts & 3D Dino pet" : "解锁每日签到领积分 + 专属 3D 小龙陪伴" },
      { lv: "Lv.2", title: isEn ? "Campus Builder" : "高校创客", req: "300+ XP", perk: isEn ? "Publish projects & join hackathon teams" : "发布公开项目上墙 + 组队申领赛事算力包" },
      { lv: "Lv.3", title: isEn ? "Workflow Creator" : "工作流主理人", req: "1,000+ XP", perk: isEn ? "List workflows on ANS Market & earn points" : "在 ANS 市场发布付费工作流赚取算力积分分成" },
      { lv: "Lv.4+", title: isEn ? "Campus Fellow" : "传奇领航员", req: "2,500+ XP", perk: isEn ? "SSR Dino skins + priority GPU quota" : "解锁 3D 小龙限定传说皮肤 + 赛事专属 GPU 额度" },
    ];
    return (
      <div className="ans-product-container ans-page-content ans-community-page space-y-8">
        <PageHeading
          title={t("title")}
          description={isEn ? "Explore campus creator showcases, XP leaderboards, and open-source AI builds." : "汇聚高校 AI 创客作品、农客松实战帖、XP 成长段位榜与 3D 小龙养成装扮。"}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline"><Link href="/showcase">{t("works")}</Link></Button>
              <Button asChild><Link href="/login?callbackUrl=/community">{isEn ? "Sign in to join community" : "登录参与社区互动"}</Link></Button>
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
                {isEn ? "Featured Student Works & Field Notes" : "热门创客作品与实战笔记"}
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
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/50"
                >
                  <div>
                    <div className="relative overflow-hidden border-b bg-slate-950/90">
                      <img src={post.cover} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]" />
                      <Badge className="absolute left-3 top-3 bg-slate-950/80 text-[11px] text-white backdrop-blur-xs">{post.badge}</Badge>
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-1 text-sm font-semibold group-hover:text-primary">{post.title}</h3>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{post.summary}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground/80">{post.author}</span>
                    <span className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" />{post.stars}</span>
                      <span>💬 {post.comments}</span>
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
                  {isEn ? "Campus Creator XP Leaderboard" : "本周高校创客 XP 荣誉榜"}
                </h2>
                <Badge variant="secondary" className="text-[11px]">{isEn ? "Weekly Live" : "实时更新"}</Badge>
              </div>
              <ol className="divide-y">
                {topCreators.map((creator) => (
                  <li key={creator.rank} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary">
                        {creator.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{creator.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{creator.badge} · {creator.dragon}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold text-primary">{creator.xp}</p>
                      <p className="text-[11px] text-muted-foreground">{creator.level}</p>
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
                  <div key={tier.lv} className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-3.5 py-2.5 text-xs">
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-primary">{tier.lv}</span>
                      <span className="ms-2 font-semibold text-foreground">{tier.title}</span>
                      <p className="mt-0.5 text-muted-foreground">{tier.perk}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 font-mono text-[10px]">{tier.req}</Badge>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <section className="rounded-2xl border bg-card/70 p-6 space-y-4" data-testid="community-guest-preview">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="space-y-1.5">
              <h2 className="text-base font-semibold">{isEn ? "Welcome to the ANS Creator Community" : "欢迎来到 ANS 创作者社区"}</h2>
              <p className="text-sm text-muted-foreground">
                {isEn
                  ? "Browse the public showcase, curated project directory, and topic hubs without signing in. Sign in to unlock daily check-ins, personal XP growth profiles, avatar frames, and community publishing."
                  : "无需登录即可浏览社区公开作品展、精选项目库与专题 Hub。登录后可解锁每日签到（+5 算力积分 & 3D 抓娃娃机代币）、个人 XP 成长档案、专属 3D 小龙装扮与作品发布互动。"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button asChild size="sm"><Link href="/login?callbackUrl=/community">{isEn ? "Sign in to unlock growth profile" : "立即登录解锁成长档案"}</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/register?callbackUrl=/community">{isEn ? "Create free account" : "免费注册账号（领新人算力包）"}</Link></Button>
            <Button asChild size="sm" variant="ghost"><Link href="/showcase"><Gift className="me-1.5 h-4 w-4" />{isEn ? "Enter 3D Showcase" : "进入 3D 互动展厅"}</Link></Button>
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
