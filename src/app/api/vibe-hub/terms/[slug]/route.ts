import { NextResponse } from "next/server";
import terms from "../terms.json";
import { readVibeData, languageParam, type SourcePage, type AgentEnvelope, type Lesson } from "@/server/vibehub/content";
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const term = terms.find(item => item.slug === slug);
  if (!term) return NextResponse.json({ error: "Term not found" }, { status: 404 });
  const lang = languageParam(new URL(request.url).searchParams.get("locale") || undefined);
  const [content, lesson] = await Promise.all([readVibeData<SourcePage>(`entries/${lang}/${slug}.json`), readVibeData<AgentEnvelope<Lesson>>(`lessons/${lang}/${slug}.json`)]);
  return NextResponse.json({ ...term, locale: lang, content, lesson: lesson?.data || null }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
