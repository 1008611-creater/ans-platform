"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2, Circle, RotateCcw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import type { Lesson, SourcePage } from "@/contracts/vibehub-content";
import type { OfficialEntry } from "../official/types";
import { useVibeLanguage } from "../use-vibe-language";
import { usePersistedSetting } from "../use-persisted-setting";
import { LessonQuiz } from "../lesson-quiz";
import { SourceContent } from "../source-content";
import { TermDemo, hasNativeDemo } from "../term-demo";
export type PracticeLesson = Pick<Lesson, "id" | "title" | "lessonPractice"> & { macroCategory: string; description: string };
type PracticeContent = { content: SourcePage; detail: OfficialEntry | null };
type Answer = { choice: number | null; correct: boolean | null };
type Session = { version: 1; scope: string; ids: string[]; index: number; round: number; answers: Record<string, Answer>; finished: boolean };
const ROUND_SIZE = 8;
const categories = ["ai", "frontend", "backend", "product", "testing", "technology", "git", "design"];
function readSession(raw: string, lessons: PracticeLesson[]): Session | null {
 try {
  const value = JSON.parse(raw) as Session;
  if (!value || value.version !== 1 || !["all", "course", ...categories].includes(value.scope) || !Array.isArray(value.ids) || !value.ids.length || value.ids.length > ROUND_SIZE || new Set(value.ids).size !== value.ids.length || !Number.isInteger(value.index) || value.index < 0 || value.index >= value.ids.length || !Number.isInteger(value.round) || value.round < 0 || typeof value.finished !== "boolean" || !value.answers || typeof value.answers !== "object" || Array.isArray(value.answers)) return null;
  if (!value.ids.every(id => typeof id === "string" && lessons.some(item => item.id === id))) return null;
  for (const [id, answer] of Object.entries(value.answers)) {
   const item = lessons.find(item => item.id === id);
   if (!value.ids.includes(id) || !answer || !(answer.choice === null || Number.isInteger(answer.choice) && answer.choice >= 0 && answer.choice < (item?.lessonPractice?.options.length || 0)) || !(answer.correct === null || typeof answer.correct === "boolean") || (answer.choice === null) !== (answer.correct === null)) return null;
  }
  return value;
 } catch { return null; }
}
export function PracticeClient({ lessons, initialScope = "all", courseIds = [], context = "all", courseBackHref }: { lessons: PracticeLesson[]; initialScope?: string; courseIds?: string[]; context?:string; courseBackHref?:string }) {
 const lang = useVibeLanguage(), t = useTranslations("vibehub.learning"), common = useTranslations("vibehub");
 const [raw, saveRaw, persisted] = usePersistedSetting(`ans.vibehub.practice.v1.${lang}.${context}`, "");
 const session = useMemo(() => readSession(raw, lessons), [raw, lessons]);
 const [running, setRunning] = useState(false), [draftScope, setDraftScope] = useState(initialScope);
 const [expanded, setExpanded] = useState(false), [page, setPage] = useState<{ key: string; data: PracticeContent } | null>(null), [failed, setFailed] = useState<string | null>(null), [attempt, setAttempt] = useState(0);
 const questionRef = useRef<HTMLDivElement>(null);
 const available = useMemo(() => lessons.filter(item => draftScope === "course" ? courseIds.includes(item.id) : draftScope === "all" || item.macroCategory === draftScope), [lessons, draftScope, courseIds]);
 const lesson = session ? lessons.find(item => item.id === session.ids[session.index]) : null;
 const answer = lesson && session?.answers[lesson.id];
 const unlocked = Boolean(answer);
 const key = lesson ? `${lesson.id}:${lang}:${attempt}` : "";
 const currentPage = page?.key === key ? page.data : null;
 useEffect(() => {
  if (!expanded || !unlocked || !lesson || !running || session?.finished) return;
  const controller = new AbortController();
  void (async () => { try {
   const response = await fetch(`/api/vibe-hub/course-terms/${lesson.id}?locale=${lang}`, { signal: controller.signal });
   if (!response.ok) throw new Error("Unavailable"); const data = await response.json() as PracticeContent;
   if (!data.content || typeof data.content.html !== "string") throw new Error("Invalid content");
   if (!controller.signal.aborted) { setPage({key,data}); setFailed(null); }
  } catch { if (!controller.signal.aborted) setFailed(key); } })();
  return () => controller.abort();
 }, [expanded,unlocked,lesson,lang,key,running,session?.finished]);
 function update(value: Session) { saveRaw(JSON.stringify(value)); }
 function focus() { requestAnimationFrame(() => questionRef.current?.focus({preventScroll:false})); }
 function start(scope = draftScope, round = 0, ids?: string[]) {
  const sourcePool = lessons.filter(item => scope === "course" ? (courseIds.length ? courseIds : session?.ids || []).includes(item.id) : scope === "all" || item.macroCategory === scope);
  const grouped=categories.map(category=>sourcePool.filter(item=>item.macroCategory===category));
  const pool=scope==="all"?Array.from({length:Math.max(0,...grouped.map(items=>items.length))},(_,index)=>grouped.flatMap(items=>items[index]?[items[index]]:[])).flat():sourcePool;
  const nextIds = ids || Array.from({length:Math.min(ROUND_SIZE,pool.length)},(_,n)=>pool[(round*ROUND_SIZE+n)%pool.length].id);
  if (!nextIds.length) return;
  update({version:1,scope,ids:nextIds,index:0,round,answers:{},finished:false});setRunning(true);setExpanded(false);setPage(null);setFailed(null);focus();
 }
 function next() {
  if (!session || !unlocked) return;
  update({...session,index:Math.min(session.index+1,session.ids.length-1),finished:session.index===session.ids.length-1});setExpanded(false);focus();
 }
 const correct = session ? Object.values(session.answers).filter(item=>item.correct===true).length : 0;
 const missed = session?.ids.filter(id=>session.answers[id]?.correct===false)||[];
 const skipped = session?.ids.filter(id=>session.answers[id]?.correct==null)||[];
 const countFor = (scope:string) => lessons.filter(item=>scope==="all"||item.macroCategory===scope).length;
 if (!running || !session || !lesson) return <main className="ans-learning-page"><header className="ans-learning-heading"><div><p>{t("practiceKicker")}</p><h1>{t("practiceTitle")}</h1></div><Link className="ans-learn-text-link" href={courseBackHref||`/vibe-hub/courses?lang=${lang}`}>{t(courseBackHref?"returnCourse":"allCourses")}<ArrowUpRight size={16} aria-hidden="true"/></Link></header>
  <div className="ans-practice-setup"><section><h2>{t("chooseScope")}</h2><div className="ans-practice-scopes">{[...(courseIds.length?["course"]:[]),"all",...categories].filter(scope=>scope==="course"||countFor(scope)>0).map(scope=><button key={scope} type="button" aria-pressed={draftScope===scope} onClick={()=>setDraftScope(scope)}><span>{scope==="all"?t("mixedScope"):scope==="course"?t("chapterScope"):common(scope)}</span><span>{scope==="course"?courseIds.length:countFor(scope)}</span>{draftScope===scope&&<Check size={16} aria-hidden="true"/>}</button>)}</div><div className="ans-practice-start"><span>{t("roundSize",{count:Math.min(ROUND_SIZE,available.length)})}</span><Button className="ans-learn-button" disabled={!available.length} onClick={()=>start()}>{t("startPractice")}<ArrowRight size={16} aria-hidden="true"/></Button></div>{!available.length&&<p>{t("noQuestions")}</p>}</section>
  <aside className="ans-practice-setup-aside">{session?<section className="ans-learn-saved-run"><p className="ans-learn-kicker">{t(session.finished?"lastRound":"unfinishedRound")}</p><h2>{t("resumeQuestion",{index:session.index+1,total:session.ids.length})}</h2><p>{session.scope==="all"?t("mixedScope"):session.scope==="course"?t("chapterScope"):common(session.scope)}</p><Button variant="outline" className="ans-learn-button" onClick={()=>{setRunning(true);focus();}}>{t(session.finished?"viewResult":"resumePractice")}<ArrowRight size={16} aria-hidden="true"/></Button></section>:<section className="ans-learn-how"><Target size={24} aria-hidden="true"/><h2>{t("practiceOutcome")}</h2><ol>{["pick","explain","review"].map((name,index)=><li key={name}><span>{String(index+1).padStart(2,"0")}</span>{t(`how.${name}`)}</li>)}</ol></section>}<p className="ans-learn-storage">{t(persisted?"deviceProgress":"sessionOnly")}</p></aside></div></main>;
 const finished=session.finished;
 return <main className="ans-learning-page ans-practice-workspace"><header className="ans-practice-toolbar"><Button variant="ghost" className="ans-learn-button" onClick={()=>setRunning(false)}><ArrowLeft size={16} aria-hidden="true"/>{t("changeScope")}</Button><span>{session.scope==="all"?t("mixedScope"):session.scope==="course"?t("chapterScope"):common(session.scope)}</span><strong>{finished?t("roundComplete"):t("questionNumber",{index:session.index+1,total:session.ids.length})}</strong>{courseBackHref&&<Link className="ans-learn-text-link" href={courseBackHref}>{t("returnCourse")}<ArrowUpRight size={16} aria-hidden="true"/></Link>}</header>
 <ol className="ans-practice-round" aria-label={t("roundProgress")}>{session.ids.map((id,index)=>{const record=session.answers[id];const state=record?.correct===true?"correct":record?.correct===false?"missed":record?"revealed":"pending";return <li key={id} data-state={state} aria-current={!finished&&index===session.index?"step":undefined}><span className="sr-only">{t("questionNumber",{index:index+1,total:session.ids.length})}: {t(`state.${state}`)}</span>{record?.correct===true?<Check size={14} aria-hidden="true"/>:index+1}</li>})}</ol>
 <div ref={questionRef} tabIndex={-1} className="ans-practice-focus">{finished?<section className="ans-practice-summary"><p className="ans-learn-kicker">{t("roundComplete")}</p><h1>{t(missed.length?"reviewTitle":"finishTitle")}</h1><p>{t("roundResult",{correct,missed:missed.length,skipped:skipped.length})}</p><div className="ans-practice-result-list">{session.ids.map(id=>{const item=lessons.find(item=>item.id===id)!;const record=session.answers[id];return <Link href={`/vibe-hub/${id}?lang=${lang}`} key={id}><span>{record?.correct===true?<CheckCircle2 size={18} aria-hidden="true"/>:<Circle size={18} aria-hidden="true"/>}</span><strong>{item.title}</strong><span>{t(record?.correct===true?"state.correct":record?.correct===false?"state.missed":"state.revealed")}</span><ArrowUpRight size={16} aria-hidden="true"/></Link>})}</div><div className="ans-learn-actions">{missed.length>0&&<Button className="ans-learn-button" onClick={()=>start(session.scope,session.round,missed)}><RotateCcw size={16} aria-hidden="true"/>{t("reviewMissed")}</Button>}{skipped.length>0&&<Button variant="outline" className="ans-learn-button" onClick={()=>start(session.scope,session.round,skipped)}>{t("tryRevealed")}</Button>}<Button variant={missed.length||skipped.length?"outline":"default"} className="ans-learn-button" onClick={()=>start(session.scope,session.round+1)}>{t("anotherRound")}<ArrowRight size={16} aria-hidden="true"/></Button></div><p className="ans-learn-storage">{t(persisted?"deviceProgress":"sessionOnly")}</p></section>:<div className="ans-practice-stage"><section className="ans-practice-question"><h1 className="sr-only">{t("practiceTitle")}</h1>{lesson.lessonPractice&&<LessonQuiz key={`${session.round}:${lesson.id}`} id={lesson.id} seed={`${lesson.id}:${session.round}`} practice={lesson.lessonPractice} initialAnswer={answer?.choice??undefined} locked={unlocked} variant="practice" onSelect={(correct,choice)=>update({...session,answers:{...session.answers,[lesson.id]:{choice,correct}}})}/>}<div className="ans-learn-actions">{session.index>0&&<Button variant="outline" className="ans-learn-button" onClick={()=>{update({...session,index:session.index-1});setExpanded(false);focus();}}><ArrowLeft size={16} aria-hidden="true"/>{t("previous")}</Button>}<Button className="ans-learn-button" disabled={!unlocked} onClick={next}>{t(session.index===session.ids.length-1?"finishRound":"next")}<ArrowRight size={16} aria-hidden="true"/></Button>{!unlocked&&<Button variant="ghost" className="ans-learn-button" onClick={()=>update({...session,answers:{...session.answers,[lesson.id]:{choice:null,correct:null}}})}>{t("showExplanation")}</Button>}</div></section>
 <aside className="ans-practice-reference">{unlocked?<><p className="ans-learn-kicker">{t("relatedTerm")}</p><h2><Link href={`/vibe-hub/${lesson.id}?lang=${lang}`}>{lesson.title}<ArrowUpRight size={18} aria-hidden="true"/></Link></h2><p>{lesson.description}</p>{answer?.correct===null&&lesson.lessonPractice&&<div className="ans-practice-revealed"><strong>{t("recommendedAnswer")}</strong>{lesson.lessonPractice.options.filter(item=>item.correct).map(item=><p key={item.label}>{item.label}<span>{item.feedback}</span></p>)}</div>}<details open={expanded} onToggle={event=>setExpanded(event.currentTarget.open)}><summary><BookOpen size={16} aria-hidden="true"/>{t("openExample")}</summary>{expanded&&(currentPage?<SourceContent className="ans-practice-term" slug={lesson.id} officialEntry={currentPage.detail} html={currentPage.content.html} demo={hasNativeDemo(lesson.id)?<TermDemo slug={lesson.id}/>:undefined}/>:failed===key?<div role="alert"><p>{common("practiceLoadError")}</p><Button variant="outline" onClick={()=>setAttempt(value=>value+1)}>{common("retry")}</Button></div>:<div className="ans-learn-skeleton" role="status"><span className="sr-only">{common("loading")}</span><i/><i/><i/></div>)}</details></>:<><Target size={24} aria-hidden="true"/><h2>{t("beforeAnswer")}</h2><p>{t("beforeAnswerBody")}</p><div className="ans-practice-focus-note">{t("firstAnswerCounts")}</div></>}</aside></div>}</div></main>;
}