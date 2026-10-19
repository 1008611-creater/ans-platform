import { NextRequest, NextResponse } from "next/server";
import { configuredVideoProvider, createVideoProviderTask } from "@/lib/provider";
import {
  consumeQuota,
  dashboardForUser,
  mutateStore,
  randomId,
  refundQuota
} from "@/lib/store";
import { nowIso } from "@/lib/time";
import { DURATION_OPTIONS, RATIO_OPTIONS, VIDEO_MODES, type Generation } from "@/lib/types";
import type { VideoDuration, VideoMode, VideoRatio, VideoResolution } from "@/lib/types";
import { toUserFacingError } from "@/lib/user-facing-error";
import { coverForRatio, titleFromPrompt, validateGenerationInput } from "@/lib/video-rules";
import { hiddenRouteResponse, isLegacySeedanceApiEnabled } from "@/lib/runtime-access";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isLegacySeedanceApiEnabled()) return hiddenRouteResponse();
  const userId = request.nextUrl.searchParams.get("userId") ?? request.headers.get("x-seedance-user") ?? "";
  const dashboard = await mutateStore((state) => dashboardForUser(state, userId));
  return NextResponse.json({
    ...dashboard,
    ratios: RATIO_OPTIONS,
    durations: DURATION_OPTIONS,
    modes: VIDEO_MODES
  });
}

export async function POST(request: NextRequest) {
  if (!isLegacySeedanceApiEnabled()) return hiddenRouteResponse();
  const body = await request.json();
  const userId = String(body.userId ?? "");
  let created: Generation | undefined;

  try {
    const activeProvider = configuredVideoProvider();
    const input = validateGenerationInput({
      userId,
      prompt: String(body.prompt ?? ""),
      mode: body.mode as VideoMode,
      ratio: body.ratio as VideoRatio,
      durationSeconds: Number(body.durationSeconds) as VideoDuration,
      resolution: body.resolution as VideoResolution,
      style: typeof body.style === "string" ? body.style : undefined,
      seed: Number.isFinite(Number(body.seed)) ? Number(body.seed) : undefined,
      generateAudio: Boolean(body.generateAudio),
      privacy: body.privacy === "link" ? "link" : "private",
      assets: Array.isArray(body.assets) ? body.assets : []
    });

    await mutateStore((state) => {
      consumeQuota(state, userId);
      const now = nowIso();
      created = {
        id: randomId("gen"),
        userId,
        title: titleFromPrompt(input.prompt),
        prompt: input.prompt,
        model: typeof body.model === "string" ? body.model : "sd2.5",
        mode: input.mode,
        ratio: input.ratio,
        durationSeconds: input.durationSeconds,
        resolution: "720p",
        style: input.style,
        seed: input.seed,
        generateAudio: input.generateAudio,
        privacy: input.privacy,
        assets: input.assets,
        status: "queued",
        progress: 2,
        provider: activeProvider,
        providerTaskId: activeProvider === "manual" ? randomId("manual") : undefined,
        coverUrl: input.assets[0]?.dataUrl ?? input.assets[0]?.url ?? coverForRatio(input.ratio, state.generations.length),
        createdAt: now,
        updatedAt: now
      };
      state.generations.unshift(created);
    });

    if (!created) throw new Error("任务创建失败。");

    if (created.provider !== "manual") {
      try {
        const providerTask = await createVideoProviderTask(created);
        await mutateStore((state) => {
          const generation = state.generations.find((item) => item.id === created?.id);
          if (!generation) return;
          const status = providerTask.status ?? "queued";
          generation.providerTaskId = providerTask.providerTaskId;
          generation.status = status;
          generation.progress = status === "succeeded" || status === "failed" || status === "expired" ? 100 : 5;
          generation.videoUrl = providerTask.videoUrl ?? generation.videoUrl;
          generation.coverUrl = providerTask.coverUrl ?? generation.coverUrl;
          generation.lastFrameUrl = providerTask.lastFrameUrl ?? generation.lastFrameUrl;
          generation.errorMessage = providerTask.errorMessage
            ? toUserFacingError(providerTask.errorMessage, "实时生成失败。")
            : generation.errorMessage;
          generation.updatedAt = nowIso();

          if (status === "succeeded") {
            generation.completedAt = generation.updatedAt;
          }

          if (status === "failed" || status === "expired") {
            refundQuota(state, generation);
          }
        });
      } catch (error) {
        await mutateStore((state) => {
          const generation = state.generations.find((item) => item.id === created?.id);
          if (!generation) return;
          generation.status = "failed";
          generation.progress = 100;
          generation.errorMessage = toUserFacingError(
            error instanceof Error ? error.message : error,
            generation.provider === "doubao2api" ? "doubao2api 生成失败。" : "Seedance 创建任务失败。"
          );
          generation.updatedAt = nowIso();
          refundQuota(state, generation);
        });
      }
    }

    const dashboard = await mutateStore((state) => dashboardForUser(state, userId));
    return NextResponse.json({
      ...dashboard,
      ratios: RATIO_OPTIONS,
      durations: DURATION_OPTIONS,
      modes: VIDEO_MODES
    });
  } catch (error) {
    return NextResponse.json({ error: toUserFacingError(error instanceof Error ? error.message : error, "提交失败。") }, { status: 400 });
  }
}
