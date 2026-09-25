import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { TeamError, grantTeamQuota } from "@/server/teams/service";

export const runtime = "nodejs";

// POST /api/admin/teams/[id]/quota —— 给团队发放额度（管理员）
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPermission("USERS_MANAGE");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  try {
    const body = await request.json().catch(() => null);
    const result = await grantTeamQuota(admin.userId, id, (body as { amount?: unknown })?.amount, (body as { note?: unknown })?.note);
    return NextResponse.json({ granted: result.ledger.amount, teamId: result.team.id });
  } catch (error) {
    if (error instanceof TeamError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    }
    console.error("团队额度发放失败", error);
    return NextResponse.json({ error: "server_error", message: "额度发放失败" }, { status: 500 });
  }
}
