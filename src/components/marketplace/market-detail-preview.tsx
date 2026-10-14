import Image from "next/image";
import { ExternalLink, Github, Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { MarketListingInput } from "@/contracts/marketplace";
import { Button } from "@/components/ui/button";
import styles from "./market-detail.module.css";

/** A publisher's cover is a cover, not evidence of a completed delivery. */
export async function MarketDetailPreview({ listing }: { listing: MarketListingInput }) {
  const t = await getTranslations("product.marketDetail");
  return <section aria-label={t("previewTitle")} className={styles.preview}>
    {listing.coverUrl ? <div className={styles.cover}>
      <Image unoptimized src={listing.coverUrl} width={1200} height={675} alt={t("coverAlt", { title: listing.title })} className="h-full w-full object-contain" priority />
    </div> : <div className={styles.noCover}>
      <Package aria-hidden="true" className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">{t("noCoverTitle")}</p>
      <p className="max-w-md text-sm leading-7 text-muted-foreground">{t("noCoverNote")}</p>
    </div>}
    <div className={styles.previewToolbar}>
      <p className="text-xs leading-6 text-muted-foreground">{listing.coverUrl ? t("coverNote") : t("previewNote")}</p>
      <div className="flex shrink-0 flex-wrap gap-2">
        {listing.previewUrl && <Button asChild variant="outline" size="sm"><a href={listing.previewUrl} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true" />{t("openPreview")}</a></Button>}
        {listing.githubUrl && <Button asChild variant="ghost" size="sm"><a href={listing.githubUrl} target="_blank" rel="noopener noreferrer"><Github aria-hidden="true" />{t("openRepository")}</a></Button>}
      </div>
    </div>
  </section>;
}
