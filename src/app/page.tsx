import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, ArrowUpRight, Search, BookOpen, BriefcaseBusiness, Clapperboard, Code2, Github, Store, Zap, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPublishedCatalog } from "@/server/catalog/service";
import { PROJECT_CATEGORIES } from "@/domain/catalog/projects";
import { catalogText } from "@/domain/catalog/content";
import { homepageProjects } from "@/domain/catalog/homepage";
import { ProjectPreview } from "@/components/catalog/project-preview";
import { OfficialWorkflows } from "@/components/catalog/official-workflows";
import { ProjectCoverflow } from "@/components/homepage/project-coverflow";
import { HomepageCtaLink } from "@/components/homepage/homepage-cta-link";
import styles from "./home.module.css";

export const dynamic = "force-dynamic";
const categoryIcons = { learning: BookOpen, career: BriefcaseBusiness, aigc: Clapperboard, web: Code2, github: Github, business: Store, productivity: Zap, competition: Trophy };

export default async function HomePage() {
  const [t, locale, catalog] = await Promise.all([getTranslations("product"), getLocale(), listPublishedCatalog()]);
  const { hero, featured, showcase } = homepageProjects(catalog);
  return <div className={`ans-product-shell ans-home-page ${styles.page}`}>
    <section className={styles.hero} aria-labelledby="home-title">
      <div className={`ans-product-container ${styles.intro}`}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{t("home.eyebrow")}</p>
          <h1 id="home-title" className={styles.title}>{t("home.title")}</h1>
          <p className={styles.description}>{t("home.description")}</p>
          <form action="/explore" method="get" role="search" className={styles.search} aria-label={t("searchLabel")}>
            <label className="sr-only" htmlFor="home-project-search">{t("searchLabel")}</label>
            <Search className={styles.searchIcon} aria-hidden="true" />
            <Input id="home-project-search" name="q" type="search" maxLength={200} autoComplete="off" placeholder={t("home.searchPlaceholder")} />
            <Button type="submit" aria-label={t("search")}><ArrowRight aria-hidden="true" /></Button>
          </form>
          <div className={styles.actions}>
            <HomepageCtaLink href="/explore" eventName="primary_cta">{t("exploreAction")}<ArrowRight aria-hidden="true" /></HomepageCtaLink>
            <HomepageCtaLink href="/hubs" eventName="workflow_cta">{t("workflowAction")}<ArrowUpRight aria-hidden="true" /></HomepageCtaLink>
          </div>
        </div>
        {hero ? <ProjectCoverflow projects={(showcase.length ? showcase : [hero]).map(project => ({
          slug: project.slug,
          href: project.memberHref ?? `/explore/${project.slug}`,
          title: catalogText(project, t, "title", locale),
          summary: catalogText(project, t, "summary", locale),
          category: t(`categories.${project.category}`),
          coverUrl: project.coverUrl,
        }))} labels={{ title: t("home.spotlight"), previous: t("home.previousProject"), next: t("home.nextProject"), pause: t("home.pauseProjects"), play: t("home.playProjects"), open: t("detail"), select: t("home.selectProject"), carousel: t("home.projectCarousel") }} /> : <div className={styles.empty}><BookOpen aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{t("emptyBody")}</p><Link href="/hubs" className="ans-text-link">{t("workflowAction")}<ArrowRight aria-hidden="true" /></Link></div>}
      </div>
    </section>
    <div className={`ans-product-container ${styles.directions}`}>
      <span className={styles.directionLabel}>{t("home.directions")}</span>
      <nav aria-label={t("categoriesLabel")} className={styles.categoryRail}>{PROJECT_CATEGORIES.map(category => { const Icon = categoryIcons[category.id]; return <Link key={category.id} href={`/explore?category=${category.id}`}><Icon aria-hidden="true" />{t(`categories.${category.id}`)}</Link>; })}</nav>
    </div>
    {featured.length > 0 && <section className={`ans-product-container ${styles.selection}`} aria-labelledby="home-projects-title">
      <div className={styles.sectionHeading}><div><p className={styles.kicker}>{t("home.selectionLabel")}</p><h2 id="home-projects-title">{t("selectionTitle")}</h2></div><Link href="/explore" className="ans-text-link">{t("viewAll")}<ArrowUpRight aria-hidden="true" /></Link></div>
      <div className={`ans-catalog-grid ${styles.projects}`}>{featured.map(project => <article key={project.slug} className={styles.project}>
        <Link href={project.memberHref ?? `/explore/${project.slug}`}>
          <div className={styles.projectCopy}><div className={styles.projectMeta}><span>{t(`categories.${project.category}`)}</span><span>{t(project.workflowId ? "ready" : project.memberHref ? "realProject.member" : project.source === "official" ? "realProject.externalProduct" : "reference")}</span></div><h3>{catalogText(project, t, "title", locale)}<ArrowUpRight aria-hidden="true" /></h3><p>{catalogText(project, t, "summary", locale)}</p></div>
          <ProjectPreview project={project} />
        </Link>
      </article>)}</div>
    </section>}
    <section className={styles.workflowSection} aria-labelledby="home-workflows-title"><div className={`ans-product-container ${styles.section}`}>
      <div className={styles.sectionHeading}><div><p className={styles.kicker}>{t("home.workflowLabel")}</p><h2 id="home-workflows-title">{t("workflowTitle")}</h2><p>{t("home.workflowDescription")}</p></div><Link href="/hubs" className="ans-text-link">{t("nav.workflows")}<ArrowUpRight aria-hidden="true" /></Link></div>
      <OfficialWorkflows compact />
    </div></section>
    <section className={`ans-product-container ${styles.section} ${styles.bottom}`} aria-labelledby="home-steps-title">
      <div className={styles.steps}><p className={styles.kicker}>{t("home.stepsLabel")}</p><h2 id="home-steps-title">{t("stepsTitle")}</h2><ol>{[1, 2, 3].map(step => <li key={step}><span aria-hidden="true">0{step}</span><div><h3>{t(`steps.${step}.title`)}</h3><p>{t(`steps.${step}.body`)}</p></div></li>)}</ol></div>
      <div className={styles.community}><BookOpen aria-hidden="true" /><p className={styles.kicker}>{t("home.communityLabel")}</p><h2>{t("communityTitle")}</h2><p>{t("communityBody")}</p><div className={styles.communityLinks}><Link href="/community" className="ans-text-link">{t("communityAction")}<ArrowRight aria-hidden="true" /></Link><Link href="/hubs/vibehub" className="ans-text-link">ANS VibeHub<ArrowUpRight aria-hidden="true" /></Link></div></div>
    </section>
  </div>;
}
