import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OfficialWorkflows } from "@/components/catalog/official-workflows";
import { PublishedWorkflowList } from "./published-workflow-list";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("product");
  return { title: t("nav.workflows"), description: t("workflowCenterBody") };
}

export default async function WorkflowsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 200) : "";
  const t = await getTranslations("product");
  return (
    <div className="ans-product-shell"><div className="ans-product-container space-y-10 py-12">
      <header className="max-w-3xl">
        <p className="ans-eyebrow">{t("workflowEntry")}</p>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{t("workflowCenterTitle")}</h1>
        <p className="mt-5 leading-8 text-muted-foreground">{t("workflowCenterBody")}</p>
      </header>
      <section aria-labelledby="official-workflows-heading"><h2 id="official-workflows-heading" className="sr-only">{t("officialWorkflow")}</h2><OfficialWorkflows /></section>
      <section>
        <div className="ans-section-heading">
          <div><h2>{t("communityWorkflows")}</h2></div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link href="/workflows/mine">{t("myWorkflows")}</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href="/workflows/runs">{t("workflowRecords")}</Link></Button>
            <Button asChild size="sm"><Link href="/workflows/new">{t("createWorkflow")}</Link></Button>
          </div>
        </div>
        <form action="/workflows" className="mb-6 flex max-w-lg gap-2">
          <label htmlFor="workflow-search" className="sr-only">{t("workflowSearch")}</label>
          <Input id="workflow-search" name="q" type="search" autoComplete="off" defaultValue={query} placeholder={t("workflowSearchPlaceholder")} />
          <Button type="submit" variant="outline">{t("search")}</Button>
        </form>
        <Suspense key={query} fallback={<p role="status" className="py-8 text-sm text-muted-foreground">{t("workflowLoading")}</p>}>
          <PublishedWorkflowList query={query} />
        </Suspense>
      </section>
    </div></div>
  );
}
