import { getLocale } from "next-intl/server";
import labels from "../../labels.json";
import { languageParam } from "../../source-data";
import { notFound } from "next/navigation";
import { CourseClient } from "../course-client";
import { readVibeData } from "../../source-data";
import index from "@/data/vibehub/courses/index.json";
import terms from "../../terms.json";
type Props={params:Promise<{segments?:string[]}>;searchParams:Promise<{lang?:string;term?:string}>};
export async function generateMetadata({params,searchParams}:Props){
  const parts=(await params).segments||[]; const lang=languageParam((await searchParams).lang,await getLocale());
  const chapter=index.find(item=>item.course===parts[0]&&item.id===parts[1]); const path="/vibe-hub/courses"+(parts.length?"/"+parts.join("/"):"");
  return {title:chapter?.title||labels[lang].courseDirectoryTitle,description:chapter?.intro||labels[lang].courseDirectoryBody,alternates:{canonical:`${path}?lang=${lang}`,languages:{en:`${path}?lang=en`,"zh-CN":`${path}?lang=zh`}}};
}
export default async function Courses({params,searchParams}:Props){
 const parts=(await params).segments||[];const [course,chapter]=parts;const query=await searchParams;
 if(parts.length>2||(course&&!index.some(item=>item.course===course))||(chapter&&!index.some(item=>item.course===course&&item.id===chapter)))notFound();
 const initialChapter=course&&chapter?await readVibeData<{id:string;[key:string]:unknown}>(`courses/${course}/${chapter}.json`):null;
 if(chapter&&!initialChapter)notFound();const term=query.term&&terms.some(item=>item.slug===query.term)?query.term:undefined;
 return <CourseClient course={course} chapter={chapter} term={term} initialChapter={initialChapter}/>;
}
