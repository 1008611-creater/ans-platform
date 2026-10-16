import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { readQuotaHistory } from "@/server/quota/history";
import { QuotaError } from "@/server/quota/service";
import { Button } from "@/components/ui/button";
import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import { ComputeBenefits } from "@/components/workspace/compute-benefits";
import { CreditsCenter } from "@/components/workspace/credits-center";
import { CreditGiftClaim } from "@/components/workspace/credit-gift-claim";
import { readCreditGiftOffer } from "@/server/quota/gift-offer";
import { getCreditProducts } from "@/lib/credits-catalog";
import { readPersonalApiHistory } from "@/server/quota/api-history";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("product.quotaHistory");
  return { title: t("centerTitle"), robots: { index: false, follow: false } };
}
export default async function CreditsPage({ searchParams }: { searchParams?: Promise<{ cursor?: string | string[] }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fworkspace%2Fcredits");
  const [t, locale, query] = await Promise.all([getTranslations("product.quotaHistory"), getLocale(), searchParams ?? Promise.resolve({} as { cursor?: string | string[] })]);
  const voiceText = await getTranslations("product.voiceUsage");
  const agriNav = await getTranslations("product.agrihackathon");
  const agriWall = await getTranslations("agriWall");
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 6 });
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Shanghai" });
  let history;
  let invalid = Array.isArray(query.cursor);
  if (!invalid) try { history = await readQuotaHistory(session.user.id, query.cursor === undefined ? {} : { cursor: query.cursor }); }
  catch (error) {
    if (error instanceof QuotaError && error.status === 404) redirect("/login?callbackUrl=%2Fworkspace%2Fcredits");
    invalid = error instanceof QuotaError && error.status === 400;
  }
  const [giftOffer, apiHistory] = history ? await Promise.all([
    process.env.ANS_COMPUTE_BENEFITS_ENABLED === "1" ? Promise.resolve(null) : readCreditGiftOffer(session.user.id).catch(() => null),
    readPersonalApiHistory(session.user.id).catch(() => null),
  ]) : [null, null];
  return <AccountContentBoundary actorId={session.user.id}><div className="ans-product-shell"><div className="ans-product-container space-y-7 py-8 sm:py-12">
    <div className="flex flex-wrap items-center gap-3"><Link href="/workspace" className="text-sm text-muted-foreground hover:text-foreground">{t("back")}</Link><Button asChild variant="outline" size="sm"><Link href="/competitions/agrihackathon">{agriNav("crossNav.hub")}</Link></Button><Button asChild variant="outline" size="sm"><Link href="/competitions/agrihackathon/submissions">{agriNav("crossNav.submissions")}</Link></Button><Button asChild variant="outline" size="sm"><Link href="/explore/submit?event=agrihackathon">{agriWall("publish")}</Link></Button></div>
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">{t("centerTitle")}</h1><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{t("centerDescription")}</p></div><Button asChild variant="outline"><Link href="/workspace/credits" prefetch={false}>{t("refresh")}</Link></Button></header>
    {!history ? <p role="alert" className="rounded-[var(--radius)] border p-5">{t(invalid ? "invalid" : "unavailable")}</p> : <>
      {process.env.ANS_COMPUTE_BENEFITS_ENABLED === "1" && <ComputeBenefits actorId={session.user.id} compact />}
      {giftOffer && <CreditGiftClaim actorId={session.user.id} offer={giftOffer} />}
      <CreditsCenter actorId={session.user.id} billing={history.billing} availablePoints={Number(history.availablePoints)} reservedPoints={history.reservedPoints} pendingCount={history.pendingCount} apiHistory={apiHistory} products={getCreditProducts(process.env)} />
      <section aria-labelledby="credit-ledger-heading" className="space-y-4">
      <div><h2 id="credit-ledger-heading" className="text-xl font-semibold">{t("title")}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("ledgerDescription")}</p></div>
      {history.entries.length === 0 ? <p className="border-t py-8 text-muted-foreground">{t("empty")}</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">{t("title")}</caption><thead><tr className="border-b text-start">{["date","reason","amount","balance"].map(key => <th key={key} scope="col" className="whitespace-nowrap px-3 py-3 text-start font-medium">{t(key)}</th>)}</tr></thead><tbody>{history.entries.map(entry => <tr key={entry.id} className="border-b"><td className="whitespace-nowrap px-3 py-4"><time dateTime={entry.createdAt}>{dates.format(new Date(entry.createdAt))}</time></td><td className="px-3 py-4">{t(`reasons.${entry.category}`)}</td><td className="whitespace-nowrap px-3 py-4 font-medium tabular-nums">{entry.amount > 0 ? "+" : ""}{numbers.format(entry.amount)}</td><td className="px-3 py-4 tabular-nums">{entry.balanceAfter === null ? "-" : numbers.format(entry.balanceAfter)}</td></tr>)}</tbody></table></div>}
      </section>
      {history.voiceUsage.length > 0 && <section className="space-y-3 rounded-[var(--radius)] border p-5" aria-labelledby="voice-usage-title">
        <h2 id="voice-usage-title" className="font-semibold">{voiceText("title")}</h2><p className="text-sm leading-6 text-muted-foreground">{voiceText("description")}</p>
        <ul className="divide-y">{history.voiceUsage.map(call => <li key={call.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
          <time dateTime={call.createdAt}>{dates.format(new Date(call.createdAt))}</time><span>{voiceText(`states.${call.state}`)}</span>
          <span>{voiceText("characters", { count: call.maxUnits })}</span><span className="font-medium">{voiceText(call.settledPoints === null ? "reserved" : "zero")}</span>
        </li>)}</ul>
      </section>}
      <nav className="flex gap-3" aria-label={t("title")}><Button asChild variant="outline"><Link href="/workspace/credits">{t("first")}</Link></Button>{history.nextCursor && <Button asChild variant="outline"><Link href={`/workspace/credits?cursor=${encodeURIComponent(history.nextCursor)}`}>{t("next")}</Link></Button>}</nav>
    </>}
  </div></div></AccountContentBoundary>;
}
