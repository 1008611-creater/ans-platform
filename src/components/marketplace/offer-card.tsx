import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, Check, PackageCheck } from "lucide-react";
import type { MarketOfferView } from "@/contracts/marketplace-view";
export async function MarketOfferCard({ offer, owner = false, headingLevel = 2 }: { offer: MarketOfferView; owner?: boolean; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const [t, p] = await Promise.all([getTranslations("product.market"), getTranslations("product")]);
  const w = await getTranslations("marketWorkflow");
  const listing = offer.listing;
  const status = offer.submittedAt && !offer.reviewedAt ? "PENDING" : offer.status;
  return <Link href={owner ? "/market/creator/" + offer.id : "/market/" + offer.slug} className="ans-project-card flex min-w-0 flex-col p-6">
    <div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-primary">{p("categories." + listing.category)} · {p("children." + listing.subcategory)}</span><ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" /></div>
    <div className="my-5 rounded-2xl border bg-muted/30 p-5"><PackageCheck className="mb-4 h-7 w-7 text-primary" aria-hidden="true"/><ul className="space-y-2 text-sm">{listing.deliverables.slice(0, 3).map((item, index) => <li key={index} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true"/><span className="break-words">{item}</span></li>)}</ul></div>
    <Heading className="break-words text-xl font-semibold">{listing.title}</Heading><p className="mt-3 flex-1 break-words text-sm leading-7 text-muted-foreground">{listing.summary}</p>
    <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-t pt-4"><div><p className="text-xs text-muted-foreground">{offer.official ? p("official") : offer.seller.nickname || offer.seller.username}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{listing.execution ? w("computeOnRun") : listing.priceMinor === 0 ? p("realProject.freeShare") : t("pointsUnit", { amount: listing.priceMinor / 100 })}</p></div><span className="text-xs text-muted-foreground">{owner ? t("listingStatus." + status) : listing.execution ? w("runnable") : t("delivery", { days: listing.deliveryDays })}</span></div>
  </Link>;
}
