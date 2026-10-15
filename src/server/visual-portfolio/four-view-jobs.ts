import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db,type DbTransaction } from "@/lib/db";
import { fourViewInputSchema,FOUR_VIEW_PRICE,FOUR_VIEW_ORDER,type FourViewJob,type FourViewStatus } from "@/contracts/four-view";
import { assertAccountCanSpend,debitQuota,refundQuota } from "@/server/quota/service";
import { requireVisualOwner } from "./jobs";
import { durableStorageReady,putVisualInput,putVisualObject,readVisualObject,deleteVisualInput,deleteFourViewResult,sha256 } from "./storage";
import { validateInputImage } from "./media";
import { cropFourViewGrid } from "./four-view-crop";
import { reserveInputWriter,beginInputWriter,settleInputWriter,fenceInputWriter,forgetInputWriter } from "./input-writer";
import { VisualPortfolioError } from "./errors";
interface Record extends Omit<FourViewJob,"createdAt"> {ownerId:string;model:string;idempotencyKey:string;requestHash:string;inputKey:string;inputMime:string;leaseToken:string|null;leaseUntil:Date|null;createdAt:Date;charged:boolean;resultHash:string|null;}
const view=(record:Record):FourViewJob=>({id:record.id,status:record.status,aspectRatio:record.aspectRatio,costPoints:5,refunded:record.refunded,errorCode:record.errorCode,createdAt:record.createdAt.toISOString()});
export function fourViewConfig(){const model=process.env.ANS_FOUR_VIEW_MODEL||"gpt-image-2.5-sunburst-c";return {available:model==="gpt-image-2.5-sunburst-c"&&process.env.ANS_FOUR_VIEW_ENABLED==="true"&&process.env.ANS_FOUR_VIEW_API_CONFIRMED==="true"&&process.env.ANS_VISUAL_STORAGE_MODE==="local"&&durableStorageReady()&&(process.env.ANS_VISUAL_WORKER_KEY?.length??0)>=32,costPoints:FOUR_VIEW_PRICE,model,channel:"openlux",order:FOUR_VIEW_ORDER};}
async function record(tx:DbTransaction,id:string,ownerId?:string){
 const row=(await tx.$queryRaw<Record[]>`SELECT * FROM visual_four_view_jobs WHERE id=${id}::uuid FOR UPDATE`)[0];
 if(!row||(ownerId&&row.ownerId!==ownerId))throw new VisualPortfolioError("NOT_FOUND",404);return row;
}
export async function listFourViewJobs(ownerId:string){await requireVisualOwner(db,ownerId);return (await db.$queryRaw<Record[]>`SELECT * FROM visual_four_view_jobs WHERE "ownerId"=${ownerId} AND status<>'ARCHIVED' ORDER BY "createdAt" DESC LIMIT 32`).map(view);}
export async function createFourViewJob(ownerId:string,raw:unknown,bytes:Uint8Array){
 const input=fourViewInputSchema.parse(raw);if(!fourViewConfig().available)throw new VisualPortfolioError("FOUR_VIEW_NOT_CONFIGURED",503);
 const model=fourViewConfig().model;
 const type=await validateInputImage(bytes),hash=sha256(JSON.stringify([sha256(bytes),input.aspectRatio,model,FOUR_VIEW_PRICE]));
 const prepared=await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(13142026)`;await requireVisualOwner(tx,ownerId);
  await tx.$queryRaw`SELECT id FROM users WHERE id=${ownerId} FOR UPDATE`;
  const previous=(await tx.$queryRaw<Record[]>`SELECT * FROM visual_four_view_jobs WHERE "ownerId"=${ownerId} AND "idempotencyKey"=${input.idempotencyKey}`)[0];
  if(previous){if(previous.requestHash!==hash)throw new VisualPortfolioError("IDEMPOTENCY_CONFLICT",409);return {previous};}
  const counts=(await tx.$queryRaw<Array<{retained:bigint;pending:bigint}>>`SELECT count(*) FILTER (WHERE status<>'ARCHIVED') AS retained,count(*) FILTER (WHERE "ownerId"=${ownerId} AND status IN ('UPLOADING','QUEUED','RUNNING','NEEDS_REVIEW')) AS pending FROM visual_four_view_jobs`)[0];
  if(Number(counts.retained)>=32)throw new VisualPortfolioError("INPUT_STORAGE_LIMIT",503);if(Number(counts.pending)>=3)throw new VisualPortfolioError("QUEUE_LIMIT",429);
  await assertAccountCanSpend(tx,ownerId,FOUR_VIEW_PRICE);
  const id=randomUUID(),key=`visual/${id}/input.${type.extension}`;
  await tx.$executeRaw`INSERT INTO visual_four_view_jobs (id,"ownerId","idempotencyKey","requestHash","inputKey","inputMime","aspectRatio",model) VALUES (${id}::uuid,${ownerId},${input.idempotencyKey},${hash},${key},${type.mime},${input.aspectRatio},${model})`;
  reserveInputWriter(id);return {upload:{id,key}};
 });
 if(prepared.previous)return view(prepared.previous);
 const upload=prepared.upload!;
 try{
  beginInputWriter(upload.id);try{await putVisualInput(upload.id,upload.key,bytes,type.mime);}finally{settleInputWriter(upload.id);}
  const result=await db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM users WHERE id=${ownerId} FOR UPDATE`;await requireVisualOwner(tx,ownerId);const row=await record(tx,upload.id,ownerId);
   if(row.status!=="UPLOADING")throw new VisualPortfolioError("LEASE_LOST",409);
   await debitQuota(tx,{userId:ownerId,costPoints:5,ref:{type:"four-view",id:row.id},note:"4K four-view preparation reservation"});
   await tx.$executeRaw`UPDATE visual_four_view_jobs SET status='QUEUED',charged=true,"updatedAt"=NOW() WHERE id=${row.id}::uuid`;return view(await record(tx,row.id));
  });forgetInputWriter(upload.id);return result;
 }catch(error){await db.$executeRaw`UPDATE visual_four_view_jobs SET status='FAILED',"errorCode"='INPUT_UPLOAD_FAILED',"updatedAt"=NOW() WHERE id=${upload.id}::uuid AND status='UPLOADING'`;throw error;}
}
export async function claimFourViewJob(){return db.$transaction(async tx=>{
 await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(13142026)`;
 await tx.$executeRaw`UPDATE visual_four_view_jobs SET status='NEEDS_REVIEW',"errorCode"='WORKER_INTERRUPTED',"leaseUntil"=NULL,"updatedAt"=NOW() WHERE status='RUNNING' AND "leaseUntil"<NOW()`;
 await tx.$executeRaw`UPDATE visual_four_view_jobs SET status='NEEDS_REVIEW',"errorCode"='INPUT_UPLOAD_INTERRUPTED',"updatedAt"=NOW() WHERE status='UPLOADING' AND "createdAt"<NOW()-interval '5 minutes'`;
 if((await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM visual_four_view_jobs WHERE status='RUNNING' LIMIT 1`).length)return null;
 const row=(await tx.$queryRaw<Record[]>`SELECT * FROM visual_four_view_jobs WHERE status='QUEUED' ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1`)[0];if(!row)return null;
 const token=randomUUID();await tx.$executeRaw`UPDATE visual_four_view_jobs SET status='RUNNING',"leaseToken"=${token}::uuid,"leaseUntil"=NOW()+interval '90 seconds',"updatedAt"=NOW() WHERE id=${row.id}::uuid`;
 return {id:row.id,inputMime:row.inputMime,aspectRatio:row.aspectRatio,model:row.model,leaseToken:token};
 });}
