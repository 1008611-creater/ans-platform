import { NextRequest, NextResponse } from "next/server";
import {
  image2GenerationAccessPayload,
  image2UsagePayload,
  refundImage2GenerationUsage,
  reserveImage2GenerationUsage,
  type Image2GenerationUsageReservation
} from "@/lib/image2-wallet";
import { generateImage2, getImage2PublicConfig, sanitizeImage2ProviderMessage } from "@/lib/image2-generation";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  const config = await getImage2PublicConfig();
  return NextResponse.json({
    provider: "image2",
    configured: config.configured,
    channels: config.channels,
    ratios: config.ratios,
    resolutions: config.resolutions,
    sizes: config.sizes
  });
}

export async function POST(request: NextRequest) {
  const reservations: Image2GenerationUsageReservation[] = [];

  try {
    const body = await request.json();
    const prompt = String(body?.prompt ?? "").trim();
    if (prompt.length < 12) {
      return NextResponse.json({ error: "提示词太短，至少写清主体、场景和画面要求。" }, { status: 400 });
    }

    const count = Math.min(Math.max(Number(body?.n) || 1, 1), 4);
    for (let i = 0; i < count; i++) {
      reservations.push(await reserveImage2GenerationUsage(request));
    }
    const result = await generateImage2({ ...body, n: count });
    return NextResponse.json({
      ...result,
      ...(reservations.length ? image2UsagePayload(reservations[reservations.length - 1]) : {})
    });
  } catch (error) {
    for (const r of reservations) {
      await refundImage2GenerationUsage(r);
    }
    const accessPayload = image2GenerationAccessPayload(error);
    if (accessPayload) {
      return NextResponse.json(accessPayload, { status: 402 });
    }

    return NextResponse.json({ error: toUserFacingError(sanitizeImage2ProviderMessage(error), "作图失败。") }, { status: 500 });
  }
}
