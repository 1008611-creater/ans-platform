import Link from "next/link";
import { marketProductPath } from "@/domain/marketplace/product-route";
import { isMarketOfferPurchasable } from "@/domain/marketplace/presentation";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight, Check } from "lucide-react";
import type { MarketOfferView } from "@/contracts/marketplace-view";

const FALLBACK_COVERS: Record<string, string> = {
  learning: "/catalog/gitglow-v1/astro-starlight.webp",
  career: "/catalog/gitglow-v1/react-interview.webp",
  aigc: "/catalog/gitglow-v1/niannian-drama.webp",
  web: "/competitions/agrihackathon/gitglow-tracks.webp",
  github: "/catalog/gitglow-v1/hermes-agent.webp",
  business: "/competitions/agrihackathon/gitglow-awards.webp",
  productivity: "/catalog/gitglow-v1/code2prompt.webp",
  competition: "/competitions/agrihackathon/gitglow-wall.webp",
};

export async function MarketOfferCard({ offer, owner = false, headingLevel = 2 }: { offer: MarketOfferView; owner?: boolean; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const [t, tp, p, w] = await Promise.all([getTranslations("product.market"), getTranslations("product.marketProject"), getTranslations("product"), getTranslations("marketWorkflow")]);
  const listing = offer.listing;
  const tiers = listing.pricingTiers ?? [];
  const minimum = tiers.length ? Math.min(...tiers.map(tier => tier.priceMinor)) : listing.priceMinor;
  const points = Math.round(minimum / 100);
  const yuan = (points / 10).toFixed(points % 10 === 0 ? 0 : 1);
  const purchasable = isMarketOfferPurchasable(offer);
  const status = offer.submittedAt && !offer.reviewedAt ? "PENDING" : offer.status;
  const coverSrc = listing.coverUrl || FALLBACK_COVERS[listing.category] || "/catalog/gitglow-v1/cauai-one.webp";
  return <Link href={owner ? "/market/creator/" + offer.id : marketProductPath(offer)} className="ans-project-card group flex min-w-0 flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
    <div className="relative aspect-video overflow-hidden border-b bg-slate-950/90">
      <Image unoptimized src={coverSrc} width={960} height={540} alt={tp("projectCover", { title: listing.title })} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>
      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between gap-2">
        <span className="rounded-full bg-slate-950/75 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">{p("categories." + listing.category)}</span>
        {listing.execution ? (
          <span className="rounded-full bg-emerald-500/95 px-2.5 py-1 text-[11px] font-bold text-slate-950 shadow-xs">🚀 在线工作台即跑</span>
        ) : purchasable ? (
          <span className="rounded-full bg-emerald-500/95 px-2.5 py-1 text-[11px] font-bold text-slate-950 shadow-xs">{points === 0 ? "🌐 开源展示" : "⚡ 支付即秒发"}</span>
        ) : (
          <span className="rounded-full bg-slate-800/90 px-2.5 py-1 text-[11px] font-semibold text-slate-200 shadow-xs">🔒 暂未开放购买</span>
        )}
      </div>
    </div>
    <div className="flex flex-1 flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <Heading className="line-clamp-1 break-words text-base font-semibold group-hover:text-primary sm:text-lg">{listing.title}</Heading>
        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" aria-hidden="true"/>
      </div>
      <p title={listing.summary} className="mt-1.5 line-clamp-1 break-words text-xs leading-5 text-muted-foreground">{listing.summary}</p>
      <div className="mt-2.5 hidden flex-wrap gap-1.5 group-hover:flex">
        {listing.deliverables.slice(0, 2).map((item, index) => (
          <span key={index} className="inline-flex max-w-full items-center gap-1 truncate rounded-lg border bg-muted/35 px-2 py-0.5 text-[11px] text-muted-foreground">
            <Check className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true"/>
            <span className="truncate">{item}</span>
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3.5">
        <div>
          {listing.execution ? (
            <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400" title="单次 AI 双语生成 2~99 积分 · 支持导出独立站 HTML">免费排版 · 按次精修</p>
          ) : purchasable ? (
            points === 0 ? (
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{p("realProject.freeShare")}</p>
            ) : (
              <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{t("pointsUnit", { amount: points })} <span className="text-xs font-normal text-muted-foreground">（≈ ¥{yuan}）</span></p>
            )
          ) : (
            <p className="text-xs font-medium text-muted-foreground">参考价 {points} 积分（≈ ¥{yuan}）</p>
          )}
        </div>
        <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${purchasable ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          {owner ? t("listingStatus." + status) : listing.execution ? w("runnable") : purchasable ? (points === 0 ? "查看样板 →" : "立即购买 →") : "查看大纲 →"}
        </span>
      </div>
    </div>
  </Link>;
}
