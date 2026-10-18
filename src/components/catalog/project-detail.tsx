import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ExternalLink, FileCheck2, Github, Info } from "lucide-react";
import { catalogText, catalogSourceLabel } from "@/domain/catalog/content";
import { projectStartHref, type CatalogProject } from "@/domain/catalog/projects";
import type { ProjectGuide } from "@/domain/catalog/project-guide-types";
import { buildProjectVisualWalkthrough } from "@/domain/vibehub/ans-site-optimizers";
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
  const [t, d, ct, locale] = await Promise.all([getTranslations("product"), getTranslations("product.projectDetail"), getTranslations("product.connections"), getLocale()]);
  const text = (field: Parameters<typeof catalogText>[2]) => catalogText(project, t, field, locale);
  const isEn = locale.startsWith("en");
  const walkthrough = buildProjectVisualWalkthrough(project, isEn ? "en" : "zh");
  const advice = guide ? (locale.startsWith("zh") ? guide.zh : guide.en) : undefined;
  const startHref = projectStartHref(project);
  const isGithub = project.source === "github";
  const primaryConnection = connections.offers[0] ?? null;
  const primaryHref = primaryConnection?.href ?? project.memberHref ?? startHref ?? guide?.experienceUrl ?? project.sourceUrl;
  const isExternal = !primaryConnection && !project.memberHref && !startHref;
  const primaryLabel = primaryConnection ? ct(`actions.${primaryConnection.kind === "workflow-offer" ? "workflowOffer" : primaryConnection.kind}`) : project.memberHref ? d("viewOffer") : startHref ? d("prepareWorkflow") : guide?.experienceUrl ? d("tryOnline") : isGithub ? d("viewRepository") : d("openProject");
  const otherActions: Connections = { projects: [], workflows: [], offers: connections.offers.filter(item => item !== primaryConnection) };
  const sourceName = project.sourceUrl ? new URL(project.sourceUrl).hostname : t(catalogSourceLabel(project.source));
  const steps = advice?.steps ?? [
    { title: d("fallbackSteps.inspect"), body: text("output"), href: project.sourceUrl },
    { title: d("fallbackSteps.prepare"), body: text("inputs") },
    { title: d("fallbackSteps.decide"), body: text("decisions") },
  ];
  const methods = (["model", "prompt", "skill"] as const).filter(field => {
    const value = text(field);
    return value && !/^(在项目中|进入项目，按使用指南|按仓库 README 安装与使用|以创作者的项目说明为准|在原项目中|模型与使用条件以|无需 AI 模型|No AI model|按自己的目标组织真实内容|Use real content for your goal|使用官方操作指南|Use the official guide)/.test(value);
  });
  const rawSourceNote = text("sourceNote");
  const hasMeaningfulSourceNote = rawSourceNote && !/^(ANS 官方项目|Official ANS project|创作者公开展示项目|Public creator showcase)/.test(rawSourceNote);
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
      <div className={styles.showcase}>
        {primaryHref ? (isExternal ? <a href={primaryHref} target="_blank" rel="noopener noreferrer" className="group relative block overflow-hidden rounded-2xl"><ProjectPreview project={project} large /><span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-slate-950/85 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-xs transition group-hover:bg-primary">{primaryLabel}<ArrowUpRight size={14} aria-hidden="true" /></span></a> : <Link href={primaryHref} className="group relative block overflow-hidden rounded-2xl"><ProjectPreview project={project} large /><span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-slate-950/85 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-xs transition group-hover:bg-primary">{primaryLabel}<ArrowRight size={14} aria-hidden="true" /></span></Link>) : <ProjectPreview project={project} large />}
      </div>
      <aside className={styles.start} aria-label={d("startHere")}>
        <p className={styles.kicker}>{d("startHere")}</p>
        <h2>{primaryConnection ? ct(primaryConnection.kind === "workflow" || primaryConnection.kind === "workflow-offer" ? "startWithWorkflow" : "startWithOffer") : d(project.memberHref ? "creatorProject" : startHref ? "ansWorkflow" : "sourceProject")}</h2>
        <p>{primaryConnection ? ct("prepareNote") : advice?.access ?? text("output")}</p>
        {primaryHref && <Button asChild size="lg" className={`${styles.primary} h-auto min-h-11 whitespace-normal py-3 text-center`}>
          {isExternal ? <a href={primaryHref} target="_blank" rel="noopener noreferrer">{primaryLabel}<ArrowUpRight size={18} aria-hidden="true" /></a> : <Link href={primaryHref}>{primaryLabel}<ArrowRight size={18} aria-hidden="true" /></Link>}
        </Button>}
        <ProductConnectionsSection connections={otherActions} compact />
        {primaryConnection && (guide?.experienceUrl || project.sourceUrl) && <Button asChild variant="outline" className="mt-2 w-full"><a href={guide?.experienceUrl ?? project.sourceUrl} target="_blank" rel="noopener noreferrer">{guide?.experienceUrl ? d("tryOnline") : isGithub ? d("viewRepository") : d("openProject")}<ArrowUpRight size={16} aria-hidden="true" /></a></Button>}
        {guide?.experienceUrl && project.sourceUrl && <a href={project.sourceUrl} target="_blank" rel="noopener noreferrer" className="ans-text-link"><Github size={15} aria-hidden="true" />{d("viewRepository")}</a>}
        {!primaryConnection && startHref && <div className={styles.startNote}><Info size={15} aria-hidden="true" /><span>{t("cost", { points: PROJECT_WORKFLOW_COST_POINTS }) + " · " + t("costNote")}</span></div>}
        {project.creator && <p className={styles.creator}>{d("by", { name: project.creator })}</p>}
      </aside>
    </div>
    <div className={styles.body}>
      <div className={styles.main}>
        <section id="project-outcome" className={styles.section}>
          <p className={styles.kicker}>01 / {d("outcome")}</p><h2>{d("whatToMake")}</h2>
          <p className={styles.prose}>{advice?.result ?? text("output")}</p>
          {advice?.audience && <div className={styles.audience}><FileCheck2 size={19} aria-hidden="true" /><div><h3>{d("forWhom")}</h3><p>{advice.audience}</p></div></div>}
        </section>
        {advice && <section id="project-path" className={styles.section}>
          <p className={styles.kicker}>02 / {d("path")}</p><h2>{d("firstResult")}</h2>
          <ol className={styles.steps}>{steps.map((step, index) => <li key={step.title}>
            <span className={styles.stepNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div><h3>{step.title}</h3><p>{step.body}</p>{step.href && <a href={step.href} target="_blank" rel="noopener noreferrer" className="ans-text-link">{d("openStep")}<ExternalLink size={14} aria-hidden="true" /></a>}</div>
          </li>)}</ol>
        </section>}
        <section id="project-visual-walkthrough" data-testid="project-visual-walkthrough" className={`${styles.section} space-y-5`}>
          <div>
            <p className={styles.kicker}>{walkthrough.eyebrow}</p>
            <h2>{walkthrough.heading}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{walkthrough.subtitle}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {walkthrough.nodes.map(node => (
              <div key={node.step} className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card/75 p-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-muted-foreground">STEP {node.step}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      node.kind === "script"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                        : node.kind === "preview"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                          : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
                    }`}>
                      {node.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{node.title}</h3>
                  <p className="text-xs leading-5 text-muted-foreground">{node.detail}</p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 font-mono text-[11px] text-muted-foreground">
                  <span>{isEn ? "Artifact" : "阶段产物"}</span>
                  <code className="text-foreground">{node.artifact}</code>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border/80 bg-muted/25 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">{walkthrough.evalHeading}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{walkthrough.evalSubtitle}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/80 text-muted-foreground">
                    <th className="py-2 pr-3 font-semibold">{isEn ? "Dimension" : "对比维度"}</th>
                    <th className="py-2 px-3 font-semibold">{isEn ? "Raw LLM Prompt (Without Skill)" : "裸调默认模型（无工作流约束）"}</th>
                    <th className="py-2 pl-3 font-semibold text-emerald-600 dark:text-emerald-400">{isEn ? "With ANS Productized Workflow" : "启用本 ANS 结构化工作流"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {walkthrough.evalRows.map(row => (
                    <tr key={row.dimension}>
                      <td className="py-2.5 pr-3 font-semibold text-foreground whitespace-nowrap">{row.dimension}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{row.withoutSkill}</td>
                      <td className="py-2.5 pl-3 font-medium text-foreground">{row.withAnsWorkflow}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground">{isEn ? "Built-in ANS Skills:" : "底层内化 ANS Skill："}</span>
                {walkthrough.recommendedSkills.map(sk => (
                  <Link
                    key={sk.slug}
                    href={`/vibe-hub/vibehub-skill?lang=${isEn ? "en" : "zh"}#ans-skill-matrix`}
                    className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[11px] font-medium text-foreground hover:border-primary hover:text-primary"
                  >
                    {sk.name} · {sk.role}
                  </Link>
                ))}
              </div>
              <Link href={`/vibe-hub/vibehub-skill?lang=${isEn ? "en" : "zh"}#ans-brief-builder`} className="font-semibold text-primary hover:underline">
                {isEn ? "Customize 4-Part Brief →" : "去四段式工作台定制同类需求 →"}
              </Link>
            </div>
          </div>
        </section>
      </div>
      <aside className={styles.sideNote}>
        <section id="project-conditions">
          <p className={styles.kicker}>03 / {d("conditions")}</p><h2>{d("beforeStarting")}</h2>
          <dl className={styles.requirements}>
            <div><dt>{d("prepare")}</dt><dd className="whitespace-pre-line">{text("inputs")}</dd></div>
            {advice && <><div><dt>{d("difficulty")}</dt><dd>{advice.difficulty}</dd></div><div><dt>{d("cost")}</dt><dd>{advice.cost}</dd></div></>}
            <div><dt>{d("yourDecision")}</dt><dd className="whitespace-pre-line">{text("decisions")}</dd></div>
          </dl>
          {advice?.cautions.length ? <div className={styles.cautions}><h3>{d("limits")}</h3><ul>{advice.cautions.map(item => <li key={item}><Check size={15} aria-hidden="true" /><span>{item}</span></li>)}</ul></div> : null}
          {methods.length > 0 && <details className={styles.methods}><summary>{d("tools")}</summary><dl>{methods.map(field => <div key={field}><dt>{t(`${field}Title`)}</dt><dd>{text(field)}</dd></div>)}</dl></details>}
        </section>
        <section id="project-sources" className="mt-8 pt-6 border-t">
          <p className={styles.kicker}>04 / {d("sources")}</p>
          {hasMeaningfulSourceNote && <p className="mt-2 text-xs leading-6 text-muted-foreground">{rawSourceNote}</p>}
          <ul className={styles.sources}>
            {project.sourceUrl && <li><a href={project.sourceUrl} target="_blank" rel="noopener noreferrer"><span>{d("original")}</span><span>{sourceName}<ArrowUpRight size={16} aria-hidden="true" /></span></a></li>}
            {guide?.evidence.filter(item => item.href !== project.sourceUrl).map(item => <li key={item.href}><a href={item.href} target="_blank" rel="noopener noreferrer"><span>{item.label}</span><ArrowUpRight size={16} aria-hidden="true" /></a></li>)}
            {project.licenseUrl && <li><a href={project.licenseUrl} target="_blank" rel="noopener noreferrer"><span>{d("license")}</span><ArrowUpRight size={16} aria-hidden="true" /></a></li>}
            {project.discoveryUrl && <li><a href={project.discoveryUrl} target="_blank" rel="noopener noreferrer"><span>{t("realProject.discovery")}</span><ArrowUpRight size={16} aria-hidden="true" /></a></li>}
          </ul>
        </section>
      </aside>
    </div>
    <ProductConnectionsSection connections={connections} />
    {related.length > 0 && <section className={styles.related} aria-labelledby="related-projects-title">
      <div className={styles.relatedHeading}><h2 id="related-projects-title">{d("related")}</h2><Link href={`/explore?category=${project.category}`} className="ans-text-link">{d("seeCategory")}<ArrowRight size={15} aria-hidden="true" /></Link></div>
      <div className={styles.relatedGrid}>{related.map(item => <ProjectCard key={item.slug} project={item} compact />)}</div>
    </section>}
  </div></article>;
}
