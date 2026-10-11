import { unifiedModelBilling } from "@/server/integrations/metered-cost";
import type { DbTransaction } from "@/lib/db";
import { hasAdminPermission } from "@/lib/admin-permission-values";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import type { MediaGeneration } from "@prisma/client";
import { mediaGenerationInputSchema, mediaReconciliationSchema, type MediaGenerationInput } from "@/contracts/media-generation";
import { getAvailableModels, getMediaGeneratorPlugin } from "@/lib/plugins/media-generators";
import { MediaSubmissionNotSentError, type GenerationTask } from "@/lib/plugins/media-generators/types";
import { isMediaTaskSigningConfigured, signMediaTask } from "@/lib/media-task-ownership";
import { decryptCredential, encryptCredential, isCredentialEncryptionConfigured } from "@/server/integrations/credential-crypto";
import { debitQuota, refundQuota } from "@/server/quota/service";

export class MediaGenerationError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); }
}
const ownership = (userId: string, idempotencyKey: string) => ({ userId_idempotencyKey: { userId, idempotencyKey } });
const userFields = { id: true, flagged: true, deletedAt: true, quotaPoints: true, generationCreditsRemaining: true, generationCreditsRevision: true, dailyGenerationLimit: true } as const;

function configuredMediaPointPrices(): Record<string, number> {
  const raw = process.env.ANS_MEDIA_POINT_PRICES_JSON;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).flatMap(([key, value]) => {
      const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
      return Number.isFinite(number) && number > 0 ? [[key, Math.round(number * 1e6) / 1e6]] : [];
    }));
  } catch { return {}; }
}

function mediaPointsCost(input: Pick<MediaGenerationInput, "type" | "model">): number | null {
  const prices = configuredMediaPointPrices();
  const value = prices[`${input.type}:${input.model}`] ?? prices[input.model] ?? prices[input.type];
  return typeof value === "number" && value > 0 ? value : null;
}


