import { NextResponse } from "next/server";
import { readVoiceRequest } from "@/server/voice/service";
import { voiceActor, voiceFailure, voiceHeaders, voiceResponse } from "@/server/voice/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const actor = await voiceActor(request);
    const result = await readVoiceRequest(actor, (await params).key, new URL(request.url).searchParams.get("audio") === "1");
    return new URL(request.url).searchParams.get("audio") === "1" ? voiceResponse(result) : NextResponse.json(result.metadata, { headers: voiceHeaders });
  } catch (error) { return voiceFailure(error); }
}
