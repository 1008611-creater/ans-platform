import { Prisma } from "@prisma/client";
import type { DbTransaction } from "@/lib/db";

export type ExamReservation = { id: string; userId: string; points: number; createdAt: string };
type PendingRow = { id: string; userId: string; points: Prisma.Decimal; createdAt: Date; pendingCount: number; reservedPoints: Prisma.Decimal };

/** Derived from the existing authoritative debit, refund and settlement records.
 * Absence of a receipt never means the request was free. This module only reads.
 * Both identities must match so another account's receipt cannot close a hold.
 */
export function examReservationQuery(userId?: string) {
  const scope = userId === undefined ? Prisma.empty : Prisma.sql`AND l."userId" = ${userId}`;
  return Prisma.sql`
    WITH exam_debits AS (
      SELECT min(l.id) AS id, l."userId", l."refId",
             -sum(l.amount) AS authorized_points, min(l."createdAt") AS "createdAt"
      FROM quota_ledgers l
      WHERE l."refType" = 'exam-analysis' AND l.reason = 'RUN_COST'
        AND l.amount < 0 AND l."userId" IS NOT NULL AND l."refId" IS NOT NULL
        ${scope}
      GROUP BY l."userId", l."refId"
    ), exam_pending AS (
      SELECT d.id, d."userId", d."createdAt",
        d.authorized_points - coalesce((
          SELECT sum(r.amount) FROM quota_ledgers r
          WHERE r."userId" = d."userId" AND r."refId" = d."refId"
            AND r."refType" = 'exam-analysis' AND r.reason = 'REFUND' AND r.amount > 0
        ), 0) AS points
      FROM exam_debits d
      WHERE NOT EXISTS (
        SELECT 1 FROM audit_logs a
        WHERE a."actorId" = d."userId" AND a."resourceType" = 'exam-analysis'
          AND a.action = 'EXAM_ANALYSIS_SETTLED'
          AND a.metadata @> jsonb_build_object(
            'refId', d."refId", 'success', true, 'costPoints', d.authorized_points
          )
      )
    )
    SELECT id, "userId", points, "createdAt", count(*) OVER ()::int AS "pendingCount",
           sum(points) OVER () AS "reservedPoints"
    FROM exam_pending WHERE points > 0
    ORDER BY "createdAt" ASC, id ASC LIMIT 50
  `;
}

export async function readExamReservations(tx: DbTransaction, userId?: string) {
  const rows = await tx.$queryRaw<PendingRow[]>(examReservationQuery(userId));
  return {
    pendingCount: rows[0]?.pendingCount ?? 0,
    reservedPoints: Number(rows[0]?.reservedPoints ?? 0),
    items: rows.map(row => ({ id: row.id, userId: row.userId, points: Number(row.points), createdAt: row.createdAt.toISOString() })),
  };
}
