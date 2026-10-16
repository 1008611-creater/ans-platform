import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { Button } from "@/components/ui/button";
import { AgriPublicationReviewQueue } from "@/components/competitions/agri-publications-review-queue";
export const dynamic="force-dynamic";
export async function generateMetadata():Promise<Metadata>{const t=await getTranslations("product.agriPublications"),ranking=await getTranslations("product.agriRankings");return {title:t("reviewTitle")};}
export default async function AgriPublicationReviewPage(){const t=await getTranslations("product.agriPublications"),ranking=await getTranslations("product.agriRankings");return <div className="container max-w-5xl space-y-6 py-8"><Button asChild variant="ghost"><WorkspaceLink href="/competitions/agrihackathon">{t("back")}</WorkspaceLink></Button><h1 className="text-3xl font-semibold tracking-tight">{t("reviewTitle")}</h1><Button asChild variant="outline"><WorkspaceLink href="/competitions/agrihackathon/rankings">{ranking("adminTitle")}</WorkspaceLink></Button><AgriPublicationReviewQueue/></div>;}
