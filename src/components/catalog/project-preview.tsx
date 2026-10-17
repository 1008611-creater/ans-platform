import { catalogText } from "@/domain/catalog/content";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { FileText, Terminal, Route, Globe, Film, GitBranch, ExternalLink } from "lucide-react";
import type { CatalogProject } from "@/domain/catalog/projects";

export async function ProjectPreview({ project, large = false }: { project: CatalogProject; large?: boolean }) {
  const [t, locale] = await Promise.all([getTranslations("product"), getLocale()]);
  if (project.coverUrl) return <figure className="overflow-hidden rounded-3xl border bg-muted/20">
    <Image src={project.coverUrl} alt={catalogText(project, t, "title", locale)} width={1280} height={800} unoptimized className={`aspect-[8/5] h-auto w-full object-cover object-top ${large ? "max-h-[520px]" : ""}`} />
  </figure>;
  const Icon = { document: FileText, code: Terminal, plan: Route, character: FileText, site: Globe, video: Film, agent: GitBranch }[project.preview];
  return <div className={`ans-project-preview ans-preview-${project.preview} ${large ? "ans-preview-large" : ""}`}>
    <div className="ans-preview-paper min-w-0">
      <Icon size={25} aria-hidden="true" />
      <p className="mt-3 break-words text-xs font-medium leading-6 text-muted-foreground">{catalogText(project, t, "sample", locale)}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-6">{catalogText(project, t, "output", locale)}</p>
    </div>
  </div>;
}
