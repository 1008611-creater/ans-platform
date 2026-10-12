import { NextResponse } from "next/server";
import { readSameOriginJson } from "@/server/http/json";
import { generateVoice, readVoiceOffer } from "@/server/voice/service";
import { voiceActor, voiceFailure, voiceHeaders, voiceResponse } from "@/server/voice/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { return NextResponse.json(await readVoiceOffer(await voiceActor(request)), { headers: voiceHeaders }); }
  catch (error) { return voiceFailure(error); }
}
export async function POST(request: Request) {
  try { const actor = await voiceActor(request); return voiceResponse(await generateVoice(actor, await readSameOriginJson(request))); }
  catch (error) { return voiceFailure(error); }
}
