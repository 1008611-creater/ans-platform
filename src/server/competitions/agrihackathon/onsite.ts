import type { DbTransaction } from "@/lib/db";
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriOnsiteCommandSchema, agriOnsiteFieldsSchema, agriOnsiteQuerySchema, type AgriOnsiteFields, type AgriOnsiteItemView, type AgriOnsiteList, type AgriOnsiteDetail, type AgriOnsiteResult } from "@/contracts/agri-onsite";
import { lockAgriWorkspace, requireAgriScope, assertAgriAuthorityCurrent, agriDatabaseClock, type AgriWorkspaceContext } from "./workspace";
type Tx = DbTransaction;
type Authority = Awaited<ReturnType<typeof requireAgriScope>>;
const id = z.string().trim().min(1).max(80);
const fail = (code: string, status = 409): never => { throw new AgriWorkspaceError(code, status); };
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
interface Target { submissionId: string; competitionId: string; entryStageId: string; currentSubmissionId: string | null; artifactVersionId: string; artifactVersion: number; ruleVersionId: string; stage: "PRELIMINARY" | "FINAL"; sequence: number; teamName: string; demoCheckId: string | null; checkedAt: Date | null; basis: string | null; hasInternal: boolean }
interface Row { id: string; competitionId: string; entryStageId: string; submissionId: string; demoCheckId: string | null; fields: unknown; published: boolean; revision: number; createdAt: Date; updatedAt: Date }
interface EventRow { id: string; revision: number; action: string; fields: unknown; published: boolean; createdAt: Date }
const cursorSchema = z.object({ actorId: id, competitionId: id, scope: z.enum(["onsite", "staff"]), target: id, submissionId: id.nullable(), at: z.string().datetime(), id }).strict();
function parseCursor(raw: string | undefined, ctx: AgriWorkspaceContext, scope: "onsite" | "staff", target: string, submissionId: string | undefined) {
  if (!raw) return null;
  try { const cursor = cursorSchema.parse(JSON.parse(Buffer.from(raw, "base64url").toString("utf8")));
    if (cursor.actorId !== ctx.actorId || cursor.competitionId !== ctx.workspace.competitionId || cursor.scope !== scope || cursor.target !== target || cursor.submissionId !== (submissionId ?? null)) return fail("INVALID_CURSOR", 400);
    return cursor;
  } catch { return fail("INVALID_CURSOR", 400); }
}
function nextCursor(row: { id: string; createdAt: Date }, ctx: AgriWorkspaceContext, scope: "onsite" | "staff", target: string, submissionId?: string) {
  return Buffer.from(JSON.stringify({ actorId: ctx.actorId, competitionId: ctx.workspace.competitionId, scope, target, submissionId: submissionId ?? null, id: row.id, at: row.createdAt.toISOString() })).toString("base64url");
}
function stored(fields: AgriOnsiteFields) { return { schemaVersion: 1, ...fields }; }
function parsed(raw: unknown): AgriOnsiteFields {
  const result = z.object({ schemaVersion: z.literal(1) }).passthrough().parse(raw);
  const { schemaVersion: _schemaVersion, ...fields } = result;
  void _schemaVersion;
  return agriOnsiteFieldsSchema.parse(fields);
}
async function optional(tx: Tx, ctx: AgriWorkspaceContext, scope: "WORKS_READ" | "PRIVATE_MATERIALS_READ" | "INTERNAL_NOTES_READ" | "ONSITE_WRITE") {
  try { return await requireAgriScope(tx, ctx, scope); } catch (error) { if (error instanceof AgriWorkspaceError && error.code === "AGRI_SCOPE_REQUIRED") return null; throw error; }
}
async function target(tx: Tx, ctx: AgriWorkspaceContext, submissionId: string, demoCheckId: string | null): Promise<Target> {
  const [row] = await tx.$queryRaw<Target[]>`SELECT s.id AS "submissionId",s."competitionId",s."entryStageId",s."artifactVersionId",s."ruleVersionId",s.sequence,av.version AS "artifactVersion",es.stage,es."currentSubmissionId",t.name AS "teamName",
    d.id AS "demoCheckId",d."checkedAt",d.basis,(d."internalNote" IS NOT NULL) AS "hasInternal"
    FROM agri_stage_submissions s JOIN agri_entry_stages es ON es.id=s."entryStageId" AND es."competitionId"=s."competitionId"
    JOIN team_competitions tc ON tc.id=es."teamCompetitionId" AND tc."competitionId"=s."competitionId" JOIN teams t ON t.id=tc."teamId"
    JOIN artifact_versions av ON av.id=s."artifactVersionId"
    LEFT JOIN agri_demo_checks d ON d.id=${demoCheckId} AND d."submissionId"=s.id AND d."entryStageId"=s."entryStageId" AND d."competitionId"=s."competitionId"
    WHERE s.id=${submissionId} AND s."competitionId"=${ctx.workspace.competitionId} FOR SHARE OF s,es,tc,t,av`;
  if (!row) return fail("AGRI_SUBMISSION_NOT_FOUND", 404);
  if (demoCheckId !== null && row.demoCheckId !== demoCheckId) return fail("AGRI_DEMO_CHECK_NOT_FOUND", 404);
  return row;
}
async function sourceAuthority(tx: Tx, ctx: AgriWorkspaceContext, source: Target, grants: Authority[]) {
  if (source.basis === "PRIVATE_MATERIALS") grants.push(await requireAgriScope(tx, ctx, "PRIVATE_MATERIALS_READ"));
  if (source.hasInternal) grants.push(await requireAgriScope(tx, ctx, "INTERNAL_NOTES_READ"));
}
function view(row: Row, source: Target, staff: boolean, write: boolean, enabled: boolean): AgriOnsiteItemView {
  return { id: row.id, competitionId: row.competitionId, teamName: source.teamName, revision: row.revision, published: row.published,
    fields: parsed(row.fields), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    version: { stage: source.stage, sequence: source.sequence, artifactVersion: source.artifactVersion, checkedAt: source.checkedAt?.toISOString() ?? null },
    ...(staff ? { source: { submissionId: row.submissionId, entryStageId: row.entryStageId, artifactVersionId: source.artifactVersionId, ruleVersionId: source.ruleVersionId, demoCheckId: row.demoCheckId } } : {}),
    canEditDraft: staff && write && !row.published && enabled, canPublish: staff && write && !row.published && enabled,
    canWithdraw: staff && write && row.published && enabled, canUpdateOperations: write && row.published && enabled };
}
async function reader(tx: Tx, ctx: AgriWorkspaceContext, staff: boolean) {
  const onsite = await requireAgriScope(tx, ctx, "ONSITE_READ");
  const works = staff ? await requireAgriScope(tx, ctx, "WORKS_READ") : null;
  const write = await optional(tx, ctx, "ONSITE_WRITE"), materials = staff ? await optional(tx, ctx, "PRIVATE_MATERIALS_READ") : null, notes = staff ? await optional(tx, ctx, "INTERNAL_NOTES_READ") : null;
  return { onsite, works, write, materials, notes };
}
/** Onsite-only readers receive only explicitly published safe fields, never source IDs or event history. */
export async function listAgriOnsiteItems(actorId: string, rawQuery: unknown = {}): Promise<AgriOnsiteList> {
  const query = agriOnsiteQuerySchema.parse(rawQuery);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId), staff = query.scope === "staff", access = await reader(tx, ctx, staff);
    const cursor = parseCursor(query.cursor, ctx, query.scope, "list", query.submissionId);
    const selectedSource = staff && query.submissionId ? await target(tx, ctx, query.submissionId, null) : null;
    const rows = await tx.$queryRaw<Row[]>`SELECT i.* FROM agri_onsite_items i LEFT JOIN agri_demo_checks d ON d.id=i."demoCheckId" AND d."competitionId"=i."competitionId"
      WHERE i."competitionId"=${ctx.workspace.competitionId} AND (${staff} OR i.published)
      AND (${query.submissionId ?? null}::text IS NULL OR i."submissionId"=${query.submissionId ?? null})
      AND (NOT ${staff} OR ((d.basis IS DISTINCT FROM 'PRIVATE_MATERIALS' OR ${!!access.materials}) AND (d."internalNote" IS NULL OR ${!!access.notes})))
      AND (${cursor?.id ?? null}::text IS NULL OR (i."createdAt",i.id)<(${cursor ? new Date(cursor.at) : null}::timestamptz,${cursor?.id ?? null}::text))
      ORDER BY i."createdAt" DESC,i.id DESC LIMIT 31`;
    const items: AgriOnsiteItemView[] = [];
    for (const row of rows.slice(0, 30)) items.push(view(row, await target(tx, ctx, row.submissionId, row.demoCheckId), staff, !!access.write, ctx.workspace.enabled));
    await assertAgriAuthorityCurrent(tx, access.onsite, access.works, access.write, access.materials, access.notes);
    return { competitionId: ctx.workspace.competitionId, workspaceEnabled: ctx.workspace.enabled, items,
      nextCursor: rows.length > 30 ? nextCursor(rows[29], ctx, query.scope, "list", query.submissionId) : null,
      canCreate: staff && !!access.write && ctx.workspace.enabled,
      ...(selectedSource ? { source: { submissionId: selectedSource.submissionId, stage: selectedSource.stage, sequence: selectedSource.sequence, artifactVersion: selectedSource.artifactVersion,
        artifactVersionId: selectedSource.artifactVersionId, isCurrentSubmission: selectedSource.currentSubmissionId === selectedSource.submissionId } } : {}) };
  }, { timeout: 20000 });
}
export async function readAgriOnsiteItem(actorId: string, rawItemId: string, rawQuery: unknown = {}): Promise<AgriOnsiteDetail> {
  const itemId = id.parse(rawItemId), query = agriOnsiteQuerySchema.parse(rawQuery);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId), staff = query.scope === "staff", access = await reader(tx, ctx, staff);
    const [row] = await tx.$queryRaw<Row[]>`SELECT * FROM agri_onsite_items WHERE id=${itemId} AND "competitionId"=${ctx.workspace.competitionId} FOR SHARE`;
    if (!row || (!staff && !row.published) || (query.submissionId && query.submissionId !== row.submissionId)) return fail("AGRI_ONSITE_NOT_FOUND", 404);
    const source = await target(tx, ctx, row.submissionId, row.demoCheckId);
    if (staff && ((source.basis === "PRIVATE_MATERIALS" && !access.materials) || (source.hasInternal && !access.notes))) return fail("AGRI_ONSITE_NOT_FOUND", 404);
    const cursor = parseCursor(query.cursor, ctx, query.scope, itemId, query.submissionId);
    if (!staff && cursor) return fail("INVALID_CURSOR", 400);
    const events = staff ? await tx.$queryRaw<EventRow[]>`SELECT id,revision,action,fields,published,"createdAt" FROM agri_onsite_events WHERE "itemId"=${itemId} AND "competitionId"=${ctx.workspace.competitionId}
      AND (${cursor?.id ?? null}::text IS NULL OR ("createdAt",id)<(${cursor ? new Date(cursor.at) : null}::timestamptz,${cursor?.id ?? null}::text)) ORDER BY "createdAt" DESC,id DESC LIMIT 31` : [];
    await assertAgriAuthorityCurrent(tx, access.onsite, access.works, access.write, access.materials, access.notes);
    return { item: view(row, source, staff, !!access.write, ctx.workspace.enabled), history: events.slice(0, 30).map(event => ({ id: event.id, revision: event.revision, action: event.action, fields: parsed(event.fields), published: event.published, createdAt: event.createdAt.toISOString() })),
      nextCursor: events.length > 30 ? nextCursor(events[29], ctx, query.scope, itemId, query.submissionId) : null };
  }, { timeout: 15000 });
}
/** Source identity never changes. Staff withdraws, edits a new revision and explicitly republishes. */
export async function executeAgriOnsiteCommand(actorId: string, raw: unknown): Promise<AgriOnsiteResult> {
  const command = agriOnsiteCommandSchema.parse(raw);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId);
    if (!ctx.workspace.enabled) return fail("AGRI_WORKSPACE_DISABLED");
    const write = await requireAgriScope(tx, ctx, "ONSITE_WRITE"), grants: Authority[] = [write];
    const operational = command.action === "updateOnsiteOperations";
    grants.push(await requireAgriScope(tx, ctx, operational ? "ONSITE_READ" : "WORKS_READ"));
    let row: Row | undefined;
    if (command.action !== "createOnsite") {
      [row] = await tx.$queryRaw<Row[]>`SELECT * FROM agri_onsite_items WHERE id=${command.itemId} AND "competitionId"=${ctx.workspace.competitionId} FOR UPDATE`;
      if (!row || (operational && !row.published)) return fail("AGRI_ONSITE_NOT_FOUND", 404);
    }
    const source = await target(tx, ctx, command.action === "createOnsite" ? command.submissionId : row!.submissionId, command.action === "createOnsite" ? command.demoCheckId : row!.demoCheckId);
    if (!operational) await sourceAuthority(tx, ctx, source, grants);
    const [prior] = await tx.$queryRaw<Array<{ itemId: string; eventId: string; appliedRevision: number; requestHash: string }>>`SELECT "itemId","eventId","appliedRevision","requestHash" FROM agri_onsite_receipts WHERE "competitionId"=${ctx.workspace.competitionId} AND "actorId"=${actorId} AND operation=${command.action} AND "idempotencyKey"=${command.idempotencyKey}`;
    if (prior) { if (prior.requestHash !== hash(command)) return fail("AGRI_IDEMPOTENCY_CONFLICT"); await assertAgriAuthorityCurrent(tx, ...grants); return { itemId: prior.itemId, eventId: prior.eventId, appliedRevision: prior.appliedRevision, duplicate: true }; }
    const now = await agriDatabaseClock(tx);
    const itemId = row?.id ?? randomUUID(), eventId = randomUUID(), revision = (row?.revision ?? 0) + 1;
    if (revision > 2147483646) return fail("AGRI_ONSITE_HISTORY_LIMIT");
    if (command.action !== "createOnsite" && row!.revision !== command.expectedRevision) return fail("AGRI_ONSITE_REVISION_CONFLICT");
    let fields: AgriOnsiteFields, published = row?.published ?? false;
    if (command.action === "createOnsite") { if (source.currentSubmissionId !== source.submissionId && !command.acknowledgeStaleSubmission) return fail("AGRI_ONSITE_STALE_SUBMISSION_ACK_REQUIRED"); fields = command.fields; }
    else if (command.action === "editOnsiteDraft") { if (row!.published) return fail("AGRI_ONSITE_DRAFT_REQUIRED"); fields = command.fields; }
    else {
      fields = parsed(row!.fields);
      if (command.action === "publishOnsite") { if (published) return fail("AGRI_ONSITE_ALREADY_PUBLISHED"); published = true; }
      else if (command.action === "withdrawOnsite") { if (!published) return fail("AGRI_ONSITE_NOT_PUBLISHED"); published = false; }
      else fields = { ...fields, operations: command.operations };
    }
    const payload = JSON.stringify(stored(fields));
    if (command.action === "createOnsite") await tx.$executeRaw`INSERT INTO agri_onsite_items (id,"competitionId","entryStageId","submissionId","demoCheckId",fields,published,revision,"createdById","createdAt","updatedAt") VALUES (${itemId},${source.competitionId},${source.entryStageId},${source.submissionId},${source.demoCheckId},${payload}::jsonb,false,${revision},${actorId},${now},${now})`;
    else await tx.$executeRaw`UPDATE agri_onsite_items SET fields=${payload}::jsonb,published=${published},revision=${revision},"updatedAt"=${now} WHERE id=${itemId} AND revision=${row!.revision}`;
    await tx.$executeRaw`INSERT INTO agri_onsite_events (id,"competitionId","itemId",revision,action,fields,published,"actorId","createdAt") VALUES (${eventId},${source.competitionId},${itemId},${revision},${command.action},${payload}::jsonb,${published},${actorId},${now})`;
    await tx.$executeRaw`INSERT INTO agri_onsite_receipts (id,"competitionId","itemId","eventId","actorId",operation,"idempotencyKey","requestHash","appliedRevision","createdAt") VALUES (${randomUUID()},${source.competitionId},${itemId},${eventId},${actorId},${command.action},${command.idempotencyKey},${hash(command)},${revision},${now})`;
    await tx.auditLog.create({ data: { actorId, action: "AGRI_" + command.action.toUpperCase(), resourceType: "agri_onsite_item", resourceId: itemId,
      metadata: { competitionId: source.competitionId, revision, eventId, published } } });
    await assertAgriAuthorityCurrent(tx, ...grants);
    return { itemId, eventId, appliedRevision: revision, duplicate: false };
  }, { timeout: 20000 });
}
