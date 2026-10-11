import { catalogText, catalogSourceLabel } from "@/domain/catalog/content";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import type { CatalogProject } from "@/domain/catalog/projects";
import { ProjectPreview } from "./project-preview";

export async function ProjectCard({ project }: { project: CatalogProject }) {
  const [t, locale] = await Promise.all([getTranslations("product"), getLocale()]);
  return <article className="ans-project-card">
    <Link href={project.memberHref ?? `/explore/${project.slug}`} className="ans-card-link">
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
