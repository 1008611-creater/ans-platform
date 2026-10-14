import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { db } from "../../src/lib/db";
import { putVisualObject,sha256 } from "../../src/server/visual-portfolio/storage";
import { saveVisualWebsite } from "../../src/server/projects/visual-website";
import { DEFAULT_TRIPO_OPTIONS } from "../../src/contracts/visual-generation";
import { DEFAULT_APPEARANCE,type VisualWebsite } from "../../src/contracts/visual-website";
import { RESUME_WEBSITE_EXAMPLE } from "../../src/domain/projects/resume-website";
import { createVisualTour } from "../../src/lib/projects/visual-tour";
async function main(){
 assert.equal(new URL(process.env.DATABASE_URL!).pathname,"/ans_visual_portfolio_20261013_pipeline");
 const email="visual-preview@example.invalid",password=await bcrypt.hash("LocalPreview2026!",10);
 const owner=await db.user.upsert({where:{email},create:{username:"visual_preview",email,password,quotaPoints:100},update:{password}});
 const current=await db.project.findFirst({where:{ownerId:owner.id,status:"ACTIVE"},select:{id:true}});
 if(!current){
  const id=randomUUID(),assetId=randomUUID(),bytes=await readFile("public/visual-portfolio/reference/banner.glb"),key=`visual/${assetId}/model.glb`,hash=sha256(bytes);
  await putVisualObject(key,bytes,"model/gltf-binary");
  await db.$executeRaw`INSERT INTO visual_model_jobs (id,"ownerId","idempotencyKey","requestHash","inputKey","inputMime",options,status,stage,progress,"costPoints","providerTaskId","updatedAt") VALUES (${id}::uuid,${owner.id},${randomUUID()},${"0".repeat(64)},${`visual/${id}/input.webp`},'image/webp',${JSON.stringify(DEFAULT_TRIPO_OPTIONS)}::jsonb,'SUCCEEDED','persist',100,0,${"preview-fixture-"+id},NOW())`;
  await db.$executeRaw`INSERT INTO visual_model_assets (id,"ownerId","jobId","objectKey",sha256,size) VALUES (${assetId}::uuid,${owner.id},${id}::uuid,${key},${hash},${bytes.length})`;
  const document:VisualWebsite={format:"ans-visual-website",version:1,profile:{...RESUME_WEBSITE_EXAMPLE,fullName:"本地测试作品"},appearance:{...DEFAULT_APPEARANCE,tour:{...createVisualTour(RESUME_WEBSITE_EXAMPLE),modelAsset:{id:assetId,sha256:hash,size:bytes.length}}}};
  const projectId=randomUUID();await saveVisualWebsite(owner.id,{projectId,expectedVersion:0,document});console.log(JSON.stringify({previewProjectId:projectId,fixture:"local reference model; no provider generation"}));
 }else console.log(JSON.stringify({previewProjectId:current.id,source:"existing private saved version"}));
 await db.$disconnect();
}
main().catch(async()=>{console.error("PREVIEW_SETUP_FAILED");await db.$disconnect();process.exitCode=1;});