function validLease(row:Record,token:string){if(row.status!=="RUNNING"||row.leaseToken!==token||!row.leaseUntil||row.leaseUntil.getTime()<=Date.now())throw new VisualPortfolioError("LEASE_LOST",409);}
export async function fourViewInput(id:string,token:string){return db.$transaction(async tx=>{const row=await record(tx,id);validLease(row,token);return {bytes:await readVisualObject(row.inputKey,20_000_000),mime:row.inputMime};});}
const eventSchema=z.discriminatedUnion("type",[
 z.object({type:z.literal("heartbeat"),leaseToken:z.string().uuid()}).strict(),
 z.object({type:z.enum(["notSent","review"]),leaseToken:z.string().uuid(),errorCode:z.enum(["GRID_DIMENSIONS_INVALID"]).optional()}).strict()
]);
async function refund(tx:DbTransaction,row:Record){if(row.charged&&!row.refunded){await refundQuota(tx,{userId:row.ownerId,costPoints:5,ref:{type:"four-view",id:row.id},note:"Four-view request was not sent"});await tx.$executeRaw`UPDATE visual_four_view_jobs SET refunded=true,status='CANCELLED' WHERE id=${row.id}::uuid`;}}
export async function fourViewEvent(id:string,raw:unknown){const input=eventSchema.parse(raw);return db.$transaction(async tx=>{
 const owner=(await tx.$queryRaw<Array<{ownerId:string}>>`SELECT "ownerId" FROM visual_four_view_jobs WHERE id=${id}::uuid`)[0];if(!owner)throw new VisualPortfolioError("NOT_FOUND",404);
 await tx.$queryRaw`SELECT id FROM users WHERE id=${owner.ownerId} FOR UPDATE`;const row=await record(tx,id);validLease(row,input.leaseToken);
 if(input.type==="heartbeat")await tx.$executeRaw`UPDATE visual_four_view_jobs SET "leaseUntil"=NOW()+interval '90 seconds',"updatedAt"=NOW() WHERE id=${id}::uuid`;
 else{if(input.type==="notSent")await refund(tx,row);const status:FourViewStatus=input.type==="notSent"?"FAILED":"NEEDS_REVIEW";await tx.$executeRaw`UPDATE visual_four_view_jobs SET status=${status},"errorCode"=${input.type==="notSent"?"REQUEST_NOT_SENT":input.errorCode??"SUBMISSION_UNCERTAIN"},"leaseUntil"=NULL,"updatedAt"=NOW() WHERE id=${id}::uuid`;}
 return view(await record(tx,id));
 });}
