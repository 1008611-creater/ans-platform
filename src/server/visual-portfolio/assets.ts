import { randomUUID } from "node:crypto";
import { db, type DbTransaction } from "@/lib/db";
import { modelAssetRefSchema, MODEL_LIMIT, type ModelAssetRef } from "@/contracts/visual-generation";
import { putVisualObject, readVisualObject, sha256, signAsset, verifyAssetToken } from "./storage";
import { validateGeneratedModel } from "./media";
import { requireVisualOwner, workerJob } from "./jobs";
import { VisualPortfolioError } from "./errors";
export interface ModelAssetRecord extends ModelAssetRef {ownerId:string;objectKey:string;jobId:string|null;}
export async function ownedModelAsset(ownerId:string,ref:ModelAssetRef,tx:DbTransaction=db) { const parsed=modelAssetRefSchema.parse(ref);const rows=await tx.$queryRaw<ModelAssetRecord[]>`SELECT * FROM visual_model_assets WHERE id=${parsed.id}::uuid AND "ownerId"=${ownerId}`;const asset=rows[0];if(!asset||asset.sha256!==parsed.sha256||asset.size!==parsed.size)throw new VisualPortfolioError("NOT_FOUND",404);return asset; }
export async function completeModelJob(id:string,leaseToken:string,bytes:Uint8Array) {
 validateGeneratedModel(bytes);const hash=sha256(bytes);
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(13132026)`;
  const existing=(await tx.$queryRaw<ModelAssetRecord[]>`SELECT * FROM visual_model_assets WHERE "jobId"=${id}::uuid`)[0];
  if(existing){if(existing.sha256!==hash)throw new VisualPortfolioError("RESULT_CONFLICT",409);return {id:existing.id,sha256:existing.sha256,size:existing.size};}
  const job=await workerJob(id,leaseToken,tx);await requireVisualOwner(tx,job.ownerId,job.projectId??undefined);
  if(!job.providerTaskId||!["download","persist"].includes(job.stage))throw new VisualPortfolioError("INVALID_TRANSITION",409);
  const assetId=randomUUID(),key=`visual/${assetId}/model.glb`;
  await putVisualObject(key,bytes,"model/gltf-binary");
  await tx.$executeRaw`INSERT INTO visual_model_assets (id,"ownerId","jobId","objectKey",sha256,size) VALUES (${assetId}::uuid,${job.ownerId},${id}::uuid,${key},${hash},${bytes.byteLength})`;
  await tx.$executeRaw`UPDATE visual_model_jobs SET status='SUCCEEDED',stage='persist',progress=100,"errorCode"=NULL,"leaseToken"=NULL,"leaseUntil"=NULL,"updatedAt"=NOW() WHERE id=${id}::uuid`;
  return {id:assetId,sha256:hash,size:bytes.byteLength};
 },{timeout:30000});
}
export async function modelAccess(ownerId:string,id:string) { await requireVisualOwner(db,ownerId);const asset=(await db.$queryRaw<ModelAssetRecord[]>`SELECT * FROM visual_model_assets WHERE id=${id}::uuid AND "ownerId"=${ownerId}`)[0];if(!asset)throw new VisualPortfolioError("NOT_FOUND",404);return {asset:{id:asset.id,sha256:asset.sha256,size:asset.size},url:`/api/visual-model-assets/${id}/file?token=${signAsset(id,ownerId)}`}; }
export async function signedModelBytes(id:string,token:string) { const grant=verifyAssetToken(token,id);if(!grant)throw new VisualPortfolioError("NOT_FOUND",404);await requireVisualOwner(db,grant.ownerId);const asset=(await db.$queryRaw<ModelAssetRecord[]>`SELECT * FROM visual_model_assets WHERE id=${id}::uuid AND "ownerId"=${grant.ownerId}`)[0];if(!asset)throw new VisualPortfolioError("NOT_FOUND",404);const bytes=await readVisualObject(asset.objectKey,MODEL_LIMIT);if(sha256(bytes)!==asset.sha256)throw new VisualPortfolioError("ASSET_CORRUPT",503);return bytes; }
