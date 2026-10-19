import { NextResponse } from "next/server";
import { getImage2GachaConfig } from "@/lib/image2-gacha-config";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    config: getImage2GachaConfig()
  });
}
