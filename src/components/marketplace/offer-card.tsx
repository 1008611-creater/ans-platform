import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, Check, Github, PackageCheck, Star } from "lucide-react";
import type { MarketOfferView } from "@/contracts/marketplace-view";

export async function MarketOfferCard({ offer, owner = false, headingLevel = 2 }: { offer: MarketOfferView; owner?: boolean; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const [t, tp, p] = await Promise.all([getTranslations("product.market"), getTranslations("product.marketProject"), getTranslations("product")]);
  const w = await getTranslations("marketWorkflow");
  const listing = offer.listing; const tiers = listing.pricingTiers ?? [];
  const minimum = tiers.length ? Math.min(...tiers.map(tier => tier.priceMinor)) : listing.priceMinor;
  const status = offer.submittedAt && !offer.reviewedAt ? "PENDING" : offer.status;
  return <Link href={owner ? "/market/creator/" + offer.id : "/market/" + offer.slug} className="ans-project-card flex min-w-0 flex-col overflow-hidden">
    {listing.coverUrl && <div className="aspect-video overflow-hidden border-b bg-muted/30"><Image unoptimized src={listing.coverUrl} width={960} height={540} alt={tp("projectCover", { title: listing.title })} className="h-full w-full object-cover"/></div>}
    <div className="flex flex-1 flex-col p-6"><div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-primary">{p("categories." + listing.category)} · {p("children." + listing.subcategory)}</span><ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true"/></div>
      <Heading className="mt-5 break-words text-xl font-semibold">{listing.title}</Heading><p className="mt-3 flex-1 break-words text-sm leading-7 text-muted-foreground">{listing.summary}</p>
      <div className="my-5 rounded-xl border bg-muted/20 p-4"><div className="mb-3 flex items-center gap-2 text-xs font-medium"><PackageCheck className="h-4 w-4 text-primary" aria-hidden="true"/>{t("whatYouGet")}</div><ul className="space-y-2 text-sm">{listing.deliverables.slice(0, 3).map((item,index) => <li key={index} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true"/><span className="break-words">{item}</span></li>)}</ul></div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">{listing.githubUrl && <span className="inline-flex items-center gap-1.5"><Github className="h-3.5 w-3.5" aria-hidden="true"/>{tp("githubProject")}</span>}<span className="inline-flex items-center gap-1.5" aria-label={tp("starCount", { count: offer.starCount ?? 0 })}><Star className="h-3.5 w-3.5" aria-hidden="true"/>{offer.starCount ?? 0}</span></div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t pt-4"><div><p className="text-xs text-muted-foreground">{offer.official ? p("official") : offer.seller.nickname || offer.seller.username}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{listing.execution ? w("computeOnRun") : minimum === 0 ? p("realProject.freeShare") : tiers.length > 1 ? tp("fromPoints", { amount: minimum / 100 }) : t("pointsUnit", { amount: minimum / 100 })}</p></div><span className="text-xs text-muted-foreground">{owner ? t("listingStatus." + status) : listing.execution ? w("runnable") : t("delivery", { days: listing.deliveryDays })}</span></div>
    </div>
  </Link>;
}
