import {
  agriAccessGrantSchema,
  agriSubmissionWindowSchema,
  agriWorkspaceScopeSchema,
  type AgriTargetDate,
  type AgriTaskStatus,
  type AgriWorkspaceScope,
} from "@/contracts/agrihackathon";

/** Pure candidate policy. The service must load grants and current account status. */
export function hasAgriWorkspaceScope(
  grants: readonly unknown[],
  competitionId: string,
  actor: { id: string; active: boolean },
  scope: AgriWorkspaceScope,
  now: Date,
): boolean {
  if (actor.active !== true || !actor.id || !competitionId || !agriWorkspaceScopeSchema.safeParse(scope).success || !Number.isFinite(now.getTime())) return false;
  return grants.some(raw => {
    const parsed = agriAccessGrantSchema.safeParse(raw);
    if (!parsed.success) return false;
    const grant = parsed.data;
    return grant.competitionId === competitionId && grant.userId === actor.id &&
      grant.revokedAt === null && (grant.expiresAt === null || Date.parse(grant.expiresAt) > now.getTime()) &&
      grant.scopes.includes(scope);
  });
}

export type AgriWindowState = "RULES_PENDING" | "NOT_OPEN" | "OPEN" | "CLOSED" | "INVALID";

/** The deadline boundary is an explicit confirmed rule, never a platform default. */
export function getAgriWindowState(rawWindow: unknown, now: Date): AgriWindowState {
  const parsed = agriSubmissionWindowSchema.safeParse(rawWindow);
  if (!parsed.success || !Number.isFinite(now.getTime())) return "INVALID";
  const window = parsed.data;
  if (window.state === "PENDING") return "RULES_PENDING";
  const clock = now.getTime();
  if (clock < Date.parse(window.opensAt)) return "NOT_OPEN";
  const deadline = Date.parse(window.closesAt);
  if (clock > deadline || (clock === deadline && !window.includesDeadline)) return "CLOSED";
  return "OPEN";
}

/** Tentative or unknown dates never count as officially overdue or completed. */
export function deriveAgriTaskDueState(due: AgriTargetDate, status: AgriTaskStatus, now: Date) {
  if (status === "DONE") return "DONE";
  if (due.state === "UNKNOWN") return "UNDATED";
  if (due.state === "TENTATIVE") return "TENTATIVE";
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(Date.parse(due.at))) throw new RangeError("INVALID_TASK_DATE");
  return now.getTime() > Date.parse(due.at) ? "OVERDUE" : "SCHEDULED";
}
