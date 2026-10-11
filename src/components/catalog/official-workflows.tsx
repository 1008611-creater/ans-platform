import { catalogText } from "@/domain/catalog/content";
import Link from "next/link";
import { WORKFLOW_RECIPES } from "@/domain/catalog/projects";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Film, GitBranch } from "lucide-react";
import { projectStartHref } from "@/domain/catalog/projects";
import { PROJECT_WORKFLOW_COST_POINTS } from "@/contracts/projects";
import { Button } from "@/components/ui/button";

export async function OfficialWorkflows({ compact = false }: { compact?: boolean }) {
  const [t, locale] = await Promise.all([getTranslations("product"), getLocale()]);
  const projects = WORKFLOW_RECIPES.filter((project) => project.workflowId).slice(0, compact ? 2 : undefined);
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    <article className="ans-flow-card ans-video-card"><Film className="h-7 w-7" aria-hidden="true" /><span className="mt-5 block text-xs font-medium">{t("toonflow.tag")}</span><h3 className="mt-2 text-2xl font-semibold">{t("toonflow.title")}</h3><p className="mt-3 text-sm leading-6">{t("toonflow.body")}</p><p className="mt-4 text-xs">{t("toonflow.status")}</p><Button asChild variant="secondary" className="mt-6 w-fit"><Link href="/workflows/toonflow">{t("openWorkflow")}<ArrowRight className="ms-2 h-4 w-4" aria-hidden="true" /></Link></Button></article>
    {projects.map((project) => <article key={project.slug} className="ans-flow-card"><GitBranch className="h-6 w-6 text-primary" aria-hidden="true" /><p className="mt-5 text-xs text-muted-foreground">{t("officialWorkflow")}</p><h3 className="mt-2 text-lg font-semibold">{catalogText(project, t, "title", locale)}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{catalogText(project, t, "output", locale)}</p><p className="mt-4 text-xs text-muted-foreground">{t("cost", { points: PROJECT_WORKFLOW_COST_POINTS })}</p><div className="mt-6 flex flex-wrap gap-3"><Button asChild size="sm"><Link href={projectStartHref(project)!}>{t("openWorkflow")}</Link></Button></div></article>)}
  </div>;
}
