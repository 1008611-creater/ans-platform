import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { AgriOrganizerNav } from "@/components/competitions/agri-organizer-nav";
import { AgriPublicationReviewQueue } from "@/components/competitions/agri-publications-review-queue";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("product.agriPublications");
  return { title: t("reviewTitle") };
}

export default async function AgriPublicationReviewPage() {
  const t = await getTranslations("product.agriPublications");
  const nav = await getTranslations("product.agrihackathon");
  const ranking = await getTranslations("product.agriRankings");

  return (
    <div className="container max-w-5xl space-y-6 py-8">
      <AgriOrganizerNav current="publication-review" backLabel={t("back")} nav={nav} />
      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">{t("reviewTitle")}</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t("reviewHint")}</p>
          <Button asChild variant="outline">
            <WorkspaceLink href="/competitions/agrihackathon/rankings">{ranking("adminTitle")}</WorkspaceLink>
          </Button>
        </div>
        <figure className="overflow-hidden rounded-2xl border bg-slate-950/90 shadow-sm">
          <Image
            src="/competitions/agrihackathon/gitglow-awards.webp"
            alt=""
            width={1440}
            height={900}
            unoptimized
            className="aspect-[16/10] w-full object-cover"
          />
        </figure>
      </div>
      <AgriPublicationReviewQueue />
    </div>
  );
}
