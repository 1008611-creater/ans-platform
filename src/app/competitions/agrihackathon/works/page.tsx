import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { AgriOrganizerNav } from "@/components/competitions/agri-organizer-nav";
import { AgriWorks } from "@/components/competitions/agri-works";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { const t = await getTranslations("product.agriWorks"); return { title: t("title"), description: t("description") }; }
export default async function AgriWorksPage() {
  const t = await getTranslations("product.agriWorks");
  const nav = await getTranslations("product.agrihackathon");
  return <div className="container max-w-6xl space-y-6 py-8"><AgriOrganizerNav current="works" backLabel={t("back")} nav={nav} /><div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-center"><div className="space-y-3"><h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1><p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t("description")}</p></div><figure className="overflow-hidden rounded-2xl border bg-slate-950/90 shadow-sm"><Image src="/competitions/agrihackathon/gitglow-scoring.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" /></figure></div><AgriWorks /></div>;
}
