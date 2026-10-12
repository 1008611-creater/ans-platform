import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assertRequestActor, HttpRequestError } from "@/server/http/json";
import { QuotaError } from "@/server/quota/service";
import type { readVoiceRequest } from "./service";

export const voiceHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function voiceActor(request: Request) {
  const session = await auth();
  if (!session?.user?.id) throw new HttpRequestError("UNAUTHORIZED", 401);
  assertRequestActor(request, session.user.id);
  return session.user.id;
}
export function voiceFailure(error: unknown) {
  const known = error instanceof HttpRequestError || error instanceof QuotaError;
  return NextResponse.json({ error: known ? error.code : "VOICE_UNAVAILABLE" }, { status: known ? error.status : 503, headers: voiceHeaders });
}
export function voiceResponse(result: Awaited<ReturnType<typeof readVoiceRequest>>) {
  const headers = { ...voiceHeaders, "X-ANS-Voice-Request": result.metadata.requestId };
  if (result.audio) return new Response(new Uint8Array(result.audio), { headers: { ...headers, "Content-Type": "audio/wav", "Content-Length": String(result.audio.length), "X-ANS-Voice-Expires": result.metadata.expiresAt ?? "" } });
  const state = result.metadata.state;
  return NextResponse.json(result.metadata, { status: state === "RUNNING" || state === "AUTHORIZED" ? 202 : state === "UNCERTAIN" ? 409 : state === "RELEASED" ? 422 : 200, headers });
}