async function lockUser(tx: DbTransaction, userId: string) {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
  const user = await tx.user.findUnique({ where: { id: userId }, select: userFields });
  if (!user || user.deletedAt) throw new MediaGenerationError("USER_NOT_FOUND", 404);
  if (user.flagged) throw new MediaGenerationError("MEDIA_ACCOUNT_DISABLED", 403);
  return user;
}
function signingReady() {
  if (!isMediaTaskSigningConfigured() || !isCredentialEncryptionConfigured()) {
    throw new MediaGenerationError("MEDIA_NOT_CONFIGURED", 503);
  }
}
function fingerprint(input: MediaGenerationInput) {
  return createHash("sha256").update(JSON.stringify([input.prompt, input.model, input.provider, input.type, input.inputImageUrl ?? null, input.resolution ?? null, input.aspectRatio ?? null])).digest("hex");
}
export async function getMediaGenerationInfo(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: userFields });
  if (unifiedModelBilling()) {
    const prices = configuredMediaPointPrices();
    const models = getAvailableModels();
    const pricedModels = models.filter(model => mediaPointsCost({ type: model.type, model: model.id }) !== null);
    return { available: pricedModels.length > 0, imageModels: pricedModels.filter(model => model.type === "image"), videoModels: pricedModels.filter(model => model.type === "video"), audioModels: pricedModels.filter(model => model.type === "audio"), credits: { remaining: Number(user?.quotaPoints ?? 0), daily: 0 }, points: { unit: "point", prices }, canGenerate: isMediaTaskSigningConfigured() && isCredentialEncryptionConfigured() && !!user && !user.flagged && !user.deletedAt && Number(user.quotaPoints) > 0 && pricedModels.length > 0 };
  }
  return { available: !!getAvailableModels().length, imageModels: getAvailableModels("image"), videoModels: getAvailableModels("video"), audioModels: getAvailableModels("audio"),
    credits: { remaining: user?.generationCreditsRemaining ?? 0, daily: user?.dailyGenerationLimit ?? 0 },
    canGenerate: isMediaTaskSigningConfigured() && isCredentialEncryptionConfigured() && !!user && !user.flagged && !user.deletedAt && user.generationCreditsRemaining > 0 };
}
export function mediaGenerationView(record: MediaGeneration) {
  if (record.status === "ACCEPTED" && record.encryptedTask) {
    const task = JSON.parse(decryptCredential(record.encryptedTask)) as GenerationTask;
    return { status: 200, body: { success: true, type: record.type, generationId: record.id, taskId: task.taskId, socketAccessToken: task.socketAccessToken,
      taskSig: signMediaTask(record.userId, record.provider, task.socketAccessToken), webSocketUrl: record.webSocketUrl, provider: record.provider } };
  }
  if (record.status === "FAILED") return { status: 409, body: { type: record.type, error: "MEDIA_SUBMISSION_NOT_ACCEPTED", generationId: record.id, creditReturned: record.creditReturned } };
  return { status: 202, body: { pending: true, type: record.type, generationId: record.id, state: record.status, requiresReview: record.status === "UNCERTAIN" || (record.status === "SUBMITTING" && record.updatedAt.getTime() < Date.now() - 60_000) } };
}
export async function readMediaGeneration(userId: string, idempotencyKey: string) {
  signingReady();
  const record = await db.$transaction(async tx => {
    await lockUser(tx, userId);
    const found = await tx.mediaGeneration.findUnique({ where: ownership(userId, idempotencyKey) });
    if (!found) throw new MediaGenerationError("TASK_NOT_FOUND", 404);
    return found;
  });
  return mediaGenerationView(record);
}
export async function reserveMediaGeneration(userId: string, raw: unknown) {
  const input = mediaGenerationInputSchema.parse(raw);
  signingReady();
  const requestHash = fingerprint(input);
  const record = await db.$transaction(async tx => {
    const user = await lockUser(tx, userId);
    const existing = await tx.mediaGeneration.findUnique({ where: ownership(userId, input.idempotencyKey) });
    if (existing) {
      if (existing.requestHash !== requestHash) throw new MediaGenerationError("MEDIA_REQUEST_CONFLICT", 409);
      return existing;
    }
    const plugin = getMediaGeneratorPlugin(input.provider);
    if (!plugin?.isEnabled() || !getAvailableModels(input.type).some(model => model.id === input.model && model.provider === input.provider)) {
      throw new MediaGenerationError("MEDIA_MODEL_UNAVAILABLE", 400);
    }
    const pointsCost = unifiedModelBilling() ? mediaPointsCost(input) : 0;
    if (unifiedModelBilling()) {
      if (pointsCost === null) throw new MediaGenerationError("MEDIA_PRICE_NOT_CONFIGURED", 503);
      const created = await tx.mediaGeneration.create({ data: { userId, idempotencyKey: input.idempotencyKey, requestHash, provider: input.provider, model: input.model, type: input.type,
        webSocketUrl: plugin.getWebSocketUrl(), creditRevision: user.generationCreditsRevision, pointsCost } });
      await debitQuota(tx, { userId, costPoints: pointsCost, ref: { type: "media_generation", id: created.id }, note: `Media generation reservation: ${input.model}` });
      return created;
    }
    if (user.generationCreditsRemaining < 1) throw new MediaGenerationError("MEDIA_NO_CREDITS", 403);
    await tx.user.update({ where: { id: userId }, data: { generationCreditsRemaining: { decrement: 1 } } });
    return tx.mediaGeneration.create({ data: { userId, idempotencyKey: input.idempotencyKey, requestHash, provider: input.provider, model: input.model, type: input.type,
      webSocketUrl: plugin.getWebSocketUrl(), creditRevision: user.generationCreditsRevision } });
  });
  return { input, record };
}
async function failBeforeSubmission(record: MediaGeneration) {
  return db.$transaction(async tx => {
    // Same lock order as reservation and credit reset; the state change and refund are atomic.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${record.userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: record.userId }, select: { generationCreditsRevision: true } });
    const returned = !!user && (unifiedModelBilling() ? record.pointsCost !== null : user.generationCreditsRevision === record.creditRevision);
    const changed = await tx.mediaGeneration.updateMany({ where: { id: record.id, status: "SUBMITTING" }, data: { status: "FAILED", creditReturned: returned } });
    if (changed.count && returned) {
      if (unifiedModelBilling()) await refundQuota(tx, { userId: record.userId, costPoints: Number(record.pointsCost ?? 0), ref: { type: "media_generation", id: record.id }, note: "Media generation was not submitted; points returned" });
      else await tx.user.update({ where: { id: record.userId }, data: { generationCreditsRemaining: { increment: 1 } } });
    }
    return tx.mediaGeneration.findUniqueOrThrow({ where: { id: record.id } });
  });
}
async function persistAcceptedTask(record: MediaGeneration, task: GenerationTask) {
  const encryptedTask = encryptCredential(JSON.stringify(task));
  return db.$transaction(async tx => {
    // Serialize with manual review. A late response is authoritative evidence of
    // acceptance, even after an erroneous refund; never debit the member again.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${record.userId} FOR UPDATE`;
    const current = await tx.mediaGeneration.findUniqueOrThrow({ where: { id: record.id } });
    const reviewedTask = current.encryptedTask ? JSON.parse(decryptCredential(current.encryptedTask)) as GenerationTask : null;
    const corrected = current.status === "FAILED" || (current.status === "ACCEPTED" &&
      (reviewedTask?.taskId !== task.taskId || reviewedTask?.socketAccessToken !== task.socketAccessToken));
    const changed = await tx.mediaGeneration.updateMany({
      where: { id: current.id, status: current.status, updatedAt: current.updatedAt },
      data: { status: "ACCEPTED", encryptedTask },
    });
    if (changed.count !== 1) throw new MediaGenerationError("MEDIA_REVIEW_CONFLICT", 409);
    if (corrected) await tx.auditLog.create({ data: {
      actorId: record.userId, action: "MEDIA_LATE_ACCEPTANCE_CORRECTED", resourceType: "MEDIA_GENERATION", resourceId: current.id,
      metadata: { previousState: current.status, creditReturned: current.creditReturned, source: "direct_provider_response", noAdditionalDebit: true },
    } });
    return tx.mediaGeneration.findUniqueOrThrow({ where: { id: current.id } });
  });
}
export async function submitMediaGeneration(userId: string, raw: unknown) {
  const { input, record } = await reserveMediaGeneration(userId, raw);
  if (record.status !== "RESERVED") return mediaGenerationView(record);
  // Claim after reserving in a short transaction; no upstream I/O holds a DB lock.
  const claim = await db.mediaGeneration.updateMany({ where: { id: record.id, status: "RESERVED" }, data: { status: "SUBMITTING" } });
  if (!claim.count) return mediaGenerationView(await db.mediaGeneration.findUniqueOrThrow({ where: { id: record.id } }));
  try {
    const plugin = getMediaGeneratorPlugin(input.provider);
    if (!plugin?.isEnabled()) throw new MediaSubmissionNotSentError();
    const task = await plugin.startGeneration(input);
    if (typeof task.taskId !== "string" || !task.taskId || typeof task.socketAccessToken !== "string" || !task.socketAccessToken || task.socketAccessToken.length > 500) throw new Error("INVALID_PROVIDER_TASK");
    // Persist before replying. Lost HTTP responses can replay this exact task without another submission.
    await persistAcceptedTask(record, task);
  } catch (error) {
    if (error instanceof MediaSubmissionNotSentError) return mediaGenerationView(await failBeforeSubmission(record));
    // Timeouts, broken responses and persistence failures do not prove the provider rejected the job.
    // Never retry or refund automatically in this branch.
    try { await db.mediaGeneration.updateMany({ where: { id: record.id, status: "SUBMITTING" }, data: { status: "UNCERTAIN" } }); }
    catch { /* A retained SUBMITTING row also prevents duplicate submission. */ }
    console.error("MEDIA_SUBMISSION_REQUIRES_REVIEW");
  }
  return mediaGenerationView(await db.mediaGeneration.findUniqueOrThrow({ where: { id: record.id } }));
}

