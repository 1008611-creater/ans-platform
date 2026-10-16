import { createHash } from "node:crypto";
import type { DbTransaction } from "@/lib/db";
import { db } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriSubmissionRequirementsSchema } from "@/contracts/agri-submissions";
import type { AgriTeamCredits } from "@/contracts/agri-credits";
import { lockAgriWorkspace, agriDatabaseClock, type AgriWorkspaceContext } from "./workspace";

type Tx = DbTransaction;
interface Entry { id: string; competitionId: string; teamId: string; frozen: boolean; entryStatus: string; competitionStatus: string }
interface Wallet { id: string; competitionId: string; teamCompetitionId: string; amount: unknown; used: unknown }
interface Member { role: string; status: string }
interface Policy { ruleVersionId: string; amount: number; cycleOpen: boolean; opensAt: Date | null; closesAt: Date | null; includesDeadline: boolean }
const fail = (code: string, status = 409): never => { throw new AgriWorkspaceError(code, status); };
const key = (...parts: string[]) => createHash("sha256").update(JSON.stringify(parts)).digest("hex");
const micros = (value: number) => Math.round(value * 1e6);
function amount(value: unknown) { return Number(value); }

/** A published, confirmed policy is the only authority for grant amount and cycle. */
async function policy(tx: Tx, ctx: AgriWorkspaceContext): Promise<Policy | null> {
  if (!ctx.workspace.publishedRuleVersionId) return null;
  const [row] = await tx.$queryRaw<Array<{ id: string; requirements: unknown }>>`SELECT id,requirements FROM agri_rule_versions
    WHERE id=${ctx.workspace.publishedRuleVersionId} AND "competitionId"=${ctx.workspace.competitionId}`;
  if (!row) return fail("AGRI_RULE_INVALID", 500);
  const parsed = agriSubmissionRequirementsSchema.safeParse(row.requirements);
  if (!parsed.success) return fail("AGRI_RULE_INVALID", 500);
  const points = parsed.data.computeGrantPoints;
  if (!points || points <= 0) return null;
  const windows = await tx.$queryRaw<Array<{ stage: string; state: string; opensAt: Date | null; closesAt: Date | null; includesDeadline: boolean | null }>>`
    SELECT stage,state,"opensAt","closesAt","includesDeadline" FROM agri_stage_windows
    WHERE "competitionId"=${ctx.workspace.competitionId} AND "ruleVersionId"=${row.id} AND stage IN ('REGISTRATION','FINAL')`;
  const start = windows.find(w => w.stage === "REGISTRATION"), end = windows.find(w => w.stage === "FINAL");
  const now = await agriDatabaseClock(tx);
  const cycleOpen = Boolean(start?.state === "CONFIRMED" && end?.state === "CONFIRMED" && start.opensAt && end.closesAt
    && now >= start.opensAt && (end.includesDeadline ? now <= end.closesAt : now < end.closesAt));
  return { ruleVersionId: row.id, amount: points, cycleOpen, opensAt: start?.state === "CONFIRMED" ? start.opensAt : null, closesAt: end?.state === "CONFIRMED" ? end.closesAt : null, includesDeadline: end?.includesDeadline === true };
}
/** Check database wall time after lock waits and again after the final write. */
async function currentPolicy(tx: Tx, config: Policy): Promise<Policy> {
  const now = await agriDatabaseClock(tx);
  return { ...config, cycleOpen: Boolean(config.opensAt && config.closesAt && now >= config.opensAt
    && (config.includesDeadline ? now <= config.closesAt : now < config.closesAt)) };
}
async function target(tx: Tx, ctx: AgriWorkspaceContext, entryId: string) {
  const [entry] = await tx.$queryRaw<Entry[]>`SELECT tc.id,tc."competitionId",tc."teamId",tc.frozen,tc."entryStatus",c.status AS "competitionStatus" FROM team_competitions tc JOIN competitions c ON c.id=tc."competitionId"
    WHERE tc.id=${entryId} AND tc."competitionId"=${ctx.workspace.competitionId} FOR UPDATE OF tc`;
  if (!entry) return fail("AGRI_ENTRY_NOT_FOUND", 404);
  const [member] = await tx.$queryRaw<Member[]>`SELECT role,status FROM team_members
    WHERE "teamId"=${entry.teamId} AND "userId"=${ctx.actorId} FOR SHARE`;
  if (member?.status !== "ACTIVE") return fail("AGRI_TEAM_PERMISSION_REQUIRED", 403);
  if (entry.entryStatus === "REJECTED") return fail("AGRI_CREDITS_ENTRY_INACTIVE");
  return { entry, member };
}
async function wallet(tx: Tx, competitionId: string, entryId: string) {
  const [row] = await tx.$queryRaw<Wallet[]>`SELECT id,"competitionId","teamCompetitionId",amount,used FROM agri_team_compute_grants
    WHERE "competitionId"=${competitionId} AND "teamCompetitionId"=${entryId} FOR UPDATE`;
  return row;
}
function view(ctx: AgriWorkspaceContext, entry: Entry, member: Member, config: Policy | null, grant?: Wallet): AgriTeamCredits {
  const total = grant ? amount(grant.amount) : 0, used = grant ? amount(grant.used) : 0;
  const enabled = ctx.workspace.enabled && !entry.frozen && entry.competitionStatus !== "ENDED" && Boolean(config?.cycleOpen);
  return { competitionId: entry.competitionId, teamCompetitionId: entry.id, state: grant ? "GRANTED" : config ? "AVAILABLE" : "UNCONFIGURED",
    amount: total, used, remaining: (micros(total) - micros(used)) / 1e6,
    canClaim: !grant && enabled && member.role === "OWNER", spendingEnabled: Boolean(grant) && enabled };
}

