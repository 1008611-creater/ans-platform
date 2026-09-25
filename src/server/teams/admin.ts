import { db } from "@/lib/db";

export async function listTeamsForAdmin(query: string, page: number, limit: number) {
  const where = query
    ? { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { slug: { contains: query } }] }
    : {};

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

  const teamIds = teams.map((team) => team.id);
  const [granted, allocated] = await Promise.all([
    db.quotaLedger.groupBy({
      by: ["refId"],
      where: { refType: "team", refId: { in: teamIds } },
      _sum: { amount: true },
    }),
    db.teamMember.groupBy({
      by: ["teamId"],
      where: { teamId: { in: teamIds }, status: "ACTIVE" },
      _sum: { quotaAllowance: true, quotaUsed: true },
    }),
  ]);
  const grantedMap = new Map(granted.map((item) => [item.refId ?? "", item._sum.amount ?? 0]));
  const allocatedMap = new Map(allocated.map((item) => [item.teamId, item._sum]));

  return {
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
  };
}
