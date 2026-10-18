import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Plus, Search, BookOpen, BriefcaseBusiness, Clapperboard, Code2, Github, Store, Zap, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPublishedCatalog } from "@/server/catalog/service";
import { PROJECT_CATEGORIES, resolveProjectCovers } from "@/domain/catalog/projects";
import { catalogText } from "@/domain/catalog/content";
import { homepageProjects, resolveCatalogShowcaseHref } from "@/domain/catalog/homepage";
import { browseCatalog, catalogBrowseHref, type CatalogBrowseQuery } from "@/domain/catalog/browse";
import { ProjectCard } from "@/components/catalog/project-card";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { RevealDetails } from "@/components/catalog/reveal-details";
import { ProjectCoverflow } from "@/components/homepage/project-coverflow";
import { HomeCampaignModal } from "@/components/homepage/home-campaign-modal";
import styles from "./home.module.css";

export const dynamic = "force-dynamic";
const categoryIcons = { learning: BookOpen, career: BriefcaseBusiness, aigc: Clapperboard, web: Code2, github: Github, business: Store, productivity: Zap, competition: Trophy };

export default async function HomePage({ searchParams }: { searchParams?: Promise<CatalogBrowseQuery> }) {
  const [params, t, locale, catalog] = await Promise.all([searchParams ?? Promise.resolve({}), getTranslations("product"), getLocale(), listPublishedCatalog()]);
  const { hero, projects, showcase } = homepageProjects(catalog);
  const browse = browseCatalog(projects, params, project => [catalogText(project, t, "title", locale), catalogText(project, t, "summary", locale), t(`categories.${project.category}`), t(`children.${project.subcategory}`)].join(" "));
  const filterHref = (updates: Parameters<typeof catalogBrowseHref>[2] = {}, page = 1) => catalogBrowseHref("/", browse.filters, updates, page);
  const isEn = locale.startsWith("en");
  return <div className={`ans-product-shell ans-home-page ${styles.page}`}>
    <HomeCampaignModal locale={locale} />
    <section className={styles.hero} aria-labelledby="home-title">
      <div className={`ans-product-container ${styles.intro}`}>
        <div className={styles.copy}>
          <RevealDetails id="home-introduction" label={t("catalogBrowse.introduction")} kind="heading" className={styles.titleBlock} details={<p>{t("home.description")}</p>}>
            <h1 id="home-title" className={styles.title}>{t("home.title")}</h1>
          </RevealDetails>
          <form action="/#home-projects-title" method="get" role="search" className={styles.search} aria-label={t("searchLabel")}>
            <label className="sr-only" htmlFor="home-project-search">{t("searchLabel")}</label>
            <Search className={styles.searchIcon} aria-hidden="true" />
            <Input id="home-project-search" name="q" type="search" maxLength={200} autoComplete="off" defaultValue={browse.filters.q} placeholder={t("home.searchPlaceholder")} />
            {Object.entries(browse.filters).map(([key, value]) => key !== "q" && value && <input key={key} type="hidden" name={key} value={value} />)}
            <Button type="submit" aria-label={t("search")}><ArrowRight aria-hidden="true" /></Button>
          </form>
        </div>
        {hero ? <ProjectCoverflow projects={(showcase.length ? showcase : [hero]).map(project => ({
          slug: project.slug,
          href: resolveCatalogShowcaseHref(project),
          title: catalogText(project, t, "title", locale),
          summary: catalogText(project, t, "summary", locale),
          category: t(`categories.${project.category}`),
          coverUrl: resolveProjectCovers(project).outerCoverUrl,
        }))} labels={{ title: t("home.spotlight"), open: t("detail"), carousel: t("home.projectCarousel"), info: t("catalogBrowse.introduction"), pause: t("home.pauseProjects"), play: t("home.playProjects") }} /> : <div className={styles.empty}><BookOpen aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{t("emptyBody")}</p></div>}
      </div>
      <div className="ans-product-container mt-4" data-testid="home-ecosystem-pulse">
        <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-border/60 bg-card/75 p-3 backdrop-blur-md lg:grid-cols-4">
          <Link href="/explore" className="group flex items-center justify-between rounded-xl border border-transparent bg-muted/30 px-3.5 py-2.5 transition hover:border-emerald-500/35 hover:bg-emerald-500/5">
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">{isEn ? "Runnable Projects & Workflows" : "可复现项目与开源工作流"}</div>
              <div className="mt-0.5 text-sm font-bold text-foreground">{browse.total}+ {isEn ? "Verified Entries · Live Demo" : "精选项目 · 含输入与验收边界"}</div>
            </div>
            <span className="text-xs font-semibold text-emerald-600 transition group-hover:translate-x-0.5 dark:text-emerald-400">→</span>
          </Link>
          <Link href="/competitions/agrihackathon" className="group flex items-center justify-between rounded-xl border border-transparent bg-muted/30 px-3.5 py-2.5 transition hover:border-emerald-500/35 hover:bg-emerald-500/5">
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">{isEn ? "CAU AgriHackathon · Git Snapshot" : "中国农大智耕黑客松 · 代码快照存证"}</div>
              <div className="mt-0.5 text-sm font-bold text-foreground">{isEn ? "¥3,300 Pool · SHA-256 Audit" : "¥3,300 奖池 · SHA-256 归档核验"}</div>
            </div>
            <span className="text-xs font-semibold text-emerald-600 transition group-hover:translate-x-0.5 dark:text-emerald-400">→</span>
          </Link>
          <Link href="/vibe-hub/vibehub-skill" className="group flex items-center justify-between rounded-xl border border-transparent bg-muted/30 px-3.5 py-2.5 transition hover:border-emerald-500/35 hover:bg-emerald-500/5">
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">{isEn ? "ANS Skill & Brief Workbench" : "ANS 需求转写与去 AI 味规范"}</div>
              <div className="mt-0.5 text-sm font-bold text-foreground">{isEn ? "10 Daily Skills · 3 Pipelines" : "10 大日常 Skill · 3 条生产流水线"}</div>
            </div>
            <span className="text-xs font-semibold text-emerald-600 transition group-hover:translate-x-0.5 dark:text-emerald-400">→</span>
          </Link>
          <Link href="/status" className="group flex items-center justify-between rounded-xl border border-transparent bg-muted/30 px-3.5 py-2.5 transition hover:border-emerald-500/35 hover:bg-emerald-500/5">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                {isEn ? "APIC Multi-Model Router" : "APIC 多模型路由与算力账本"}
              </div>
              <div className="mt-0.5 text-sm font-bold text-foreground">{isEn ? "6 Live Models · Auto-Failover" : "6 路模型探针 · 1 积分 = ¥0.1"}</div>
            </div>
            <span className="text-xs font-semibold text-emerald-600 transition group-hover:translate-x-0.5 dark:text-emerald-400">→</span>
          </Link>
        </div>
      </div>
    </section>
    <section className={`ans-product-container ${styles.selection}`} aria-labelledby="home-projects-title">
      <div className={styles.sectionHeading}>
        <div className={styles.sectionTitle}><h2 id="home-projects-title">{t("nav.explore")}</h2><span className={styles.count}>{t("results", { count: browse.total })}</span></div>
        <Button asChild variant="outline" className={styles.submit}><Link href="/explore/submit"><Plus aria-hidden="true" />{t("realProject.submit")}</Link></Button>
      </div>
      <nav aria-label={t("categoriesLabel")} className={styles.categoryRail}>
        <Link href={filterHref({ category: undefined, subcategory: undefined })} aria-current={!browse.category ? "page" : undefined}>{t("all")}</Link>
        {PROJECT_CATEGORIES.map(category => { const Icon = categoryIcons[category.id]; return <Link key={category.id} href={filterHref({ category: category.id, subcategory: undefined })} aria-current={browse.category?.id === category.id ? "page" : undefined}><Icon aria-hidden="true" />{t(`categories.${category.id}`)}<span>{projects.filter(project => project.category === category.id).length}</span></Link>; })}
      </nav>
      {browse.category && <nav aria-label={t("subcategoriesLabel")} className={styles.subcategories}>
        <Link href={filterHref({ subcategory: undefined })} aria-current={!browse.subcategory ? "page" : undefined}>{t("allChildren")}</Link>
        {browse.category.children.map(child => <Link key={child} href={filterHref({ subcategory: child })} aria-current={browse.subcategory === child ? "page" : undefined}>{t(`children.${child}`)}</Link>)}
      </nav>}
      {browse.projects.length ? <div className={`ans-catalog-grid ${styles.projects}`}>{browse.projects.map(project => <ProjectCard key={project.slug} project={project} compact />)}</div> : <div className="ans-empty"><h3>{t("emptyTitle")}</h3><p>{t("emptyBody")}</p><Link href="/#home-projects-title" className="ans-text-link">{t("clear")}</Link></div>}
      <CatalogPagination page={browse.page} pages={browse.pages} href={page => filterHref({}, page)} labels={{ navigation: t("catalogBrowse.pagination"), previous: t("catalogBrowse.previous"), next: t("catalogBrowse.next"), page: page => t("catalogBrowse.page", { page }) }} />
    </section>
  </div>;
}
