import type { AgriWallBinding } from "./agri-wall";
import { z } from "zod";
import type { AgriCorrectionPermitView } from "./agri-decisions";
import { agriSubmissionWindowSchema } from "./agrihackathon";

// Draft and normal submission commands have a stage persistence service; corrections remain closed.
// Actor, accepted time, rule confirmation and check timestamps come from the server.
const id = z.string().trim().min(1).max(80);
const revision = z.number().int().min(1).max(2147483646);
const key = z.string().uuid();
const instant = z.string().datetime({ offset: true });
const itemKey = z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);

// Store stable addresses, not credential-bearing or expiring signed URLs.
// This validates syntax only; it does not fetch, back up or verify a Demo.
export const agriMaterialUrlSchema = z.string().trim().min(1).max(2048).refine(value => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" && url.password === "" &&
      url.search === "" && url.hash === "" && !/[\u0000-\u0020\u007f]/.test(value) &&
      !value.includes("?") && !value.includes("#");
  } catch { return false; }
}, "STABLE_HTTPS_ADDRESS_REQUIRED");

export const agriRepositoryRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("COMMIT_SHA"), value: z.string().regex(/^(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/) }).strict(),
  z.object({ kind: z.literal("TAG"), value: z.string().trim().min(1).max(160).regex(/^[^\u0000-\u0020\u007f]+$/) }).strict(),
]);
export const agriRepositorySchema = z.object({ url: agriMaterialUrlSchema, ref: agriRepositoryRefSchema.nullable() }).strict();

export const agriSubmissionMaterialsSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(z.discriminatedUnion("kind", [
    z.object({ key: itemKey, kind: z.literal("TEXT"), text: z.string().trim().min(1).max(4000) }).strict(),
    z.object({ key: itemKey, kind: z.literal("LINK"), url: agriMaterialUrlSchema }).strict(),
    z.object({ key: itemKey, kind: z.literal("ARTIFACT"), artifactVersionId: id }).strict(),
  ])).max(20),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.items.map(item => item.key)).size !== value.items.length) {
    ctx.addIssue({ code: "custom", path: ["items"], message: "DUPLICATE_MATERIAL_KEY" });
  }
});

export const agriStageDraftSchema = z.object({
  projectId: id,
  artifactVersionId: id.nullable(),
  repository: agriRepositorySchema.nullable(),
  demoUrl: agriMaterialUrlSchema.nullable(),
  summary: z.string().trim().max(4000),
  materials: agriSubmissionMaterialsSchema,
}).strict();
export const agriStageSubmissionContentSchema = agriStageDraftSchema.extend({
  artifactVersionId: id,
  summary: z.string().trim().min(1).max(4000),
});
export type AgriStageSubmissionContent = z.infer<typeof agriStageSubmissionContentSchema>;

export const agriOfficialMemberIdsSchema = z.array(id).min(1).max(5).superRefine((ids, ctx) => {
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", message: "DUPLICATE_OFFICIAL_MEMBER" });
});

export const agriStageSubmissionCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("saveDraft"), idempotencyKey: key, entryStageId: id,
    expectedRevision: revision, draft: agriStageDraftSchema }).strict(),
  z.object({ action: z.literal("submit"), idempotencyKey: key, entryStageId: id,
    expectedRevision: revision, expectedRuleVersionId: id, officialMemberIds: agriOfficialMemberIdsSchema.optional(), evidenceIntentIds: z.array(key).max(20).optional(), content: agriStageSubmissionContentSchema }).strict(),
  z.object({ action: z.literal("correctSubmission"), idempotencyKey: key, entryStageId: id,
    expectedRevision: revision, expectedRuleVersionId: id, previousSubmissionId: id,
    correctionPermitId: id, evidenceIntentIds: z.array(key).max(20).optional(), content: agriStageSubmissionContentSchema }).strict(),
]);
export type AgriStageSubmissionCommand = z.infer<typeof agriStageSubmissionCommandSchema>;
export type AgriFormalSubmissionCommand = Extract<AgriStageSubmissionCommand, { action: "submit" }>;

export const agriCorrectableFieldSchema = z.enum(["artifactVersionId", "repository", "demoUrl", "summary", "materials"]);
export type AgriCorrectableField = z.infer<typeof agriCorrectableFieldSchema>;
export const agriCorrectionPermitSnapshotSchema = z.object({
  id, competitionId: id, entryStageId: id, previousSubmissionId: id,
  allowedFields: z.array(agriCorrectableFieldSchema).min(1).max(5),
  reason: z.string().trim().min(1).max(2000),
  authorizedById: id, authorizedAt: instant, expiresAt: instant,
  revokedAt: instant.nullable(), usedBySubmissionId: id.nullable(),
}).strict().superRefine((permit, ctx) => {
  if (Date.parse(permit.expiresAt) <= Date.parse(permit.authorizedAt)) {
    ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "INVALID_PERMIT_EXPIRY" });
  }
  if (new Set(permit.allowedFields).size !== permit.allowedFields.length) {
    ctx.addIssue({ code: "custom", path: ["allowedFields"], message: "DUPLICATE_ALLOWED_FIELD" });
  }
});

