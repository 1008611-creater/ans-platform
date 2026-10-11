import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { readQuotaHistory } from "@/server/quota/history";
import { QuotaError } from "@/server/quota/service";
import { Button } from "@/components/ui/button";
import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import { CreditsCenter } from "@/components/workspace/credits-center";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("product.quotaHistory");
  return { title: t("title"), robots: { index: false, follow: false } };
}
export default async function CreditsPage({ searchParams }: { searchParams?: Promise<{ cursor?: string | string[] }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fworkspace%2Fcredits");
  const [t, locale, query] = await Promise.all([getTranslations("product.quotaHistory"), getLocale(), searchParams ?? Promise.resolve({} as { cursor?: string | string[] })]);
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 6 });
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Shanghai" });
  let history;
  let invalid = Array.isArray(query.cursor);
  if (!invalid) try { history = await readQuotaHistory(session.user.id, query.cursor === undefined ? {} : { cursor: query.cursor }); }
  catch (error) {
    if (error instanceof QuotaError && error.status === 404) redirect("/login?callbackUrl=%2Fworkspace%2Fcredits");
    invalid = error instanceof QuotaError && error.status === 400;
  }
  return <AccountContentBoundary actorId={session.user.id}><div className="ans-product-shell"><div className="ans-product-container space-y-7 py-8 sm:py-12">
    <Link href="/workspace" className="text-sm text-muted-foreground hover:text-foreground">{t("back")}</Link>
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1><p className="mt-3 text-muted-foreground">{t("description")}</p></div><Button asChild variant="outline"><Link href="/workspace/credits" prefetch={false}>{t("refresh")}</Link></Button></header>
    {!history ? <p role="alert" className="rounded-[var(--radius)] border p-5">{t(invalid ? "invalid" : "unavailable")}</p> : <>
      <CreditsCenter actorId={session.user.id} billing={history.billing} availablePoints={Number(history.availablePoints)} />
      <dl className="flex flex-wrap gap-x-12 gap-y-5 border-y py-6">
        <div><dt className="text-sm text-muted-foreground">{t("available")}</dt><dd className="mt-2 text-3xl font-semibold tabular-nums">{numbers.format(history.availablePoints)}</dd></div>
        <div><dt className="text-sm text-muted-foreground">{t("reserved")}</dt><dd className="mt-2 text-3xl font-semibold tabular-nums">{numbers.format(history.reservedPoints)}</dd></div>
      </dl>
      {history.pendingCount > 0 && <aside className="space-y-2 text-sm"><p className="font-medium">{t("pending", { count: history.pendingCount })}</p><p className="max-w-3xl leading-6 text-muted-foreground">{t("hold")}</p></aside>}
      <div className="space-y-2 text-sm leading-6 text-muted-foreground"><p>{t("rules")}</p><p>{t("recharge")}</p></div>
      {history.entries.length === 0 ? <p className="border-t py-8 text-muted-foreground">{t("empty")}</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">{t("title")}</caption><thead><tr className="border-b text-start">{["date","reason","amount","balance"].map(key => <th key={key} scope="col" className="whitespace-nowrap px-3 py-3 text-start font-medium">{t(key)}</th>)}</tr></thead><tbody>{history.entries.map(entry => <tr key={entry.id} className="border-b"><td className="whitespace-nowrap px-3 py-4"><time dateTime={entry.createdAt}>{dates.format(new Date(entry.createdAt))}</time></td><td className="px-3 py-4">{t(`reasons.${entry.category}`)}</td><td className="whitespace-nowrap px-3 py-4 font-medium tabular-nums">{entry.amount > 0 ? "+" : ""}{numbers.format(entry.amount)}</td><td className="px-3 py-4 tabular-nums">{entry.balanceAfter === null ? "-" : numbers.format(entry.balanceAfter)}</td></tr>)}</tbody></table></div>}
      <nav className="flex gap-3" aria-label={t("title")}><Button asChild variant="outline"><Link href="/workspace/credits">{t("first")}</Link></Button>{history.nextCursor && <Button asChild variant="outline"><Link href={`/workspace/credits?cursor=${encodeURIComponent(history.nextCursor)}`}>{t("next")}</Link></Button>}</nav>
    </>}
  </div></div></AccountContentBoundary>;
}
