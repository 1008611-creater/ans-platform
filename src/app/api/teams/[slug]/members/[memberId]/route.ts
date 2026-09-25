import { auth } from "@/lib/auth";
import { allocateQuota, removeMember, updateMemberRole } from "@/server/teams/service";
import { isCrossSite, readJson, teamFailure, teamJson } from "../../../response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string; memberId: string }> };

// PATCH /api/teams/[slug]/members/[memberId] —— 调整成员角色（仅队长）
export async function PATCH(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return teamJson({ error: "unauthorized", message: "请先登录" }, 401);
  if (isCrossSite(request)) return teamJson({ error: "invalid_origin", message: "请求来源无效" }, 403);
  const { slug, memberId } = await context.params;
  try {
    const body = await readJson(request);
    const role = (body as { role?: unknown })?.role;
    return teamJson(await updateMemberRole(session.user.id, slug, memberId, role as never));
  } catch (error) {
    return teamFailure(error);
  }
}

// PUT /api/teams/[slug]/members/[memberId] —— 分配团队额度（队长/管理员）
export async function PUT(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return teamJson({ error: "unauthorized", message: "请先登录" }, 401);
  if (isCrossSite(request)) return teamJson({ error: "invalid_origin", message: "请求来源无效" }, 403);
  const { slug, memberId } = await context.params;
  try {
    const body = await readJson(request);
    const allowance = (body as { quotaAllowance?: unknown })?.quotaAllowance;
    return teamJson(await allocateQuota(session.user.id, slug, memberId, allowance));
  } catch (error) {
    return teamFailure(error);
  }
}

// DELETE /api/teams/[slug]/members/[memberId] —— 移除成员（队长/管理员）
export async function DELETE(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return teamJson({ error: "unauthorized", message: "请先登录" }, 401);
  if (isCrossSite(request)) return teamJson({ error: "invalid_origin", message: "请求来源无效" }, 403);
  const { slug, memberId } = await context.params;
  try {
    return teamJson(await removeMember(session.user.id, slug, memberId));
  } catch (error) {
    return teamFailure(error);
  }
}
