import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { ComputeError } from "@/server/compute/policy";
import { readComputeHistory, type ComputeHistoryFilter } from "@/server/compute/member-history";
import { ComputeHistory } from "@/components/workspace/compute-history";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("product.computeHistory");
  return { title: t("title"), description: t("description"), robots: { index: false, follow: false } };
}

export default async function ComputeHistoryPage({ searchParams }: {
  searchParams?: Promise<{ filter?: string | string[]; cursor?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fworkspace%2Fcompute");
  const t = await getTranslations("product.computeHistory");
  const query = await searchParams ?? {};
  const filters: ComputeHistoryFilter[] = ["all", "active", "settled", "released"];
  const filter = typeof query.filter === "string" && filters.includes(query.filter as ComputeHistoryFilter)
    ? query.filter as ComputeHistoryFilter : "all";
  const cursor = typeof query.cursor === "string" ? query.cursor : undefined;
  let history;
  let failed = false;
  let invalidCursor = Array.isArray(query.cursor);
  if (!invalidCursor) {
    try { history = await readComputeHistory(session.user.id, { filter, cursor }); }
    catch (error) {
      if (error instanceof ComputeError && error.code === "COMPUTE_ACCOUNT_UNAVAILABLE") redirect("/login?callbackUrl=%2Fworkspace%2Fcompute");
      invalidCursor = error instanceof ComputeError && error.code === "COMPUTE_CURSOR_INVALID";
      failed = !invalidCursor;
    }
  }
  if (!history) return <div className="ans-product-shell"><div className="ans-product-container space-y-6 py-12">
    <Button asChild variant="ghost"><Link href="/workspace">{t("back")}</Link></Button>
    <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
    <div role="alert" className="max-w-2xl rounded-[var(--radius)] border p-6">
      <p className="font-medium">{t(failed ? "unavailableTitle" : "cursorTitle")}</p>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{t(failed ? "unavailableBody" : "cursorBody")}</p>
      <Button asChild variant="outline" className="mt-5"><a href={`/workspace/compute?filter=${filter}`}>{t("reload")}</a></Button>
    </div>
  </div></div>;
  return <ComputeHistory history={history} filter={filter} paged={!!cursor} />;
}
