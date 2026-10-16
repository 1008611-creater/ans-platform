import { Prisma } from "@prisma/client";
import type { DbTransaction } from "@/lib/db";

type VisualReservationSummary = {
  pendingCount: number;
  reservedPoints: Prisma.Decimal | null;
};

/** Paid visual jobs own their reservations directly, outside Run/API compute.
 * Read the original held cost, never the current price. Uncertain provider
 * submissions stay held; refunded, terminal and uncharged upload rows do not.
 */
export function visualReservationQuery(userId: string) {
  return Prisma.sql`
    SELECT count(*)::int AS "pendingCount", sum("costPoints") AS "reservedPoints"
    FROM (
      SELECT "costPoints" FROM visual_model_jobs
      WHERE "ownerId" = ${userId} AND status IN ('QUEUED', 'RUNNING', 'NEEDS_REVIEW')
        AND refunded = false AND "costPoints" > 0
      UNION ALL
      SELECT "costPoints" FROM visual_four_view_jobs
      WHERE "ownerId" = ${userId} AND status IN ('QUEUED', 'RUNNING', 'NEEDS_REVIEW')
        AND charged = true AND refunded = false AND "costPoints" > 0
    ) AS visual_holds
  `;
}

export async function readVisualReservations(tx: DbTransaction, userId: string) {
  const rows = await tx.$queryRaw<VisualReservationSummary[]>(visualReservationQuery(userId));
  return {
    pendingCount: rows[0]?.pendingCount ?? 0,
    reservedPoints: Number(rows[0]?.reservedPoints ?? 0),
  };
}
