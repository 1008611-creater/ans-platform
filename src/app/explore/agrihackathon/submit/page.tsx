import { getTranslations } from "next-intl/server";
import { AgriContestantFlowBar } from "@/components/competitions/agri-contestant-flow-bar";
import { AgriWallSubmit } from "@/components/competitions/agri-wall";
export const dynamic = "force-dynamic";
export async function generateMetadata() { const t = await getTranslations("agriWall"); return { title: t("submitTitle") }; }
export default async function AgriWallSubmitPage() {
  const t = await getTranslations("agriWall"), nav = await getTranslations("product.agrihackathon");
  return <div className="ans-product-shell">
    <div className="ans-product-container ans-page-content max-w-4xl space-y-5">
      <AgriContestantFlowBar current="bindWall" backHref="/explore?category=competition&subcategory=agri-wall" backLabel={t("backWall")} nav={nav} />
      <header className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t("eyebrow")}</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("submitTitle")}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{t("submitDescription")}</p>
      </header>
      <AgriWallSubmit />
    </div>
  </div>;
}
