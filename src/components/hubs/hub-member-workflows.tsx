import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { WorkflowShowcase } from "@/components/workflows/workflow-showcase";
import type { HubWorkflowPage } from "@/contracts/workflow-hubs";

export async function HubMemberWorkflowList({ page, slug }: { page: HubWorkflowPage | null; slug: string }) {
  const t = await getTranslations("hubs.associations");
  return <section className="space-y-6" aria-labelledby="hub-member-workflows"><h2 id="hub-member-workflows" className="text-xl font-semibold">{t("memberTitle")}</h2>
    {page === null ? <p role="status">{t("loadUnavailable")}</p> : !page.items.length ? <p className="text-sm text-muted-foreground">{t("emptyMembers")}</p> : <><div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">{page.items.map(row => <WorkflowShowcase key={row.id} title={row.title} summary={row.summary} href={`/workflows/${row.slug}`} version={row.version} presentation={row.presentation} marketPath={row.marketPath} />)}</div>{page.nextCursor && <Button asChild variant="outline"><Link href={`/hubs/${slug}?${new URLSearchParams({ cursor: page.nextCursor })}`}>{t("next")}</Link></Button>}</>}
  </section>;
}
