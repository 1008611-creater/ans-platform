import { catalogText, catalogSourceLabel } from "@/domain/catalog/content";
import Link from "next/link";
import { CATALOG_SOURCES } from "@/contracts/catalog-content";
import { listPublishedCatalog } from "@/server/catalog/service";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, BookOpen, Plus, Search } from "lucide-react";
import { PROJECT_CATEGORIES, resolveProjectCovers } from "@/domain/catalog/projects";
import { homepageProjects, resolveCatalogShowcaseHref } from "@/domain/catalog/homepage";
import { browseCatalog, catalogBrowseHref, type CatalogBrowseQuery, type CatalogBrowseFilters } from "@/domain/catalog/browse";
import { ProjectCard } from "@/components/catalog/project-card";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { RevealDetails } from "@/components/catalog/reveal-details";
import { ProjectCoverflow } from "@/components/homepage/project-coverflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AgriWall } from "@/components/competitions/agri-wall";
import homeStyles from "../home.module.css";
import styles from "./explore.module.css";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("product");
  return { title: t("nav.explore"), description: t("exploreBody") };
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<CatalogBrowseQuery> }) {
  const [params, t, locale, catalog] = await Promise.all([searchParams, getTranslations("product"), getLocale(), listPublishedCatalog()]);
  const { hero, showcase } = homepageProjects(catalog);
  const browse = browseCatalog(catalog, params, project => [catalogText(project, t, "title", locale), catalogText(project, t, "summary", locale), t(`categories.${project.category}`), t(`children.${project.subcategory}`)].join(" "));
  const { category, subcategory, filters } = browse;
  const isAgriWall = category?.id === "competition" && subcategory === "agri-wall";
  const isEn = locale.startsWith("en");
  const filterHref = (updates: Partial<CatalogBrowseFilters> = {}, page = 1) => catalogBrowseHref("/explore", filters, updates, page);
  return <div className={`ans-product-shell ans-home-page ${homeStyles.page}`}>
    {!isAgriWall && <section className={homeStyles.hero} aria-labelledby="explore-hero-title">
      <div className={`ans-product-container ${homeStyles.intro}`}>
        <div className={homeStyles.copy}>
          <RevealDetails id="explore-introduction" label={t("catalogBrowse.introduction")} kind="heading" className={homeStyles.titleBlock} details={<p>{t("exploreBody")}</p>}>
            <h1 id="explore-hero-title" className={homeStyles.title}>
              <span className="sr-only">{t("nav.explore")} · </span>
              {t("home.title")}
            </h1>
          </RevealDetails>
          <form action="/explore#project-results" method="get" role="search" className={homeStyles.search} aria-label={t("searchLabel")}>
            <label className="sr-only" htmlFor="project-search">{t("searchLabel")}</label>
            <Search className={homeStyles.searchIcon} aria-hidden="true" />
            <Input id="project-search" type="search" name="q" autoComplete="off" maxLength={200} defaultValue={filters.q} placeholder={t("home.searchPlaceholder")} />
            {Object.entries(filters).map(([key, value]) => key !== "q" && value && <input key={key} type="hidden" name={key} value={value} />)}
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
        }))} labels={{ title: t("home.spotlight"), open: t("detail"), carousel: t("home.projectCarousel"), info: t("catalogBrowse.introduction"), pause: t("home.pauseProjects"), play: t("home.playProjects") }} /> : <div className={homeStyles.empty}><BookOpen aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{t("emptyBody")}</p></div>}
      </div>
      <div className="ans-product-container mt-4">
        <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-border/60 bg-card/75 p-2.5 backdrop-blur-md lg:grid-cols-4">
          <Link
            href="#project-results"
            className="group flex items-center justify-between rounded-xl border border-transparent bg-muted/30 px-3.5 py-2 transition hover:border-emerald-500/35 hover:bg-emerald-500/5"
          >
            <span className="truncate text-xs font-bold text-foreground sm:text-sm">
              {browse.total}+ {isEn ? "Verified Projects" : "精选可复现项目"}
            </span>
            <span className="text-xs font-semibold text-emerald-700 transition group-hover:translate-x-0.5 dark:text-emerald-400">↓</span>
          </Link>
          <Link
            href="/competitions/agrihackathon"
            className="group flex items-center justify-between rounded-xl border border-transparent bg-muted/30 px-3.5 py-2 transition hover:border-emerald-500/35 hover:bg-emerald-500/5"
          >
            <span className="truncate text-xs font-bold text-foreground sm:text-sm">
              {isEn ? "AgriHackathon · ¥3,300" : "中国农大智耕黑客松"}
            </span>
            <span className="text-xs font-semibold text-emerald-700 transition group-hover:translate-x-0.5 dark:text-emerald-400">→</span>
          </Link>
          <Link
            href="/vibe-hub/vibehub-skill"
            className="group flex items-center justify-between rounded-xl border border-transparent bg-muted/30 px-3.5 py-2 transition hover:border-emerald-500/35 hover:bg-emerald-500/5"
          >
            <span className="truncate text-xs font-bold text-foreground sm:text-sm">
              {isEn ? "10 Daily Skills" : "10 大高频 Skill 库"}
            </span>
            <span className="text-xs font-semibold text-emerald-700 transition group-hover:translate-x-0.5 dark:text-emerald-400">→</span>
          </Link>
          <Link
            href="/status"
            className="group flex items-center justify-between rounded-xl border border-transparent bg-muted/30 px-3.5 py-2 transition hover:border-emerald-500/35 hover:bg-emerald-500/5"
          >
            <span className="flex items-center gap-1.5 truncate text-xs font-bold text-foreground sm:text-sm">
              <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              {isEn ? "6 Live AI Models" : "6 路模型实时在线"}
            </span>
            <span className="text-xs font-semibold text-emerald-700 transition group-hover:translate-x-0.5 dark:text-emerald-400">→</span>
          </Link>
        </div>
      </div>
    </section>}
    <div className={`ans-product-container ans-page-content ${styles.page}`}>
    {!isAgriWall && <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-baseline gap-3">
        <h2 id="project-results" className="text-xl font-semibold tracking-tight">{isEn ? "Curated Projects & Runnable Workflows" : "精选项目与可复现工作流"}</h2>
        <span className="text-xs text-muted-foreground">{t("results", { count: browse.total })}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <details open={Boolean(filters.source || filters.readiness)} className="group rounded-xl border bg-card/50 px-3.5 py-2 text-xs">
          <summary className="cursor-pointer select-none font-medium text-muted-foreground hover:text-foreground">
            {t("sourceFilter")} / {t("readinessFilter")}
            {(filters.source || filters.readiness) ? " ●" : ""}
          </summary>
          <div className={`${styles.filters} mt-3 border-b-0 pb-1 pt-3`}>
            <nav aria-label={t("sourceFilter")} className="flex flex-wrap items-center gap-1">
              <span className="me-2 text-xs text-muted-foreground">{t("sourceFilter")}</span>
              {[undefined, ...CATALOG_SOURCES].map(value => <Link key={value ?? "all"} href={filterHref({ source: value })} aria-current={filters.source === value ? "page" : undefined} className="ans-subcategory">{t(value ? catalogSourceLabel(value) : "allSources")}</Link>)}
            </nav>
            <nav aria-label={t("readinessFilter")} className="flex flex-wrap items-center gap-1">
              <span className="me-2 text-xs text-muted-foreground">{t("readinessFilter")}</span>
              {[undefined, "ready", "reference"].map(value => <Link key={value ?? "all"} href={filterHref({ readiness: value })} aria-current={filters.readiness === value ? "page" : undefined} className="ans-subcategory">{t(value ?? "allReadiness")}</Link>)}
            </nav>
          </div>
        </details>
        <Button asChild variant="outline"><Link href="/explore/submit"><Plus className="me-1.5 h-4 w-4" aria-hidden="true" />{t("realProject.submit")}</Link></Button>
      </div>
    </div>}
    <nav aria-label={t("categoriesLabel")} className={`ans-category-row ${styles.categories}`}>
      <Link href={filterHref({ category: undefined, subcategory: undefined })} aria-current={!category ? "page" : undefined} className="ans-category-pill">{t("all")}</Link>
      {PROJECT_CATEGORIES.map(item => <Link key={item.id} href={filterHref({ category: item.id, subcategory: undefined })} aria-current={category?.id === item.id ? "page" : undefined} className="ans-category-pill">{t(`categories.${item.id}`)}<span className="ms-2 text-xs opacity-70">{catalog.filter(project => project.category === item.id).length}</span></Link>)}
    </nav>
    {category && <nav aria-label={t("subcategoriesLabel")} className="mb-6 flex flex-wrap gap-2 text-sm">
      <Link href={filterHref({ subcategory: undefined })} aria-current={!subcategory ? "page" : undefined} className="ans-subcategory">{t("allChildren")}</Link>
      {category.children.map(child => <Link key={child} href={filterHref({ subcategory: child })} aria-current={subcategory === child ? "page" : undefined} className="ans-subcategory">{t(`children.${child}`)}</Link>)}
    </nav>}
    {isAgriWall ? <AgriWall /> : <>
    {browse.projects.length ? <div className={styles.projects}>{browse.projects.map(project => <ProjectCard key={project.slug} project={project} compact />)}</div> : <div className="ans-empty"><h3 className="text-xl font-semibold">{t("emptyTitle")}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{t("emptyBody")}</p><div className="mt-6"><Button asChild variant="outline"><Link href="/explore">{t("clear")}</Link></Button></div></div>}
    <CatalogPagination page={browse.page} pages={browse.pages} href={page => filterHref({}, page)} labels={{ navigation: t("catalogBrowse.pagination"), previous: t("catalogBrowse.previous"), next: t("catalogBrowse.next"), page: page => t("catalogBrowse.page", { page }) }} />
    </>}
  </div></div>;
}
