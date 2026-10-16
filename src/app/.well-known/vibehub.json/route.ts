import { NextResponse } from "next/server";
import { makeVibeManifest } from "@/server/vibehub/manifest";
export function GET(request: Request) {return NextResponse.json(makeVibeManifest(new URL(request.url).origin),{headers:{"Cache-Control":"public, max-age=300"}});}
