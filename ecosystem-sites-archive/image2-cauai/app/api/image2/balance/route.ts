import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUser } from "@/lib/image2-membership";
import { readImage2Wallet } from "@/lib/image2-wallet";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getSupabaseUser(request, "请先登录账号后再查看图片余额。");
    return NextResponse.json(await readImage2Wallet(user));
  } catch (error) {
    const message = toUserFacingError(error instanceof Error ? error.message : error, "图片余额读取失败。");
    const status = message.includes("登录") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
