import { auth } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PROJECT_CATEGORIES } from "@/domain/catalog/projects";
import { isMarketOfferPurchasable } from "@/domain/marketplace/presentation";
import { listMarketListings } from "@/server/marketplace/listings";
import { MarketFrame } from "@/components/marketplace/frame";
import { MarketOfferCard } from "@/components/marketplace/offer-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const OFFICIAL_WORKFLOW_CARDS = [
  {
    slug: "resume-website",
    title: "AI 双语简历独立站工作台",
    summary: "填写经历或上传旧简历，实时预览并一键导出单文件 HTML 简历站。",
    cover: "/catalog/ans-pro-v1/magic-resume.webp",
    badge: "🚀 在线即跑 · 免费排版",
    href: "/market/resume-website",
  },
  {
    slug: "toonflow",
    title: "Toonflow AI 漫剧分镜工作流",
    summary: "输入故事梗概，自动拆解角色设定、分镜画面提示词与台词脚本。",
    cover: "/catalog/ans-pro-v1/infinite-canvas.webp",
    badge: "🚀 在线即跑 · 漫剧分镜",
    href: "/workflows/toonflow",
  },
  {
    slug: "hypit",
    title: "Hypit 社媒爆款选题与脚本引擎",
    summary: "针对小红书/B站/X 提炼高点击标题、黄金前3秒钩子与正文结构。",
    cover: "/catalog/ans-pro-v1/code2prompt.webp",
    badge: "🚀 在线即跑 · 增长文案",
    href: "/workflows/hypit",
  },
  {
    slug: "easel",
    title: "无限画布 · 官方 AIGC 创作者平台",
    summary: "直连拍我AI (PixVerse V6/C1/Kling 4.0) 与火山 Seedance 2.5 视频算力池，统一共享 ANS 积分。",
    cover: "/catalog/ans-pro-v1/astro-starlight.webp",
    badge: "🎬 拍我+火山 · 无限画布",
    href: "/workflows/easel",
  },
] as const;

