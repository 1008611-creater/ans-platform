import { auth } from "@/lib/auth";
import { createTeam, listMyTeams } from "@/server/teams/service";
import { isCrossSite, readJson, teamFailure, teamJson } from "./response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/teams —— 我的团队列表与待处理邀请（仅本人数据）
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return teamJson({ error: "unauthorized", message: "请先登录" }, 401);
  try {
    return teamJson(await listMyTeams(session.user.id));
  } catch (error) {
    return teamFailure(error);
  }
}

// POST /api/teams —— 创建团队，创建者自动成为队长
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return teamJson({ error: "unauthorized", message: "请先登录" }, 401);
  if (isCrossSite(request)) return teamJson({ error: "invalid_origin", message: "请求来源无效" }, 403);
  try {
    const team = await createTeam(session.user.id, await readJson(request));
    return teamJson({ team }, 201);
  } catch (error) {
    return teamFailure(error);
  }
}
