import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { AgriOrganizerNav } from "@/components/competitions/agri-organizer-nav";
import { AgriRankingsAdmin } from "@/components/competitions/agri-rankings-admin";
export const dynamic="force-dynamic";
export default async function AgriRankingsPage(){
  const t=await getTranslations("product.agriRankings"), nav=await getTranslations("product.agrihackathon");
  return <main className="container max-w-5xl space-y-7 py-8">
    <AgriOrganizerNav current="rankings" backLabel={nav("crossNav.hub")} nav={nav} />
    <header className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
      <div><h1 className="text-3xl font-semibold">{t("adminTitle")}</h1></div>
      <figure className="overflow-hidden rounded-2xl border bg-slate-950/90 shadow-sm"><Image src="/competitions/agrihackathon/gitglow-scoring.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" /></figure>
    </header>
    <AgriRankingsAdmin/>
  </main>;
}
