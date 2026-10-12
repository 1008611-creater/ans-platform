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
    <header className="ans-knowledge-page-heading"><h1>{t("ansChangesTitle")}</h1></header>
    <div className="ans-changes-layout"><aside className="ans-changes-date"><time dateTime="2026-10-12">2026.10.12</time></aside>
    <div className="ans-changes-entries">{entries.map(({id, icon: Icon, href}, index) => <article key={id} className="ans-change-entry"><div className="ans-change-symbol"><Icon size={21} aria-hidden="true" /><span>0{index + 1}</span></div><div><h2>{t(`ansChange${id}Title`)}</h2><p>{t(`ansChange${id}Body`)}</p><Link className="ans-editorial-link" href={`${href}?lang=${lang}`}>{t(`ansChange${id}Link`)}<ArrowUpRight size={16} aria-hidden="true" /></Link></div></article>)}</div></div>

  </main>;
}
