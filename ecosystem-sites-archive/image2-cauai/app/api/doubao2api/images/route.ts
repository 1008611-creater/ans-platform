import { NextRequest, NextResponse } from "next/server";
import { createDoubao2ApiImage, isDoubao2ApiConfigured } from "@/lib/provider";
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
      return NextResponse.json({ error: "请输入图片描述。" }, { status: 400 });
    }

    const payload = await createDoubao2ApiImage({
      prompt,
      ratio: typeof body.ratio === "string" ? body.ratio : undefined,
      size: typeof body.size === "string" ? body.size : undefined,
      refImageDataUrl: typeof body.refImageDataUrl === "string" ? body.refImageDataUrl : undefined,
      refImageName: typeof body.refImageName === "string" ? body.refImageName : undefined,
      refImageMimeType: typeof body.refImageMimeType === "string" ? body.refImageMimeType : undefined
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: toUserFacingError(error instanceof Error ? error.message : error, "图片生成失败。") },
      { status: 502 }
    );
  }
}
