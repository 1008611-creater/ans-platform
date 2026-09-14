import { auth } from "@/lib/auth";
import { leaveTeam } from "@/lib/team-service";
import { isCrossSite, teamFailure, teamJson } from "../../response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/teams/[slug]/leave —— 主动退出团队（队长需先转让）
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return teamJson({ error: "unauthorized", message: "请先登录" }, 401);
  if (isCrossSite(request)) return teamJson({ error: "invalid_origin", message: "请求来源无效" }, 403);
  const { slug } = await context.params;
  try {
    return teamJson(await leaveTeam(session.user.id, slug));
  } catch (error) {
    return teamFailure(error);
  }
}
