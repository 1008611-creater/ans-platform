import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ExternalLink, FileCheck2, Github, Info } from "lucide-react";
import { catalogText, catalogSourceLabel } from "@/domain/catalog/content";
import { projectStartHref, type CatalogProject } from "@/domain/catalog/projects";
import type { ProjectGuide } from "@/domain/catalog/project-guide-types";
import { PROJECT_WORKFLOW_COST_POINTS } from "@/contracts/projects";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { Button } from "@/components/ui/button";
import { ProjectPreview } from "./project-preview";
import { ProjectCard } from "./project-card";
import type { ProductConnections as Connections } from "@/contracts/product-connections";
import { ProductConnectionsSection } from "./product-connections";
import styles from "./project-detail.module.css";

export async function CatalogProjectDetail({ project, guide, related = [], connections = { projects: [], workflows: [], offers: [] }, accountId, favorited }: {
  project: CatalogProject;
  guide?: ProjectGuide;
  related?: readonly CatalogProject[];
  connections?: Connections;
  accountId: string | null;
  favorited: boolean;
}) {
  const [t, d, ct, wt, locale] = await Promise.all([getTranslations("product"), getTranslations("product.projectDetail"), getTranslations("product.connections"), getTranslations("workflowCatalog"), getLocale()]);
  const text = (field: Parameters<typeof catalogText>[2]) => catalogText(project, t, field, locale);
  const advice = guide ? (locale.startsWith("zh") ? guide.zh : guide.en) : undefined;
  const startHref = projectStartHref(project);
  const isGithub = project.source === "github";
  const primaryConnection = connections.workflows[0] ?? connections.offers[0];
  const primaryHref = primaryConnection?.href ?? project.memberHref ?? startHref ?? guide?.experienceUrl ?? project.sourceUrl;
  const isExternal = !primaryConnection && !project.memberHref && !startHref;
  const primaryLabel = primaryConnection ? ct(`actions.${primaryConnection.kind === "workflow-offer" ? "workflowOffer" : primaryConnection.kind}`) : project.memberHref ? d("viewOffer") : startHref ? d("prepareWorkflow") : guide?.experienceUrl ? d("tryOnline") : isGithub ? d("viewRepository") : d("openProject");
  const otherActions: Connections = { projects: [], workflows: connections.workflows.filter(item => item !== primaryConnection), offers: connections.offers.filter(item => item !== primaryConnection) };
  const sourceName = project.sourceUrl ? new URL(project.sourceUrl).hostname : t(catalogSourceLabel(project.source));
  const steps = advice?.steps ?? [
    { title: d("fallbackSteps.inspect"), body: text("output"), href: project.sourceUrl },
    { title: d("fallbackSteps.prepare"), body: text("inputs") },
    { title: d("fallbackSteps.decide"), body: text("decisions") },
  ];
  const methods = (["model", "prompt", "skill"] as const).filter(field => {
    const value = text(field);
    return value && !/^(在项目中|进入项目，按使用指南|按仓库 README 安装与使用|以创作者的项目说明为准|在原项目中|模型与使用条件以)/.test(value);
  });
  return <article className="ans-product-shell"><div className={`ans-product-container ${styles.page}`}>
    <nav className={styles.breadcrumb} aria-label={d("navigation")}>
      <Link href={`/explore?category=${project.category}`}><ArrowLeft size={16} aria-hidden="true" />{t("nav.explore")}</Link>
      <span aria-hidden="true">/</span><span>{t(`categories.${project.category}`)}</span>
    </nav>
    <header className={styles.heading}>
      <div><p className="ans-eyebrow">{t(`children.${project.subcategory}`)}<span className={styles.sourceTag}>{t(catalogSourceLabel(project.source))}</span></p>
        <h1>{text("title")}</h1><p className={styles.summary}>{text("summary")}</p>
      </div>
      <FavoriteButton accountId={accountId} targetType="PROJECT" targetId={project.slug} initialFavorited={favorited} />
    </header>
    <div className={styles.hero}>
      <div className={styles.showcase}><ProjectPreview project={project} large /></div>
      <aside className={styles.start} aria-label={d("startHere")}>
        <p className={styles.kicker}>{d("startHere")}</p>
        <h2>{primaryConnection ? ct(primaryConnection.kind === "workflow" || primaryConnection.kind === "workflow-offer" ? "startWithWorkflow" : "startWithOffer") : d(project.memberHref ? "creatorProject" : startHref ? "ansWorkflow" : "sourceProject")}</h2>
        <p>{primaryConnection ? ct("prepareNote") : advice?.access ?? d(project.memberHref ? "memberAccess" : startHref ? "workflowAccess" : isGithub ? "githubAccess" : "websiteAccess")}</p>
        {primaryHref && <Button asChild size="lg" className={`${styles.primary} h-auto min-h-11 whitespace-normal py-3 text-center`}>
          {isExternal ? <a href={primaryHref} target="_blank" rel="noopener noreferrer">{primaryLabel}<ArrowUpRight size={18} aria-hidden="true" /></a> : <Link href={primaryHref}>{primaryLabel}<ArrowRight size={18} aria-hidden="true" /></Link>}
        </Button>}
        <ProductConnectionsSection connections={otherActions} compact />
        <Button asChild variant="outline" className="mt-2 h-auto min-h-11 w-full whitespace-normal py-3"><Link href={`/workflows/new?${new URLSearchParams({ project: project.slug })}`}>{wt("createFromProject")}<ArrowRight size={16} aria-hidden="true" /></Link></Button>
        {primaryConnection && (guide?.experienceUrl || project.sourceUrl) && <Button asChild variant="outline" className="mt-2 w-full"><a href={guide?.experienceUrl ?? project.sourceUrl} target="_blank" rel="noopener noreferrer">{guide?.experienceUrl ? d("tryOnline") : isGithub ? d("viewRepository") : d("openProject")}<ArrowUpRight size={16} aria-hidden="true" /></a></Button>}
        {guide?.experienceUrl && project.sourceUrl && <a href={project.sourceUrl} target="_blank" rel="noopener noreferrer" className="ans-text-link"><Github size={15} aria-hidden="true" />{d("viewRepository")}</a>}
        {!primaryConnection && <div className={styles.startNote}><Info size={15} aria-hidden="true" /><span>{startHref ? t("cost", { points: PROJECT_WORKFLOW_COST_POINTS }) + " · " + t("costNote") : d("browseNote")}</span></div>}
        {project.creator && <p className={styles.creator}>{d("by", { name: project.creator })}</p>}
      </aside>
    </div>
    <nav className={styles.sections} aria-label={d("onThisPage")}>
      <a href="#project-outcome">{d("outcome")}</a><a href="#project-path">{d("path")}</a><a href="#project-conditions">{d("conditions")}</a><a href="#project-sources">{d("sources")}</a>
    </nav>
    <div className={styles.body}>
      <div className={styles.main}>
        <section id="project-outcome" className={styles.section}>
          <p className={styles.kicker}>01 / {d("outcome")}</p><h2>{d("whatToMake")}</h2>
          <p className={styles.prose}>{advice?.result ?? text("output")}</p>
          {advice?.audience && <div className={styles.audience}><FileCheck2 size={19} aria-hidden="true" /><div><h3>{d("forWhom")}</h3><p>{advice.audience}</p></div></div>}
        </section>
        <section id="project-path" className={styles.section}>
          <p className={styles.kicker}>02 / {d("path")}</p><h2>{d("firstResult")}</h2>
          <ol className={styles.steps}>{steps.map((step, index) => <li key={step.title}>
            <span className={styles.stepNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div><h3>{step.title}</h3><p>{step.body}</p>{step.href && <a href={step.href} target="_blank" rel="noopener noreferrer" className="ans-text-link">{d("openStep")}<ExternalLink size={14} aria-hidden="true" /></a>}</div>
          </li>)}</ol>
        </section>
        <section id="project-conditions" className={styles.section}>
          <p className={styles.kicker}>03 / {d("conditions")}</p><h2>{d("beforeStarting")}</h2>
          <dl className={styles.requirements}>
            <div><dt>{d("prepare")}</dt><dd className="whitespace-pre-line">{text("inputs")}</dd></div>
            {advice && <><div><dt>{d("difficulty")}</dt><dd>{advice.difficulty}</dd></div><div><dt>{d("cost")}</dt><dd>{advice.cost}</dd></div></>}
            <div><dt>{d("yourDecision")}</dt><dd className="whitespace-pre-line">{text("decisions")}</dd></div>
          </dl>
          {advice?.cautions.length ? <div className={styles.cautions}><h3>{d("limits")}</h3><ul>{advice.cautions.map(item => <li key={item}><Check size={15} aria-hidden="true" /><span>{item}</span></li>)}</ul></div> : <p className={styles.note}>{d("unverifiedConditions")}</p>}
          {methods.length > 0 && <details className={styles.methods}><summary>{d("tools")}</summary><dl>{methods.map(field => <div key={field}><dt>{t(`${field}Title`)}</dt><dd>{text(field)}</dd></div>)}</dl></details>}
        </section>
        <section id="project-sources" className={styles.section}>
          <p className={styles.kicker}>04 / {d("sources")}</p><h2>{d("readOriginal")}</h2>
          <p className={styles.prose}>{text("sourceNote")}</p>
          <ul className={styles.sources}>
            {project.sourceUrl && <li><a href={project.sourceUrl} target="_blank" rel="noopener noreferrer"><span>{d("original")}</span><span>{sourceName}<ArrowUpRight size={16} aria-hidden="true" /></span></a></li>}
            {guide?.evidence.filter(item => item.href !== project.sourceUrl).map(item => <li key={item.href}><a href={item.href} target="_blank" rel="noopener noreferrer"><span>{item.label}</span><ArrowUpRight size={16} aria-hidden="true" /></a></li>)}
            {project.licenseUrl && <li><a href={project.licenseUrl} target="_blank" rel="noopener noreferrer"><span>{d("license")}</span><ArrowUpRight size={16} aria-hidden="true" /></a></li>}
            {project.discoveryUrl && <li><a href={project.discoveryUrl} target="_blank" rel="noopener noreferrer"><span>{t("realProject.discovery")}</span><ArrowUpRight size={16} aria-hidden="true" /></a></li>}
          </ul>
          {guide && <p className={styles.note}>{d("checked", { date: guide.checkedAt })}</p>}
        </section>
      </div>
      <aside className={styles.sideNote}>
        <p className={styles.kicker}>{d("keepGoing")}</p><h2>{d("makeItYours")}</h2>
        <p>{d("makeItYoursBody")}</p>
        <Link href="/explore/submit" className="ans-text-link">{d("shareProject")}<ArrowRight size={15} aria-hidden="true" /></Link>
      </aside>
    </div>
    <ProductConnectionsSection connections={connections} />
    {related.length > 0 && <section className={styles.related} aria-labelledby="related-projects-title">
      <div className={styles.relatedHeading}><h2 id="related-projects-title">{d("related")}</h2><Link href={`/explore?category=${project.category}`} className="ans-text-link">{d("seeCategory")}<ArrowRight size={15} aria-hidden="true" /></Link></div>
      <div className={styles.relatedGrid}>{related.map(item => <ProjectCard key={item.slug} project={item} compact />)}</div>
    </section>}
  </div></article>;
}
