import Image from "next/image";
import { Check, ExternalLink, FileCode2, Github } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { MarketListingInput } from "@/contracts/marketplace";
import { getMarketSamplePreview } from "@/domain/marketplace/presentation";
import { Button } from "@/components/ui/button";
import styles from "./market-detail.module.css";

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

export async function MarketDetailPreview({ listing }: { listing: MarketListingInput }) {
  const t = await getTranslations("product.marketDetail");
  const coverSrc = listing.coverUrl || FALLBACK_COVERS[listing.category] || "/catalog/gitglow-v1/cauai-one.webp";
  const sample = getMarketSamplePreview(listing);
  return <section aria-label={t("previewTitle")} className={styles.preview}>
    <div className={styles.cover}>
      <Image unoptimized src={coverSrc} width={1200} height={675} alt={t("coverAlt", { title: listing.title })} className="h-full w-full object-cover" priority />
    </div>
    {(listing.previewUrl || listing.githubUrl) && <div className={styles.previewToolbar}>
      <div className="flex shrink-0 flex-wrap gap-2">
        {listing.previewUrl && <Button asChild variant="outline" size="sm"><a href={listing.previewUrl} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" />{t("openPreview")}</a></Button>}
        {listing.githubUrl && <Button asChild variant="ghost" size="sm"><a href={listing.githubUrl} target="_blank" rel="noopener noreferrer"><Github aria-hidden="true" />{t("openRepository")}</a></Button>}
      </div>
    </div>}
    <div className="mt-4 rounded-xl border border-emerald-500/25 bg-card/85 p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-foreground">📦 交付物 Sample 样本预览</span>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">{sample.badge}</span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{sample.file} · 真实交付切片</span>
      </div>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
        {sample.highlights.map((item) => (
          <div key={item.label} className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{item.label}</span>
              <span className="rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">{item.format}</span>
            </div>
            <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-foreground">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span className="line-clamp-2">{item.detail}</span>
            </p>
          </div>
        ))}
      </div>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-3 font-mono text-xs leading-5 text-emerald-300">{sample.snippet}</pre>
    </div>
  </section>;
}
