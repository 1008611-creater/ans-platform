"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Lesson, SourcePage } from "../source-data";
import type { OfficialEntry } from "../official/types";
type PracticeContent = { content: SourcePage; detail: OfficialEntry | null };
import { useVibeLanguage } from "../use-vibe-language";
import { LessonQuiz } from "../lesson-quiz";
import { SourceContent } from "../source-content";
import { TermDemo, hasNativeDemo } from "../term-demo";
type PracticeLesson = Pick<Lesson, "id" | "title" | "lessonPractice"> & { macroCategory: string };
export function PracticeClient({ lessons }: { lessons: PracticeLesson[] }) {
  const [index, setIndex] = useState(0); const [answers, setAnswers] = useState<Record<number, boolean>>({}); const [finished, setFinished] = useState(false);
  const [scope, setScope] = useState("all"); const [unlocked, setUnlocked] = useState(false); const [page, setPage] = useState<PracticeContent | null>(null); const [loadError, setLoadError] = useState(false);
  const t = useTranslations("vibehub"); const lang = useVibeLanguage();
  const pool = scope === "all" ? lessons : lessons.filter(item => item.macroCategory === scope); const lesson = pool[index];
  useEffect(() => {
    if (!unlocked || !lesson) return;
    const controller = new AbortController();
    void (async () => { try { const response = await fetch(`/api/vibe-hub/course-terms/${lesson.id}?locale=${lang}`, { signal: controller.signal }); if (!response.ok) throw new Error("Content unavailable"); const data = await response.json(); if (!controller.signal.aborted) setPage(data); } catch { if (!controller.signal.aborted) setLoadError(true); } })();
    return () => controller.abort();
  }, [unlocked, lesson, lang]);
  const reset = (value = scope) => { setScope(value); setIndex(0); setAnswers({}); setFinished(false); setUnlocked(false); setPage(null); setLoadError(false); };
  if (!lesson) return <main className="vh-page"><p>{t("unavailable")}</p></main>;
  return <main className="practice-page practice-question is-ready"><div className="vh-practice-intro"><h1>{t("practiceTitle")}</h1><p>{t("practiceBody")}</p></div>
    <div className="practice-question-layout"><section className="practice-answer-panel">
      {finished ? <section className="vh-quiz"><h2>{t("practiceFinish")}</h2><p>{t("practiceScore", { correct: Object.values(answers).filter(Boolean).length, total: pool.length })}</p><button type="button" className="vh-primary" onClick={() => reset()}>{t("retry")}</button></section> : <>
        {lesson.lessonPractice && <LessonQuiz key={`${scope}-${index}`} id={lesson.id} practice={lesson.lessonPractice} onAnswer={(correct) => setAnswers(current => ({ ...current, [index]: correct }))} onSelect={correct => { if (correct) setUnlocked(true); }} />}
        <button type="button" className="vh-primary" disabled={!unlocked} onClick={() => { if (index === pool.length - 1) setFinished(true); else { setIndex(value => value + 1); setUnlocked(false); setPage(null); setLoadError(false); } }}>{t(index === pool.length - 1 ? "finish" : "nextQuestion")}</button>
      </>}
    </section><section className="practice-detail-column" aria-label={t("related")}>
      <header className="practice-run-head"><span>{index + 1} / {pool.length}</span><label className="vh-demo-field">{t("practiceScope")}<select className="vh-field" value={scope} onChange={event => reset(event.target.value)}><option value="all">{t("allAreas", { count: lessons.length })}</option>{[...new Set(lessons.map(item => item.macroCategory))].map(category => <option key={category} value={category}>{t(category)} ({lessons.filter(item => item.macroCategory === category).length})</option>)}</select></label></header>
      <div className={`practice-term-panel ${unlocked ? "is-revealed" : "is-locked"}`}>{!unlocked ? <div className="practice-detail-lock"><span>{t("practiceLock")}</span></div> : page ? <SourceContent className="practice-term-content" slug={lesson.id} officialEntry={page.detail} html={page.content.html} demo={hasNativeDemo(lesson.id) ? <TermDemo slug={lesson.id} /> : undefined} /> : <p role="status">{t(loadError ? "unavailable" : "loading")}</p>}</div>
      {unlocked && <Link href={`/vibe-hub/${lesson.id}?lang=${lang}`} className="vh-text-button">{lesson.title} ↗</Link>}
    </section></div>
  </main>;
}