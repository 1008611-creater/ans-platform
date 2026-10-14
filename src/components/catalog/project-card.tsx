import { catalogText, catalogSourceLabel } from "@/domain/catalog/content";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import type { CatalogProject } from "@/domain/catalog/projects";
import { ProjectPreview } from "./project-preview";
import { RevealDetails } from "./reveal-details";
import styles from "./project-card.module.css";

export async function ProjectCard({ project, compact = false }: { project: CatalogProject; compact?: boolean }) {
  const [t, locale] = await Promise.all([getTranslations("product"), getLocale()]);
  if (compact) {
    const title = catalogText(project, t, "title", locale);
    const descriptionId = `project-${project.slug}-info`;
    return <RevealDetails id={descriptionId} label={t("catalogBrowse.info", { title })} className={styles.card} details={<>
      <div className={styles.metadata}><span>{t(`categories.${project.category}`)}</span><span>{t(catalogSourceLabel(project.source))}</span></div>
      {project.creator && <p>{project.creator}</p>}
      <p>{catalogText(project, t, "summary", locale)}</p>
      <p>{t(project.workflowId ? "ready" : project.memberHref ? "realProject.member" : project.source === "official" ? "realProject.externalProduct" : "reference")}</p>
    </>}>
      <Link href={`/explore/${project.slug}`} prefetch={false} className={styles.link} aria-describedby={descriptionId}>
        <ProjectPreview project={project} />
        <div className={styles.title}><h3>{title}</h3><ArrowUpRight aria-hidden="true" /></div>
      </Link>
    </RevealDetails>;
  }
  return <article className="ans-project-card">
    <Link href={`/explore/${project.slug}`} className="ans-card-link">
      <ProjectPreview project={project} />
      <div className="p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{t(`categories.${project.category}`)}</span><span aria-hidden="true">/</span><span>{t(catalogSourceLabel(project.source))}</span></div>
        {project.creator && <p className="mb-2 text-xs text-muted-foreground">{project.creator}</p>}
        <h3 className="text-pretty text-lg font-semibold leading-7">{catalogText(project, t, "title", locale)}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{catalogText(project, t, "summary", locale)}</p>
        <div className="mt-6 flex items-center justify-between gap-2"><span className="ans-status">{t(project.workflowId ? "ready" : project.memberHref ? "realProject.member" : project.source === "official" ? "realProject.externalProduct" : "reference")}</span><ArrowUpRight className="h-5 w-5 shrink-0" aria-hidden="true" /></div>
      </div>
    </Link>
  </article>;
}
