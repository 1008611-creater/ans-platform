import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AgriContestantFlowBar } from "@/components/competitions/agri-contestant-flow-bar";
import { AgriSubmissions } from "@/components/competitions/agri-submissions";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { const t = await getTranslations("product.agriSubmissions"); return { title: t("title") }; }
export default async function AgriSubmissionsPage({ searchParams }: { searchParams?: Promise<{ teamCompetitionId?: string; stage?: string }> }) {
  const query = await searchParams;
  const initialSelection = query?.teamCompetitionId && typeof query.teamCompetitionId === "string" && query.teamCompetitionId.length <= 80 && query.teamCompetitionId === query.teamCompetitionId.trim()
    ? { teamCompetitionId: query.teamCompetitionId, stage: query.stage === "FINAL" ? "FINAL" as const : "PRELIMINARY" as const } : undefined;
  const t = await getTranslations("product.agriSubmissions");
  const nav = await getTranslations("product.agrihackathon");
  return <div className="container max-w-5xl space-y-5 py-6 sm:py-8">
    <AgriContestantFlowBar current="submissions" backHref="/competitions/agrihackathon" backLabel={t("back")} nav={nav} />
    <header className="space-y-1.5">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
    </header>
    <AgriSubmissions initialSelection={initialSelection} />
  </div>;
}
