"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { guideHref } from "@/domain/vibehub/guide-routing";
import { useVibeLanguage } from "../use-vibe-language";
import { useCourseProgress } from "./course-progress";
import { courseChapters, chapterTitle, practiceHref } from "./learning-content";
export function CourseOverview({course}:{course:string}) {
 const lang=useVibeLanguage(),t=useTranslations("vibehub.learning");const {progress,hydrated,persisted}=useCourseProgress(course),chapters=courseChapters(course);
 const completed=chapters.filter(item=>progress.chapters[item.id]?.readCompleted).length;
 const current=chapters.find(item=>progress.chapters[item.id]?.status==="in-progress")||chapters.find(item=>!progress.chapters[item.id]?.readCompleted)||chapters[0];
 const started=hydrated&&chapters.some(item=>progress.chapters[item.id]?.updatedAt>0);
 return <main className="ans-learning-page"><Link className="ans-learn-text-link" href={`/vibe-hub/courses?lang=${lang}`}><ArrowLeft size={16} aria-hidden="true"/>{t("allCourses")}</Link>
 <div className="ans-course-overview"><aside className="ans-course-brief"><p className="ans-learn-kicker">{t("chapters",{count:chapters.length})}</p><h1>{t(`${course}.title`)}</h1><p>{t(`${course}.outcome`)}</p><Button asChild className="ans-learn-button"><Link href={`/vibe-hub/courses/${course}/${current.id}?lang=${lang}`}>{t(started?"continue":"startChapter")}<ArrowRight size={16} aria-hidden="true"/></Link></Button><div className="ans-learn-progress"><progress aria-label={t("readProgress")} max={chapters.length} value={completed}/><span>{t("readCount",{count:completed,total:chapters.length})}</span><small>{t(persisted?"deviceProgress":"sessionOnly")}</small></div><nav><Link className="ans-learn-text-link" href={practiceHref(lang,course)}>{t("coursePractice")}<ArrowUpRight size={16} aria-hidden="true"/></Link><Link className="ans-learn-text-link" href={guideHref(lang,{task:course==="product-website"?"website":"github"})}>{t("applyProject")}<ArrowUpRight size={16} aria-hidden="true"/></Link></nav></aside>
 <section className="ans-learn-syllabus"><h2>{t("syllabus")}</h2><ol>{chapters.map(item=>{const status=progress.chapters[item.id]?.readCompleted?"read":progress.chapters[item.id]?.status==="in-progress"?"reading":"notStarted";return <li key={item.id}><Link href={`/vibe-hub/courses/${course}/${item.id}?lang=${lang}`} data-state={status}><span className="ans-learn-chapter-number">{status==="read"?<Check size={18} aria-label={t("read")}/>:String(item.order).padStart(2,"0")}</span><div><h3>{chapterTitle(item,lang)}</h3><p>{t(`chapterGoal.${item.id}`)}</p></div><span className="ans-learn-chapter-state">{status==="reading"&&<Circle size={8} fill="currentColor" aria-hidden="true"/>}{t(status)}</span><ArrowRight size={18} aria-hidden="true"/></Link></li>})}</ol></section></div></main>;
}
