import type { DbTransaction } from "@/lib/db";
import { createHash, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriDecisionCommandSchema, agriDecisionQuerySchema, type AgriDecisionManagementView, type AgriCorrectionPermitView } from "@/contracts/agri-decisions";
import { agriCorrectableFieldSchema } from "@/contracts/agri-submissions";
import { lockAgriWorkspace, requireAgriScope, assertAgriAuthorityCurrent, agriDatabaseClock } from "./workspace";
type Tx = DbTransaction;
const fail = (code: string, status = 409): never => { throw new AgriWorkspaceError(code, status); };
export interface PermitRow {
  id: string; competitionId: string; entryStageId: string; previousSubmissionId: string; ruleVersionId: string;
  allowedFields: string[]; reason: string; authorizedById: string; authorizedAt: Date; expiresAt: Date;
  revokedAt: Date | null; usedBySubmissionId: string | null;
}
export function permitView(row: PermitRow): AgriCorrectionPermitView {
  return { id: row.id, entryStageId: row.entryStageId, previousSubmissionId: row.previousSubmissionId, ruleVersionId: row.ruleVersionId,
    allowedFields: row.allowedFields.map(field => agriCorrectableFieldSchema.parse(field)), reason: row.reason,
    authorizedById: row.authorizedById, authorizedAt: row.authorizedAt.toISOString(), expiresAt: row.expiresAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null, usedBySubmissionId: row.usedBySubmissionId };
}
export async function finalEligibility(tx: Tx, competitionId: string, entryId: string): Promise<{ state: "UNKNOWN" } | { state: "ELIGIBLE" | "INELIGIBLE"; sourceId: string }> {
  const [row] = await tx.$queryRaw<Array<{ id: string; state: "ELIGIBLE" | "INELIGIBLE" }>>`SELECT id,state FROM agri_final_decisions WHERE "competitionId"=${competitionId} AND "teamCompetitionId"=${entryId} ORDER BY sequence DESC LIMIT 1`;
  return row ? { state: row.state, sourceId: row.id } : { state: "UNKNOWN" };
}
export async function correctionPermit(tx: Tx, competitionId: string, permitId: string): Promise<PermitRow | undefined> {
  const [row] = await tx.$queryRaw<PermitRow[]>`SELECT p.*,CASE WHEN e.action='REVOKE' THEN e."createdAt" ELSE NULL END AS "revokedAt",CASE WHEN e.action='USE' THEN e."submissionId" ELSE NULL END AS "usedBySubmissionId"
    FROM agri_correction_permits p LEFT JOIN agri_correction_permit_events e ON e."permitId"=p.id WHERE p.id=${permitId} AND p."competitionId"=${competitionId} FOR SHARE OF p`;
  return row;
}
export async function activeCorrectionPermits(tx: Tx, competitionId: string, stageId: string, currentId: string | null, now: Date) {
  if (!currentId) return [];
  const rows = await tx.$queryRaw<PermitRow[]>`SELECT p.*,NULL::timestamptz AS "revokedAt",NULL::text AS "usedBySubmissionId" FROM agri_correction_permits p
    WHERE p."competitionId"=${competitionId} AND p."entryStageId"=${stageId} AND p."previousSubmissionId"=${currentId} AND p."expiresAt">${now}
    AND NOT EXISTS(SELECT 1 FROM agri_correction_permit_events e WHERE e."permitId"=p.id) ORDER BY p."authorizedAt" DESC,p.id DESC LIMIT 30`;
  return rows.map(permitView);
}
export async function readAgriDecisionManagement(actorId: string, raw: unknown): Promise<AgriDecisionManagementView> {
  const query = agriDecisionQuerySchema.parse(raw);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId), authority = await requireAgriScope(tx, ctx, "RULES_CONFIRM");
    const [entry] = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM team_competitions WHERE id=${query.teamCompetitionId} AND "competitionId"=${ctx.workspace.competitionId} FOR SHARE`;
    if (!entry) return fail("AGRI_ENTRY_NOT_FOUND", 404);
    const [stage] = query.entryStageId ? await tx.$queryRaw<Array<{ id: string; revision: number; currentSubmissionId: string | null }>>`SELECT id,revision,"currentSubmissionId" FROM agri_entry_stages WHERE id=${query.entryStageId} AND "teamCompetitionId"=${entry.id} AND "competitionId"=${ctx.workspace.competitionId} FOR SHARE` : [];
    if (query.entryStageId && !stage) return fail("AGRI_STAGE_NOT_FOUND", 404);
    const decisions = await tx.$queryRaw<Array<{ id: string; sequence: number; state: "ELIGIBLE" | "INELIGIBLE"; reason: string; sourceReference: string; actorId: string; decidedAt: Date }>>`SELECT id,sequence,state,reason,"sourceReference","actorId","decidedAt" FROM agri_final_decisions WHERE "teamCompetitionId"=${entry.id} AND "competitionId"=${ctx.workspace.competitionId} ORDER BY sequence DESC LIMIT 30`;
    const permits = stage ? await tx.$queryRaw<PermitRow[]>`SELECT p.*,CASE WHEN e.action='REVOKE' THEN e."createdAt" ELSE NULL END AS "revokedAt",CASE WHEN e.action='USE' THEN e."submissionId" ELSE NULL END AS "usedBySubmissionId" FROM agri_correction_permits p LEFT JOIN agri_correction_permit_events e ON e."permitId"=p.id WHERE p."entryStageId"=${stage.id} AND p."competitionId"=${ctx.workspace.competitionId} ORDER BY p."authorizedAt" DESC,p.id DESC LIMIT 30` : [];
    await assertAgriAuthorityCurrent(tx, authority);
    return { competitionId: ctx.workspace.competitionId, teamCompetitionId: entry.id, entryStageId: stage?.id ?? null, stageRevision: stage?.revision ?? null, currentSubmissionId: stage?.currentSubmissionId ?? null,
      eligibility: decisions.map(row => ({ ...row, decidedAt: row.decidedAt.toISOString() })), permits: permits.map(permitView) };
  }, { timeout: 15000 });
}
export async function executeAgriDecisionCommand(actorId: string, raw: unknown) {
  const command = agriDecisionCommandSchema.parse(raw), requestHash = createHash("sha256").update(JSON.stringify(command)).digest("hex");
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId), authority = await requireAgriScope(tx, ctx, "RULES_CONFIRM");
    const [prior] = await tx.$queryRaw<Array<{ requestHash: string; resourceId: string }>>`SELECT "requestHash","resourceId" FROM agri_decision_receipts WHERE "competitionId"=${ctx.workspace.competitionId} AND "actorId"=${actorId} AND operation=${command.action} AND "idempotencyKey"=${command.idempotencyKey}`;
    if (prior) { if (prior.requestHash !== requestHash) return fail("AGRI_IDEMPOTENCY_CONFLICT"); await assertAgriAuthorityCurrent(tx, authority); return { resourceId: prior.resourceId, duplicate: true }; }
    if (!ctx.workspace.enabled) return fail("AGRI_WORKSPACE_DISABLED");
    const now = await agriDatabaseClock(tx), resourceId = randomUUID(); let expiry: Date | null = null;
    if (command.action === "recordFinalEligibility") {
      const [entry] = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM team_competitions WHERE id=${command.teamCompetitionId} AND "competitionId"=${ctx.workspace.competitionId} FOR UPDATE`;
      if (!entry) return fail("AGRI_ENTRY_NOT_FOUND", 404);
      const [last] = await tx.$queryRaw<Array<{ sequence: number }>>`SELECT COALESCE(max(sequence),0)::integer AS sequence FROM agri_final_decisions WHERE "teamCompetitionId"=${entry.id}`;
      if (last.sequence !== command.expectedSequence) return fail("AGRI_REVISION_CONFLICT");
      await tx.$executeRaw`INSERT INTO agri_final_decisions(id,"competitionId","teamCompetitionId",sequence,state,reason,"sourceReference","actorId","decidedAt") VALUES(${resourceId},${ctx.workspace.competitionId},${entry.id},${last.sequence + 1},${command.state},${command.reason},${command.sourceReference},${actorId},${now})`;
    } else if (command.action === "issueCorrectionPermit") {
      const [stage] = await tx.$queryRaw<Array<{ revision: number; currentSubmissionId: string | null }>>`SELECT revision,"currentSubmissionId" FROM agri_entry_stages WHERE id=${command.entryStageId} AND "competitionId"=${ctx.workspace.competitionId} FOR UPDATE`;
      if (!stage) return fail("AGRI_STAGE_NOT_FOUND", 404);
      if (stage.revision !== command.expectedRevision || stage.currentSubmissionId !== command.previousSubmissionId) return fail("AGRI_REVISION_CONFLICT");
      const [previous] = await tx.$queryRaw<Array<{ ruleVersionId: string }>>`SELECT "ruleVersionId" FROM agri_stage_submissions WHERE id=${command.previousSubmissionId} AND "entryStageId"=${command.entryStageId} AND "competitionId"=${ctx.workspace.competitionId}`;
      if (!previous) return fail("AGRI_SUBMISSION_NOT_FOUND", 404);
      expiry = new Date(command.expiresAt); if (expiry <= now) return fail("AGRI_PERMIT_EXPIRY_INVALID", 422);
      await tx.$executeRaw`INSERT INTO agri_correction_permits(id,"competitionId","entryStageId","previousSubmissionId","ruleVersionId","allowedFields",reason,"authorizedById","authorizedAt","expiresAt") VALUES(${resourceId},${ctx.workspace.competitionId},${command.entryStageId},${command.previousSubmissionId},${previous.ruleVersionId},${command.allowedFields}::text[],${command.reason},${actorId},${now},${expiry})`;
    } else {
      const permit = await correctionPermit(tx, ctx.workspace.competitionId, command.permitId);
      if (!permit) return fail("AGRI_PERMIT_NOT_FOUND", 404);
      if (permit.revokedAt || permit.usedBySubmissionId) return fail("AGRI_PERMIT_INACTIVE");
      await tx.$executeRaw`INSERT INTO agri_correction_permit_events(id,"competitionId","entryStageId","permitId",action,"submissionId","actorId",reason,"createdAt") VALUES(${resourceId},${ctx.workspace.competitionId},${permit.entryStageId},${permit.id},'REVOKE',NULL,${actorId},${command.reason},${now})`;
    }
    await tx.$executeRaw`INSERT INTO agri_decision_receipts(id,"competitionId","actorId",operation,"idempotencyKey","requestHash","resourceId","createdAt") VALUES(${randomUUID()},${ctx.workspace.competitionId},${actorId},${command.action},${command.idempotencyKey},${requestHash},${resourceId},${now})`;
    await tx.auditLog.create({ data: { actorId, action: "AGRI_" + command.action.toUpperCase(), resourceType: "agri_stage_decision", resourceId,
      metadata: { competitionId: ctx.workspace.competitionId } } });
    await assertAgriAuthorityCurrent(tx, authority);
    if (expiry && expiry <= await agriDatabaseClock(tx)) return fail("AGRI_PERMIT_EXPIRY_INVALID", 422);
    return { resourceId, duplicate: false };
  }, { timeout: 15000 });
}
