import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getAdminContext, hasAdminPermission } from "@/lib/admin-permissions";
import { listCommunityReports } from "@/server/community/moderation";
import { CommunityReportQueue, type CommunityReportItem } from "@/components/admin/community-report-queue";

export const dynamic = "force-dynamic";

export default async function CommunityReportsPage() {
  const context = await getAdminContext();
  if (!context) redirect("/login?callbackUrl=%2Fadmin%2Fcommunity-reports");
  const t = await getTranslations("product.communityReports");
  if (!hasAdminPermission(context.permissions, "REPORTS_MANAGE")) return <div className="ans-product-container py-12"><p role="alert">{t("forbidden")}</p></div>;

  const { posts, bottles } = await listCommunityReports();
  const serialize = <T extends { createdAt: Date }>(report: T) => ({ ...report, createdAt: report.createdAt.toISOString() });
  const items: CommunityReportItem[] = [
    ...posts.map((post) => ({ target: "post" as const, id: post.id, title: post.title, body: post.body, status: post.status, createdAt: post.createdAt.toISOString(), author: post.author, reports: post.reports.map(serialize) })),
    ...bottles.map((bottle) => ({ target: "bottle" as const, id: bottle.id, title: null, body: bottle.body, status: bottle.status, createdAt: bottle.createdAt.toISOString(), author: bottle.author, reports: bottle.reports.map(serialize) })),
  ].sort((a, b) => Number(b.status === "HIDDEN") - Number(a.status === "HIDDEN") || b.reports.length - a.reports.length);

  return <div className="ans-product-shell"><div className="ans-product-container max-w-3xl py-10 sm:py-14">
    <header className="mb-8">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-3 leading-7 text-muted-foreground">{t("body")}</p>
    </header>
    <CommunityReportQueue items={items} />
  </div></div>;
}
