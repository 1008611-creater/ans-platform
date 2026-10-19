import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUser, redeemImage2License } from "@/lib/image2-membership";
import { Image2LegacyLicenseCodeError, redeemImage2BalanceCode } from "@/lib/image2-wallet";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";

  try {
    if (code.length < 4) throw new Error("请输入有效卡密。");

    const user = await getSupabaseUser(request, "请先登录账号后再兑换卡密。");
    try {
      return NextResponse.json(await redeemImage2BalanceCode(request, user, code));
    } catch (error) {
      if (error instanceof Image2LegacyLicenseCodeError) {
        return NextResponse.json(await redeemImage2License(request, user, code));
      }
      throw error;
    }
  } catch (error) {
    const message = toUserFacingError(error instanceof Error ? error.message : error, "卡密兑换失败。");
    const status = message.includes("登录") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
