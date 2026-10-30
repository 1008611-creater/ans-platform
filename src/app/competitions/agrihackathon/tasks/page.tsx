import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AgriContestantFlowBar } from "@/components/competitions/agri-contestant-flow-bar";
import { AgriTimetable } from "@/components/competitions/agri-timetable";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { const t = await getTranslations("product.agriTasks"); return { title: t("title") }; }
export default async function AgriTasksPage() {
  const t = await getTranslations("product.agriTasks");
  const nav = await getTranslations("product.agrihackathon");
  return <div className="container max-w-5xl space-y-5 py-6 sm:py-8">
    <AgriContestantFlowBar current="tasks" backHref="/competitions/agrihackathon" backLabel={t("back")} nav={nav} />
    <header className="space-y-1.5">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
    </header>
    <AgriTimetable />
  </div>;
}
