import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUser, readImage2Membership } from "@/lib/image2-membership";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getSupabaseUser(request, "请先登录账号后再查看图片额度。");
    return NextResponse.json(await readImage2Membership(user));
  } catch (error) {
    const message = toUserFacingError(error instanceof Error ? error.message : error, "图片额度状态读取失败。");
    const status = message.includes("登录") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
