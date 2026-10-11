import { NextResponse } from "next/server";
import index from "@/data/vibehub/courses/index.json";
import { readVibeData } from "@/server/vibehub/content";
export async function GET(_request:Request,{params}:{params:Promise<{segments?:string[]}>}){
 const parts=(await params).segments||[];const [course,chapter]=parts;
 if(parts.length>2||(course&&!index.some(item=>item.course===course)))return NextResponse.json({error:"Course not found"},{status:404});
 const payload=chapter?await readVibeData(`courses/${course}/${chapter}.json`):{courses:[...new Set(index.map(item=>item.course))],chapters:index.filter(item=>!course||item.course===course)};
 return payload?NextResponse.json({schemaVersion:"1",data:payload},{headers:{"Cache-Control":"public, max-age=3600","x-vibehub-source":"local-official-snapshot"}}):NextResponse.json({error:"Chapter not found"},{status:404});
}
