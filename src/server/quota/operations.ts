import { voiceOffer, VOICE_PROVIDER, VOICE_CACHE_MS } from "@/server/voice/policy";
import { Prisma } from "@prisma/client";
import { readExamReservations } from "./exam-reservations";
import { countPersonalQuotaMismatches } from "./ledger-scope";
import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { hasAdminPermission } from "@/lib/admin-permission-values";
import { marketTransaction } from "@/server/marketplace/shared";
import { normalizeQuotaAmount, QuotaError } from "./service";
import { listLdxpRechargeOrders, ldxpRechargeEnabled } from "@/server/integrations/ldxp-recharge";

export const quotaOperationSchema = z.object({
  userId: z.string().min(1).max(128),
  kind: z.enum(["GRANT", "ADJUST", "TOP_UP"]),
  amount: z.number().finite().min(-1000000).max(1000000),
  operationKey: z.string().regex(/^[A-Za-z0-9_-]{8,120}$/),
  evidenceRef: z.string().trim().min(3).max(200).optional(),
  note: z.string().trim().min(3).max(1000),
}).strict();

export async function applyQuotaOperation(actorId: string, raw: unknown) {
  const input = quotaOperationSchema.parse(raw);
  const amount = normalizeQuotaAmount(input.amount);
  if (amount === 0 || (input.kind !== "ADJUST" && amount < 0)) throw new QuotaError("INVALID_CREDIT_AMOUNT", "ACCOUNT_UNAVAILABLE", 400);
  if (input.kind === "TOP_UP" && !Number.isSafeInteger(Math.round(amount * 100))) throw new QuotaError("INVALID_RECHARGE_AMOUNT", "ACCOUNT_UNAVAILABLE", 400);
  if (input.kind === "TOP_UP" && Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8) throw new QuotaError("INVALID_RECHARGE_AMOUNT", "ACCOUNT_UNAVAILABLE", 400);
  if (input.kind === "TOP_UP" && !input.evidenceRef) throw new QuotaError("RECEIPT_REQUIRED", "ACCOUNT_UNAVAILABLE", 400);
  if (input.kind === "TOP_UP" && process.env.ANS_MANUAL_RECHARGE_ENABLED !== "1") throw new QuotaError("RECHARGE_DISABLED", "ACCOUNT_UNAVAILABLE", 503);
  const operationKey = `admin:${actorId}:${input.operationKey}`;
  const requestHash = createHash("sha256").update(JSON.stringify({ ...input, amount })).digest("hex");
  return marketTransaction(async tx => {
    const actor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true, flagged: true, deletedAt: true, adminPermissions: true } });
    if (!actor || actor.role !== "ADMIN" || actor.flagged || actor.deletedAt || !hasAdminPermission(actor.adminPermissions, "USERS_MANAGE")) throw new QuotaError("FORBIDDEN", "ACCOUNT_UNAVAILABLE", 403);
    const previous = await tx.quotaOperation.findUnique({ where: { operationKey } });
    if (previous) {
      if (previous.requestHash !== requestHash) throw new QuotaError("IDEMPOTENCY_CONFLICT", "ACCOUNT_UNAVAILABLE", 409);
      return { id: previous.id, balance: Number(previous.balanceAfter), duplicate: true };
    }
    if (input.kind === "TOP_UP" && await tx.quotaOperation.findFirst({ where: { kind: "TOP_UP", evidenceRef: input.evidenceRef } })) throw new QuotaError("RECEIPT_ALREADY_USED", "ACCOUNT_UNAVAILABLE", 409);
    const changed = await tx.user.updateMany({ where: { id: input.userId, deletedAt: null, ...(amount < 0 ? { quotaPoints: { gte: -amount } } : {}) }, data: { quotaPoints: { increment: amount } } });
    if (changed.count !== 1) throw new QuotaError("INSUFFICIENT_QUOTA_OR_ACCOUNT_UNAVAILABLE");
    const account = await tx.user.findUniqueOrThrow({ where: { id: input.userId }, select: { quotaPoints: true } });
    const operation = await tx.quotaOperation.create({ data: { ...input, amount, actorId, operationKey, requestHash, balanceAfter: account.quotaPoints } });
    await tx.quotaLedger.create({ data: { userId: input.userId, amount, balanceAfter: account.quotaPoints, reason: input.kind === "GRANT" ? "GRANT" : "ADMIN_ADJUST", refType: input.kind === "TOP_UP" ? "recharge" : "quota_operation", refId: operation.id, note: input.note } });
    await tx.auditLog.create({ data: { actorId, action: `QUOTA_${input.kind}`, resourceType: "quota_operation", resourceId: operation.id, metadata: { userId: input.userId, amount, evidenceRef: input.evidenceRef ?? null } } });
    return { id: operation.id, balance: account.quotaPoints, duplicate: false };
  });
}
export async function quotaAdminOverview() {
 return db.$transaction(async tx => {
  await tx.$executeRaw`SET TRANSACTION READ ONLY`;
  const [users, operations, pending, disputes, uncertain, gaps, ldxpOrders, examPending] = await Promise.all([
    tx.user.findMany({ where: { deletedAt: null }, select: { id: true, username: true, quotaPoints: true, flagged: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    tx.quotaOperation.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    tx.apiComputeRequest.count({ where: { state: { in: ["RUNNING", "UNCERTAIN"] } } }),
    tx.marketOrder.findMany({ where: { paymentMethod: "POINTS", status: "DISPUTED" }, select: { id: true, buyerId: true, sellerId: true, totalMinor: true }, orderBy: { updatedAt: "asc" }, take: 50 }),
    tx.apiComputeRequest.findMany({ where: { state: "UNCERTAIN" }, select: { id: true, userId: true, modelId: true, authorizedPoints: true }, orderBy: { updatedAt: "asc" }, take: 50 }),
    countPersonalQuotaMismatches(tx),
    listLdxpRechargeOrders(),
    readExamReservations(tx),
  ]);
  const [voicePending, voiceCalls, voiceStored] = await Promise.all([
    tx.apiComputeRequest.count({ where: { provider: VOICE_PROVIDER, state: { in: ["RUNNING", "UNCERTAIN"] } } }),
    tx.apiComputeRequest.count({ where: { provider: VOICE_PROVIDER, createdAt: { gt: new Date(Date.now() - VOICE_CACHE_MS) } } }),
    tx.voiceResult.aggregate({ _sum: { byteLength: true } }),
  ]);
  return { voice: { ...voiceOffer(), pendingCount: voicePending, recentCalls: voiceCalls, cachedAudioBytes: Number(voiceStored._sum.byteLength ?? 0) }, users, mismatchCount: gaps, disputes, uncertain: uncertain.map(row => ({ ...row, authorizedPoints: Number(row.authorizedPoints) })), operations: operations.map(row => ({ ...row, amount: Number(row.amount), balanceAfter: Number(row.balanceAfter), createdAt: row.createdAt.toISOString() })), pending, examPending, manualRechargeEnabled: process.env.ANS_MANUAL_RECHARGE_ENABLED === "1", ldxp: { enabled: ldxpRechargeEnabled(), orders: ldxpOrders } };
 }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, maxWait: 10000, timeout: 30000 });
}
