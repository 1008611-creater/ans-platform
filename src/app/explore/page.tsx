import { catalogText, catalogSourceLabel } from "@/domain/catalog/content";
import Link from "next/link";
import { CATALOG_SOURCES } from "@/contracts/catalog-content";
import { listPublishedCatalog } from "@/server/catalog/service";
export const dynamic = "force-dynamic";
import { getLocale, getTranslations } from "next-intl/server";
import { Search, ArrowRight } from "lucide-react";
import { filterCatalogProjects, PROJECT_CATEGORIES } from "@/domain/catalog/projects";
import { ProjectCard } from "@/components/catalog/project-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export async function generateMetadata() {
  const t = await getTranslations("product");
  return { title: t("nav.explore"), description: t("exploreBody") };
}

type ExploreQuery = { category?: string; subcategory?: string; q?: string; source?: string; readiness?: string };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<ExploreQuery> }) {
  const [params, t, locale, catalog] = await Promise.all([searchParams, getTranslations("product"), getLocale(), listPublishedCatalog()]);
  const query = typeof params.q === "string" ? params.q.slice(0, 200) : "";
  const category = PROJECT_CATEGORIES.find((item) => item.id === params.category);
  const subcategory = category?.children.find((item) => item === params.subcategory);
  const source = CATALOG_SOURCES.some(value => value === params.source) ? params.source : undefined;
  const readiness = params.readiness === "ready" || params.readiness === "reference" ? params.readiness : undefined;
  const projects = filterCatalogProjects({ category: category?.id, subcategory, query, source, readiness }, (project) => [catalogText(project, t, "title", locale), catalogText(project, t, "summary", locale), t(`categories.${project.category}`), t(`children.${project.subcategory}`)].join(" "), catalog);
  function filterHref(updates: Partial<ExploreQuery>) {
    const next = new URLSearchParams();
    const values = { category: category?.id, subcategory, q: query, source, readiness, ...updates };
    for (const [key, value] of Object.entries(values)) if (value) next.set(key, value);
    return `/explore${next.size ? `?${next}` : ""}`;
  }
  return (
    <div className="ans-product-shell"><div className="ans-product-container py-12 sm:py-16">
      <header className="max-w-3xl">
        <p className="ans-eyebrow">{t("nav.explore")}</p>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{t("exploreTitle")}</h1>
        <p className="mt-5 text-pretty leading-8 text-muted-foreground">{t("exploreBody")}</p>
      </header>
      <div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link href="/explore/submit">{t("realProject.submit")}</Link></Button><Button asChild variant="outline"><Link href="/market">{t("market.browse")}</Link></Button><Button asChild variant="outline"><Link href="/market/creator">{t("market.creator")}</Link></Button></div>
      <form action="/explore" className="mt-8 flex max-w-xl gap-2">
        <label className="sr-only" htmlFor="project-search">{t("searchLabel")}</label>
        <Input id="project-search" type="search" name="q" autoComplete="off" defaultValue={query} placeholder={t("searchPlaceholder")} className="h-12 rounded-xl" />
        {Object.entries({ category: category?.id, subcategory, source, readiness }).map(([key, value]) => value && <input key={key} type="hidden" name={key} value={value} />)}
        <Button type="submit" className="h-12 rounded-xl"><Search className="me-2 h-4 w-4" aria-hidden="true" />{t("search")}</Button>
      </form>
      <nav aria-label={t("categoriesLabel")} className="ans-category-row mt-8">
        <Link href={filterHref({ category: undefined, subcategory: undefined })} aria-current={!category ? "page" : undefined} className="ans-category-pill">{t("all")}</Link>
        {PROJECT_CATEGORIES.map((item) => <Link key={item.id} href={filterHref({ category: item.id, subcategory: undefined })} aria-current={category?.id === item.id ? "page" : undefined} className="ans-category-pill">{t(`categories.${item.id}`)}<span className="ms-2 text-xs opacity-70">{catalog.filter(project => project.category === item.id).length}</span></Link>)}
      </nav>
      {category && <nav aria-label={t("subcategoriesLabel")} className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href={filterHref({ subcategory: undefined })} aria-current={!subcategory ? "page" : undefined} className="ans-subcategory">{t("allChildren")}</Link>
        {category.children.map((child) => <Link key={child} href={filterHref({ subcategory: child })} aria-current={subcategory === child ? "page" : undefined} className="ans-subcategory">{t(`children.${child}`)}</Link>)}
      </nav>}
      <div className="mb-8 grid gap-3 border-y py-4 text-sm sm:grid-cols-2">
        <nav aria-label={t("sourceFilter")} className="flex flex-wrap items-center gap-1">
          <span className="me-2 text-xs text-muted-foreground">{t("sourceFilter")}</span>
          {[undefined, ...CATALOG_SOURCES].map((value) => <Link key={value ?? "all"} href={filterHref({ source: value })} aria-current={source === value ? "page" : undefined} className="ans-subcategory">{t(value ? catalogSourceLabel(value) : "allSources")}</Link>)}
        </nav>
        <nav aria-label={t("readinessFilter")} className="flex flex-wrap items-center gap-1">
          <span className="me-2 text-xs text-muted-foreground">{t("readinessFilter")}</span>
          {[undefined, "ready", "reference"].map((value) => <Link key={value ?? "all"} href={filterHref({ readiness: value })} aria-current={readiness === value ? "page" : undefined} className="ans-subcategory">{t(value ?? "allReadiness")}</Link>)}
        </nav>
      </div>
      
      <h2 className="mb-5 text-sm font-normal text-muted-foreground">{t("results", { count: projects.length })}</h2>
      {projects.length ? <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{projects.map((project) => <ProjectCard key={project.slug} project={project} />)}</div> : <div className="ans-empty">
        <h2 className="text-xl font-semibold">{t("emptyTitle")}</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{t("emptyBody")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><Button asChild variant="outline"><Link href="/explore">{t("clear")}</Link></Button><Button asChild><Link href="/workflows">{t("nav.workflows")}<ArrowRight className="ms-2 h-4 w-4" aria-hidden="true" /></Link></Button></div>
      </div>}
    </div></div>
  );
}
