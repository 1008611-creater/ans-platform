import { db, type DbTransaction } from "@/lib/db";
import { deleteVisualInput } from "./storage";
import { fenceInputWriter } from "./input-writer";
import { VisualPortfolioError } from "./errors";
export interface InputUpload { id: string; ownerId: string; inputKey: string; requestHash: string; idempotencyKey: string; expiresAt: Date; storageMode: string; }
export async function lockVisualInputs(tx: DbTransaction, ownerId: string) {
  await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(13132026)`;
  await tx.$queryRaw`SELECT id FROM users WHERE id=${ownerId} FOR UPDATE`;
}
export async function clearInputUpload(tx: DbTransaction, upload: InputUpload) {
  const job = (await tx.$queryRaw<Array<{ id: string; ownerId: string; inputKey: string }>>`SELECT id,"ownerId","inputKey" FROM visual_model_jobs WHERE id=${upload.id}::uuid`)[0];
  // A commit whose response was lost must never erase the adopted input.
  if (job && (job.ownerId !== upload.ownerId || job.inputKey !== upload.inputKey)) throw new VisualPortfolioError("INPUT_BINDING_CONFLICT", 409);
  if (!job) {
    // A client-aborted S3 PUT may still commit later. No automatic deletion/forgetting
    // can prove it is fenced; retain its intent and block this owner's new uploads.
    if (upload.storageMode !== "local" || process.env.ANS_VISUAL_STORAGE_MODE !== "local") throw new VisualPortfolioError("INPUT_CLEANUP_PENDING", 503);
    fenceInputWriter(upload.id);
    await deleteVisualInput(upload.id, upload.inputKey);
  }
  // Keep the fence until commit; forgetting before commit would permit unsafe retries.
  await tx.$executeRaw`DELETE FROM visual_input_uploads WHERE id=${upload.id}::uuid AND "ownerId"=${upload.ownerId} AND "inputKey"=${upload.inputKey}`;
}
/** Three inputs per transaction bound storage work; old backlog progresses on retry. */
export async function clearTerminalInputs(tx: DbTransaction, ownerId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string; inputKey: string }>>`SELECT id,"inputKey" FROM visual_model_jobs WHERE "ownerId"=${ownerId} AND status IN ('SUCCEEDED','FAILED','CANCELLED') AND "inputDeletedAt" IS NULL ORDER BY "createdAt" LIMIT 3 FOR UPDATE`;
  for (const job of rows) {
    await deleteVisualInput(job.id, job.inputKey);
    await tx.$executeRaw`UPDATE visual_model_jobs SET "inputDeletedAt"=NOW() WHERE id=${job.id}::uuid AND "ownerId"=${ownerId} AND status IN ('SUCCEEDED','FAILED','CANCELLED') AND "inputDeletedAt" IS NULL`;
  }
  const remaining = await tx.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM visual_model_jobs WHERE "ownerId"=${ownerId} AND status IN ('SUCCEEDED','FAILED','CANCELLED') AND "inputDeletedAt" IS NULL`;
  return Number(remaining[0].count) === 0;
}
/** Best effort only after a terminal/refund commit. Failure retains durable retry state. */
export async function cleanupOwnerInputs(ownerId: string) {
  try { await db.$transaction(async tx => { await lockVisualInputs(tx, ownerId); await clearTerminalInputs(tx, ownerId); }, { maxWait: 10000, timeout: 35000 }); }
  catch { /* Creation retries cleanup before allowing any new stored bytes. */ }
}
export async function compensateInputUpload(upload: InputUpload) {
  try { await db.$transaction(async tx => {
    await lockVisualInputs(tx, upload.ownerId);
    const pending = (await tx.$queryRaw<InputUpload[]>`SELECT * FROM visual_input_uploads WHERE id=${upload.id}::uuid AND "ownerId"=${upload.ownerId} FOR UPDATE`)[0];
    if (pending) await clearInputUpload(tx, pending);
  }, { maxWait: 10000, timeout: 15000 }); }
  catch { /* The independently committed upload intent remains the cleanup authority. */ }
}
