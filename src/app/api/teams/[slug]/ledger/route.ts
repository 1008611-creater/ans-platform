import { auth } from "@/lib/auth";
import { listTeamLedger } from "@/lib/team-service";
import { teamFailure, teamJson } from "../../response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/teams/[slug]/ledger —— 团队额度流水（仅成员）
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return teamJson({ error: "unauthorized", message: "请先登录" }, 401);
  const { slug } = await context.params;
  const take = Math.min(100, Math.max(1, Number(new URL(request.url).searchParams.get("take")) || 50));
  try {
    return teamJson(await listTeamLedger(slug, session.user.id, take));
  } catch (error) {
    return teamFailure(error);
  }
}
