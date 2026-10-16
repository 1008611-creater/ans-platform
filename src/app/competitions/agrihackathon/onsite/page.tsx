import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AgriOrganizerNav } from "@/components/competitions/agri-organizer-nav";
import { AgriOnsite } from "@/components/competitions/agri-onsite";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { const t = await getTranslations("product.agriOnsite"); return { title: t("title") }; }
export default async function AgriOnsitePage({ searchParams }: { searchParams: Promise<{ scope?: string; submissionId?: string }> }) {
  const t = await getTranslations("product.agriOnsite"), nav = await getTranslations("product.agrihackathon"), query = await searchParams;
  const scope = query.scope === "staff" ? "staff" : "onsite";
  const submissionId = scope === "staff" && typeof query.submissionId === "string" && query.submissionId.length <= 80 ? query.submissionId : null;
  return <div className="container max-w-6xl space-y-6 py-8"><AgriOrganizerNav current="onsite" backLabel={t("back")} nav={nav} /><div className="space-y-3"><h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1><p className="max-w-3xl leading-7 text-muted-foreground">{t("intro")}</p></div><AgriOnsite initialScope={scope} submissionId={submissionId} /></div>;
}
