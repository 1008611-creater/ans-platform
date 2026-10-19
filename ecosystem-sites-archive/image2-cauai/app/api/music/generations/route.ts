import { NextRequest, NextResponse } from "next/server";
import { createDoubao2ApiMusic, isDoubao2ApiConfigured } from "@/lib/provider";
import { toUserFacingError } from "@/lib/user-facing-error";
import { hiddenRouteResponse, isLegacySeedanceApiEnabled } from "@/lib/runtime-access";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isLegacySeedanceApiEnabled()) return hiddenRouteResponse();
  try {
    if (!isDoubao2ApiConfigured()) {
      return NextResponse.json({ error: "未配置 doubao2api 本地通道。" }, { status: 503 });
    }

    const body = await request.json();
    const prompt = String(body.prompt ?? "").trim();

    if (!prompt) {
      return NextResponse.json({ error: "请输入音乐描述。" }, { status: 400 });
    }

    const payload = await createDoubao2ApiMusic({
      prompt,
      genre: typeof body.genre === "string" ? body.genre : undefined,
      lyric: typeof body.lyric === "string" ? body.lyric : undefined,
      mood: typeof body.mood === "string" ? body.mood : undefined,
      gender: typeof body.gender === "string" ? body.gender : undefined,
      theme: typeof body.theme === "string" ? body.theme : undefined,
      generationType: typeof body.generationType === "string" ? body.generationType : undefined
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: toUserFacingError(error instanceof Error ? error.message : error, "音乐生成失败。") },
      { status: 502 }
    );
  }
}
