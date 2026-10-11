import { z } from "zod";
import { agriTechnicalCheckCommandSchema, agriCheckFeedbackCommandSchema } from "./agri-submissions";
export const agriReviewCommandSchema = z.union([agriTechnicalCheckCommandSchema, agriCheckFeedbackCommandSchema]);
export type AgriReviewCommand = z.infer<typeof agriReviewCommandSchema>;
export const agriReviewsQuerySchema = z.object({
  scope: z.enum(["team", "staff"]).default("team"), cursor: z.string().max(1600).optional(),
}).strict();
export interface AgriReviewItem {
  id: string; submissionId: string; artifactVersionId: string;
  result: "PASS" | "NEEDS_ACTION" | "UNREACHABLE"; basis: "METADATA" | "PRIVATE_MATERIALS"; checkedAt: string;
  checkedById?: string;
  checklist?: { schemaVersion: 1; items: Array<{ key: string; result: "PASS" | "NEEDS_ACTION" | "UNREACHABLE" | "NOT_APPLICABLE"; note: string }> };
  internalNote?: string | null;
  feedback: { body: string; publishedAt: string } | null;
  feedbackSequence?: number;
}
export interface AgriReviewList {
  competitionId: string; submissionId: string; artifactVersionId: string; submissionSequence: number;
  workspaceEnabled: boolean; canRecordCheck: boolean; canReadPrivateMaterials: boolean; canUseInternalNotes: boolean;
  checks: AgriReviewItem[]; nextCursor: string | null;
}
export interface AgriReviewResult { checkId: string; feedbackEventId: string | null; appliedSequence: number; duplicate: boolean }

export const agriReviewResultSchema = z.object({ checkId: z.string().min(1).max(80), feedbackEventId: z.string().min(1).max(80).nullable(), appliedSequence: z.number().int().min(0), duplicate: z.boolean() }).strict();
