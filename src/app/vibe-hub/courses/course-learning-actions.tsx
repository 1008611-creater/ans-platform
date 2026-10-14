"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVibeLanguage } from "../use-vibe-language";
import { practiceHref } from "./learning-content";
export function CourseLearningActions({course,chapter,complete,onComplete,persisted=true}:{course:string;chapter:string;complete:boolean;onComplete:()=>void;persisted?:boolean}) {
 const t=useTranslations("vibehub.learning"),lang=useVibeLanguage();
 return <section className="ans-course-learning-actions" aria-label={t("chapterActions")}><div><h2>{t("finishReading")}</h2><p>{t(persisted?"deviceProgress":"sessionOnly")}</p></div><div><Button variant={complete?"secondary":"default"} className="ans-learn-button" disabled={complete} onClick={onComplete}>{complete&&<Check size={16} aria-hidden="true"/>}{t(complete?"markedRead":"markRead")}</Button><Button asChild variant="outline" className="ans-learn-button"><Link href={practiceHref(lang,course,chapter)}>{t("chapterPractice")}<ArrowUpRight size={16} aria-hidden="true"/></Link></Button></div></section>;
}

export function CourseReaderContext({order,total}:{order:number;total:number}) {
 const t=useTranslations("vibehub.learning"),lang=useVibeLanguage();
 return <div className="ans-course-reader-context"><span>{t("chapterNumber",{index:order,total})}</span>{lang==="en"&&<span>{t("courseTextLanguage")}</span>}</div>;
}
