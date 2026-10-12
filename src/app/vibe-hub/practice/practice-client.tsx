"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Lesson, SourcePage } from "@/contracts/vibehub-content";
import type { OfficialEntry } from "../official/types";
import { useVibeLanguage } from "../use-vibe-language";
import { LessonQuiz } from "../lesson-quiz";
import { SourceContent } from "../source-content";
import { TermDemo, hasNativeDemo } from "../term-demo";
type PracticeContent = { content: SourcePage; detail: OfficialEntry | null };
type PracticeLesson = Pick<Lesson, "id" | "title" | "lessonPractice"> & { macroCategory: string };
const ROUND_SIZE = 8;
export function PracticeClient({ lessons }: { lessons: PracticeLesson[] }) {
  const [index, setIndex] = useState(0); const [answers, setAnswers] = useState<Record<string, boolean>>({}); const [finished, setFinished] = useState(false);
  const [scope, setScope] = useState("all"); const [round, setRound] = useState(0); const [reviewIds, setReviewIds] = useState<string[] | null>(null);
  const [unlocked, setUnlocked] = useState(false); const [page, setPage] = useState<{ key: string; data: PracticeContent } | null>(null); const [loadError, setLoadError] = useState<string | null>(null); const [requestAttempt, setRequestAttempt] = useState(0);
  const questionRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("vibehub"); const lang = useVibeLanguage();
  const available = useMemo(() => lessons.filter(item => item.lessonPractice && (scope === "all" || item.macroCategory === scope)), [lessons, scope]);
  const pool = useMemo(() => {
    if (reviewIds) return reviewIds.flatMap(id => { const item = available.find(lesson => lesson.id === id); return item ? [item] : []; });
    if (!available.length) return [];
    const start = (round * ROUND_SIZE) % available.length;
    return Array.from({ length: Math.min(ROUND_SIZE, available.length) }, (_, offset) => available[(start + offset) % available.length]);
  }, [available, round, reviewIds]);
  const lesson = pool[index]; const contentKey = lesson ? `${lesson.id}:${lang}:${requestAttempt}` : "";
  useEffect(() => {
    if (!unlocked || !lesson || finished) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/vibe-hub/course-terms/${lesson.id}?locale=${lang}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Content unavailable");
        const data: PracticeContent = await response.json();
        if (!data.content || typeof data.content.html !== "string") throw new Error("Invalid content");
        if (!controller.signal.aborted) setPage({ key: contentKey, data });
      } catch { if (!controller.signal.aborted) setLoadError(contentKey); }
    })();
    return () => controller.abort();
  }, [unlocked, lesson, lang, contentKey, finished]);
  function focusQuestion() { requestAnimationFrame(() => questionRef.current?.focus()); }
  function reset(value = scope, nextRound = round, review: string[] | null = null) {
    setScope(value); setRound(nextRound); setReviewIds(review); setIndex(0); setAnswers({}); setFinished(false); setUnlocked(false); setPage(null); setLoadError(null); focusQuestion();
  }
  function next() {
    if (index === pool.length - 1) setFinished(true);
    else { setIndex(value => value + 1); setUnlocked(false); setPage(null); setLoadError(null); }
    focusQuestion();
  }
  if (!lesson) return <main className="vh-page"><p>{t("unavailable")}</p><Link href={`/vibe-hub?lang=${lang}`}>{t("practiceBrowse")}</Link></main>;
  const missed = pool.filter(item => answers[item.id] === false);
  const attempted = Object.keys(answers).length; const correct = Object.values(answers).filter(Boolean).length;
  const currentPage = page?.key === contentKey ? page.data : null;
  return <main className="practice-page practice-question is-ready"><header className="vh-practice-intro"><h1>{t("practiceTitle")}</h1><p>{t("practiceRound")}</p></header>
    <div className="practice-run-head ans-practice-run-head"><span>{finished ? pool.length : index + 1} / {pool.length}</span><label className="vh-demo-field">{t("practiceScope")}<select className="vh-field" value={scope} onChange={event => reset(event.target.value, 0)}><option value="all">{t("allAreas", { count: lessons.length })}</option>{[...new Set(lessons.map(item => item.macroCategory))].map(category => <option key={category} value={category}>{t(category)} ({lessons.filter(item => item.macroCategory === category).length})</option>)}</select></label></div>
    <div ref={questionRef} tabIndex={-1} className={finished ? "ans-practice-results" : "practice-question-layout"}>
      <section className="practice-answer-panel">
      {finished ? <section className="vh-quiz"><h2>{t("practiceFinish")}</h2><p>{attempted ? t("practiceScore", { correct, total: attempted }) : t("practiceNoAttempts")}</p>{attempted > 0 && attempted < pool.length && <p>{t("practiceSkipped", { count: pool.length - attempted })}</p>}
        {missed.length > 0 && <div className="ans-practice-mistakes"><h3>{t("practiceMistakes")}</h3><ul>{missed.map(item => <li key={item.id}><Link href={`/vibe-hub/${item.id}?lang=${lang}`}>{item.title} ↗</Link></li>)}</ul></div>}
        <div className="ans-practice-result-actions">{missed.length > 0 && <button type="button" className="vh-primary" onClick={() => reset(scope, round, missed.map(item => item.id))}>{t("practiceReview")}</button>}<button type="button" className={missed.length ? "vh-text-button" : "vh-primary"} onClick={() => reset(scope, round + 1)}>{t(available.length > ROUND_SIZE ? "practiceAnother" : "retry")}</button><Link href={`/vibe-hub?lang=${lang}`} className="vh-text-button">{t("practiceBrowse")}</Link></div>
      </section> : <>
        {lesson.lessonPractice && <LessonQuiz key={`${scope}-${round}-${reviewIds?.join(",") || "round"}-${index}`} id={lesson.id} seed={`${lesson.id}:${round}:${reviewIds ? "review" : "round"}`} practice={lesson.lessonPractice} onAnswer={answer => setAnswers(current => ({ ...current, [lesson.id]: answer }))} onSelect={() => setUnlocked(true)} />}
        <div className="ans-practice-question-actions"><button type="button" className="vh-primary" disabled={!unlocked} onClick={next}>{t(index === pool.length - 1 ? "finish" : "nextQuestion")}</button>{!unlocked && <button type="button" className="vh-text-button" onClick={() => setUnlocked(true)}>{t("practiceReveal")}</button>}</div>
      </>}
      </section>
      {!finished && <section className="practice-detail-column" aria-label={t("related")}>
        <div className={`practice-term-panel ${unlocked ? "is-revealed" : "is-locked"}`}>{!unlocked ? <div className="practice-detail-lock"><span>{t("practiceLock")}</span></div> : currentPage ? <SourceContent className="practice-term-content" slug={lesson.id} officialEntry={currentPage.detail} html={currentPage.content.html} demo={hasNativeDemo(lesson.id) ? <TermDemo slug={lesson.id} /> : undefined} /> : loadError === contentKey ? <div className="ans-practice-load-error"><p role="alert">{t("practiceLoadError")}</p><button type="button" className="vh-text-button" onClick={() => setRequestAttempt(value => value + 1)}>{t("retry")}</button></div> : <p role="status">{t("loading")}</p>}</div>
        {unlocked && <Link href={`/vibe-hub/${lesson.id}?lang=${lang}`} className="vh-text-button">{lesson.title} ↗</Link>}
      </section>}
    </div>
  </main>;
}
