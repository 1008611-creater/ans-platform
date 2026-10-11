"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SourceContent } from "../source-content";
import { LessonQuiz } from "../lesson-quiz";
import { hasNativeDemo, TermDemo } from "../term-demo";
import type { SourcePage, Lesson } from "@/contracts/vibehub-content";
import type { OfficialEntry } from "../official/types";
type Payload = {content:SourcePage; lesson:Lesson | null; detail:OfficialEntry | null};
export function EmbeddedCourseTerm({ termId, locale, onReady, className }: {termId:string; locale:"en" | "zh"; onReady:(id:string)=>void; className?:string}) {
  const t=useTranslations("vibehub"); const [record,setRecord]=useState<{id:string;locale:string;data:Payload} | null>(null); const [failed,setFailed]=useState<string | null>(null); const [attempt,setAttempt]=useState(0);
  const key=`${termId}:${locale}`; const payload=record?.id===termId&&record.locale===locale?record.data:null;
  useEffect(() => {
    const abort=new AbortController();
    void (async()=>{try {const response=await fetch(`/api/vibe-hub/course-terms/${termId}?locale=${locale}`,{signal:abort.signal}); if(!response.ok)throw new Error("Unavailable"); const result=await response.json() as Payload; if(!abort.signal.aborted){setRecord({id:termId,locale,data:result});setFailed(null);}}
      catch {if(!abort.signal.aborted)setFailed(`${termId}:${locale}`);}})();
    return ()=>abort.abort();
  },[termId,locale,attempt]);
  useEffect(()=>{if(payload)onReady(termId);},[payload,onReady,termId]);
  if(failed===key)return <div role="alert"><p>{t("loadError")}</p><button type="button" onClick={()=>setAttempt(value=>value+1)}>{t("retry")}</button></div>;
  if(!payload)return <div role="status">{t("loading")}</div>;
  return <div className={className}><SourceContent slug={termId} officialEntry={payload.detail} html={payload.content.html} className="vh-detail-content" demo={hasNativeDemo(termId)?<TermDemo slug={termId}/>:undefined}/>{payload.lesson?.lessonPractice&&<LessonQuiz id={termId} practice={payload.lesson.lessonPractice}/>}</div>;
}
