import { getTranslations } from "next-intl/server";
import { AgriContestantFlowBar } from "@/components/competitions/agri-contestant-flow-bar";
import { Button } from "@/components/ui/button";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { AgriReferenceRecord } from "@/components/competitions/agri-reference-record";
export const dynamic = "force-dynamic";
export default async function AgriRecordPage({ params, searchParams }: { params: Promise<{ submissionId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { submissionId } = await params, query = await searchParams, t = await getTranslations("product.agriTasks"), nav = await getTranslations("product.agrihackathon");
  const issueId = typeof query.issue === "string" && query.issue.length <= 80 ? query.issue : null;
  const demoCheckId = typeof query.demo === "string" && query.demo.length <= 80 ? query.demo : null;
  const isStaff = query.scope === "staff";
  return <div className="container max-w-5xl space-y-5 py-6 sm:py-8">
    <AgriContestantFlowBar current="tasks" backHref="/competitions/agrihackathon/tasks" backLabel={t("references.backTasks")} nav={nav} />
    {isStaff && <div className="flex flex-wrap items-center gap-2"><Button asChild variant="outline" size="sm"><WorkspaceLink href="/competitions/agrihackathon/works">{nav("organizerNav.works")}</WorkspaceLink></Button></div>}
    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("references.recordTitle")}</h1>
    <AgriReferenceRecord submissionId={submissionId} issueId={issueId} demoCheckId={demoCheckId} scope={isStaff ? "staff" : "team"} />
  </div>;
}
