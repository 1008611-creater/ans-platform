import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { AgriReferenceRecord } from "@/components/competitions/agri-reference-record";
export const dynamic = "force-dynamic";
export default async function AgriRecordPage({ params, searchParams }: { params: Promise<{ submissionId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { submissionId } = await params, query = await searchParams, t = await getTranslations("product.agriTasks"), nav = await getTranslations("product.agrihackathon");
  const issueId = typeof query.issue === "string" && query.issue.length <= 80 ? query.issue : null;
  const demoCheckId = typeof query.demo === "string" && query.demo.length <= 80 ? query.demo : null;
  const isStaff = query.scope === "staff";
  return <div className="container max-w-5xl space-y-6 py-8"><div className="flex flex-wrap items-center gap-2"><Button asChild variant="ghost"><WorkspaceLink href="/competitions/agrihackathon/tasks">{t("references.backTasks")}</WorkspaceLink></Button><Button asChild variant="outline" size="sm"><WorkspaceLink href="/competitions/agrihackathon/submissions">{nav("crossNav.submissions")}</WorkspaceLink></Button>{isStaff && <Button asChild variant="outline" size="sm"><WorkspaceLink href="/competitions/agrihackathon/works">{nav("organizerNav.works")}</WorkspaceLink></Button>}<Button asChild variant="outline" size="sm"><WorkspaceLink href="/competitions/agrihackathon">{nav("crossNav.hub")}</WorkspaceLink></Button></div><h1 className="text-3xl font-semibold tracking-tight">{t("references.recordTitle")}</h1><AgriReferenceRecord submissionId={submissionId} issueId={issueId} demoCheckId={demoCheckId} scope={isStaff ? "staff" : "team"} /></div>;
}
