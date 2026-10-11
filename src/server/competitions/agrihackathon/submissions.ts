import type { DbTransaction } from "@/lib/db";
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriPrepareStageSchema, agriStageDraftSchema, agriStageSubmissionCommandSchema,
  agriStageSubmissionContentSchema, agriSubmissionListQuerySchema, agriWorksExportQuerySchema, agriSubmissionRequirementsSchema, agriSubmissionVersionsQuerySchema } from "@/contracts/agri-submissions";
import { agriSubmissionWindowSchema } from "@/contracts/agrihackathon";
import { getAgriSubmissionLifecycleDecision, getAgriSubmissionMaterialIssues } from "@/domain/competitions/agri-submissions";
import { agriCsv } from "@/domain/competitions/agri-works-export";
import { getAgriWindowState } from "@/domain/competitions/agrihackathon";
import { lockAgriWorkspace, requireAgriScope, assertAgriAuthorityCurrent, agriDatabaseClock, type AgriWorkspaceContext } from "./workspace";

type Tx = DbTransaction;
type StageName = "PRELIMINARY" | "FINAL";
interface Entry { id: string; teamId: string; competitionId: string }
interface Stage { id: string; competitionId: string; teamCompetitionId: string; stage: StageName;
  revision: number; draft: unknown; currentSubmissionId: string | null; frozenSubmissionId: string | null; createdAt: Date }
