import { NextResponse } from "next/server";
import { readVibeData, languageParam, type AgentEnvelope } from "@/server/vibehub/content";
import type { JourneySummary } from "@/app/vibe-hub/journeys/journeys-client";
type Summary = JourneySummary & {intentExamples: string[]};
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams; const lang = languageParam(params.get("locale") || undefined); const query = (params.get("q") || "").slice(0,500).trim().toLowerCase();
  const supplied = Number(params.get("limit") || 20); const limit = Number.isFinite(supplied) ? Math.min(50, Math.max(1, Math.floor(supplied))) : 20;
  const payload = await readVibeData<AgentEnvelope<{results: Summary[]}>>(`journeys-${lang}.json`);
  if (!payload) return NextResponse.json({error:"Journeys unavailable"},{status:503});
  const results = payload.data.results.filter((item) => !query || `${item.title} ${item.outcome} ${(item.intentExamples || []).join(" ")}`.toLowerCase().includes(query));
  return NextResponse.json({...payload,data:{...payload.data, count:results.length, query, results:results.slice(0,limit)}},{headers:{"Cache-Control":"public, max-age=300","x-vibehub-source":"local-official-snapshot"}});
}
