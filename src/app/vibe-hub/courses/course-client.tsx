"use client";
import { CourseOverview } from "./course-overview";
import { CourseDirectory } from "./course-directory";
import { useRouter } from "next/navigation";
import { CoursePage } from "../official/course-page.js";
import { useVibeLanguage } from "../use-vibe-language";
const ignore = () => {};
export function CourseClient({course,chapter,term,initialChapter}:{course?:string;chapter?:string;term?:string;initialChapter?:{id:string;[key:string]:unknown}|null}) {
  const lang=useVibeLanguage();const router=useRouter();
  const home=(id:string)=>router.push(`/vibe-hub/courses/${id}?lang=${lang}`);
  if (!course) return <CourseDirectory />;
  if (!chapter) return <CourseOverview course={course} />;
  return <CoursePage courseId={course} chapterId={chapter} initialTermId={term} initialChapter={initialChapter} locale={lang} onChapterResolved={ignore} onMobileTermSheetChange={ignore} onOpenChapter={(id,part)=>router.push(`/vibe-hub/courses/${id}/${part}?lang=${lang}`)} onOpenHome={home} onOpenRoute={home} onOpenRoutes={()=>router.push(`/vibe-hub/courses?lang=${lang}`)} onOpenTermPage={id=>router.push(`/vibe-hub/${id}?lang=${lang}`)}/>;
}
