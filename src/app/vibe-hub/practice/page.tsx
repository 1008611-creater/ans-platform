import { vibePageMetadata } from "../metadata";
import { getLocale } from "next-intl/server";
import terms from "../terms.json";
import courseIndex from "@/data/vibehub/courses/index.json";
import { readVibeData, languageParam, type AgentEnvelope, type Lesson } from "../source-data";
import { PracticeClient } from "./practice-client";
type Params = {lang?:string;scope?:string;course?:string;chapter?:string};
export default async function Practice({ searchParams }: { searchParams: Promise<Params> }) {
 const query=await searchParams,lang=languageParam(query.lang,await getLocale());
 const payloads=await Promise.all(terms.map(async term=>{const item=await readVibeData<AgentEnvelope<Lesson>>(`lessons/${lang}/${term.slug}.json`);return item?.data.lessonPractice?{id:term.slug,title:item.data.title,lessonPractice:item.data.lessonPractice,macroCategory:term.macroCategory,description:item.data.tagline||item.data.description||""}:null;}));
 const lessons=payloads.flatMap(item=>item?[item]:[]);
 const chapters=courseIndex.filter(item=>item.course===query.course&&(!query.chapter||item.id===query.chapter));
 const chapterData=await Promise.all(chapters.map(item=>readVibeData<{coreTerms?:string[]}>(`courses/${item.course}/${item.id}.json`)));
 const courseIds=[...new Set(chapterData.flatMap(item=>item?.coreTerms||[]))].filter(id=>lessons.some(item=>item.id===id));
 const initialScope=courseIds.length?"course":lessons.some(item=>item.macroCategory===query.scope)?query.scope:"all";
 return <PracticeClient key={`${lang}:${query.course||""}:${query.chapter||""}`} lessons={lessons} initialScope={initialScope} courseIds={courseIds} context={chapters.length?`${chapters[0].course}:${query.chapter||"all"}`:"all"} courseBackHref={chapters.length?`/vibe-hub/courses/${chapters[0].course}${query.chapter?`/${query.chapter}`:""}?lang=${lang}`:undefined}/>;
}
export function generateMetadata({searchParams}:{searchParams:Promise<Params>}) {return vibePageMetadata("practice",searchParams);}
