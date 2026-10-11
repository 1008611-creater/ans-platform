import { NextResponse } from "next/server";
import terms from "../terms.json";
export async function GET(_: Request, {params}:{params:Promise<{slug:string}>}) { const {slug}=await params; const term=terms.find(t=>t.slug===slug); return term?NextResponse.json(term):NextResponse.json({error:"Term not found"},{status:404}); }