export const dynamic = "force-dynamic";
export async function generateMetadata() { const t = await getTranslations("product.market"); return { title: t("title"), description: t("body") }; }
export default async function MarketPage({ searchParams }: { searchParams: Promise<{ category?: string; subcategory?: string; q?: string; fulfillment?: string }> }) {
  const session = await auth();
  const [query, offers, t, tp, p] = await Promise.all([searchParams, listMarketListings(undefined, session?.user?.id), getTranslations("product.market"), getTranslations("product.marketProject"), getTranslations("product")]);
  const w = await getTranslations("marketWorkflow");
  const category = PROJECT_CATEGORIES.find((item) => item.id === query.category); const subcategory = category?.children.find((item) => item === query.subcategory);
  const q = typeof query.q === "string" ? query.q.slice(0, 200) : ""; const kind = query.fulfillment === "service" || query.fulfillment === "resource" || query.fulfillment === "workflow" ? query.fulfillment : undefined;
  const matches = offers
    .filter(({ listing }) => (!category || listing.category === category.id) && (!subcategory || listing.subcategory === subcategory) && (!kind || (kind === "workflow" ? Boolean(listing.execution) : !listing.execution && listing.fulfillment === kind)) && (!q || [listing.title, listing.summary, listing.githubUrl ?? "", ...listing.deliverables].join(" ").toLocaleLowerCase().includes(q.toLocaleLowerCase())))
    .sort((a, b) => {
      const aExec = a.listing.execution ? 2 : isMarketOfferPurchasable(a) ? 1 : 0;
      const bExec = b.listing.execution ? 2 : isMarketOfferPurchasable(b) ? 1 : 0;
      return bExec - aExec;
    });
  const hasFilters = Boolean(category || kind || q);
  const href = (updates: Record<string, string | undefined>) => { const values = { category: category?.id, subcategory, q, fulfillment: kind, ...updates }; const next = new URLSearchParams(); for (const [key,value] of Object.entries(values)) if (value) next.set(key,value); return "/market" + (next.size ? "?" + next : ""); };
  return <MarketFrame title={t("title")} description={t("body")}
    tools={<form action="/market" className="ans-search-form"><label className="sr-only" htmlFor="market-search">{t("search")}</label><Input id="market-search" name="q" type="search" maxLength={200} defaultValue={q} placeholder={t("searchPlaceholder")}/>{Object.entries({ category: category?.id, subcategory, fulfillment: kind }).map(([name,value]) => value && <input key={name} type="hidden" name={name} value={value}/>)}<Button>{t("search")}</Button></form>}
    actions={<div className="flex flex-wrap items-center gap-2"><Button asChild variant="outline" size="sm"><Link href="/workflows/new">⚡ 新建工作流</Link></Button><Button asChild size="sm"><Link href="/market/creator/new">{t("create")}</Link></Button></div>}>
    <nav className="ans-category-row mt-2" aria-label={p("categoriesLabel")}><Link className="ans-category-pill" aria-current={!category ? "page" : undefined} href={href({ category: undefined, subcategory: undefined })}>{p("all")}</Link>{PROJECT_CATEGORIES.map((item) => <Link key={item.id} className="ans-category-pill" aria-current={category?.id === item.id ? "page" : undefined} href={href({ category: item.id, subcategory: undefined })}>{p("categories." + item.id)}</Link>)}</nav>
    {category && <nav className="mb-5 flex flex-wrap gap-2 text-sm" aria-label={p("subcategoriesLabel")}><Link className="ans-subcategory" aria-current={!subcategory ? "page" : undefined} href={href({ subcategory: undefined })}>{p("allChildren")}</Link>{category.children.map((item) => <Link className="ans-subcategory" key={item} aria-current={subcategory === item ? "page" : undefined} href={href({ subcategory: item })}>{p("children." + item)}</Link>)}</nav>}
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
      <nav className="flex flex-wrap gap-2 text-sm" aria-label={t("fields.fulfillment")}>{[undefined,"workflow","service","resource"].map((value) => <Link className="ans-subcategory" key={value ?? "all"} aria-current={kind === value ? "page" : undefined} href={href({ fulfillment: value })}>{value === "workflow" ? w("runnable") : t(value ?? "allTypes")}</Link>)}</nav>
      <div className="flex flex-wrap items-center gap-3"><p className="text-sm text-muted-foreground">{t("count", { count: matches.length })}</p>{hasFilters && <Link href="/market" className="py-1 text-sm text-primary underline underline-offset-4">{t("clearFilters")}</Link>}</div>
    </div>
    {matches.length > 0 && !hasFilters && (
      <section className="mb-8 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4 sm:p-5" aria-label="ANS 官方可运行工作流矩阵">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">🟢 官方工作流矩阵</span>
            <span className="text-xs text-muted-foreground">标准三要素样板：16:9 封面 · 一句话文案 · 站内即跑 / 外部直达跳转</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <Link href="/market/creator/new" className="text-emerald-700 hover:underline dark:text-emerald-300">📤 上传项目到市场 →</Link>
            <Link href="/explore/submit" className="text-muted-foreground hover:text-foreground hover:underline">🌐 投稿至项目广场 →</Link>
          </div>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {OFFICIAL_WORKFLOW_CARDS.map((item) => (
            <Link key={item.slug} href={item.href} className="group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-sm">
              <div className="relative aspect-video overflow-hidden border-b bg-slate-950">
                <Image unoptimized src={item.cover} width={640} height={360} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <span className="absolute top-2 right-2 rounded-full bg-slate-950/85 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 backdrop-blur">{item.badge}</span>
              </div>
              <div className="flex flex-1 flex-col p-3">
                <p className="line-clamp-1 text-sm font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.summary}</p>
                <span className="mt-2.5 inline-flex items-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">立即打开工作台 →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    )}
    {matches.length ? <div className="ans-catalog-grid">{matches.map((offer) => <MarketOfferCard key={offer.id} offer={offer}/>)}</div> : <div className="ans-empty"><h2 className="text-xl font-semibold">{t(hasFilters ? "noMatches" : "empty")}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{t(hasFilters ? "noMatchesBody" : "emptyBody")}</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Button asChild><Link href={hasFilters ? "/market" : "/explore"}>{t(hasFilters ? "clearFilters" : "exploreProjects")}</Link></Button><Button asChild variant="outline"><Link href="/market/creator/new">{tp("uploadFirst")}</Link></Button></div></div>}
  </MarketFrame>;
}
