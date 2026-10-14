import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { WorkflowShowcase } from "@/components/workflows/workflow-showcase";
import { getPublicDisplayName } from "@/lib/public-identity";
import { listPublishedWorkflows } from "@/server/workflows/service";

// Stream separately so an unavailable community database cannot hide official recipes.
export async function PublishedWorkflowList({ query }: { query: string }) {
  const t = await getTranslations("product");
  let workflows: Awaited<ReturnType<typeof listPublishedWorkflows>>;
  try { workflows = await listPublishedWorkflows({ query: query || undefined, take: 24 }); }
  catch (error) {
    console.error("[workflows] Published list unavailable", { errorType: error instanceof Error ? error.name : "unknown" });
    return <div className="ans-empty" role="status"><h3 className="font-semibold">{t("workflowUnavailableTitle")}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{t("workflowUnavailableBody")}</p><Button asChild variant="outline" className="mt-5"><a href={query ? `/workflows?q=${encodeURIComponent(query)}` : "/workflows"}>{t("retry")}</a></Button></div>;
  }
  if (!workflows.length) return <div className="ans-empty"><p className="text-sm text-muted-foreground">{t("workflowEmpty")}</p></div>;
  return <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">{workflows.map(workflow => <WorkflowShowcase key={workflow.id} title={workflow.title} summary={workflow.summary} href={`/workflows/${workflow.slug}`} version={workflow.publishedVersion ?? 1} presentation={workflow.presentation} author={getPublicDisplayName(workflow.author)} useCount={workflow.useCount} />)}</div>;
}
