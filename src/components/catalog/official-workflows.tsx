import { HypitWorkflowCard } from "@/components/catalog/hypit-workflow-card";
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
  return <div className={`ans-workflow-grid${compact ? " ans-workflow-grid-compact" : ""}`}>
    <article className="ans-flow-card ans-video-card ans-featured-workflow">
      <Film className="h-8 w-8 shrink-0" aria-hidden="true" />
      <div className="ans-featured-workflow-copy">
        <span className="text-xs font-medium">{t("toonflow.tag")}</span>
        <h3 className="mt-2 text-2xl font-semibold">{t("toonflow.title")}</h3>
        <p className="mt-2 text-sm leading-6">{t("toonflow.body")}</p>
      </div>
      <div className="ans-featured-workflow-action">
        <p className="text-xs">{t("toonflow.status")}</p>
        <Button asChild variant="secondary"><Link href="https://hb.cauai.fun/">{t("openWorkflow")}<ArrowRight className="ms-2 h-4 w-4" aria-hidden="true" /></Link></Button>
      </div>
    </article>
    {!compact && <HypitWorkflowCard />}
    {projects.map((project) => <article key={project.slug} className="ans-flow-card ans-workflow-tile">
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><GitBranch className="h-4 w-4 text-primary" aria-hidden="true" />{t("officialWorkflow")}</p>
      <h3 className="mt-3 text-lg font-semibold">{catalogText(project, t, "title", locale)}</h3>
      <p className="ans-workflow-output">{catalogText(project, t, "output", locale)}</p>
      <div className="ans-workflow-tile-footer">
        <p className="text-xs text-muted-foreground">{t("cost", { points: PROJECT_WORKFLOW_COST_POINTS })}</p>
        <Button asChild size="sm"><Link href={projectStartHref(project)!}>{t("openWorkflow")}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Button>
      </div>
    </article>)}
  </div>;
}
