import { NextResponse } from "next/server";
import { readVibeData, languageParam } from "@/server/vibehub/content";
export async function GET(request: Request, {params}: {params: Promise<{id:string}>}) {
  const {id} = await params; const lang = languageParam(new URL(request.url).searchParams.get("locale") || undefined);
  const payload = await readVibeData(`journeys/${lang}/${id}.json`);
  return payload ? NextResponse.json(payload,{headers:{"Cache-Control":"public, max-age=300","x-vibehub-source":"local-official-snapshot"}}) : NextResponse.json({error:"Journey not found"},{status:404});
}
