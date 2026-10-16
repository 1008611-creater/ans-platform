import { getTranslations } from "next-intl/server";
import { AgriRankingsAdmin } from "@/components/competitions/agri-rankings-admin";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
export const dynamic="force-dynamic";
export default async function AgriRankingsPage(){const t=await getTranslations("product.agriRankings");return <main className="container max-w-5xl space-y-7 py-8"><WorkspaceLink className="text-sm underline" href="/competitions/agrihackathon/publication-review">{t("back")}</WorkspaceLink><h1 className="text-3xl font-semibold">{t("adminTitle")}</h1><AgriRankingsAdmin/></main>;}
