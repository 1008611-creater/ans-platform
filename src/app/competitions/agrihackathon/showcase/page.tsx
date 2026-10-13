import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { Button } from "@/components/ui/button";
import { AgriPublicationsShowcase } from "@/components/competitions/agri-publications-showcase";
export const dynamic="force-dynamic";
export const revalidate=0;
export async function generateMetadata():Promise<Metadata>{const t=await getTranslations("product.agriPublications");return {title:t("showcaseTitle")};}
export default async function AgriShowcasePage(){const t=await getTranslations("product.agriPublications");return <div className="container max-w-5xl space-y-6 py-8"><Button asChild variant="ghost"><WorkspaceLink href="/competitions/agrihackathon">{t("back")}</WorkspaceLink></Button><h1 className="text-3xl font-semibold tracking-tight">{t("showcaseTitle")}</h1><AgriPublicationsShowcase/></div>;}
