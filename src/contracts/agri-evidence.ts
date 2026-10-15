import { z } from "zod";
import { agriMaterialUrlSchema, agriRepositoryRefSchema } from "./agri-submissions";
const id = z.string().trim().min(1).max(80), key = z.string().uuid();
export const evidenceKindSchema = z.enum(["REPOSITORY", "DEMO_DOCUMENT", "DEMO_VIDEO", "SUPPORTING_FILE"]);
export const evidenceModeSchema = z.enum(["UPLOAD", "GITHUB_ARCHIVE", "ALLOWED_HTTP_CAPTURE"]);
const target = z.object({ entryStageId: id, submissionId: id.nullable(), projectId: id, artifactVersionId: id });
export const evidenceCreateSchema = target.extend({ action: z.literal("create"), idempotencyKey: key,
    mode: evidenceModeSchema, kind: evidenceKindSchema, fileName: z.string().trim().min(1).max(180),
    sourceUrl: agriMaterialUrlSchema.nullable(), originalRef: agriRepositoryRefSchema.nullable(),
}).strict().superRefine((v, c) => {
    if (v.mode !== "UPLOAD" && (!v.submissionId || !v.sourceUrl))
        c.addIssue({ code: "custom", message: "FORMAL_SOURCE_REQUIRED" });
    if (v.mode === "GITHUB_ARCHIVE" && (v.kind !== "REPOSITORY" || !v.originalRef))
        c.addIssue({ code: "custom", message: "REPOSITORY_REF_REQUIRED" });
    if (v.mode !== "GITHUB_ARCHIVE" && v.originalRef !== null)
        c.addIssue({ code: "custom", message: "REF_NOT_ALLOWED" });
    if (v.mode === "UPLOAD" && v.sourceUrl !== null)
        c.addIssue({ code: "custom", message: "UPLOAD_SOURCE_NOT_ALLOWED" });
});
export const evidenceCommandSchema = z.discriminatedUnion("action", [
    z.object({ action: z.literal("cancel"), requestId: id, idempotencyKey: key }).strict(),
    z.object({ action: z.literal("retry"), requestId: id, idempotencyKey: key }).strict(),
    z.object({ action: z.literal("verifyCutoff"), requestId: id, objectId: id, idempotencyKey: key, reason: z.string().trim().min(10).max(2000) }).strict(),
    z.object({ action: z.literal("manifest"), submissionId: id, objectIds: z.array(id).max(100), idempotencyKey: key }).strict(),
]);
export type EvidenceCreate = z.infer<typeof evidenceCreateSchema>;
export type EvidenceCommand = z.infer<typeof evidenceCommandSchema>;
export type EvidenceKind = z.infer<typeof evidenceKindSchema>;
export type EvidenceMode = z.infer<typeof evidenceModeSchema>;
export type EvidenceState = "PREPARED" | "QUEUED" | "RUNNING" | "UPLOADED" | "STORED" | "RETRY_WAIT" | "FAILED" | "CANCELLED" | "NEEDS_REVIEW";
export interface EvidenceDescriptor {
    id: string;
    requestId: string;
    kind: EvidenceKind;
    fileName: string;
    sha256: string;
    byteLength: number;
    mime: string;
    backend: string;
    namespaceVersion: number;
    capturedAt: string;
    startedAt: string;
    resolvedSha: string | null;
    deadlineAt: string | null;
    temporalStatus: "CUTOFF_UNKNOWN" | "CAPTURED_AFTER_DEADLINE" | "CAPTURED_BEFORE_DEADLINE";
    coverage: string;
    sourceTiming: "DECLARED_FIXED_COMMIT_BEFORE_CUTOFF" | "MUTABLE_SOURCE_AT_CAPTURE" | "UNVERIFIED_SOURCE";
}
export interface EvidenceRequestView {
    id: string;
    submissionId: string | null;
    kind: EvidenceKind;
    mode: EvidenceMode;
    state: EvidenceState;
    createdAt: string;
    errorCode: string | null;
    attempt: number;
    maxAttempts: number;
    nextRunAt: string | null;
    canUpload: boolean;
    canManage: boolean;
    expiresAt: string | null;
    fileName: string;
    object: EvidenceDescriptor | null;
    cutoffVerification: {
        at: string;
        reason: string;
        actorId: string;
    } | null;
}
export interface EvidenceManifest {
    schemaVersion: 1;
    source: "ANS_AGRI_EXTERNAL_EVIDENCE";
    id: string;
    submissionId: string;
    entryStageId: string;
    competitionId: string;
    sequence: number;
    previousManifestId: string | null;
    createdAt: string;
    includePrivate: true;
    objects: EvidenceDescriptor[];
}
export interface EvidenceList {
    competitionId: string;
    submissionId: string | null;
    entryStageId: string;
    enabled: boolean;
    canWrite: boolean;
    canArchive: boolean;
    canVerify: boolean;
    target: {
        projectId: string;
        artifactVersionId: string;
        repository: {
            url: string;
            ref: {
                kind: "COMMIT_SHA" | "TAG";
                value: string;
            } | null;
        } | null;
        demoUrl: string | null;
    } | null;
    requests: EvidenceRequestView[];
    manifest: {
        value: EvidenceManifest;
        sha256: string;
        byteLength: number;
    } | null;
    nextCursor: string | null;
}
