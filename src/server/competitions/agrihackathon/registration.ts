import { agriSubmissionRequirementsSchema } from "@/contracts/agri-submissions";
import type { DbTransaction } from "@/lib/db";
import { agriSubmissionWindowSchema } from "@/contracts/agrihackathon";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { getAgriWindowState } from "@/domain/competitions/agrihackathon";
import { agriDatabaseClock, configuredAgriEditionId, lockAgriWorkspace } from "./workspace";

interface WindowRow {
  state: string; opensAt: Date | null; closesAt: Date | null; includesDeadline: boolean | null;
  confirmedById: string; confirmedAt: Date; requirements?: unknown;
}
export interface AgriRegistrationWindow {
  ruleVersionId: string;
  computeGrantPoints?: number;
  window: ReturnType<typeof agriSubmissionWindowSchema.parse>;
}
const fail = (code: string, status = 409): never => { throw new AgriWorkspaceError(code, status); };

/** A managed edition cannot fall back to general competition dates, even when disabled or unbound. */
export async function lockCompetitionRegistrationWindow(tx: DbTransaction, actorId: string, competitionId: string): Promise<AgriRegistrationWindow | null> {
  const [candidate] = await tx.$queryRaw<Array<{ competitionId: string }>>`SELECT "competitionId" FROM agri_workspaces
    WHERE "competitionId"=${competitionId} FOR UPDATE`;
  const configured = process.env.ANS_AGRIHACKATHON_COMPETITION_ID?.trim();
  if (!candidate && configured !== competitionId) return null;
  if (configuredAgriEditionId() !== competitionId) return fail("AGRI_EDITION_NOT_CONFIGURED", 503);
  const ctx = await lockAgriWorkspace(tx, actorId);
  if (!ctx.workspace.enabled) return fail("AGRI_WORKSPACE_DISABLED");
  const ruleVersionId = ctx.workspace.publishedRuleVersionId;
  if (!ruleVersionId) return fail("AGRI_RULES_UNPUBLISHED");
  const [row] = await tx.$queryRaw<WindowRow[]>`SELECT w.state,w."opensAt",w."closesAt",w."includesDeadline",r."confirmedById",r."confirmedAt",r.requirements
    FROM agri_stage_windows w JOIN agri_rule_versions r ON r.id=w."ruleVersionId" AND r."competitionId"=w."competitionId"
    WHERE w."competitionId"=${competitionId} AND w."ruleVersionId"=${ruleVersionId} AND w.stage='REGISTRATION'`;
  if (!row) return fail("AGRI_RULE_INVALID", 500);
  const parsed = agriSubmissionWindowSchema.safeParse(row.state === "PENDING"
    ? { stage: "REGISTRATION", state: "PENDING", opensAt: null, closesAt: null }
    : { stage: "REGISTRATION", state: row.state, opensAt: row.opensAt?.toISOString() ?? null,
      closesAt: row.closesAt?.toISOString() ?? null, includesDeadline: row.includesDeadline,
      confirmedById: row.confirmedById, confirmedAt: row.confirmedAt.toISOString() });
  if (!parsed.success) return fail("AGRI_RULE_INVALID", 500);
  const requirements = agriSubmissionRequirementsSchema.safeParse(row.requirements);
  return { ruleVersionId, window: parsed.data, ...(requirements.success && requirements.data.computeGrantPoints ? { computeGrantPoints: requirements.data.computeGrantPoints } : {}) };
}

/** Recheck at the last write: lock acquisition and auditing must not extend the agreed deadline. */
export async function assertAgriRegistrationOpen(tx: DbTransaction, registration: AgriRegistrationWindow) {
  const now = await agriDatabaseClock(tx);
  const state = getAgriWindowState(registration.window, now);
  if (state !== "OPEN") return fail("AGRI_REGISTRATION_" + state);
  return now;
}