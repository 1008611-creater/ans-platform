import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublicDisplayName } from "@/lib/public-identity";
import { listPublishedWorkflows } from "@/server/workflows/service";

// Stream separately so an unavailable community database cannot hide official recipes.
export async function PublishedWorkflowList({ query }: { query: string }) {
  const t = await getTranslations("product");
  let workflows: Awaited<ReturnType<typeof listPublishedWorkflows>>;
  try {
    workflows = await listPublishedWorkflows({ query: query || undefined, take: 24 });
  } catch (error) {
    console.error("[workflows] Published list unavailable", { errorType: error instanceof Error ? error.name : "unknown" });
    return (
      <div className="ans-empty" role="status">
        <h3 className="font-semibold">{t("workflowUnavailableTitle")}</h3>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{t("workflowUnavailableBody")}</p>
        <Button asChild variant="outline" className="mt-5">
          <a href={query ? `/workflows?q=${encodeURIComponent(query)}` : "/workflows"}>{t("retry")}</a>
        </Button>
      </div>
    );
  }
  if (workflows.length === 0) {
    return <div className="ans-empty"><p className="text-sm text-muted-foreground">{t("workflowEmpty")}</p></div>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workflows.map((workflow) => (
        <Link key={workflow.id} href={`/workflows/${workflow.slug}`} className="ans-flow-card transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">
          <GitBranch className="h-5 w-5 text-primary" aria-hidden="true" />
          <h3 className="mt-4 break-words text-base font-semibold">{workflow.title}</h3>
          {workflow.summary && <p className="mt-3 line-clamp-3 break-words text-sm leading-6 text-muted-foreground">{workflow.summary}</p>}
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">v{workflow.publishedVersion ?? 1}</Badge>
            <Badge variant="outline">{t("cost", { points: Math.max(1, workflow.estimatedCost) })}</Badge>
            <span>{getPublicDisplayName(workflow.author)}</span>
            <span>{t("workflowUses", { count: workflow.useCount })}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
