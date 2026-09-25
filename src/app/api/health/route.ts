import { NextResponse } from "next/server";
import { probeDatabase } from "@/server/health/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const probe = await probeDatabase();
  return NextResponse.json(probe, { status: probe.status === "healthy" ? 200 : 503 });
}