const checklist = z.object({ schemaVersion: z.literal(1), items: z.array(z.object({
  key: itemKey,
  result: z.enum(["PASS", "NEEDS_ACTION", "UNREACHABLE", "NOT_APPLICABLE"]),
  note: z.string().trim().max(2000),
}).strict()).min(1).max(30) }).strict().superRefine((value, ctx) => {
  if (new Set(value.items.map(item => item.key)).size !== value.items.length) {
    ctx.addIssue({ code: "custom", path: ["items"], message: "DUPLICATE_CHECK_KEY" });
  }
});
export const agriTechnicalCheckCommandSchema = z.object({
  action: z.literal("recordCheck"), idempotencyKey: key, submissionId: id,
  result: z.enum(["PASS", "NEEDS_ACTION", "UNREACHABLE"]),
  basis: z.enum(["METADATA", "PRIVATE_MATERIALS"]).default("METADATA"),
  checklist, internalNote: z.string().trim().min(1).max(4000).nullable(),
}).strict().superRefine((check, ctx) => {
  if (check.result === "PASS" && (!check.checklist.items.some(item => item.result === "PASS") ||
    check.checklist.items.some(item => item.result === "NEEDS_ACTION" || item.result === "UNREACHABLE"))) {
    ctx.addIssue({ code: "custom", path: ["result"], message: "CHECK_RESULT_CONTRADICTS_ITEMS" });
  }
  if (check.result !== "PASS" && !check.checklist.items.some(item => item.result === check.result)) {
    ctx.addIssue({ code: "custom", path: ["result"], message: "CHECK_RESULT_CONTRADICTS_ITEMS" });
  }
});
export type AgriTechnicalCheckCommand = z.infer<typeof agriTechnicalCheckCommandSchema>;

const sequence = z.number().int().min(0).max(2147483646);
export const agriCheckFeedbackCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publishFeedback"), idempotencyKey: key, checkId: id,
    expectedSequence: sequence, body: z.string().trim().min(1).max(4000) }).strict(),
  z.object({ action: z.literal("withdrawFeedback"), idempotencyKey: key, checkId: id,
    expectedSequence: sequence }).strict(),
]);

// The service selects the latest immutable event; team projection never includes actor/internal notes.
const eventBase = { id, competitionId: id, checkId: id,
  sequence: z.number().int().min(1).max(2147483646), actorId: id, createdAt: instant };
export const agriCheckFeedbackEventSchema = z.discriminatedUnion("action", [
  z.object({ ...eventBase, action: z.literal("PUBLISH"), body: z.string().trim().min(1).max(4000) }).strict(),
  z.object({ ...eventBase, action: z.literal("WITHDRAW"), body: z.null() }).strict(),
]);

// Trusted locked read snapshot; never accept this object as a client command.
export const agriSubmissionLifecycleSnapshotSchema = z.object({
  competitionId: id, workspaceEnabled: z.boolean(),
  entry: z.object({ id, competitionId: id, stage: z.enum(["PRELIMINARY", "FINAL"]),
    revision: z.number().int().min(1).max(2147483646), frozenSubmissionId: id.nullable() }).strict(),
  publishedRuleVersionId: id.nullable(),
  rule: z.object({ id, competitionId: id, window: agriSubmissionWindowSchema }).strict(),
  finalEligibility: z.discriminatedUnion("state", [
    z.object({ state: z.literal("UNKNOWN") }).strict(),
    z.object({ state: z.literal("INELIGIBLE"), sourceId: id }).strict(),
    z.object({ state: z.literal("ELIGIBLE"), sourceId: id }).strict(),
  ]),
}).strict();
export type AgriSubmissionLifecycleSnapshot = z.infer<typeof agriSubmissionLifecycleSnapshotSchema>;

// All choices must come from an explicitly confirmed version; there are no historical defaults.
export const agriSubmissionRequirementsSchema = z.object({
  schemaVersion: z.literal(1),
  repositoryRequired: z.boolean(), repositoryRefRequired: z.boolean(), demoRequired: z.boolean(),
  materials: z.array(z.object({ key: itemKey, kind: z.enum(["TEXT", "LINK", "ARTIFACT"]), required: z.boolean() }).strict()).max(20),
}).strict().superRefine((requirements, ctx) => {
  if (requirements.repositoryRefRequired && !requirements.repositoryRequired) {
    ctx.addIssue({ code: "custom", path: ["repositoryRequired"], message: "REPOSITORY_REQUIRED_FOR_REF" });
  }
  if (new Set(requirements.materials.map(item => item.key)).size !== requirements.materials.length) {
    ctx.addIssue({ code: "custom", path: ["materials"], message: "DUPLICATE_REQUIREMENT_KEY" });
  }
});

