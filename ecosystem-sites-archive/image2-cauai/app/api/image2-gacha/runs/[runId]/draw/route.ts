import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  image2GenerationAccessPayload,
  image2UsagePayload,
  refundImage2GenerationUsage,
  reserveImage2GenerationUsage,
  type Image2GenerationUsageReservation
} from "@/lib/image2-wallet";
import { generateImage2, sanitizeImage2ProviderMessage } from "@/lib/image2-generation";
import { image2GachaErrorStatus, resolveImage2GachaContext } from "@/lib/image2-gacha-auth";
import { getImage2GachaRun, updateImage2GachaRun, type Image2GachaCard, type Image2GachaRarity } from "@/lib/image2-gacha-store";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ runId: string }> | { runId: string };
};

function numericSeed(card: Image2GachaCard) {
  const value = Number(card.randomParams.variantSeed);
  return Number.isFinite(value) ? value : card.slot * 997;
}

function gradeCard(card: Image2GachaCard, sourceScore: number, styleStrength: number, realismStrength: number): Image2GachaRarity {
  const randomPart = numericSeed(card) % 31;
  const score = sourceScore * 0.62 + randomPart + styleStrength * 0.12 + realismStrength * 0.08;
  if (score >= 88) return "SSR";
  if (score >= 72) return "SR";
  if (score >= 48) return "R";
  return "废卡";
}

function cardErrorMessage(error: unknown) {
  const accessPayload = image2GenerationAccessPayload(error);
  if (accessPayload?.error) return String(accessPayload.error);
  return toUserFacingError(sanitizeImage2ProviderMessage(error), "抽卡作图失败。");
}

function toStoredImage(image: { name: string; path: string }) {
  return {
    name: image.name,
    path: image.path,
    url: `/api/image2/output/${image.path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/")}`
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const storeContext = await resolveImage2GachaContext(request);
    if (!storeContext.userId) {
      return NextResponse.json({ error: "请先登录 ANS 账号后再使用同款抽卡（2 积分/张）。" }, { status: 401 });
    }
    const { runId } = await context.params;
    const run = await getImage2GachaRun(runId, storeContext);
    if (!run) {
      return NextResponse.json({ error: "抽卡任务不存在。" }, { status: 404 });
    }

    const jobId = run.jobId || `job-${randomUUID().slice(0, 12)}`;
    await updateImage2GachaRun(
      runId,
      (current) => ({
        ...current,
        jobId,
        status: "drawing",
        cards: current.cards.map((card) => (card.status === "draft" ? { ...card, status: "drawing" } : card))
      }),
      storeContext
    );

    let lastUsagePayload: Record<string, unknown> = {};
    const cardsToDraw = run.cards.filter((card) => card.slot <= run.drawCount && card.status !== "done");

    for (const card of cardsToDraw) {
      let reservation: Image2GenerationUsageReservation | null = null;

      try {
        await updateImage2GachaRun(
          runId,
          (current) => ({
            ...current,
            cards: current.cards.map((item) => (item.cardId === card.cardId ? { ...item, status: "drawing", error: undefined } : item))
          }),
          storeContext
        );

        reservation = await reserveImage2GenerationUsage(request);
        const result = await generateImage2({
          images: [],
          n: 1,
          prompt: card.prompt,
          size: run.params.size || "1024x1536"
        });

        lastUsagePayload = image2UsagePayload(reservation);
        const image = toStoredImage(result.images[0]);
        const rarity = gradeCard(card, run.sourceCase.valueScore ?? 78, run.params.styleStrength ?? 74, run.params.realismStrength ?? 78);
        await updateImage2GachaRun(
          runId,
          (current) => ({
            ...current,
            cards: current.cards.map((item) =>
              item.cardId === card.cardId
                ? {
                    ...item,
                    image,
                    rarity,
                    status: "done"
                  }
                : item
            )
          }),
          storeContext
        );
      } catch (error) {
        if (reservation) {
          await refundImage2GenerationUsage(reservation);
        }
        const message = cardErrorMessage(error);
        await updateImage2GachaRun(
          runId,
          (current) => ({
            ...current,
            cards: current.cards.map((item) =>
              item.cardId === card.cardId
                ? {
                    ...item,
                    error: message,
                    rarity: "废卡",
                    status: "failed"
                  }
                : item
            )
          }),
          storeContext
        );

        if (image2GenerationAccessPayload(error)) break;
      }
    }

    const finalRun = await updateImage2GachaRun(
      runId,
      (current) => {
        const activeCards = current.cards.filter((card) => card.slot <= current.drawCount);
        const doneCount = activeCards.filter((card) => card.status === "done").length;
        const failedCount = activeCards.filter((card) => card.status === "failed").length;
        const status = doneCount === current.drawCount ? "done" : doneCount > 0 ? "partial" : failedCount > 0 ? "failed" : "drawing";
        return {
          ...current,
          status
        };
      },
      storeContext
    );

    return NextResponse.json({
      jobId,
      run: finalRun,
      ...lastUsagePayload
    });
  } catch (error) {
    const message = toUserFacingError(error instanceof Error ? error.message : error, "抽卡生成失败。");
    return NextResponse.json({ error: message }, { status: image2GachaErrorStatus(message) });
  }
}
