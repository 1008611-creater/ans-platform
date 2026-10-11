import { z } from "zod";
const id = z.string().trim().min(1).max(80);
export const agriReferenceTargetSchema = z.object({ submissionId: id, issueId: id.nullable(), demoCheckId: id.nullable().default(null) }).strict().refine(target => !target.issueId || !target.demoCheckId, "AGRI_REFERENCE_SINGLE_DETAIL_REQUIRED");
export const agriReferenceQuerySchema = z.object({ scope: z.enum(["team", "staff"]).default("team"), cursor: z.string().max(1200).optional(), q: z.string().trim().max(120).default("") }).strict();
export type AgriReferenceTarget = z.infer<typeof agriReferenceTargetSchema>;
export interface AgriReferenceRecord {
  submissionId: string; entryStageId: string; competitionId: string; teamName: string;
  stage: "PRELIMINARY" | "FINAL"; sequence: number; acceptedAt: string;
  artifactVersion: number; scope: "team" | "staff";
  demoCheck?: { id: string; sequence: number; result: string; checkedAt: string } | null;
  issue: { id: string; title: string; status: string } | null;
}
export type AgriTaskReferenceView = { id: string; available: false } | { id: string; available: true; record: AgriReferenceRecord };
export interface AgriReferenceChoices { records: AgriReferenceRecord[]; nextCursor: string | null }
export const agriReferenceChangeSchema = z.object({ referenceId: id, action: z.enum(["attach", "detach"]) }).strict();
export type AgriReferenceChange = z.infer<typeof agriReferenceChangeSchema>;
export const agriReferenceDetailQuerySchema = agriReferenceQuerySchema.omit({ q: true }).extend({ issue: id.optional(), demo: id.optional() });
export interface AgriReferenceRecordDetail { record: AgriReferenceRecord; issues: Array<{ id: string; title: string; status: string }>; demoChecks?: Array<{ id: string; sequence: number; result: string; checkedAt: string }>; nextCursor: string | null }
