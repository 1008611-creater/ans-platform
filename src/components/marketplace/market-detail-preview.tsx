import Image from "next/image";
import { ExternalLink, Github } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { MarketListingInput } from "@/contracts/marketplace";
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
  </section>;
}
