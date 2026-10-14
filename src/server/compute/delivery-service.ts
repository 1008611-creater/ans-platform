import { createHash } from "node:crypto";
import { Prisma, type ComputeDelivery } from "@prisma/client";
import { db, type DbTransaction } from "@/lib/db";
import { computePriceSchema } from "@/contracts/compute";
import { computeDeliveryCommandSchema, computeDeliveryViewSchema, computeDeliveryTaskIdSchema,
  type ComputeDeliveryCommand, type ComputeDeliveryMutation, type ComputeDeliveryRead } from "@/contracts/compute-delivery";

const provider = "toonflow";
export class ComputeDeliveryError extends Error {
  constructor(public readonly code: string, public readonly status = 409) { super(code); }
}
export function computeDeliveryId(userId: string, computeTaskId: string) {
  return createHash("sha256").update(JSON.stringify(["toonflow:delivery:v1", userId, computeTaskId])).digest("hex");
}
function requestHash(command: ComputeDeliveryCommand) {
  // Parsed strict command schemas establish a deterministic property order.
  return createHash("sha256").update(JSON.stringify(command)).digest("hex");
}
function deliveryView(row: ComputeDelivery) {
  const parsed = computeDeliveryViewSchema.safeParse({ version: 1, deliveryId: row.id, computeTaskId: row.computeTaskId,
    state: row.state, revision: row.revision, artifact: row.artifact, failureCode: row.failureCode,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), availableAt: row.availableAt?.toISOString() ?? null });
  if (!parsed.success) throw new ComputeDeliveryError("COMPUTE_DELIVERY_RECORD_INVALID", 500);
  return parsed.data;
}
async function lockAccount(tx: DbTransaction, userId: string) {
  // Same account-first order as compute accounting. Reconciliation may finish
  // an existing task on a flagged/deleted account; it never authorizes spending.
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
  if (!await tx.user.findUnique({ where: { id: userId }, select: { id: true } })) throw new ComputeDeliveryError("COMPUTE_DELIVERY_NOT_FOUND", 404);
}
async function lockTask(tx: DbTransaction, userId: string, taskId: string) {
  await tx.$queryRaw`SELECT id FROM compute_tasks WHERE id = ${taskId} AND "userId" = ${userId} AND provider = ${provider} FOR UPDATE`;
  const task = await tx.computeTask.findFirst({ where: { id: taskId, userId, provider }, select: { id: true, userId: true, provider: true, state: true, outcome: true, price: true } });
  if (!task) throw new ComputeDeliveryError("COMPUTE_DELIVERY_NOT_FOUND", 404);
  const price = computePriceSchema.safeParse(task.price);
  if (!price.success || !["image", "second"].includes(price.data.unit)) throw new ComputeDeliveryError("COMPUTE_DELIVERY_MEDIA_TASK_REQUIRED", 422);
  return { ...task, unit: price.data.unit };
}
function checkBinding(row: ComputeDelivery, command: ComputeDeliveryCommand) {
  if (row.id !== command.deliveryId || row.computeTaskId !== command.computeTaskId || row.userId !== command.userId || row.provider !== provider)
    throw new ComputeDeliveryError("COMPUTE_DELIVERY_BINDING_CONFLICT");
}
/** Service-authenticated receipt only. No browser command or accounting writes. */
export async function executeComputeDeliveryCommand(raw: unknown): Promise<ComputeDeliveryMutation> {
  const command = computeDeliveryCommandSchema.parse(raw);
  if (command.deliveryId !== computeDeliveryId(command.userId, command.computeTaskId)) throw new ComputeDeliveryError("COMPUTE_DELIVERY_BINDING_CONFLICT");
  const hash = requestHash(command);
  return db.$transaction(async tx => {
    await lockAccount(tx, command.userId);
    const task = await lockTask(tx, command.userId, command.computeTaskId);
    await tx.$queryRaw`SELECT id FROM compute_deliveries WHERE id = ${command.deliveryId} FOR UPDATE`;
    let delivery = await tx.computeDelivery.findUnique({ where: { id: command.deliveryId } });
    if (delivery) {
      checkBinding(delivery, command);
      const prior = await tx.computeDeliveryEvent.findUnique({ where: { deliveryId_eventId: { deliveryId: delivery.id, eventId: command.eventId } } });
      if (prior) {
        if (prior.requestHash !== hash) throw new ComputeDeliveryError("COMPUTE_DELIVERY_EVENT_CONFLICT");
        return { delivery: deliveryView(delivery), appliedRevision: prior.revision, duplicate: true };
      }
    }
    if (command.expectedDeliveryRevision !== (delivery?.revision ?? 0)) throw new ComputeDeliveryError("COMPUTE_DELIVERY_REVISION_CONFLICT");
    const now = new Date();
    if (!delivery) {
      if (command.action !== "pending") throw new ComputeDeliveryError("COMPUTE_DELIVERY_INITIAL_STATE");
      if (!["RUNNING", "UNCERTAIN", "SETTLED"].includes(task.state)) throw new ComputeDeliveryError("COMPUTE_DELIVERY_TASK_NOT_STARTED");
      delivery = await tx.computeDelivery.create({ data: { id: command.deliveryId, computeTaskId: task.id, userId: command.userId, provider,
        state: "PENDING", revision: 1, artifact: Prisma.DbNull, failureCode: null, availableAt: null, createdAt: now, updatedAt: now } });
    } else {
      const allowed = command.action === "pending" ? delivery.state === "FAILED"
        : command.action === "available" ? ["PENDING", "UNAVAILABLE"].includes(delivery.state)
        : command.action === "failed" ? delivery.state === "PENDING" : delivery.state === "AVAILABLE";
      if (!allowed) throw new ComputeDeliveryError("COMPUTE_DELIVERY_STATE_CONFLICT");
      if (command.action === "pending" && !["RUNNING", "UNCERTAIN", "SETTLED"].includes(task.state)) throw new ComputeDeliveryError("COMPUTE_DELIVERY_TASK_NOT_STARTED");
      if (command.action === "available") {
        if (task.state !== "SETTLED" || !["succeeded", "partial"].includes(task.outcome ?? "")) throw new ComputeDeliveryError("COMPUTE_DELIVERY_SETTLEMENT_REQUIRED");
        const image = command.artifact.mimeType.startsWith("image/");
        if ((task.unit === "image") !== image) throw new ComputeDeliveryError("COMPUTE_DELIVERY_MEDIA_TYPE_CONFLICT", 422);
        if (delivery.artifact !== null) {
          const previous = deliveryView(delivery).artifact;
          if (JSON.stringify(previous) !== JSON.stringify(command.artifact)) throw new ComputeDeliveryError("COMPUTE_DELIVERY_ARTIFACT_IMMUTABLE");
        }
      }
      const data: Prisma.ComputeDeliveryUpdateManyMutationInput = { revision: { increment: 1 }, updatedAt: now,
        state: command.action === "pending" ? "PENDING" : command.action === "available" ? "AVAILABLE" : command.action === "failed" ? "FAILED" : "UNAVAILABLE",
        failureCode: "failureCode" in command ? command.failureCode : null };
      if (command.action === "available") { data.artifact = command.artifact; data.availableAt = delivery.availableAt ?? now; }
      const changed = await tx.computeDelivery.updateMany({ where: { id: delivery.id, computeTaskId: task.id, userId: command.userId, provider, revision: delivery.revision, state: delivery.state }, data });
      if (changed.count !== 1) throw new ComputeDeliveryError("COMPUTE_DELIVERY_REVISION_CONFLICT");
      delivery = await tx.computeDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
    }
    await tx.computeDeliveryEvent.create({ data: { deliveryId: delivery.id, eventId: command.eventId, requestHash: hash,
      action: command.action, revision: delivery.revision, createdAt: now } });
    return { delivery: deliveryView(delivery), appliedRevision: delivery.revision, duplicate: false };
  }, { maxWait: 10000, timeout: 20000 });
}
/** Session-derived owner; no staff, admin, collaborator or public read bypass. */
export async function readComputeDelivery(userId: string, rawTaskId: unknown): Promise<ComputeDeliveryRead> {
  const taskId = computeDeliveryTaskIdSchema.parse(rawTaskId);
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(userId)) throw new ComputeDeliveryError("COMPUTE_DELIVERY_NOT_FOUND", 404);
  return db.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const account = await tx.user.findUnique({ where: { id: userId }, select: { id: true, deletedAt: true } });
    if (!account || account.deletedAt) throw new ComputeDeliveryError("COMPUTE_DELIVERY_NOT_FOUND", 404);
    const task = await tx.computeTask.findFirst({ where: { id: taskId, userId, provider }, select: { id: true } });
    if (!task) throw new ComputeDeliveryError("COMPUTE_DELIVERY_NOT_FOUND", 404);
    const receipt = await tx.computeDelivery.findUnique({ where: { computeTaskId: taskId } });
    if (receipt && (receipt.userId !== userId || receipt.provider !== provider || receipt.id !== computeDeliveryId(userId, taskId)))
      throw new ComputeDeliveryError("COMPUTE_DELIVERY_RECORD_INVALID", 500);
    return { computeTaskId: taskId, delivery: receipt ? deliveryView(receipt) : null };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
