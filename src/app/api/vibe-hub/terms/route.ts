import { NextResponse } from "next/server";
import terms from "./terms.json";
export async function GET(request: Request) { const { searchParams } = new URL(request.url); const q=(searchParams.get("q")||"").trim().toLowerCase(); const limit=Math.min(Number(searchParams.get("limit")||100),500); const result=q?terms.filter(t=>`${t.name} ${t.description}`.toLowerCase().includes(q)):terms; return NextResponse.json({items:result.slice(0,limit),total:result.length}); }
