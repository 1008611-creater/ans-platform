import { randomUUID, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "@/lib/db";
import { VISUAL_WEBSITE_ID, visualWebsiteSchema } from "@/contracts/visual-website";
import { publishWebsiteSchema, MODEL_LIMIT, type PublishedWebsiteView } from "@/contracts/visual-generation";
import { renderVisualWebsite } from "@/lib/projects/visual-website";
import type { VisualRuntimeAssets } from "@/lib/projects/visual-website-assets";
import { requireVisualOwner } from "./jobs";
import { ownedModelAsset } from "./assets";
import { putVisualObject, readVisualObject, sha256, durableStorageReady } from "./storage";
import { VisualPortfolioError } from "./errors";

interface Release {id:string;ownerId:string;projectId:string;version:number;slug:string;htmlKey:string;sha256:string;createdAt:Date;}
const HTML_LIMIT=65_000_000;
function publicationOrigin(){
 try{
  const url=new URL(process.env.ANS_VISUAL_PUBLIC_ORIGIN||"");const app=new URL(process.env.AUTH_URL||process.env.NEXT_PUBLIC_APP_URL||"");
  if(url.username||url.password||url.search||url.hash||url.pathname!=="/"||url.origin===app.origin)throw new Error();
  if(url.protocol!=="https:"&&!(url.protocol==="http:"&&["localhost","127.0.0.1"].includes(url.hostname)))throw new Error();
  return url.origin;
 }catch{throw new VisualPortfolioError("PUBLICATION_NOT_CONFIGURED",503);}
}
export function publicationConfig(){try{return {available:process.env.ANS_VISUAL_PUBLISH_ENABLED==="true"&&durableStorageReady()&&(process.env.ANS_VISUAL_PUBLICATION_KEY?.length??0)>=32,origin:publicationOrigin()};}catch{return {available:false,origin:null};}}
function releaseView(release:Release):PublishedWebsiteView{return {id:release.id,slug:release.slug,version:release.version,publishedAt:release.createdAt.toISOString(),url:`${publicationOrigin()}/sites/${release.slug}`};}
export async function publishedWebsite(ownerId:string,projectId:string){await requireVisualOwner(db,ownerId,projectId);const release=(await db.$queryRaw<Release[]>`SELECT * FROM visual_website_releases WHERE "projectId"=${projectId} AND "ownerId"=${ownerId} AND active=true`)[0];return release?releaseView(release):null;}
export async function renderStoredWebsite(ownerId:string,raw:unknown){
 const doc=visualWebsiteSchema.parse(raw);let model:Buffer|undefined;
 if(doc.appearance.tour?.modelAsset){const asset=await ownedModelAsset(ownerId,doc.appearance.tour.modelAsset);model=await readVisualObject(asset.objectKey,MODEL_LIMIT);if(sha256(model)!==asset.sha256)throw new VisualPortfolioError("ASSET_CORRUPT",503);}
 let assets:VisualRuntimeAssets|undefined;
 if(doc.appearance.avatar==="reference"){
  const files={core:"mascot/3d/vendor/three.core.js",module:"mascot/3d/vendor/three.module.js",utility:"mascot/3d/vendor/BufferGeometryUtils.js",loader:"mascot/3d/vendor/GLTFLoader.js",scene:"visual-portfolio/scene.mjs"};
  const entries=await Promise.all(Object.entries(files).map(async([key,file])=>[key,await readFile(resolve("public",file),"utf8")]));
  const defaultModel=model??await readFile(resolve("public/visual-portfolio/reference/banner.glb"));
  assets={...Object.fromEntries(entries),model:defaultModel.toString("base64")} as VisualRuntimeAssets;
 }
 const bytes=Buffer.from(renderVisualWebsite(doc.profile,doc.appearance,0,assets));if(bytes.length>HTML_LIMIT)throw new VisualPortfolioError("SITE_TOO_LARGE",413);return bytes;
}
export async function publishVisualWebsite(ownerId:string,raw:unknown){
 const input=publishWebsiteSchema.parse(raw);if(!publicationConfig().available)throw new VisualPortfolioError("PUBLICATION_NOT_CONFIGURED",503);
 await requireVisualOwner(db,ownerId,input.projectId);
 const saved=await db.artifactVersion.findFirst({where:{version:input.version,artifact:{projectId:input.projectId,workflowId:VISUAL_WEBSITE_ID}},select:{contentJson:true}});
 if(!saved)throw new VisualPortfolioError("NOT_FOUND",404);
 const bytes=await renderStoredWebsite(ownerId,saved.contentJson),id=randomUUID(),key=`visual/${id}/site.html`,hash=sha256(bytes);
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(13132027)`;await requireVisualOwner(tx,ownerId,input.projectId);
  const occupied=(await tx.$queryRaw<Release[]>`SELECT * FROM visual_website_releases WHERE slug=${input.slug} AND active=true`)[0];
  if(occupied&&occupied.projectId!==input.projectId)throw new VisualPortfolioError("SLUG_TAKEN",409);
  const current=(await tx.$queryRaw<Release[]>`SELECT * FROM visual_website_releases WHERE "projectId"=${input.projectId} AND active=true`)[0];
  if(current?.version===input.version&&current.slug===input.slug&&current.sha256===hash)return releaseView(current);
  await putVisualObject(key,bytes,"text/html;charset=utf-8");
  await tx.$executeRaw`UPDATE visual_website_releases SET active=false,"withdrawnAt"=NOW() WHERE "projectId"=${input.projectId} AND active=true`;
  const doc=visualWebsiteSchema.parse(saved.contentJson);
  await tx.$executeRaw`INSERT INTO visual_website_releases (id,"ownerId","projectId",version,slug,"htmlKey",sha256,"modelAssetId") VALUES (${id}::uuid,${ownerId},${input.projectId},${input.version},${input.slug},${key},${hash},${doc.appearance.tour?.modelAsset?.id??null}::uuid)`;
  const result=(await tx.$queryRaw<Release[]>`SELECT * FROM visual_website_releases WHERE id=${id}::uuid`)[0];return releaseView(result);
 },{timeout:30000});
}
export async function withdrawVisualWebsite(ownerId:string,projectId:string){return db.$transaction(async tx=>{await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(13132027)`;await requireVisualOwner(tx,ownerId,projectId);await tx.$executeRaw`UPDATE visual_website_releases SET active=false,"withdrawnAt"=NOW() WHERE "projectId"=${projectId} AND "ownerId"=${ownerId} AND active=true`;return {withdrawn:true};});}
export function assertPublicationReader(request:Request){const key=process.env.ANS_VISUAL_PUBLICATION_KEY;if(!key||key.length<32)throw new VisualPortfolioError("PUBLICATION_NOT_CONFIGURED",503);const supplied=request.headers.get("authorization")?.replace(/^Bearer /,"")||"";if(!timingSafeEqual(Buffer.from(sha256(key),"hex"),Buffer.from(sha256(supplied),"hex")))throw new VisualPortfolioError("UNAUTHORIZED",401);}
export async function publicWebsiteBytes(slug:string|null,hostname:string|null){
 let rows:Release[];
 if(hostname){rows=await db.$queryRaw<Release[]>`SELECT r.* FROM visual_website_releases r JOIN visual_website_domains d ON d."projectId"=r."projectId" AND d."ownerId"=r."ownerId" JOIN users u ON u.id=r."ownerId" JOIN projects p ON p.id=r."projectId" WHERE d.hostname=${hostname} AND d.status='ACTIVE' AND r.active=true AND u."deletedAt" IS NULL AND u.flagged=false AND p.status='ACTIVE'`;}
 else{rows=await db.$queryRaw<Release[]>`SELECT r.* FROM visual_website_releases r JOIN users u ON u.id=r."ownerId" JOIN projects p ON p.id=r."projectId" WHERE r.slug=${slug} AND r.active=true AND u."deletedAt" IS NULL AND u.flagged=false AND p.status='ACTIVE'`;}
 const release=rows[0];if(!release)throw new VisualPortfolioError("NOT_FOUND",404);const bytes=await readVisualObject(release.htmlKey,HTML_LIMIT);if(sha256(bytes)!==release.sha256)throw new VisualPortfolioError("SITE_CORRUPT",503);return bytes;
}
