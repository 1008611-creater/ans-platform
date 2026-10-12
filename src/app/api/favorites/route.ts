import { auth } from "@/lib/auth";
import { fail, ok, readJson, respondWithError } from "@/server/http/respond";
import { addFavorite, isFavoriteTargetType, listFavorites, removeFavorite } from "@/server/favorites/service";

export const dynamic = "force-dynamic";

/** GET /api/favorites —— 我的收藏（Prompt / 模板 / 工作流统一）。 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  const expectedAccount = request.headers.get("x-vibehub-account-id");
  if (!expectedAccount || expectedAccount !== session.user.id) return fail("ACCOUNT_CHANGED", "Account changed. Refresh and try again.", { status: 409 });
  try {
    const params = new URL(request.url).searchParams;
    const take = Number(params.get("take") ?? 100) || 100;
    const targetType = params.get("targetType");
    if (targetType !== null && !isFavoriteTargetType(targetType)) return fail("INVALID_TARGET_TYPE", "Invalid favorite type.", { status: 400 });
    return ok({ favorites: await listFavorites(session.user.id, take, targetType ?? undefined, params.get("locale") ?? "zh") });
  } catch (error) {
    return respondWithError(error);
  }
}

/** POST /api/favorites —— { targetType, targetId }，幂等：重复收藏不报错。 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  const expectedAccount = request.headers.get("x-vibehub-account-id");
  if (!expectedAccount || expectedAccount !== session.user.id) return fail("ACCOUNT_CHANGED", "Account changed. Refresh and try again.", { status: 409 });
  try {
    const body = (await readJson(request)) as { targetType?: unknown; targetId?: unknown };
    const result = await addFavorite(session.user.id, body?.targetType, body?.targetId);
    return ok(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    return respondWithError(error);
  }
}

/** DELETE /api/favorites?targetType=&targetId= */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("UNAUTHORIZED", "请先登录。", { status: 401 });
  const expectedAccount = request.headers.get("x-vibehub-account-id");
  if (!expectedAccount || expectedAccount !== session.user.id) return fail("ACCOUNT_CHANGED", "Account changed. Refresh and try again.", { status: 409 });
  try {
    const params = new URL(request.url).searchParams;
    const result = await removeFavorite(
      session.user.id,
      params.get("targetType"),
      params.get("targetId"),
    );
    return ok(result);
  } catch (error) {
    return respondWithError(error);
  }
}
