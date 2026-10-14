import {
  agriCheckFeedbackEventSchema,
  agriSubmissionLifecycleSnapshotSchema,
  agriSubmissionRequirementsSchema,
  agriCorrectionPermitSnapshotSchema,
  agriStageSubmissionCommandSchema,
  agriStageSubmissionContentSchema,
  type AgriCorrectableField,
} from "@/contracts/agri-submissions";
import { getAgriWindowState } from "./agrihackathon";

export type AgriSubmissionLifecycleDecision = "ALLOW" | "INVALID" | "WORKSPACE_DISABLED" |
  "EDITION_MISMATCH" | "ENTRY_MISMATCH" | "REVISION_CONFLICT" | "RULE_VERSION_CONFLICT" |
  "RULES_UNPUBLISHED" | "STAGE_MISMATCH" | "FROZEN" | "FINAL_ELIGIBILITY_REQUIRED" |
  "RULES_PENDING" | "NOT_OPEN" | "CLOSED";

/**
 * Candidate lifecycle guard only, not an authorization or persistence service.
 * The future service must load this snapshot after locking and rechecking actor,
 * membership and version ownership; now must be the post-lock database clock.
 * Corrections use a separate single-use permit path and cannot enter this guard.
 */
export function getAgriSubmissionLifecycleDecision(
  rawSnapshot: unknown, rawCommand: unknown, now: Date,
): AgriSubmissionLifecycleDecision {
  const snapshotResult = agriSubmissionLifecycleSnapshotSchema.safeParse(rawSnapshot);
  const commandResult = agriStageSubmissionCommandSchema.safeParse(rawCommand);
  if (!snapshotResult.success || !commandResult.success || commandResult.data.action !== "submit" ||
    !Number.isFinite(now.getTime())) return "INVALID";
  const state = snapshotResult.data;
  const command = commandResult.data;
  if (!state.workspaceEnabled) return "WORKSPACE_DISABLED";
  if (state.competitionId !== state.entry.competitionId || state.competitionId !== state.rule.competitionId) return "EDITION_MISMATCH";
  if (state.entry.id !== command.entryStageId) return "ENTRY_MISMATCH";
  if (state.entry.revision !== command.expectedRevision) return "REVISION_CONFLICT";
  if (!state.publishedRuleVersionId) return "RULES_UNPUBLISHED";
  if (state.publishedRuleVersionId !== state.rule.id || state.rule.id !== command.expectedRuleVersionId) return "RULE_VERSION_CONFLICT";
  if (state.rule.window.stage !== state.entry.stage) return "STAGE_MISMATCH";
  if (state.entry.frozenSubmissionId) return "FROZEN";
  if (state.entry.stage === "FINAL" && state.finalEligibility.state !== "ELIGIBLE") return "FINAL_ELIGIBILITY_REQUIRED";
  const windowState = getAgriWindowState(state.rule.window, now);
  return windowState === "OPEN" ? "ALLOW" : windowState;
}

export type AgriCorrectionDecision = { allowed: true; changedFields: AgriCorrectableField[] } |
  { allowed: false; reason: "INVALID" | "PERMIT_MISMATCH" | "PERMIT_INACTIVE" | "PROJECT_CHANGE_FORBIDDEN" | "NO_CHANGE" | "FIELD_NOT_ALLOWED" };

