import { z } from "zod";
import { agriMaterialUrlSchema } from "./agri-submissions";
const id = z.string().trim().min(1).max(80);
const instant = z.string().datetime({ offset: true });
export const agriPublicUrlSchema = agriMaterialUrlSchema.refine(value => {
  const u = new URL(value), h = u.hostname.toLowerCase();
  return h.includes(".") && !h.endsWith(".local") && !h.endsWith(".internal") && !h.endsWith(".localhost") &&
    !h.includes(":") && !/^\d+(?:\.\d+){3}$/.test(h) && !/^(?:localhost|ans\.cauai\.fun|ans-preview\.cauai\.fun)$/.test(h) &&
    !/%(?:2f|5c|00|0a|0d)/i.test(u.pathname) && !/\\/.test(value);
}, "PUBLIC_EXTERNAL_ADDRESS_REQUIRED");
export const agriPublicationContentSchema = z.object({
  title: z.string().trim().min(1).max(160), summary: z.string().trim().min(1).max(2000),
  teamName: z.string().trim().min(1).max(120), track: z.enum(["PEOPLE", "DISCOVERY", "ACTION"]),
  repositoryUrl: agriPublicUrlSchema.nullable(), demoUrl: agriPublicUrlSchema.nullable(),
}).strict();
export type AgriPublicationContent = z.infer<typeof agriPublicationContentSchema>;
const base = { entryStageId: id, expectedRevision: z.number().int().min(0).max(2147483646), idempotencyKey: z.string().uuid() };
export const agriPublicationCommandSchema = z.discriminatedUnion("action", [
  z.object({ ...base, action: z.literal("requestPublication"), submissionId: id, artifactVersionId: id,
    consentConfirmed: z.literal(true), content: agriPublicationContentSchema }).strict(),
  z.object({ ...base, action: z.literal("reviewPublication"), consentEventId: id,
    decision: z.enum(["APPROVE", "REJECT"]), reason: z.string().trim().min(1).max(2000) }).strict(),
  z.object({ ...base, action: z.literal("withdrawPublication"), reason: z.string().trim().min(1).max(2000) }).strict(),
]);
export type AgriPublicationCommand = z.infer<typeof agriPublicationCommandSchema>;
export const agriPublicationQuerySchema = z.object({ entryStageId: id, scope: z.enum(["team", "staff"]).default("team"), beforeRevision: z.coerce.number().int().min(1).optional() }).strict();
export const agriPublicationsListQuerySchema = z.object({ cursor: id.optional() }).strict();
export const agriPublicationEventViewSchema = z.object({ id, revision: z.number().int().min(1),
  action: z.enum(["REQUEST", "APPROVE", "REJECT", "WITHDRAW"]), submissionId: id, artifactVersionId: id,
  consentEventId: id.nullable(), content: agriPublicationContentSchema.nullable(), reason: z.string().nullable(), createdAt: instant,
}).strict();
export const agriPublicationAllowedVersionSchema = z.object({ submissionId: id, artifactVersionId: id, sequence: z.number().int().min(1), acceptedAt: instant,
  basis: z.enum(["FROZEN", "CURRENT"]), correctionPreviousSubmissionId: id.nullable(), repositoryUrl: z.string().nullable(), demoUrl: z.string().nullable() }).strict();
export const agriPublicationManagementSchema = z.object({ competitionId: id, entryStageId: id,
  context: z.object({ stage: z.enum(["PRELIMINARY", "FINAL"]), submissionId: id.nullable(), artifactVersionId: id.nullable(),
    repositoryUrl: z.string().nullable(), demoUrl: z.string().nullable(), allowedVersions: z.array(agriPublicationAllowedVersionSchema).max(2) }).strict(),
  workspaceEnabled: z.boolean(), canRequest: z.boolean(), canWithdraw: z.boolean(), canReview: z.boolean(),
  publication: z.object({ id, revision: z.number().int().min(1), state: z.enum(["PENDING", "APPROVED", "REJECTED", "WITHDRAWN", "STALE"]),
    events: z.array(agriPublicationEventViewSchema), nextBeforeRevision: z.number().int().min(1).nullable() }).strict().nullable(),
}).strict();
export type AgriPublicationManagement = z.infer<typeof agriPublicationManagementSchema>;
export const agriPublicPublicationSchema = z.object({ id, competitionId: id, stage: z.enum(["PRELIMINARY", "FINAL"]),
  submissionId: id, artifactVersionId: id, consentEventId: id, reviewEventId: id,
  acceptedAt: instant, publishedAt: instant, basis: z.enum(["FROZEN", "CURRENT"]), correctionPreviousSubmissionId: id.nullable(), content: agriPublicationContentSchema }).strict();
export type AgriPublicPublication = z.infer<typeof agriPublicPublicationSchema>;
export interface AgriPublicationResult { publicationId: string; eventId: string; appliedRevision: number; duplicate: boolean }
export interface AgriPublicationsList { competitionId: string; items: AgriPublicPublication[]; nextCursor: string | null }

export const agriPublicationQueueSchema = z.object({ competitionId: id, items: z.array(agriPublicationManagementSchema), nextCursor: id.nullable() }).strict();
