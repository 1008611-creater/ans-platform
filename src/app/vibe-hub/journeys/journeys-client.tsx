"use client";
import Link from "next/link";
import { AnsPracticeLinks } from "../ans-practice-links";
import { useTranslations } from "next-intl";
import { useVibeLanguage } from "../use-vibe-language";
export type JourneySummary = { id: string; title: string; outcome: string; stageCount: number };
export function JourneysClient({ journeys }: { journeys: JourneySummary[] }) {
  const lang = useVibeLanguage(); const t = useTranslations("vibehub");
  return <main className="vh-page"><header className="vh-feature-heading"><h1>{t("journeysTitle")}</h1><p>{t("journeysBody")}</p></header><AnsPracticeLinks compact /><div className="vh-entry-list">{journeys.map((item) => <article key={item.id} className="vh-entry-row"><Link href={`/vibe-hub/journeys/${item.id}?lang=${lang}`}><h2>{item.title}</h2><p>{item.outcome}</p></Link><span>{t("stages", {count: item.stageCount})} →</span></article>)}</div></main>;
}
