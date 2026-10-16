import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { Button } from "@/components/ui/button";
import { AgriWorkspaceManager } from "@/components/competitions/agri-workspace-manager";
import { agriDecisionQuerySchema } from "@/contracts/agri-decisions";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { const t = await getTranslations("product.agriWorkspace"); return { title: t("title"), description: t("description") }; }
export default async function AgriWorkspaceManagementPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams ?? {};
  const hasSelection = Object.keys(query).length > 0;
  const parsed = agriDecisionQuerySchema.safeParse(query);
  const validSelection = parsed.success && Object.values(query).every(value => typeof value === "string" && value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value));
  const preselection = hasSelection && parsed.success && validSelection ? parsed.data : undefined;
  const t = await getTranslations("product.agriWorkspace");
  return <div className="container max-w-5xl space-y-6 py-8"><Button asChild variant="ghost"><WorkspaceLink href="/competitions/agrihackathon">{t("back")}</WorkspaceLink></Button><div className="space-y-3"><h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1><p className="max-w-3xl leading-7 text-muted-foreground">{t("description")}</p></div><AgriWorkspaceManager preselection={preselection} invalidPreselection={hasSelection && !validSelection} /></div>;
}
