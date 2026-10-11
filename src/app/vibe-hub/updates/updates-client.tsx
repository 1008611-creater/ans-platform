"use client";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Route, Sparkles, PanelsTopLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useVibeLanguage } from "../use-vibe-language";
const entries = [
  { id: "content", icon: BookOpen, href: "/vibe-hub/ans" },
  { id: "paths", icon: Route, href: "/vibe-hub/journeys" },
  { id: "collaboration", icon: Sparkles, href: "/vibe-hub/vibehub-skill" },
  { id: "identity", icon: PanelsTopLeft, href: "/vibe-hub" },
] as const;
export default function Updates() {
  const lang = useVibeLanguage(); const t = useTranslations("vibehub");
  return <main className="ans-knowledge-container ans-editorial-page">
    <header className="ans-knowledge-page-heading"><p className="ans-knowledge-eyebrow">ANS / {t("updates")}</p><h1>{t("ansChangesTitle")}</h1><p>{t("ansChangesBody")}</p></header>
    <div className="ans-changes-layout"><aside className="ans-changes-date"><time dateTime="2026-10-12">2026.10.12</time><p>{t("ansChangesEdition")}</p><span>{t("ansChangesDateNote")}</span></aside>
    <div className="ans-changes-entries">{entries.map(({id, icon: Icon, href}, index) => <article key={id} className="ans-change-entry"><div className="ans-change-symbol"><Icon size={21} aria-hidden="true" /><span>0{index + 1}</span></div><div><p className="ans-knowledge-eyebrow">{t(`ansChange${id}Category`)}</p><h2>{t(`ansChange${id}Title`)}</h2><p>{t(`ansChange${id}Body`)}</p><Link className="ans-editorial-link" href={`${href}?lang=${lang}`}>{t(`ansChange${id}Link`)}<ArrowUpRight size={16} aria-hidden="true" /></Link></div></article>)}</div></div>
    <section className="ans-editorial-note"><h2>{t("ansChangesSourceTitle")}</h2><p>{t("ansChangesSourceBody")}</p><Link className="ans-editorial-link" href={`/vibe-hub/ans/github-to-project?lang=${lang}`}>{t("ansChangesSourceLink")}<ArrowUpRight size={16} aria-hidden="true" /></Link></section>
  </main>;
}
