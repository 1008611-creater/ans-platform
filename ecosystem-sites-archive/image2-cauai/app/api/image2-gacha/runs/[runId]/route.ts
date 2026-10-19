import { NextRequest, NextResponse } from "next/server";
import { image2GachaErrorStatus, resolveImage2GachaContext } from "@/lib/image2-gacha-auth";
import { getImage2GachaRun } from "@/lib/image2-gacha-store";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ runId: string }> | { runId: string };
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const storeContext = await resolveImage2GachaContext(request, "请先登录账号后再读取抽卡记录。");
    const { runId } = await context.params;
    const run = await getImage2GachaRun(runId, storeContext);
    if (!run) {
      return NextResponse.json({ error: "抽卡任务不存在。" }, { status: 404 });
    }
    return NextResponse.json({ run });
  } catch (error) {
    const message = toUserFacingError(error instanceof Error ? error.message : error, "抽卡任务读取失败。");
    return NextResponse.json({ error: message }, { status: image2GachaErrorStatus(message) });
  }
}
