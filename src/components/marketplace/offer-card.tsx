import Link from "next/link";
import { marketProductPath } from "@/domain/marketplace/product-route";
import { isMarketOfferPurchasable } from "@/domain/marketplace/presentation";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { MarketOfferView } from "@/contracts/marketplace-view";

const FALLBACK_COVERS: Record<string, string> = {
  learning: "/catalog/gitglow-v1/astro-starlight.webp",
  career: "/catalog/gitglow-v1/react-interview.webp",
  aigc: "/catalog/gitglow-v1/infinite-canvas.webp",
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
  const coverSrc = listing.coverUrl || FALLBACK_COVERS[listing.category] || "/catalog/gitglow-v1/magic-resume.webp";
  const deliverableHint = listing.deliverables.length ? listing.deliverables.slice(0, 3).join(" · ") : undefined;
  return <Link href={owner ? "/market/creator/" + offer.id : marketProductPath(offer)} className="ans-project-card group flex min-w-0 flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
    <div className="relative aspect-video overflow-hidden border-b bg-slate-950/90">
      <Image unoptimized src={coverSrc} width={960} height={540} alt={tp("projectCover", { title: listing.title })} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>
    </div>
    <div className="flex flex-1 flex-col p-4 sm:p-5">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
        <span>{p("categories." + listing.category)} · {p("children." + listing.subcategory)}</span>
        {listing.execution ? (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">在线工作台即跑</span>
        ) : purchasable ? (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">{points === 0 ? "开源展示" : "支付即秒发"}</span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">暂未开放购买</span>
        )}
      </div>
      <Heading className="line-clamp-1 break-words text-base font-semibold group-hover:text-primary sm:text-lg">{listing.title}</Heading>
      <p title={deliverableHint ? `${listing.summary}（交付：${deliverableHint}）` : listing.summary} className="mt-1.5 mb-3 line-clamp-2 break-words text-xs leading-5 text-muted-foreground">{listing.summary}</p>
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
          {owner ? t("listingStatus." + status) : listing.execution ? `${w("runnable")} →` : purchasable ? (points === 0 ? "查看样板 →" : "立即购买 →") : "查看大纲 →"}
        </span>
      </div>
    </div>
  </Link>;
}
