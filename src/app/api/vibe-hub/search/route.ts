import { NextResponse } from "next/server";
import terms from "../terms/terms.json";
import snapshot from "@/data/vibehub/manifest.json";
import { searchTerms } from "@/app/vibe-hub/official/search";
export function GET(request: Request) {
  const params = new URL(request.url).searchParams; const locale = params.get("locale") === "en" ? "en" : "zh";
  const query = (params.get("q") || "").slice(0,500).trim(); const category = params.get("category");
  const supplied = Number(params.get("limit") || 20); const limit = Number.isFinite(supplied) ? Math.max(1,Math.min(50,Math.floor(supplied))) : 20;
  const byId = new Map(terms.map(term => [term.slug, term]));
  const results = searchTerms({query}).flatMap(({entry,score,matchedFields}) => {
    const term = byId.get(entry.id);
    if (!term || (category && ![term.category,term.zhCategory,term.macroCategory].includes(category))) return [];
    const path = `/vibe-hub/${term.slug}?lang=${locale}`;
    return [{id:term.slug,title:locale === "zh" ? term.zhName : term.name,secondaryTitle:locale === "zh" ? term.name : term.zhName,category:locale === "zh" ? term.zhCategory : term.category,macroCategory:term.macroCategory,tagline:locale === "zh" ? term.zhDescription : term.description,path,url:new URL(path,request.url).href,score,matchedFields}];
  });
  return NextResponse.json({schemaVersion:"1",revision:`ans-${snapshot.revision}`,data:{locale,query,count:results.length,results:results.slice(0,limit)}},{headers:{"Cache-Control":"public, max-age=300"}});
}
