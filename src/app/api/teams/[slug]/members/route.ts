import { auth } from "@/lib/auth";
import { inviteMember } from "@/server/teams/service";
import { isCrossSite, readJson, teamFailure, teamJson } from "../../response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/teams/[slug]/members —— 邀请成员（队长/管理员）
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return teamJson({ error: "unauthorized", message: "请先登录" }, 401);
  if (isCrossSite(request)) return teamJson({ error: "invalid_origin", message: "请求来源无效" }, 403);
  const { slug } = await context.params;
  try {
    const result = await inviteMember(session.user.id, slug, await readJson(request));
    return teamJson(result, 201);
  } catch (error) {
    return teamFailure(error);
  }
}
