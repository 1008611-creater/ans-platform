import type { DbTransaction } from "@/lib/db";
import { createHash } from "node:crypto";
import { Prisma, type AgriPersonalTask } from "@prisma/client";
import { db } from "@/lib/db";
import { agriTaskCommandSchema, agriTaskEditableSchema, agriTaskFiltersSchema, type AgriTaskFilters, agriTaskViewSchema, agriInputRequirementsSchema,
  agriInputRequirementSchema, agriTaskCursorSchema, type AgriTaskShareChange, type AgriTaskEditable, type AgriTaskList, type AgriTaskMutation, type AgriTaskDetail, type AgriTaskHistoryPage, agriTaskHistoryEventSchema } from "@/contracts/agri-tasks";
import { deriveAgriTaskDueState } from "@/domain/competitions/agrihackathon";
import { agriTaskTemplates } from "@/domain/competitions/agri-task-templates";
import { AgriTaskError } from "./error";
import { lockAgriWorkspace, assertAgriAuthorityCurrent } from "./workspace";
import { attachAgriTaskReference, detachAgriTaskReference, readAgriTaskReferences, type resolveAgriTaskReference } from "./task-references";
import { type AgriReferenceChange } from "@/contracts/agri-task-references";
// Personal planning still works before a workspace exists. If present, use the same
// workspace-before-account lock order as grants/issues to avoid cross-module deadlocks.
async function lockEditionWorkspace(tx: DbTransaction, competitionId: string) {
  await tx.$queryRaw`SELECT id FROM agri_workspaces WHERE "competitionId"=${competitionId} FOR UPDATE`;
}

