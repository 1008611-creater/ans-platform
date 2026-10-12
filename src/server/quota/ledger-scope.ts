import type { Prisma } from "@prisma/client";
import type { DbTransaction } from "@/lib/db";

/** Team allocations affect teamMember.quotaAllowance, never users.quotaPoints.
 * Keep null legacy references: SQL NOT IN alone would silently discard them.
 * AND leaves callers free to add their own stable-pagination OR conditions. */
export function personalQuotaLedgerWhere(): Prisma.QuotaLedgerWhereInput {
  return { AND: [
    { reason: { not: "TEAM_GRANT" } },
    { OR: [{ refType: null }, { refType: { notIn: ["team", "team_member"] } }] },
  ] };
}

/** Read-only diagnosis. A discrepancy never authorizes balance repair. */
export async function countPersonalQuotaMismatches(tx: DbTransaction): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ count: number }>>`
    SELECT count(*)::int AS count FROM (
      SELECT u.id FROM users u
      LEFT JOIN quota_ledgers l ON l."userId"=u.id
        AND l.reason <> 'TEAM_GRANT'
        AND (l."refType" IS NULL OR l."refType" NOT IN ('team', 'team_member'))
      GROUP BY u.id,u."quotaPoints"
      HAVING u."quotaPoints"<>coalesce(sum(l.amount),0)
    ) differences`;
  return rows[0]?.count ?? 0;
}
