"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, BookOpen, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVibeLanguage } from "./use-vibe-language";
import { AnsPracticeLinks } from "./ans-practice-links";
import { KnowledgeProjectCovers } from "./knowledge-project-covers";

export function KnowledgeHome({ termCount }: { termCount: number }) {
  const lang = useVibeLanguage(); const t = useTranslations("vibehub");
  return <main className="ans-knowledge-home">
    <section className="ans-knowledge-hero"><div className="ans-knowledge-container ans-knowledge-hero-layout">
      <div className="ans-knowledge-hero-copy">
        <h1>{t("knowledgeHeroFirst")}<br /><span>{t("knowledgeHeroSecond")}</span></h1>
        <div className="ans-knowledge-hero-actions">
          <Button asChild data-variant="default" className="ans-knowledge-button"><Link href={`/vibe-hub/journeys?lang=${lang}`}>{t("startWithPractice")}<ArrowRight size={17} aria-hidden="true" /></Link></Button>
          <Button asChild variant="outline" data-variant="outline" className="ans-knowledge-button"><Link href={`/vibe-hub/vibehub-skill?lang=${lang}`}>{t("briefAction")}</Link></Button>
        </div>
      </div>
      <KnowledgeProjectCovers termCount={termCount} />
    </div></section>
    <div className="ans-knowledge-container">
      <AnsPracticeLinks compact />
      <section className="ans-knowledge-study" aria-label={t("studyHeading")}>
        <div className="ans-knowledge-section-heading"><h2>{t("studyHeading")}</h2></div>
        <div className="ans-knowledge-study-links">
          <Link href={`/vibe-hub/courses?lang=${lang}`}><BookOpen size={24} aria-hidden="true" /><h3>{t("homeCourseAction")}</h3><ArrowRight size={20} className="ans-practice-arrow" aria-hidden="true" /></Link>
          <Link href={`/vibe-hub/practice?lang=${lang}`}><MousePointer2 size={24} aria-hidden="true" /><h3>{t("homePracticeAction")}</h3><ArrowRight size={20} className="ans-practice-arrow" aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  </main>;
}
