import { NextRequest, NextResponse } from "next/server";
import { image2GachaErrorStatus, resolveImage2GachaContext } from "@/lib/image2-gacha-auth";
import { updateImage2GachaCard, type Image2GachaRarity } from "@/lib/image2-gacha-store";
import { toUserFacingError } from "@/lib/user-facing-error";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ cardId: string }> | { cardId: string };
};

const ratings = new Set<Image2GachaRarity>(["SSR", "SR", "R", "废卡", "待开"]);

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const storeContext = await resolveImage2GachaContext(request, "请先登录账号后再保存抽卡评分。");
    const { cardId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const result = await updateImage2GachaCard(cardId, (card) => ({
      ...card,
      failureReason: typeof body.failureReason === "string" ? body.failureReason.trim() : card.failureReason,
      favorite: typeof body.favorite === "boolean" ? body.favorite : card.favorite,
      rating: ratings.has(body.rating) ? body.rating : card.rating
    }), storeContext);

    if (!result) {
      return NextResponse.json({ error: "卡片不存在。" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = toUserFacingError(error instanceof Error ? error.message : error, "保存卡片状态失败。");
    return NextResponse.json({ error: message }, { status: image2GachaErrorStatus(message) });
  }
}
