import { notFound } from "next/navigation";
import { CourseClient } from "../course-client";
import { readVibeData } from "../../source-data";
import index from "@/data/vibehub/courses/index.json";
import terms from "../../terms.json";
type Props={params:Promise<{segments?:string[]}>;searchParams:Promise<{lang?:string;term?:string}>};
export async function generateMetadata({params}:Props){const parts=(await params).segments||[];const chapter=index.find(item=>item.course===parts[0]&&item.id===parts[1]);return {title:chapter?.title||"VibeHub Courses",description:chapter?.intro,alternates:{canonical:"/vibe-hub/courses"+(parts.length?"/"+parts.join("/"):"")}};}
export default async function Courses({params,searchParams}:Props){
 const parts=(await params).segments||[];const [course,chapter]=parts;const query=await searchParams;
 if(parts.length>2||(course&&!index.some(item=>item.course===course))||(chapter&&!index.some(item=>item.course===course&&item.id===chapter)))notFound();
 const initialChapter=course&&chapter?await readVibeData<{id:string;[key:string]:unknown}>(`courses/${course}/${chapter}.json`):null;
 if(chapter&&!initialChapter)notFound();const term=query.term&&terms.some(item=>item.slug===query.term)?query.term:undefined;
 return <CourseClient course={course} chapter={chapter} term={term} initialChapter={initialChapter}/>;
}
