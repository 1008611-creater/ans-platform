import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { WorkflowEditor } from "@/components/workflows/workflow-editor";
import { Button } from "@/components/ui/button";
import { catalogText } from "@/domain/catalog/content";
import { listPublishedCatalog } from "@/server/catalog/service";
import type { WorkflowDefinition } from "@/contracts/workflow";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("workflowCatalog");
  return { title: `${t("createTitle")} · ANS`, description: t("createBody") };
}

/** Public source material pre-fills a private draft; it grants no runtime capability. */
export default async function NewWorkflowPage({ searchParams }: { searchParams: Promise<{ project?: string | string[] }> }) {
  const [params, session, t, product, locale] = await Promise.all([searchParams, auth(), getTranslations("workflowCatalog"), getTranslations("product"), getLocale()]);
  const requested = params.project;
  const sourceSlug = typeof requested === "string" && /^[a-z0-9][a-z0-9-]{0,95}$/.test(requested) ? requested : null;
  let sourceProject: { slug: string; title: string; inputs: string; output: string; sourceUrl?: string } | undefined;
  let sourceError: "Missing" | "Unavailable" | null = requested !== undefined && !sourceSlug ? "Missing" : null;
  if (sourceSlug) {
    try {
      const project = (await listPublishedCatalog()).find(item => item.slug === sourceSlug);
      if (!project) sourceError = "Missing";
      else sourceProject = { slug: project.slug, title: catalogText(project, product, "title", locale), inputs: catalogText(project, product, "inputs", locale), output: catalogText(project, product, "output", locale), ...(project.sourceUrl ? { sourceUrl: project.sourceUrl } : {}) };
    } catch { sourceError = "Unavailable"; }
  }
  if (sourceError) return <div className="container max-w-2xl space-y-5 py-16">
    <h1 className="text-2xl font-bold">{t(`source${sourceError}Title`)}</h1>
    <p className="text-sm leading-7 text-muted-foreground" role="status">{t(`source${sourceError}Body`)}</p>
    <div className="flex flex-wrap gap-3"><Button asChild><Link href="/explore">{t("backToProjects")}</Link></Button><Button asChild variant="outline"><Link href="/workflows/new">{t("createBlank")}</Link></Button></div>
  </div>;
  const callback = sourceSlug ? `/workflows/new?${new URLSearchParams({ project: sourceSlug })}` : "/workflows/new";
  // Source text is reference material, never new template variables or a tool manifest.
  const literal = (value: string) => value.replace(/\{\{/g, "{ {").replace(/\}\}/g, "} }");
  const definition: WorkflowDefinition | undefined = sourceProject ? {
    version: 1, maxNodes: 20,
    nodes: [
      { id: "draft", type: "model", label: t("sourceGenerate"), config: { prompt: t("sourcePrompt", { title: literal(sourceProject.title), inputs: literal(sourceProject.inputs), output: literal(sourceProject.output) }) + "{{input.topic}}", variables: [{ key: "topic", label: t("sourceTopic"), required: true }] }, timeoutMs: 60000, maxRetries: 1 },
      { id: "result", type: "output", label: t("sourceDeliver"), config: {}, timeoutMs: 1000, maxRetries: 0 },
    ],
    edges: [{ id: "draft-to-result", from: "draft", to: "result", mapping: {} }],
    experience: { version: 1, output: { label: t("sourcePlan"), format: "markdown" }, sourceProjectSlug: sourceProject.slug, stages: [{ id: "draft", title: t("sourceGenerate"), nodeIds: ["draft"] }, { id: "result", title: t("sourceDeliver"), nodeIds: ["result"] }] },
  } : undefined;
  const initialMeta = sourceProject ? { slug: "", title: t("sourceWorkflowTitle", { title: sourceProject.title }).slice(0, 120), summary: t("sourceSummary", { title: sourceProject.title }).slice(0, 240), description: t("sourceDescription", { title: sourceProject.title, inputs: sourceProject.inputs, output: sourceProject.output, url: sourceProject.sourceUrl ?? `/explore/${sourceProject.slug}` }).slice(0, 10000) } : undefined;
  return <div className="container max-w-7xl space-y-6 py-10">
    {!session?.user?.id && (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm" data-testid="workflow-new-guest-banner">
        <p className="text-muted-foreground">
          <strong className="font-semibold text-foreground">工作流编排画布（免登录体验）：</strong>
          登录账号后可保存工作流草稿并提交上架（享 80% 算力积分分成）。
        </p>
        <Button asChild size="sm">
          <Link href={`/login?callbackUrl=${encodeURIComponent(callback)}`}>{t("login")}</Link>
        </Button>
      </div>
    )}
    <Link href="/workflows/mine" className="text-sm text-primary">{t("backToMine")}</Link>
    <header className="space-y-2"><h1 className="text-3xl font-bold tracking-tight">{t("createTitle")}</h1><p className="max-w-prose text-sm leading-7 text-muted-foreground">{t("createBody")}</p></header>
    {sourceProject && <section aria-labelledby="source-project-title" className="space-y-4 rounded-xl border bg-muted/30 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{t("sourceTitle")}</p><h2 id="source-project-title" className="mt-2 break-words text-lg font-semibold">{sourceProject.title}</h2></div><Link href={`/explore/${sourceProject.slug}`} className="text-sm text-primary underline underline-offset-4">{t("sourceView")}</Link></div><p className="max-w-prose text-sm leading-7 text-muted-foreground">{t("sourceBody")}</p><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="font-medium">{t("sourceInputs")}</dt><dd className="mt-2 whitespace-pre-line break-words text-muted-foreground">{sourceProject.inputs}</dd></div><div><dt className="font-medium">{t("sourceOutput")}</dt><dd className="mt-2 whitespace-pre-line break-words text-muted-foreground">{sourceProject.output}</dd></div></dl></section>}
    <WorkflowEditor mode="create" initialMeta={initialMeta} initialDefinition={definition} sourceProject={sourceProject} />
  </div>;
}
