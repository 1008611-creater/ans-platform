import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/teams —— 团队与配额总览（管理员）
export async function GET(request: Request) {
  const context = await requireAdminPermission("USERS_VIEW");
  if (!context) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number(params.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") || "30")));
  const q = params.get("q")?.trim() || "";

  const where = q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { slug: { contains: q } }] } : {};

  const [teams, total] = await Promise.all([
    db.team.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        owner: { select: { id: true, username: true, email: true } },
        _count: { select: { members: true, runs: true } },
      },
    }),
    db.team.count({ where }),
  ]);

  // 团队发放额度来自 QuotaLedger(refType=team)，与成员分配(team_member)分开统计。
  const granted = await db.quotaLedger.groupBy({
    by: ["refId"],
    where: { refType: "team", refId: { in: teams.map((t) => t.id) } },
    _sum: { amount: true },
  });
  const grantedMap = new Map(granted.map((g) => [g.refId ?? "", g._sum.amount ?? 0]));

  const allocated = await db.teamMember.groupBy({
    by: ["teamId"],
    where: { teamId: { in: teams.map((t) => t.id) }, status: "ACTIVE" },
    _sum: { quotaAllowance: true, quotaUsed: true },
  });
  const allocatedMap = new Map(allocated.map((a) => [a.teamId, a._sum]));

  return NextResponse.json({
    teams: teams.map((team) => {
      const totals = allocatedMap.get(team.id);
      const grant = grantedMap.get(team.id) ?? 0;
      const allocatedPoints = totals?.quotaAllowance ?? 0;
      return {
        ...team,
        quota: {
          granted: grant,
          allocated: allocatedPoints,
          available: Math.max(0, grant - allocatedPoints),
          used: totals?.quotaUsed ?? 0,
        },
      };
    }),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