async function checkReviewer(tx: DbTransaction, actorId: string) {
  const actor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true, flagged: true, deletedAt: true, adminPermissions: true } });
  if (!actor || actor.role !== "ADMIN" || actor.flagged || actor.deletedAt || !hasAdminPermission(actor.adminPermissions, "USERS_MANAGE")) throw new MediaGenerationError("FORBIDDEN", 403);
}
export async function listMediaSubmissionReviews(actorId: string) {
  return db.$transaction(async tx => {
    await checkReviewer(tx, actorId);
    return tx.mediaGeneration.findMany({
      where: { OR: [{ status: "UNCERTAIN" }, { status: { in: ["RESERVED", "SUBMITTING"] }, updatedAt: { lt: new Date(Date.now() - 60_000) } }] },
      orderBy: { createdAt: "asc" }, take: 50,
      select: { id: true, userId: true, provider: true, model: true, type: true, status: true, creditRevision: true, createdAt: true, updatedAt: true },
    });
  });
}
/** A reviewer must first corroborate the upstream task or absence of submission.
 * This never calls a provider or retries a job. Evidence is stored atomically. */
export async function reconcileMediaSubmission(actorId: string, generationId: string, raw: unknown) {
  const input = mediaReconciliationSchema.parse(raw);
  signingReady();
  return db.$transaction(async tx => {
    await checkReviewer(tx, actorId);
    const owner = await tx.mediaGeneration.findUnique({ where: { id: generationId }, select: { userId: true } });
    if (!owner) throw new MediaGenerationError("TASK_NOT_FOUND", 404);
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${owner.userId} FOR UPDATE`;
    const record = await tx.mediaGeneration.findUniqueOrThrow({ where: { id: generationId } });
    const stale = record.updatedAt.getTime() < Date.now() - 60_000;
    if (record.status !== "UNCERTAIN" && !(stale && ["RESERVED", "SUBMITTING"].includes(record.status))) throw new MediaGenerationError("MEDIA_REVIEW_CONFLICT", 409);
    const user = await tx.user.findUniqueOrThrow({ where: { id: owner.userId }, select: { generationCreditsRevision: true } });
    const refund = input.resolution === "notAccepted" && (unifiedModelBilling() ? record.pointsCost !== null : user.generationCreditsRevision === record.creditRevision);
    const changed = await tx.mediaGeneration.updateMany({
      where: { id: generationId, status: record.status, updatedAt: record.updatedAt },
      data: input.resolution === "accepted" ? { status: "ACCEPTED", encryptedTask: encryptCredential(JSON.stringify(input.task)) }
        : { status: "FAILED", encryptedTask: null, creditReturned: refund },
    });
    if (changed.count !== 1) throw new MediaGenerationError("MEDIA_REVIEW_CONFLICT", 409);
    if (refund) {
      if (unifiedModelBilling()) await refundQuota(tx, { userId: owner.userId, costPoints: Number(record.pointsCost ?? 0), ref: { type: "media_generation", id: record.id }, note: "Media generation review rejected; points returned" });
      else await tx.user.update({ where: { id: owner.userId }, data: { generationCreditsRemaining: { increment: 1 } } });
    }
    await tx.auditLog.create({ data: {
      actorId, action: "MEDIA_SUBMISSION_RECONCILED", resourceType: "MEDIA_GENERATION", resourceId: generationId,
      metadata: { resolution: input.resolution, reference: input.reference, creditReturned: refund, creditRevision: record.creditRevision },
    } });
    return { generationId, resolution: input.resolution, creditReturned: refund };
  });
}
