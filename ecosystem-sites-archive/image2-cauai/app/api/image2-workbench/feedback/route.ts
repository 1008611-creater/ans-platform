import { NextRequest, NextResponse } from "next/server";
import { image2WorkbenchAccessResponse, requireImage2WorkbenchTeamMember } from "@/lib/image2-workbench-access";
import {
  getWorkbenchFeedbackStats,
  readWorkbenchFeedback,
  saveWorkbenchFeedback,
  type WorkbenchFeedbackRating,
  type WorkbenchFeedbackStage
} from "@/lib/image2-workbench-data";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

const allowedStages = new Set<WorkbenchFeedbackStage>(["outfit", "first-frame", "manual"]);
const allowedRatings = new Set<WorkbenchFeedbackRating>(["usable", "needs-fix", "reject"]);

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").slice(0, 12);
}

export async function GET(request: NextRequest) {
  try {
    await requireImage2WorkbenchTeamMember(request);
    const feedback = await readWorkbenchFeedback();
    return NextResponse.json({ feedback, feedbackStats: getWorkbenchFeedbackStats(feedback) });
  } catch (error) {
    const accessResponse = await image2WorkbenchAccessResponse(error);
    if (accessResponse) return accessResponse;
    return NextResponse.json(
      { error: toUserFacingError(error instanceof Error ? error.message : error, "反馈读取失败。") },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireImage2WorkbenchTeamMember(request);
    const body = (await request.json()) as Record<string, unknown>;
    const assetId = String(body.assetId ?? "").trim();
    const stage = String(body.stage ?? "manual") as WorkbenchFeedbackStage;
    const rating = String(body.rating ?? "") as WorkbenchFeedbackRating;

    if (!assetId) {
      return NextResponse.json({ error: "缺少反馈关联的图片 ID。" }, { status: 400 });
    }
    if (!allowedStages.has(stage)) {
      return NextResponse.json({ error: "反馈阶段不正确。" }, { status: 400 });
    }
    if (!allowedRatings.has(rating)) {
      return NextResponse.json({ error: "请选择可用、待修或废图。" }, { status: 400 });
    }

    const feedback = await saveWorkbenchFeedback({
      assetId,
      stage,
      rating,
      reasons: stringList(body.reasons),
      note: typeof body.note === "string" ? body.note : "",
      prompt: typeof body.prompt === "string" ? body.prompt : "",
      referenceIds: stringList(body.referenceIds)
    });
    const allFeedback = await readWorkbenchFeedback();
    return NextResponse.json({ feedback, feedbackStats: getWorkbenchFeedbackStats(allFeedback) }, { status: 201 });
  } catch (error) {
    const accessResponse = await image2WorkbenchAccessResponse(error);
    if (accessResponse) return accessResponse;
    return NextResponse.json(
      { error: toUserFacingError(error instanceof Error ? error.message : error, "反馈保存失败。") },
      { status: 500 }
    );
  }
}
