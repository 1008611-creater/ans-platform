import type { DbTransaction } from "@/lib/db";
import { z } from "zod";
import { db } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriStageSubmissionContentSchema, agriTechnicalCheckCommandSchema } from "@/contracts/agri-submissions";
import { agriDemoSnapshotSchema } from "@/contracts/agri-demo";
import { agriRecordSummaryQuerySchema, AGRI_RECORD_SUMMARY_LIMIT, type AgriRecordSummaryQuery, type AgriRecordSummary, type AgriSummarySubmission, type AgriSummaryCheck, type AgriSummaryDemo, type AgriSummaryIssue, type AgriSummaryIssueEvent, type AgriSummaryFeedback } from "@/contracts/agri-record-summary";
import { projectAgriStageFreeze } from "./submissions";
import { lockAgriWorkspace, requireAgriScope, assertAgriAuthorityCurrent, agriDatabaseClock, type AgriWorkspaceContext } from "./workspace";

const identifier = z.string().trim().min(1).max(80);
type Tx = DbTransaction;
interface SubmissionRow {
  id: string; competitionId: string; teamCompetitionId: string; teamName: string; entryStageId: string;
  stage: "PRELIMINARY" | "FINAL"; sequence: number; artifactVersionId: string; artifactVersion: number;
  ruleVersionId: string; acceptedAt: Date; currentSubmissionId: string | null; frozenSubmissionId: string | null;
  correctionPreviousId?: string | null; correctionPermitId?: string | null; correctionReason?: string | null; correctionAuthorizedById?: string | null; correctionAuthorizedAt?: Date | null;
  content: unknown; ruleVersion: number; ruleConfirmedAt: Date;
}
interface FeedbackRow { feedbackSequence: number | null; feedbackAction: string | null; feedbackBody: string | null; feedbackAt: Date | null; feedbackActorId: string | null }
interface CheckRow extends FeedbackRow { id: string; basis: AgriSummaryCheck["basis"]; result: AgriSummaryCheck["result"]; checkedAt: Date; checkedById: string; checklist: unknown; internalNote: string | null }
interface DemoRow extends FeedbackRow { id: string; sequence: number; recheckOfId: string | null; basis: AgriSummaryDemo["basis"]; result: AgriSummaryDemo["result"]; checkedAt: Date; checkedById: string; demo: unknown; internalNote: string | null }
interface IssueRow extends Omit<AgriSummaryIssue, "dueAt" | "createdAt" | "updatedAt" | "completedAt"> { dueAt: Date | null; completedAt: Date | null; createdAt: Date; updatedAt: Date }
interface IssueEventRow extends Omit<AgriSummaryIssueEvent, "createdAt"> { createdAt: Date }
function bounded<T>(rows: T[]): T[] {
  if (rows.length > AGRI_RECORD_SUMMARY_LIMIT) throw new AgriWorkspaceError("AGRI_SUMMARY_TOO_LARGE", 422);
  return rows;
}
function submissionView(row: SubmissionRow, freeze: Awaited<ReturnType<typeof projectAgriStageFreeze>>): AgriSummarySubmission {
  return { id: row.id, entryStageId: row.entryStageId, stage: row.stage, sequence: row.sequence,
    artifactVersionId: row.artifactVersionId, artifactVersion: row.artifactVersion, ruleVersionId: row.ruleVersionId,
    acceptedAt: row.acceptedAt.toISOString(), isCurrent: row.currentSubmissionId === row.id, isFrozen: freeze.frozenSubmissionId === row.id,
    isRecordedFrozen: freeze.recordedFrozenSubmissionId === row.id, frozenByDeadline: freeze.frozenByDeadline && freeze.frozenSubmissionId === row.id,
    ...(row.correctionPreviousId && row.correctionPermitId && row.correctionReason && row.correctionAuthorizedById && row.correctionAuthorizedAt ? { correction: { previousSubmissionId: row.correctionPreviousId, permitId: row.correctionPermitId, reason: row.correctionReason, authorizedById: row.correctionAuthorizedById, authorizedAt: row.correctionAuthorizedAt.toISOString() } } : {}) };
}
function feedbackView(row: FeedbackRow, includeBody: boolean): AgriSummaryFeedback | null {
  if (row.feedbackAction !== "PUBLISH" || !row.feedbackAt || row.feedbackSequence === null) return null;
  return { sequence: row.feedbackSequence, publishedAt: row.feedbackAt.toISOString(), ...(row.feedbackActorId ? { actorId: row.feedbackActorId } : {}),
    ...(includeBody && row.feedbackBody !== null ? { body: row.feedbackBody } : {}) };
}
async function submissions(tx: Tx, competitionId: string, submissionId: string): Promise<SubmissionRow | undefined> {
  const [row] = await tx.$queryRaw<SubmissionRow[]>`SELECT s.id,s."competitionId",s."entryStageId",s.sequence,s."artifactVersionId",av.version AS "artifactVersion",s."ruleVersionId",s."acceptedAt",
    es.stage,es."currentSubmissionId",es."frozenSubmissionId",tc.id AS "teamCompetitionId",t.name AS "teamName",r.version AS "ruleVersion",r."confirmedAt" AS "ruleConfirmedAt",NULL::jsonb AS content,c."previousSubmissionId" AS "correctionPreviousId",c."permitId" AS "correctionPermitId",p.reason AS "correctionReason",p."authorizedById" AS "correctionAuthorizedById",p."authorizedAt" AS "correctionAuthorizedAt"
    FROM agri_stage_submissions s JOIN agri_entry_stages es ON es.id=s."entryStageId" AND es."competitionId"=s."competitionId"
    JOIN team_competitions tc ON tc.id=es."teamCompetitionId" AND tc."competitionId"=s."competitionId"
    JOIN teams t ON t.id=tc."teamId" JOIN artifact_versions av ON av.id=s."artifactVersionId"
    JOIN agri_rule_versions r ON r.id=s."ruleVersionId" AND r."competitionId"=s."competitionId"
    LEFT JOIN agri_submission_corrections c ON c."submissionId"=s.id LEFT JOIN agri_correction_permits p ON p.id=c."permitId"
    WHERE s.id=${submissionId} AND s."competitionId"=${competitionId} FOR SHARE OF s,es,tc,t,av,r`;
  return row;
}
/** Reusable collector: caller supplies its authorized transaction and explicit selection.
 * Never starts a transaction, authorizes, exports or mutates stage/freeze state. */
