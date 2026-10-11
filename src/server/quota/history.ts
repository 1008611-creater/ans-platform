import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { QuotaError } from "./service";
import { ldxpRechargeEnabled } from "@/server/integrations/ldxp-recharge";

const querySchema = z.object({
  cursor: z.string().min(8).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/).optional(),
}).strict();
const limit = 30;

/** One authoritative balance and ledger, including workflow and Codex entries.
 * Never expose admin notes, upstream request ids or provider credentials. */
export async function readQuotaHistory(userId: string, raw: unknown = {}) {
  const query = querySchema.safeParse(raw);
  if (!query.success) throw new QuotaError("INVALID_QUOTA_CURSOR", "ACCOUNT_UNAVAILABLE", 400);
  return db.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const account = await tx.user.findUnique({ where: { id: userId }, select: { quotaPoints: true, deletedAt: true } });
    if (!account || account.deletedAt) throw new QuotaError("ACCOUNT_UNAVAILABLE", "ACCOUNT_UNAVAILABLE", 404);
    const anchor = query.data.cursor ? await tx.quotaLedger.findFirst({
      where: { id: query.data.cursor, userId }, select: { id: true, createdAt: true },
    }) : null;
    if (query.data.cursor && !anchor) throw new QuotaError("INVALID_QUOTA_CURSOR", "ACCOUNT_UNAVAILABLE", 400);
    const rows = await tx.quotaLedger.findMany({
      where: { userId, ...(anchor ? { OR: [
        { createdAt: { lt: anchor.createdAt } },
        { createdAt: anchor.createdAt, id: { lt: anchor.id } },
      ] } : {}) },
      select: { id: true, amount: true, balanceAfter: true, reason: true, refType: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1,
    });
    const [workflowPending, apiPending, marketPending, templatePending, legacyWorkflowPending, mediaPending] = await Promise.all([
      tx.computeTask.aggregate({ where: { userId, state: { in: ["AUTHORIZED", "RUNNING", "UNCERTAIN"] } }, _sum: { authorizedPoints: true }, _count: { _all: true } }),
      tx.apiComputeRequest.aggregate({ where: { userId, state: { in: ["AUTHORIZED", "RUNNING", "UNCERTAIN"] } }, _sum: { authorizedPoints: true }, _count: { _all: true } }),
      tx.marketPointsEscrow.aggregate({ where: { state: "HELD", order: { buyerId: userId } }, _sum: { amount: true }, _count: { _all: true } }),
      tx.run.aggregate({ where: { userId, status: { in: ["QUEUED", "RUNNING"] }, costPoints: { gt: 0 } }, _sum: { costPoints: true }, _count: { _all: true } }),
      tx.workflowRun.aggregate({ where: { userId, status: { in: ["QUEUED", "RUNNING"] }, costPoints: { gt: 0 } }, _sum: { costPoints: true }, _count: { _all: true } }),
      tx.mediaGeneration?.aggregate({ where: { userId, status: { in: ["RESERVED", "SUBMITTING", "UNCERTAIN"] }, pointsCost: { gt: 0 } }, _sum: { pointsCost: true }, _count: { _all: true } }) ?? Promise.resolve({ _sum: { pointsCost: null }, _count: { _all: 0 } }),
    ]);
    const page = rows.slice(0, limit);
    return {
      availablePoints: account.quotaPoints,
      reservedPoints: Math.round((Number(workflowPending._sum.authorizedPoints ?? 0) + Number(apiPending._sum.authorizedPoints ?? 0) + Number(marketPending._sum.amount ?? 0) + Number(templatePending._sum.costPoints ?? 0) + Number(legacyWorkflowPending._sum.costPoints ?? 0) + Number(mediaPending._sum.pointsCost ?? 0)) * 1e6) / 1e6,
      pendingCount: workflowPending._count._all + apiPending._count._all + marketPending._count._all + templatePending._count._all + legacyWorkflowPending._count._all + mediaPending._count._all,
      entries: page.map(row => ({ ...row, category: row.refType === "ledger_correction" ? "LEDGER_CORRECTION" : row.refType === "market_income" ? "SELLER_INCOME" : row.refType === "market_order" && row.amount < 0 ? "PURCHASE" : row.refType === "recharge" ? "RECHARGE" : row.reason, createdAt: row.createdAt.toISOString() })),
      nextCursor: rows.length > limit ? page[page.length - 1].id : null,
      billing: { rechargeYuanPerPoint: 1, usdQuotaPerPoint: 1, gptConsumptionMultiplier: 0.16, deepseekConsumptionMultiplier: 1, rechargeEnabled: ldxpRechargeEnabled() },
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
