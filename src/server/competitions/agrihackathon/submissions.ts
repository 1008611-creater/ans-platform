import type { DbTransaction } from "@/lib/db";
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriPrepareStageSchema, agriStageDraftSchema, agriStageSubmissionCommandSchema,
  agriStageSubmissionContentSchema, agriSubmissionListQuerySchema, agriWorksExportQuerySchema, agriSubmissionRequirementsSchema, agriSubmissionVersionsQuerySchema, type AgriSubmissionHistoryItem } from "@/contracts/agri-submissions";
import { agriSubmissionWindowSchema } from "@/contracts/agrihackathon";
import { getAgriSubmissionLifecycleDecision, getAgriSubmissionMaterialIssues, getAgriCorrectionDecision, projectAgriSubmissionFreeze } from "@/domain/competitions/agri-submissions";
import { agriCsv } from "@/domain/competitions/agri-works-export";
import { getAgriWindowState } from "@/domain/competitions/agrihackathon";
import { lockAgriWorkspace, requireAgriScope, assertAgriAuthorityCurrent, agriDatabaseClock, type AgriWorkspaceContext } from "./workspace";
import { finalEligibility, correctionPermit, activeCorrectionPermits, type PermitRow } from "./decisions";

import { bindEvidenceIntents, autoQueueRepositoryEvidence } from "./evidence";
type Tx = DbTransaction;
type StageName = "PRELIMINARY" | "FINAL";
interface Entry { id: string; teamId: string; competitionId: string; entryStatus: string }
interface Stage { id: string; competitionId: string; teamCompetitionId: string; stage: StageName;
  revision: number; draft: unknown; currentSubmissionId: string | null; frozenSubmissionId: string | null; createdAt: Date }
interface Submission { id: string; competitionId: string; entryStageId: string; sequence: number; ruleVersionId: string;
  projectId: string; artifactVersionId: string; repository: unknown; demoUrl: string | null; summary: string; materials: unknown;
  submittedById: string; acceptedAt: Date; officialRosterId: string | null; preliminarySubmissionId: string | null }
interface Receipt { entryStageId: string; requestHash: string; submissionId: string | null; appliedRevision: number }
type Authority = Awaited<ReturnType<typeof requireAgriScope>>;
const fail = (code: string, status = 409): never => { throw new AgriWorkspaceError(code, status); };
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const identifier = z.string().trim().min(1).max(80);
const historyQuery = z.object({ beforeSequence: z.coerce.number().int().min(1).optional() }).strict();
const pageCursor = z.object({ id: identifier, createdAt: z.string().datetime(), competitionId: identifier,
  stage: z.enum(["PRELIMINARY", "FINAL"]).nullable(), scope: z.enum(["team", "staff"]), actorId: identifier, q: z.string().max(120), status: z.enum(["ANY", "SUBMITTED", "NOT_SUBMITTED"]) }).strict();
async function member(tx: Tx, teamId: string, actorId: string, write: boolean) {
  const [row] = await tx.$queryRaw<Array<{ role: string; status: string }>>`SELECT role,status FROM team_members
    WHERE "teamId"=${teamId} AND "userId"=${actorId} FOR SHARE`;
  if (!row || row.status !== "ACTIVE") return fail("AGRI_TEAM_PERMISSION_REQUIRED", 403);
  if (write && !["OWNER", "ADMIN"].includes(row.role)) return fail("AGRI_TEAM_MANAGER_REQUIRED", 403);
}
async function audit(tx: Tx, ctx: AgriWorkspaceContext, action: string, id: string, revision: number, finalDecisionId?: string) {
  await tx.auditLog.create({ data: { actorId: ctx.actorId, action: "AGRI_" + action.toUpperCase(),
    resourceType: "agri_entry_stage", resourceId: id, metadata: { competitionId: ctx.workspace.competitionId, revision, ...(finalDecisionId ? { finalDecisionId } : {}) } } });
}
async function event(tx: Tx, ctx: AgriWorkspaceContext, stage: Stage, action: string, submissionId: string | null, at: Date, finalDecisionId?: string) {
  await tx.$executeRaw`INSERT INTO agri_submission_events (id,"competitionId","entryStageId",revision,action,"submissionId","actorId","createdAt")
    VALUES (${randomUUID()},${stage.competitionId},${stage.id},${stage.revision},${action},${submissionId},${ctx.actorId},${at})`;
  await audit(tx, ctx, action, stage.id, stage.revision, finalDecisionId);
}
/** Locks are always workspace -> actor/grants -> entry -> stage -> membership -> project/artifact/version. */
async function lockTarget(tx: Tx, ctx: AgriWorkspaceContext, id: string, write: boolean) {
  const [candidate] = await tx.$queryRaw<Array<Entry & { entryStageId: string }>>`SELECT tc.id,tc."teamId",tc."competitionId",tc."entryStatus",es.id AS "entryStageId"
    FROM agri_entry_stages es JOIN team_competitions tc ON tc.id=es."teamCompetitionId"
    WHERE es.id=${id} AND es."competitionId"=${ctx.workspace.competitionId}`;
  if (!candidate) return fail("AGRI_STAGE_NOT_FOUND", 404);
  const active = await tx.teamMember.findFirst({ where: { teamId: candidate.teamId, userId: ctx.actorId, status: "ACTIVE" }, select: { id: true } });
  const authorities: Authority[] = [];
  let privateMaterials = Boolean(active);
  if (!active) {
    if (write) return fail("AGRI_TEAM_PERMISSION_REQUIRED", 403);
    authorities.push(await requireAgriScope(tx, ctx, "WORKS_READ"));
    try { authorities.push(await requireAgriScope(tx, ctx, "PRIVATE_MATERIALS_READ")); privateMaterials = true; }
    catch (error) { if (!(error instanceof AgriWorkspaceError) || error.code !== "AGRI_SCOPE_REQUIRED") throw error; }
  }
  const [entry] = await tx.$queryRaw<Entry[]>`SELECT id,"teamId","competitionId","entryStatus" FROM team_competitions
    WHERE id=${candidate.id} AND "competitionId"=${ctx.workspace.competitionId} FOR UPDATE`;
  if (!entry || entry.teamId !== candidate.teamId) return fail("AGRI_STAGE_NOT_FOUND", 404);
  const [stage] = await tx.$queryRaw<Stage[]>`SELECT * FROM agri_entry_stages WHERE id=${id}
    AND "competitionId"=${ctx.workspace.competitionId} AND "teamCompetitionId"=${entry.id} FOR UPDATE`;
  if (!stage) return fail("AGRI_STAGE_NOT_FOUND", 404);
  if (active) await member(tx, entry.teamId, ctx.actorId, write);
  return { entry, stage, authorities, privateMaterials, teamMember: Boolean(active) };
}
async function rule(tx: Tx, competitionId: string, ruleId: string | null, stage: StageName) {
  if (!ruleId) return fail("AGRI_RULES_UNPUBLISHED");
  const [row] = await tx.$queryRaw<Array<{ id: string; requirements: unknown; guidanceMarkdown: string; confirmedById: string; confirmedAt: Date }>>`SELECT id,requirements,"guidanceMarkdown","confirmedById","confirmedAt" FROM agri_rule_versions
    WHERE id=${ruleId} AND "competitionId"=${competitionId}`;
  const [window] = await tx.$queryRaw<Array<{ state: string; opensAt: Date | null; closesAt: Date | null; includesDeadline: boolean | null }>>`
    SELECT state,"opensAt","closesAt","includesDeadline" FROM agri_stage_windows
    WHERE "ruleVersionId"=${ruleId} AND "competitionId"=${competitionId} AND stage=${stage}`;
  if (!row || !window) return fail("AGRI_RULE_INVALID", 500);
  return { id: row.id, guidanceMarkdown: row.guidanceMarkdown, requirements: agriSubmissionRequirementsSchema.parse(row.requirements),
    window: agriSubmissionWindowSchema.parse(window.state === "PENDING"
      ? { stage, state: "PENDING", opensAt: null, closesAt: null }
      : { stage, state: window.state, opensAt: window.opensAt?.toISOString() ?? null,
        closesAt: window.closesAt?.toISOString() ?? null, includesDeadline: window.includesDeadline,
        confirmedById: row.confirmedById, confirmedAt: row.confirmedAt.toISOString() }) };
}
async function priorClosed(tx: Tx, stage: Pick<Stage, "id" | "competitionId" | "stage" | "currentSubmissionId" | "frozenSubmissionId">, now: Date) {
  return (await projectAgriStageFreeze(tx, stage, now)).frozenSubmissionId !== null;
}
/** Effective deadline freeze is a read projection, never a persisted stage transition.
 * Always use the current submission's adopted rule; a replacement publication cannot reopen it. */
