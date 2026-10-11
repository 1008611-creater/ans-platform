import { NextResponse } from "next/server";
import { readVibeData, languageParam, type SourcePage } from "@/server/vibehub/content";
const slugs = ["practice", "anti-ai-flavor", "vibehub-skill", "changelog", "vibehub-skill-lab"];
export async function GET(request: Request) {
  const lang = languageParam(new URL(request.url).searchParams.get("locale") || undefined);
  const pages = await Promise.all(slugs.map(async slug => { const content = await readVibeData<SourcePage>(`specials/${lang}/${slug}.json`); return content ? { slug, ...content } : null; }));
  const items = pages.filter(Boolean);
  return NextResponse.json({ locale: lang, items, total: items.length }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
