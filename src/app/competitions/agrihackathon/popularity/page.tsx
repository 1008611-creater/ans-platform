import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { AgriOrganizerNav } from "@/components/competitions/agri-organizer-nav";
import { AgriPopularityManager } from "@/components/competitions/agri-wall";
export const dynamic = "force-dynamic";
export async function generateMetadata() { const t = await getTranslations("agriWall"); return { title: t("manageTitle") }; }
export default async function AgriPopularityPage() { const t = await getTranslations("agriWall"), nav = await getTranslations("product.agrihackathon"); return <div className="ans-product-shell"><div className="ans-product-container ans-page-content max-w-5xl space-y-6"><AgriOrganizerNav current="popularity" backLabel={t("eventGuide")} nav={nav} /><header className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-center"><div><h1 className="ans-page-title">{t("manageTitle")}</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">{t("manageDescription")}</p></div><figure className="overflow-hidden rounded-2xl border bg-slate-950/90 shadow-sm"><Image src="/competitions/agrihackathon/gitglow-wall.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" /></figure></header><AgriPopularityManager /></div></div>; }
