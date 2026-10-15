import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AgriPopularityManager } from "@/components/competitions/agri-wall";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export async function generateMetadata() { const t = await getTranslations("agriWall"); return { title: t("manageTitle") }; }
export default async function AgriPopularityPage() { const t = await getTranslations("agriWall"); return <div className="ans-product-shell"><div className="ans-product-container ans-page-content max-w-4xl space-y-6"><Button asChild variant="ghost"><Link href="/competitions/agrihackathon">{t("eventGuide")}</Link></Button><header><h1 className="ans-page-title">{t("manageTitle")}</h1><p className="mt-4 text-base leading-7 text-muted-foreground">{t("manageDescription")}</p></header><AgriPopularityManager /></div></div>; }
