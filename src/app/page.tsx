import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Plus, Search, BookOpen, BriefcaseBusiness, Clapperboard, Code2, Github, Store, Zap, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPublishedCatalog } from "@/server/catalog/service";
import { PROJECT_CATEGORIES } from "@/domain/catalog/projects";
import { catalogText } from "@/domain/catalog/content";
import { homepageProjects } from "@/domain/catalog/homepage";
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
  const scenes = [
    { href: "/competitions/agrihackathon", img: "/competitions/agrihackathon/gitglow-hub.webp", tag: isEn ? "Hackathon" : "赛事主舞台", label: isEn ? "AgriHackathon · Compute & Datasets" : "智耕黑客松 · 团队算力与农情挑战" },
    { href: "/workspace/benefits", img: "/catalog/gitglow-v1/ans-3d-showcase.svg", tag: isEn ? "3D Arcade & Pet" : "3D 互动工坊", label: isEn ? "3D Claw Machine & Dino Wardrobe" : "3D 抓娃娃机 · 小龙换装投喂圣殿" },
    { href: "/competitions/aigc", img: "/catalog/gitglow-v1/aigc-workspace.webp", tag: isEn ? "AIGC Studio" : "AIGC 创作台", label: isEn ? "Solara · Infinite Canvas · Toonflow" : "AIGC 赛事工具链 · 分镜画布与短剧" },
    { href: "/hubs", img: "/catalog/gitglow-v1/cauai-one.webp", tag: isEn ? "Campus Hubs" : "开源与课程空间", label: isEn ? "CAUHub · VibeHub · Full-Stack" : "校园空间 · VibeHub 教程与方法库" },
  ];
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
          href: project.memberHref ?? `/explore/${project.slug}`,
          title: catalogText(project, t, "title", locale),
          summary: catalogText(project, t, "summary", locale),
          category: t(`categories.${project.category}`),
          coverUrl: project.coverUrl,
        }))} labels={{ title: t("home.spotlight"), open: t("detail"), carousel: t("home.projectCarousel"), info: t("catalogBrowse.introduction"), pause: t("home.pauseProjects"), play: t("home.playProjects") }} /> : <div className={styles.empty}><BookOpen aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{t("emptyBody")}</p></div>}
      </div>
      <div className={`ans-product-container ${styles.sceneStrip}`}>
        {scenes.map(scene => <Link key={scene.href} href={scene.href} className={styles.sceneCard}>
          <img src={scene.img} alt="" loading="lazy" className={styles.sceneImg} />
          <div className={styles.sceneMeta}>
            <span className={styles.sceneTag}>{scene.tag}</span>
            <strong className={styles.sceneLabel}>{scene.label}</strong>
          </div>
        </Link>)}
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
