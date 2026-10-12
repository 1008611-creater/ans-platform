"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowUpRight, FileText, PanelsTopLeft, Clapperboard, GitBranch, Flag, Wallet } from "lucide-react";
import { ANS_PRACTICES, practicesForTerm, type AnsPractice } from "@/domain/vibehub/ans-practices";
import { useVibeLanguage } from "./use-vibe-language";
const icons = { brief: FileText, site: PanelsTopLeft, video: Clapperboard, github: GitBranch, contest: Flag, credits: Wallet };
export function PracticeIcon({ kind, size = 20 }: { kind: AnsPractice["icon"]; size?: number }) { const Icon = icons[kind]; return <Icon size={size} aria-hidden="true" />; }
export function AnsPracticeLinks({ term, compact = false, query }: { term?: string; compact?: boolean; query?: string }) {
  const lang = useVibeLanguage(); const t = useTranslations("vibehub");
  const normalized = query?.trim().normalize("NFKC").toLocaleLowerCase();
  const practices = term ? practicesForTerm(term) : normalized
    ? ANS_PRACTICES.filter(item => [item.title.zh, item.title.en, item.summary.zh, item.summary.en, ...item.sections.flatMap(section => [section.title.zh, section.title.en])].some(text => text.normalize("NFKC").toLocaleLowerCase().includes(normalized)))
    : compact ? ANS_PRACTICES.slice(0, 4) : ANS_PRACTICES;
  if (!practices.length) return null;
  return <section className={`ans-practices${term ? " ans-term-practices" : ""}`} aria-label={t("ansPractice")}>
    {(term || compact || normalized) && <div className="ans-knowledge-section-heading"><div><h2>{term ? t("termToWork") : normalized ? t("practiceSearch") : t("practiceSectionTitle")}</h2></div>{!term && (compact || normalized) && <Link href={`/vibe-hub/ans?lang=${lang}`}>{t("allPractices")}<ArrowUpRight size={16} aria-hidden="true" /></Link>}</div>}
    <div className="ans-practice-list">{practices.map(item => <Link className="ans-practice-row" key={item.slug} href={`/vibe-hub/ans/${item.slug}?lang=${lang}`}>
      <span className="ans-practice-number">{item.number}</span><span className="ans-practice-icon"><PracticeIcon kind={item.icon} /></span><div><h3>{item.title[lang]}</h3>{!compact && <p>{item.outcome[lang]}</p>}</div><ArrowUpRight size={20} className="ans-practice-arrow" aria-hidden="true" />
    </Link>)}</div>
  </section>;
}
