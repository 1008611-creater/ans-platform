"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
export default function MarketError({ reset }: { error: Error; reset: () => void }) { const t = useTranslations("product.market"); return <div className="ans-product-container py-16"><h1 className="text-2xl font-semibold">{t("loadError")}</h1><p className="mt-4 text-muted-foreground">{t("loadErrorBody")}</p><Button onClick={reset} className="mt-6">{t("retry")}</Button></div>; }
