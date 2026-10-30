import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { AgriOrganizerNav } from "@/components/competitions/agri-organizer-nav";
import { AgriOnsite } from "@/components/competitions/agri-onsite";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { const t = await getTranslations("product.agriOnsite"); return { title: t("title") }; }
export default async function AgriOnsitePage({ searchParams }: { searchParams: Promise<{ scope?: string; submissionId?: string }> }) {
  const t = await getTranslations("product.agriOnsite"), nav = await getTranslations("product.agrihackathon"), query = await searchParams;
  const scope = query.scope === "staff" ? "staff" : "onsite";
  const submissionId = scope === "staff" && typeof query.submissionId === "string" && query.submissionId.length <= 80 ? query.submissionId : null;
  return <div className="container max-w-6xl space-y-6 py-8"><AgriOrganizerNav current="onsite" backLabel={t("back")} nav={nav} /><div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-center"><div className="space-y-3"><h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1><p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t("intro")}</p></div><figure className="overflow-hidden rounded-2xl border bg-slate-950/90 shadow-sm"><Image src="/competitions/agrihackathon/gitglow-hub.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" /></figure></div><AgriOnsite initialScope={scope} submissionId={submissionId} /></div>;
}
