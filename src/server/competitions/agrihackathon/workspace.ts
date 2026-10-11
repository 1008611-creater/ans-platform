import type { DbTransaction } from "@/lib/db";
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { agriWorkspaceScopeSchema, type AgriWorkspaceScope } from "@/contracts/agrihackathon";
import { agriRulesDraftSchema, agriWorkspaceCommandSchema, agriGrantCommandSchema, AgriWorkspaceError, type AgriRulesDraft } from "@/contracts/agri-workspace";
import { agriSubmissionRequirementsSchema } from "@/contracts/agri-submissions";

type Tx = DbTransaction;
interface WorkspaceRow { id: string; competitionId: string; enabled: boolean; draftRevision: number; rulesDraft: unknown; confirmedRuleVersionId: string | null; publishedRuleVersionId: string | null }
interface GrantRow { id: string; competitionId: string; userId: string; scope: string; grantedById: string; revision: number; delegable: boolean; revokedAt: Date | null; expiresAt: Date | null; sourceGrantId: string | null; sourceRevision: number | null; managerGrantId: string | null; managerRevision: number | null }
interface RuleRow { id: string; competitionId: string; version: number; requirements: unknown; guidanceMarkdown: string; confirmedAt: Date }
interface WindowRow { stage: "REGISTRATION" | "PRELIMINARY" | "FINAL"; state: "PENDING" | "CONFIRMED"; opensAt: Date | null; closesAt: Date | null; includesDeadline: boolean | null }
interface ReceiptRow { requestHash: string; resourceId: string; appliedRevision: number }
export interface AgriWorkspaceContext { workspace: WorkspaceRow; actorId: string }
const fail = (code: string, status = 409): never => { throw new AgriWorkspaceError(code, status); };
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function configuredAgriEditionId() {
  const id = process.env.ANS_AGRIHACKATHON_COMPETITION_ID?.trim();
  if (!id || id.length > 80) return fail("AGRI_EDITION_NOT_CONFIGURED", 503);
  return id;
}
export async function agriDatabaseClock(tx: Tx) {
  const [row] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
  return row.now;
}
/** Shared workspace-first lock order for rules, grants and future stage submissions. */
export async function lockAgriWorkspace(tx: Tx, actorId: string): Promise<AgriWorkspaceContext> {
  const competitionId = configuredAgriEditionId();
  const [workspace] = await tx.$queryRaw<WorkspaceRow[]>`SELECT * FROM agri_workspaces WHERE "competitionId" = ${competitionId} FOR UPDATE`;
  if (!workspace) return fail("AGRI_WORKSPACE_NOT_CONFIGURED", 503);
  const [actor] = await tx.$queryRaw<Array<{ flagged: boolean; deletedAt: Date | null }>>`SELECT flagged, "deletedAt" FROM users WHERE id = ${actorId} FOR SHARE`;
  if (!actor || actor.flagged || actor.deletedAt) return fail("ACCOUNT_UNAVAILABLE", 403);
  return { workspace, actorId };
}
/** No ADMIN bypass. A derived grant dies when either upstream revision, account, expiry or revocation changes. */
export async function requireAgriScope(tx: Tx, ctx: AgriWorkspaceContext, scope: AgriWorkspaceScope, forbiddenGrantId?: string): Promise<GrantRow> {
  agriWorkspaceScopeSchema.parse(scope);
  const competitionId = ctx.workspace.competitionId;
  const [candidate] = await tx.$queryRaw<GrantRow[]>`SELECT * FROM agri_access_grants WHERE "competitionId" = ${competitionId} AND "userId" = ${ctx.actorId} AND scope = ${scope} FOR SHARE`;
  const memo = new Map<string, GrantRow | undefined>();
  // Cache successful subtrees, including their height: shared ancestors must not
  // cause repeated recursion or let a deeper branch bypass the depth limit.
  const verified = new Map<string, number>();
  const users = new Map<string, boolean>();
  const expiries: Date[] = [];
  const active = async (row: GrantRow | undefined, path: Set<string>): Promise<number | null> => {
    if (!row || row.id === forbiddenGrantId || path.has(row.id) || path.size >= 20 || row.competitionId !== competitionId || row.revokedAt) return null;
    const cached = verified.get(row.id);
    if (cached !== undefined) return path.size + cached <= 20 ? cached : null;
    if (!users.has(row.userId)) {
      const [user] = await tx.$queryRaw<Array<{ flagged: boolean; deletedAt: Date | null }>>`SELECT flagged, "deletedAt" FROM users WHERE id = ${row.userId} FOR SHARE`;
      users.set(row.userId, Boolean(user && !user.flagged && !user.deletedAt));
    }
    if (!users.get(row.userId)) return null;
    if (row.expiresAt) expiries.push(row.expiresAt);
    if (!row.sourceGrantId && !row.managerGrantId) {
      if (row.sourceRevision !== null || row.managerRevision !== null) return null;
      verified.set(row.id, 1); return 1;
    }
    if (!row.sourceGrantId || !row.managerGrantId || row.scope === "ACCESS_MANAGE") return null;
    const lookup = async (id: string) => {
      if (memo.has(id)) return memo.get(id);
      const [parent] = await tx.$queryRaw<GrantRow[]>`SELECT * FROM agri_access_grants WHERE id = ${id} AND "competitionId" = ${competitionId} FOR SHARE`;
      memo.set(id, parent); return parent;
    };
    const source = await lookup(row.sourceGrantId), manager = await lookup(row.managerGrantId);
    if (!source || !manager || source.revision !== row.sourceRevision || manager.revision !== row.managerRevision ||
      source.userId !== row.grantedById || manager.userId !== row.grantedById || source.scope !== row.scope || !source.delegable || manager.scope !== "ACCESS_MANAGE") return null;
    const next = new Set(path).add(row.id);
    const sourceHeight = await active(source, next);
    if (sourceHeight === null) return null;
    const managerHeight = await active(manager, next);
    if (managerHeight === null) return null;
    const height = 1 + Math.max(sourceHeight, managerHeight);
    verified.set(row.id, height); return height;
  };
  if (await active(candidate, new Set()) === null) return fail("AGRI_SCOPE_REQUIRED", 403);
  const effective = { ...candidate, expiresAt: expiries.length ? new Date(Math.min(...expiries.map(at => at.getTime()))) : null } as GrantRow;
  await assertAgriAuthorityCurrent(tx, effective);
  return effective;
}
/** Recheck the database clock at the last accepted read/write, including replays.
 * Locked account and workspace rows protect revocation; time still advances. */
