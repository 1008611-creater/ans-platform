import assert from "node:assert/strict";
import { readFile,writeFile } from "node:fs/promises";
import { db } from "../../src/lib/db";
import { createModelJob,getModelJob } from "../../src/server/visual-portfolio/jobs";
import { ownedModelAsset } from "../../src/server/visual-portfolio/assets";
import { readVisualObject } from "../../src/server/visual-portfolio/storage";
import { getVisualWebsite,saveVisualWebsite } from "../../src/server/projects/visual-website";
import { renderStoredWebsite } from "../../src/server/visual-portfolio/publication";
import { DEFAULT_TRIPO_OPTIONS,MODEL_LIMIT } from "../../src/contracts/visual-generation";
const projectId="82555b96-2dfb-495f-8407-30002d113e00";
const output=".workbuddy/visual-portfolio";
async function main(){
 assert.equal(new URL(process.env.DATABASE_URL!).pathname,"/ans_visual_portfolio_20261013_pipeline");
 const owner=await db.user.findUniqueOrThrow({where:{email:"visual-preview@example.invalid"},select:{id:true}});
 if(process.argv[2]==="prepare"){
  const image=await readFile("public/visual-portfolio/reference/home/labelman.webp");
  const job=await createModelJob(owner.id,{projectId,idempotencyKey:"live-test-20261013-reference-01",acknowledged:true,acceptedPoints:0,options:DEFAULT_TRIPO_OPTIONS},image);
  await writeFile(`${output}/live-test.json`,JSON.stringify({jobId:job.id,projectId,input:"labelman.webp",status:job.status},null,2));
  console.log(JSON.stringify({jobId:job.id,status:job.status}));
 }else if(process.argv[2]==="finish"){
  const manifest=JSON.parse(await readFile(`${output}/live-test.json`,"utf8"));
  const job=await getModelJob(owner.id,manifest.jobId);
  console.log(JSON.stringify({jobId:job.id,status:job.status,stage:job.stage,errorCode:job.errorCode}));
  assert.equal(job.status,"SUCCEEDED");assert.ok(job.asset);
  const asset=await ownedModelAsset(owner.id,job.asset);
  const model=await readVisualObject(asset.objectKey,MODEL_LIMIT);
  await writeFile(`${output}/tripo-live-model.glb`,model);
  const state=await getVisualWebsite(projectId,owner.id),document=state.versions[0].document;
  const existingAsset=document.appearance.tour?.modelAsset?.id;
  assert.ok(document.appearance.tour);
  document.appearance.tour.model=undefined;document.appearance.tour.modelAsset=job.asset;
  document.appearance.tour.hero.camera=undefined;
  document.appearance.tour.nodes=document.appearance.tour.nodes.map(node=>({...node,camera:undefined}));
  document.appearance.tour.stickers=[];
  const saved=existingAsset===job.asset.id?{version:state.currentVersion}:await saveVisualWebsite(owner.id,{projectId,expectedVersion:state.currentVersion,document});
  const restored=await getVisualWebsite(projectId,owner.id);
  assert.equal(restored.versions[0].document.appearance.tour?.modelAsset?.id,job.asset.id);
  await writeFile(`${output}/tripo-live-website.html`,await renderStoredWebsite(owner.id,restored.versions[0].document));
  await writeFile(`${output}/live-test.json`,JSON.stringify({...manifest,status:job.status,asset:job.asset,version:saved.version,modelFile:"tripo-live-model.glb",websiteFile:"tripo-live-website.html",verifiedAt:new Date().toISOString()},null,2));
  console.log(JSON.stringify({status:job.status,modelBytes:model.length,savedVersion:saved.version,privateProjectId:projectId}));
 }else throw new Error("INVALID_MODE");
 await db.$disconnect();
}
main().catch(async(error:unknown)=>{console.error(error instanceof Error?error.message:"LIVE_TEST_FAILED");await db.$disconnect();process.exitCode=1;});
