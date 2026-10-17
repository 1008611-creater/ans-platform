import { catalogText } from "@/domain/catalog/content";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import type { CatalogProject } from "@/domain/catalog/projects";
import { ProjectPreview } from "./project-preview";
import styles from "./project-card.module.css";

export async function ProjectCard({ project, compact = false }: { project: CatalogProject; compact?: boolean }) {
  const [t, locale] = await Promise.all([getTranslations("product"), getLocale()]);
  const directHref = project.memberHref ?? (project.workflowId === "resume-website" ? "/market/resume-website" : project.workflowId === "easel" ? "/competitions/aigc" : project.workflowId === "hypit" ? "/workflows/hypit" : project.workflowId === "toonflow" ? "https://toonflow.cauai.fun" : project.workflowId ? `/projects?goal=${project.goal}&workflow=${project.workflowId}#new-project` : project.sourceUrl ?? `/explore/${project.slug}`);
  const isExternal = /^https?:\/\//.test(directHref);
  const isEn = locale.startsWith("en");
  const title = catalogText(project, t, "title", locale);
  const summary = catalogText(project, t, "summary", locale);
  const actionLabel = project.memberHref || project.workflowId ? (isEn ? "⚡ Launch Now" : "⚡ 立即进入") : project.source === "official" ? (isEn ? "🚀 Open App ↗" : "🚀 直达体验 ↗") : (isEn ? "📦 Open Project ↗" : "📦 直达项目 ↗");
  const body = <>
    <ProjectPreview project={project} />
    <div className="p-3.5 sm:p-4">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
        <span>{t(`categories.${project.category}`)}</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{actionLabel}</span>
      </div>
      <div className={styles.title}><h3>{title}</h3><ArrowUpRight aria-hidden="true" /></div>
      <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">{summary}</p>
    </div>
  </>;
  return <article className={compact ? `${styles.card} flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card transition hover:border-primary/50` : "ans-project-card flex flex-col justify-between"}>
    {isExternal ? <a href={directHref} target="_blank" rel="noopener noreferrer" className={compact ? styles.link : "ans-card-link"}>{body}</a> : <Link href={directHref} prefetch={false} className={compact ? styles.link : "ans-card-link"}>{body}</Link>}
    {directHref !== `/explore/${project.slug}` && <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-3.5 py-2 text-[11px]">
      {isExternal ? <a href={directHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">{actionLabel}</a> : <Link href={directHref} prefetch={false} className="font-semibold text-primary hover:underline">{actionLabel}</Link>}
      <Link href={`/explore/${project.slug}`} prefetch={false} className="text-muted-foreground hover:text-foreground hover:underline">{isEn ? "Guide & Info →" : "项目指南 →"}</Link>
    </div>}
  </article>;
}
