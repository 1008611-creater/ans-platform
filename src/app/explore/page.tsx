import { catalogText, catalogSourceLabel } from "@/domain/catalog/content";
import Link from "next/link";
import { CATALOG_SOURCES } from "@/contracts/catalog-content";
import { listPublishedCatalog } from "@/server/catalog/service";
import { getLocale, getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { PROJECT_CATEGORIES } from "@/domain/catalog/projects";
import { browseCatalog, catalogBrowseHref, type CatalogBrowseQuery, type CatalogBrowseFilters } from "@/domain/catalog/browse";
import { ProjectCard } from "@/components/catalog/project-card";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { RevealDetails } from "@/components/catalog/reveal-details";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AgriWall } from "@/components/competitions/agri-wall";
import styles from "./explore.module.css";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("product");
  return { title: t("nav.explore"), description: t("exploreBody") };
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<CatalogBrowseQuery> }) {
  const [params, t, locale, catalog] = await Promise.all([searchParams, getTranslations("product"), getLocale(), listPublishedCatalog()]);
  const browse = browseCatalog(catalog, params, project => [catalogText(project, t, "title", locale), catalogText(project, t, "summary", locale), t(`categories.${project.category}`), t(`children.${project.subcategory}`)].join(" "));
  const { category, subcategory, filters } = browse;
  const isAgriWall = category?.id === "competition" && subcategory === "agri-wall";
  const filterHref = (updates: Partial<CatalogBrowseFilters> = {}, page = 1) => catalogBrowseHref("/explore", filters, updates, page);
  return <div className="ans-product-shell"><div className={`ans-product-container ans-page-content ${styles.page}`}>
    {!isAgriWall && <header className="ans-page-heading ans-page-heading-with-tools">
      <div className="ans-page-heading-copy"><RevealDetails id="explore-introduction" label={t("catalogBrowse.introduction")} kind="heading" className={styles.titleBlock} details={<p>{t("exploreBody")}</p>}><h1 className="ans-page-title">{t("nav.explore")}</h1></RevealDetails></div>
      <div className="ans-page-heading-tools">
        <form action="/explore#project-results" className={styles.search}>
          <label className="sr-only" htmlFor="project-search">{t("searchLabel")}</label>
          <Input id="project-search" type="search" name="q" autoComplete="off" maxLength={200} defaultValue={filters.q} placeholder={t("searchPlaceholder")} className="h-12 min-w-0 rounded-xl" />
          {Object.entries(filters).map(([key, value]) => key !== "q" && value && <input key={key} type="hidden" name={key} value={value} />)}
          <Button type="submit" className="h-12 shrink-0 rounded-xl"><Search className="me-2 h-4 w-4" aria-hidden="true" />{t("search")}</Button>
        </form>
        <div className="ans-page-actions"><Button asChild variant="outline"><Link href="/explore/submit">{t("realProject.submit")}</Link></Button></div>
      </div>
    </header>}
    <nav aria-label={t("categoriesLabel")} className={`ans-category-row ${styles.categories}`}>
      <Link href={filterHref({ category: undefined, subcategory: undefined })} aria-current={!category ? "page" : undefined} className="ans-category-pill">{t("all")}</Link>
      {PROJECT_CATEGORIES.map(item => <Link key={item.id} href={filterHref({ category: item.id, subcategory: undefined })} aria-current={category?.id === item.id ? "page" : undefined} className="ans-category-pill">{t(`categories.${item.id}`)}<span className="ms-2 text-xs opacity-70">{catalog.filter(project => project.category === item.id).length}</span></Link>)}
    </nav>
    {category && <nav aria-label={t("subcategoriesLabel")} className="mb-6 flex flex-wrap gap-2 text-sm">
      <Link href={filterHref({ subcategory: undefined })} aria-current={!subcategory ? "page" : undefined} className="ans-subcategory">{t("allChildren")}</Link>
      {category.children.map(child => <Link key={child} href={filterHref({ subcategory: child })} aria-current={subcategory === child ? "page" : undefined} className="ans-subcategory">{t(`children.${child}`)}</Link>)}
    </nav>}
    {isAgriWall ? <AgriWall /> : <>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 id="project-results" className="text-sm font-normal text-muted-foreground">{t("results", { count: browse.total })}</h2>
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
    </div>
    {browse.projects.length ? <div className={styles.projects}>{browse.projects.map(project => <ProjectCard key={project.slug} project={project} compact />)}</div> : <div className="ans-empty"><h3 className="text-xl font-semibold">{t("emptyTitle")}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{t("emptyBody")}</p><div className="mt-6"><Button asChild variant="outline"><Link href="/explore">{t("clear")}</Link></Button></div></div>}
    <CatalogPagination page={browse.page} pages={browse.pages} href={page => filterHref({}, page)} labels={{ navigation: t("catalogBrowse.pagination"), previous: t("catalogBrowse.previous"), next: t("catalogBrowse.next"), page: page => t("catalogBrowse.page", { page }) }} />
    </>}
  </div></div>;
}
