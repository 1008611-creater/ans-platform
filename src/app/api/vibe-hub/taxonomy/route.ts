import { NextResponse } from "next/server";
import snapshot from "@/data/vibehub/manifest.json";
export function GET(){return NextResponse.json({schemaVersion:"1",revision:`ans-${snapshot.revision}`,data:{taxonomy:snapshot.data.taxonomy}},{headers:{"Cache-Control":"public, max-age=300"}});}
