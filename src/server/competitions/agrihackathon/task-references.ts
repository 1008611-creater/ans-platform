import type { DbTransaction } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriReferenceTargetSchema, agriReferenceQuerySchema, agriReferenceDetailQuerySchema, type AgriReferenceRecord, type AgriReferenceTarget, type AgriReferenceChoices, type AgriReferenceRecordDetail, type AgriTaskReferenceView } from "@/contracts/agri-task-references";
import { lockAgriWorkspace, requireAgriScope, assertAgriAuthorityCurrent, type AgriWorkspaceContext } from "./workspace";
import { AgriTaskError } from "./error";
type Tx = DbTransaction;
type Authority = Awaited<ReturnType<typeof requireAgriScope>>;
type Scope = "team" | "staff";
interface SubmissionRow { submissionId: string; entryStageId: string; competitionId: string; teamId: string; teamName: string; stage: "PRELIMINARY" | "FINAL"; sequence: number; acceptedAt: Date; artifactVersion: number }
interface IssueRow { id: string; title: string; status: string; visibility: string; basis: string }
interface ReferenceRow { id: string; submissionId: string; issueId: string | null }
const id = z.string().trim().min(1).max(80);
const cursorSchema = z.object({ actorId: id, competitionId: id, target: id, scope: z.enum(["team", "staff"]), q: z.string().max(120), at: z.string().datetime(), id }).strict();
function parseCursor(raw: string | undefined, actorId: string, competitionId: string, scope: Scope, target: string, q = "") {
  if (!raw) return null;
  try {
    const result = cursorSchema.parse(JSON.parse(Buffer.from(raw, "base64url").toString("utf8")));
    if (result.actorId !== actorId || result.competitionId !== competitionId || result.scope !== scope || result.target !== target || result.q !== q) throw new Error();
    return result;
  } catch { throw new AgriTaskError("INVALID_CURSOR", 400); }
}
function cursor(actorId: string, competitionId: string, scope: Scope, target: string, row: { id: string; at: Date }, q = "") {
  return Buffer.from(JSON.stringify({ actorId, competitionId, scope, target, id: row.id, at: row.at.toISOString(), q })).toString("base64url");
}
async function optional(tx: Tx, ctx: AgriWorkspaceContext, scope: "WORKS_READ" | "PRIVATE_MATERIALS_READ" | "INTERNAL_NOTES_READ") {
  try { return await requireAgriScope(tx, ctx, scope); }
  catch (error) { if (error instanceof AgriWorkspaceError && error.code === "AGRI_SCOPE_REQUIRED") return null; throw error; }
}
function record(row: SubmissionRow, scope: Scope, issue: IssueRow | null): AgriReferenceRecord {
  return { submissionId: row.submissionId, entryStageId: row.entryStageId, competitionId: row.competitionId, teamName: row.teamName, stage: row.stage, sequence: row.sequence, acceptedAt: row.acceptedAt.toISOString(), artifactVersion: row.artifactVersion, scope,
    issue: issue ? { id: issue.id, title: issue.title, status: issue.status } : null };
}
/** References grant no target authority. Current membership/scope and issue layers are independent. */
export async function resolveAgriTaskReference(tx: Tx, ctx: AgriWorkspaceContext, raw: AgriReferenceTarget, preferredScope?: Scope) {
  const target = agriReferenceTargetSchema.parse(raw);
  const [row] = await tx.$queryRaw<SubmissionRow[]>`SELECT s.id AS "submissionId", s."entryStageId", s."competitionId", s.sequence, s."acceptedAt", tc."teamId", t.name AS "teamName", es.stage, av.version AS "artifactVersion"
    FROM agri_stage_submissions s JOIN agri_entry_stages es ON es.id=s."entryStageId" JOIN team_competitions tc ON tc.id=es."teamCompetitionId" JOIN teams t ON t.id=tc."teamId" JOIN artifact_versions av ON av.id=s."artifactVersionId"
    WHERE s.id=${target.submissionId} AND s."competitionId"=${ctx.workspace.competitionId} FOR SHARE OF tc,es`;
  if (!row) throw new AgriTaskError("AGRI_REFERENCE_UNAVAILABLE", 404);
  const [member] = await tx.$queryRaw<Array<{ status: string }>>`SELECT status FROM team_members WHERE "teamId"=${row.teamId} AND "userId"=${ctx.actorId} FOR SHARE`;
  let issue: IssueRow | null = null;
  if (target.issueId) {
    const [found] = await tx.$queryRaw<IssueRow[]>`SELECT id,title,status,visibility,basis FROM agri_issues WHERE id=${target.issueId} AND "submissionId"=${row.submissionId} AND "competitionId"=${row.competitionId} FOR SHARE`;
    if (!found) throw new AgriTaskError("AGRI_REFERENCE_UNAVAILABLE", 404);
    issue = found;
  }
  if (preferredScope !== "staff" && member?.status === "ACTIVE" && (!issue || issue.visibility === "TEAM")) return { record: record(row, "team", issue), authorities: [] as Authority[] };
  if (preferredScope === "team") throw new AgriTaskError("AGRI_REFERENCE_UNAVAILABLE", 404);
  const works = await optional(tx, ctx, "WORKS_READ");
  if (!works) throw new AgriTaskError("AGRI_REFERENCE_UNAVAILABLE", 404);
  const authorities = [works];
  if (issue?.visibility === "INTERNAL") {
    const notes = await optional(tx, ctx, "INTERNAL_NOTES_READ");
    if (!notes) throw new AgriTaskError("AGRI_REFERENCE_UNAVAILABLE", 404);
    authorities.push(notes);
  }
  if (issue?.basis === "PRIVATE_MATERIALS") {
    const materials = await optional(tx, ctx, "PRIVATE_MATERIALS_READ");
    if (!materials) throw new AgriTaskError("AGRI_REFERENCE_UNAVAILABLE", 404);
    authorities.push(materials);
  }
  return { record: record(row, "staff", issue), authorities };
}
export async function readAgriTaskReferences(tx: Tx, ctx: AgriWorkspaceContext, taskId: string, owner: boolean) {
  const rows = await tx.$queryRaw<ReferenceRow[]>`SELECT id,"submissionId","issueId" FROM agri_task_references WHERE "taskId"=${taskId} AND "competitionId"=${ctx.workspace.competitionId} AND "detachedAt" IS NULL ORDER BY "attachedAt",id LIMIT 10`;
  const references: AgriTaskReferenceView[] = [], authorities: Authority[] = [];
  for (const row of rows) {
    try {
      const resolved = await resolveAgriTaskReference(tx, ctx, { submissionId: row.submissionId, issueId: row.issueId });
      references.push({ id: row.id, available: true, record: resolved.record }); authorities.push(...resolved.authorities);
    } catch (error) {
      if (!(error instanceof AgriTaskError && error.code === "AGRI_REFERENCE_UNAVAILABLE")) throw error;
      // Only the owner can remove an inaccessible reference; shares do not expose its existence/ID.
      if (owner) references.push({ id: row.id, available: false });
    }
  }
  return { references, authorities };
}
export async function attachAgriTaskReference(tx: Tx, ctx: AgriWorkspaceContext, taskId: string, target: AgriReferenceTarget, now: Date, revision: number) {
  const [existing] = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM agri_task_references WHERE "taskId"=${taskId} AND "submissionId"=${target.submissionId} AND "issueId" IS NOT DISTINCT FROM ${target.issueId}::text AND "detachedAt" IS NULL`;
  if (existing) throw new AgriTaskError("AGRI_REFERENCE_ALREADY_ATTACHED", 409);
  const [count] = await tx.$queryRaw<Array<{ total: bigint }>>`SELECT count(*) AS total FROM agri_task_references WHERE "taskId"=${taskId} AND "detachedAt" IS NULL`;
  if (Number(count.total) >= 10) throw new AgriTaskError("AGRI_REFERENCE_LIMIT", 422);
  const resolved = await resolveAgriTaskReference(tx, ctx, target);
  const referenceId = randomUUID();
  await tx.$executeRaw`INSERT INTO agri_task_references (id,"competitionId","taskId","entryStageId","submissionId","issueId","attachedAt","attachedRevision") VALUES (${referenceId},${ctx.workspace.competitionId},${taskId},${resolved.record.entryStageId},${target.submissionId},${target.issueId},${now},${revision})`;
  return { referenceId, authorities: resolved.authorities };
}
export async function detachAgriTaskReference(tx: Tx, ctx: AgriWorkspaceContext, taskId: string, referenceId: string, now: Date, revision: number) {
  const changed = await tx.$executeRaw`UPDATE agri_task_references SET "detachedAt"=${now},"detachedRevision"=${revision} WHERE id=${referenceId} AND "taskId"=${taskId} AND "competitionId"=${ctx.workspace.competitionId} AND "detachedAt" IS NULL`;
  if (changed !== 1) throw new AgriTaskError("AGRI_REFERENCE_UNAVAILABLE", 404);
}
export async function listAgriReferenceChoices(actorId: string, rawQuery: unknown = {}): Promise<AgriReferenceChoices> {
  const query = agriReferenceQuerySchema.parse(rawQuery);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId), scope = query.scope;
    const authority = scope === "staff" ? await requireAgriScope(tx, ctx, "WORKS_READ") : null;
    const after = parseCursor(query.cursor, actorId, ctx.workspace.competitionId, scope, "submissions", query.q);
    const rows = await tx.$queryRaw<SubmissionRow[]>`SELECT s.id AS "submissionId",s."entryStageId",s."competitionId",s.sequence,s."acceptedAt",tc."teamId",t.name AS "teamName",es.stage,av.version AS "artifactVersion"
      FROM agri_stage_submissions s JOIN agri_entry_stages es ON es.id=s."entryStageId" JOIN team_competitions tc ON tc.id=es."teamCompetitionId" JOIN teams t ON t.id=tc."teamId" JOIN artifact_versions av ON av.id=s."artifactVersionId"
      WHERE s."competitionId"=${ctx.workspace.competitionId} AND (${scope === "staff"} OR EXISTS(SELECT 1 FROM team_members m WHERE m."teamId"=tc."teamId" AND m."userId"=${actorId} AND m.status='ACTIVE'))
      AND position(lower(${query.q}) in lower(t.name))>0
      AND (${after?.id ?? null}::text IS NULL OR (s."acceptedAt",s.id)<(${after ? new Date(after.at) : null}::timestamptz,${after?.id ?? null}::text)) ORDER BY s."acceptedAt" DESC,s.id DESC LIMIT 31`;
    // Row locking rechecks membership before projecting metadata, including concurrent departures.
    const records: AgriReferenceRecord[] = [], authorities: Authority[] = [];
    for (const row of rows.slice(0,30)) {
      try { const resolved = await resolveAgriTaskReference(tx, ctx, { submissionId: row.submissionId, issueId: null }, scope); records.push(resolved.record); authorities.push(...resolved.authorities); }
      catch (error) { if (!(error instanceof AgriTaskError && error.code === "AGRI_REFERENCE_UNAVAILABLE")) throw error; }
    }
    const last = rows[29]; await assertAgriAuthorityCurrent(tx, authority, ...authorities);
    return { records, nextCursor: rows.length > 30 ? cursor(actorId, ctx.workspace.competitionId, scope, "submissions", { id: last.submissionId, at: last.acceptedAt }, query.q) : null };
  }, { timeout: 20000 });
}
export async function readAgriReferenceRecord(actorId: string, submissionId: string, rawQuery: unknown = {}): Promise<AgriReferenceRecordDetail> {
  id.parse(submissionId); const query = agriReferenceDetailQuerySchema.parse(rawQuery);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId);
    const resolved = await resolveAgriTaskReference(tx, ctx, { submissionId, issueId: query.issue ?? null }, query.scope);
    const notes = query.scope === "staff" ? await optional(tx, ctx, "INTERNAL_NOTES_READ") : null;
    const materials = query.scope === "staff" ? await optional(tx, ctx, "PRIVATE_MATERIALS_READ") : null;
    const after = parseCursor(query.cursor, actorId, ctx.workspace.competitionId, query.scope, submissionId);
    const rows = await tx.$queryRaw<Array<IssueRow & { createdAt: Date }>>`SELECT id,title,status,visibility,basis,"createdAt" FROM agri_issues WHERE "submissionId"=${submissionId} AND "competitionId"=${ctx.workspace.competitionId}
      AND (visibility='TEAM' OR ${!!notes}) AND (basis='METADATA' OR ${query.scope === "team" || !!materials})
      AND (${after?.id ?? null}::text IS NULL OR ("createdAt",id)<(${after ? new Date(after.at) : null}::timestamptz,${after?.id ?? null}::text)) ORDER BY "createdAt" DESC,id DESC LIMIT 31 FOR SHARE`;
    const last = rows[29]; await assertAgriAuthorityCurrent(tx, ...resolved.authorities, notes, materials);
    return { record: resolved.record, issues: rows.slice(0,30).map(row => ({ id: row.id, title: row.title, status: row.status })), nextCursor: rows.length > 30 ? cursor(actorId, ctx.workspace.competitionId, query.scope, submissionId, { id: last.id, at: last.createdAt }) : null };
  }, { timeout: 20000 });
}
