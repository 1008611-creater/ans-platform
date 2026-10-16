import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { AgriTimetable } from "@/components/competitions/agri-timetable";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { const t = await getTranslations("product.agriTasks"); return { title: t("title") }; }
export default async function AgriTasksPage() {
  const t = await getTranslations("product.agriTasks");
  const nav = await getTranslations("product.agrihackathon");
  return <div className="container max-w-5xl space-y-6 py-8"><div className="flex flex-wrap items-center gap-2"><Button asChild variant="ghost"><Link href="/competitions/agrihackathon">{t("back")}</Link></Button><Button asChild variant="outline" size="sm"><Link href="/workspace/credits">{nav("crossNav.credits")}</Link></Button><Button asChild variant="outline" size="sm"><Link href="/explore/agrihackathon/submit">{nav("crossNav.bindWall")}</Link></Button><Button asChild variant="outline" size="sm"><Link href="/competitions/agrihackathon/submissions">{nav("crossNav.submissions")}</Link></Button></div><div className="space-y-3"><h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1><p className="max-w-3xl leading-7 text-muted-foreground">{t("description")}</p></div><AgriTimetable /></div>;
}
