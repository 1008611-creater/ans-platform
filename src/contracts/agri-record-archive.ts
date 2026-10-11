import { z } from "zod";
import type { AgriRecordSummary } from "./agri-record-summary";
const identifier = z.string().trim().min(1).max(80);
export const agriRecordArchiveSelectionSchema = z.object({ includePrivate: z.boolean().default(false), includeInternal: z.boolean().default(false) }).strict();
export const agriRecordArchiveCommandSchema = z.object({
  action: z.literal("createArchive"), submissionId: identifier,
  selection: agriRecordArchiveSelectionSchema.default({ includePrivate: false, includeInternal: false }),
  idempotencyKey: z.string().uuid(),
}).strict();
export const agriRecordArchiveListQuerySchema = z.object({ cursor: z.string().max(1500).optional() }).strict();
export const agriRecordArchiveReadQuerySchema = z.object({ mode: z.enum(["view", "exportJSON"]).default("view") }).strict();
export type AgriRecordArchiveSelection = z.infer<typeof agriRecordArchiveSelectionSchema>;
export interface AgriRecordArchiveSnapshot {
  schemaVersion: 1; source: "ANS_AGRI_SAVED_RECORD_ARCHIVE"; includesOnsite: false;
  archiveId: string; sequence: number; previousArchiveId: string | null; createdById: string; collectedAt: string;
  record: AgriRecordSummary;
}
export interface AgriRecordArchiveDescriptor {
  id: string; competitionId: string; submissionId: string; entryStageId: string; artifactVersionId: string; ruleVersionId: string;
  sequence: number; previousArchiveId: string | null; createdById: string; collectedAt: string;
  selection: AgriRecordArchiveSelection; snapshotSchemaVersion: 1; includesOnsite: false;
  sha256: string; byteLength: number;
}
export interface AgriRecordArchiveList { competitionId: string; submissionId: string; workspaceEnabled: boolean; canCreate: boolean; items: AgriRecordArchiveDescriptor[]; nextCursor: string | null }
export interface AgriRecordArchiveDetail { archive: AgriRecordArchiveDescriptor; snapshot: AgriRecordArchiveSnapshot }
export interface AgriRecordArchiveResult { archiveId: string; sequence: number; sha256: string; duplicate: boolean }
/** Sorted object keys, unchanged array order and exact UTF-8 bytes. No locale or JSONB serialization dependence. */
export function canonicalAgriArchiveJSON(value: unknown): string {
  const normalize = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item !== null && typeof item === "object") return Object.fromEntries(Object.keys(item).sort().map(key => [key, normalize((item as Record<string, unknown>)[key])]));
    if (item === undefined || typeof item === "bigint" || typeof item === "function" || typeof item === "symbol" || (typeof item === "number" && !Number.isFinite(item))) throw new Error("AGRI_ARCHIVE_INVALID_JSON");
    return item;
  };
  return JSON.stringify(normalize(value));
}
