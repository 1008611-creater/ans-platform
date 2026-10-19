"use client";

import Link from "next/link";
import { ArrowUpRight, Cpu, FileText, Film, GitBranch, Globe, Palette, ShieldCheck, Sparkles, Trophy, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { ANS_PRACTICES, findAnsPracticesForTerm, searchAnsPractices, type AnsPractice } from "@/domain/vibehub/ans-practices";
import { guideHref, guideSelectionForPractice } from "@/domain/vibehub/guide-routing";
import { useVibeLanguage } from "./use-vibe-language";

const icons = {
  brief: FileText,
  portfolio: Globe,
  design: Palette,
  skill: Cpu,
  media: Film,
  team: Users,
  creative: Sparkles,
  repo: GitBranch,
  competition: Trophy,
  cost: ShieldCheck,
} as const;

export function AnsPracticeLinks({ termSlug, query, compact = false }: { termSlug?: string; query?: string; compact?: boolean }) {
  const lang = useVibeLanguage();
  const t = useTranslations("vibehub");
  const items: readonly AnsPractice[] = termSlug
    ? findAnsPracticesForTerm(termSlug)
    : query
      ? searchAnsPractices(query)
      : ANS_PRACTICES;
  if (items.length === 0) return null;
  const visible = compact ? items.slice(0, 6) : items;

  return (
    <section className={`ans-practices${termSlug ? " ans-term-practices" : ""}`} aria-labelledby={termSlug ? "ans-term-practices-title" : "ans-practices-title"}>
      <div className="ans-knowledge-section-heading">
        <div>
          <p className="ans-knowledge-eyebrow">{t(termSlug ? "termPracticesEyebrow" : "practicesEyebrow")}</p>
          <h2 id={termSlug ? "ans-term-practices-title" : "ans-practices-title"}>{t(termSlug ? "termPracticesTitle" : "practicesTitle")}</h2>
        </div>
        {compact && <Link className="vh-text-button" href={guideHref(lang)}>{t("allPractices")} <ArrowUpRight size={15} aria-hidden="true" /></Link>}
      </div>
      <div className="ans-practice-list">
        {visible.map(item => {
          const Icon = icons[item.icon];
          const selection = guideSelectionForPractice(item.slug);
          return (
            <Link key={item.slug} href={guideHref(lang, selection || {})} className="ans-practice-row">
              <span className="ans-practice-number" aria-hidden="true">{item.number}</span>
              <span className="ans-practice-icon" aria-hidden="true"><Icon size={18} /></span>
              <div className="ans-practice-copy">
                <p className="ans-knowledge-eyebrow">{item.category[lang]}</p>
                <h3>{item.title[lang]}</h3>
                <p>{item.summary[lang]}</p>
              </div>
              <ArrowUpRight size={18} className="ans-practice-arrow" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
