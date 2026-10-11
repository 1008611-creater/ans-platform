import type { Metadata } from "next";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { AgriSubmissions } from "@/components/competitions/agri-submissions";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { const t = await getTranslations("product.agriSubmissions"); return { title: t("title") }; }
export default async function AgriSubmissionsPage({ searchParams }: { searchParams?: Promise<{ teamCompetitionId?: string; stage?: string }> }) {
  const query = await searchParams;
  const initialSelection = query?.teamCompetitionId && typeof query.teamCompetitionId === "string" && query.teamCompetitionId.length <= 80 && query.teamCompetitionId === query.teamCompetitionId.trim()
    ? { teamCompetitionId: query.teamCompetitionId, stage: query.stage === "FINAL" ? "FINAL" as const : "PRELIMINARY" as const } : undefined;
  const t = await getTranslations("product.agriSubmissions");
  return <div className="container max-w-5xl space-y-6 py-8"><Button asChild variant="ghost"><WorkspaceLink href="/competitions/agrihackathon">{t("back")}</WorkspaceLink></Button><div className="space-y-3"><h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1><p className="max-w-3xl leading-7 text-muted-foreground">{t("description")}</p></div><AgriSubmissions initialSelection={initialSelection} /></div>;
}
