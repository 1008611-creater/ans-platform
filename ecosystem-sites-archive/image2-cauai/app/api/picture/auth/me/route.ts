import { NextRequest, NextResponse } from "next/server";
import { PictureAuthError, readPictureSession } from "@/lib/picture-auth";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

function safeStatus(error: unknown) {
  return error instanceof PictureAuthError ? error.status : 401;
}

export async function GET(request: NextRequest) {
  try {
    const session = await readPictureSession(request);
    return NextResponse.json({
      createdAt: session.createdAt,
      lastLoginAt: session.lastLoginAt,
      loginCount: session.loginCount,
      user: session.user
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const status = /登录|账号|认证|会话|token/i.test(rawMessage) ? 401 : 500;
    return NextResponse.json(
      { error: toUserFacingError(error instanceof Error ? error.message : error, "登录状态已失效。") },
      { status }
    );
  }
}
