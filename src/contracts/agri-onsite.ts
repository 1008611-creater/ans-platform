import { z } from "zod";
import { agriTargetDateSchema } from "./agrihackathon";
const id = z.string().trim().min(1).max(80);
const revision = z.number().int().min(1).max(2147483646);
// Human-reviewed onsite facts only. URLs, credentials and internal notes have no fields here.
const onsiteText = (max: number) => z.string().trim().max(max).refine(value => !/(?:https?:\/\/|www\.|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i.test(value), "AGRI_ONSITE_LINK_OR_CONTACT_NOT_ALLOWED");
export const agriOnsiteStatusSchema = z.enum(["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"]);
export const agriOnsiteOperationsSchema = z.object({
  device: onsiteText(2000), conditions: onsiteText(2000), schedule: agriTargetDateSchema,
  status: agriOnsiteStatusSchema, result: onsiteText(2000).nullable(),
}).strict().superRefine((value, ctx) => {
  if ((value.status === "DONE") !== (value.result !== null && value.result.length > 0)) ctx.addIssue({ code: "custom", path: ["result"], message: "AGRI_ONSITE_COMPLETION_REQUIRED" });
  if (value.status !== "DONE" && value.result !== null) ctx.addIssue({ code: "custom", path: ["result"], message: "AGRI_ONSITE_COMPLETION_STATUS_REQUIRED" });
});
export const agriOnsiteFieldsSchema = z.object({
  title: onsiteText(180).refine(value => value.length > 0, "AGRI_ONSITE_TITLE_REQUIRED"),
  mode: z.enum(["LIVE", "VIDEO", "HYBRID", "OTHER"]), summary: onsiteText(2000), backupSummary: onsiteText(2000),
  operations: agriOnsiteOperationsSchema,
}).strict();
const base = { idempotencyKey: z.string().uuid() };
export const agriOnsiteCommandSchema = z.discriminatedUnion("action", [
  z.object({ ...base, action: z.literal("createOnsite"), submissionId: id, demoCheckId: id.nullable(), acknowledgeStaleSubmission: z.boolean(), fields: agriOnsiteFieldsSchema }).strict(),
  z.object({ ...base, action: z.literal("editOnsiteDraft"), itemId: id, expectedRevision: revision, fields: agriOnsiteFieldsSchema }).strict(),
  z.object({ ...base, action: z.literal("publishOnsite"), itemId: id, expectedRevision: revision, reviewedForOnsite: z.literal(true) }).strict(),
  z.object({ ...base, action: z.literal("withdrawOnsite"), itemId: id, expectedRevision: revision }).strict(),
  z.object({ ...base, action: z.literal("updateOnsiteOperations"), itemId: id, expectedRevision: revision, operations: agriOnsiteOperationsSchema }).strict(),
]);
export type AgriOnsiteCommand = z.infer<typeof agriOnsiteCommandSchema>;
export type AgriOnsiteFields = z.infer<typeof agriOnsiteFieldsSchema>;
export const agriOnsiteQuerySchema = z.object({ scope: z.enum(["onsite", "staff"]).default("onsite"), submissionId: id.optional(), cursor: z.string().max(1600).optional() }).strict().superRefine((value, ctx) => {
  if (value.scope !== "staff" && value.submissionId) ctx.addIssue({ code: "custom", path: ["submissionId"], message: "AGRI_ONSITE_SOURCE_FILTER_STAFF_ONLY" });
});
export interface AgriOnsiteItemView {
  id: string; competitionId: string; teamName: string; revision: number; published: boolean;
  fields: AgriOnsiteFields; createdAt: string; updatedAt: string;
  version: { stage: "PRELIMINARY" | "FINAL"; sequence: number; artifactVersion: number; checkedAt: string | null };
  source?: { submissionId: string; entryStageId: string; artifactVersionId: string; ruleVersionId: string; demoCheckId: string | null };
  canEditDraft: boolean; canPublish: boolean; canWithdraw: boolean; canUpdateOperations: boolean;
}
export interface AgriOnsiteList {
  competitionId: string; workspaceEnabled: boolean; items: AgriOnsiteItemView[]; nextCursor: string | null; canCreate: boolean;
  // Only staff with an exact submission filter receive this safe metadata, even before a card exists.
  source?: { submissionId: string; stage: "PRELIMINARY" | "FINAL"; sequence: number; artifactVersion: number; artifactVersionId: string; isCurrentSubmission: boolean };
}
export interface AgriOnsiteDetail { item: AgriOnsiteItemView; history: Array<{ id: string; revision: number; action: string; fields: AgriOnsiteFields; published: boolean; createdAt: string }>; nextCursor: string | null }
export interface AgriOnsiteResult { itemId: string; eventId: string; appliedRevision: number; duplicate: boolean }
