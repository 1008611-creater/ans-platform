import { getTranslations } from "next-intl/server";
import { AgriOrganizerNav } from "@/components/competitions/agri-organizer-nav";
import { AgriPopularityManager } from "@/components/competitions/agri-wall";
export const dynamic = "force-dynamic";
export async function generateMetadata() { const t = await getTranslations("agriWall"); return { title: t("manageTitle") }; }
export default async function AgriPopularityPage() { const t = await getTranslations("agriWall"), nav = await getTranslations("product.agrihackathon"); return <div className="ans-product-shell"><div className="ans-product-container ans-page-content max-w-4xl space-y-6"><AgriOrganizerNav current="popularity" backLabel={t("eventGuide")} nav={nav} /><header><h1 className="ans-page-title">{t("manageTitle")}</h1><p className="mt-4 text-base leading-7 text-muted-foreground">{t("manageDescription")}</p></header><AgriPopularityManager /></div></div>; }