export async function collectAgriRecordSummary(tx: Tx, ctx: AgriWorkspaceContext, submissionId: string, query: Pick<AgriRecordSummaryQuery, "includePrivate" | "includeInternal">): Promise<AgriRecordSummary> {
  const item = await submissions(tx, ctx.workspace.competitionId, submissionId);
  if (!item) throw new AgriWorkspaceError("AGRI_SUBMISSION_NOT_FOUND", 404);
  const history = bounded(await tx.$queryRaw<SubmissionRow[]>`SELECT s.id,s."entryStageId",s.sequence,s."artifactVersionId",av.version AS "artifactVersion",s."ruleVersionId",s."acceptedAt",es.stage,es."currentSubmissionId",es."frozenSubmissionId",c."previousSubmissionId" AS "correctionPreviousId",c."permitId" AS "correctionPermitId",p.reason AS "correctionReason",p."authorizedById" AS "correctionAuthorizedById",p."authorizedAt" AS "correctionAuthorizedAt"
    FROM agri_stage_submissions s JOIN agri_entry_stages es ON es.id=s."entryStageId" AND es."competitionId"=s."competitionId"
    JOIN artifact_versions av ON av.id=s."artifactVersionId"
    LEFT JOIN agri_submission_corrections c ON c."submissionId"=s.id LEFT JOIN agri_correction_permits p ON p.id=c."permitId"
    WHERE es."teamCompetitionId"=${item.teamCompetitionId} AND s."competitionId"=${item.competitionId}
    ORDER BY es.stage,s.sequence DESC,s.id DESC LIMIT 101`);
  const checks = bounded(await tx.$queryRaw<CheckRow[]>`SELECT c.id,c.basis,c.result,c."checkedAt",c."checkedById",
    CASE WHEN ${query.includePrivate} THEN c.checklist ELSE NULL END AS checklist,
    CASE WHEN ${query.includeInternal} AND (c.basis='METADATA' OR ${query.includePrivate}) THEN c."internalNote" ELSE NULL END AS "internalNote",
    f."actorId" AS "feedbackActorId",f.sequence AS "feedbackSequence",f.action AS "feedbackAction",f."createdAt" AS "feedbackAt",CASE WHEN ${query.includePrivate} THEN f.body ELSE NULL END AS "feedbackBody"
    FROM agri_technical_checks c LEFT JOIN LATERAL (SELECT sequence,action,body,"createdAt","actorId" FROM agri_check_feedback_events WHERE "checkId"=c.id ORDER BY sequence DESC LIMIT 1) f ON true
    WHERE c."competitionId"=${item.competitionId} AND c."submissionId"=${item.id} ORDER BY c."checkedAt" DESC,c.id DESC LIMIT 101`);
  const demos = bounded(await tx.$queryRaw<DemoRow[]>`SELECT c.id,c.sequence,c."recheckOfId",c.basis,c.result,c."checkedAt",c."checkedById",
    CASE WHEN ${query.includePrivate} THEN c.demo ELSE NULL END AS demo,
    CASE WHEN ${query.includeInternal} AND (c.basis='METADATA' OR ${query.includePrivate}) THEN c."internalNote" ELSE NULL END AS "internalNote",
    f."actorId" AS "feedbackActorId",f.sequence AS "feedbackSequence",f.action AS "feedbackAction",f."createdAt" AS "feedbackAt",CASE WHEN ${query.includePrivate} THEN f.body ELSE NULL END AS "feedbackBody"
    FROM agri_demo_checks c LEFT JOIN LATERAL (SELECT sequence,action,body,"createdAt","actorId" FROM agri_demo_feedback_events WHERE "checkId"=c.id ORDER BY sequence DESC LIMIT 1) f ON true
    WHERE c."competitionId"=${item.competitionId} AND c."submissionId"=${item.id} ORDER BY c.sequence DESC LIMIT 101`);
  const issues = bounded(await tx.$queryRaw<IssueRow[]>`SELECT id,revision,status,severity,type,basis,visibility,"dueState","dueAt","createdAt","updatedAt","assigneeId","createdById","completedById","completedAt",
    CASE WHEN ${query.includePrivate} OR (${query.includeInternal} AND visibility='INTERNAL') THEN title ELSE NULL END AS title,
    CASE WHEN ${query.includePrivate} OR (${query.includeInternal} AND visibility='INTERNAL') THEN body ELSE NULL END AS body,
    CASE WHEN ${query.includePrivate} OR (${query.includeInternal} AND visibility='INTERNAL') THEN "processingSummary" ELSE NULL END AS "processingSummary"
    FROM agri_issues WHERE "competitionId"=${item.competitionId} AND "submissionId"=${item.id}
    AND (visibility='TEAM' OR ${query.includeInternal}) AND (basis='METADATA' OR ${query.includePrivate})
    ORDER BY "createdAt" DESC,id DESC LIMIT 101`);
  const issueEvents = bounded(await tx.$queryRaw<IssueEventRow[]>`SELECT e.id,e."issueId",e.revision,e.kind,e.basis,e.visibility,e."createdAt",e."actorId",
    CASE WHEN ${query.includePrivate} OR (${query.includeInternal} AND e.visibility='INTERNAL') THEN e."afterState" ELSE NULL END AS "afterState",
    CASE WHEN ${query.includePrivate} OR (${query.includeInternal} AND e.visibility='INTERNAL') THEN e.body ELSE NULL END AS body
    FROM agri_issue_events e JOIN agri_issues i ON i.id=e."issueId" AND i."competitionId"=e."competitionId"
    WHERE i."submissionId"=${item.id} AND e."competitionId"=${item.competitionId}
    AND (i.visibility='TEAM' OR ${query.includeInternal}) AND (i.basis='METADATA' OR ${query.includePrivate})
    AND (e.visibility='TEAM' OR ${query.includeInternal}) AND (e.basis='METADATA' OR ${query.includePrivate})
    ORDER BY e."createdAt" DESC,e.id DESC LIMIT 101`);
  const generatedAt = await agriDatabaseClock(tx);
  const stages = new Map([item, ...history].map(row => [row.entryStageId, row]));
  const freezes = new Map(await Promise.all([...stages].map(async ([id, row]) => [id,
    await projectAgriStageFreeze(tx, { id, competitionId: item.competitionId, stage: row.stage,
      currentSubmissionId: row.currentSubmissionId, frozenSubmissionId: row.frozenSubmissionId }, generatedAt)] as const)));
  const projectedSubmission = (row: SubmissionRow) => submissionView(row, freezes.get(row.entryStageId)!);
  const view: AgriRecordSummary = { schemaVersion: 1, source: "ANS_AGRI_LIVE_RECORD_SUMMARY", generatedAt: generatedAt.toISOString(),
    competitionId: item.competitionId, teamCompetitionId: item.teamCompetitionId, teamName: item.teamName,
    submission: projectedSubmission(item), rule: { id: item.ruleVersionId, version: item.ruleVersion, confirmedAt: item.ruleConfirmedAt.toISOString() },
    selection: { includePrivate: query.includePrivate, includeInternal: query.includeInternal }, limits: { maxPerCollection: 100, complete: true },
    stageHistory: history.map(projectedSubmission),
    technicalChecks: checks.map(row => ({ id: row.id, basis: row.basis, result: row.result, checkedAt: row.checkedAt.toISOString(), checkedById: row.checkedById, feedback: feedbackView(row, query.includePrivate),
      ...(query.includePrivate ? { checklist: agriTechnicalCheckCommandSchema.shape.checklist.parse(row.checklist) } : {}),
      ...(query.includeInternal && (row.basis === "METADATA" || query.includePrivate) ? { internalNote: row.internalNote } : {}) })),
    demoChecks: demos.map(row => ({ id: row.id, sequence: row.sequence, recheckOfId: row.recheckOfId, basis: row.basis, result: row.result, checkedAt: row.checkedAt.toISOString(), checkedById: row.checkedById, feedback: feedbackView(row, query.includePrivate),
      ...(query.includePrivate ? { demo: agriDemoSnapshotSchema.parse(row.demo) } : {}),
      ...(query.includeInternal && (row.basis === "METADATA" || query.includePrivate) ? { internalNote: row.internalNote } : {}) })),
    issues: issues.map(row => ({ id: row.id, revision: row.revision, status: row.status, severity: row.severity, type: row.type, basis: row.basis, visibility: row.visibility,
      assigneeId: row.assigneeId, createdById: row.createdById, completedById: row.completedById, completedAt: row.completedAt?.toISOString() ?? null,
      dueState: row.dueState, dueAt: row.dueAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
      ...(query.includePrivate || (query.includeInternal && row.visibility === "INTERNAL") ? { title: row.title!, body: row.body!, processingSummary: row.processingSummary } : {}) })),
    issueEvents: issueEvents.map(row => ({ id: row.id, issueId: row.issueId, revision: row.revision, kind: row.kind, basis: row.basis, visibility: row.visibility, createdAt: row.createdAt.toISOString(), actorId: row.actorId,
      ...(query.includePrivate || (query.includeInternal && row.visibility === "INTERNAL") ? { body: row.body!, afterState: row.afterState } : {}) })),
  };
  if (query.includePrivate) {
    const [source] = await tx.$queryRaw<Array<{ content: unknown }>>`SELECT jsonb_build_object('projectId',"projectId",'artifactVersionId',"artifactVersionId",'repository',repository,'demoUrl',"demoUrl",'summary',summary,'materials',materials) AS content
      FROM agri_stage_submissions WHERE id=${item.id} AND "competitionId"=${item.competitionId}`;
    view.content = agriStageSubmissionContentSchema.parse(source.content);
  }
  return view;
}
/** One transaction and one exact source. Never calls readers that open another transaction or freeze a stage. */
export async function readAgriRecordSummary(actorId: string, rawSubmissionId: string, rawQuery: unknown = {}): Promise<AgriRecordSummary> {
  const submissionId = identifier.parse(rawSubmissionId), query = agriRecordSummaryQuerySchema.parse(rawQuery);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId);
    const read = await requireAgriScope(tx, ctx, "WORKS_READ");
    const materials = query.includePrivate ? await requireAgriScope(tx, ctx, "PRIVATE_MATERIALS_READ") : null;
    const notes = query.includeInternal ? await requireAgriScope(tx, ctx, "INTERNAL_NOTES_READ") : null;
    const exporting = query.mode === "exportJSON" ? await requireAgriScope(tx, ctx, "EXPORT") : null;
    const view = await collectAgriRecordSummary(tx, ctx, submissionId, query);
    if (exporting) await tx.auditLog.create({ data: { actorId, action: "AGRI_EXPORT_RECORD_SUMMARY", resourceType: "agri_stage_submission", resourceId: view.submission.id,
      metadata: { competitionId: view.competitionId, includePrivate: query.includePrivate, includeInternal: query.includeInternal,
        historyCount: view.stageHistory.length, technicalCheckCount: view.technicalChecks.length, demoCheckCount: view.demoChecks.length, issueCount: view.issues.length, issueEventCount: view.issueEvents.length, generatedAt: view.generatedAt } } });
    await assertAgriAuthorityCurrent(tx, read, materials, notes, exporting);
    return view;
  }, { isolationLevel: "RepeatableRead", timeout: 20000 });
}
