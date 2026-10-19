import { NextRequest, NextResponse } from "next/server";
import { claimTrial, dashboardForUser, mutateStore } from "@/lib/store";
import { DURATION_OPTIONS, RATIO_OPTIONS, VIDEO_MODES } from "@/lib/types";
import { toUserFacingError } from "@/lib/user-facing-error";
import { hiddenRouteResponse, isLegacySeedanceApiEnabled } from "@/lib/runtime-access";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isLegacySeedanceApiEnabled()) return hiddenRouteResponse();
  const body = await request.json();
  const userId = String(body.userId ?? "");

  try {
    const dashboard = await mutateStore((state) => {
      claimTrial(state, userId);
      return dashboardForUser(state, userId);
    });

    return NextResponse.json({
      ...dashboard,
      ratios: RATIO_OPTIONS,
      durations: DURATION_OPTIONS,
      modes: VIDEO_MODES
    });
  } catch (error) {
    return NextResponse.json({ error: toUserFacingError(error instanceof Error ? error.message : error, "领取失败。") }, { status: 400 });
  }
}
