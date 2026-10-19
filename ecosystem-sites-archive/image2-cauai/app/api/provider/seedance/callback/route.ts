import { NextRequest, NextResponse } from "next/server";
import { normalizeProviderTask } from "@/lib/provider";
import { mutateStore, refundQuota } from "@/lib/store";
import { nowIso } from "@/lib/time";
import { toUserFacingError } from "@/lib/user-facing-error";
import { hiddenRouteResponse, isLegacySeedanceApiEnabled } from "@/lib/runtime-access";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isLegacySeedanceApiEnabled()) return hiddenRouteResponse();
  const payload = await request.json();
  const providerTaskId = String(payload.id ?? payload.task_id ?? payload.data?.id ?? "");
  const normalized = normalizeProviderTask(payload);

  if (!providerTaskId) {
    return NextResponse.json({ error: "缺少 Seedance 任务 ID。" }, { status: 400 });
  }

  await mutateStore((state) => {
    const generation = state.generations.find((item) => item.providerTaskId === providerTaskId);
    if (!generation) return;

    generation.status = normalized.status;
    generation.videoUrl = normalized.videoUrl ?? generation.videoUrl;
    generation.lastFrameUrl = normalized.lastFrameUrl ?? generation.lastFrameUrl;
    generation.errorMessage = normalized.errorMessage
      ? toUserFacingError(normalized.errorMessage, "Seedance 任务处理失败。")
      : generation.errorMessage;
    generation.progress = normalized.status === "succeeded" || normalized.status === "failed" ? 100 : generation.progress;
    generation.updatedAt = nowIso();

    if (normalized.status === "succeeded") {
      generation.completedAt = generation.updatedAt;
    }

    if (normalized.status === "failed" || normalized.status === "expired") {
      refundQuota(state, generation);
    }
  });

  return NextResponse.json({ ok: true });
}
