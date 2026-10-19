import { NextRequest, NextResponse } from "next/server";
import { getImage2FreeQuotaStatus } from "@/lib/image2-free-quota";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const quota = await getImage2FreeQuotaStatus(request);
  return NextResponse.json({ quota });
}
