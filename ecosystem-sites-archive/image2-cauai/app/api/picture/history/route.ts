import { NextRequest, NextResponse } from "next/server";
import { requirePictureUser } from "@/lib/picture-auth";
import { listPictureGenerationHistory } from "@/lib/picture-history";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await requirePictureUser(request);
    const items = await listPictureGenerationHistory(user);
    return NextResponse.json({ items });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const status = /登录|账号|认证|会话|token/i.test(rawMessage) ? 401 : 500;
    return NextResponse.json(
      { error: toUserFacingError(error instanceof Error ? error.message : error, "生成历史读取失败。") },
      { status }
    );
  }
}
