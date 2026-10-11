import { z } from "zod";
import type { AgriStageSubmissionContent } from "./agri-submissions";
import type { AgriDemoSnapshot } from "./agri-demo";

const explicitBoolean = z.union([z.boolean(), z.enum(["true", "false"]).transform(value => value === "true")]);
export const agriRecordSummaryQuerySchema = z.object({
  includePrivate: explicitBoolean.default(false),
  includeInternal: explicitBoolean.default(false),
  mode: z.enum(["view", "exportJSON"]).default("view"),
}).strict();
export type AgriRecordSummaryQuery = z.infer<typeof agriRecordSummaryQuerySchema>;
export const AGRI_RECORD_SUMMARY_LIMIT = 100;
export interface AgriSummarySubmission {
  id: string; entryStageId: string; stage: "PRELIMINARY" | "FINAL"; sequence: number;
  artifactVersionId: string; artifactVersion: number; ruleVersionId: string; acceptedAt: string;
  isCurrent: boolean; isFrozen: boolean;
  /** Optional provenance for live projections; older immutable archives retain their saved shape. */
  isRecordedFrozen?: boolean; frozenByDeadline?: boolean;
  correction?: { previousSubmissionId: string; permitId: string; reason: string; authorizedById: string; authorizedAt: string };
}
export interface AgriSummaryFeedback { sequence: number; publishedAt: string; actorId?: string; body?: string }
export interface AgriSummaryCheck {
  id: string; basis: "METADATA" | "PRIVATE_MATERIALS"; result: "PASS" | "NEEDS_ACTION" | "UNREACHABLE";
  checkedAt: string; checkedById?: string; feedback: AgriSummaryFeedback | null;
  checklist?: { schemaVersion: 1; items: Array<{ key: string; result: "PASS" | "NEEDS_ACTION" | "UNREACHABLE" | "NOT_APPLICABLE"; note: string }> };
  internalNote?: string | null;
}
export interface AgriSummaryDemo {
  id: string; sequence: number; recheckOfId: string | null; basis: "METADATA" | "PRIVATE_MATERIALS";
  result: "PASS" | "NEEDS_ACTION" | "UNREACHABLE"; checkedAt: string; checkedById?: string;
  feedback: AgriSummaryFeedback | null; demo?: AgriDemoSnapshot; internalNote?: string | null;
}
export interface AgriSummaryIssue {
  id: string; revision: number; status: string; severity: string; type: string;
  basis: "METADATA" | "PRIVATE_MATERIALS"; visibility: "TEAM" | "INTERNAL";
  dueState: "UNKNOWN" | "TENTATIVE" | "CONFIRMED"; dueAt: string | null; createdAt: string; updatedAt: string;
  assigneeId?: string | null; createdById?: string; completedById?: string | null; completedAt?: string | null;
  title?: string; body?: string; processingSummary?: string | null;
}
export interface AgriSummaryIssueEvent {
  id: string; issueId: string; revision: number; kind: string; basis: "METADATA" | "PRIVATE_MATERIALS";
  visibility: "TEAM" | "INTERNAL"; createdAt: string; actorId?: string; afterState?: unknown; body?: string;
}
/** Live authorized projection, not a saved archive, public record or repository backup. */
export interface AgriRecordSummary {
  schemaVersion: 1; source: "ANS_AGRI_LIVE_RECORD_SUMMARY"; generatedAt: string;
  competitionId: string; teamCompetitionId: string; teamName: string;
  submission: AgriSummarySubmission;
  rule: { id: string; version: number; confirmedAt: string };
  selection: { includePrivate: boolean; includeInternal: boolean };
  limits: { maxPerCollection: 100; complete: true };
  content?: AgriStageSubmissionContent;
  stageHistory: AgriSummarySubmission[];
  technicalChecks: AgriSummaryCheck[];
  demoChecks: AgriSummaryDemo[];
  issues: AgriSummaryIssue[];
  issueEvents: AgriSummaryIssueEvent[];
}
