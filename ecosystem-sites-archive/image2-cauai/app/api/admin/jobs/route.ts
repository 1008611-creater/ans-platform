import { NextRequest, NextResponse } from "next/server";
import { adminAuthStatus, requireAdmin } from "@/lib/admin-auth";
import { requireAdminCsrf } from "@/lib/admin-session";
import { adminQueue, mutateStore, updateManualGeneration } from "@/lib/store";
import type { GenerationStatus } from "@/lib/types";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";
const allowedStatuses = new Set<GenerationStatus>(["queued", "running", "succeeded", "failed", "expired"]);

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const queue = await mutateStore((state) => adminQueue(state));
    return NextResponse.json(queue);
  } catch (error) {
    return NextResponse.json(
      { error: toUserFacingError(error instanceof Error ? error.message : error, "后台访问失败。") },
      { status: adminAuthStatus(error, 400) }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    requireAdminCsrf(request);
    await requireAdmin(request);
    const body = await request.json();
    const jobId = String(body.jobId ?? "");
    const statusText = body.status ? String(body.status) : "";
    if (statusText && !allowedStatuses.has(statusText as GenerationStatus)) {
      throw new Error("任务状态不正确。");
    }
    const status = statusText ? (statusText as GenerationStatus) : undefined;

    const queue = await mutateStore((state) => {
      updateManualGeneration(state, jobId, {
        status,
        progress: Number.isFinite(Number(body.progress)) ? Number(body.progress) : undefined,
        videoUrl: typeof body.videoUrl === "string" ? body.videoUrl : undefined,
        coverUrl: typeof body.coverUrl === "string" ? body.coverUrl : undefined,
        operatorName: typeof body.operatorName === "string" ? body.operatorName : undefined,
        externalAccount: typeof body.externalAccount === "string" ? body.externalAccount : undefined,
        sourceTaskUrl: typeof body.sourceTaskUrl === "string" ? body.sourceTaskUrl : undefined,
        operatorNote: typeof body.operatorNote === "string" ? body.operatorNote : undefined,
        userMessage: typeof body.userMessage === "string" ? body.userMessage : undefined,
        errorMessage: typeof body.errorMessage === "string" ? body.errorMessage : undefined
      });
      return adminQueue(state);
    });

    return NextResponse.json(queue);
  } catch (error) {
    return NextResponse.json(
      { error: toUserFacingError(error instanceof Error ? error.message : error, "任务更新失败。") },
      { status: adminAuthStatus(error, 400) }
    );
  }
}
