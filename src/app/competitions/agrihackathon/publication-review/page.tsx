import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AgriOrganizerNav } from "@/components/competitions/agri-organizer-nav";
import { AgriPublicationReviewQueue } from "@/components/competitions/agri-publications-review-queue";
export const dynamic="force-dynamic";
export async function generateMetadata():Promise<Metadata>{const t=await getTranslations("product.agriPublications");return {title:t("reviewTitle")};}
export default async function AgriPublicationReviewPage(){const t=await getTranslations("product.agriPublications"),nav=await getTranslations("product.agrihackathon");return <div className="container max-w-5xl space-y-6 py-8"><AgriOrganizerNav current="publication-review" backLabel={t("back")} nav={nav} /><h1 className="text-3xl font-semibold tracking-tight">{t("reviewTitle")}</h1><AgriPublicationReviewQueue/></div>;}
