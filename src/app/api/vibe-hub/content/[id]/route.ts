import { NextResponse } from "next/server";
import { readVibeData, languageParam, type SourcePage } from "@/server/vibehub/content";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9-]+$/.test(id)) return NextResponse.json({ error: "Invalid term" }, { status: 400 });
  const lang = languageParam(new URL(request.url).searchParams.get("locale") || undefined);
  const page = await readVibeData<SourcePage>(`entries/${lang}/${id}.json`);
  return page ? NextResponse.json(page, { headers: { "Cache-Control": "public, max-age=3600" } }) : NextResponse.json({ error: "Term not found" }, { status: 404 });
}
