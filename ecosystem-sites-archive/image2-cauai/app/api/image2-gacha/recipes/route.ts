import { NextRequest, NextResponse } from "next/server";
import { image2GachaErrorStatus, resolveImage2GachaContext } from "@/lib/image2-gacha-auth";
import { createImage2GachaRecipe, getImage2GachaRun } from "@/lib/image2-gacha-store";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const storeContext = await resolveImage2GachaContext(request, "请先登录账号后再保存抽卡配方。");
    const body = await request.json();
    const runId = typeof body.runId === "string" ? body.runId.trim() : "";
    const cardId = typeof body.cardId === "string" ? body.cardId.trim() : "";
    if (!runId || !cardId) throw new Error("缺少要保存的抽卡结果。");

    const run = await getImage2GachaRun(runId, storeContext);
    const card = run?.cards.find((item) => item.cardId === cardId);
    if (!run || !card) throw new Error("抽卡结果不存在。");
    if (card.status !== "done") throw new Error("只有已完成的卡片才能保存成配方。");

    const recipe = await createImage2GachaRecipe({
      cardId,
      runId,
      sourceCaseKey: run.sourceCase.key,
      title: `${run.sourceCase.caseCode || run.sourceCase.title} · ${card.rarity} 配方`
    }, storeContext);

    return NextResponse.json({ recipe });
  } catch (error) {
    const message = toUserFacingError(error instanceof Error ? error.message : error, "保存配方失败。");
    return NextResponse.json({ error: message }, { status: image2GachaErrorStatus(message) });
  }
}
