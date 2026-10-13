"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, CircleAlert } from "lucide-react";
import type { Lesson } from "@/contracts/vibehub-content";
export function LessonQuiz({ practice, id, seed, onAnswer, onSelect, initialAnswer, locked = false, variant }: { practice: NonNullable<Lesson["lessonPractice"]>; id: string; seed?: string; onAnswer?: (correct: boolean) => void; onSelect?: (correct: boolean, choice: number) => void; initialAnswer?: number; locked?: boolean; variant?: "practice" }) {
 const questionKey = seed || id;
 const [selection, setSelection] = useState<{ key: string; index: number } | null>(null); const t = useTranslations("vibehub");
 const answer = selection?.key === questionKey ? selection.index : initialAnswer ?? null;
 const hash = Array.from(questionKey).reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261);
 const offset = practice.options.length ? hash % practice.options.length : 0;
 const options = [...practice.options.slice(offset), ...practice.options.slice(0, offset)];
 const selected = answer === null ? null : options[answer];
 return <section className={`vh-quiz${variant ? " ans-practice-quiz" : ""}`} aria-labelledby={`quiz-${id}`}>
 {!variant&&<div className="vh-quiz-kicker"><strong>{t("quickCheck")}</strong></div>}<h2 id={`quiz-${id}`}>{practice.title}</h2>
 <fieldset disabled={locked}><legend className="sr-only">{practice.title}</legend>{options.map((option, index) => <label className="vh-quiz-option" data-selected={answer===index} data-result={locked&&option.correct?"correct":locked&&answer===index?"missed":undefined} key={option.label}><input type="radio" name={`answer-${id}`} value={index} checked={answer === index} onChange={() => { setSelection({ key: questionKey, index }); onSelect?.(option.correct,index); if (answer === null) onAnswer?.(option.correct); }} /><span className="ans-quiz-letter" aria-hidden="true">{String.fromCharCode(65+index)}</span><span>{variant?option.label:`${String.fromCharCode(65+index)}. ${option.label}`}</span>{locked&&option.correct&&variant&&<CheckCircle2 size={18} aria-hidden="true"/>}</label>)}</fieldset>
 {selected&&<div className="vh-quiz-feedback" data-correct={selected.correct} role="status">{variant&&(selected.correct?<CheckCircle2 size={20} aria-hidden="true"/>:<CircleAlert size={20} aria-hidden="true"/>)}<div><strong>{t(selected.correct ? "correct" : "incorrect")}{!variant&&": "}</strong>{variant?<p>{selected.feedback}</p>:selected.feedback}</div></div>}
 </section>;
}