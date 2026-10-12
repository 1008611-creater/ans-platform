"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Lesson } from "@/contracts/vibehub-content";
export function LessonQuiz({ practice, id, onAnswer, onSelect }: { practice: NonNullable<Lesson["lessonPractice"]>; id: string; onAnswer?: (correct: boolean) => void; onSelect?: (correct: boolean) => void }) {
  const [answer, setAnswer] = useState<number | null>(null); const t = useTranslations("vibehub");
  const selected = answer === null ? null : practice.options[answer];
  return <section className="vh-quiz" aria-labelledby={`quiz-${id}`}><div className="vh-quiz-kicker"><strong>{t("quickCheck")}</strong></div><h2 id={`quiz-${id}`}>{practice.title}</h2>
    <fieldset><legend className="sr-only">{practice.title}</legend>{practice.options.map((option, index) => <label className="vh-quiz-option" key={option.label}><input type="radio" name={`answer-${id}`} value={index} checked={answer === index} onChange={() => { setAnswer(index); onSelect?.(option.correct); if (answer === null) onAnswer?.(option.correct); }} /><span>{String.fromCharCode(65 + index)}. {option.label}</span></label>)}</fieldset>
    {selected && <div className="vh-quiz-feedback" data-correct={selected.correct} role="status"><strong>{t(selected.correct ? "correct" : "incorrect")}：</strong>{selected.feedback}</div>}
  </section>;
}
