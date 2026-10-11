import type { DbTransaction } from "@/lib/db";
﻿import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriRecordArchiveCommandSchema, agriRecordArchiveListQuerySchema, agriRecordArchiveReadQuerySchema, canonicalAgriArchiveJSON, agriArchiveOnsiteSchema,
  type AgriRecordArchiveSelection, type AgriRecordArchiveSnapshot, type AgriRecordArchiveDescriptor, type AgriRecordArchiveList, type AgriRecordArchiveDetail, type AgriRecordArchiveResult } from "@/contracts/agri-record-archive";
import { collectAgriArchiveOnsite } from "./archive-onsite";
import { collectAgriRecordSummary } from "./record-summary";
import { lockAgriWorkspace, requireAgriScope, assertAgriAuthorityCurrent, type AgriWorkspaceContext } from "./workspace";
type Tx = DbTransaction;
type Authority = Awaited<ReturnType<typeof requireAgriScope>>;
const identifier = z.string().trim().min(1).max(80), fail = (code: string, status = 409): never => { throw new AgriWorkspaceError(code, status); };
const digest = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
interface Row { id: string; competitionId: string; submissionId: string; entryStageId: string; artifactVersionId: string; ruleVersionId: string; sequence: number; previousArchiveId: string | null; createdById: string; collectedAt: Date; includePrivate: boolean; includeInternal: boolean; snapshotSchemaVersion: number; snapshotCanonical: string; snapshotHash: string; byteLength: number }
const cursorSchema = z.object({ actorId: identifier, competitionId: identifier, submissionId: identifier, sequence: z.number().int().positive(), id: identifier }).strict();
function cursorValue(raw: string | undefined, ctx: AgriWorkspaceContext, submissionId: string) {
  if (!raw) return null;
  try { const cursor = cursorSchema.parse(JSON.parse(Buffer.from(raw, "base64url").toString("utf8"))); if (cursor.actorId !== ctx.actorId || cursor.competitionId !== ctx.workspace.competitionId || cursor.submissionId !== submissionId) return fail("INVALID_CURSOR", 400); return cursor; }
  catch { return fail("INVALID_CURSOR", 400); }
}
async function selectionAuthority(tx: Tx, ctx: AgriWorkspaceContext, selection: AgriRecordArchiveSelection, grants: Authority[]) {
  if (selection.includePrivate) grants.push(await requireAgriScope(tx, ctx, "PRIVATE_MATERIALS_READ"));
  if (selection.includeInternal) grants.push(await requireAgriScope(tx, ctx, "INTERNAL_NOTES_READ"));
}
async function optional(tx: Tx, ctx: AgriWorkspaceContext, scope: "PRIVATE_MATERIALS_READ" | "INTERNAL_NOTES_READ" | "ARCHIVE_WRITE" | "ONSITE_READ") {
  try { return await requireAgriScope(tx, ctx, scope); } catch (error) { if (error instanceof AgriWorkspaceError && error.code === "AGRI_SCOPE_REQUIRED") return null; throw error; }
}
function descriptor(row: Row): AgriRecordArchiveDescriptor {
  return { id: row.id, competitionId: row.competitionId, submissionId: row.submissionId, entryStageId: row.entryStageId, artifactVersionId: row.artifactVersionId, ruleVersionId: row.ruleVersionId,
    sequence: row.sequence, previousArchiveId: row.previousArchiveId, createdById: row.createdById, collectedAt: row.collectedAt.toISOString(), selection: { includePrivate: row.includePrivate, includeInternal: row.includeInternal },
    snapshotSchemaVersion: row.snapshotSchemaVersion as 1 | 2, includesOnsite: row.snapshotSchemaVersion === 2, sha256: row.snapshotHash, byteLength: row.byteLength };
}
/** Stored selection is indivisible. Verify exact bytes and provenance before returning any content. */
function verifiedSnapshot(row: Row): AgriRecordArchiveSnapshot {
  try {
    if (![1, 2].includes(row.snapshotSchemaVersion) || Buffer.byteLength(row.snapshotCanonical, "utf8") !== row.byteLength || digest(row.snapshotCanonical) !== row.snapshotHash) throw new Error();
    const value = JSON.parse(row.snapshotCanonical) as AgriRecordArchiveSnapshot;
    if (canonicalAgriArchiveJSON(value) !== row.snapshotCanonical || value.schemaVersion !== row.snapshotSchemaVersion || value.source !== "ANS_AGRI_SAVED_RECORD_ARCHIVE" || value.includesOnsite !== (row.snapshotSchemaVersion === 2) || value.archiveId !== row.id || value.sequence !== row.sequence || value.previousArchiveId !== row.previousArchiveId || value.createdById !== row.createdById || value.collectedAt !== row.collectedAt.toISOString()) throw new Error();
    const record = value.record;
    if (record.schemaVersion !== 1 || record.source !== "ANS_AGRI_LIVE_RECORD_SUMMARY" || record.generatedAt !== value.collectedAt || record.competitionId !== row.competitionId || record.submission.id !== row.submissionId || record.submission.entryStageId !== row.entryStageId || record.submission.artifactVersionId !== row.artifactVersionId || record.submission.ruleVersionId !== row.ruleVersionId || record.rule.id !== row.ruleVersionId || record.selection.includePrivate !== row.includePrivate || record.selection.includeInternal !== row.includeInternal || record.limits.complete !== true || record.limits.maxPerCollection !== 100) throw new Error();
    for (const collection of [record.stageHistory, record.technicalChecks, record.demoChecks, record.issues, record.issueEvents]) if (!Array.isArray(collection) || collection.length > 100) throw new Error();
    if (value.schemaVersion === 1 && "onsite" in value) throw new Error();
    if (value.schemaVersion === 2) {
      const onsite = agriArchiveOnsiteSchema.parse(value.onsite);
      const identities = new Map(onsite.items.map(item => [item.id, item]));
      if (identities.size !== onsite.items.length || onsite.events.some(event => !identities.has(event.itemId) || event.revision > identities.get(event.itemId)!.revision)) throw new Error();
    }
    return value;
  } catch { return fail("AGRI_ARCHIVE_INTEGRITY_FAILED", 500); }
}
export async function createAgriRecordArchive(actorId: string, raw: unknown): Promise<AgriRecordArchiveResult> {
  const command = agriRecordArchiveCommandSchema.parse(raw), requestHash = digest(canonicalAgriArchiveJSON(command));
  // A single Serializable snapshot binds collection and persistence. A snapshot waiting
  // on the workspace lock may still choose an old sequence; retry its precise unique conflict too.
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(async tx => {
      const ctx = await lockAgriWorkspace(tx, actorId);
      if (!ctx.workspace.enabled) return fail("AGRI_WORKSPACE_DISABLED");
      const grants = [await requireAgriScope(tx, ctx, "WORKS_READ"), await requireAgriScope(tx, ctx, "ARCHIVE_WRITE")];
      await selectionAuthority(tx, ctx, command.selection, grants);
      const [prior] = await tx.$queryRaw<Array<{ requestHash: string; archiveId: string }>>`SELECT "requestHash","archiveId" FROM agri_record_archive_receipts WHERE "competitionId"=${ctx.workspace.competitionId} AND "actorId"=${actorId} AND "idempotencyKey"=${command.idempotencyKey}`;
      if (prior) {
        if (prior.requestHash !== requestHash) return fail("AGRI_IDEMPOTENCY_CONFLICT");
        const [row] = await tx.$queryRaw<Row[]>`SELECT * FROM agri_record_archives WHERE id=${prior.archiveId} AND "competitionId"=${ctx.workspace.competitionId}`;
        if (!row) return fail("AGRI_ARCHIVE_INTEGRITY_FAILED", 500);
        verifiedSnapshot(row); if (row.snapshotSchemaVersion === 2) grants.push(await requireAgriScope(tx, ctx, "ONSITE_READ")); await assertAgriAuthorityCurrent(tx, ...grants);
        return { archiveId: row.id, sequence: row.sequence, sha256: row.snapshotHash, duplicate: true };
      }
      grants.push(await requireAgriScope(tx, ctx, "ONSITE_READ"));
      const onsite = await collectAgriArchiveOnsite(tx, ctx, command.submissionId, command.selection);
      const record = await collectAgriRecordSummary(tx, ctx, command.submissionId, command.selection);
      const [previous] = await tx.$queryRaw<Array<{ id: string; sequence: number }>>`SELECT id,sequence FROM agri_record_archives WHERE "competitionId"=${ctx.workspace.competitionId} AND "submissionId"=${command.submissionId} ORDER BY sequence DESC LIMIT 1`;
      const sequence = (previous?.sequence ?? 0) + 1;
      if (sequence > 2147483646) return fail("AGRI_ARCHIVE_HISTORY_LIMIT");
      const archiveId = randomUUID(), collectedAt = new Date(record.generatedAt);
      const snapshot: AgriRecordArchiveSnapshot = { schemaVersion: 2, source: "ANS_AGRI_SAVED_RECORD_ARCHIVE", includesOnsite: true, onsite, archiveId, sequence, previousArchiveId: previous?.id ?? null, createdById: actorId, collectedAt: record.generatedAt, record };
      const canonical = canonicalAgriArchiveJSON(snapshot), sha256 = digest(canonical), byteLength = Buffer.byteLength(canonical, "utf8");
      await tx.$executeRaw`INSERT INTO agri_record_archives (id,"competitionId","submissionId","entryStageId","artifactVersionId","ruleVersionId",sequence,"previousArchiveId","createdById","collectedAt","includePrivate","includeInternal","snapshotSchemaVersion","snapshotCanonical","snapshotHash","byteLength") VALUES (${archiveId},${record.competitionId},${record.submission.id},${record.submission.entryStageId},${record.submission.artifactVersionId},${record.rule.id},${sequence},${previous?.id ?? null},${actorId},${collectedAt},${command.selection.includePrivate},${command.selection.includeInternal},2,${canonical},${sha256},${byteLength})`;
      await tx.$executeRaw`INSERT INTO agri_record_archive_receipts (id,"competitionId","archiveId","actorId","idempotencyKey","requestHash","createdAt") VALUES (${randomUUID()},${record.competitionId},${archiveId},${actorId},${command.idempotencyKey},${requestHash},${collectedAt})`;
      await tx.auditLog.create({ data: { actorId, action: "AGRI_CREATE_RECORD_ARCHIVE", resourceType: "agri_record_archive", resourceId: archiveId,
        metadata: { competitionId: record.competitionId, submissionId: record.submission.id, sequence, includePrivate: command.selection.includePrivate, includeInternal: command.selection.includeInternal, sha256, byteLength, includesOnsite: true } } });
      await assertAgriAuthorityCurrent(tx, ...grants);
      return { archiveId, sequence, sha256, duplicate: false };
    }, { isolationLevel: "Serializable", timeout: 20000 }); }
    catch (error) {
      const known = error instanceof Prisma.PrismaClientKnownRequestError;
      const serialization = known && (error.code === "P2034" || (error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code))));
      const staleSequence = known && error.code === "P2010" && error.meta?.code === "23505" && ['("submissionId", sequence)', '("competitionId", "actorId", "idempotencyKey")'].some(key => String(error.meta?.message).includes(key));
      if ((!serialization && !staleSequence) || attempt >= 3) throw error;
    }
  }
}
export async function listAgriRecordArchives(actorId: string, rawSubmissionId: string, rawQuery: unknown = {}): Promise<AgriRecordArchiveList> {
  const submissionId = identifier.parse(rawSubmissionId), query = agriRecordArchiveListQuerySchema.parse(rawQuery);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId), works = await requireAgriScope(tx, ctx, "WORKS_READ"), materials = await optional(tx, ctx, "PRIVATE_MATERIALS_READ"), notes = await optional(tx, ctx, "INTERNAL_NOTES_READ"), write = await optional(tx, ctx, "ARCHIVE_WRITE"), onsite = await optional(tx, ctx, "ONSITE_READ");
    const [source] = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM agri_stage_submissions WHERE id=${submissionId} AND "competitionId"=${ctx.workspace.competitionId}`;
    if (!source) return fail("AGRI_SUBMISSION_NOT_FOUND", 404);
    const cursor = cursorValue(query.cursor, ctx, submissionId);
    const rows = await tx.$queryRaw<Row[]>`SELECT * FROM agri_record_archives WHERE "competitionId"=${ctx.workspace.competitionId} AND "submissionId"=${submissionId}
      AND ("snapshotSchemaVersion"=1 OR ${!!onsite}) AND (NOT "includePrivate" OR ${!!materials}) AND (NOT "includeInternal" OR ${!!notes}) AND (${cursor?.sequence ?? null}::integer IS NULL OR (sequence,id)<(${cursor?.sequence ?? null},${cursor?.id ?? null}::text)) ORDER BY sequence DESC,id DESC LIMIT 31`;
    const items = rows.slice(0, 30).map(row => { verifiedSnapshot(row); return descriptor(row); });
    await assertAgriAuthorityCurrent(tx, works, materials, notes, write, onsite);
    const tail = rows[29];
    return { competitionId: ctx.workspace.competitionId, submissionId, workspaceEnabled: ctx.workspace.enabled, canCreate: !!write && !!onsite && ctx.workspace.enabled, items,
      nextCursor: rows.length > 30 ? Buffer.from(JSON.stringify({ actorId, competitionId: ctx.workspace.competitionId, submissionId, sequence: tail.sequence, id: tail.id })).toString("base64url") : null };
  }, { isolationLevel: "RepeatableRead", timeout: 20000 });
}
export async function readAgriRecordArchive(actorId: string, rawArchiveId: string, rawQuery: unknown = {}): Promise<AgriRecordArchiveDetail> {
  const archiveId = identifier.parse(rawArchiveId), query = agriRecordArchiveReadQuerySchema.parse(rawQuery);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId), grants = [await requireAgriScope(tx, ctx, "WORKS_READ")];
    const [row] = await tx.$queryRaw<Row[]>`SELECT * FROM agri_record_archives WHERE id=${archiveId} AND "competitionId"=${ctx.workspace.competitionId} FOR SHARE`;
    if (!row) return fail("AGRI_ARCHIVE_NOT_FOUND", 404);
    await selectionAuthority(tx, ctx, { includePrivate: row.includePrivate, includeInternal: row.includeInternal }, grants);
    if (query.mode === "exportJSON") grants.push(await requireAgriScope(tx, ctx, "EXPORT"));
    if (row.snapshotSchemaVersion === 2) grants.push(await requireAgriScope(tx, ctx, "ONSITE_READ"));
    const snapshot = verifiedSnapshot(row);
    if (query.mode === "exportJSON") await tx.auditLog.create({ data: { actorId, action: "AGRI_EXPORT_RECORD_ARCHIVE", resourceType: "agri_record_archive", resourceId: archiveId, metadata: { competitionId: row.competitionId, sequence: row.sequence, sha256: row.snapshotHash, includePrivate: row.includePrivate, includeInternal: row.includeInternal } } });
    await assertAgriAuthorityCurrent(tx, ...grants);
    return { archive: descriptor(row), snapshot };
  }, { isolationLevel: "RepeatableRead", timeout: 20000 });
}
