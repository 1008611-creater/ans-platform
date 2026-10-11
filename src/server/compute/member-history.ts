import { Prisma, type ComputeTaskState } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { computePriceSchema } from "@/contracts/compute";
import { ComputeError } from "./policy";

const provider = "toonflow";
const pageSize = 20;
const activeStates: ComputeTaskState[] = ["AUTHORIZED", "RUNNING", "UNCERTAIN"];
const querySchema = z.object({
  filter: z.enum(["all", "active", "settled", "released"]).default("all"),
  cursor: z.string().min(8).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/).optional(),
}).strict();
export type ComputeHistoryFilter = z.infer<typeof querySchema>["filter"];

// Select only fields needed by the member-facing view. The historical price is
// used to derive its unit; rates and all internal command/event fields stay private.
const taskSelect = {
  id: true, modelId: true, state: true, revision: true,
  authorizedPoints: true, settledPoints: true, maxUnits: true, units: true,
  price: true, outcome: true, policyVersion: true, createdAt: true,
  startedAt: true, finishedAt: true,
} satisfies Prisma.ComputeTaskSelect;
type HistoryTask = Omit<Prisma.ComputeTaskGetPayload<{ select: typeof taskSelect }>, "authorizedPoints" | "settledPoints"> & { authorizedPoints: number; settledPoints: number | null };
function taskView(task: HistoryTask) {
  return {
    taskId: task.id, modelId: task.modelId, state: task.state, revision: task.revision,
    authorizedPoints: task.authorizedPoints, settledPoints: task.settledPoints,
    refundedPoints: task.state === "RELEASED" ? task.authorizedPoints
      : task.state === "SETTLED" ? task.authorizedPoints - (task.settledPoints ?? 0) : 0,
    maxUnits: task.maxUnits, units: task.units, unit: computePriceSchema.parse(task.price).unit,
    outcome: task.outcome, policyVersion: task.policyVersion,
    createdAt: task.createdAt.toISOString(), startedAt: task.startedAt?.toISOString() ?? null,
    finishedAt: task.finishedAt?.toISOString() ?? null,
  };
}

/** userId must come from the authenticated server session, never request input.
 * History is readable even when spending is disabled or the account is flagged. */
export async function readComputeHistory(userId: string, raw: unknown = {}) {
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) throw new ComputeError("COMPUTE_CURSOR_INVALID", 400);
  if (typeof userId !== "string" || !userId || userId.length > 128) throw new ComputeError("COMPUTE_ACCOUNT_UNAVAILABLE", 404);
  const { filter, cursor } = parsed.data;
  return db.$transaction(async tx => {
    // A single read-only snapshot covers account, cursor, page and full totals.
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const account = await tx.user.findUnique({ where: { id: userId }, select: { quotaPoints: true, deletedAt: true } });
    if (!account || account.deletedAt) throw new ComputeError("COMPUTE_ACCOUNT_UNAVAILABLE", 404);
    const scope = { userId, provider };
    const anchor = cursor ? await tx.computeTask.findFirst({
      where: { ...scope, id: cursor }, select: { id: true, createdAt: true },
    }) : null;
    if (cursor && !anchor) throw new ComputeError("COMPUTE_CURSOR_INVALID", 400);
    const state: Prisma.ComputeTaskWhereInput = filter === "active" ? { state: { in: activeStates } }
      : filter === "settled" ? { state: "SETTLED" } : filter === "released" ? { state: "RELEASED" } : {};
    const rows = await tx.computeTask.findMany({
      where: { ...scope, ...state, ...(anchor ? { OR: [
        { createdAt: { lt: anchor.createdAt } },
        { createdAt: anchor.createdAt, id: { lt: anchor.id } },
      ] } : {}) },
      select: taskSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: pageSize + 1,
    });
    // Aggregate the entire member/provider scope, independent of filter/cursor.
    const groups = await tx.computeTask.groupBy({
      by: ["state"], where: scope,
      _sum: { authorizedPoints: true, settledPoints: true }, _count: { _all: true },
    });
    const summary = { availablePoints: account.quotaPoints, reservedPoints: 0, consumedPoints: 0, refundedPoints: 0, taskCount: 0 };
    for (const group of groups) {
      const authorized = Number(group._sum.authorizedPoints ?? 0);
      const settled = Number(group._sum.settledPoints ?? 0);
      summary.taskCount += group._count._all;
      if (activeStates.includes(group.state)) summary.reservedPoints += authorized;
      else if (group.state === "SETTLED") {
        summary.consumedPoints += settled;
        summary.refundedPoints += authorized - settled;
      } else if (group.state === "RELEASED") summary.refundedPoints += authorized;
    }
    const page = rows.slice(0, pageSize);
    return { tasks: page.map(taskView), nextCursor: rows.length > pageSize ? page[page.length - 1].id : null, summary };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
export type ComputeHistory = Awaited<ReturnType<typeof readComputeHistory>>;