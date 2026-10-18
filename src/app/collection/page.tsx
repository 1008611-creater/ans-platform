import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FavoriteListItem } from "@/components/favorites/favorite-list-item";
import { auth } from "@/lib/auth";
import { listFavorites } from "@/server/favorites/service";

export const dynamic = "force-dynamic";
export async function generateMetadata() { const t = await getTranslations("favorites"); return { title: `${t("title")} · ANS`, description: t("description") }; }
export default async function CollectionPage() {
  const session = await auth();
  const accountId = session?.user?.id;
  const [t, locale] = await Promise.all([getTranslations("favorites"), getLocale()]);
  const isEn = locale.startsWith("en");
  if (!accountId) {
    const curatedPicks = [
      {
        title: isEn ? "3D Interactive Resume & Portfolio Studio" : "3D 交互式双语简历与作品集工作坊",
        tag: isEn ? "Career Must-Have" : "求职必藏",
        cover: "/catalog/gitglow-v1/magic-resume.webp",
        href: "/market/resume-website",
        desc: isEn ? "Turn GitHub repos and coursework into a standalone 3D portfolio website in 3 minutes." : "3 分钟将 GitHub 仓库与课程项目转化为可独立导出的 3D 个人作品集网站。",
      },
      {
        title: isEn ? "CAU AgriHackathon · Smart Agriculture Hub" : "中国农大智耕黑客松 · 现代农业 AI 挑战赛",
        tag: isEn ? "¥3,300 Prize Pool" : "¥3,300 奖池",
        cover: "/competitions/agrihackathon/gitglow-hub.webp",
        href: "/competitions/agrihackathon",
        desc: isEn ? "Claim up to 750 team compute points and build verifiable agricultural AI solutions." : "组队申领最高 750 算力积分，围绕智慧水肥、病虫害早筛与畜牧巡检提交 SHA-256 存证作品。",
      },
      {
        title: isEn ? "3D Claw Machine & Dragon Stage" : "3D 太空抓娃娃机与小龙养成展台",
        tag: isEn ? "Free Compute Points" : "免费算力积分",
        cover: "/catalog/gitglow-v1/ans-3d-showcase.svg",
        href: "/workspace/benefits",
        desc: isEn ? "Complete the 30s survey for 50 points and use the 3D claw machine to claim 10–1,000 points." : "完成 30 秒问卷领 50 积分，操纵 3D 机械臂每次必得 10~1000 积分并解锁小龙装扮。",
      },
      {
        title: isEn ? "AIGC Storyboard & Toonflow Drama Studio" : "AIGC 漫剧分镜与多模态创作工坊",
        tag: isEn ? "AIGC Studio" : "多模态创作",
        cover: "/catalog/gitglow-v1/aigc-workspace.webp",
        href: "/competitions/aigc",
        desc: isEn ? "Infinite canvas + script-to-video pipeline for campus creators." : "直连 Solara 无限画布与 Toonflow 漫剧流水线，一站式完成剧本分镜与视频生成。",
      },
    ];
    return (
      <div className="ans-product-shell" data-testid="collection-guest-preview">
        <div className="ans-product-container max-w-5xl space-y-8 py-10 sm:py-14">
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-6 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                ANS / COLLECTION
              </p>
              <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
                <Bookmark className="h-6 w-6 text-emerald-500" aria-hidden="true" />
                {t("title")}
              </h1>
              <p className="text-sm text-muted-foreground">{t("loginNote")}</p>
            </div>
            <Button asChild className="shrink-0 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500">
              <Link href="/login?callbackUrl=%2Fcollection">{t("login")} →</Link>
            </Button>
          </div>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              {isEn ? "📖 Onboarding Guide: Recommended Starter Pages" : "📖 新手引导：推荐优先体验并收藏的 4 个核心入口"}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {curatedPicks.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.href}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden border-b bg-muted">
                    <img src={item.cover} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    <span className="absolute bottom-2.5 left-3 rounded-full bg-black/75 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                      {item.tag}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{item.title}</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                    </div>
                    <span className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {isEn ? "Launch Now →" : "立即进入 →"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  const favorites = await listFavorites(accountId, 100, undefined, locale);
  return <div className="ans-product-shell"><div className="ans-product-container max-w-4xl space-y-8 py-10 sm:py-14"><header className="space-y-3"><p className="ans-eyebrow">ANS / COLLECTION</p><h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl"><Bookmark className="h-7 w-7" aria-hidden="true" />{t("title")}</h1><p className="text-sm leading-7 text-muted-foreground">{t("description")}</p></header>{favorites.length === 0 ? <div className="space-y-6 rounded-2xl border border-dashed p-8 text-center sm:p-12"><p className="text-muted-foreground">{t("empty")}</p><div className="flex flex-wrap justify-center gap-3"><Button asChild className="rounded-full"><Link href="/explore">{t("explore")}</Link></Button><Button asChild variant="outline" className="rounded-full"><Link href="/hubs">{t("hubs")}</Link></Button></div></div> : <div className="space-y-4">{favorites.map(favorite => <FavoriteListItem key={`${accountId}:${favorite.targetType}:${favorite.targetId}`} accountId={accountId} {...favorite} />)}</div>}</div></div>;
}
