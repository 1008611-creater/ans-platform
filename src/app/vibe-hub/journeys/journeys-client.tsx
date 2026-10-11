"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ANS_LEARNING_PATHS } from "@/domain/vibehub/ans-learning-paths";
import { useVibeLanguage } from "../use-vibe-language";
export type JourneySummary = { id: string; title: string; outcome: string; stageCount: number };
export function JourneysClient({ journeys }: { journeys: JourneySummary[] }) {
  const lang = useVibeLanguage(); const t = useTranslations("vibehub");
  return <main className="ans-knowledge-container ans-editorial-page"><header className="ans-knowledge-page-heading"><p className="ans-knowledge-eyebrow">ANS / {t("journeys")}</p><h1>{t("journeysTitle")}</h1><p>{t("journeysBody")}</p></header>
    <div className="ans-path-directory">{ANS_LEARNING_PATHS.map(path => <Link key={path.id} href={`/vibe-hub/journeys/${path.id}?lang=${lang}`} className="ans-directory-row"><span className="ans-directory-number">{path.number}</span><div><p className="ans-knowledge-eyebrow">{t("ansOriginal")} · {t("stages", { count: path.steps.length })}</p><h2>{path.title[lang]}</h2><p>{path.summary[lang]}</p></div><ArrowUpRight size={22} aria-hidden="true" /></Link>)}</div>
    <section className="ans-editorial-note"><h2>{t("pathStartSmallTitle")}</h2><p>{t("pathStartSmallBody")}</p><Link className="ans-editorial-link" href={`/vibe-hub/ans/clear-brief?lang=${lang}`}>{t("pathStartSmallLink")}<ArrowUpRight size={16} aria-hidden="true" /></Link></section>
    <details className="ans-source-disclosure"><summary>{t("pathSourceTitle")} <span>{t("pathSourceCount", { count: journeys.length })}</span></summary><p>{t("pathSourceBody")}</p><div className="vh-entry-list">{journeys.map(item => <article key={item.id} className="vh-entry-row"><Link href={`/vibe-hub/journeys/${item.id}?lang=${lang}`}><h3>{item.title}</h3><p>{item.outcome}</p></Link><span>{t("stages", { count: item.stageCount })}</span></article>)}</div></details>
  </main>;
}
