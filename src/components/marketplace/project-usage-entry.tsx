"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** Navigation is not a payment receipt or an automatic project entitlement. */
export function ProjectUsageEntry({ usageUrl, purchased = false }: { usageUrl: string; purchased?: boolean }) {
  const t = useTranslations("product.marketProject");
  return <section className="space-y-3 rounded-xl border bg-muted/20 p-4"><h2 className="text-sm font-semibold">{t(purchased ? "purchasedUseTitle" : "projectCheckoutTitle")}</h2><Button asChild variant="outline" className="h-auto min-h-9 w-full whitespace-normal py-3 text-center"><a href={usageUrl} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true"/>{t(purchased ? "openPurchasedProject" : "payInsideProject")}</a></Button><p className="text-xs leading-6 text-muted-foreground">{t(purchased ? "purchasedUseNote" : "projectCheckoutNote")}</p></section>;
}