interface Submission { id: string; competitionId: string; entryStageId: string; sequence: number; ruleVersionId: string;
  projectId: string; artifactVersionId: string; repository: unknown; demoUrl: string | null; summary: string; materials: unknown;
  submittedById: string; acceptedAt: Date }
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
async function audit(tx: Tx, ctx: AgriWorkspaceContext, action: string, id: string, revision: number) {
  await tx.auditLog.create({ data: { actorId: ctx.actorId, action: "AGRI_" + action.toUpperCase(),
    resourceType: "agri_entry_stage", resourceId: id, metadata: { competitionId: ctx.workspace.competitionId, revision } } });
}
async function event(tx: Tx, ctx: AgriWorkspaceContext, stage: Stage, action: string, submissionId: string | null, at: Date) {
  await tx.$executeRaw`INSERT INTO agri_submission_events (id,"competitionId","entryStageId",revision,action,"submissionId","actorId","createdAt")
    VALUES (${randomUUID()},${stage.competitionId},${stage.id},${stage.revision},${action},${submissionId},${ctx.actorId},${at})`;
  await audit(tx, ctx, action, stage.id, stage.revision);
}
/** Locks are always workspace -> actor/grants -> entry -> stage -> membership -> project/artifact/version. */
async function lockTarget(tx: Tx, ctx: AgriWorkspaceContext, id: string, write: boolean) {
  const [candidate] = await tx.$queryRaw<Array<Entry & { entryStageId: string }>>`SELECT tc.id,tc."teamId",tc."competitionId",es.id AS "entryStageId"
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
  const [entry] = await tx.$queryRaw<Entry[]>`SELECT id,"teamId","competitionId" FROM team_competitions
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
async function priorClosed(tx: Tx, stage: Stage, now: Date) {
  if (stage.frozenSubmissionId) return true;
  if (!stage.currentSubmissionId) return false;
  const [prior] = await tx.$queryRaw<Array<{ ruleVersionId: string }>>`SELECT "ruleVersionId" FROM agri_stage_submissions
    WHERE id=${stage.currentSubmissionId} AND "entryStageId"=${stage.id} AND "competitionId"=${stage.competitionId}`;
  if (!prior) return fail("AGRI_STAGE_INVALID", 500);
  return getAgriWindowState((await rule(tx, stage.competitionId, prior.ruleVersionId, stage.stage)).window, now) === "CLOSED";
}
async function freezeForRead(tx: Tx, ctx: AgriWorkspaceContext, stage: Stage, now: Date) {
  if (!stage.frozenSubmissionId && stage.currentSubmissionId && await priorClosed(tx, stage, now)) {
    stage.revision++; stage.frozenSubmissionId = stage.currentSubmissionId;
    await tx.$executeRaw`UPDATE agri_entry_stages SET "frozenSubmissionId"=${stage.frozenSubmissionId},revision=${stage.revision},"updatedAt"=${now} WHERE id=${stage.id}`;
    await event(tx, ctx, stage, "freezeStage", stage.currentSubmissionId, now);
  }
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
export async function prepareAgriStage(actorId: string, raw: unknown) {
  const command = agriPrepareStageSchema.parse(raw);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId);
    if (!ctx.workspace.enabled) return fail("AGRI_WORKSPACE_DISABLED");
    const [entry] = await tx.$queryRaw<Entry[]>`SELECT id,"teamId","competitionId" FROM team_competitions
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
    if (command.action === "correctSubmission") return fail("AGRI_CORRECTION_PERMIT_REQUIRED");
    const [receipt] = await tx.$queryRaw<Receipt[]>`SELECT "entryStageId","requestHash","submissionId","appliedRevision" FROM agri_submission_receipts
      WHERE "competitionId"=${ctx.workspace.competitionId} AND "actorId"=${actorId} AND operation=${command.action} AND "idempotencyKey"=${command.idempotencyKey}`;
    if (receipt) {
      if (receipt.requestHash !== hash(command) || receipt.entryStageId !== stage.id) return fail("AGRI_IDEMPOTENCY_CONFLICT");
      return { entryStageId: stage.id, submissionId: receipt.submissionId, appliedRevision: receipt.appliedRevision, duplicate: true };
    }
    if (!ctx.workspace.enabled) return fail("AGRI_WORKSPACE_DISABLED");
    if (stage.revision !== command.expectedRevision) return fail("AGRI_REVISION_CONFLICT");
    const content = command.action === "saveDraft" ? command.draft : command.content;
    await validateVersions(tx, ctx, target.entry, content);
    const priorStage = { ...stage };
    const now = await agriDatabaseClock(tx);
    if (await priorClosed(tx, stage, now)) return fail("AGRI_FROZEN");
    let adopted: Awaited<ReturnType<typeof rule>> | null = null;
    const decision = (at: Date) => {
      if (!adopted || command.action !== "submit") return;
      const result = getAgriSubmissionLifecycleDecision({ competitionId: stage.competitionId, workspaceEnabled: ctx.workspace.enabled,
        entry: { id: stage.id, competitionId: stage.competitionId, stage: stage.stage, revision: command.expectedRevision, frozenSubmissionId: stage.frozenSubmissionId },
        publishedRuleVersionId: ctx.workspace.publishedRuleVersionId, rule: { id: adopted.id, competitionId: stage.competitionId, window: adopted.window },
        finalEligibility: { state: "UNKNOWN" } }, command, at);
      if (result !== "ALLOW") return fail("AGRI_" + result);
    };
    let submissionId: string | null = null;
    if (command.action === "submit") {
      adopted = await rule(tx, stage.competitionId, ctx.workspace.publishedRuleVersionId, stage.stage);
      decision(now);
      const issues = getAgriSubmissionMaterialIssues(adopted.requirements, command.content);
      if (issues.length) return fail("AGRI_" + issues[0].code, 422);
      const [last] = await tx.$queryRaw<Array<{ sequence: number }>>`SELECT COALESCE(max(sequence),0)::integer AS sequence FROM agri_stage_submissions WHERE "entryStageId"=${stage.id}`;
      submissionId = randomUUID();
      await tx.$executeRaw`INSERT INTO agri_stage_submissions (id,"competitionId","entryStageId",sequence,"ruleVersionId","projectId","artifactVersionId",repository,"demoUrl",summary,materials,"submittedById","acceptedAt")
        VALUES (${submissionId},${stage.competitionId},${stage.id},${last.sequence + 1},${adopted.id},${content.projectId},${content.artifactVersionId},
          ${content.repository ? JSON.stringify(content.repository) : null}::jsonb,${content.demoUrl},${content.summary},${JSON.stringify(content.materials)}::jsonb,${actorId},${now})`;
      for (const material of content.materials.items) if (material.kind === "ARTIFACT") {
        await tx.$executeRaw`INSERT INTO agri_submission_material_refs (id,"competitionId","entryStageId","submissionId",key,"artifactVersionId")
          VALUES (${randomUUID()},${stage.competitionId},${stage.id},${submissionId},${material.key},${material.artifactVersionId})`;
      }
      stage.currentSubmissionId = submissionId;
    }
    stage.revision++;
    await tx.$executeRaw`UPDATE agri_entry_stages SET draft=${command.action === "saveDraft" ? JSON.stringify(content) : null}::jsonb,
      "currentSubmissionId"=${stage.currentSubmissionId},revision=${stage.revision},"updatedAt"=${now} WHERE id=${stage.id}`;
    await event(tx, ctx, stage, command.action, submissionId, now);
    await tx.$executeRaw`INSERT INTO agri_submission_receipts (id,"competitionId","entryStageId","actorId",operation,"idempotencyKey","requestHash","submissionId","appliedRevision","createdAt")
      VALUES (${randomUUID()},${stage.competitionId},${stage.id},${actorId},${command.action},${command.idempotencyKey},${hash(command)},${submissionId},${stage.revision},${now})`;
    // Time can advance while writing, even with account and row locks held.
    const end = await agriDatabaseClock(tx); decision(end);
    if (await priorClosed(tx, priorStage, end)) return fail("AGRI_FROZEN");
    if (command.action === "saveDraft" && await priorClosed(tx, stage, end)) return fail("AGRI_FROZEN");
    return { entryStageId: stage.id, submissionId, appliedRevision: stage.revision, duplicate: false };
  }, { timeout: 15000 });
}
function projectSubmission(row: Submission, privateMaterials: boolean) {
  const base = { id: row.id, entryStageId: row.entryStageId, sequence: row.sequence, ruleVersionId: row.ruleVersionId, acceptedAt: row.acceptedAt.toISOString() };
  if (!privateMaterials) return base;
  return { ...base, submittedById: row.submittedById, content: agriStageSubmissionContentSchema.parse({ projectId: row.projectId,
    artifactVersionId: row.artifactVersionId, repository: row.repository, demoUrl: row.demoUrl, summary: row.summary, materials: row.materials }) };
}
export async function readAgriStage(actorId: string, rawId: string, rawQuery: unknown = {}) {
  const id = identifier.parse(rawId), query = historyQuery.parse(rawQuery);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId), target = await lockTarget(tx, ctx, id, false), stage = target.stage;
    await freezeForRead(tx, ctx, stage, await agriDatabaseClock(tx));
    const rows = await tx.$queryRaw<Submission[]>`SELECT * FROM agri_stage_submissions WHERE "entryStageId"=${id} AND "competitionId"=${stage.competitionId}
      AND (${query.beforeSequence ?? null}::integer IS NULL OR sequence < ${query.beforeSequence ?? null}::integer) ORDER BY sequence DESC LIMIT 31`;
    const [current] = stage.currentSubmissionId ? await tx.$queryRaw<Submission[]>`SELECT * FROM agri_stage_submissions WHERE id=${stage.currentSubmissionId} AND "entryStageId"=${id}` : [];
    const publishedRule = ctx.workspace.publishedRuleVersionId ? await rule(tx, stage.competitionId, ctx.workspace.publishedRuleVersionId, stage.stage) : null;
    const serverNow = await agriDatabaseClock(tx);
    await assertAgriAuthorityCurrent(tx, ...target.authorities);
    return { competitionId: stage.competitionId, id, teamCompetitionId: stage.teamCompetitionId, stage: stage.stage, revision: stage.revision,
      frozenSubmissionId: stage.frozenSubmissionId, workspaceEnabled: ctx.workspace.enabled, hasPrivateMaterials: target.privateMaterials,
      draft: target.teamMember && stage.draft !== null ? agriStageDraftSchema.parse(stage.draft) : null,
      current: current ? projectSubmission(current, target.privateMaterials) : null,
      history: rows.slice(0, 30).map(row => projectSubmission(row, target.privateMaterials)),
      nextBeforeSequence: rows.length > 30 ? rows[29].sequence : null, publishedRule,
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
    const rows = await tx.$queryRaw<Array<Omit<Stage, "draft" | "competitionId"> & { teamId: string; teamName: string; checkId: string | null; checkResult: "PASS" | "NEEDS_ACTION" | "UNREACHABLE" | null; checkedAt: Date | null }>>`
      SELECT es.id,es."teamCompetitionId",es.stage,es.revision,es."currentSubmissionId",es."frozenSubmissionId",es."createdAt",tc."teamId",t.name AS "teamName",ch.id AS "checkId",ch.result AS "checkResult",ch."checkedAt"
      FROM agri_entry_stages es JOIN team_competitions tc ON tc.id=es."teamCompetitionId" JOIN teams t ON t.id=tc."teamId"
      LEFT JOIN LATERAL (SELECT id,result,"checkedAt" FROM agri_technical_checks WHERE "competitionId"=es."competitionId" AND "submissionId"=es."currentSubmissionId" ORDER BY "checkedAt" DESC,id DESC LIMIT 1) ch ON true
      WHERE ${stageFilter(competitionId, actorId, query)}
      AND (${cursor?.id ?? null}::text IS NULL OR (es."createdAt",es.id)<(${cursor ? new Date(cursor.createdAt) : null}::timestamptz,${cursor?.id ?? null}::text))
      ORDER BY es."createdAt" DESC,es.id DESC LIMIT 31`;
    const page = rows.slice(0, 30), last = page.at(-1);
    await assertAgriAuthorityCurrent(tx, authority, exportAuthority, privateAuthority);
    return { competitionId, stages: page.map(row => ({ id: row.id, teamCompetitionId: row.teamCompetitionId, teamId: row.teamId, teamName: row.teamName, stage: row.stage, revision: row.revision, currentSubmissionId: row.currentSubmissionId, frozenSubmissionId: row.frozenSubmissionId, latestTechnicalCheck: row.checkId && row.checkResult && row.checkedAt ? { id: row.checkId, result: row.checkResult, checkedAt: row.checkedAt.toISOString() } : null })),
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
      ruleVersionId: string | null; acceptedAt: Date | null; content: unknown }>>`
      SELECT es.id,tc."teamId",es."teamCompetitionId",t.name AS "teamName",es.stage,es.revision,es."frozenSubmissionId",es."currentSubmissionId",
        sub.sequence,sub."ruleVersionId",sub."acceptedAt",
        CASE WHEN ${query.mode === "materials"} AND sub.id IS NOT NULL THEN jsonb_build_object(
          'projectId',sub."projectId",'artifactVersionId',sub."artifactVersionId",'repository',sub.repository,
          'demoUrl',sub."demoUrl",'summary',sub.summary,'materials',sub.materials) ELSE NULL END AS content
      FROM agri_entry_stages es JOIN team_competitions tc ON tc.id=es."teamCompetitionId" JOIN teams t ON t.id=tc."teamId"
      LEFT JOIN agri_stage_submissions sub ON sub.id=es."currentSubmissionId" AND sub."entryStageId"=es.id AND sub."competitionId"=es."competitionId"
      WHERE ${stageFilter(ctx.workspace.competitionId, actorId, { ...query, scope: "staff" })}
      ORDER BY es."createdAt" DESC,es.id DESC LIMIT 5001`;
    if (rows.length > 5000) return fail("AGRI_EXPORT_TOO_LARGE", 422);
    const now = await agriDatabaseClock(tx);
    const head = ["source", "exported_at_utc", "competition_id", "scope", "stage_filter", "status_filter", "team_query", "team_id", "team_name", "entry_id", "stage_id", "stage", "revision", "current_submission_id", "sequence", "rule_version_id", "accepted_at_utc", "recorded_frozen_submission_id"];
    if (query.mode === "materials") head.push("project_id", "artifact_version_id", "summary", "repository_url", "repository_ref_kind", "repository_ref", "demo_url", "materials_json");
    const csv = agriCsv([head, ...rows.map(row => {
      const cells: unknown[] = ["ANS agri stage submissions snapshot", now.toISOString(), ctx.workspace.competitionId, query.mode,
        query.stage ?? "ALL", query.status, query.q, row.teamId, row.teamName, row.teamCompetitionId, row.id, row.stage, row.revision,
        row.currentSubmissionId, row.sequence, row.ruleVersionId, row.acceptedAt?.toISOString(), row.frozenSubmissionId];
      if (query.mode === "materials") {
        const content = row.content == null ? null : agriStageSubmissionContentSchema.parse(row.content);
        cells.push(content?.projectId, content?.artifactVersionId, content?.summary, content?.repository?.url,
          content?.repository?.ref?.kind, content?.repository?.ref?.value, content?.demoUrl, content ? JSON.stringify(content.materials) : null);
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
