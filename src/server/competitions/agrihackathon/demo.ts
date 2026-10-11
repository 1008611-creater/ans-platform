import type { DbTransaction } from "@/lib/db";
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriDemoCommandSchema, agriDemoQuerySchema, agriDemoSnapshotSchema, type AgriDemoList, type AgriDemoCheckItem, type AgriDemoResult } from "@/contracts/agri-demo";
import { lockAgriWorkspace, requireAgriScope, assertAgriAuthorityCurrent, agriDatabaseClock, type AgriWorkspaceContext } from "./workspace";
type Tx = DbTransaction;
type Authority = Awaited<ReturnType<typeof requireAgriScope>>;
interface Target { id: string; competitionId: string; entryStageId: string; teamId: string; artifactVersionId: string; sequence: number; stage: "PRELIMINARY" | "FINAL"; currentSubmissionId: string | null }
interface CheckRow { id: string; competitionId: string; entryStageId: string; submissionId: string; sequence: number; recheckOfId: string | null; result: AgriDemoCheckItem["result"]; basis: AgriDemoCheckItem["basis"]; demo: unknown; internalNote: string | null; checkedById: string; checkedAt: Date }
interface FeedbackRow { id: string; sequence: number; action: "PUBLISH" | "WITHDRAW"; body: string | null; createdAt: Date }
interface Receipt { checkId: string; feedbackEventId: string | null; appliedSequence: number; requestHash: string }
const identifier = z.string().trim().min(1).max(80);
const cursorSchema = z.object({ sequence: z.number().int().min(1).max(2147483647), actorId: identifier, competitionId: identifier, submissionId: identifier, scope: z.enum(["team", "staff"]) }).strict();
const fail = (code: string, status = 409): never => { throw new AgriWorkspaceError(code, status); };
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function optionalScope(tx: Tx, ctx: AgriWorkspaceContext, scope: "PRIVATE_MATERIALS_READ" | "INTERNAL_NOTES_READ" | "DEMO_WRITE") {
  try { return await requireAgriScope(tx, ctx, scope); }
  catch (error) { if (error instanceof AgriWorkspaceError && error.code === "AGRI_SCOPE_REQUIRED") return null; throw error; }
}
async function target(tx: Tx, ctx: AgriWorkspaceContext, submissionId: string, teamRead: boolean): Promise<Target> {
  const [row] = await tx.$queryRaw<Target[]>`SELECT s.id,s."competitionId",s."entryStageId",s."artifactVersionId",s.sequence,es.stage,es."currentSubmissionId",tc."teamId"
    FROM agri_stage_submissions s JOIN agri_entry_stages es ON es.id=s."entryStageId" AND es."competitionId"=s."competitionId"
    JOIN team_competitions tc ON tc.id=es."teamCompetitionId" AND tc."competitionId"=es."competitionId"
    WHERE s.id=${submissionId} AND s."competitionId"=${ctx.workspace.competitionId} FOR SHARE OF tc,es`;
  if (!row) return fail("AGRI_SUBMISSION_NOT_FOUND", 404);
  if (teamRead) {
    const [membership] = await tx.$queryRaw<Array<{ status: string }>>`SELECT status FROM team_members WHERE "teamId"=${row.teamId} AND "userId"=${ctx.actorId} FOR SHARE`;
    if (!membership || membership.status !== "ACTIVE") return fail("AGRI_TEAM_PERMISSION_REQUIRED", 403);
  }
  return row;
}
async function latestCheck(tx: Tx, submissionId: string) {
  const [row] = await tx.$queryRaw<CheckRow[]>`SELECT * FROM agri_demo_checks WHERE "submissionId"=${submissionId} ORDER BY sequence DESC LIMIT 1`;
  return row ?? null;
}
async function latestFeedback(tx: Tx, checkId: string) {
  const [row] = await tx.$queryRaw<FeedbackRow[]>`SELECT id,sequence,action,body,"createdAt" FROM agri_demo_feedback_events WHERE "checkId"=${checkId} ORDER BY sequence DESC LIMIT 1`;
  return row ?? null;
}
async function requireSource(tx: Tx, ctx: AgriWorkspaceContext, row: CheckRow, authorities: Authority[]) {
  if (row.basis === "PRIVATE_MATERIALS") authorities.push(await requireAgriScope(tx, ctx, "PRIVATE_MATERIALS_READ"));
  if (row.internalNote !== null) authorities.push(await requireAgriScope(tx, ctx, "INTERNAL_NOTES_READ"));
}
/** Metadata and explicitly published feedback are separate from private check conditions. */
export async function readAgriDemoChecks(actorId: string, rawSubmissionId: string, rawQuery: unknown = {}): Promise<AgriDemoList> {
  const submissionId = identifier.parse(rawSubmissionId), query = agriDemoQuerySchema.parse(rawQuery);
  let cursor: z.infer<typeof cursorSchema> | null = null;
  if (query.cursor) { try { cursor = cursorSchema.parse(JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8"))); } catch { return fail("INVALID_CURSOR", 400); } }
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId), staff = query.scope === "staff";
    const read = staff ? await requireAgriScope(tx, ctx, "WORKS_READ") : null;
    const privateRead = staff ? await optionalScope(tx, ctx, "PRIVATE_MATERIALS_READ") : null;
    const notes = staff ? await optionalScope(tx, ctx, "INTERNAL_NOTES_READ") : null;
    const write = staff ? await optionalScope(tx, ctx, "DEMO_WRITE") : null;
    const item = await target(tx, ctx, submissionId, !staff);
    if (cursor && (cursor.actorId !== actorId || cursor.competitionId !== item.competitionId || cursor.submissionId !== submissionId || cursor.scope !== query.scope)) return fail("INVALID_CURSOR", 400);
    const latest = await latestCheck(tx, submissionId);
    const rows = await tx.$queryRaw<CheckRow[]>`SELECT c.* FROM agri_demo_checks c WHERE c."competitionId"=${item.competitionId} AND c."submissionId"=${submissionId}
      AND (${staff} OR (SELECT f.action FROM agri_demo_feedback_events f WHERE f."checkId"=c.id ORDER BY f.sequence DESC LIMIT 1)='PUBLISH')
      AND (${cursor?.sequence ?? null}::integer IS NULL OR sequence<${cursor?.sequence ?? null}::integer) ORDER BY sequence DESC LIMIT 31`;
    const checks: AgriDemoCheckItem[] = [];
    for (const row of rows.slice(0,30)) {
      const feedback = await latestFeedback(tx, row.id);
      const view: AgriDemoCheckItem = { id: row.id, submissionId, artifactVersionId: item.artifactVersionId, recheckOfId: staff ? row.recheckOfId : null,
        result: row.result, basis: row.basis, checkedAt: row.checkedAt.toISOString(),
        feedback: feedback?.action === "PUBLISH" && feedback.body !== null ? { body: feedback.body, publishedAt: feedback.createdAt.toISOString() } : null };
      if (staff) {
        view.checkedById = row.checkedById; view.feedbackSequence = feedback?.sequence ?? 0;
        if (row.basis === "METADATA" || privateRead) {
          view.demo = agriDemoSnapshotSchema.parse(row.demo);
          if (notes) view.internalNote = row.internalNote;
        }
      }
      checks.push(view);
    }
    const sourceAllowed = !latest || ((latest.basis === "METADATA" || !!privateRead) && (latest.internalNote === null || !!notes));
    await assertAgriAuthorityCurrent(tx,read,privateRead,notes,write);
    return { competitionId: item.competitionId, submissionId, artifactVersionId: item.artifactVersionId, submissionSequence: item.sequence,
      stage: item.stage, isCurrentSubmission: item.currentSubmissionId === submissionId, currentSubmissionId: item.currentSubmissionId,
      latestCheckId: staff ? latest?.id ?? null : null, canRecheckLatest: staff && !!write && sourceAllowed && ctx.workspace.enabled,
      recheckBlockedCode: staff && !sourceAllowed ? "AGRI_DEMO_SOURCE_PERMISSION_REQUIRED" : null,
      workspaceEnabled: ctx.workspace.enabled, canRecordCheck: staff && !!write && sourceAllowed && ctx.workspace.enabled,
      canReadPrivateMaterials: staff && !!privateRead, canUseInternalNotes: staff && !!notes, checks,
      nextCursor: rows.length > 30 ? Buffer.from(JSON.stringify({ sequence: rows[29].sequence, actorId, competitionId: item.competitionId, submissionId, scope: query.scope })).toString("base64url") : null };
  }, { timeout: 15000 });
}
/** One immutable chain per exact submission. No publication, eligibility, rewards or compute side effects. */
export async function executeAgriDemoCommand(actorId: string, raw: unknown): Promise<AgriDemoResult> {
  const command = agriDemoCommandSchema.parse(raw);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId);
    if (!ctx.workspace.enabled) return fail("AGRI_WORKSPACE_DISABLED");
    const read = await requireAgriScope(tx,ctx,"WORKS_READ"), write = await requireAgriScope(tx,ctx,"DEMO_WRITE");
    const additional: Authority[] = [];
    let check: CheckRow | null = null, item: Target;
    if (command.action === "recordDemoCheck") {
      item = await target(tx,ctx,command.submissionId,false);
      if (command.basis === "PRIVATE_MATERIALS") additional.push(await requireAgriScope(tx,ctx,"PRIVATE_MATERIALS_READ"));
      if (command.internalNote !== null) additional.push(await requireAgriScope(tx,ctx,"INTERNAL_NOTES_READ"));
      if (command.expectedLatestCheckId !== null) {
        const [row] = await tx.$queryRaw<CheckRow[]>`SELECT * FROM agri_demo_checks WHERE id=${command.expectedLatestCheckId} AND "submissionId"=${item.id} AND "competitionId"=${item.competitionId}`;
        if (!row) return fail("AGRI_DEMO_CHECK_NOT_FOUND",404);
        await requireSource(tx,ctx,row,additional);
      }
      if (command.demo.backup.artifactVersionId !== null) {
        const versionId = command.demo.backup.artifactVersionId;
        if (versionId !== item.artifactVersionId) {
          const [reference] = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM agri_submission_material_refs WHERE "competitionId"=${item.competitionId} AND "submissionId"=${item.id} AND "artifactVersionId"=${versionId}`;
          if (!reference) return fail("AGRI_DEMO_BACKUP_VERSION_UNAVAILABLE",403);
        }
      }
    } else {
      const [row] = await tx.$queryRaw<CheckRow[]>`SELECT * FROM agri_demo_checks WHERE id=${command.checkId} AND "competitionId"=${ctx.workspace.competitionId} FOR UPDATE`;
      if (!row) return fail("AGRI_DEMO_CHECK_NOT_FOUND",404);
      check = row; item = await target(tx,ctx,row.submissionId,false); await requireSource(tx,ctx,row,additional);
    }
    const [prior] = await tx.$queryRaw<Receipt[]>`SELECT "checkId","feedbackEventId","appliedSequence","requestHash" FROM agri_demo_receipts
      WHERE "competitionId"=${ctx.workspace.competitionId} AND "actorId"=${actorId} AND operation=${command.action} AND "idempotencyKey"=${command.idempotencyKey}`;
    if (prior) {
      if (prior.requestHash !== hash(command)) return fail("AGRI_IDEMPOTENCY_CONFLICT");
      await assertAgriAuthorityCurrent(tx,read,write,...additional);
      return { checkId: prior.checkId, feedbackEventId: prior.feedbackEventId, appliedSequence: prior.appliedSequence, duplicate: true };
    }
    const now = await agriDatabaseClock(tx);
    let checkId: string, feedbackEventId: string | null = null, appliedSequence = 0;
    if (command.action === "recordDemoCheck") {
      const latest = await latestCheck(tx,item.id);
      if ((latest?.id ?? null) !== command.expectedLatestCheckId) return fail("AGRI_DEMO_REVISION_CONFLICT");
      if (item.currentSubmissionId !== item.id && !command.acknowledgeStaleSubmission) return fail("AGRI_DEMO_STALE_SUBMISSION_ACK_REQUIRED");
      if ((latest?.sequence ?? 0) >= 2147483646) return fail("AGRI_DEMO_HISTORY_LIMIT");
      checkId = randomUUID();
      await tx.$executeRaw`INSERT INTO agri_demo_checks (id,"competitionId","entryStageId","submissionId",sequence,"recheckOfId",result,basis,demo,"internalNote","checkedById","checkedAt")
        VALUES (${checkId},${item.competitionId},${item.entryStageId},${item.id},${(latest?.sequence ?? 0)+1},${latest?.id ?? null},${command.demo.conclusion},${command.basis},${JSON.stringify(command.demo)}::jsonb,${command.internalNote},${actorId},${now})`;
    } else {
      if (!check) return fail("AGRI_DEMO_CHECK_NOT_FOUND",404);
      checkId = check.id; const previous = await latestFeedback(tx,checkId);
      if ((previous?.sequence ?? 0) !== command.expectedSequence) return fail("AGRI_DEMO_FEEDBACK_REVISION_CONFLICT");
      if (command.action === "withdrawDemoFeedback" && previous?.action !== "PUBLISH") return fail("AGRI_DEMO_FEEDBACK_NOT_PUBLISHED");
      feedbackEventId = randomUUID(); appliedSequence = command.expectedSequence + 1;
      await tx.$executeRaw`INSERT INTO agri_demo_feedback_events (id,"competitionId","checkId",sequence,action,body,"actorId","createdAt")
        VALUES (${feedbackEventId},${ctx.workspace.competitionId},${checkId},${appliedSequence},${command.action === "publishDemoFeedback" ? "PUBLISH" : "WITHDRAW"},${command.action === "publishDemoFeedback" ? command.body : null},${actorId},${now})`;
    }
    const eventId = randomUUID();
    await tx.$executeRaw`INSERT INTO agri_demo_events (id,"competitionId","checkId",action,"appliedSequence","actorId","createdAt")
      VALUES (${eventId},${ctx.workspace.competitionId},${checkId},${command.action},${appliedSequence},${actorId},${now})`;
    await tx.$executeRaw`INSERT INTO agri_demo_receipts (id,"competitionId","checkId","eventId","feedbackEventId","actorId",operation,"idempotencyKey","requestHash","appliedSequence","createdAt")
      VALUES (${randomUUID()},${ctx.workspace.competitionId},${checkId},${eventId},${feedbackEventId},${actorId},${command.action},${command.idempotencyKey},${hash(command)},${appliedSequence},${now})`;
    await tx.auditLog.create({ data: { actorId, action: "AGRI_"+command.action.toUpperCase(), resourceType: "agri_demo_check", resourceId: checkId,
      metadata: { competitionId: ctx.workspace.competitionId, submissionId: item.id, recheckOfId: command.action === "recordDemoCheck" ? command.expectedLatestCheckId : null, sequence: appliedSequence, feedbackEventId } } });
    await assertAgriAuthorityCurrent(tx,read,write,...additional);
    return { checkId, feedbackEventId, appliedSequence, duplicate: false };
  }, { timeout: 15000 });
}
