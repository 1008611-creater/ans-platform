import { NextResponse } from "next/server";
import terms from "../terms/terms.json";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams; const q = (params.get("q") || "").slice(0,500).trim(); const locale = params.get("locale") === "en" ? "en" : "zh";
  if (!q) return NextResponse.json({items:[],source:"local"});
  try {
    const response = await fetch(`https://vibe-hub.org/api/agent/v1/search?q=${encodeURIComponent(q)}&limit=3&locale=${locale}`,{next:{revalidate:300},signal:AbortSignal.timeout(8000)});
    if (response.ok) {const payload = await response.json(); const results: {id:string; title:string; category:string; tagline:string}[] = payload?.data?.results || [];
      const items = results.filter((item) => terms.some((term) => term.slug === item.id)).map((item) => ({slug:item.id,name:item.title,category:item.category,description:item.tagline}));
      if (items.length) return NextResponse.json({source:"official",items});
    }
  } catch { /* Use the local snapshot for literal matching when the official resolver is offline. */ }
  const query = q.toLowerCase();
  const items = terms.filter((term) => `${term.slug} ${term.name} ${term.zhName} ${term.quote} ${term.zhQuote} ${term.description} ${term.zhDescription}`.toLowerCase().includes(query)).slice(0,3).map((term) => ({slug:term.slug,name:locale === "zh" ? term.zhName : term.name, category:locale === "zh" ? term.zhCategory : term.category,description:locale === "zh" ? term.zhDescription : term.description}));
  return NextResponse.json({source:"local",items});
}
