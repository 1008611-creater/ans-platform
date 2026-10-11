import { z } from "zod";
import { agriCorrectableFieldSchema } from "./agri-submissions";
const id = z.string().trim().min(1).max(80), key = z.string().uuid();
const sequence = z.number().int().min(0).max(2147483646);
export const agriDecisionQuerySchema = z.object({ teamCompetitionId: id, entryStageId: id.optional() }).strict();
export const agriDecisionCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("recordFinalEligibility"), idempotencyKey: key, teamCompetitionId: id,
    expectedSequence: sequence, state: z.enum(["ELIGIBLE", "INELIGIBLE"]), reason: z.string().trim().min(1).max(2000), sourceReference: z.string().trim().min(1).max(2000) }).strict(),
  z.object({ action: z.literal("issueCorrectionPermit"), idempotencyKey: key, entryStageId: id,
    expectedRevision: z.number().int().min(1).max(2147483646), previousSubmissionId: id,
    allowedFields: z.array(agriCorrectableFieldSchema).min(1).max(5), reason: z.string().trim().min(1).max(2000),
    expiresAt: z.string().datetime({ offset: true }) }).strict().superRefine((value, ctx) => {
      if (new Set(value.allowedFields).size !== value.allowedFields.length) ctx.addIssue({ code: "custom", path: ["allowedFields"], message: "DUPLICATE_ALLOWED_FIELD" });
    }),
  z.object({ action: z.literal("revokeCorrectionPermit"), idempotencyKey: key, permitId: id,
    reason: z.string().trim().min(1).max(2000) }).strict(),
]);
export type AgriDecisionCommand = z.infer<typeof agriDecisionCommandSchema>;
export interface AgriEligibilityDecision {
  id: string; sequence: number; state: "ELIGIBLE" | "INELIGIBLE"; reason: string; sourceReference: string;
  actorId: string; decidedAt: string;
}
export interface AgriCorrectionPermitView {
  id: string; entryStageId: string; previousSubmissionId: string; ruleVersionId: string;
  allowedFields: Array<z.infer<typeof agriCorrectableFieldSchema>>; reason: string;
  authorizedById: string; authorizedAt: string; expiresAt: string; revokedAt: string | null; usedBySubmissionId: string | null;
}
export interface AgriDecisionManagementView {
  competitionId: string; teamCompetitionId: string; entryStageId: string | null; stageRevision: number | null;
  currentSubmissionId: string | null; eligibility: AgriEligibilityDecision[];
  permits: AgriCorrectionPermitView[];
}
