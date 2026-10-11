import { NextResponse } from "next/server";
import terms from "../terms/terms.json";
import snapshot from "@/data/vibehub/manifest.json";
export function GET(request: Request) {
  const params = new URL(request.url).searchParams; const locale = params.get("locale") === "en" ? "en" : "zh"; const query = (params.get("q") || "").slice(0,500).trim().toLowerCase(); const category = params.get("category");
  const supplied = Number(params.get("limit") || 20); const limit = Number.isFinite(supplied) ? Math.max(1,Math.min(50,Math.floor(supplied))) : 20;
  const results = terms.map((term) => {const score = !query ? 0 : term.slug.toLowerCase() === query || term.name.toLowerCase() === query || term.zhName === query ? 100 : `${term.name} ${term.zhName}`.toLowerCase().includes(query) ? 80 : `${term.description} ${term.zhDescription} ${term.quote} ${term.zhQuote}`.toLowerCase().includes(query) ? 40 : -1;return {term,score};}).filter(({term,score}) => score >= 0 && (!category || term.category === category || term.zhCategory === category || term.macroCategory === category)).sort((a,b) => b.score-a.score).map(({term,score}) => ({id:term.slug,title:locale === "zh" ? term.zhName : term.name, secondaryTitle:locale === "zh" ? term.name : term.zhName,category:locale === "zh" ? term.zhCategory : term.category,macroCategory:term.macroCategory,tagline:locale === "zh" ? term.zhDescription : term.description,path:`/vibe-hub/${term.slug}?lang=${locale}`,url:new URL(`/vibe-hub/${term.slug}?lang=${locale}`,request.url).href,score,matchedFields:score>0?["local-content"]:[]}));
  return NextResponse.json({schemaVersion:"1",revision:`ans-${snapshot.revision}`,data:{locale,query,count:results.length,results:results.slice(0,limit)}},{headers:{"Cache-Control":"public, max-age=300"}});
}
