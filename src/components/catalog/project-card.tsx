import { catalogText } from "@/domain/catalog/content";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { CatalogProject } from "@/domain/catalog/projects";
import { ProjectPreview } from "./project-preview";
import styles from "./project-card.module.css";

export async function ProjectCard({ project, compact = false }: { project: CatalogProject; compact?: boolean }) {
  const [t, locale] = await Promise.all([getTranslations("product"), getLocale()]);
  const directHref = project.memberHref ?? (project.workflowId === "resume-website" ? "/market/resume-website" : String(project.workflowId ?? "") === "easel" ? "/competitions/aigc" : String(project.workflowId ?? "") === "hypit" ? "/workflows/hypit" : project.workflowId ? `/projects?goal=${project.goal}&workflow=${project.workflowId}#new-project` : project.sourceUrl ?? `/explore/${project.slug}`);
  const isExternal = /^https?:\/\//.test(directHref);
  const isEn = locale.startsWith("en");
  const title = catalogText(project, t, "title", locale);
  const summary = catalogText(project, t, "summary", locale);
  const actionLabel = project.memberHref || project.workflowId ? (isEn ? "Launch Now" : "立即进入") : project.source === "official" ? (isEn ? "Open App ↗" : "直达体验 ↗") : (isEn ? "Open Project ↗" : "直达项目 ↗");
  const hasFooterBar = directHref !== `/explore/${project.slug}`;
  const body = <>
    <ProjectPreview project={project} />
    <div className="p-3.5 sm:p-4">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-medium text-foreground/75">
        <span>{t(`categories.${project.category}`)}</span>
        <span className="rounded-full border border-emerald-500/35 bg-emerald-950/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 transition-colors group-hover:bg-emerald-900">{actionLabel}</span>
      </div>
      <div className={styles.title}><h3>{title}</h3></div>
      <p title={summary} className="mt-1 line-clamp-1 text-xs leading-relaxed text-foreground/80 transition-colors group-hover:text-foreground">{summary}</p>
    </div>
  </>;
  return <article className={compact ? `${styles.card} group flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card transition hover:border-primary/50` : "ans-project-card group flex flex-col justify-between"}>
    {isExternal ? <a href={directHref} target="_blank" rel="noopener noreferrer" className={compact ? styles.link : "ans-card-link"}>{body}</a> : <Link href={directHref} prefetch={false} className={compact ? styles.link : "ans-card-link"}>{body}</Link>}
    {hasFooterBar && <div className="flex items-center justify-between gap-2 border-t border-border/40 bg-muted/15 px-3.5 py-1.5 text-[11px]">
      {project.memberHref && project.sourceUrl && /^https?:\/\//.test(project.sourceUrl) ? (
        <a href={project.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
          {isEn ? "Open Link / Repo ↗" : "直达体验 / 源码 ↗"}
        </a>
      ) : <span />}
      <Link href={`/explore/${project.slug}`} prefetch={false} className="text-foreground/80 hover:text-foreground hover:underline">{isEn ? "Guide & Info →" : "项目指南 →"}</Link>
    </div>}
  </article>;
}
