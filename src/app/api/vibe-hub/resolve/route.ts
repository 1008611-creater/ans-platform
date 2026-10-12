import { NextResponse } from "next/server";
import terms from "../terms/terms.json";
import { searchKnowledgeTerms } from "@/app/vibe-hub/search-terms";
export function GET(request: Request) {
  const params = new URL(request.url).searchParams; const q = (params.get("q") || "").slice(0,500).trim(); const locale = params.get("locale") === "en" ? "en" : "zh";
  const byId = new Map(terms.map(term => [term.slug,term]));
  const items = q ? searchKnowledgeTerms(q).flatMap(({entry}) => {
    const term = byId.get(entry.id); if (!term) return [];
    return [{slug:term.slug,name:locale === "zh" ? term.zhName : term.name,category:locale === "zh" ? term.zhCategory : term.category,description:locale === "zh" ? term.zhDescription : term.description}];
  }).slice(0,3) : [];
  return NextResponse.json({source:"local",items},{headers:{"Cache-Control":"public, max-age=300"}});
}