export async function assertAgriAuthorityCurrent(tx: Tx, ...grants: Array<Pick<GrantRow, "expiresAt"> | null>) {
  const expiries = grants.flatMap(grant => grant?.expiresAt ? [grant.expiresAt.getTime()] : []);
  if (expiries.length && Math.min(...expiries) <= (await agriDatabaseClock(tx)).getTime()) return fail("AGRI_SCOPE_REQUIRED", 403);
}
function canonicalRules(draft: AgriRulesDraft) {
  return JSON.stringify({ requirements: draft.requirements, guidanceMarkdown: draft.guidanceMarkdown,
    windows: [...draft.windows].sort((a, b) => a.stage.localeCompare(b.stage)).map(item => ({ stage: item.stage, state: item.state,
      opensAt: item.opensAt ? new Date(item.opensAt).toISOString() : null,
      closesAt: item.closesAt ? new Date(item.closesAt).toISOString() : null,
      includesDeadline: item.state === "READY" ? item.includesDeadline : null })) });
}
async function receipt(tx: Tx, ctx: AgriWorkspaceContext, command: { action: string; idempotencyKey: string }) {
  const [row] = await tx.$queryRaw<ReceiptRow[]>`SELECT "requestHash", "resourceId", "appliedRevision" FROM agri_command_receipts
    WHERE "competitionId" = ${ctx.workspace.competitionId} AND "actorId" = ${ctx.actorId} AND operation = ${command.action} AND "idempotencyKey" = ${command.idempotencyKey}`;
  if (row && row.requestHash !== hash(command)) return fail("AGRI_IDEMPOTENCY_CONFLICT");
  return row;
}
async function recordReceipt(tx: Tx, ctx: AgriWorkspaceContext, command: { action: string; idempotencyKey: string }, resourceId: string, revision: number, now: Date) {
  await tx.$executeRaw`INSERT INTO agri_command_receipts (id,"competitionId","actorId",operation,"idempotencyKey","requestHash","resourceId","appliedRevision","createdAt")
    VALUES (${randomUUID()},${ctx.workspace.competitionId},${ctx.actorId},${command.action},${command.idempotencyKey},${hash(command)},${resourceId},${revision},${now})`;
}
async function audit(tx: Tx, ctx: AgriWorkspaceContext, action: string, id: string, revision: number) {
  await tx.auditLog.create({ data: { actorId: ctx.actorId, action: "AGRI_" + action.toUpperCase(), resourceType: "agri_workspace", resourceId: id,
    metadata: { competitionId: ctx.workspace.competitionId, revision } } });
}
async function ruleView(tx: Tx, competitionId: string, ruleId: string) {
  const [rule] = await tx.$queryRaw<RuleRow[]>`SELECT id,"competitionId",version,requirements,"guidanceMarkdown","confirmedAt" FROM agri_rule_versions WHERE id = ${ruleId} AND "competitionId" = ${competitionId}`;
  if (!rule) return fail("AGRI_RULE_NOT_FOUND", 404);
  const windows = await tx.$queryRaw<WindowRow[]>`SELECT stage,state,"opensAt","closesAt","includesDeadline" FROM agri_stage_windows WHERE "ruleVersionId" = ${rule.id} ORDER BY stage`;
  if (windows.length !== 3 || new Set(windows.map(item => item.stage)).size !== 3) return fail("AGRI_RULE_INVALID", 500);
  return { id: rule.id, version: rule.version, requirements: agriSubmissionRequirementsSchema.parse(rule.requirements), guidanceMarkdown: rule.guidanceMarkdown,
    confirmedAt: rule.confirmedAt.toISOString(), windows: windows.map(item => ({ ...item, opensAt: item.opensAt?.toISOString() ?? null, closesAt: item.closesAt?.toISOString() ?? null })) };
}
export async function readAgriPublicGuide() {
  const competitionId = configuredAgriEditionId();
  // One consistent snapshot: a publication switch cannot mix pointers and content.
  return db.$transaction(async tx => {
    const [workspace] = await tx.$queryRaw<WorkspaceRow[]>`SELECT * FROM agri_workspaces WHERE "competitionId" = ${competitionId}`;
    if (!workspace || !workspace.publishedRuleVersionId) return null;
    return { competitionId, enabled: workspace.enabled, rule: await ruleView(tx, competitionId, workspace.publishedRuleVersionId) };
  }, { isolationLevel: "RepeatableRead" });
}
export async function readAgriWorkspaceRules(actorId: string) {
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId); const authority = await requireAgriScope(tx, ctx, "RULES_CONFIRM");
    const row = ctx.workspace;
    const view = { competitionId: row.competitionId, enabled: row.enabled, revision: row.draftRevision,
      draft: row.rulesDraft === null ? null : agriRulesDraftSchema.parse(row.rulesDraft),
      confirmedRule: row.confirmedRuleVersionId ? await ruleView(tx, row.competitionId, row.confirmedRuleVersionId) : null,
      publishedRule: row.publishedRuleVersionId ? await ruleView(tx, row.competitionId, row.publishedRuleVersionId) : null };
    await assertAgriAuthorityCurrent(tx, authority); return view;
  });
}
export async function executeAgriWorkspaceCommand(actorId: string, raw: unknown) {
  const command = agriWorkspaceCommandSchema.parse(raw);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId); const authority = await requireAgriScope(tx, ctx, "RULES_CONFIRM");
    const prior = await receipt(tx, ctx, command);
    if (prior) { await assertAgriAuthorityCurrent(tx, authority); return { resourceId: prior.resourceId, appliedRevision: prior.appliedRevision, duplicate: true }; }
    const row = ctx.workspace;
    if (row.draftRevision !== command.expectedRevision) return fail("AGRI_REVISION_CONFLICT");
    const now = await agriDatabaseClock(tx), next = row.draftRevision + 1;
    let ruleId: string | null = null;
    if (command.action === "saveRulesDraft") {
      await tx.$executeRaw`UPDATE agri_workspaces SET "rulesDraft" = ${JSON.stringify(command.draft)}::jsonb,"draftRevision" = ${next},"updatedById" = ${actorId},"updatedAt" = ${now} WHERE id = ${row.id}`;
    } else if (command.action === "confirmRules") {
      if (!row.rulesDraft) return fail("AGRI_RULE_DRAFT_REQUIRED", 422);
      const draft = agriRulesDraftSchema.parse(row.rulesDraft);
      if (row.confirmedRuleVersionId) {
        const confirmed = await ruleView(tx, row.competitionId, row.confirmedRuleVersionId);
        const previous = agriRulesDraftSchema.parse({ schemaVersion: 1, requirements: confirmed.requirements, guidanceMarkdown: confirmed.guidanceMarkdown,
          windows: confirmed.windows.map(item => item.state === "CONFIRMED"
            ? { stage: item.stage, state: "READY", opensAt: item.opensAt, closesAt: item.closesAt, includesDeadline: item.includesDeadline }
            : { stage: item.stage, state: "PENDING", opensAt: item.opensAt, closesAt: item.closesAt }) });
        if (canonicalRules(draft) === canonicalRules(previous)) return fail("AGRI_RULE_ALREADY_CONFIRMED");
      }
      const [latest] = await tx.$queryRaw<Array<{ version: number }>>`SELECT COALESCE(max(version),0)::integer AS version FROM agri_rule_versions WHERE "competitionId" = ${row.competitionId}`;
      ruleId = randomUUID();
      await tx.$executeRaw`INSERT INTO agri_rule_versions (id,"competitionId",version,requirements,"guidanceMarkdown","confirmedById","confirmedAt","createdAt")
        VALUES (${ruleId},${row.competitionId},${latest.version + 1},${JSON.stringify(draft.requirements)}::jsonb,${draft.guidanceMarkdown},${actorId},${now},${now})`;
      for (const item of draft.windows) await tx.$executeRaw`INSERT INTO agri_stage_windows (id,"competitionId","ruleVersionId",stage,state,"opensAt","closesAt","includesDeadline")
        VALUES (${randomUUID()},${row.competitionId},${ruleId},${item.stage},${item.state === "READY" ? "CONFIRMED" : "PENDING"},${item.opensAt ? new Date(item.opensAt) : null},${item.closesAt ? new Date(item.closesAt) : null},${item.state === "READY" ? item.includesDeadline : null})`;
      await tx.$executeRaw`UPDATE agri_workspaces SET "confirmedRuleVersionId" = ${ruleId},"draftRevision" = ${next},"updatedById" = ${actorId},"updatedAt" = ${now} WHERE id = ${row.id}`;
    } else if (command.action === "publishRules") {
      // Publication is an independent explicit command; an older version cannot silently replace the latest confirmation.
      if (command.ruleVersionId !== row.confirmedRuleVersionId) return fail("AGRI_RULE_VERSION_CONFLICT");
      const rule = await ruleView(tx, row.competitionId, command.ruleVersionId);
      if (row.enabled && !rule.windows.some(item => item.stage === "PRELIMINARY" && item.state === "CONFIRMED")) return fail("AGRI_PRELIMINARY_WINDOW_REQUIRED", 422);
      ruleId = command.ruleVersionId;
      await tx.$executeRaw`UPDATE agri_workspaces SET "publishedRuleVersionId" = ${ruleId},"draftRevision" = ${next},"updatedById" = ${actorId},"updatedAt" = ${now} WHERE id = ${row.id}`;
    } else {
      if (command.enabled) {
        if (!row.publishedRuleVersionId) return fail("AGRI_PUBLISHED_RULE_REQUIRED", 422);
        const rule = await ruleView(tx, row.competitionId, row.publishedRuleVersionId);
        if (!rule.windows.some(item => item.stage === "PRELIMINARY" && item.state === "CONFIRMED")) return fail("AGRI_PRELIMINARY_WINDOW_REQUIRED", 422);
      }
      ruleId = row.publishedRuleVersionId;
      await tx.$executeRaw`UPDATE agri_workspaces SET enabled = ${command.enabled},"draftRevision" = ${next},"updatedById" = ${actorId},"updatedAt" = ${now} WHERE id = ${row.id}`;
    }
    await tx.$executeRaw`INSERT INTO agri_workspace_events (id,"competitionId",revision,action,"ruleVersionId","actorId","createdAt") VALUES (${randomUUID()},${row.competitionId},${next},${command.action},${ruleId},${actorId},${now})`;
    await audit(tx, ctx, command.action, row.id, next); await recordReceipt(tx, ctx, command, ruleId ?? row.id, next, now);
    await assertAgriAuthorityCurrent(tx, authority);
    return { resourceId: ruleId ?? row.id, appliedRevision: next, duplicate: false };
  }, { timeout: 15000 });
}
export async function executeAgriGrantCommand(actorId: string, raw: unknown) {
  const command = agriGrantCommandSchema.parse(raw);
  if (command.recipientId === actorId) return fail("AGRI_SELF_GRANT_FORBIDDEN", 403);
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId), competitionId = ctx.workspace.competitionId;
    const manager = await requireAgriScope(tx, ctx, "ACCESS_MANAGE");
    // Check the recipient's current state even on replays; blocked accounts receive no usable authorization.
    const [recipient] = await tx.$queryRaw<Array<{ flagged: boolean; deletedAt: Date | null }>>`SELECT flagged,"deletedAt" FROM users WHERE id = ${command.recipientId} FOR SHARE`;
    if (!recipient || recipient.flagged || recipient.deletedAt) return fail("ACCOUNT_UNAVAILABLE", 403);
    const source = command.action === "delegateScope" ? await requireAgriScope(tx, ctx, command.scope) : null;
    if (source && !source.delegable) return fail("AGRI_SCOPE_NOT_DELEGABLE", 403);
    const prior = await receipt(tx, ctx, command);
    if (prior) { await assertAgriAuthorityCurrent(tx, manager, source); return { resourceId: prior.resourceId, appliedRevision: prior.appliedRevision, duplicate: true }; }
    const [old] = await tx.$queryRaw<GrantRow[]>`SELECT * FROM agri_access_grants WHERE "competitionId" = ${competitionId} AND "userId" = ${command.recipientId} AND scope = ${command.scope} FOR UPDATE`;
    if ((old?.revision ?? 0) !== command.expectedRevision) return fail("AGRI_REVISION_CONFLICT");
    if (old && command.action === "delegateScope") await requireAgriScope(tx, ctx, command.scope, old.id);
    const now = await agriDatabaseClock(tx), next = (old?.revision ?? 0) + 1, id = old?.id ?? randomUUID();
    if (command.action === "revokeScope") {
      if (!old) return fail("AGRI_GRANT_NOT_FOUND", 404);
      await tx.$executeRaw`UPDATE agri_access_grants SET "revokedAt" = ${now},revision = ${next} WHERE id = ${id}`;
    } else {
      if (!source) return fail("AGRI_SCOPE_REQUIRED", 403);
      const expiry = command.expiresAt ? new Date(command.expiresAt) : null;
      if ((expiry && expiry <= now) || [manager.expiresAt, source.expiresAt].some(at => at && (!expiry || expiry > at))) return fail("AGRI_GRANT_EXPIRY_INVALID", 422);
      if (old) await tx.$executeRaw`UPDATE agri_access_grants SET "grantedById" = ${actorId},"grantedAt" = ${now},"expiresAt" = ${expiry},"revokedAt" = NULL,
        delegable = ${command.delegable},revision = ${next},"sourceGrantId" = ${source.id},"sourceRevision" = ${source.revision},"managerGrantId" = ${manager.id},"managerRevision" = ${manager.revision} WHERE id = ${id}`;
      else await tx.$executeRaw`INSERT INTO agri_access_grants (id,"competitionId","userId",scope,"grantedById","grantedAt","expiresAt",delegable,revision,"sourceGrantId","sourceRevision","managerGrantId","managerRevision")
        VALUES (${id},${competitionId},${command.recipientId},${command.scope},${actorId},${now},${expiry},${command.delegable},${next},${source.id},${source.revision},${manager.id},${manager.revision})`;
    }
    await audit(tx, ctx, command.action, id, next); await recordReceipt(tx, ctx, command, id, next, now);
    await assertAgriAuthorityCurrent(tx, manager, source, command.action === "delegateScope" && command.expiresAt ? { expiresAt: new Date(command.expiresAt) } : null);
    return { resourceId: id, appliedRevision: next, duplicate: false };
  }, { timeout: 15000 });
}