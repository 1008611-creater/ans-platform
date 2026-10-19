import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "本地独立账号已停用，请使用 ANS (AI Never Stops) 统一账号登录（/api/image2-auth/login）。" },
    { status: 410 }
  );
}
