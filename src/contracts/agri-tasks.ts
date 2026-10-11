import { z } from "zod";
import { agriReferenceTargetSchema, type AgriTaskReferenceView, type AgriReferenceChange } from "./agri-task-references";
import { agriTargetDateSchema, agriTaskStatusSchema } from "./agrihackathon";

const id = z.string().trim().min(1).max(80);
const revision = z.number().int().min(1).max(2147483646);
const key = z.string().uuid();
export const agriTaskStageSchema = z.enum(["PREPARATION", "PRELIMINARY", "FINAL", "EVENT_DAY", "ARCHIVE"]);
export const agriInputRequirementSchema = z.object({
  from: z.string().trim().min(1).max(160),
  needed: z.string().trim().min(1).max(2000),
  latestAt: agriTargetDateSchema,
}).strict();
export const agriInputRequirementsSchema = z.object({
  schemaVersion: z.literal(1), items: z.array(agriInputRequirementSchema).max(20),
}).strict();
export const agriTaskEditableSchema = z.object({
  title: z.string().trim().min(1).max(160),
  stage: agriTaskStageSchema,
  status: agriTaskStatusSchema,
  priority: z.enum(["LOW", "NORMAL", "HIGH"]),
  due: agriTargetDateSchema,
  acceptanceCriteria: z.string().trim().min(1).max(2000),
  collaborationNotes: z.string().trim().max(2000),
  inputRequirements: agriInputRequirementsSchema,
  blockingInput: agriInputRequirementSchema.nullable(),
  completionResult: z.string().trim().min(1).max(2000).nullable(),
}).strict().superRefine((task, ctx) => {
  if ((task.status === "DONE") !== (task.completionResult !== null)) ctx.addIssue({ code: "custom", path: ["completionResult"], message: "COMPLETION_RESULT_REQUIRED" });
  if (task.status === "BLOCKED" && !task.blockingInput) ctx.addIssue({ code: "custom", path: ["blockingInput"], message: "BLOCKING_INPUT_REQUIRED" });
  if (task.status === "DONE" && task.blockingInput) ctx.addIssue({ code: "custom", path: ["blockingInput"], message: "COMPLETED_TASK_CANNOT_BE_BLOCKED" });
});
export type AgriTaskEditable = z.infer<typeof agriTaskEditableSchema>;
export const agriTaskFiltersSchema = z.object({
  scope: z.enum(["all", "mine", "shared"]).default("all"),
  stage: agriTaskStageSchema.optional(),
}).strict();
export type AgriTaskFilters = z.infer<typeof agriTaskFiltersSchema>;
export const agriTaskListQuerySchema = agriTaskFiltersSchema.safeExtend({ cursor: z.string().max(500).optional() });
export const agriTaskCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), idempotencyKey: key, task: agriTaskEditableSchema }).strict(),
  z.object({ action: z.literal("update"), idempotencyKey: key, taskId: id, expectedRevision: revision, task: agriTaskEditableSchema }).strict(),
  z.object({ action: z.literal("initialize"), idempotencyKey: key, locale: z.enum(["zh", "en"]) }).strict(),
  z.object({ action: z.literal("attachReference"), idempotencyKey: key, taskId: id, expectedRevision: revision, target: agriReferenceTargetSchema }).strict(),
  z.object({ action: z.literal("detachReference"), idempotencyKey: key, taskId: id, expectedRevision: revision, referenceId: id }).strict(),
  z.object({ action: z.literal("share"), idempotencyKey: key, taskId: id, expectedRevision: revision, recipientId: id,
    expiresAt: z.string().datetime({ offset: true }).nullable() }).strict(),
  z.object({ action: z.literal("revokeShare"), idempotencyKey: key, taskId: id, expectedRevision: revision, recipientId: id }).strict(),
]);
export type AgriTaskCommand = z.infer<typeof agriTaskCommandSchema>;
export const agriTaskViewSchema = agriTaskEditableSchema.safeExtend({
  id, competitionId: id, revision, templateKey: z.string().nullable(),
  access: z.enum(["OWNER", "SHARED_READONLY"]),
  dueState: z.enum(["UNDATED", "TENTATIVE", "SCHEDULED", "OVERDUE", "DONE"]),
  completedAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }), updatedAt: z.string().datetime({ offset: true }),
});
export type AgriTaskView = z.infer<typeof agriTaskViewSchema>;
export type AgriTaskList = { competitionId: string; serverNow: string; tasks: AgriTaskView[]; sharingLimit: number; nextCursor: string | null };
export const agriTaskMutationSchema = z.object({
  task: agriTaskViewSchema.nullable(), duplicate: z.boolean(), appliedRevision: revision.nullable(),
  createdTaskCount: z.number().int().min(0).max(500).nullable(),
}).strict().superRefine((result, ctx) => {
  if (result.task === null) {
    if (result.appliedRevision !== null || result.createdTaskCount === null) ctx.addIssue({ code: "custom", message: "INVALID_INITIALIZATION_RESULT" });
  } else if (result.appliedRevision === null || result.createdTaskCount !== null || result.task.access !== "OWNER" || result.task.revision < result.appliedRevision) {
    ctx.addIssue({ code: "custom", message: "INVALID_TASK_MUTATION_RESULT" });
  }
});
export type AgriTaskMutation = z.infer<typeof agriTaskMutationSchema>;

export type AgriTaskDetail = { task: AgriTaskView; history: Array<{ revision: number; action: string; task: AgriTaskEditable; shareChange?: AgriTaskShareChange; referenceChange?: AgriReferenceChange; createdAt: string }>; shares: Array<{ userId: string; expiresAt: string | null; sharedAt: string }>; historyTruncated: boolean; references?: AgriTaskReferenceView[] };

export const agriTaskCursorSchema = z.object({ createdAt: z.string().datetime({ offset: true }), id }).strict();

export const agriTaskShareChangeSchema = z.object({ recipientId: id, expiresAt: z.string().datetime({ offset: true }).nullable(), previousExpiresAt: z.string().datetime({ offset: true }).nullable(), previouslyActive: z.boolean() }).strict();
export type AgriTaskShareChange = z.infer<typeof agriTaskShareChangeSchema>;
