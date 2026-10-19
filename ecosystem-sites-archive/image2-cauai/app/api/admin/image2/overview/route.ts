import { NextRequest, NextResponse } from "next/server";
import { adminAuthStatus, requireAdmin } from "@/lib/admin-auth";
import { readImage2AdminOverview } from "@/lib/image2-admin-overview";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return noStore(NextResponse.json(await readImage2AdminOverview()));
  } catch (error) {
    return noStore(
      NextResponse.json(
        { error: toUserFacingError(error instanceof Error ? error.message : error, "运营总览读取失败。") },
        { status: adminAuthStatus(error, 503) }
      )
    );
  }
}
