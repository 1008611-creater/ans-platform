import { YUAN_PER_POINT } from "@/lib/credits-pricing";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { QuotaError } from "./service";
import { readExamReservations } from "./exam-reservations";
import { readVisualReservations } from "./visual-reservations";
import { readPaidApiReservations } from "./benefit-reservations";
import { personalQuotaLedgerWhere } from "./ledger-scope";
import { ldxpRechargeEnabled } from "@/server/integrations/ldxp-recharge";

const querySchema = z.object({
  cursor: z.string().min(8).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/).optional(),
}).strict();
const limit = 30;

/** Personal balance and its entries, including workflow and Codex charges.
 * Team allowance entries stay in the separate team statement.
 * Never expose admin notes, upstream request ids or provider credentials. */
export async function readQuotaHistory(userId: string, raw: unknown = {}) {
  const query = querySchema.safeParse(raw);
  if (!query.success) throw new QuotaError("INVALID_QUOTA_CURSOR", "ACCOUNT_UNAVAILABLE", 400);
  return db.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const account = await tx.user.findUnique({ where: { id: userId }, select: { quotaPoints: true, deletedAt: true } });
    if (!account || account.deletedAt) throw new QuotaError("ACCOUNT_UNAVAILABLE", "ACCOUNT_UNAVAILABLE", 404);
    const anchor = query.data.cursor ? await tx.quotaLedger.findFirst({
      where: { id: query.data.cursor, userId, ...personalQuotaLedgerWhere() }, select: { id: true, createdAt: true },
    }) : null;
    if (query.data.cursor && !anchor) throw new QuotaError("INVALID_QUOTA_CURSOR", "ACCOUNT_UNAVAILABLE", 400);
    const rows = await tx.quotaLedger.findMany({
      where: { userId, ...personalQuotaLedgerWhere(), ...(anchor ? { OR: [
        { createdAt: { lt: anchor.createdAt } },
        { createdAt: anchor.createdAt, id: { lt: anchor.id } },
      ] } : {}) },
      select: { id: true, amount: true, balanceAfter: true, reason: true, refType: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1,
    });
    const [workflowPending, apiPending, marketPending, templatePending, legacyWorkflowPending, mediaPending, examPending, visualPending] = await Promise.all([
      tx.computeTask.aggregate({ where: { userId, state: { in: ["AUTHORIZED", "RUNNING", "UNCERTAIN"] }, authorizedPoints: { gt: 0 } }, _sum: { authorizedPoints: true }, _count: { _all: true } }),
      readPaidApiReservations(tx, userId),
      tx.marketPointsEscrow.aggregate({ where: { state: "HELD", amount: { gt: 0 }, order: { buyerId: userId } }, _sum: { amount: true }, _count: { _all: true } }),
      tx.run.aggregate({ where: { userId, status: { in: ["QUEUED", "RUNNING"] }, costPoints: { gt: 0 } }, _sum: { costPoints: true }, _count: { _all: true } }),
      tx.workflowRun.aggregate({ where: { userId, status: { in: ["QUEUED", "RUNNING"] }, costPoints: { gt: 0 } }, _sum: { costPoints: true }, _count: { _all: true } }),
      tx.mediaGeneration?.aggregate({ where: { userId, status: { in: ["RESERVED", "SUBMITTING", "UNCERTAIN"] }, pointsCost: { gt: 0 } }, _sum: { pointsCost: true }, _count: { _all: true } }) ?? Promise.resolve({ _sum: { pointsCost: null }, _count: { _all: 0 } }),
      readExamReservations(tx, userId),
      readVisualReservations(tx, userId),
    ]);
    const voiceUsage = await tx.apiComputeRequest.findMany({ where: { userId, provider: "mimo-tts" },
      select: { id: true, state: true, modelId: true, settledPoints: true, authorizedPoints: true, maxUnits: true, createdAt: true },
      orderBy: { createdAt: "desc" }, take: 20 });
    const page = rows.slice(0, limit);
    return {
      voiceUsage: voiceUsage.map(row => ({ ...row, settledPoints: row.settledPoints === null ? null : Number(row.settledPoints), authorizedPoints: Number(row.authorizedPoints), createdAt: row.createdAt.toISOString() })),
      availablePoints: account.quotaPoints,
      reservedPoints: Math.round((Number(workflowPending._sum.authorizedPoints ?? 0) + Number(apiPending._sum.authorizedPoints ?? 0) + Number(marketPending._sum.amount ?? 0) + Number(templatePending._sum.costPoints ?? 0) + Number(legacyWorkflowPending._sum.costPoints ?? 0) + Number(mediaPending._sum.pointsCost ?? 0) + examPending.reservedPoints + visualPending.reservedPoints) * 1e6) / 1e6,
      // Count positive outstanding billing holds, not free usage or upload intents.
      pendingCount: workflowPending._count._all + apiPending._count._all + marketPending._count._all + templatePending._count._all + legacyWorkflowPending._count._all + mediaPending._count._all + examPending.pendingCount + visualPending.pendingCount,
      entries: page.map(row => ({ ...row, category: row.refType === "exam-analysis" && row.reason === "RUN_COST" ? "EXAM_ANALYSIS" : row.refType === "ledger_correction" ? "LEDGER_CORRECTION" : row.refType === "market_income" ? "SELLER_INCOME" : row.refType === "market_order" && row.amount < 0 ? "PURCHASE" : row.refType === "recharge" ? "RECHARGE" : row.reason, createdAt: row.createdAt.toISOString() })),
      nextCursor: rows.length > limit ? page[page.length - 1].id : null,
      billing: { rechargeYuanPerPoint: YUAN_PER_POINT, usdQuotaPerPoint: null, pointsPerCny: 10, gptConsumptionMultiplier: 0.16, deepseekConsumptionMultiplier: 1.5, rechargeEnabled: ldxpRechargeEnabled() },
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, maxWait: 10000, timeout: 30000 });
}
