"use client";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, Search, BookOpen, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVibeLanguage } from "./use-vibe-language";
import { AnsPracticeLinks } from "./ans-practice-links";
export function KnowledgeHome({ termCount, courseCount }: { termCount: number; courseCount: number }) {
  const lang = useVibeLanguage(); const t = useTranslations("vibehub");
  return <main className="ans-knowledge-home">
    <section className="ans-knowledge-hero"><div className="ans-knowledge-container ans-knowledge-hero-layout">
      <div className="ans-knowledge-hero-copy"><p className="ans-knowledge-eyebrow">ANS / {t("knowledgeHome")}</p><h1>{t("knowledgeHeroFirst")}<br /><span>{t("knowledgeHeroSecond")}</span></h1><p className="ans-knowledge-intro">{t("knowledgeHeroBody")}</p><div className="ans-knowledge-hero-actions"><Button asChild data-variant="default" className="ans-knowledge-button"><Link href={`/vibe-hub/ans?lang=${lang}`}>{t("startWithPractice")}<ArrowRight size={17} aria-hidden="true" /></Link></Button><Button asChild variant="outline" data-variant="outline" className="ans-knowledge-button"><Link href={`/vibe-hub/topics?lang=${lang}`}>{t("browseAtlas")}</Link></Button></div><div className="ans-knowledge-facts"><span><b>{termCount}</b> {t("terms")}</span><span><b>{courseCount}</b> {t("courses")}</span><span>{t("bilingualLabel")}</span></div></div>
      <aside className="ans-knowledge-note"><div className="ans-knowledge-note-heading"><span>{t("beforeYouBegin")}</span><span aria-hidden="true">01 → 03</span></div><ol>{["understand", "prepare", "create"].map((key, index) => <li key={key}><span>0{index + 1}</span><div><h2>{t(`knowledgeSteps.${key}.title`)}</h2><p>{t(`knowledgeSteps.${key}.body`)}</p></div></li>)}</ol><div className="ans-knowledge-dino"><Image src="/mascot/ans-mascot.png" width={104} height={104} alt={t("ansDino")} /><p>{t("dinoNote")}</p></div></aside>
    </div></section>
    <div className="ans-knowledge-container">
      <section className="ans-knowledge-find"><div><Search size={20} aria-hidden="true" /><h2>{t("findHeading")}</h2></div><nav aria-label={t("quickTerms")}>{[{slug:"prompt",label:"promptLabel"},{slug:"ai-agent",label:"agentLabel"},{slug:"responsive-design",label:"responsiveLabel"},{slug:"authentication",label:"authLabel"}].map(item => <Link key={item.slug} href={`/vibe-hub/${item.slug}?lang=${lang}`}>{t(item.label)}<ArrowRight size={14} aria-hidden="true" /></Link>)}<Link href={`/vibe-hub/topics?lang=${lang}`}>{t("all")}</Link></nav></section>
      <AnsPracticeLinks compact />
      <section className="ans-knowledge-study" aria-label={t("studyHeading")}><div className="ans-knowledge-section-heading"><div><p className="ans-knowledge-eyebrow">{t("studyEyebrow")}</p><h2>{t("studyHeading")}</h2></div><p>{t("studyBody")}</p></div><div className="ans-knowledge-study-links"><Link href={`/vibe-hub/courses?lang=${lang}`}><BookOpen size={24} aria-hidden="true" /><div><h3>{t("courses")}</h3><p>{t("courseEntryBody")}</p></div><ArrowUpRightIcon /></Link><Link href={`/vibe-hub/practice?lang=${lang}`}><MousePointer2 size={24} aria-hidden="true" /><div><h3>{t("practice")}</h3><p>{t("practiceEntryBody")}</p></div><ArrowUpRightIcon /></Link></div></section>
      <section className="ans-knowledge-work"><div><p className="ans-knowledge-eyebrow">{t("fromLearningToWork")}</p><h2>{t("workHeading")}</h2><p>{t("workBody")}</p></div><nav aria-label={t("ansDestinations")}><Link href="/explore">{t("exploreAns")}<ArrowRight size={17} aria-hidden="true" /></Link><Link href="/workflows">{t("workflowAns")}<ArrowRight size={17} aria-hidden="true" /></Link><Link href="/workspace">{t("workspaceAns")}<ArrowRight size={17} aria-hidden="true" /></Link></nav></section>
    </div>
  </main>;
}
function ArrowUpRightIcon() { return <ArrowRight size={20} className="ans-practice-arrow" aria-hidden="true" />; }