/** Shared by the participant workspace projection; never grants on a read. */
export async function readAgriTeamCredits(tx: Tx, ctx: AgriWorkspaceContext, entryId: string): Promise<AgriTeamCredits> {
  const { entry, member } = await target(tx, ctx, entryId);
  const config = await policy(tx, ctx), grant = await wallet(tx, entry.competitionId, entry.id);
  return view(ctx, entry, member, config ? await currentPolicy(tx, config) : null, grant);
}
export async function getAgriTeamCredits(actorId: string, entryId: string) {
  return db.$transaction(async tx => readAgriTeamCredits(tx, await lockAgriWorkspace(tx, actorId), entryId));
}
async function grant(tx: Tx, ctx: AgriWorkspaceContext, entryId: string, ownerOnly: boolean) {
  const { entry, member } = await target(tx, ctx, entryId);
  if (ownerOnly ? member.role !== "OWNER" : !["OWNER", "ADMIN"].includes(member.role)) return fail("AGRI_TEAM_MANAGER_REQUIRED", 403);
  let config = await policy(tx, ctx);
  const prior = await wallet(tx, entry.competitionId, entry.id);
  if (config) config = await currentPolicy(tx, config);
  if (prior) return view(ctx, entry, member, config, prior);
  if (!config) return view(ctx, entry, member, null);
  if (!ctx.workspace.enabled || entry.frozen || entry.competitionStatus === "ENDED" || !config.cycleOpen) {
    if (!ownerOnly) return view(ctx, entry, member, config);
    return fail("AGRI_CREDITS_CYCLE_CLOSED");
  }
  // The optional registration benefit must not undo a valid registration when
  // its own write/audit crosses the credit deadline. A savepoint isolates it.
  if (!ownerOnly) await tx.$executeRaw`SAVEPOINT agri_compute_grant`;
  const id = "agri-grant-" + key(entry.competitionId, entry.id);
  await tx.$executeRaw`INSERT INTO agri_team_compute_grants(id,"competitionId","teamCompetitionId","ruleVersionId",amount,used,"grantedById")
    VALUES(${id},${entry.competitionId},${entry.id},${config.ruleVersionId},${config.amount}::numeric,0,${ctx.actorId})`;
  await tx.quotaLedger.create({ data: { id, userId: null, amount: config.amount, balanceAfter: config.amount, reason: "TEAM_GRANT",
    refType: "AGRIHACKATHON_TEAM_GRANT", refId: id, note: JSON.stringify({ competitionId: entry.competitionId, teamCompetitionId: entry.id }) } });
  await tx.auditLog.create({ data: { actorId: ctx.actorId, action: "AGRIHACKATHON_TEAM_GRANT", resourceType: "team_competition", resourceId: entry.id,
    metadata: { competitionId: entry.competitionId, walletId: id, ruleVersionId: config.ruleVersionId, amount: config.amount } } });
  config = await currentPolicy(tx, config);
  if (!config.cycleOpen) {
    if (ownerOnly) return fail("AGRI_CREDITS_CYCLE_CLOSED");
    await tx.$executeRaw`ROLLBACK TO SAVEPOINT agri_compute_grant`;
    await tx.$executeRaw`RELEASE SAVEPOINT agri_compute_grant`;
    return view(ctx, entry, member, config);
  }
  if (!ownerOnly) await tx.$executeRaw`RELEASE SAVEPOINT agri_compute_grant`;
  return view(ctx, entry, member, config, { id, competitionId: entry.competitionId, teamCompetitionId: entry.id, amount: config.amount, used: 0 });
}
export async function claimAgriTeamCredits(actorId: string, entryId: string) {
  return db.$transaction(async tx => grant(tx, await lockAgriWorkspace(tx, actorId), entryId, true));
}
/** Registration owns its window checks; keep legacy/unmanaged registrations untouched. */
export async function grantAgriRegistrationCredits(tx: Tx, actorId: string, competitionId: string, entryId: string) {
  if (process.env.ANS_AGRIHACKATHON_COMPETITION_ID?.trim() !== competitionId) return null;
  return grant(tx, await lockAgriWorkspace(tx, actorId), entryId, false);
}

