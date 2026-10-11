import type { DbTransaction } from "@/lib/db";
import { createHash } from "node:crypto";
import type { ComputeTask, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { computeCommandSchema, computePriceSchema, type ComputeCommand } from "@/contracts/compute";
import { debitQuota, refundQuota } from "@/server/quota/service";
import { ComputeError, computeEnabled, computePoints, computeQuote, requireComputeEnabled } from "./policy";

const provider = "toonflow";
const activeStates = ["AUTHORIZED", "RUNNING", "UNCERTAIN"] as const;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function lockAccount(tx: DbTransaction, userId: string, spending = false, reconciling = false) {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
  const user = await tx.user.findUnique({ where: { id: userId }, select: { quotaPoints: true, flagged: true, deletedAt: true } });
  if (!user || (user.deletedAt && !reconciling)) throw new ComputeError("COMPUTE_ACCOUNT_UNAVAILABLE", 404);
  if (spending && user.flagged) throw new ComputeError("COMPUTE_ACCOUNT_DISABLED", 403);
  return user;
}
export function computeTaskView(task: Omit<ComputeTask, "authorizedPoints" | "settledPoints"> & { authorizedPoints: number; settledPoints: number | null }) {
  return { taskId: task.id, modelId: task.modelId, state: task.state, revision: task.revision,
    authorizedPoints: task.authorizedPoints, settledPoints: task.settledPoints,
    refundedPoints: task.state === "RELEASED" ? task.authorizedPoints : task.state === "SETTLED" ? task.authorizedPoints - (task.settledPoints ?? 0) : 0,
    maxUnits: task.maxUnits, units: task.units, unit: computePriceSchema.parse(task.price).unit,
    outcome: task.outcome, policyVersion: task.policyVersion, createdAt: task.createdAt.toISOString(), finishedAt: task.finishedAt?.toISOString() ?? null };
}
async function reserve(command: Extract<ComputeCommand, { action: "reserve" }>) {
  const requestHash = command.expectedPolicyVersion !== undefined || command.maxAuthorizedPoints !== undefined || command.expectedUnit !== undefined
    ? digest([command.modelId, command.maxUnits, command.expectedPolicyVersion, command.maxAuthorizedPoints, command.expectedUnit])
    : digest([command.modelId, command.maxUnits]);
  return db.$transaction(async tx => {
    const account = await lockAccount(tx, command.userId);
    const previous = await tx.computeTask.findUnique({ where: { userId_provider_idempotencyKey: { userId: command.userId, provider, idempotencyKey: command.idempotencyKey } } });
    if (previous) {
      if (previous.requestHash !== requestHash) throw new ComputeError("COMPUTE_REQUEST_CONFLICT");
      return { ...computeTaskView(previous), duplicate: true };
    }
    if (account.flagged) throw new ComputeError("COMPUTE_ACCOUNT_DISABLED", 403);
    const quote = computeQuote(command.modelId, command.maxUnits);
    if ((command.expectedPolicyVersion !== undefined && quote.policyVersion !== command.expectedPolicyVersion)
      || (command.maxAuthorizedPoints !== undefined && quote.authorizedPoints > command.maxAuthorizedPoints)
      || (command.expectedUnit !== undefined && quote.price.unit !== command.expectedUnit)) {
      throw new ComputeError("COMPUTE_QUOTE_CHANGED", 409);
    }
    const active = await tx.computeTask.count({ where: { userId: command.userId, provider, state: { in: [...activeStates] } } });
    if (active >= quote.concurrentMax) throw new ComputeError("COMPUTE_CONCURRENCY_LIMIT", 429);
    const task = await tx.computeTask.create({ data: {
      userId: command.userId, provider, idempotencyKey: command.idempotencyKey, requestHash,
      modelId: command.modelId, maxUnits: command.maxUnits, authorizedPoints: quote.authorizedPoints,
      price: quote.price, policyVersion: quote.policyVersion,
    } });
    await debitQuota(tx, { userId: command.userId, costPoints: quote.authorizedPoints, ref: { type: "compute", id: task.id }, note: "Toonflow compute reservation" });
    return { ...computeTaskView(task), duplicate: false };
  });
}
async function transition(command: Extract<ComputeCommand, { eventId: string }>) {
  const requestHash = digest(command);
  return db.$transaction(async tx => {
    // One lock order for reserve, state transitions, refunds and settlements.
    // No supplier I/O in this transaction; no timeout implies a refund.
    await lockAccount(tx, command.userId, command.action === "start", command.action !== "start");
    const task = await tx.computeTask.findFirst({ where: { id: command.taskId, userId: command.userId, provider } });
    if (!task) throw new ComputeError("COMPUTE_TASK_NOT_FOUND", 404);
    const event = await tx.computeTaskEvent.findUnique({ where: { taskId_eventId: { taskId: task.id, eventId: command.eventId } } });
    if (event) {
      if (event.requestHash !== requestHash) throw new ComputeError("COMPUTE_EVENT_CONFLICT");
      return { ...computeTaskView(task), duplicate: true };
    }
    if (task.revision !== command.expectedRevision) throw new ComputeError("COMPUTE_REVISION_CONFLICT");
    const data: Prisma.ComputeTaskUpdateManyMutationInput = { revision: { increment: 1 } };
    let refundPoints = 0;
    if (command.action === "start") {
      requireComputeEnabled();
      if (task.state !== "AUTHORIZED") throw new ComputeError("COMPUTE_STATE_CONFLICT");
      data.state = "RUNNING";
      data.startedAt = new Date();
    } else if (command.action === "uncertain") {
      if (task.state !== "RUNNING") throw new ComputeError("COMPUTE_STATE_CONFLICT");
      data.state = "UNCERTAIN";
    } else if (command.action === "settle") {
      if (!["RUNNING", "UNCERTAIN"].includes(task.state)) throw new ComputeError("COMPUTE_STATE_CONFLICT");
      if (command.units > task.maxUnits) throw new ComputeError("COMPUTE_USAGE_EXCEEDS_BUDGET", 422);
      const points = computePoints(computePriceSchema.parse(task.price), command.units);
      if (points > task.authorizedPoints) throw new ComputeError("COMPUTE_USAGE_EXCEEDS_BUDGET", 422);
      data.state = "SETTLED";
      data.settledPoints = points;
      data.units = command.units;
      data.outcome = command.outcome;
      data.finishedAt = new Date();
      refundPoints = task.authorizedPoints - points;
    } else {
      const allowed = command.evidence === "not_started" ? task.state === "AUTHORIZED" : ["RUNNING", "UNCERTAIN"].includes(task.state);
      if (!allowed) throw new ComputeError("COMPUTE_RELEASE_REQUIRES_EVIDENCE");
      data.state = "RELEASED";
      data.settledPoints = 0;
      data.finishedAt = new Date();
      refundPoints = task.authorizedPoints;
    }
    const changed = await tx.computeTask.updateMany({ where: { id: task.id, revision: task.revision, state: task.state }, data });
    if (changed.count !== 1) throw new ComputeError("COMPUTE_REVISION_CONFLICT");
    if (refundPoints) await refundQuota(tx, { userId: command.userId, costPoints: refundPoints, ref: { type: "compute", id: task.id }, note: command.action === "release" ? "Toonflow confirmed unused reservation" : "Toonflow unused compute balance" });
    await tx.computeTaskEvent.create({ data: { taskId: task.id, eventId: command.eventId, requestHash, action: command.action, revision: task.revision + 1,
      evidenceRef: "evidenceRef" in command ? command.evidenceRef : null } });
    return { ...computeTaskView(await tx.computeTask.findUniqueOrThrow({ where: { id: task.id } })), duplicate: false };
  });
}
/** Internal, authenticated service commands. Stable ANS OIDC sub is User.id,
 * never a filesystem scope hash or a browser-provided authority field. */
export async function executeComputeCommand(raw: unknown) {
  const command = computeCommandSchema.parse(raw);
  if (command.action === "reserve") return reserve(command);
  if ("eventId" in command) return transition(command);
  return db.$transaction(async tx => {
    const user = await lockAccount(tx, command.userId, command.action === "quote");
    if (command.action === "balance") return { unit: "point", balance: user.quotaPoints, spendingEnabled: computeEnabled() && !user.flagged };
    if (command.action === "quote") return { ...computeQuote(command.modelId, command.maxUnits), balance: user.quotaPoints };
    if (command.action === "history") return { tasks: (await tx.computeTask.findMany({ where: { userId: command.userId, provider }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: command.limit })).map(computeTaskView) };
    const task = await tx.computeTask.findFirst({ where: { id: command.taskId, userId: command.userId, provider } });
    if (!task) throw new ComputeError("COMPUTE_TASK_NOT_FOUND", 404);
    return computeTaskView(task);
  });
}
