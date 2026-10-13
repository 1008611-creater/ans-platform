import { z } from "zod";

// Workspace grant/window and legacy task read models are candidates; target-date/status schemas are used by personal tasks.
// Client write commands live in agri-tasks.ts and agri-submissions.ts.
const id = z.string().trim().min(1).max(80);
const instant = z.string().datetime({ offset: true });
export const agriStageSchema = z.enum(["REGISTRATION", "PRELIMINARY", "FINAL"]);
export const agriWorkspaceScopeSchema = z.enum([
  "WORKS_READ", "PRIVATE_MATERIALS_READ", "TECHNICAL_WRITE", "INTERNAL_NOTES_READ",
  "ISSUES_WRITE", "DEMO_WRITE", "ONSITE_READ", "ONSITE_WRITE", "ARCHIVE_WRITE", "EXPORT",
  "RULES_CONFIRM", "ACCESS_MANAGE", "PUBLICATIONS_REVIEW",
]);
export type AgriWorkspaceScope = z.infer<typeof agriWorkspaceScopeSchema>;

export const agriAccessGrantSchema = z.object({
  competitionId: id,
  userId: id,
  scopes: z.array(agriWorkspaceScopeSchema).min(1).max(13),
  revokedAt: instant.nullable(),
  expiresAt: instant.nullable(),
}).strict();

export const agriSubmissionWindowSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("PENDING"),
    stage: agriStageSchema,
    opensAt: instant.nullable(),
    closesAt: instant.nullable(),
  }).strict(),
  z.object({
    state: z.literal("CONFIRMED"),
    stage: agriStageSchema,
    opensAt: instant,
    closesAt: instant,
    includesDeadline: z.boolean(),
    confirmedById: id,
    confirmedAt: instant,
  }).strict(),
]).superRefine((value, ctx) => {
  if (value.opensAt && value.closesAt && Date.parse(value.opensAt) > Date.parse(value.closesAt)) {
    ctx.addIssue({ code: "custom", path: ["closesAt"], message: "INVALID_WINDOW_ORDER" });
  }
});

export const agriTargetDateSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("UNKNOWN"), at: z.null() }).strict(),
  z.object({ state: z.literal("TENTATIVE"), at: instant }).strict(),
  z.object({ state: z.literal("CONFIRMED"), at: instant }).strict(),
]);
export type AgriTargetDate = z.infer<typeof agriTargetDateSchema>;
export const agriTaskStatusSchema = z.enum(["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"]);
export type AgriTaskStatus = z.infer<typeof agriTaskStatusSchema>;

export const agriTaskDataSchema = z.object({
  title: z.string().trim().min(1).max(160),
  competitionId: id,
  ownerId: id,
  status: agriTaskStatusSchema,
  priority: z.enum(["LOW", "NORMAL", "HIGH"]),
  stage: z.enum(["PREPARATION", "PRELIMINARY", "FINAL", "EVENT_DAY", "ARCHIVE"]),
  due: agriTargetDateSchema,
  acceptanceCriteria: z.string().trim().min(1).max(2000),
  collaborators: z.array(id).max(30),
  blockingInput: z.object({
    from: z.string().trim().min(1).max(160),
    needed: z.string().trim().min(1).max(2000),
    latestAt: agriTargetDateSchema,
  }).strict().nullable(),
  completion: z.object({
    result: z.string().trim().min(1).max(2000),
    recordedById: id,
    recordedAt: instant,
  }).strict().nullable(),
}).strict().superRefine((value, ctx) => {
  if (value.status === "DONE" && !value.completion) {
    ctx.addIssue({ code: "custom", path: ["completion"], message: "COMPLETION_RESULT_REQUIRED" });
  }
  if (value.status !== "DONE" && value.completion) {
    ctx.addIssue({ code: "custom", path: ["completion"], message: "COMPLETION_STATUS_REQUIRED" });
  }
  if (value.status === "BLOCKED" && !value.blockingInput) {
    ctx.addIssue({ code: "custom", path: ["blockingInput"], message: "BLOCKING_INPUT_REQUIRED" });
  }
});
