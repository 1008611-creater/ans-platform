import { NextResponse } from "next/server";
import { readVibeData,languageParam,type SourcePage,type AgentEnvelope,type Lesson } from "@/server/vibehub/content";
import type { OfficialDetail } from "@/app/vibe-hub/official/types";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[a-z0-9-]+$/.test(id))return NextResponse.json({error:"Invalid term"},{status:400});
 const lang=languageParam(new URL(request.url).searchParams.get("locale")||undefined);
 const [content,lesson,detail]=await Promise.all([readVibeData<SourcePage>(`entries/${lang}/${id}.json`),readVibeData<AgentEnvelope<Lesson>>(`lessons/${lang}/${id}.json`),readVibeData<OfficialDetail>(`details/${id}.json`)]);
 return content?NextResponse.json({content,lesson:lesson?.data||null,detail:detail?.entry||null},{headers:{"Cache-Control":"public, max-age=3600"}}):NextResponse.json({error:"Term not found"},{status:404});
}