export interface AgriCreditCharge { userId: string; costPoints: number; ref: { type: string; id: string }; note: string }
const chargeId = (args: AgriCreditCharge) => "agri-charge-" + key(args.userId, args.ref.type, args.ref.id);
/** Only server-created runs carrying an owned active team project may use this wallet. */
async function projectForCharge(tx: Tx, args: AgriCreditCharge) {
  let runId: string | undefined;
  if (args.ref.type === "workflow_run") runId = args.ref.id;
  else if (args.ref.type === "api_compute_request") {
    const request = await tx.apiComputeRequest.findFirst({ where: { id: args.ref.id, userId: args.userId }, select: { price: true } });
    const price = request?.price;
    if (price && typeof price === "object" && !Array.isArray(price)) {
      const parent = price.parent;
      if (parent && typeof parent === "object" && !Array.isArray(parent) && parent.type === "workflow_run" && typeof parent.id === "string") runId = parent.id;
    }
  }
  if (!runId) return null;
  return tx.workflowRun.findFirst({ where: { id: runId, userId: args.userId }, select: { project: { select: { id: true, teamId: true, ownerId: true, status: true } } } }).then(run => run?.project ?? null);
}
/** Gateway reservations must take the event lock before their existing account lock. */
export async function prelockAgriTeamCharge(tx: Tx, userId: string, ref?: { type: string; id: string }) {
  if (!ref || !process.env.ANS_AGRIHACKATHON_COMPETITION_ID?.trim()) return;
  const project = await projectForCharge(tx, { userId, ref, costPoints: 0, note: "" });
  if (!project?.teamId || project.ownerId !== userId) return;
  const competitionId = process.env.ANS_AGRIHACKATHON_COMPETITION_ID!.trim();
  // Lock an existing edition before the account even for a not-yet-registered
  // team: registration and its first grant may commit between the two checks.
  const [workspace] = await tx.$queryRaw<Array<{ competitionId: string }>>`SELECT "competitionId" FROM agri_workspaces
    WHERE "competitionId"=${competitionId} FOR UPDATE`;
  if (workspace) { await lockAgriWorkspace(tx, userId); return; }
  const [entry] = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM team_competitions
    WHERE "competitionId"=${competitionId} AND "teamId"=${project.teamId}`;
  if (entry) { await lockAgriWorkspace(tx, userId); return; }
  // A missing workspace must not block unrelated personal use. Pin this
  // reservation's funding so a concurrent workspace+grant cannot invert locks.
  return "PERSONAL" as const;
}
/** Returns null only when this request has no granted event wallet; never falls back after selecting one. */
export async function debitAgriTeamCredits(tx: Tx, args: AgriCreditCharge): Promise<number | null> {
  if (!process.env.ANS_AGRIHACKATHON_COMPETITION_ID?.trim() || !["workflow_run", "api_compute_request"].includes(args.ref.type)) return null;
  const project = await projectForCharge(tx, args);
  if (!project?.teamId || project.ownerId !== args.userId) return null;
  const competitionId = process.env.ANS_AGRIHACKATHON_COMPETITION_ID!.trim();
  const [candidate] = await tx.$queryRaw<Array<{ teamCompetitionId: string }>>`SELECT g."teamCompetitionId" FROM agri_team_compute_grants g
    JOIN team_competitions tc ON tc.id=g."teamCompetitionId" AND tc."competitionId"=g."competitionId"
    WHERE g."competitionId"=${competitionId} AND tc."teamId"=${project.teamId}`;
  if (!candidate) return null;
  const ctx = await lockAgriWorkspace(tx, args.userId);
  const { entry } = await target(tx, ctx, candidate.teamCompetitionId);
  const config = await policy(tx, ctx);
  const [currentProject] = await tx.$queryRaw<Array<{ teamId: string | null; ownerId: string; status: string }>>`SELECT "teamId","ownerId",status FROM projects WHERE id=${project.id} FOR SHARE`;
  if (!currentProject || currentProject.teamId !== entry.teamId || currentProject.ownerId !== args.userId) return fail("AGRI_PROJECT_UNAVAILABLE", 403);
  if (!ctx.workspace.enabled || entry.frozen || entry.competitionStatus === "ENDED" || !config?.cycleOpen || currentProject.status !== "ACTIVE") return fail("AGRI_CREDITS_CYCLE_CLOSED", 403);
  const grant = await wallet(tx, entry.competitionId, entry.id);
  if (!grant) return fail("AGRI_CREDITS_NOT_GRANTED");
  const id = chargeId(args), prior = await tx.quotaLedger.findUnique({ where: { id }, select: { amount: true, refType: true, refId: true } });
  if (prior) {
    if (prior.refType !== "AGRIHACKATHON_TEAM_DEBIT" || prior.refId !== grant.id || micros(amount(prior.amount)) !== -micros(args.costPoints)) return fail("AGRI_CREDITS_CHARGE_CONFLICT");
    return (micros(amount(grant.amount)) - micros(amount(grant.used))) / 1e6;
  }
  if (!(await currentPolicy(tx, config)).cycleOpen) return fail("AGRI_CREDITS_CYCLE_CLOSED", 403);
  const remaining = micros(amount(grant.amount)) - micros(amount(grant.used));
  if (micros(args.costPoints) > remaining) return fail("AGRI_CREDITS_INSUFFICIENT", 402);
  await tx.$executeRaw`UPDATE agri_team_compute_grants SET used=used+${args.costPoints}::numeric WHERE id=${grant.id}`;
  const balance = (remaining - micros(args.costPoints)) / 1e6;
  await tx.quotaLedger.create({ data: { id, userId: null, amount: -args.costPoints, balanceAfter: balance, reason: "RUN_COST",
    refType: "AGRIHACKATHON_TEAM_DEBIT", refId: grant.id, note: JSON.stringify({ actorId: args.userId, source: args.ref, note: args.note }) } });
  if (!(await currentPolicy(tx, config)).cycleOpen) return fail("AGRI_CREDITS_CYCLE_CLOSED", 403);
  return balance;
}
/** Outer callers invoke this after their remaining writes, immediately before return. */
export async function assertAgriChargeWindowCurrent(tx: Tx, userId: string, ref: { type: string; id: string }) {
  if (!process.env.ANS_AGRIHACKATHON_COMPETITION_ID?.trim() || !["workflow_run", "api_compute_request"].includes(ref.type)) return;
  const debit = await tx.quotaLedger.findUnique({ where: { id: chargeId({ userId, ref, costPoints: 0, note: "" }) }, select: { refType: true } });
  if (debit?.refType !== "AGRIHACKATHON_TEAM_DEBIT") return;
  const ctx = await lockAgriWorkspace(tx, userId), config = await policy(tx, ctx);
  if (!ctx.workspace.enabled || !config?.cycleOpen) return fail("AGRI_CREDITS_CYCLE_CLOSED", 403);
}
/** Finds the durable original wallet, even after membership, edition or cycle changes. */
export async function refundAgriTeamCredits(tx: Tx, args: AgriCreditCharge): Promise<boolean> {
  if (!["workflow_run", "api_compute_request"].includes(args.ref.type)) return false;
  const debitId = chargeId(args);
  const debit = await tx.quotaLedger.findUnique({ where: { id: debitId }, select: { refId: true, refType: true, amount: true } });
  if (!debit || debit.refType !== "AGRIHACKATHON_TEAM_DEBIT" || !debit.refId) return false;
  const [grant] = await tx.$queryRaw<Wallet[]>`SELECT id,"competitionId","teamCompetitionId",amount,used FROM agri_team_compute_grants WHERE id=${debit.refId} FOR UPDATE`;
  if (!grant) return fail("AGRI_CREDITS_WALLET_MISSING", 500);
  const id = "agri-refund-" + key(debitId);
  const prior = await tx.quotaLedger.findUnique({ where: { id }, select: { amount: true } });
  if (prior) {
    if (micros(amount(prior.amount)) !== micros(args.costPoints)) return fail("AGRI_CREDITS_REFUND_CONFLICT", 409);
    return true;
  }
  if (micros(args.costPoints) > -micros(amount(debit.amount)) || micros(args.costPoints) > micros(amount(grant.used))) return fail("AGRI_CREDITS_REFUND_CONFLICT", 409);
  await tx.$executeRaw`UPDATE agri_team_compute_grants SET used=used-${args.costPoints}::numeric WHERE id=${grant.id}`;
  await tx.quotaLedger.create({ data: { id, userId: null, amount: args.costPoints,
    balanceAfter: (micros(amount(grant.amount)) - micros(amount(grant.used)) + micros(args.costPoints)) / 1e6,
    reason: "REFUND", refType: "AGRIHACKATHON_TEAM_REFUND", refId: grant.id, note: JSON.stringify({ actorId: args.userId, source: args.ref, note: args.note }) } });
  return true;
}