export const agriPrepareStageSchema = z.object({
  action: z.literal("prepareStage"), teamCompetitionId: id, stage: z.enum(["PRELIMINARY", "FINAL"]),
}).strict();
export const agriSubmissionListQuerySchema = z.object({
  scope: z.enum(["team", "staff"]).default("team"), cursor: z.string().max(2000).optional(), stage: z.enum(["PRELIMINARY", "FINAL"]).optional(),
  q: z.string().trim().max(120).default(""), status: z.enum(["ANY", "SUBMITTED", "NOT_SUBMITTED"]).default("ANY"),
}).strict();

// Metadata-only candidate choices; never accept owner/team IDs or request private document bodies.
export const agriSubmissionVersionsQuerySchema = z.object({
  projectId: id.optional(), cursor: z.string().max(600).optional(),
}).strict();


export type AgriStageDraft = z.infer<typeof agriStageDraftSchema>;
export type AgriSubmissionRequirements = z.infer<typeof agriSubmissionRequirementsSchema>;
export interface AgriSubmissionVersionChoice {
  id: string; version: number; createdAt: string; artifactId: string;
  artifactTitle: string; kind: string; projectId: string; projectTitle: string;
}
export interface AgriSubmissionHistoryItem {
  id: string; entryStageId: string; sequence: number; ruleVersionId: string; acceptedAt: string;
  officialRosterId?: string | null; preliminarySubmissionId?: string | null;
  correction?: { previousSubmissionId: string; permitId: string; reason: string };
  submittedById?: string; content?: AgriStageSubmissionContent;
}
export interface AgriOfficialRoster {
  id: string; projectId: string; confirmedAt: string; confirmedById: string;
  members: Array<{ userId: string; username: string; name: string | null }>;
}
export interface AgriStageDetail {
  competitionId: string; id: string; teamCompetitionId: string; stage: "PRELIMINARY" | "FINAL";
  revision: number; frozenSubmissionId: string | null; recordedFrozenSubmissionId?: string | null; frozenByDeadline?: boolean; workspaceEnabled: boolean; hasPrivateMaterials: boolean;
  wall?: AgriWallBinding | null;
  officialRoster?: AgriOfficialRoster | null;
  officialMemberChoices?: Array<{ userId: string; username: string; name: string | null }>;
  legacyRosterRequired?: boolean;
  preliminaryBaseline?: { submissionId: string; projectId: string } | null;
  draft: AgriStageDraft | null; current: AgriSubmissionHistoryItem | null; history: AgriSubmissionHistoryItem[];
  nextBeforeSequence: number | null;
  publishedRule: { id: string; guidanceMarkdown: string; requirements: AgriSubmissionRequirements; window: z.infer<typeof agriSubmissionWindowSchema> } | null;
  finalEligibility?: { state: "UNKNOWN" } | { state: "ELIGIBLE" | "INELIGIBLE"; sourceId: string };
  correctionPermits?: AgriCorrectionPermitView[];
  correctionRule?: AgriStageDetail["publishedRule"];
  windowState: "RULES_PENDING" | "NOT_OPEN" | "OPEN" | "CLOSED" | "INVALID"; serverNow: string;
}
export interface AgriSubmissionEntries {
  competitionId: string; workspaceEnabled: boolean;
  entries: Array<{ id: string; teamId: string; competitionId: string; teamName: string; role: string }>;
}

export const agriWorksExportQuerySchema = agriSubmissionListQuerySchema.omit({ scope: true, cursor: true }).extend({
  mode: z.enum(["metadata", "materials"]).default("metadata"),
});
export interface AgriStageListRow {
  id: string; teamCompetitionId: string; teamId: string; teamName: string; stage: "PRELIMINARY" | "FINAL";
  revision: number; currentSubmissionId: string | null; frozenSubmissionId: string | null; recordedFrozenSubmissionId?: string | null; frozenByDeadline?: boolean;
  latestTechnicalCheck?: { id: string; result: "PASS" | "NEEDS_ACTION" | "UNREACHABLE"; checkedAt: string } | null;
  evidenceSummary?: { stored: number; pending: number; failed: number; cancelled: number; late: number } | null;
}
export interface AgriStageList {
  competitionId: string; stages: AgriStageListRow[]; nextCursor: string | null;
  canExport: boolean; hasPrivateMaterials: boolean;
}
