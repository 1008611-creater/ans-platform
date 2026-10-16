import type { DbTransaction } from "@/lib/db";
/** Paid holds only. JSON key absence uses PostgreSQL ? rather than nullable
 * JSON-path NOT equality, which would also discard historical paid requests. */
export async function readPaidApiReservations(tx: DbTransaction, userId: string) {
  const [row] = await tx.$queryRaw<Array<{ amount: string | number; count: bigint }>>`SELECT
    COALESCE(SUM("authorizedPoints"),0)::text AS amount, COUNT(*)::bigint AS count
    FROM api_compute_requests WHERE "userId"=${userId}
    AND state IN ('AUTHORIZED','RUNNING','UNCERTAIN') AND "authorizedPoints">0
    AND NOT (price ? 'benefitFunding')`;
  return { _sum: { authorizedPoints: Number(row?.amount ?? 0) }, _count: { _all: Number(row?.count ?? 0) } };
}
