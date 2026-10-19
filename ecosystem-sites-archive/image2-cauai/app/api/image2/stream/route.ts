import { NextRequest } from "next/server";
import {
  image2GenerationAccessPayload,
  image2UsagePayload,
  refundImage2GenerationUsage,
  reserveImage2GenerationUsage,
  type Image2GenerationUsageReservation
} from "@/lib/image2-wallet";
import { generateImage2, sanitizeImage2ProviderMessage } from "@/lib/image2-generation";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";
export const maxDuration = 120;

const encoder = new TextEncoder();

function eventChunk(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const startedAt = Date.now();
  const count = Math.min(Math.max(Number(body?.n) || 1, 1), 4);
  const reservations: Image2GenerationUsageReservation[] = [];

  try {
    for (let i = 0; i < count; i++) {
      reservations.push(await reserveImage2GenerationUsage(request));
    }
  } catch (error) {
    for (const r of reservations) {
      await refundImage2GenerationUsage(r);
    }
    const payload = image2GenerationAccessPayload(error) ?? { error: "额度检查失败，请稍后重试。" };

    return new Response(eventChunk("quota", payload), {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Accel-Buffering": "no"
      }
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(eventChunk(event, data));
      };

      send("status", {
        elapsedSeconds: 0,
        stage: "任务已提交",
        detail: "正在进入 Image2 生成队列，请保持页面打开。"
      });

      const timer = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
        const stage =
          elapsedSeconds < 25
            ? "正在构图"
            : elapsedSeconds < 55
              ? "细节生成中"
              : elapsedSeconds < 95
                ? "等待图片返回"
                : "仍在排队";
        const detail =
          elapsedSeconds < 95
            ? "页面会自动更新结果，不需要重复点击生成。"
            : "这次比常规时间更久，可能是复杂提示词或服务高峰。";

        send("status", {
          elapsedSeconds,
          stage,
          detail
        });
      }, 5000);

      generateImage2({ ...body, n: count })
        .then((result) => {
          clearInterval(timer);
          send("done", {
            ...result,
            ...(reservations.length ? image2UsagePayload(reservations[reservations.length - 1]) : {})
          });
          controller.close();
        })
        .catch(async (error) => {
          clearInterval(timer);
          let refund = {};
          for (const r of reservations) {
            refund = await refundImage2GenerationUsage(r);
          }
          send("error", {
            error: toUserFacingError(sanitizeImage2ProviderMessage(error), "作图失败。"),
            ...refund
          });
          controller.close();
        });
    }
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no"
    }
  });
}
