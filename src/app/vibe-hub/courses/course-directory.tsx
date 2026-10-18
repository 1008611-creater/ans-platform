"use client";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Code2, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useVibeLanguage } from "../use-vibe-language";
import { useCourseProgress } from "./course-progress";
import { courseChapters, chapterTitle, courseIds, type CourseId, practiceHref } from "./learning-content";
export function CourseTile({course, number}: {course: CourseId; number: number}) {
 const lang=useVibeLanguage(), t=useTranslations("vibehub.learning");
 const {progress,hydrated}=useCourseProgress(course); const chapters=courseChapters(course);
 const completed=chapters.filter(item=>progress.chapters[item.id]?.readCompleted).length;
 const current=chapters.find(item=>progress.chapters[item.id]?.status==="in-progress")||chapters.find(item=>!progress.chapters[item.id]?.readCompleted)||chapters[0];
 const started=hydrated&&chapters.some(item=>progress.chapters[item.id]?.updatedAt>0);
 const Icon=course==="product-website"?Code2:GitBranch;
 const cover=course==="product-website"?"/images/home/showcase/academic-portal.png":"/images/home/showcase/agri-drone-ai.png";
 return <article className="ans-learn-course"><header><span className="ans-learn-course-id"><Icon size={20} aria-hidden="true" />{String(number).padStart(2,"0")}</span><span>{t("chapters",{count:chapters.length})}</span></header>
 <div className="mb-3 aspect-[16/9] w-full overflow-hidden rounded-xl border bg-muted"><img src={cover} alt={t(`${course}.title`)} className="h-full w-full object-cover" loading="lazy" /></div>
 <h2>{t(`${course}.title`)}</h2><p>{t(`${course}.outcome`)}</p>
 <div className="ans-learn-course-visual" aria-hidden="true">{course==="product-website"?<><div className="ans-learn-wire-nav"><i/><i/><i/></div><div className="ans-learn-wire-hero"><span/><span/><b/></div><div className="ans-learn-wire-content"><i/><i/><i/></div></>:<><div className="ans-learn-git-line"><i/><span/><i/><span/><i/></div><div className="ans-learn-git-branch"><i/><span/><i/></div><code>main / feature</code></>}</div>
 <ol className="ans-learn-course-topics">{[1,2,3].map(n=><li key={n}><span>{String(n).padStart(2,"0")}</span>{t(`${course}.step${n}`)}</li>)}</ol>
 {started&&<div className="ans-learn-resume"><Check size={16} aria-hidden="true"/><span>{t("readCount",{count:completed,total:chapters.length})}</span><strong>{chapterTitle(current,lang)}</strong></div>}
 <footer><Button asChild className="ans-learn-button"><Link href={started?`/vibe-hub/courses/${course}/${current.id}?lang=${lang}`:`/vibe-hub/courses/${course}?lang=${lang}`}>{t(started?"continue":"viewCourse")}<ArrowRight size={16} aria-hidden="true"/></Link></Button><Link className="ans-learn-text-link" href={practiceHref(lang,course)}>{t("practice")}<ArrowUpRight size={16} aria-hidden="true"/></Link></footer>
 </article>;
}
export function CourseDirectory() {
 const t=useTranslations("vibehub.learning"),lang=useVibeLanguage();
 return <main className="ans-learning-page"><header className="ans-learning-heading"><div><p>{t("courseKicker")}</p><h1>{t("courseTitle")}</h1></div><Link className="ans-learn-text-link" href={practiceHref(lang)}>{t("toPractice")}<ArrowUpRight size={16} aria-hidden="true"/></Link></header><div className="ans-learn-courses">{courseIds.map((course,index)=><CourseTile key={course} course={course} number={index+1}/>)}</div></main>;
}
