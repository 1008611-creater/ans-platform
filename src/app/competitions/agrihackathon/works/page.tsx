import { getTranslations } from "next-intl/server";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { Button } from "@/components/ui/button";
import { AgriWorks } from "@/components/competitions/agri-works";
export default async function AgriWorksPage() {
  const t = await getTranslations("product.agriWorks");
  return <div className="container max-w-6xl space-y-6 py-8"><Button asChild variant="ghost"><WorkspaceLink href="/competitions/agrihackathon">{t("back")}</WorkspaceLink></Button><div className="space-y-3"><h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1><p className="max-w-3xl leading-7 text-muted-foreground">{t("description")}</p></div><AgriWorks /></div>;
}
