import { NextRequest, NextResponse } from "next/server";
import {
  image2GenerationAccessPayload,
  image2UsagePayload,
  refundImage2GenerationUsage,
  reserveImage2GenerationUsage,
  type Image2GenerationUsageReservation
} from "@/lib/image2-wallet";
import { generateImage2, getImage2PublicConfig, sanitizeImage2ProviderMessage } from "@/lib/image2-generation";
import { requirePictureUser } from "@/lib/picture-auth";
import { savePictureGenerationHistory } from "@/lib/picture-history";
import { toUserFacingError } from "@/lib/user-facing-error";

function publicPicturePayload(result: Awaited<ReturnType<typeof generateImage2>>, requestedMode?: unknown) {
  const mode = requestedMode === "smart-edit" ? "smart-edit" : result.mode;
  return {
    provider: "picture",
    channel: result.channel === "runninghub" ? "stable" : "fast",
    mode,
    ratio: result.ratio,
    resolution: result.resolution,
    seed: result.seed,
    elapsedSeconds: result.elapsedSeconds,
    images: result.images.map((image, index) => {
      const extension = image.name.split(".").pop() || "png";
      return {
        dataUrl: image.dataUrl,
        path: image.path,
        name: `picture-${String(index + 1).padStart(2, "0")}.${extension}`
      };
    })
  };
}

export async function GET() {
  const config = await getImage2PublicConfig();
  return NextResponse.json({
    provider: "picture",
    configured: config.configured,
    channels: {
      auto: config.channels.auto,
      fast: config.channels.ikun,
      stable: config.channels.runninghub
    },
    authRequired: true,
    historyEnabled: true,
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

    const user = await requirePictureUser(request);
    const count = Math.min(Math.max(Number(body?.n) || 1, 1), 4);
    for (let i = 0; i < count; i++) {
      reservations.push(await reserveImage2GenerationUsage(request));
    }
    const result = await generateImage2({ ...body, n: count });
    const payload = publicPicturePayload(result, body?.mode);
    const historyItem = await savePictureGenerationHistory({
      prompt,
      result: payload,
      user
    });
    return NextResponse.json({ ...payload, historyItem, ...(reservations.length ? image2UsagePayload(reservations[reservations.length - 1]) : {}) });
  } catch (error) {
    for (const r of reservations) {
      await refundImage2GenerationUsage(r);
    }
    const accessPayload = image2GenerationAccessPayload(error);
    if (accessPayload) {
      return NextResponse.json(accessPayload, { status: 402 });
    }
    const rawMessage = error instanceof Error ? error.message : String(error);
    const status = /登录|账号|认证|会话|token/i.test(rawMessage) ? 401 : 500;
    return NextResponse.json({ error: toUserFacingError(sanitizeImage2ProviderMessage(error), "作图失败。") }, { status });
  }
}
