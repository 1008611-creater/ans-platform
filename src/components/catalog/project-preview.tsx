import { catalogText } from "@/domain/catalog/content";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { FileText, Terminal, Route, Globe, Film, GitBranch, ExternalLink } from "lucide-react";
import type { CatalogProject } from "@/domain/catalog/projects";

export async function ProjectPreview({ project, large = false }: { project: CatalogProject; large?: boolean }) {
  const [t, locale] = await Promise.all([getTranslations("product"), getLocale()]);
  if (project.coverUrl) return <figure className="overflow-hidden rounded-3xl border bg-muted/20">
    <Image src={project.coverUrl} alt={catalogText(project, t, "title", locale)} width={1280} height={800} unoptimized className={`aspect-[8/5] h-auto w-full object-cover object-top ${large ? "max-h-[520px]" : ""}`} />
    {large && <figcaption className="border-t px-5 py-3 text-xs text-muted-foreground">{project.coverNote ?? t("realProject.cover")}</figcaption>}
  </figure>;
  const Icon = { document: FileText, code: Terminal, plan: Route, character: FileText, site: Globe, video: Film, agent: GitBranch }[project.preview];
  return <div className={`ans-project-preview ans-preview-${project.preview} ${large ? "ans-preview-large" : ""}`}>
    <span className="ans-preview-caption">{t("realProject.info")}</span>
    <div className="ans-preview-paper min-w-0">
      <Icon size={25} aria-hidden="true" /><p className="mt-4 break-words text-lg font-semibold leading-7">{catalogText(project, t, "title", locale)}</p>
      <p className="mt-3 break-words text-xs leading-6 text-muted-foreground">{catalogText(project, t, "sample", locale)}</p>
      <div className="mt-5 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground"><ExternalLink className="h-3 w-3" aria-hidden="true"/>{t("realProject.openForAppearance")}</div>
    </div>
  </div>;
}
