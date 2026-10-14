import { z } from "zod";
export const IMAGE_LIMIT = 20_000_000;
export const MODEL_LIMIT = 30_000_000;
export const tripoOptionsSchema = z.object({ model: z.literal("P2-20260801"), texture: z.boolean(), textureResolution: z.enum(["2K", "4K"]), pbr: z.boolean(), faceCount: z.number().int().min(500).max(25000) }).strict();
export const DEFAULT_TRIPO_OPTIONS: z.infer<typeof tripoOptionsSchema> = { model: "P2-20260801", texture: true, textureResolution: "2K", pbr: true, faceCount: 5000 };
export const createModelJobSchema = z.object({ idempotencyKey: z.string().regex(/^[a-zA-Z0-9_-]{16,80}$/), projectId: z.string().uuid().optional(), acknowledged: z.literal(true), acceptedPoints: z.number().nonnegative().max(10000), options: tripoOptionsSchema }).strict();
export type TripoOptions = z.infer<typeof tripoOptionsSchema>;
export type ModelJobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "NEEDS_REVIEW";
export type ModelJobStage = "queued" | "upload" | "submit" | "wait" | "download" | "persist";
export interface ModelAssetRef { id: string; sha256: string; size: number; }
export interface ModelJobView { id: string; status: ModelJobStatus; stage: ModelJobStage; progress: number; costPoints: number; refunded: boolean; cancelRequested: boolean; errorCode: string | null; createdAt: string; updatedAt: string; asset: ModelAssetRef | null; }
export const workerClaimSchema = z.object({ workerId: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/), jobId: z.string().uuid().optional() }).strict();
export const workerEventSchema = z.object({ leaseToken: z.string().uuid(), type: z.enum(["heartbeat", "stage", "accepted", "failed", "review"]), stage: z.enum(["upload", "submit", "wait", "download", "persist"]).optional(), providerTaskId: z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/).optional(), errorCode: z.enum(["LOGIN_REQUIRED", "INPUT_REJECTED", "PROVIDER_FAILED", "SUBMISSION_UNCERTAIN", "DOWNLOAD_FAILED", "MODEL_UNSUPPORTED", "WORKER_INTERRUPTED", "SELECTOR_CHANGED", "CANCELLED"]).optional() }).strict();
export const modelAssetRefSchema = z.object({ id: z.string().uuid(), sha256: z.string().regex(/^[0-9a-f]{64}$/), size: z.number().int().positive().max(MODEL_LIMIT) }).strict();
export const publishWebsiteSchema = z.object({ projectId: z.string().uuid(), version: z.number().int().positive(), slug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/), acknowledged: z.literal(true) }).strict();
export const bindDomainSchema = z.object({ hostname: z.string().min(4).max(253).regex(/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/) }).strict();
export interface PublishedWebsiteView { id: string; slug: string; version: number; publishedAt: string; url: string; }
