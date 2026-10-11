import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OfficialWorkflows } from "@/components/catalog/official-workflows";
import { PublishedWorkflowList } from "./published-workflow-list";
import { PageHeading } from "@/components/layout/page-heading";

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
    <div className="ans-product-shell"><div className="ans-product-container ans-page-content ans-workflows-page">
      <PageHeading eyebrow={t("workflowEntry")} title={t("workflowCenterTitle")} description={t("workflowCenterBody")}
        actions={<>
          <Button asChild variant="outline"><Link href="/workflows/mine">{t("myWorkflows")}</Link></Button>
          <Button asChild variant="outline"><Link href="/workflows/runs">{t("workflowRecords")}</Link></Button>
          <Button asChild><Link href="/workflows/new">{t("createWorkflow")}</Link></Button>
        </>} />
      <section aria-labelledby="official-workflows-heading"><h2 id="official-workflows-heading" className="sr-only">{t("officialWorkflow")}</h2><OfficialWorkflows /></section>
      <section className="ans-community-workflows">
        <div className="ans-workflow-community-heading">
          <h2>{t("communityWorkflows")}</h2>
        <form action="/workflows" className="ans-search-form ans-workflow-search">
          <label htmlFor="workflow-search" className="ans-search-label">{t("workflowSearch")}</label>
          <Input id="workflow-search" name="q" type="search" autoComplete="off" defaultValue={query} placeholder={t("workflowSearchPlaceholder")} />
          <Button type="submit" variant="outline">{t("search")}</Button>
        </form>
        </div>

        <Suspense key={query} fallback={<div className="ans-loading-region" role="status"><p>{t("workflowLoading")}</p><div className="ans-loading-grid" aria-hidden="true">{[1, 2, 3].map(item => <div key={item} className="ans-loading-block" />)}</div></div>}>
          <PublishedWorkflowList query={query} />
        </Suspense>
      </section>
    </div></div>
  );
}
