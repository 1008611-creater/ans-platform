import { AgriRankingBoards } from "@/components/competitions/agri-publications";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AgriContestantFlowBar } from "@/components/competitions/agri-contestant-flow-bar";
import { AgriPublicationsShowcase } from "@/components/competitions/agri-publications-showcase";
export const dynamic="force-dynamic";
export const revalidate=0;
export async function generateMetadata():Promise<Metadata>{const t=await getTranslations("product.agriPublications");return {title:t("showcaseTitle")};}
export default async function AgriShowcasePage(){
  const t=await getTranslations("product.agriPublications");
  const nav=await getTranslations("product.agrihackathon");
  return <div className="container max-w-5xl space-y-5 py-6 sm:py-8">
    <AgriContestantFlowBar current="showcase" backHref="/competitions/agrihackathon" backLabel={t("back")} nav={nav} />
    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("showcaseTitle")}</h1>
    <AgriRankingBoards/>
    <AgriPublicationsShowcase/>
  </div>;
}

