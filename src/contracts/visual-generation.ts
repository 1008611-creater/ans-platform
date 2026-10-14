import { z } from "zod";
import modelCatalog from "./tripo-models.json";
export const IMAGE_LIMIT = 20_000_000;
export const MODEL_LIMIT = 30_000_000;
export const INPUT_LIMIT = 110_000_000;
export const REQUEST_IMAGE_LIMIT = IMAGE_LIMIT * 4;
export const TRIPO_MODELS = modelCatalog;
export const tripoOptionsSchema = z.object({
 model: z.enum(["P2-20260801", "P1-20260311", "v3.1-20260211", "v3.0-20250812", "v2.5-20250123"]),
 source: z.enum(["image", "text", "multiview"]).default("image"),
 texture: z.boolean(), textureResolution: z.enum(["2K", "4K", "8K"]), pbr: z.boolean(),
 faceCount: z.number().int().min(50).max(2_000_000),
 quad: z.boolean().default(false), geometryQuality: z.enum(["standard", "detailed"]).default("standard"),
 generateParts: z.boolean().default(false), autoFix: z.boolean().default(false)
}).strict().superRefine((options, context) => {
 const model = TRIPO_MODELS.find(item => item.id === options.model)!;
 const max = options.quad ? model.quadMax : options.geometryQuality === "detailed" ? model.maxFaces : model.standardMaxFaces;
 if (options.faceCount < model.minFaces || options.faceCount > max)
  context.addIssue({code:"custom", path:["faceCount"], message:"INVALID_FACE_COUNT"});
 if (options.geometryQuality === "detailed" && (model.family !== "detail" || options.model === "v2.5-20250123"))
  context.addIssue({code:"custom", path:["geometryQuality"], message:"INCOMPATIBLE_GEOMETRY"});
 if (options.model === "v2.5-20250123" && options.textureResolution !== "2K")
  context.addIssue({code:"custom", path:["textureResolution"], message:"INCOMPATIBLE_TEXTURE_QUALITY"});
 if (options.generateParts && (model.family !== "detail" || options.model === "v2.5-20250123" || options.texture || options.pbr || options.quad))
  context.addIssue({code:"custom", path:["generateParts"], message:"INCOMPATIBLE_PARTS"});
 if (options.autoFix && options.source !== "image")
  context.addIssue({code:"custom", path:["autoFix"], message:"INCOMPATIBLE_AUTOFIX"});
});
export const DEFAULT_TRIPO_OPTIONS: z.infer<typeof tripoOptionsSchema> = {
 model: "P2-20260801", source:"image", texture:true, textureResolution:"2K", pbr:true,
 faceCount:5000, quad:false, geometryQuality:"standard", generateParts:false, autoFix:false
};
export const createModelJobSchema = z.object({
 idempotencyKey:z.string().regex(/^[a-zA-Z0-9_-]{16,80}$/), projectId:z.string().uuid().optional(),
 acknowledged:z.literal(true), acceptedPoints:z.number().positive().max(10000),
 options:tripoOptionsSchema, prompt:z.string().trim().max(1000).default("")
}).strict().superRefine((input,context)=>{
 if(input.options.source === "text" && !input.prompt)
  context.addIssue({code:"custom",path:["prompt"],message:"PROMPT_REQUIRED"});
 if(input.options.source !== "text" && input.prompt)
  context.addIssue({code:"custom",path:["prompt"],message:"UNEXPECTED_PROMPT"});
});
export interface GenerationQuote { options:TripoOptions; costPoints:number; }
export interface GenerationConfig {
 available:boolean; costPoints:number|null; quotes?:GenerationQuote[];
 models?:typeof TRIPO_MODELS;
}
/** Legacy price applies only to ordinary 2K single-image P2 jobs. Other combinations need an exact quote. */
export function generationPrice(config:GenerationConfig,options:TripoOptions):number|null {
 // Quad output is FBX; the current delivery path accepts only native GLB.
 if(options.quad)return null;
 const quote=config.quotes?.find(item=>Object.entries(item.options).every(([key,value])=>options[key as keyof TripoOptions]===value));
 if(quote)return quote.costPoints;
 return options.model==="P2-20260801"&&options.source==="image"&&options.textureResolution==="2K"&&options.geometryQuality==="standard"&&!options.generateParts&&!options.autoFix?config.costPoints:null;
}
export function tripoFaceLimit(options: Pick<TripoOptions,"model"|"quad"|"geometryQuality">):number {
 const model=TRIPO_MODELS.find(item=>item.id===options.model)!;
 return options.quad?model.quadMax:options.geometryQuality==="detailed"?model.maxFaces:model.standardMaxFaces;
}
export type TripoOptions = z.infer<typeof tripoOptionsSchema>;
export type ModelJobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "NEEDS_REVIEW";
export type ModelJobStage = "queued" | "upload" | "submit" | "wait" | "download" | "persist";
export interface ModelAssetRef { id: string; sha256: string; size: number; }
export interface ModelJobView { id: string; status: ModelJobStatus; stage: ModelJobStage; progress: number; costPoints: number; refunded: boolean; cancelRequested: boolean; errorCode: string | null; createdAt: string; updatedAt: string; asset: ModelAssetRef | null; options?: TripoOptions; }
export const workerClaimSchema = z.object({ workerId: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/), jobId: z.string().uuid().optional() }).strict();
export const workerEventSchema = z.object({ leaseToken: z.string().uuid(), type: z.enum(["heartbeat", "stage", "accepted", "failed", "review"]), stage: z.enum(["upload", "submit", "wait", "download", "persist"]).optional(), providerTaskId: z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/).optional(), errorCode: z.enum(["LOGIN_REQUIRED", "INPUT_REJECTED", "PROVIDER_FAILED", "SUBMISSION_UNCERTAIN", "DOWNLOAD_FAILED", "MODEL_UNSUPPORTED", "WORKER_INTERRUPTED", "SELECTOR_CHANGED", "CANCELLED"]).optional() }).strict();
export const modelAssetRefSchema = z.object({ id: z.string().uuid(), sha256: z.string().regex(/^[0-9a-f]{64}$/), size: z.number().int().positive().max(MODEL_LIMIT) }).strict();
export const publishWebsiteSchema = z.object({ projectId: z.string().uuid(), version: z.number().int().positive(), slug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/), acknowledged: z.literal(true) }).strict();
export const bindDomainSchema = z.object({ hostname: z.string().min(4).max(253).regex(/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/) }).strict();
export interface PublishedWebsiteView { id: string; slug: string; version: number; publishedAt: string; url: string; }
