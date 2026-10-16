import { NextResponse } from "next/server";
import terms from "./terms.json";
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url); const q = (searchParams.get("q") || "").slice(0, 500).trim().toLowerCase();
  const supplied = Number(searchParams.get("limit") || 100); const limit = Number.isFinite(supplied) ? Math.max(1, Math.min(Math.floor(supplied), 500)) : 100;
  const result = q ? terms.filter((term) => `${term.name} ${term.zhName} ${term.slug} ${term.description} ${term.zhDescription} ${term.quote} ${term.zhQuote}`.toLowerCase().includes(q)) : terms;
  return NextResponse.json({ items: result.slice(0, limit), total: result.length }, { headers: { "Cache-Control": "public, max-age=300" } });
}
