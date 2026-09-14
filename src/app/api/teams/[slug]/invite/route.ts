import { auth } from "@/lib/auth";
import { respondToInvite } from "@/lib/team-service";
import { isCrossSite, readJson, teamFailure, teamJson } from "../../response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/teams/[slug]/invite —— 接受或拒绝邀请（被邀请人本人）
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return teamJson({ error: "unauthorized", message: "请先登录" }, 401);
  if (isCrossSite(request)) return teamJson({ error: "invalid_origin", message: "请求来源无效" }, 403);
  const { slug } = await context.params;
  try {
    const body = await readJson(request);
    const action = (body as { action?: unknown })?.action;
    if (action !== "accept" && action !== "decline") {
      return teamJson({ error: "validation_error", message: "请选择接受或拒绝" }, 400);
    }
    return teamJson(await respondToInvite(session.user.id, slug, action));
  } catch (error) {
    return teamFailure(error);
  }
}
