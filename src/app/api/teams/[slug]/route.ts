import { auth } from "@/lib/auth";
import { deleteTeam, getTeamDetail } from "@/lib/team-service";
import { isCrossSite, readJson, teamFailure, teamJson } from "../response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/teams/[slug] —— 团队详情：公开信息对所有人可见，名单/额度/运行记录仅成员可见
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  const { slug } = await context.params;
  try {
    return teamJson(await getTeamDetail(slug, session?.user?.id ?? null));
  } catch (error) {
    return teamFailure(error);
  }
}

// DELETE /api/teams/[slug] —— 解散团队（仅队长，需回填完整团队名确认）
export async function DELETE(request: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return teamJson({ error: "unauthorized", message: "请先登录" }, 401);
  if (isCrossSite(request)) return teamJson({ error: "invalid_origin", message: "请求来源无效" }, 403);
  const { slug } = await context.params;
  try {
    const body = (await readJson(request)) as { confirmName?: unknown } | null;
    return teamJson(await deleteTeam(session.user.id, slug, body?.confirmName));
  } catch (error) {
    return teamFailure(error);
  }
}
