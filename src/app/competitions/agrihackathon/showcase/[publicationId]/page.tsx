import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { Button } from "@/components/ui/button";
import { AgriPublicationsShowcase } from "@/components/competitions/agri-publications-showcase";
export const dynamic="force-dynamic";
export const revalidate=0;
export async function generateMetadata():Promise<Metadata>{const t=await getTranslations("product.agriPublications");return {title:t("showcaseTitle")};}
export default async function AgriShowcaseDetailPage({params}:{params:Promise<{publicationId:string}>}){const {publicationId}=await params;const t=await getTranslations("product.agriPublications"),nav=await getTranslations("product.agrihackathon");return <div className="container max-w-4xl space-y-6 py-8"><div className="flex flex-wrap items-center gap-2"><Button asChild variant="ghost"><WorkspaceLink prefetch={false} href="/competitions/agrihackathon/showcase">{t("showcaseTitle")}</WorkspaceLink></Button><Button asChild variant="outline" size="sm"><WorkspaceLink href="/explore?category=competition&subcategory=agri-wall">{nav("crossNav.wall")}</WorkspaceLink></Button><Button asChild variant="outline" size="sm"><WorkspaceLink href="/competitions/agrihackathon">{nav("crossNav.hub")}</WorkspaceLink></Button></div><h1 className="text-3xl font-semibold tracking-tight">{t("projectDetail")}</h1><AgriPublicationsShowcase key={publicationId} publicationId={publicationId}/></div>;}
