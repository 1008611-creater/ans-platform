import { AgriRankingBoards } from "@/components/competitions/agri-publications";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { Button } from "@/components/ui/button";
import { AgriPublicationsShowcase } from "@/components/competitions/agri-publications-showcase";
export const dynamic="force-dynamic";
export const revalidate=0;
export async function generateMetadata():Promise<Metadata>{const t=await getTranslations("product.agriPublications");return {title:t("showcaseTitle")};}
export default async function AgriShowcasePage(){
  const t=await getTranslations("product.agriPublications");
  const nav=await getTranslations("product.agrihackathon");
  return <div className="container max-w-5xl space-y-6 py-8"><div className="flex flex-wrap items-center gap-2"><Button asChild variant="ghost"><WorkspaceLink href="/competitions/agrihackathon">{t("back")}</WorkspaceLink></Button><Button asChild variant="outline" size="sm"><WorkspaceLink href="/explore?category=competition&subcategory=agri-wall">{nav("crossNav.wall")}</WorkspaceLink></Button><Button asChild variant="outline" size="sm"><WorkspaceLink href="/competitions/agrihackathon/submissions">{nav("crossNav.submissions")}</WorkspaceLink></Button></div><h1 className="text-3xl font-semibold tracking-tight">{t("showcaseTitle")}</h1><div className="grid gap-4 md:grid-cols-2"><figure className="overflow-hidden rounded-2xl border bg-slate-950/90 shadow-sm"><Image src="/competitions/agrihackathon/gitglow-scoring.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" /></figure><figure className="overflow-hidden rounded-2xl border bg-slate-950/90 shadow-sm"><Image src="/competitions/agrihackathon/gitglow-awards.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" /></figure></div><AgriRankingBoards/><AgriPublicationsShowcase/></div>;
}