export async function completeFourViewJob(id:string,token:string,bytes:Uint8Array){return db.$transaction(async tx=>{
 const row=await record(tx,id),hash=sha256(bytes);
 if(row.status==="SUCCEEDED"&&row.resultHash===hash&&row.leaseToken===token)return view(row);
 if(!["RUNNING","NEEDS_REVIEW"].includes(row.status)||row.leaseToken!==token||!row.charged||row.refunded)throw new VisualPortfolioError("LEASE_LOST",409);const views=await cropFourViewGrid(bytes,row.aspectRatio);
 await putVisualObject(`visual/${id}/grid.bin`,bytes,"application/octet-stream");
 for(const item of views)await putVisualObject(`visual/${id}/view-${item.name}.png`,item.bytes,"image/png");
 await tx.$executeRaw`UPDATE visual_four_view_jobs SET status='SUCCEEDED',"resultHash"=${hash},"leaseUntil"=NULL,"updatedAt"=NOW() WHERE id=${id}::uuid`;
 return view(await record(tx,id));
 },{timeout:45000});}
export async function fourViewFile(ownerId:string,id:string,name:string){
 if(!FOUR_VIEW_ORDER.includes(name as typeof FOUR_VIEW_ORDER[number]))throw new VisualPortfolioError("NOT_FOUND",404);
 await requireVisualOwner(db,ownerId);const rows=await db.$queryRaw<Record[]>`SELECT * FROM visual_four_view_jobs WHERE id=${id}::uuid AND "ownerId"=${ownerId} AND status='SUCCEEDED'`;if(!rows.length)throw new VisualPortfolioError("NOT_FOUND",404);
 return readVisualObject(`visual/${id}/view-${name}.png`,20_000_000);
}
export async function discardFourViewJob(ownerId:string,id:string){return db.$transaction(async tx=>{
 await tx.$queryRaw`SELECT id FROM users WHERE id=${ownerId} FOR UPDATE`;await requireVisualOwner(tx,ownerId);const row=await record(tx,id,ownerId);
 if(row.status==="ARCHIVED")return {archived:true};
 if(!["QUEUED","SUCCEEDED","FAILED","CANCELLED"].includes(row.status)&&!(row.status==="NEEDS_REVIEW"&&!row.charged))throw new VisualPortfolioError("TASK_REQUIRES_REVIEW",409);
 if(row.status==="QUEUED"){await refund(tx,row);await tx.$executeRaw`UPDATE visual_four_view_jobs SET status='CANCELLED' WHERE id=${id}::uuid`;}
 if(process.env.ANS_VISUAL_STORAGE_MODE!=="local")throw new VisualPortfolioError("STORAGE_NOT_CONFIGURED",503);
 if(!row.charged)fenceInputWriter(id);
 await deleteVisualInput(id,row.inputKey);for(const name of ["grid.bin",...FOUR_VIEW_ORDER.map(name=>`view-${name}.png`)])await deleteFourViewResult(id,name);
 await tx.$executeRaw`UPDATE visual_four_view_jobs SET status='ARCHIVED',"updatedAt"=NOW() WHERE id=${id}::uuid`;return {archived:true};
 },{timeout:45000});}
