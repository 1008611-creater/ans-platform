import { z } from "zod";
import { agriMaterialUrlSchema } from "./agri-submissions";
const id = z.string().trim().min(1).max(80);
const key = z.string().uuid();
const sequence = z.number().int().min(0).max(2147483646);
export const agriDemoItemStatusSchema = z.enum(["PASS", "NEEDS_ACTION", "UNREACHABLE", "NOT_APPLICABLE", "NOT_TESTED"]);
const condition = z.object({ status: agriDemoItemStatusSchema, note: z.string().trim().max(2000) }).strict();
export const agriDemoDueSchema = z.object({ state: z.enum(["UNKNOWN", "TENTATIVE", "CONFIRMED"]), at: z.string().datetime({ offset: true }).nullable() }).strict().superRefine((value, ctx) => {
  if ((value.state === "UNKNOWN") !== (value.at === null)) ctx.addIssue({ code: "custom", path: ["at"], message: "AGRI_DEMO_DATE_STATE_INVALID" });
});
export const agriDemoSnapshotSchema = z.object({
  schemaVersion: z.literal(1), mode: z.enum(["LIVE", "VIDEO", "HYBRID", "OTHER"]), description: z.string().trim().min(1).max(2000),
  device: condition, compatibility: condition, network: condition, audio: condition,
  backup: condition.extend({ url: agriMaterialUrlSchema.nullable(), artifactVersionId: id.nullable() }),
  conclusion: z.enum(["PASS", "NEEDS_ACTION", "UNREACHABLE"]), recheckDue: agriDemoDueSchema,
}).strict().superRefine((value, ctx) => {
  const states = [value.device, value.compatibility, value.network, value.audio, value.backup].map(item => item.status);
  if (value.conclusion === "PASS" && (!states.includes("PASS") || states.some(status => !["PASS", "NOT_APPLICABLE"].includes(status))))
    ctx.addIssue({ code: "custom", path: ["conclusion"], message: "AGRI_DEMO_CONCLUSION_CONTRADICTS_ITEMS" });
  if (value.conclusion === "UNREACHABLE" && !states.includes("UNREACHABLE"))
    ctx.addIssue({ code: "custom", path: ["conclusion"], message: "AGRI_DEMO_CONCLUSION_CONTRADICTS_ITEMS" });
  if (value.conclusion === "NEEDS_ACTION" && !states.some(status => ["NEEDS_ACTION", "NOT_TESTED"].includes(status)))
    ctx.addIssue({ code: "custom", path: ["conclusion"], message: "AGRI_DEMO_CONCLUSION_CONTRADICTS_ITEMS" });
  if (value.conclusion === "PASS" && value.recheckDue.state !== "UNKNOWN")
    ctx.addIssue({ code: "custom", path: ["recheckDue"], message: "AGRI_DEMO_PASSED_RECHECK_DATE_INVALID" });
});
export const agriRecordDemoCommandSchema = z.object({
  action: z.literal("recordDemoCheck"), idempotencyKey: key, submissionId: id,
  expectedLatestCheckId: id.nullable(), acknowledgeStaleSubmission: z.boolean(),
  basis: z.enum(["METADATA", "PRIVATE_MATERIALS"]), demo: agriDemoSnapshotSchema,
  internalNote: z.string().trim().min(1).max(4000).nullable(),
}).strict().superRefine((value, ctx) => {
  if (value.basis === "METADATA" && (value.demo.backup.url !== null || value.demo.backup.artifactVersionId !== null))
    ctx.addIssue({ code: "custom", path: ["basis"], message: "AGRI_DEMO_PRIVATE_BACKUP_REQUIRED" });
});
export const agriDemoCommandSchema = z.union([
  agriRecordDemoCommandSchema,
  z.object({ action: z.literal("publishDemoFeedback"), idempotencyKey: key, checkId: id, expectedSequence: sequence, body: z.string().trim().min(1).max(4000) }).strict(),
  z.object({ action: z.literal("withdrawDemoFeedback"), idempotencyKey: key, checkId: id, expectedSequence: sequence }).strict(),
]);
export type AgriDemoCommand = z.infer<typeof agriDemoCommandSchema>;
export type AgriDemoSnapshot = z.infer<typeof agriDemoSnapshotSchema>;
export const agriDemoQuerySchema = z.object({ scope: z.enum(["team", "staff"]).default("team"), cursor: z.string().max(1600).optional() }).strict();
export interface AgriDemoCheckItem {
  id: string; submissionId: string; artifactVersionId: string; recheckOfId: string | null;
  result: "PASS" | "NEEDS_ACTION" | "UNREACHABLE"; basis: "METADATA" | "PRIVATE_MATERIALS"; checkedAt: string;
  checkedById?: string; demo?: AgriDemoSnapshot; internalNote?: string | null; feedbackSequence?: number;
  feedback: { body: string; publishedAt: string } | null;
}
export interface AgriDemoList {
  competitionId: string; submissionId: string; artifactVersionId: string; submissionSequence: number;
  stage: "PRELIMINARY" | "FINAL"; isCurrentSubmission: boolean; currentSubmissionId: string | null;
  latestCheckId: string | null; canRecheckLatest: boolean; recheckBlockedCode: "AGRI_DEMO_SOURCE_PERMISSION_REQUIRED" | null; workspaceEnabled: boolean; canRecordCheck: boolean; canReadPrivateMaterials: boolean; canUseInternalNotes: boolean;
  checks: AgriDemoCheckItem[]; nextCursor: string | null;
}
export interface AgriDemoResult { checkId: string; feedbackEventId: string | null; appliedSequence: number; duplicate: boolean }
export const agriDemoResultSchema = z.object({ checkId: id, feedbackEventId: id.nullable(), appliedSequence: sequence, duplicate: z.boolean() }).strict();
