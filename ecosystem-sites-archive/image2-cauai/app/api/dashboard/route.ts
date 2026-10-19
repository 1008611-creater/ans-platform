import { NextRequest, NextResponse } from "next/server";
import { DURATION_OPTIONS, RATIO_OPTIONS, VIDEO_MODES } from "@/lib/types";
import { getDashboard } from "@/lib/store";
import { hiddenRouteResponse, isLegacySeedanceApiEnabled } from "@/lib/runtime-access";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isLegacySeedanceApiEnabled()) return hiddenRouteResponse();
  const userId = request.nextUrl.searchParams.get("userId") ?? request.headers.get("x-seedance-user") ?? "";
  const dashboard = await getDashboard(userId);
  return NextResponse.json({
    ...dashboard,
    ratios: RATIO_OPTIONS,
    durations: DURATION_OPTIONS,
    modes: VIDEO_MODES
  });
}
