import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import DevelopersPageContent from "@/components/developers/developers-page-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("developers");
  const metadataLocale = locale === "zh" ? "zh" : "en";
  const metadataTranslations = await getTranslations({ locale: metadataLocale, namespace: "developers" });

  return {
    title: t("title"),
    description: metadataTranslations("description"),
  };
}

export default function DevelopersPage() {
  return <DevelopersPageContent />;
}
