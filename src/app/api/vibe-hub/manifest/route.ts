import { NextResponse } from "next/server";
export async function GET(){try{const r=await fetch("https://vibe-hub.org/.well-known/vibehub.json",{next:{revalidate:300}});if(r.ok)return NextResponse.json(await r.json())}catch{}return NextResponse.json({error:"Manifest unavailable"},{status:503})}
