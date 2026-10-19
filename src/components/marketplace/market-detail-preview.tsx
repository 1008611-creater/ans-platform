import { ExternalLink, Github } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { MarketListingInput } from "@/contracts/marketplace";
import { DualCoverPreview } from "@/components/catalog/dual-cover-preview";
import { Button } from "@/components/ui/button";
import styles from "./market-detail.module.css";

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

export async function MarketDetailPreview({ listing }: { listing: MarketListingInput }) {
  const [t, locale] = await Promise.all([getTranslations("product.marketDetail"), getLocale()]);
  const coverSrc = listing.coverUrl || FALLBACK_COVERS[listing.category] || "/catalog/gitglow-v1/magic-resume.webp";
  return <section aria-label={t("previewTitle")} className={styles.preview}>
    <DualCoverPreview
      innerCoverUrl={coverSrc}
      outerCoverUrl={coverSrc}
      alt={t("coverAlt", { title: listing.title })}
      isEn={locale.startsWith("en")}
    />
    {(listing.previewUrl || listing.githubUrl) && <div className={styles.previewToolbar}>
      <div className="flex shrink-0 flex-wrap gap-2">
        {listing.previewUrl && <Button asChild variant="outline" size="sm"><a href={listing.previewUrl} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" />{t("openPreview")}</a></Button>}
        {listing.githubUrl && <Button asChild variant="ghost" size="sm"><a href={listing.githubUrl} target="_blank" rel="noopener noreferrer"><Github aria-hidden="true" />{t("openRepository")}</a></Button>}
      </div>
    </div>}
  </section>;
}