export async function projectAgriStageFreeze(tx: Tx, stage: Pick<Stage, "id" | "competitionId" | "stage" | "currentSubmissionId" | "frozenSubmissionId">, now: Date) {
  if (stage.frozenSubmissionId || !stage.currentSubmissionId) return projectAgriSubmissionFreeze(stage, null, now);
  const [prior] = await tx.$queryRaw<Array<{ ruleVersionId: string }>>`SELECT "ruleVersionId" FROM agri_stage_submissions
    WHERE id=${stage.currentSubmissionId} AND "entryStageId"=${stage.id} AND "competitionId"=${stage.competitionId}`;
  if (!prior) return fail("AGRI_STAGE_INVALID", 500);
  return projectAgriSubmissionFreeze(stage, (await rule(tx, stage.competitionId, prior.ruleVersionId, stage.stage)).window, now);
}
async function validateVersions(tx: Tx, ctx: AgriWorkspaceContext, entry: Entry, content: z.infer<typeof agriStageDraftSchema>) {
  const [project] = await tx.$queryRaw<Array<{ ownerId: string; teamId: string | null; status: string }>>`
    SELECT "ownerId","teamId",status FROM projects WHERE id=${content.projectId} FOR SHARE`;
  // A team association does not grant access to another member's private project.
  if (!project || project.ownerId !== ctx.actorId || project.teamId !== entry.teamId || project.status !== "ACTIVE") return fail("AGRI_PROJECT_UNAVAILABLE", 403);
  const versionIds = [...new Set([content.artifactVersionId, ...content.materials.items.flatMap(item => item.kind === "ARTIFACT" ? [item.artifactVersionId] : [])].filter((id): id is string => id !== null))].sort();
  for (const versionId of versionIds) {
    const [target] = await tx.$queryRaw<Array<{ artifactId: string }>>`SELECT v."artifactId" FROM artifact_versions v
      JOIN artifacts a ON a.id=v."artifactId" WHERE v.id=${versionId} AND a."projectId"=${content.projectId}`;
    if (!target) return fail("AGRI_ARTIFACT_UNAVAILABLE", 403);
    const [artifact] = await tx.$queryRaw<Array<{ projectId: string }>>`SELECT "projectId" FROM artifacts WHERE id=${target.artifactId} FOR SHARE`;
    const [version] = await tx.$queryRaw<Array<{ artifactId: string }>>`SELECT "artifactId" FROM artifact_versions WHERE id=${versionId} FOR SHARE`;
    if (!artifact || artifact.projectId !== content.projectId || !version || version.artifactId !== target.artifactId) return fail("AGRI_ARTIFACT_UNAVAILABLE", 403);
  }
}
interface RosterRow { id: string; projectId: string; confirmedById: string; confirmedAt: Date; memberUserIds: string[] }
async function officialRoster(tx: Tx, entryId: string) {
  const [row] = await tx.$queryRaw<RosterRow[]>`SELECT * FROM agri_official_rosters WHERE "teamCompetitionId"=${entryId}`;
  return row ?? null;
}
async function rosterMembers(tx: Tx, rosterId: string) {
  return tx.$queryRaw<Array<{ userId: string; username: string; name: string | null }>>`
    SELECT "userId",username,name FROM agri_official_roster_members WHERE "rosterId"=${rosterId} ORDER BY "userId"`;
}
async function preliminaryBaseline(tx: Tx, entry: Entry, now: Date) {
  const [prelim] = await tx.$queryRaw<Stage[]>`SELECT * FROM agri_entry_stages
    WHERE "teamCompetitionId"=${entry.id} AND "competitionId"=${entry.competitionId} AND stage='PRELIMINARY' FOR UPDATE`;
  if (!prelim) return null;
  const freeze = await projectAgriStageFreeze(tx, prelim, now);
  if (!freeze.frozenSubmissionId) return null;
  const [baseline] = await tx.$queryRaw<Submission[]>`SELECT * FROM agri_stage_submissions
    WHERE id=${freeze.frozenSubmissionId} AND "entryStageId"=${prelim.id} AND "competitionId"=${entry.competitionId}`;
  return baseline ?? null;
}
async function ensureOfficialIdentity(tx: Tx, ctx: AgriWorkspaceContext, entry: Entry, stage: Stage,
  projectId: string, selectedIds: string[] | undefined, now: Date) {
  let roster = await officialRoster(tx, entry.id);
  if (!roster) {
    const [history] = await tx.$queryRaw<Array<{ exists: boolean }>>`SELECT EXISTS (SELECT 1 FROM agri_stage_submissions s
      JOIN agri_entry_stages es ON es.id=s."entryStageId" WHERE es."teamCompetitionId"=${entry.id}) AS exists`;
    if (history.exists) return fail("AGRI_LEGACY_ROSTER_REQUIRED");
    if (stage.stage === "FINAL") return fail("AGRI_PRELIMINARY_BASELINE_REQUIRED");
    if (!selectedIds) return fail("AGRI_ROSTER_REQUIRED", 422);
    const ids = [...selectedIds].sort();
    if (!ids.includes(ctx.actorId)) return fail("AGRI_ROSTER_ACTOR_REQUIRED", 422);
    // Hold both accounts and membership rows in stable ID order through commit.
    const accounts = await tx.$queryRaw<Array<{ userId: string; username: string; name: string | null }>>`
      SELECT u.id AS "userId",u.username,u.name FROM users u JOIN team_members tm ON tm."userId"=u.id
      WHERE u.id=ANY(${ids}::text[]) AND NOT u.flagged AND u."deletedAt" IS NULL AND tm."teamId"=${entry.teamId}
        AND tm.status='ACTIVE' ORDER BY u.id FOR SHARE OF u,tm`;
    if (accounts.length !== ids.length) return fail("AGRI_ROSTER_MEMBER_UNAVAILABLE", 422);
    const conflicts = await tx.$queryRaw<Array<{ userId: string }>>`SELECT "userId" FROM agri_official_roster_members
      WHERE "competitionId"=${entry.competitionId} AND "userId"=ANY(${ids}::text[])`;
    if (conflicts.length) return fail("AGRI_ROSTER_MEMBER_CONFLICT");
    roster = { id: randomUUID(), projectId, confirmedById: ctx.actorId, confirmedAt: now, memberUserIds: ids };
    await tx.$executeRaw`INSERT INTO agri_official_rosters (id,"competitionId","teamCompetitionId","projectId","memberUserIds","confirmedById","confirmedAt")
      VALUES (${roster.id},${entry.competitionId},${entry.id},${projectId},${JSON.stringify(ids)}::jsonb,${ctx.actorId},${now})`;
    for (const account of accounts) await tx.$executeRaw`INSERT INTO agri_official_roster_members ("rosterId","competitionId","userId",username,name)
      VALUES (${roster.id},${entry.competitionId},${account.userId},${account.username},${account.name})`;
    await tx.auditLog.create({ data: { actorId: ctx.actorId, action: "AGRI_CONFIRM_OFFICIAL_ROSTER", resourceType: "agri_official_roster",
      resourceId: roster.id, metadata: { competitionId: entry.competitionId, teamCompetitionId: entry.id, projectId, memberCount: ids.length } } });
  } else {
    if (selectedIds && JSON.stringify([...selectedIds].sort()) !== JSON.stringify(roster.memberUserIds)) return fail("AGRI_ROSTER_CHANGE_FORBIDDEN");
    if (roster.projectId !== projectId) return fail("AGRI_ROSTER_PROJECT_MISMATCH");
    if (!roster.memberUserIds.includes(ctx.actorId)) return fail("AGRI_ROSTER_ACTOR_REQUIRED", 403);
    const accounts = await tx.$queryRaw<Array<{ id: string; flagged: boolean; deletedAt: Date | null }>>`
      SELECT id,flagged,"deletedAt" FROM users WHERE id=ANY(${roster.memberUserIds}::text[]) ORDER BY id FOR SHARE`;
    if (accounts.length !== roster.memberUserIds.length || accounts.some(row => row.flagged || row.deletedAt)) return fail("AGRI_ROSTER_MEMBER_UNAVAILABLE", 422);
  }
  const baseline = stage.stage === "FINAL" ? await preliminaryBaseline(tx, entry, now) : null;
  if (stage.stage === "FINAL") {
    if (!baseline?.officialRosterId) return fail("AGRI_PRELIMINARY_BASELINE_REQUIRED");
    if (baseline.projectId !== projectId || baseline.officialRosterId !== roster.id) return fail("AGRI_FINAL_PROJECT_MISMATCH");
    const [existing] = await tx.$queryRaw<Array<{ preliminarySubmissionId: string | null }>>`SELECT "preliminarySubmissionId"
      FROM agri_stage_submissions WHERE "entryStageId"=${stage.id} ORDER BY sequence LIMIT 1`;
    if (existing && existing.preliminarySubmissionId !== baseline.id) return fail("AGRI_FINAL_BASELINE_CHANGE_FORBIDDEN");
  }
  return { rosterId: roster.id, preliminarySubmissionId: baseline?.id ?? null };
}
export async function prepareAgriStage(actorId: string, raw: unknown) {
  const command = agriPrepareStageSchema.parse(raw);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId);
    if (!ctx.workspace.enabled) return fail("AGRI_WORKSPACE_DISABLED");
    const [entry] = await tx.$queryRaw<Entry[]>`SELECT id,"teamId","competitionId","entryStatus" FROM team_competitions
      WHERE id=${command.teamCompetitionId} AND "competitionId"=${ctx.workspace.competitionId} FOR UPDATE`;
    if (!entry) return fail("AGRI_ENTRY_NOT_FOUND", 404);
    const [prior] = await tx.$queryRaw<Stage[]>`SELECT * FROM agri_entry_stages WHERE "teamCompetitionId"=${entry.id} AND stage=${command.stage} FOR UPDATE`;
    await member(tx, entry.teamId, actorId, true);
    if (prior) return { entryStageId: prior.id, appliedRevision: prior.revision, duplicate: true };
    const id = randomUUID(), now = await agriDatabaseClock(tx);
    await tx.$executeRaw`INSERT INTO agri_entry_stages (id,"competitionId","teamCompetitionId",stage,"createdAt","updatedAt")
      VALUES (${id},${ctx.workspace.competitionId},${entry.id},${command.stage},${now},${now})`;
    await audit(tx, ctx, "prepareStage", id, 1);
    return { entryStageId: id, appliedRevision: 1, duplicate: false };
  }, { timeout: 15000 });
}
export async function executeAgriSubmissionCommand(actorId: string, raw: unknown) {
  const command = agriStageSubmissionCommandSchema.parse(raw);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId);
    const target = await lockTarget(tx, ctx, command.entryStageId, true), stage = target.stage;
    const [receipt] = await tx.$queryRaw<Receipt[]>`SELECT "entryStageId","requestHash","submissionId","appliedRevision" FROM agri_submission_receipts
      WHERE "competitionId"=${ctx.workspace.competitionId} AND "actorId"=${actorId} AND operation=${command.action} AND "idempotencyKey"=${command.idempotencyKey}`;
    if (receipt) {
      if (receipt.requestHash !== hash(command) || receipt.entryStageId !== stage.id) return fail("AGRI_IDEMPOTENCY_CONFLICT");
      return { entryStageId: stage.id, submissionId: receipt.submissionId, appliedRevision: receipt.appliedRevision, duplicate: true };
    }
    if (!ctx.workspace.enabled) return fail("AGRI_WORKSPACE_DISABLED");
    if (target.entry.entryStatus === "REJECTED") return fail("AGRI_TEAM_PERMISSION_REQUIRED", 403);
    if (stage.revision !== command.expectedRevision) return fail("AGRI_REVISION_CONFLICT");
    const content = command.action === "saveDraft" ? command.draft : command.content;
    await validateVersions(tx, ctx, target.entry, content);
    const priorStage = { ...stage };
    const now = await agriDatabaseClock(tx);
    if (command.action !== "correctSubmission" && await priorClosed(tx, stage, now)) return fail("AGRI_FROZEN");
    const eligibility = await finalEligibility(tx, stage.competitionId, target.entry.id);
    let permit: PermitRow | undefined;
    let previousContent: unknown;
    if (command.action === "correctSubmission") {
      permit = await correctionPermit(tx, stage.competitionId, command.correctionPermitId);
      if (!permit || permit.previousSubmissionId !== stage.currentSubmissionId || command.previousSubmissionId !== stage.currentSubmissionId) return fail("AGRI_PERMIT_MISMATCH");
      const [previous] = await tx.$queryRaw<Submission[]>`SELECT * FROM agri_stage_submissions WHERE id=${command.previousSubmissionId} AND "entryStageId"=${stage.id} AND "competitionId"=${stage.competitionId}`;
      if (!previous) return fail("AGRI_SUBMISSION_NOT_FOUND", 404);
      previousContent = { projectId: previous.projectId, artifactVersionId: previous.artifactVersionId, repository: previous.repository, demoUrl: previous.demoUrl, summary: previous.summary, materials: previous.materials };
      if (command.expectedRuleVersionId !== previous.ruleVersionId || permit.ruleVersionId !== previous.ruleVersionId) return fail("AGRI_RULE_VERSION_CONFLICT");
    }
    let adopted: Awaited<ReturnType<typeof rule>> | null = null;
    const decision = (at: Date) => {
      if (command.action === "correctSubmission") {
        if (!permit) return fail("AGRI_PERMIT_NOT_FOUND", 404);
        const result = getAgriCorrectionDecision({ id: permit.id, competitionId: permit.competitionId, entryStageId: permit.entryStageId, previousSubmissionId: permit.previousSubmissionId, reason: permit.reason, authorizedById: permit.authorizedById, usedBySubmissionId: permit.usedBySubmissionId, authorizedAt: permit.authorizedAt.toISOString(), expiresAt: permit.expiresAt.toISOString(), revokedAt: permit.revokedAt?.toISOString() ?? null,
          allowedFields: permit.allowedFields }, { competitionId: stage.competitionId, entryStageId: stage.id, previousSubmissionId: command.previousSubmissionId, permitId: command.correctionPermitId }, previousContent, command.content, at);
        if (!result.allowed) return fail("AGRI_" + result.reason);
        return;
      }
      if (!adopted || command.action !== "submit") return;
      const result = getAgriSubmissionLifecycleDecision({ competitionId: stage.competitionId, workspaceEnabled: ctx.workspace.enabled,
        entry: { id: stage.id, competitionId: stage.competitionId, stage: stage.stage, revision: command.expectedRevision, frozenSubmissionId: stage.frozenSubmissionId },
        publishedRuleVersionId: ctx.workspace.publishedRuleVersionId, rule: { id: adopted.id, competitionId: stage.competitionId, window: adopted.window },
        finalEligibility: eligibility }, command, at);
      if (result !== "ALLOW") return fail("AGRI_" + result);
    };
    let submissionId: string | null = null;
    if (command.action !== "saveDraft") {
      adopted = await rule(tx, stage.competitionId, command.action === "correctSubmission" ? permit!.ruleVersionId : ctx.workspace.publishedRuleVersionId, stage.stage);
      decision(now);
      const issues = getAgriSubmissionMaterialIssues(adopted.requirements, command.content);
      if (issues.length) return fail("AGRI_" + issues[0].code, 422);
      const identity = await ensureOfficialIdentity(tx, ctx, target.entry, stage, content.projectId,
        command.action === "submit" ? command.officialMemberIds : undefined, now);
      const [last] = await tx.$queryRaw<Array<{ sequence: number }>>`SELECT COALESCE(max(sequence),0)::integer AS sequence FROM agri_stage_submissions WHERE "entryStageId"=${stage.id}`;
      submissionId = randomUUID();
      await tx.$executeRaw`INSERT INTO agri_stage_submissions (id,"competitionId","entryStageId",sequence,"ruleVersionId","projectId","artifactVersionId",repository,"demoUrl",summary,materials,"submittedById","acceptedAt","officialRosterId","preliminarySubmissionId")
        VALUES (${submissionId},${stage.competitionId},${stage.id},${last.sequence + 1},${adopted.id},${content.projectId},${content.artifactVersionId},
          ${content.repository ? JSON.stringify(content.repository) : null}::jsonb,${content.demoUrl},${content.summary},${JSON.stringify(content.materials)}::jsonb,${actorId},${now},${identity.rosterId},${identity.preliminarySubmissionId})`;
      for (const material of content.materials.items) if (material.kind === "ARTIFACT") {
        await tx.$executeRaw`INSERT INTO agri_submission_material_refs (id,"competitionId","entryStageId","submissionId",key,"artifactVersionId")
          VALUES (${randomUUID()},${stage.competitionId},${stage.id},${submissionId},${material.key},${material.artifactVersionId})`;
      }
      if (command.action === "correctSubmission") {
        await tx.$executeRaw`INSERT INTO agri_submission_corrections("submissionId","competitionId","entryStageId","previousSubmissionId","permitId") VALUES(${submissionId},${stage.competitionId},${stage.id},${command.previousSubmissionId},${command.correctionPermitId})`;
        await tx.$executeRaw`INSERT INTO agri_correction_permit_events(id,"competitionId","entryStageId","permitId",action,"submissionId","actorId",reason,"createdAt") VALUES(${randomUUID()},${stage.competitionId},${stage.id},${command.correctionPermitId},'USE',${submissionId},${actorId},${permit!.reason},${now})`;
        stage.frozenSubmissionId ??= stage.currentSubmissionId;
      }
      if (command.evidenceIntentIds?.length) await bindEvidenceIntents(tx, ctx, command.evidenceIntentIds, submissionId);
      await autoQueueRepositoryEvidence(tx, ctx, stage.id, submissionId, command.content.projectId, command.content.artifactVersionId, command.content.repository, now);
      stage.currentSubmissionId = submissionId;
    }
    stage.revision++;
    await tx.$executeRaw`UPDATE agri_entry_stages SET draft=${command.action === "saveDraft" ? JSON.stringify(content) : null}::jsonb,
      "currentSubmissionId"=${stage.currentSubmissionId},"frozenSubmissionId"=${stage.frozenSubmissionId},revision=${stage.revision},"updatedAt"=${now} WHERE id=${stage.id}`;
    await event(tx, ctx, stage, command.action, submissionId, now, command.action === "submit" && stage.stage === "FINAL" && eligibility.state === "ELIGIBLE" ? eligibility.sourceId : undefined);
    await tx.$executeRaw`INSERT INTO agri_submission_receipts (id,"competitionId","entryStageId","actorId",operation,"idempotencyKey","requestHash","submissionId","appliedRevision","createdAt")
      VALUES (${randomUUID()},${stage.competitionId},${stage.id},${actorId},${command.action},${command.idempotencyKey},${hash(command)},${submissionId},${stage.revision},${now})`;
    // Time can advance while writing, even with account and row locks held.
    const end = await agriDatabaseClock(tx); decision(end);
    if (command.action !== "correctSubmission" && await priorClosed(tx, priorStage, end)) return fail("AGRI_FROZEN");
    if (command.action === "saveDraft" && await priorClosed(tx, stage, end)) return fail("AGRI_FROZEN");
    return { entryStageId: stage.id, submissionId, appliedRevision: stage.revision, duplicate: false };
  }, { timeout: 15000 });
}
function projectSubmission(row: Submission, privateMaterials: boolean): AgriSubmissionHistoryItem {
  const base = { id: row.id, entryStageId: row.entryStageId, sequence: row.sequence, ruleVersionId: row.ruleVersionId, acceptedAt: row.acceptedAt.toISOString() };
  if (!privateMaterials) return base;
  return { ...base, officialRosterId: row.officialRosterId, preliminarySubmissionId: row.preliminarySubmissionId, submittedById: row.submittedById, content: agriStageSubmissionContentSchema.parse({ projectId: row.projectId,
    artifactVersionId: row.artifactVersionId, repository: row.repository, demoUrl: row.demoUrl, summary: row.summary, materials: row.materials }) };
}
export async function readAgriStage(actorId: string, rawId: string, rawQuery: unknown = {}) {
  const id = identifier.parse(rawId), query = historyQuery.parse(rawQuery);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId), target = await lockTarget(tx, ctx, id, false), stage = target.stage;
    const rows = await tx.$queryRaw<Submission[]>`SELECT * FROM agri_stage_submissions WHERE "entryStageId"=${id} AND "competitionId"=${stage.competitionId}
      AND (${query.beforeSequence ?? null}::integer IS NULL OR sequence < ${query.beforeSequence ?? null}::integer) ORDER BY sequence DESC LIMIT 31`;
    const [current] = stage.currentSubmissionId ? await tx.$queryRaw<Submission[]>`SELECT * FROM agri_stage_submissions WHERE id=${stage.currentSubmissionId} AND "entryStageId"=${id}` : [];
    const permits = target.teamMember ? await activeCorrectionPermits(tx, stage.competitionId, stage.id, stage.currentSubmissionId, await agriDatabaseClock(tx)) : [];
    const correctionRule = permits[0] ? await rule(tx, stage.competitionId, permits[0].ruleVersionId, stage.stage) : null;
    const eligibility = await finalEligibility(tx, stage.competitionId, target.entry.id);
    const publishedRule = ctx.workspace.publishedRuleVersionId ? await rule(tx, stage.competitionId, ctx.workspace.publishedRuleVersionId, stage.stage) : null;
    const corrections = await tx.$queryRaw<Array<{ submissionId: string; previousSubmissionId: string; permitId: string; reason: string }>>`SELECT c."submissionId",c."previousSubmissionId",c."permitId",p.reason FROM agri_submission_corrections c JOIN agri_correction_permits p ON p.id=c."permitId" WHERE c."entryStageId"=${stage.id} AND c."competitionId"=${stage.competitionId} AND c."submissionId"=ANY(${[...new Set([...rows.map(row => row.id), ...(current ? [current.id] : [])])]}::text[])`;
    const project = (row: Submission) => { const correction = corrections.find(item => item.submissionId === row.id); return { ...projectSubmission(row, target.privateMaterials), ...(correction ? { correction: { previousSubmissionId: correction.previousSubmissionId, permitId: correction.permitId, reason: correction.reason } } : {}) }; };
    const serverNow = await agriDatabaseClock(tx);
    const freeze = await projectAgriStageFreeze(tx, stage, serverNow);
    const roster = target.privateMaterials ? await officialRoster(tx, target.entry.id) : null;
    const members = roster ? await rosterMembers(tx, roster.id) : [];
    const choices = target.teamMember && !roster ? await tx.$queryRaw<Array<{ userId: string; username: string; name: string | null }>>`
      SELECT u.id AS "userId",u.username,u.name FROM users u JOIN team_members tm ON tm."userId"=u.id
      WHERE tm."teamId"=${target.entry.teamId} AND tm.status='ACTIVE' AND NOT u.flagged AND u."deletedAt" IS NULL
      ORDER BY u.username,u.id` : [];
    const baseline = target.privateMaterials && stage.stage === "FINAL" ? await preliminaryBaseline(tx, target.entry, serverNow) : null;
    const [legacy] = target.privateMaterials && !roster ? await tx.$queryRaw<Array<{ exists: boolean }>>`SELECT EXISTS (
      SELECT 1 FROM agri_stage_submissions s JOIN agri_entry_stages es ON es.id=s."entryStageId" WHERE es."teamCompetitionId"=${target.entry.id}) AS exists` : [];
    const [wallRow] = target.teamMember ? await tx.$queryRaw<Array<{ id: string; listingId: string; projectId: string; artifactVersionId: string; published: boolean; synchronized: boolean; isOwner: boolean; slug: string }>>`
      SELECT w.id,w."listingId",w."projectId",w."artifactVersionId",l.slug,
        (l.status='PUBLISHED' AND NOT u.flagged AND u."deletedAt" IS NULL AND lv."reviewedAt" IS NOT NULL AND lv.payload->>'category'='competition' AND lv.payload->>'subcategory'='agri-wall') AS published,
        (w."listingVersion"=l."publishedVersion") AS synchronized,(p."ownerId"=${actorId}) AS "isOwner"
      FROM agri_wall_entries w JOIN market_listings l ON l.id=w."listingId" JOIN users u ON u.id=l."sellerId" JOIN projects p ON p.id=w."projectId"
      LEFT JOIN market_listing_versions lv ON lv."listingId"=l.id AND lv.version=l."publishedVersion"
      WHERE w."teamCompetitionId"=${target.entry.id} AND w."competitionId"=${stage.competitionId}` : [];
    await assertAgriAuthorityCurrent(tx, ...target.authorities);
    return { competitionId: stage.competitionId, id, teamCompetitionId: stage.teamCompetitionId, stage: stage.stage, revision: stage.revision,
      ...freeze, workspaceEnabled: ctx.workspace.enabled, hasPrivateMaterials: target.privateMaterials,
      ...(target.teamMember ? { wall: wallRow ? { id: wallRow.id, listingId: wallRow.listingId, projectId: wallRow.projectId, artifactVersionId: wallRow.artifactVersionId, published: Boolean(wallRow.published), synchronized: Boolean(wallRow.synchronized), isOwner: wallRow.isOwner, href: "/market/" + wallRow.slug } : null } : {}),
      ...(target.privateMaterials ? { officialRoster: roster ? { id: roster.id, projectId: roster.projectId, confirmedAt: roster.confirmedAt.toISOString(),
        confirmedById: roster.confirmedById, members } : null, officialMemberChoices: choices, legacyRosterRequired: legacy?.exists ?? false,
        preliminaryBaseline: baseline?.officialRosterId ? { submissionId: baseline.id, projectId: baseline.projectId } : null } : {}),
      draft: target.teamMember && stage.draft !== null ? agriStageDraftSchema.parse(stage.draft) : null,
      current: current ? project(current) : null,
      history: rows.slice(0, 30).map(project),
      nextBeforeSequence: rows.length > 30 ? rows[29].sequence : null, publishedRule, correctionPermits: permits, correctionRule, finalEligibility: eligibility,
      windowState: publishedRule ? getAgriWindowState(publishedRule.window, serverNow) : "RULES_PENDING", serverNow: serverNow.toISOString() };
  }, { timeout: 15000 });
}
async function optionalScope(tx: Tx, ctx: AgriWorkspaceContext, scope: "EXPORT" | "PRIVATE_MATERIALS_READ") {
  try { return await requireAgriScope(tx, ctx, scope); }
  catch (error) { if (error instanceof AgriWorkspaceError && error.code === "AGRI_SCOPE_REQUIRED") return null; throw error; }
}
function stageFilter(competitionId: string, actorId: string, query: z.infer<typeof agriSubmissionListQuerySchema>) {
  return Prisma.sql`es."competitionId"=${competitionId}
    AND (${query.stage ?? null}::text IS NULL OR es.stage=${query.stage ?? null}::text)
    AND (${query.scope === "staff"} OR EXISTS (SELECT 1 FROM team_members tm WHERE tm."teamId"=tc."teamId" AND tm."userId"=${actorId} AND tm.status='ACTIVE'))
    AND (${query.q}='' OR strpos(lower(t.name),lower(${query.q}))>0)
    AND (${query.status}='ANY' OR (${query.status}='SUBMITTED' AND es."currentSubmissionId" IS NOT NULL)
      OR (${query.status}='NOT_SUBMITTED' AND es."currentSubmissionId" IS NULL))`;
}
export async function listAgriStages(actorId: string, rawQuery: unknown = {}) {
  const query = agriSubmissionListQuerySchema.parse(rawQuery);
  let cursor: z.infer<typeof pageCursor> | null = null;
  if (query.cursor) { try { cursor = pageCursor.parse(JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8"))); } catch { return fail("INVALID_CURSOR", 400); } }
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId), competitionId = ctx.workspace.competitionId;
    if (cursor && (cursor.competitionId !== competitionId || cursor.stage !== (query.stage ?? null) || cursor.scope !== query.scope ||
      cursor.actorId !== actorId || cursor.q !== query.q || cursor.status !== query.status)) return fail("INVALID_CURSOR", 400);
    const authority = query.scope === "staff" ? await requireAgriScope(tx, ctx, "WORKS_READ") : null;
    const exportAuthority = query.scope === "staff" ? await optionalScope(tx, ctx, "EXPORT") : null;
    const privateAuthority = query.scope === "staff" ? await optionalScope(tx, ctx, "PRIVATE_MATERIALS_READ") : null;
    if (query.scope === "team") await tx.$queryRaw`SELECT id FROM team_members WHERE "userId"=${actorId} ORDER BY id FOR SHARE`;
    const rows = await tx.$queryRaw<Array<Omit<Stage, "draft" | "competitionId"> & { teamId: string; teamName: string; checkId: string | null; checkResult: "PASS" | "NEEDS_ACTION" | "UNREACHABLE" | null; checkedAt: Date | null; evidenceSummary: { stored: number; pending: number; failed: number; cancelled: number; late: number }; latestRepo: { id: string; fileName: string; sha256: string; byteLength: number } | null }>>`
      SELECT es.id,es."teamCompetitionId",es.stage,es.revision,es."currentSubmissionId",es."frozenSubmissionId",es."createdAt",tc."teamId",t.name AS "teamName",ch.id AS "checkId",ch.result AS "checkResult",ch."checkedAt",ev.summary AS "evidenceSummary",repo.obj AS "latestRepo"
      FROM agri_entry_stages es JOIN team_competitions tc ON tc.id=es."teamCompetitionId" JOIN teams t ON t.id=tc."teamId"
      LEFT JOIN LATERAL (SELECT id,result,"checkedAt" FROM agri_technical_checks WHERE "competitionId"=es."competitionId" AND "submissionId"=es."currentSubmissionId" ORDER BY "checkedAt" DESC,id DESC LIMIT 1) ch ON true
      LEFT JOIN LATERAL (SELECT jsonb_build_object(
        'stored',count(o.id)::integer,
        'pending',count(*) FILTER (WHERE r.state IN ('PREPARED','QUEUED','RUNNING','UPLOADED','RESOLVED','RETRY_WAIT'))::integer,
        'failed',count(*) FILTER (WHERE r.state IN ('FAILED','NEEDS_REVIEW'))::integer,
        'cancelled',count(*) FILTER (WHERE r.state='CANCELLED')::integer,
        'late',count(*) FILTER (WHERE o.descriptor->>'temporalStatus'='CAPTURED_AFTER_DEADLINE')::integer) AS summary
        FROM agri_evidence_requests r LEFT JOIN agri_evidence_objects o ON o."requestId"=r.id
        WHERE r."competitionId"=es."competitionId" AND r."submissionId"=es."currentSubmissionId") ev ON true
      LEFT JOIN LATERAL (SELECT jsonb_build_object(
        'id',o.id,'fileName',r."fileName",'sha256',o.sha256,'byteLength',o."byteLength") AS obj
        FROM agri_evidence_requests r JOIN agri_evidence_objects o ON o."requestId"=r.id
        WHERE r."competitionId"=es."competitionId" AND r."submissionId"=es."currentSubmissionId" AND r.kind='REPOSITORY'
        ORDER BY o."capturedAt" DESC,o.id DESC LIMIT 1) repo ON true
      WHERE ${stageFilter(competitionId, actorId, query)}
      AND (${cursor?.id ?? null}::text IS NULL OR (es."createdAt",es.id)<(${cursor ? new Date(cursor.createdAt) : null}::timestamptz,${cursor?.id ?? null}::text))
      ORDER BY es."createdAt" DESC,es.id DESC LIMIT 31`;
    const page = rows.slice(0, 30), last = page.at(-1);
    const now = await agriDatabaseClock(tx);
    const projected = await Promise.all(page.map(async row => ({ row, freeze: await projectAgriStageFreeze(tx, { ...row, competitionId }, now) })));
    await assertAgriAuthorityCurrent(tx, authority, exportAuthority, privateAuthority);
    return { competitionId, stages: projected.map(({ row, freeze }) => ({ id: row.id, teamCompetitionId: row.teamCompetitionId, teamId: row.teamId, teamName: row.teamName, stage: row.stage, revision: row.revision, currentSubmissionId: row.currentSubmissionId, ...freeze, latestTechnicalCheck: row.checkId && row.checkResult && row.checkedAt ? { id: row.checkId, result: row.checkResult, checkedAt: row.checkedAt.toISOString() } : null, evidenceSummary: row.currentSubmissionId ? row.evidenceSummary : null, ...(privateAuthority && row.latestRepo ? { latestRepositoryObject: row.latestRepo } : {}) })),
      canExport: !!exportAuthority, hasPrivateMaterials: !!privateAuthority,
      nextCursor: rows.length > 30 && last ? Buffer.from(JSON.stringify({ id: last.id,
        createdAt: last.createdAt.toISOString(), competitionId, stage: query.stage ?? null, scope: query.scope,
        actorId, q: query.q, status: query.status })).toString("base64url") : null };
  }, { timeout: 15000 });
}
/** A bounded, permission-rechecked snapshot of every matching stage, never only a UI page or team drafts. */
export async function exportAgriWorks(actorId: string, rawQuery: unknown = {}) {
  const query = agriWorksExportQuerySchema.parse(rawQuery);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId);
    const authority = await requireAgriScope(tx, ctx, "WORKS_READ"), exportAuthority = await requireAgriScope(tx, ctx, "EXPORT");
    const privateAuthority = query.mode === "materials" ? await requireAgriScope(tx, ctx, "PRIVATE_MATERIALS_READ") : null;
    const rows = await tx.$queryRaw<Array<{ id: string; teamId: string; teamCompetitionId: string; teamName: string; stage: StageName;
      revision: number; frozenSubmissionId: string | null; currentSubmissionId: string | null; sequence: number | null;
      ruleVersionId: string | null; acceptedAt: Date | null; content: unknown;
      adoptedSubmissionId: string | null; adoptedRuleId: string | null; windowState: string | null;
      windowOpensAt: Date | null; windowClosesAt: Date | null; windowIncludesDeadline: boolean | null;
      ruleConfirmedById: string | null; ruleConfirmedAt: Date | null }>>`
      SELECT es.id,tc."teamId",es."teamCompetitionId",t.name AS "teamName",es.stage,es.revision,es."frozenSubmissionId",es."currentSubmissionId",
        sub.sequence,sub."ruleVersionId",sub."acceptedAt",sub.id AS "adoptedSubmissionId",rv.id AS "adoptedRuleId",
        w.state AS "windowState",w."opensAt" AS "windowOpensAt",w."closesAt" AS "windowClosesAt",w."includesDeadline" AS "windowIncludesDeadline",
        rv."confirmedById" AS "ruleConfirmedById",rv."confirmedAt" AS "ruleConfirmedAt",
        CASE WHEN ${query.mode === "materials"} AND sub.id IS NOT NULL THEN jsonb_build_object(
          'projectId',sub."projectId",'artifactVersionId',sub."artifactVersionId",'repository',sub.repository,
          'demoUrl',sub."demoUrl",'summary',sub.summary,'materials',sub.materials) ELSE NULL END AS content
      FROM agri_entry_stages es JOIN team_competitions tc ON tc.id=es."teamCompetitionId" JOIN teams t ON t.id=tc."teamId"
      LEFT JOIN agri_stage_submissions sub ON sub.id=es."currentSubmissionId" AND sub."entryStageId"=es.id AND sub."competitionId"=es."competitionId"
      LEFT JOIN agri_rule_versions rv ON rv.id=sub."ruleVersionId" AND rv."competitionId"=es."competitionId"
      LEFT JOIN agri_stage_windows w ON w."ruleVersionId"=rv.id AND w."competitionId"=es."competitionId" AND w.stage=es.stage
      WHERE ${stageFilter(ctx.workspace.competitionId, actorId, { ...query, scope: "staff" })}
      ORDER BY es."createdAt" DESC,es.id DESC LIMIT 5001`;
    if (rows.length > 5000) return fail("AGRI_EXPORT_TOO_LARGE", 422);
    const now = await agriDatabaseClock(tx);
    const ids = rows.flatMap(row => row.currentSubmissionId ? [row.currentSubmissionId] : []);
    const evidenceRows = ids.length ? await tx.$queryRaw<Array<{submissionId:string; states:unknown}>>`SELECT "submissionId",jsonb_object_agg(state,total) AS states FROM (SELECT "submissionId",state,count(*)::integer AS total FROM agri_evidence_requests WHERE "submissionId"=ANY(${ids}::text[]) AND "competitionId"=${ctx.workspace.competitionId} GROUP BY "submissionId",state) counted GROUP BY "submissionId"` : [];
    const evidenceBySubmission = new Map(evidenceRows.map(row => [row.submissionId,row.states]));
    const manifests = query.mode === "materials" && ids.length ? await tx.$queryRaw<Array<{submissionId:string; id:string; sha256:string; canonicalJSON:string}>>`SELECT DISTINCT ON ("submissionId") "submissionId",id,sha256,"canonicalJSON" FROM agri_evidence_manifests WHERE "submissionId"=ANY(${ids}::text[]) AND "competitionId"=${ctx.workspace.competitionId} ORDER BY "submissionId",sequence DESC` : [];
    const manifestBySubmission = new Map(manifests.map(row => [row.submissionId,row]));
    const head = ["source", "exported_at_utc", "competition_id", "scope", "stage_filter", "status_filter", "team_query", "team_id", "team_name", "entry_id", "stage_id", "stage", "revision", "current_submission_id", "sequence", "rule_version_id", "accepted_at_utc", "recorded_frozen_submission_id"];
    if (query.mode === "materials") head.push("project_id", "artifact_version_id", "summary", "repository_url", "repository_ref_kind", "repository_ref", "demo_url", "materials_json");
    // Append to preserve every existing metadata/material column position and meaning.
    head.push("effective_frozen_submission_id", "frozen_by_deadline", "evidence_states_json");
    if (query.mode === "materials") head.push("evidence_manifest_id", "evidence_manifest_sha256", "evidence_descriptors_json");
    const csv = agriCsv([head, ...rows.map(row => {
      let adoptedWindow: unknown = null;
      if (!row.frozenSubmissionId && row.currentSubmissionId) {
        if (!row.adoptedSubmissionId) return fail("AGRI_STAGE_INVALID", 500);
        if (!row.adoptedRuleId || !row.windowState) return fail("AGRI_RULE_INVALID", 500);
        adoptedWindow = agriSubmissionWindowSchema.parse(row.windowState === "PENDING"
          ? { stage: row.stage, state: "PENDING", opensAt: row.windowOpensAt?.toISOString() ?? null, closesAt: row.windowClosesAt?.toISOString() ?? null }
          : { stage: row.stage, state: row.windowState, opensAt: row.windowOpensAt?.toISOString() ?? null,
            closesAt: row.windowClosesAt?.toISOString() ?? null, includesDeadline: row.windowIncludesDeadline,
            confirmedById: row.ruleConfirmedById, confirmedAt: row.ruleConfirmedAt?.toISOString() ?? null });
      }
      const freeze = projectAgriSubmissionFreeze(row, adoptedWindow, now);
      const cells: unknown[] = ["ANS agri stage submissions snapshot", now.toISOString(), ctx.workspace.competitionId, query.mode,
        query.stage ?? "ALL", query.status, query.q, row.teamId, row.teamName, row.teamCompetitionId, row.id, row.stage, row.revision,
        row.currentSubmissionId, row.sequence, row.ruleVersionId, row.acceptedAt?.toISOString(), row.frozenSubmissionId];
      if (query.mode === "materials") {
        const content = row.content == null ? null : agriStageSubmissionContentSchema.parse(row.content);
        cells.push(content?.projectId, content?.artifactVersionId, content?.summary, content?.repository?.url,
          content?.repository?.ref?.kind, content?.repository?.ref?.value, content?.demoUrl, content ? JSON.stringify(content.materials) : null);
      }
      cells.push(freeze.frozenSubmissionId, freeze.frozenByDeadline, JSON.stringify(evidenceBySubmission.get(row.currentSubmissionId ?? "") ?? {REFERENCE_ONLY:1}));
      if (query.mode === "materials") {
        const manifest = manifestBySubmission.get(row.currentSubmissionId ?? "");
        cells.push(manifest?.id,manifest?.sha256,manifest ? JSON.stringify(JSON.parse(manifest.canonicalJSON).objects) : null);
      }
      return cells;
    })]);
    await tx.auditLog.create({ data: { actorId, action: "AGRI_EXPORT_WORKS", resourceType: "agri_workspace", resourceId: ctx.workspace.id,
      metadata: { competitionId: ctx.workspace.competitionId, mode: query.mode, stage: query.stage ?? "ALL", status: query.status, rows: rows.length, exportedAt: now.toISOString() } } });
    await assertAgriAuthorityCurrent(tx, authority, exportAuthority, privateAuthority);
    return { csv, filename: "ans-agri-works-" + query.mode + "-" + now.toISOString().slice(0, 10) + ".csv", rows: rows.length };
  }, { timeout: 15000, isolationLevel: "RepeatableRead" });
}
export async function listAgriTeamEntries(actorId: string) {
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId);
    await tx.$queryRaw`SELECT id FROM team_members WHERE "userId"=${actorId} ORDER BY id FOR SHARE`;
    const entries = await tx.$queryRaw<Array<Entry & { teamName: string; role: string }>>`SELECT tc.id,tc."teamId",tc."competitionId",t.name AS "teamName",tm.role
      FROM team_competitions tc JOIN teams t ON t.id=tc."teamId" JOIN team_members tm ON tm."teamId"=tc."teamId"
      WHERE tc."competitionId"=${ctx.workspace.competitionId} AND tm."userId"=${actorId} AND tm.status='ACTIVE' ORDER BY tc.id LIMIT 100`;
    return { competitionId: ctx.workspace.competitionId, workspaceEnabled: ctx.workspace.enabled, entries };
  });
}

