import type { Metadata } from "next";
import Image from "next/image";
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
  const nav = await getTranslations("product.agrihackathon");
  return <div className="container max-w-5xl space-y-6 py-8"><div className="flex flex-wrap items-center gap-2"><Button asChild variant="ghost"><WorkspaceLink href="/competitions/agrihackathon">{t("back")}</WorkspaceLink></Button><Button asChild variant="outline" size="sm"><WorkspaceLink href="/explore/agrihackathon/submit">{nav("crossNav.bindWall")}</WorkspaceLink></Button><Button asChild variant="outline" size="sm"><WorkspaceLink href="/competitions/agrihackathon/tasks">{nav("crossNav.tasks")}</WorkspaceLink></Button><Button asChild variant="outline" size="sm"><WorkspaceLink href="/explore?category=competition&subcategory=agri-wall">{nav("crossNav.wall")}</WorkspaceLink></Button><Button asChild variant="outline" size="sm"><WorkspaceLink href="/competitions/agrihackathon/showcase">{nav("crossNav.showcase")}</WorkspaceLink></Button></div><div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-center"><div className="space-y-3"><h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1><p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t("description")}</p></div><figure className="overflow-hidden rounded-2xl border bg-slate-950/90 shadow-sm"><Image src="/competitions/agrihackathon/gitglow-workflow.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" /></figure></div><AgriSubmissions initialSelection={initialSelection} /></div>;
}
