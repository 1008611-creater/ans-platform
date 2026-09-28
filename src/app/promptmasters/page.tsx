import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PromptmastersContent } from "@/components/promptmasters/promptmasters-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("promptmasters");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: "/promptmasters" },
  };
}

export default async function PromptmastersPage() {
  const t = await getTranslations("promptmasters");

  const translations = {
    title: t("title"),
    description: t("description"),
    allTime: t("allTime"),
    thisMonth: t("thisMonth"),
    thisWeek: t("thisWeek"),
    noData: t("noData"),
    prompts: t("prompts"),
    upvotes: t("upvotes"),
    perPrompt: t("perPrompt"),
    sortByTotal: t("sortByTotal"),
    sortByRatio: t("sortByRatio"),
  };

  return <PromptmastersContent translations={translations} />;
}
