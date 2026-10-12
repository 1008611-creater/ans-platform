"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, BookOpen, MousePointer2 } from "lucide-react";
import { useVibeLanguage } from "./use-vibe-language";
import { AnsPracticeLinks } from "./ans-practice-links";
import { KnowledgeProjectCovers } from "./knowledge-project-covers";
const tasks = [
  { scenario: "website", label: "homeTaskWebsite" },
  { scenario: "creative", label: "homeTaskCreative" },
  { scenario: "github", label: "homeTaskGithub" },
] as const;
export function KnowledgeHome({ termCount }: { termCount: number }) {
  const lang = useVibeLanguage(); const t = useTranslations("vibehub");
  return <main className="ans-knowledge-home">
    <section className="ans-knowledge-hero"><div className="ans-knowledge-container ans-knowledge-hero-layout">
      <div className="ans-knowledge-hero-copy">
        <h1>{t("knowledgeHeroFirst")}<br /><span>{t("knowledgeHeroSecond")}</span></h1>
        <nav className="ans-home-tasks" aria-label={t("homeTaskLabel")}>{tasks.map((task, index) => <Link key={task.scenario} href={`/vibe-hub/vibehub-skill?scenario=${task.scenario}&lang=${lang}`}><span className="ans-home-task-number">0{index + 1}</span><span>{t(task.label)}</span><ArrowRight size={18} aria-hidden="true" /></Link>)}</nav>
        <Link className="ans-editorial-link ans-home-path-link" href={`/vibe-hub/journeys?lang=${lang}`}>{t("startWithPractice")}<ArrowRight size={16} aria-hidden="true" /></Link>
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