const taskLimit = 500;
const sharingLimit = 30;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function boundCompetitionId() {
  const id = process.env.ANS_AGRIHACKATHON_COMPETITION_ID?.trim();
  if (!id || id.length > 80) throw new AgriTaskError("AGRI_EDITION_NOT_CONFIGURED", 503);
  return id;
}
async function lockAccount(tx: DbTransaction, actorId: string) {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${actorId} FOR UPDATE`;
  const actor = await tx.user.findUnique({ where: { id: actorId }, select: { flagged: true, deletedAt: true } });
  if (!actor || actor.deletedAt || actor.flagged) throw new AgriTaskError("ACCOUNT_UNAVAILABLE", 403);
}
async function ensureEdition(tx: DbTransaction, competitionId: string) {
  if (!await tx.competition.findUnique({ where: { id: competitionId }, select: { id: true } })) throw new AgriTaskError("AGRI_EDITION_NOT_CONFIGURED", 503);
}
async function clock(tx: DbTransaction) {
  const [row] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
  return row.now;
}
function editable(row: AgriPersonalTask): AgriTaskEditable {
  return agriTaskEditableSchema.parse({ title: row.title, stage: row.stage, status: row.status, priority: row.priority,
    due: { state: row.dueState, at: row.dueAt?.toISOString() ?? null }, acceptanceCriteria: row.acceptanceCriteria,
    collaborationNotes: row.collaborationNotes ?? "", inputRequirements: agriInputRequirementsSchema.parse(row.inputRequirements),
    blockingInput: row.blockingInput === null ? null : agriInputRequirementSchema.parse(row.blockingInput), completionResult: row.completionResult });
}
function view(row: AgriPersonalTask, actorId: string, now: Date) {
  const task = editable(row);
  return agriTaskViewSchema.parse({ ...task, id: row.id, ownerId: row.ownerId, competitionId: row.competitionId, revision: row.revision,
    templateKey: row.templateKey, access: row.ownerId === actorId ? "OWNER" : "SHARED_READONLY",
    dueState: deriveAgriTaskDueState(task.due, task.status, now), completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
}
function dataFor(task: AgriTaskEditable, actorId: string, now: Date, previous?: AgriPersonalTask) {
  const sameCompletion = previous?.status === "DONE" && previous.completionResult === task.completionResult;
  return { title: task.title, stage: task.stage, status: task.status, priority: task.priority,
    dueState: task.due.state, dueAt: task.due.at ? new Date(task.due.at) : null,
    acceptanceCriteria: task.acceptanceCriteria, collaborationNotes: task.collaborationNotes || null,
    inputRequirements: task.inputRequirements, blockingInput: task.blockingInput ?? Prisma.DbNull,
    completionResult: task.completionResult, completedById: task.status === "DONE" ? actorId : null,
    completedAt: task.status === "DONE" ? sameCompletion ? previous.completedAt : now : null };
}
async function taskEvent(tx: DbTransaction, row: AgriPersonalTask, actorId: string, action: string, now: Date, shareChange?: AgriTaskShareChange, referenceChange?: AgriReferenceChange) {
  await tx.agriTaskEvent.create({ data: { taskId: row.id, actorId, action, revision: row.revision,
    snapshot: { schemaVersion: 1, task: editable(row), ...(shareChange ? { shareChange } : {}), ...(referenceChange ? { referenceChange } : {}) }, createdAt: now } });
  // No titles, input requirements or acceptance text in the global audit log.
  await tx.auditLog.create({ data: { actorId, action: "AGRI_PERSONAL_TASK_" + action.toUpperCase(), resourceType: "agri_personal_task",
    resourceId: row.id, metadata: { competitionId: row.competitionId, revision: row.revision } } });
}
async function lockTask(tx: DbTransaction, competitionId: string, taskId: string) {
  await tx.$queryRaw`SELECT id FROM agri_personal_tasks WHERE id = ${taskId} AND "competitionId" = ${competitionId} FOR UPDATE`;
  const row = await tx.agriPersonalTask.findFirst({ where: { id: taskId, competitionId } });
  if (!row) throw new AgriTaskError("NOT_FOUND", 404);
  return row;
}
async function readable(tx: DbTransaction, row: AgriPersonalTask, actorId: string, now: Date) {
  if (row.ownerId === actorId) return;
  const share = await tx.agriTaskShare.findFirst({ where: { taskId: row.id, userId: actorId, revokedAt: null,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, select: { id: true } });
  if (!share) throw new AgriTaskError("NOT_FOUND", 404);
}
export async function listAgriTasks(actorId: string, cursor?: string, rawFilters?: AgriTaskFilters): Promise<AgriTaskList> {
  const competitionId = boundCompetitionId();
  const filters = agriTaskFiltersSchema.parse(rawFilters ?? {});
  let after: { createdAt: string; id: string } | null = null;
  if (cursor) {
    try { after = agriTaskCursorSchema.parse(JSON.parse(cursor)); }
    catch { throw new AgriTaskError("INVALID_INPUT", 400); }
  }
  return db.$transaction(async tx => {
    await lockEditionWorkspace(tx, competitionId); await lockAccount(tx, actorId); await ensureEdition(tx, competitionId);
    const now = await clock(tx);
    const shared: Prisma.AgriPersonalTaskWhereInput = { ownerId: { not: actorId }, shares: { some: { userId: actorId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } } };
    const visibility: Prisma.AgriPersonalTaskWhereInput = filters.scope === "mine" ? { ownerId: actorId } : filters.scope === "shared" ? shared : { OR: [{ ownerId: actorId }, shared] };
    const rows = await tx.agriPersonalTask.findMany({ where: { competitionId, stage: filters.stage,
      AND: [visibility, ...(after ? [{ OR: [{ createdAt: { lt: new Date(after.createdAt) } }, { createdAt: new Date(after.createdAt), id: { lt: after.id } }] }] : [])] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: taskLimit + 1 });
    const page = rows.slice(0, taskLimit); const last = page.at(-1);
    const sharedIds = page.filter(row => row.ownerId !== actorId).map(row => row.id);
    // Recheck only this page in one query. A share can expire while either read
    // is in flight, so the final database clock also filters returned expiries.
    const currentShares = sharedIds.length ? await tx.agriTaskShare.findMany({
      where: { taskId: { in: sharedIds }, userId: actorId, revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: { taskId: true, expiresAt: true },
    }) : [];
    const finalNow = await clock(tx);
    const readableIds = new Set(currentShares.filter(share => !share.expiresAt || share.expiresAt > finalNow).map(share => share.taskId));
    const visiblePage = page.filter(row => row.ownerId === actorId || readableIds.has(row.id));
    // Pagination advances over the fetched page, even if its shares all expired.
    return { competitionId, serverNow: finalNow.toISOString(), tasks: visiblePage.map(row => view(row, actorId, finalNow)), sharingLimit,
      nextCursor: rows.length > taskLimit && last ? JSON.stringify({ createdAt: last.createdAt.toISOString(), id: last.id }) : null };
  }, { maxWait: 10_000, timeout: 20_000 });
}
function historyEvent(event: { revision: number; action: string; snapshot: Prisma.JsonValue; createdAt: Date }) {
  const snapshot = event.snapshot as { schemaVersion?: unknown; task?: unknown; shareChange?: unknown; referenceChange?: unknown };
  if (!snapshot || snapshot.schemaVersion !== 1) throw new AgriTaskError("AGRI_TASK_HISTORY_INVALID", 500);
  const parsed = agriTaskHistoryEventSchema.safeParse({ revision: event.revision, action: event.action, task: snapshot.task,
    ...(snapshot.shareChange ? { shareChange: snapshot.shareChange } : {}),
    ...(snapshot.referenceChange ? { referenceChange: snapshot.referenceChange } : {}), createdAt: event.createdAt.toISOString() });
  if (!parsed.success) throw new AgriTaskError("AGRI_TASK_HISTORY_INVALID", 500);
  return parsed.data;
}
// History is private to the owner, even when the current task is shared.
export async function getAgriTaskHistory(actorId: string, taskId: string, beforeRevision?: number): Promise<AgriTaskHistoryPage> {
  const competitionId = boundCompetitionId();
  if (beforeRevision !== undefined && (!Number.isInteger(beforeRevision) || beforeRevision < 1 || beforeRevision > 2147483646)) throw new AgriTaskError("INVALID_INPUT", 400);
  return db.$transaction(async tx => {
    await lockEditionWorkspace(tx, competitionId); await lockAccount(tx, actorId); await ensureEdition(tx, competitionId);
    const row = await lockTask(tx, competitionId, taskId);
    if (row.ownerId !== actorId) throw new AgriTaskError("NOT_FOUND", 404);
    if (beforeRevision !== undefined && !await tx.agriTaskEvent.findUnique({
      where: { taskId_revision: { taskId, revision: beforeRevision } }, select: { revision: true },
    })) throw new AgriTaskError("INVALID_INPUT", 400);
    const events = await tx.agriTaskEvent.findMany({ where: { taskId, ...(beforeRevision !== undefined ? { revision: { lt: beforeRevision } } : {}) },
      orderBy: { revision: "desc" }, take: 51, select: { revision: true, action: true, snapshot: true, createdAt: true } });
    const page = events.slice(0, 50);
    return { taskId, competitionId, ownerId: actorId, history: page.map(historyEvent),
      nextBeforeRevision: events.length > 50 ? page.at(-1)!.revision : null };
  }, { maxWait: 10_000, timeout: 20_000 });
}
export async function getAgriTask(actorId: string, taskId: string): Promise<AgriTaskDetail> {
  const competitionId = boundCompetitionId();
  return db.$transaction(async tx => {
    await lockEditionWorkspace(tx, competitionId); await lockAccount(tx, actorId); await ensureEdition(tx, competitionId);
    const row = await lockTask(tx, competitionId, taskId); const now = await clock(tx);
    await readable(tx, row, actorId, now);
    const owner = row.ownerId === actorId;
    const history = owner ? await tx.agriTaskEvent.findMany({ where: { taskId }, orderBy: { revision: "desc" }, take: 51,
      select: { revision: true, action: true, snapshot: true, createdAt: true } }) : [];
    const shares = owner ? await tx.agriTaskShare.findMany({ where: { taskId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: { userId: true, expiresAt: true, sharedAt: true }, orderBy: { sharedAt: "desc" }, take: sharingLimit }) : [];
    const [hasReferences] = await tx.$queryRaw<Array<{ present: boolean }>>`SELECT EXISTS(SELECT 1 FROM agri_task_references WHERE "taskId"=${taskId} AND "detachedAt" IS NULL) AS present`;
    const linked = hasReferences.present ? await readAgriTaskReferences(tx, await lockAgriWorkspace(tx, actorId), taskId, owner) : { references: [], authorities: [] };
    await assertAgriAuthorityCurrent(tx, ...linked.authorities);
    const finalNow = await clock(tx); await readable(tx, row, actorId, finalNow);
    return { task: view(row, actorId, finalNow), references: linked.references, history: history.slice(0, 50).map(historyEvent), shares: shares.map(share => ({ ...share, sharedAt: share.sharedAt.toISOString(), expiresAt: share.expiresAt?.toISOString() ?? null })),
      historyTruncated: history.length > 50, historyNextBeforeRevision: history.length > 50 ? history[49].revision : null };
  });
}
export async function executeAgriTaskCommand(actorId: string, raw: unknown): Promise<AgriTaskMutation> {
  const command = agriTaskCommandSchema.parse(raw); const competitionId = boundCompetitionId();
  // Keep pre-Demo idempotency receipts usable: an absent detail and explicit null are identical.
  const hashInput = command.action === "attachReference" && command.target.demoCheckId === null
    ? { ...command, target: { submissionId: command.target.submissionId, issueId: command.target.issueId } }
    : command;
  const requestHash = digest(hashInput);
  return db.$transaction(async tx => {
    await lockEditionWorkspace(tx, competitionId); await lockAccount(tx, actorId); await ensureEdition(tx, competitionId);
    const identity = { competitionId, actorId, operation: command.action, idempotencyKey: command.idempotencyKey };
    const prior = await tx.agriTaskCommandReceipt.findUnique({ where: { competitionId_actorId_operation_idempotencyKey: identity } });
    if (prior && prior.requestHash !== requestHash) throw new AgriTaskError("AGRI_IDEMPOTENCY_CONFLICT");
    if (prior) {
      const row = prior.taskId ? await lockTask(tx, competitionId, prior.taskId) : null;
      if (row && row.ownerId !== actorId) throw new AgriTaskError("NOT_FOUND", 404);
      return { task: row ? view(row, actorId, await clock(tx)) : null, duplicate: true,
        appliedRevision: prior.appliedRevision, createdTaskCount: prior.createdTaskCount };
    }
    let row: AgriPersonalTask | null = null; let createdTaskCount: number | null = null;
    let referenceAuthorities: Awaited<ReturnType<typeof resolveAgriTaskReference>>["authorities"] = [];
    if (command.action === "initialize" || command.action === "create") {
      const count = await tx.agriPersonalTask.count({ where: { ownerId: actorId, competitionId } });
      const now = await clock(tx);
      if (command.action === "initialize") {
        const existing = await tx.agriPersonalTask.findMany({ where: { ownerId: actorId, competitionId, templateKey: { not: null } }, select: { templateKey: true } });
        const missing = agriTaskTemplates(command.locale).filter(template => !existing.some(task => task.templateKey === template.templateKey));
        if (count + missing.length > taskLimit) throw new AgriTaskError("AGRI_TASK_LIMIT", 422);
        for (const template of missing) {
          const task = await tx.agriPersonalTask.create({ data: { competitionId, ownerId: actorId, templateKey: template.templateKey,
            ...dataFor(template.task, actorId, now), createdAt: now, updatedAt: now } });
          await taskEvent(tx, task, actorId, "initialize", now);
        }
        createdTaskCount = missing.length;
      } else {
        if (count >= taskLimit) throw new AgriTaskError("AGRI_TASK_LIMIT", 422);
        row = await tx.agriPersonalTask.create({ data: { competitionId, ownerId: actorId, ...dataFor(command.task, actorId, now), createdAt: now, updatedAt: now } });
        await taskEvent(tx, row, actorId, "create", now);
      }
    } else {
      row = await lockTask(tx, competitionId, command.taskId);
      if (row.ownerId !== actorId) throw new AgriTaskError("NOT_FOUND", 404);
      if (row.revision !== command.expectedRevision) throw new AgriTaskError("AGRI_REVISION_CONFLICT");
      const now = await clock(tx);
      let shareChange: AgriTaskShareChange | undefined;
      let referenceChange: AgriReferenceChange | undefined;
      if (command.action === "update") {
        row = await tx.agriPersonalTask.update({ where: { id: row.id }, data: { ...dataFor(command.task, actorId, now, row), revision: { increment: 1 }, updatedAt: now } });
      } else if (command.action === "attachReference" || command.action === "detachReference") {
        const ctx = await lockAgriWorkspace(tx, actorId);
        if (command.action === "attachReference") {
          const attached = await attachAgriTaskReference(tx, ctx, row.id, command.target, now, row.revision + 1);
          referenceChange = { referenceId: attached.referenceId, action: "attach" }; referenceAuthorities = attached.authorities;
        } else {
          await detachAgriTaskReference(tx, ctx, row.id, command.referenceId, now, row.revision + 1);
          referenceChange = { referenceId: command.referenceId, action: "detach" };
        }
        row = await tx.agriPersonalTask.update({ where: { id: row.id }, data: { revision: { increment: 1 }, updatedAt: now } });
      } else {
        if (command.recipientId === actorId) throw new AgriTaskError("INVALID_INPUT", 400);
        const old = await tx.agriTaskShare.findUnique({ where: { taskId_userId: { taskId: row.id, userId: command.recipientId } } });
        shareChange = { recipientId: command.recipientId, expiresAt: command.action === "share" ? command.expiresAt : null, previousExpiresAt: old?.expiresAt?.toISOString() ?? null, previouslyActive: !!old && !old.revokedAt && (!old.expiresAt || old.expiresAt > now) };
        if (command.action === "share") {
          const recipient = await tx.user.findFirst({ where: { id: command.recipientId, flagged: false, deletedAt: null }, select: { id: true } });
          if (!recipient) throw new AgriTaskError("INVALID_RECIPIENT", 400);
          const expiresAt = command.expiresAt ? new Date(command.expiresAt) : null;
          if (expiresAt && expiresAt <= now) throw new AgriTaskError("INVALID_SHARE_EXPIRY", 400);
          const total = await tx.agriTaskShare.count({ where: { taskId: row.id, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } });
          if ((!old || old.revokedAt || (old.expiresAt && old.expiresAt <= now)) && total >= sharingLimit) throw new AgriTaskError("AGRI_SHARE_LIMIT", 422);
          await tx.agriTaskShare.upsert({ where: { taskId_userId: { taskId: row.id, userId: command.recipientId } },
            create: { taskId: row.id, userId: command.recipientId, sharedById: actorId, sharedAt: now, expiresAt },
            update: { revokedAt: null, sharedAt: now, expiresAt, revision: { increment: 1 } } });
        } else {
          if (!old) throw new AgriTaskError("NOT_FOUND", 404);
          await tx.agriTaskShare.update({ where: { id: old.id }, data: { revokedAt: now, revision: { increment: 1 } } });
        }
        row = await tx.agriPersonalTask.update({ where: { id: row.id }, data: { revision: { increment: 1 }, updatedAt: now } });
        await tx.auditLog.create({ data: { actorId, action: "AGRI_TASK_SHARE_" + (command.action === "share" ? "GRANTED" : "REVOKED"),
          resourceType: "agri_task_share", resourceId: row.id, metadata: { competitionId, recipientId: command.recipientId, revision: row.revision } } });
      }
      await taskEvent(tx, row, actorId, command.action, now, shareChange, referenceChange);
    }
    await tx.agriTaskCommandReceipt.create({ data: { ...identity, requestHash, taskId: row?.id ?? null,
      appliedRevision: row?.revision ?? null, createdTaskCount } });
    await assertAgriAuthorityCurrent(tx, ...referenceAuthorities);
    return { task: row ? view(row, actorId, await clock(tx)) : null, duplicate: false, appliedRevision: row?.revision ?? null, createdTaskCount };
  }, { maxWait: 10_000, timeout: 20_000 });
}
