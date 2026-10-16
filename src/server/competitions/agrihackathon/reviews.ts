import type { DbTransaction } from "@/lib/db";
import { createHash, randomUUID } from "node:crypto";

import { z } from "zod";
import { db } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriTechnicalCheckCommandSchema } from "@/contracts/agri-submissions";
import { agriReviewCommandSchema, agriReviewsQuerySchema, type AgriReviewList, type AgriReviewItem, type AgriReviewResult } from "@/contracts/agri-reviews";
import { lockAgriWorkspace, requireAgriScope, assertAgriAuthorityCurrent, agriDatabaseClock, type AgriWorkspaceContext } from "./workspace";
type Tx = DbTransaction;
type Authority = Awaited<ReturnType<typeof requireAgriScope>>;
interface Target { id: string; competitionId: string; entryStageId: string; teamCompetitionId: string; teamId: string; artifactVersionId: string; sequence: number }
interface CheckRow { id: string; competitionId: string; entryStageId: string; submissionId: string; result: AgriReviewItem["result"]; basis: AgriReviewItem["basis"]; checklist: unknown; internalNote: string | null; checkedById: string; checkedAt: Date }
interface FeedbackRow { id: string; sequence: number; action: "PUBLISH" | "WITHDRAW"; body: string | null; createdAt: Date }
interface Receipt { checkId: string; feedbackEventId: string | null; appliedSequence: number; requestHash: string }
const identifier = z.string().trim().min(1).max(80);
const cursorSchema = z.object({ id: identifier, checkedAt: z.string().datetime(), actorId: identifier, competitionId: identifier, submissionId: identifier, scope: z.enum(["team", "staff"]) }).strict();
const fail = (code: string, status = 409): never => { throw new AgriWorkspaceError(code, status); };
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function optionalScope(tx: Tx, ctx: AgriWorkspaceContext, scope: "PRIVATE_MATERIALS_READ" | "INTERNAL_NOTES_READ" | "TECHNICAL_WRITE") {
  try { return await requireAgriScope(tx, ctx, scope); }
  catch (error) { if (error instanceof AgriWorkspaceError && error.code === "AGRI_SCOPE_REQUIRED") return null; throw error; }
}
async function target(tx: Tx, ctx: AgriWorkspaceContext, submissionId: string, teamRead: boolean) {
  const [row] = await tx.$queryRaw<Target[]>`SELECT s.id,s."competitionId",s."entryStageId",s."artifactVersionId",s.sequence,es."teamCompetitionId",tc."teamId"
    FROM agri_stage_submissions s JOIN agri_entry_stages es ON es.id=s."entryStageId" JOIN team_competitions tc ON tc.id=es."teamCompetitionId"
    WHERE s.id=${submissionId} AND s."competitionId"=${ctx.workspace.competitionId} FOR SHARE OF tc,es`;
  if (!row) return fail("AGRI_SUBMISSION_NOT_FOUND", 404);
  if (teamRead) {
    const [membership] = await tx.$queryRaw<Array<{ status: string }>>`SELECT status FROM team_members WHERE "teamId"=${row.teamId} AND "userId"=${ctx.actorId} FOR SHARE`;
    if (!membership || membership.status !== "ACTIVE") return fail("AGRI_TEAM_PERMISSION_REQUIRED", 403);
  }
  return row;
}
async function latestFeedback(tx: Tx, checkId: string) {
  const [row] = await tx.$queryRaw<FeedbackRow[]>`SELECT id,sequence,action,body,"createdAt" FROM agri_check_feedback_events WHERE "checkId"=${checkId} ORDER BY sequence DESC LIMIT 1`;
  return row ?? null;
}
/** Every read uses live scopes/membership. Team views never receive withdrawn or internal text. */
export async function readAgriReviews(actorId: string, rawSubmissionId: string, rawQuery: unknown = {}): Promise<AgriReviewList> {
  const submissionId = identifier.parse(rawSubmissionId), query = agriReviewsQuerySchema.parse(rawQuery);
  let cursor: z.infer<typeof cursorSchema> | null = null;
  if (query.cursor) { try { cursor = cursorSchema.parse(JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8"))); } catch { return fail("INVALID_CURSOR", 400); } }
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId), staff = query.scope === "staff";
    const read = staff ? await requireAgriScope(tx, ctx, "WORKS_READ") : null;
    const privateRead = staff ? await optionalScope(tx, ctx, "PRIVATE_MATERIALS_READ") : null;
    const notes = staff ? await optionalScope(tx, ctx, "INTERNAL_NOTES_READ") : null;
    const technical = staff ? await optionalScope(tx, ctx, "TECHNICAL_WRITE") : null;
    const item = await target(tx, ctx, submissionId, !staff);
    if (cursor && (cursor.actorId !== actorId || cursor.competitionId !== item.competitionId || cursor.submissionId !== submissionId || cursor.scope !== query.scope)) return fail("INVALID_CURSOR", 400);
    const rows = await tx.$queryRaw<CheckRow[]>`SELECT * FROM agri_technical_checks WHERE "competitionId"=${item.competitionId} AND "submissionId"=${submissionId}
      AND (${cursor?.id ?? null}::text IS NULL OR ("checkedAt",id)<(${cursor ? new Date(cursor.checkedAt) : null}::timestamptz,${cursor?.id ?? null}::text))
      ORDER BY "checkedAt" DESC,id DESC LIMIT 31`;
    const checks: AgriReviewItem[] = [];
    for (const row of rows.slice(0,30)) {
      const feedback = await latestFeedback(tx, row.id);
      const view: AgriReviewItem = { id: row.id, submissionId, artifactVersionId: item.artifactVersionId,
        result: row.result, basis: row.basis, checkedAt: row.checkedAt.toISOString(),
        feedback: feedback?.action === "PUBLISH" && feedback.body !== null ? { body: feedback.body, publishedAt: feedback.createdAt.toISOString() } : null };
      if (staff) {
        view.checkedById = row.checkedById; view.feedbackSequence = feedback?.sequence ?? 0;
        // Metadata authority cannot read private checklist notes or private internal notes.
        if (row.basis === "METADATA" || privateRead) {
          view.checklist = agriTechnicalCheckCommandSchema.parse({ action: "recordCheck", idempotencyKey: randomUUID(), submissionId,
            result: row.result, basis: row.basis, checklist: row.checklist, internalNote: null }).checklist;
          if (notes) view.internalNote = row.internalNote;
        }
      }
      checks.push(view);
    }
    const last = rows[29];
    await assertAgriAuthorityCurrent(tx,read,privateRead,notes,technical);
    return { competitionId: item.competitionId, submissionId, artifactVersionId: item.artifactVersionId, submissionSequence: item.sequence,
      workspaceEnabled: ctx.workspace.enabled, canRecordCheck: staff && !!technical && ctx.workspace.enabled,
      canReadPrivateMaterials: staff && !!privateRead, canUseInternalNotes: staff && !!notes, checks,
      nextCursor: rows.length > 30 ? Buffer.from(JSON.stringify({ id: last.id, checkedAt: last.checkedAt.toISOString(), actorId, competitionId: item.competitionId, submissionId, scope: query.scope })).toString("base64url") : null };
  }, { timeout: 15000 });
}
/** Checks and team feedback have no review/publication/eligibility/XP/quota side effects. */
export async function executeAgriReviewCommand(actorId: string, raw: unknown): Promise<AgriReviewResult> {
  const command = agriReviewCommandSchema.parse(raw);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId);
    if (!ctx.workspace.enabled) return fail("AGRI_WORKSPACE_DISABLED");
    const read = await requireAgriScope(tx,ctx,"WORKS_READ"), technical = await requireAgriScope(tx,ctx,"TECHNICAL_WRITE");
    const additional: Authority[] = [];
    let check: CheckRow | null = null;
    if (command.action === "recordCheck") {
      await target(tx,ctx,command.submissionId,false);
      if (command.basis === "PRIVATE_MATERIALS") additional.push(await requireAgriScope(tx,ctx,"PRIVATE_MATERIALS_READ"));
      if (command.internalNote !== null) additional.push(await requireAgriScope(tx,ctx,"INTERNAL_NOTES_READ"));
    } else {
      const [row] = await tx.$queryRaw<CheckRow[]>`SELECT * FROM agri_technical_checks WHERE id=${command.checkId} AND "competitionId"=${ctx.workspace.competitionId} FOR UPDATE`;
      if (!row) return fail("AGRI_CHECK_NOT_FOUND",404);
      check = row; await target(tx,ctx,row.submissionId,false);
    }
    const [prior] = await tx.$queryRaw<Receipt[]>`SELECT "checkId","feedbackEventId","appliedSequence","requestHash" FROM agri_review_receipts
      WHERE "competitionId"=${ctx.workspace.competitionId} AND "actorId"=${actorId} AND operation=${command.action} AND "idempotencyKey"=${command.idempotencyKey}`;
    if (prior) {
      if (prior.requestHash !== hash(command)) return fail("AGRI_IDEMPOTENCY_CONFLICT");
      await assertAgriAuthorityCurrent(tx,read,technical,...additional);
      return { checkId: prior.checkId, feedbackEventId: prior.feedbackEventId, appliedSequence: prior.appliedSequence, duplicate: true };
    }
    const now = await agriDatabaseClock(tx);
    let checkId: string, feedbackEventId: string | null = null, appliedSequence = 0;
    if (command.action === "recordCheck") {
      const item = await target(tx,ctx,command.submissionId,false); checkId = randomUUID();
      await tx.$executeRaw`INSERT INTO agri_technical_checks (id,"competitionId","entryStageId","submissionId",result,basis,checklist,"internalNote","checkedById","checkedAt")
        VALUES (${checkId},${item.competitionId},${item.entryStageId},${item.id},${command.result},${command.basis},${JSON.stringify(command.checklist)}::jsonb,${command.internalNote},${actorId},${now})`;
    } else {
      if (!check) return fail("AGRI_CHECK_NOT_FOUND",404);
      checkId = check.id; const previous = await latestFeedback(tx,checkId);
      if ((previous?.sequence ?? 0) !== command.expectedSequence) return fail("AGRI_FEEDBACK_REVISION_CONFLICT");
      if (command.action === "withdrawFeedback" && previous?.action !== "PUBLISH") return fail("AGRI_FEEDBACK_NOT_PUBLISHED");
      feedbackEventId = randomUUID(); appliedSequence = command.expectedSequence + 1;
      await tx.$executeRaw`INSERT INTO agri_check_feedback_events (id,"competitionId","checkId",sequence,action,body,"actorId","createdAt")
        VALUES (${feedbackEventId},${ctx.workspace.competitionId},${checkId},${appliedSequence},${command.action === "publishFeedback" ? "PUBLISH" : "WITHDRAW"},${command.action === "publishFeedback" ? command.body : null},${actorId},${now})`;
    }
    await tx.$executeRaw`INSERT INTO agri_review_receipts (id,"competitionId","checkId","feedbackEventId","actorId",operation,"idempotencyKey","requestHash","appliedSequence","createdAt")
      VALUES (${randomUUID()},${ctx.workspace.competitionId},${checkId},${feedbackEventId},${actorId},${command.action},${command.idempotencyKey},${hash(command)},${appliedSequence},${now})`;
    await tx.auditLog.create({ data: { actorId, action: "AGRI_"+command.action.toUpperCase(), resourceType: "agri_technical_check", resourceId: checkId,
      metadata: { competitionId: ctx.workspace.competitionId, sequence: appliedSequence, feedbackEventId } } });
    await assertAgriAuthorityCurrent(tx,read,technical,...additional);
    return { checkId, feedbackEventId, appliedSequence, duplicate: false };
  }, { timeout: 15000 });
}
import { agriJudgeScoreCommandSchema,agriScoreDimensionsSchema } from "@/contracts/agri-rankings";
/** A judge's ballot is append-only and tied to the exact frozen submission. */
export async function executeAgriJudgeScoreCommand(actorId:string,raw:unknown) {
 const command=agriJudgeScoreCommandSchema.parse(raw);
 return db.$transaction(async tx=>{
  const ctx=await lockAgriWorkspace(tx,actorId);
  if(!ctx.workspace.enabled)return fail("AGRI_WORKSPACE_DISABLED");
  const read=await requireAgriScope(tx,ctx,"WORKS_READ"),authority=await requireAgriScope(tx,ctx,"TECHNICAL_WRITE");
  const item=await target(tx,ctx,command.submissionId,false);
  const [stage]=await tx.$queryRaw<Array<{id:string;stage:"PRELIMINARY"|"FINAL";currentSubmissionId:string|null;frozenSubmissionId:string|null}>>`SELECT id,stage,"currentSubmissionId","frozenSubmissionId" FROM agri_entry_stages WHERE id=${item.entryStageId} FOR UPDATE`;
  const { projectAgriStageFreeze }=await import("./submissions");
  const { agriJudgePanel }=await import("./rankings");
  if(!(await agriJudgePanel(tx,item.competitionId,stage.stage)).includes(actorId))return fail("AGRI_SCORE_PANEL_MEMBERSHIP_REQUIRED",403);
  const freeze=await projectAgriStageFreeze(tx,{...stage,competitionId:item.competitionId},await agriDatabaseClock(tx));
  if(freeze.frozenSubmissionId!==item.id)return fail("AGRI_SCORE_FROZEN_SUBMISSION_REQUIRED");
  const [self]=await tx.$queryRaw<Array<{blocked:boolean}>>`SELECT (EXISTS(SELECT 1 FROM team_members WHERE "teamId"=${item.teamId} AND "userId"=${actorId} AND status='ACTIVE') OR EXISTS(SELECT 1 FROM agri_official_roster_members m JOIN agri_official_rosters r ON r.id=m."rosterId" WHERE r."teamCompetitionId"=${item.teamCompetitionId} AND m."userId"=${actorId})) AS blocked`;
  if(self?.blocked)return fail("AGRI_SCORE_INDEPENDENT_JUDGE_REQUIRED",403);
  const requestHash=hash(command);
  const [prior]=await tx.$queryRaw<Array<{id:string;requestHash:string}>>`SELECT id,"requestHash" FROM agri_judge_scores WHERE "competitionId"=${item.competitionId} AND "judgeId"=${actorId} AND "idempotencyKey"=${command.idempotencyKey}`;
  if(prior){if(prior.requestHash!==requestHash)return fail("AGRI_IDEMPOTENCY_CONFLICT");await assertAgriAuthorityCurrent(tx,read,authority);return {scoreId:prior.id,duplicate:true};}
  const existing=await tx.$queryRaw<Array<{judgeId:string}>>`SELECT "judgeId" FROM agri_judge_scores WHERE "competitionId"=${item.competitionId} AND "submissionId"=${item.id}`;
  if(existing.some(s=>s.judgeId===actorId))return fail("AGRI_SCORE_ALREADY_RECORDED");
  if(existing.length>=(stage.stage==="PRELIMINARY"?3:7))return fail("AGRI_SCORE_JUDGES_COMPLETE");
  const scoreId=randomUUID(),now=await agriDatabaseClock(tx);
  await tx.$executeRaw`INSERT INTO agri_judge_scores(id,"competitionId","entryStageId","submissionId",stage,"judgeId",dimensions,"requestHash","idempotencyKey","createdAt") VALUES(${scoreId},${item.competitionId},${item.entryStageId},${item.id},${stage.stage},${actorId},${JSON.stringify(agriScoreDimensionsSchema.parse(command.dimensions))}::jsonb,${requestHash},${command.idempotencyKey},${now})`;
  await tx.auditLog.create({data:{actorId,action:"AGRI_RECORD_SCORE",resourceType:"agri_judge_score",resourceId:scoreId,metadata:{competitionId:item.competitionId,submissionId:item.id}}});
  await assertAgriAuthorityCurrent(tx,read,authority);return {scoreId,duplicate:false};
 },{timeout:15000});
}