/** Paginated own-team version metadata only. Team membership never reveals another owner's projects. */
export async function listAgriSubmissionVersions(actorId: string, rawId: string, rawQuery: unknown = {}) {
  const id = identifier.parse(rawId), query = agriSubmissionVersionsQuerySchema.parse(rawQuery);
  const cursorSchema = z.object({ id: identifier, createdAt: z.string().datetime(), actorId: identifier,
    entryStageId: identifier, projectId: identifier.nullable() }).strict();
  let cursor: z.infer<typeof cursorSchema> | null = null;
  if (query.cursor) {
    try { cursor = cursorSchema.parse(JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8"))); }
    catch { return fail("INVALID_CURSOR", 400); }
    if (cursor.actorId !== actorId || cursor.entryStageId !== id || cursor.projectId !== (query.projectId ?? null)) return fail("INVALID_CURSOR", 400);
  }
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId), { entry } = await lockTarget(tx, ctx, id, true);
    const rows = await tx.$queryRaw<Array<{ id: string; version: number; createdAt: Date; artifactId: string;
      artifactTitle: string; kind: string; projectId: string; projectTitle: string }>>`
      SELECT v.id,v.version,v."createdAt",a.id AS "artifactId",a.title AS "artifactTitle",a.kind,
        p.id AS "projectId",p.title AS "projectTitle"
      FROM artifact_versions v JOIN artifacts a ON a.id=v."artifactId" JOIN projects p ON p.id=a."projectId"
      WHERE p."ownerId"=${actorId} AND p."teamId"=${entry.teamId} AND p.status='ACTIVE'
        AND (${query.projectId ?? null}::text IS NULL OR p.id=${query.projectId ?? null}::text)
        AND (${cursor?.id ?? null}::text IS NULL OR (v."createdAt",v.id)<(${cursor ? new Date(cursor.createdAt) : null}::timestamp,${cursor?.id ?? null}::text))
      ORDER BY v."createdAt" DESC,v.id DESC LIMIT 31`;
    const page = rows.slice(0, 30), last = page.at(-1);
    return { entryStageId: id, versions: page.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })),
      nextCursor: rows.length > 30 && last ? Buffer.from(JSON.stringify({ id: last.id, createdAt: last.createdAt.toISOString(),
        actorId, entryStageId: id, projectId: query.projectId ?? null })).toString("base64url") : null };
  }, { timeout: 15000 });
}
