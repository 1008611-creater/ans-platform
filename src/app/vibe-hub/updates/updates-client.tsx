"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useVibeLanguage } from "../use-vibe-language";
import { ChangelogView } from "../official/changelog";
export default function Updates() {
  const locale = useVibeLanguage(); const router = useRouter(); const t = useTranslations("vibehub");
  return <main><section className="ans-knowledge-container ans-updates-intro"><p className="ans-knowledge-eyebrow">ANS VibeHub</p><h1>{t("ansAdaptation")}</h1><p>{t("ansAdaptationBody")}</p><Link href={`/vibe-hub/ans?lang=${locale}`}>{t("allPractices")} →</Link><div className="ans-upstream-notice"><p className="ans-upstream-label">{t("upstreamUpdates")}</p><p>{t("upstreamUpdatesBody")}</p></div></section><ChangelogView locale={locale} onGoHome={() => router.push(`/vibe-hub/topics?lang=${locale}`)} onOpenTerm={id => router.push(`/vibe-hub/${id}?lang=${locale}`)} /></main>;
}