/** Pure permit/content guard; single-use consumption and version ownership require the future DB transaction. */
export function getAgriCorrectionDecision(
  rawPermit: unknown,
  target: { competitionId: string; entryStageId: string; previousSubmissionId: string; permitId: string },
  rawPrevious: unknown, rawNext: unknown, now: Date,
): AgriCorrectionDecision {
  const permitResult = agriCorrectionPermitSnapshotSchema.safeParse(rawPermit);
  const previousResult = agriStageSubmissionContentSchema.safeParse(rawPrevious);
  const nextResult = agriStageSubmissionContentSchema.safeParse(rawNext);
  if (!permitResult.success || !previousResult.success || !nextResult.success || !Number.isFinite(now.getTime())) {
    return { allowed: false, reason: "INVALID" };
  }
  const permit = permitResult.data;
  if (permit.id !== target.permitId || permit.competitionId !== target.competitionId ||
    permit.entryStageId !== target.entryStageId || permit.previousSubmissionId !== target.previousSubmissionId) {
    return { allowed: false, reason: "PERMIT_MISMATCH" };
  }
  if (permit.revokedAt !== null || permit.usedBySubmissionId !== null ||
    Date.parse(permit.authorizedAt) > now.getTime() || Date.parse(permit.expiresAt) <= now.getTime()) {
    return { allowed: false, reason: "PERMIT_INACTIVE" };
  }
  const previous = previousResult.data;
  const next = nextResult.data;
  if (previous.projectId !== next.projectId) return { allowed: false, reason: "PROJECT_CHANGE_FORBIDDEN" };
  const fields: AgriCorrectableField[] = ["artifactVersionId", "repository", "demoUrl", "summary", "materials"];
  // Both objects were rebuilt by the same strict schema; property order is canonical.
  const changedFields = fields.filter(field => JSON.stringify(previous[field]) !== JSON.stringify(next[field]));
  if (changedFields.length === 0) return { allowed: false, reason: "NO_CHANGE" };
  if (changedFields.some(field => !permit.allowedFields.includes(field))) return { allowed: false, reason: "FIELD_NOT_ALLOWED" };
  return { allowed: true, changedFields };
}

/** Caller must first authorize this check for the team and load its latest event, including withdrawals. */
export function projectAgriTeamCheckFeedback(rawLatestEvent: unknown, competitionId: string, checkId: string) {
  const result = agriCheckFeedbackEventSchema.safeParse(rawLatestEvent);
  if (!result.success) return null;
  const event = result.data;
  if (event.competitionId !== competitionId || event.checkId !== checkId || event.action !== "PUBLISH") return null;
  return { checkId: event.checkId, sequence: event.sequence, body: event.body, publishedAt: event.createdAt };
}

export type AgriSubmissionMaterialIssue = { code: "INVALID" | "REPOSITORY_REQUIRED" | "REPOSITORY_REF_REQUIRED" |
  "DEMO_REQUIRED" | "MATERIAL_REQUIRED" | "MATERIAL_KIND_MISMATCH" | "UNRECOGNIZED_MATERIAL"; key?: string };

/** Validate only against the fixed rule version selected by the future locked service. No URL is fetched. */
export function getAgriSubmissionMaterialIssues(rawRequirements: unknown, rawContent: unknown): AgriSubmissionMaterialIssue[] {
  const requirementsResult = agriSubmissionRequirementsSchema.safeParse(rawRequirements);
  const contentResult = agriStageSubmissionContentSchema.safeParse(rawContent);
  if (!requirementsResult.success || !contentResult.success) return [{ code: "INVALID" }];
  const requirements = requirementsResult.data;
  const content = contentResult.data;
  const issues: AgriSubmissionMaterialIssue[] = [];
  if (requirements.repositoryRequired && !content.repository) issues.push({ code: "REPOSITORY_REQUIRED" });
  if (requirements.repositoryRefRequired && !content.repository?.ref) issues.push({ code: "REPOSITORY_REF_REQUIRED" });
  if (requirements.demoRequired && !content.demoUrl) issues.push({ code: "DEMO_REQUIRED" });
  const supplied = new Map(content.materials.items.map(item => [item.key, item]));
  const declared = new Map(requirements.materials.map(item => [item.key, item]));
  for (const requirement of requirements.materials) {
    const material = supplied.get(requirement.key);
    if (!material && requirement.required) issues.push({ code: "MATERIAL_REQUIRED", key: requirement.key });
    if (material && material.kind !== requirement.kind) issues.push({ code: "MATERIAL_KIND_MISMATCH", key: requirement.key });
  }
  for (const material of content.materials.items) {
    if (!declared.has(material.key)) issues.push({ code: "UNRECOGNIZED_MATERIAL", key: material.key });
  }
  return issues;
}

/** Shared read projection; never persist a deadline freeze during listing/export. */
export function projectAgriSubmissionFreeze(
  stage: { currentSubmissionId: string | null; frozenSubmissionId: string | null },
  adoptedWindow: unknown,
  now: Date,
) {
  const frozenByDeadline = !stage.frozenSubmissionId && !!stage.currentSubmissionId &&
    getAgriWindowState(adoptedWindow, now) === "CLOSED";
  return { frozenSubmissionId: stage.frozenSubmissionId ?? (frozenByDeadline ? stage.currentSubmissionId : null),
    recordedFrozenSubmissionId: stage.frozenSubmissionId, frozenByDeadline };
}
