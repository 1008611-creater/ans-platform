import { NextRequest, NextResponse } from "next/server";
import { logoutPictureAccount, PictureAuthError } from "@/lib/picture-auth";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

function safeStatus(error: unknown) {
  return error instanceof PictureAuthError ? error.status : 400;
}

export async function POST(request: NextRequest) {
  try {
    await logoutPictureAccount(request);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: toUserFacingError(error instanceof Error ? error.message : error, "退出失败。") },
      { status: safeStatus(error) }
    );
  }
}
