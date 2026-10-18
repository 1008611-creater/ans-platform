import Link from "next/link";
import { marketProductPath } from "@/domain/marketplace/product-route";
import { getMarketOfferMetrics } from "@/domain/marketplace/presentation";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, Check } from "lucide-react";
import type { MarketOfferView } from "@/contracts/marketplace-view";

const FALLBACK_COVERS: Record<string, string> = {
  learning: "/catalog/oil-v1/astro-starlight.svg",
  career: "/catalog/oil-v1/react-interview.svg",
  aigc: "/catalog/oil-v1/niannian-drama.svg",
  web: "/catalog/oil-v1/ans-3d-showcase.svg",
  github: "/catalog/oil-v1/hermes-agent.svg",
  business: "/catalog/oil-v1/saleor-commerce.svg",
  productivity: "/catalog/oil-v1/code2prompt.svg",
  competition: "/catalog/oil-v1/curated-agri-uav.svg",
};

function toOuterOilCover(coverUrl?: string | null, category?: string): string {
  if (coverUrl) {
    const match = coverUrl.match(/\/catalog\/gitglow-v1\/([a-z0-9-]+)\.(?:webp|svg|png)$/i);
    if (match) return `/catalog/oil-v1/${match[1]}.svg`;
    if (coverUrl.includes("/competitions/agrihackathon/")) return "/catalog/oil-v1/curated-agri-uav.svg";
    return coverUrl;
  }
  return (category && FALLBACK_COVERS[category]) || "/catalog/oil-v1/cauai-one.svg";
}

export async function MarketOfferCard({ offer, owner = false, headingLevel = 2 }: { offer: MarketOfferView; owner?: boolean; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const [t, tp, p] = await Promise.all([getTranslations("product.market"), getTranslations("product.marketProject"), getTranslations("product")]);
  const w = await getTranslations("marketWorkflow");
  const listing = offer.listing; const tiers = listing.pricingTiers ?? [];
  const minimum = tiers.length ? Math.min(...tiers.map(tier => tier.priceMinor)) : listing.priceMinor;
  const status = offer.submittedAt && !offer.reviewedAt ? "PENDING" : offer.status;
  const coverSrc = toOuterOilCover(listing.coverUrl, listing.category);
  const metrics = getMarketOfferMetrics(offer);
  return <Link href={owner ? "/market/creator/" + offer.id : marketProductPath(offer)} className="ans-project-card group flex min-w-0 flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
    <div className="relative aspect-video overflow-hidden border-b bg-muted/30">
      <Image unoptimized src={coverSrc} width={960} height={540} alt={tp("projectCover", { title: listing.title })} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>
      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between gap-2">
        <span className="rounded-full bg-slate-950/75 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">{p("categories." + listing.category)}</span>
        <span className="rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-bold text-slate-950 shadow-xs">{listing.execution ? "🚀 在线即跑" : offer.official ? "⚡ 支付即秒发" : "✨ 精选方案"}</span>
      </div>
    </div>
    <div className="flex flex-1 flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <Heading className="line-clamp-1 break-words text-lg font-semibold group-hover:text-primary">{listing.title}</Heading>
        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" aria-hidden="true"/>
      </div>
      <p className="mt-2 line-clamp-2 break-words text-xs leading-6 text-muted-foreground sm:text-sm">{listing.summary}</p>
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {listing.deliverables.slice(0, 2).map((item, index) => (
          <span key={index} className="inline-flex max-w-full items-center gap-1 truncate rounded-lg border bg-muted/35 px-2.5 py-1 text-xs text-muted-foreground">
            <Check className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true"/>
            <span className="truncate">{item}</span>
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3 border-t pt-4">
        <div>
          <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{listing.execution ? w("computeOnRun") : minimum === 0 ? p("realProject.freeShare") : tiers.length > 1 ? tp("fromPoints", { amount: minimum / 100 }) : t("pointsUnit", { amount: minimum / 100 })}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{offer.official ? p("official") : offer.seller.nickname || offer.seller.username} · <span className="font-semibold text-amber-600 dark:text-amber-400">★ {metrics.rating}</span> · {metrics.countLabel}</p>
        </div>
        <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{owner ? t("listingStatus." + status) : listing.execution ? w("runnable") : "立即解锁 →"}</span>
      </div>
    </div>
  </Link>;
}
