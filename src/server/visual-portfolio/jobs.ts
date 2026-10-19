import { randomUUID, timingSafeEqual } from "node:crypto";
import { db, type DbTransaction } from "@/lib/db";
import { assertAccountCanSpend, debitQuota, refundQuota } from "@/server/quota/service";
import { createModelJobSchema, workerClaimSchema, workerEventSchema, type ModelJobStage, type ModelJobStatus, type ModelJobView, type TripoOptions, TRIPO_MODELS, tripoOptionsSchema, generationPrice } from "@/contracts/visual-generation";
import { canAdvanceStage, canRefund, safeToRetry, STAGE_PROGRESS } from "@/domain/projects/model-job";
import { durableStorageReady, putVisualInput, sha256 } from "./storage";
import { z } from "zod";
import { modelRequestHashes } from "./request-hash";
import { prepareGenerationInput } from "./generation-input";
import { VisualPortfolioError } from "./errors";
import { clearInputUpload, clearTerminalInputs, compensateInputUpload, cleanupOwnerInputs, lockVisualInputs, type InputUpload } from "./input-retention";
import { reserveInputWriter, beginInputWriter, settleInputWriter, forgetInputWriter } from "./input-writer";
export interface ModelJobRecord { id:string; ownerId:string; projectId:string|null; idempotencyKey:string; inputKey:string; inputMime:string; requestHash:string; options:TripoOptions; status:ModelJobStatus; stage:ModelJobStage; progress:number; costPoints:number; refunded:boolean; cancelRequested:boolean; providerTaskId:string|null; workerId:string|null; leaseToken:string|null; leaseUntil:Date|null; errorCode:string|null; createdAt:Date; updatedAt:Date; }
export function generationConfig() {
 const raw = process.env.ANS_TRIPO_PRICE_POINTS?.trim();
 const price = raw && /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(raw) ? Number(raw) : null;
 const valid = price !== null && Number.isFinite(price) && price > 0 && price <= 10000;
 const flatRaw=process.env.ANS_TRIPO_FLAT_PRICE_POINTS===undefined?"20":process.env.ANS_TRIPO_FLAT_PRICE_POINTS.trim();
 const flatPrice=flatRaw&&/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(flatRaw)?Number(flatRaw):null;
 const flatValid=flatPrice!==null&&Number.isFinite(flatPrice)&&flatPrice>0&&flatPrice<=10000;
 const pricingValid=flatValid;
 const table = z.array(z.object({options:tripoOptionsSchema,costPoints:z.number().positive().max(10000).refine(value=>Number.isInteger(value*1_000_000))}).strict()).max(500).safeParse((()=>{try{return JSON.parse(process.env.ANS_TRIPO_PRICE_TABLE||"[]");}catch{return null;}})());
 const quotes=table.success?table.data:[];
 return { models:TRIPO_MODELS, quotes, flatCostPoints:flatValid?flatPrice:null, available:pricingValid&&table.success&&process.env.ANS_TRIPO_ACCEPTING_JOBS==="true"&&durableStorageReady()&&(process.env.ANS_VISUAL_WORKER_KEY?.length??0)>=32&&(process.env.ANS_VISUAL_SIGNING_SECRET?.length??0)>=32&&(flatValid||valid||quotes.length>0), costPoints:valid?price:null, provider:"studio.tripo3d.uk", limits:{imageBytes:20_000_000,modelBytes:30_000_000} };
}
export async function requireVisualOwner(tx:DbTransaction,ownerId:string,projectId?:string) { const user=await tx.user.findFirst({where:{id:ownerId,deletedAt:null,flagged:false},select:{id:true}});if(!user)throw new VisualPortfolioError("FORBIDDEN",403);if(projectId&&!await tx.project.findFirst({where:{id:projectId,ownerId,status:"ACTIVE"},select:{id:true}}))throw new VisualPortfolioError("NOT_FOUND",404); }
async function record(tx:DbTransaction,id:string,ownerId?:string,lock=false) { const rows=ownerId?await tx.$queryRaw<ModelJobRecord[]>`SELECT * FROM visual_model_jobs WHERE id=${id}::uuid AND "ownerId"=${ownerId}`:await tx.$queryRaw<ModelJobRecord[]>`SELECT * FROM visual_model_jobs WHERE id=${id}::uuid FOR UPDATE`;const found=rows[0];if(!found)throw new VisualPortfolioError("NOT_FOUND",404);if(lock&&ownerId)await tx.$queryRaw`SELECT id FROM visual_model_jobs WHERE id=${id}::uuid FOR UPDATE`;return found; }
export async function modelJobView(job:ModelJobRecord):Promise<ModelJobView> { const assets=await db.$queryRaw<Array<{id:string;sha256:string;size:number}>>`SELECT id,sha256,size FROM visual_model_assets WHERE "jobId"=${job.id}::uuid AND "ownerId"=${job.ownerId}`;return {id:job.id,status:job.status,stage:job.stage,progress:job.progress,costPoints:Number(job.costPoints),refunded:job.refunded,cancelRequested:job.cancelRequested,errorCode:job.errorCode,createdAt:job.createdAt.toISOString(),updatedAt:job.updatedAt.toISOString(),asset:assets[0]??null,options:job.options}; }
export async function createModelJob(ownerId: string, raw: unknown, image: Uint8Array|Array<Uint8Array|null>) {
 const input = createModelJobSchema.parse(raw), cfg = generationConfig();
 if (!cfg.available) throw new VisualPortfolioError("GENERATION_NOT_CONFIGURED", 503);
 if(input.options.quad)throw new VisualPortfolioError("QUAD_DELIVERY_UNSUPPORTED",400);
 const quoted=generationPrice(cfg,input.options);
 const preparedInput=await prepareGenerationInput(input.options,image,input.prompt), type=preparedInput;
 const hashes=modelRequestHashes(preparedInput.bytes,input.options,input.projectId,input.acceptedPoints), hash=hashes.current;
 const prepared = await db.$transaction(async tx => {
  await lockVisualInputs(tx, ownerId); await requireVisualOwner(tx, ownerId, input.projectId);
  const previous = (await tx.$queryRaw<ModelJobRecord[]>`SELECT * FROM visual_model_jobs WHERE "ownerId"=${ownerId} AND "idempotencyKey"=${input.idempotencyKey}`)[0];
  if (previous) { if (previous.requestHash !== hash && previous.requestHash !== hashes.legacy) throw new VisualPortfolioError("IDEMPOTENCY_CONFLICT", 409); return { previous }; }
  if (quoted===null)throw new VisualPortfolioError("PRICE_NOT_CONFIGURED",503);
  if (input.acceptedPoints !== quoted) throw new VisualPortfolioError("PRICE_CHANGED", 409);
  const cost=quoted;
  const pendingUpload = (await tx.$queryRaw<InputUpload[]>`SELECT * FROM visual_input_uploads WHERE "ownerId"=${ownerId} FOR UPDATE`)[0];
  if (pendingUpload) {
   if (pendingUpload.expiresAt.getTime() > Date.now()) {
    throw new VisualPortfolioError("INPUT_UPLOAD_PENDING", 409);
   }
   await clearInputUpload(tx, pendingUpload);
  }
  if (!await clearTerminalInputs(tx, ownerId)) return { cleanupPending: true };
  const pending = await tx.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM visual_model_jobs WHERE "ownerId"=${ownerId} AND status IN ('QUEUED','RUNNING','NEEDS_REVIEW')`;
  if (Number(pending[0].count) >= 3) throw new VisualPortfolioError("QUEUE_LIMIT", 429);
  const storageLimitRaw = process.env.ANS_VISUAL_MAX_RETAINED_INPUTS ?? "32";
  if (!/^[1-9]\d{0,3}$/.test(storageLimitRaw) || Number(storageLimitRaw) > 1000) throw new VisualPortfolioError("STORAGE_LIMIT_NOT_CONFIGURED", 503);
  const retained = await tx.$queryRaw<Array<{ count: bigint }>>`SELECT (SELECT count(*) FROM visual_model_jobs WHERE "inputDeletedAt" IS NULL) + (SELECT count(*) FROM visual_input_uploads) AS count`;
  if (Number(retained[0].count) >= Number(storageLimitRaw)) throw new VisualPortfolioError("INPUT_STORAGE_LIMIT", 503);
  await assertAccountCanSpend(tx, ownerId, cost);
  const id = randomUUID(), inputKey = "visual/" + id + "/input." + type.extension;
  const expiresAt = new Date(Date.now() + 120000), storageMode = process.env.ANS_VISUAL_STORAGE_MODE!;
  await tx.$executeRaw`INSERT INTO visual_input_uploads (id,"ownerId","inputKey","requestHash","idempotencyKey","expiresAt","storageMode") VALUES (${id}::uuid,${ownerId},${inputKey},${hash},${input.idempotencyKey},${expiresAt},${storageMode})`;
  reserveInputWriter(id);
  return { upload: { id, ownerId, inputKey, requestHash: hash, idempotencyKey: input.idempotencyKey, expiresAt, storageMode }, cost };
 }, { maxWait: 10000, timeout: 45000 });
 if (prepared.previous) return modelJobView(prepared.previous);
 if (!prepared.upload) throw new VisualPortfolioError("INPUT_CLEANUP_PENDING", 503);
 const upload = prepared.upload, cost = prepared.cost;
 let result: ModelJobRecord;
 try {
  result = await db.$transaction(async tx => {
   beginInputWriter(upload.id);
   try {
   await lockVisualInputs(tx, ownerId); await requireVisualOwner(tx, ownerId, input.projectId);
   const previous = (await tx.$queryRaw<ModelJobRecord[]>`SELECT * FROM visual_model_jobs WHERE "ownerId"=${ownerId} AND "idempotencyKey"=${input.idempotencyKey}`)[0];
   if (previous) { if (previous.requestHash !== hash && previous.requestHash !== hashes.legacy) throw new VisualPortfolioError("IDEMPOTENCY_CONFLICT", 409); return previous; }
   const current = (await tx.$queryRaw<InputUpload[]>`SELECT * FROM visual_input_uploads WHERE id=${upload.id}::uuid AND "ownerId"=${ownerId} AND "inputKey"=${upload.inputKey} AND "requestHash"=${hash} FOR UPDATE`)[0];
   if (!current || current.expiresAt.getTime() <= Date.now()) throw new VisualPortfolioError("INPUT_UPLOAD_PENDING", 409);
   await assertAccountCanSpend(tx, ownerId, cost);
   await debitQuota(tx, { userId: ownerId, costPoints: cost, ref: { type: "visual-model", id: upload.id }, note: "3D generation reservation" });
   await putVisualInput(upload.id, upload.inputKey, preparedInput.bytes, type.mime);
   await tx.$executeRaw`INSERT INTO visual_model_jobs (id,"ownerId","projectId","idempotencyKey","requestHash","inputKey","inputMime",options,"costPoints","updatedAt") VALUES (${upload.id}::uuid,${ownerId},${input.projectId??null},${input.idempotencyKey},${hash},${upload.inputKey},${type.mime},${JSON.stringify(input.options)}::jsonb,${cost},NOW())`;
   await tx.$executeRaw`DELETE FROM visual_input_uploads WHERE id=${upload.id}::uuid AND "ownerId"=${ownerId}`;
   return await record(tx, upload.id);
   } finally { settleInputWriter(upload.id); }
  }, { maxWait: 10000, timeout: 30000 });
 } catch (error) { await compensateInputUpload(upload); throw error; }
 // A later view read failure is not a failed reservation and must not delete input.
 forgetInputWriter(upload.id);
 return modelJobView(result);
}
export async function getModelJob(ownerId:string,id:string) { await requireVisualOwner(db,ownerId);return modelJobView(await record(db,id,ownerId)); }
export async function listModelJobs(ownerId:string) { await requireVisualOwner(db,ownerId);const rows=await db.$queryRaw<ModelJobRecord[]>`SELECT * FROM visual_model_jobs WHERE "ownerId"=${ownerId} ORDER BY "createdAt" DESC LIMIT 20`;return Promise.all(rows.map(modelJobView)); }
async function refund(tx:DbTransaction,job:ModelJobRecord) { if(job.refunded||!canRefund(job.stage,job.providerTaskId))return;await refundQuota(tx,{userId:job.ownerId,costPoints:Number(job.costPoints),ref:{type:"visual-model",id:job.id},note:"Cancelled before provider submission"});await tx.$executeRaw`UPDATE visual_model_jobs SET refunded=true WHERE id=${job.id}::uuid`; }
export async function cancelModelJob(ownerId:string,id:string) { await db.$transaction(async tx=>{await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(13132026)`;await tx.$queryRaw`SELECT id FROM users WHERE id=${ownerId} FOR UPDATE`;await requireVisualOwner(tx,ownerId);const job=await record(tx,id);if(job.ownerId!==ownerId)throw new VisualPortfolioError("NOT_FOUND",404);if(["SUCCEEDED","FAILED","CANCELLED"].includes(job.status))return;if(job.status==="QUEUED"&&!job.providerTaskId){await refund(tx,job);await tx.$executeRaw`UPDATE visual_model_jobs SET status='CANCELLED',"cancelRequested"=true,"updatedAt"=NOW() WHERE id=${id}::uuid`;}else await tx.$executeRaw`UPDATE visual_model_jobs SET "cancelRequested"=true,"updatedAt"=NOW() WHERE id=${id}::uuid`;});await cleanupOwnerInputs(ownerId);return getModelJob(ownerId,id); }
export function assertWorker(request:Request) { const configured=process.env.ANS_VISUAL_WORKER_KEY;if(!configured||configured.length<32)throw new VisualPortfolioError("WORKER_NOT_CONFIGURED",503);const token=request.headers.get("authorization")?.replace(/^Bearer /,"")??"";const expected=Buffer.from(sha256(configured),"hex"),actual=Buffer.from(sha256(token),"hex");if(!timingSafeEqual(expected,actual))throw new VisualPortfolioError("UNAUTHORIZED",401); }
export async function claimModelJob(raw:unknown) {
 const {workerId,jobId}=workerClaimSchema.parse(raw);
 const cleanupOwners = new Set<string>();
 const result = await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(13132026)`;
  const expired=await tx.$queryRaw<ModelJobRecord[]>`SELECT * FROM visual_model_jobs WHERE status='RUNNING' AND "leaseUntil"<NOW() FOR UPDATE`;
  for(const job of expired){
   cleanupOwners.add(job.ownerId);
   if(safeToRetry(job.stage,job.providerTaskId)){
    if(job.cancelRequested){await refund(tx,job);await tx.$executeRaw`UPDATE visual_model_jobs SET status='CANCELLED',"leaseToken"=NULL,"leaseUntil"=NULL,"updatedAt"=NOW() WHERE id=${job.id}::uuid`;}
    else await tx.$executeRaw`UPDATE visual_model_jobs SET status='QUEUED',stage='queued',progress=0,"leaseToken"=NULL,"workerId"=NULL,"leaseUntil"=NULL,"updatedAt"=NOW() WHERE id=${job.id}::uuid`;
   }else if(job.providerTaskId)await tx.$executeRaw`UPDATE visual_model_jobs SET status='QUEUED',stage='wait',"leaseToken"=NULL,"leaseUntil"=NULL,"updatedAt"=NOW() WHERE id=${job.id}::uuid`;
   else await tx.$executeRaw`UPDATE visual_model_jobs SET status='NEEDS_REVIEW',"errorCode"='WORKER_INTERRUPTED',"leaseToken"=NULL,"leaseUntil"=NULL,"updatedAt"=NOW() WHERE id=${job.id}::uuid`;
  }
  const running=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM visual_model_jobs WHERE status='RUNNING' LIMIT 1`;if(running.length)return null;
  const job=(await tx.$queryRaw<ModelJobRecord[]>`SELECT * FROM visual_model_jobs WHERE status='QUEUED' AND (${jobId??null}::uuid IS NULL OR id=${jobId??null}::uuid) AND ("cancelRequested"=false OR "providerTaskId" IS NOT NULL) ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED`)[0];if(!job)return null;
  cleanupOwners.add(job.ownerId);
  const valid=await tx.user.findFirst({where:{id:job.ownerId,deletedAt:null,flagged:false},select:{id:true}});
  if(!valid||(job.projectId&&!await tx.project.findFirst({where:{id:job.projectId,ownerId:job.ownerId,status:"ACTIVE"},select:{id:true}}))){await refund(tx,job);await tx.$executeRaw`UPDATE visual_model_jobs SET status='FAILED',"errorCode"='ACCOUNT_UNAVAILABLE',"updatedAt"=NOW() WHERE id=${job.id}::uuid`;return null;}
  const leaseToken=randomUUID();await tx.$executeRaw`UPDATE visual_model_jobs SET status='RUNNING',stage=${job.providerTaskId?'wait':'upload'},progress=${job.providerTaskId?35:10},"workerId"=${workerId},"leaseToken"=${leaseToken}::uuid,"leaseUntil"=NOW()+INTERVAL '90 seconds',"updatedAt"=NOW() WHERE id=${job.id}::uuid`;
  return {id:job.id,leaseToken,options:job.options,providerTaskId:job.providerTaskId,inputMime:job.inputMime};
 });
 for (const ownerId of cleanupOwners) await cleanupOwnerInputs(ownerId);
 return result;
}
export async function workerJob(id:string,token:string,tx:DbTransaction=db) { const job=await record(tx,id);if(job.status!=="RUNNING"||job.leaseToken!==token||!job.leaseUntil||job.leaseUntil.getTime()<Date.now())throw new VisualPortfolioError("LEASE_LOST",409);return job; }
export async function updateModelJob(id:string,raw:unknown) { const event=workerEventSchema.parse(raw);let cleanupOwner: string | undefined;const result=await db.$transaction(async tx=>{await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(13132026)`;const job=await workerJob(id,event.leaseToken,tx);cleanupOwner=job.ownerId;if(event.type==="heartbeat"){await tx.$executeRaw`UPDATE visual_model_jobs SET "leaseUntil"=NOW()+INTERVAL '90 seconds',"updatedAt"=NOW() WHERE id=${id}::uuid`;return {cancelRequested:job.cancelRequested};}
 if(event.type==="stage"){if(!event.stage||!canAdvanceStage(job.stage,event.stage)||(event.stage==="wait"&&!job.providerTaskId))throw new VisualPortfolioError("INVALID_TRANSITION",409);if(job.cancelRequested&&canRefund(job.stage,job.providerTaskId)){await refund(tx,job);await tx.$executeRaw`UPDATE visual_model_jobs SET status='CANCELLED',"leaseToken"=NULL,"updatedAt"=NOW() WHERE id=${id}::uuid`;return {cancelled:true};}await tx.$executeRaw`UPDATE visual_model_jobs SET stage=${event.stage},progress=${STAGE_PROGRESS[event.stage]},"leaseUntil"=NOW()+INTERVAL '90 seconds',"updatedAt"=NOW() WHERE id=${id}::uuid`;return {cancelRequested:job.cancelRequested};}
 if(event.type==="accepted"){if(!event.providerTaskId||(job.stage!=="submit"&&!(job.stage==="wait"&&job.providerTaskId===event.providerTaskId)))throw new VisualPortfolioError("INVALID_TRANSITION",409);await tx.$executeRaw`UPDATE visual_model_jobs SET "providerTaskId"=${event.providerTaskId},stage='wait',progress=35,"updatedAt"=NOW() WHERE id=${id}::uuid`;return {accepted:true};}
 if(event.type==="failed"&&canRefund(job.stage,job.providerTaskId))await refund(tx,job);
 const status=event.type==="review"?"NEEDS_REVIEW":"FAILED";await tx.$executeRaw`UPDATE visual_model_jobs SET status=${status},"errorCode"=${event.errorCode??"WORKER_INTERRUPTED"},"leaseToken"=NULL,"leaseUntil"=NULL,"updatedAt"=NOW() WHERE id=${id}::uuid`;return {status};});if(cleanupOwner && ("status" in result || "cancelled" in result)) await cleanupOwnerInputs(cleanupOwner);return result; }

/** Recover only a task ID durably recorded after the provider response. Never infer or resubmit. */
export async function recoverModelJob(id:string,raw:unknown){
 const input=workerClaimSchema.extend({providerTaskId:workerEventSchema.shape.providerTaskId.unwrap()}).parse(raw);
 return db.$transaction(async tx=>{await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(13132026)`;const job=await record(tx,id);
 if(["SUCCEEDED","FAILED","CANCELLED"].includes(job.status))return {recovered:false};
 if(job.providerTaskId&&job.providerTaskId!==input.providerTaskId)throw new VisualPortfolioError("RESULT_CONFLICT",409);
 if(job.workerId!==input.workerId)throw new VisualPortfolioError("FORBIDDEN",403);
 if(job.status==="RUNNING"&&job.leaseUntil&&job.leaseUntil.getTime()>Date.now())return {recovered:false};
 if(!["submit","wait","download","persist"].includes(job.stage))throw new VisualPortfolioError("INVALID_TRANSITION",409);
 await tx.$executeRaw`UPDATE visual_model_jobs SET status='QUEUED',stage='wait',progress=35,"providerTaskId"=${input.providerTaskId},"leaseToken"=NULL,"leaseUntil"=NULL,"errorCode"=NULL,"updatedAt"=NOW() WHERE id=${id}::uuid`;
 return {recovered:true};});
}
