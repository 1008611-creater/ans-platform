import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MarketFrame } from "@/components/marketplace/frame";
import { Button } from "@/components/ui/button";
export async function generateMetadata() { const t = await getTranslations("product.marketIntegration"); return { title: t("docsTitle"), description: t("docsBody") }; }
export default async function PointsDocs() {
  const t = await getTranslations("product.marketIntegration");
  return <MarketFrame title={t("docsTitle")} description={t("docsBody")}><article className="max-w-3xl space-y-10"><section><h2 className="text-xl font-semibold">{t("stepsTitle")}</h2><ol className="mt-5 list-decimal space-y-4 pl-5 text-sm leading-8">{[1,2,3,4].map(n => <li key={n}>{t("step"+n)}</li>)}</ol></section><section className="ans-detail-block"><h2 className="text-xl font-semibold">{t("rulesTitle")}</h2><ul className="mt-5 list-disc space-y-3 pl-5 text-sm leading-8">{[1,2,3,4].map(n => <li key={n}>{t("rule"+n)}</li>)}</ul></section><p className="text-sm leading-8 text-muted-foreground">{t("settlementNote")}</p><div className="flex flex-wrap gap-3"><Button asChild><Link href="/market/creator/new">{t("uploadProject")}</Link></Button><Button asChild variant="outline"><a href="https://github.com/1008611-creater/ans-points-sdk" target="_blank" rel="noopener noreferrer">{t("openSdk")}</a></Button></div></article></MarketFrame>;
}
