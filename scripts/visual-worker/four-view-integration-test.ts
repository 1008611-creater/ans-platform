import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, unlink } from "node:fs/promises";
import sharp from "sharp";
import { db } from "../../src/lib/db";
import { createFourViewJob, claimFourViewJob, completeFourViewJob, listFourViewJobs, fourViewFile, discardFourViewJob, fourViewEvent } from "../../src/server/visual-portfolio/four-view-jobs";
const coded=(code:string)=>(e:unknown)=>e instanceof Error&&"code" in e&&e.code===code;
async function main(){
 assert.equal(new URL(process.env.DATABASE_URL!).hostname,"127.0.0.1");assert.equal(new URL(process.env.DATABASE_URL!).port,"55438");assert.equal(new URL(process.env.DATABASE_URL!).pathname,"/ans_visual_portfolio_20261013_pipeline");
 Object.assign(process.env,{ANS_FOUR_VIEW_ENABLED:"true",ANS_FOUR_VIEW_API_CONFIRMED:"true",ANS_VISUAL_STORAGE_MODE:"local",ANS_VISUAL_STORAGE_DIR:".workbuddy/four-view-integration-assets",ANS_VISUAL_WORKER_KEY:"w".repeat(32)});
 const token=randomUUID().slice(0,8),owner=await db.user.create({data:{username:`fourview_${token}`,email:`fourview_${token}@example.invalid`,quotaPoints:100}}),other=await db.user.create({data:{username:`fourview_other_${token}`,email:`fourview_other_${token}@example.invalid`,quotaPoints:100}});
 const poor=await db.user.create({data:{username:`fourview_poor_${token}`,email:`fourview_poor_${token}@example.invalid`,quotaPoints:0}});
 const balance=async()=>Number((await db.user.findUniqueOrThrow({where:{id:owner.id},select:{quotaPoints:true}})).quotaPoints);
 const bytes=await readFile("public/visual-portfolio/reference/home/labelman.webp"),input={idempotencyKey:randomUUID(),acknowledged:true,acceptedPoints:5,aspectRatio:"1:1"};
 await assert.rejects(createFourViewJob(poor.id,input,bytes),coded("INSUFFICIENT_QUOTA"));assert.equal((await listFourViewJobs(poor.id)).length,0);assert.equal(await db.quotaLedger.count({where:{userId:poor.id}}),0);
 const created=await Promise.all([createFourViewJob(owner.id,input,bytes),createFourViewJob(owner.id,input,bytes)]);assert.equal(created[0].id,created[1].id);assert.equal(await balance(),95);
 await assert.rejects(createFourViewJob(owner.id,{...input,aspectRatio:"16:9"},bytes),coded("IDEMPOTENCY_CONFLICT"));
 const claims=await Promise.all([claimFourViewJob(),claimFourViewJob()]);assert.equal(claims.filter(Boolean).length,1);const claim=claims.find(Boolean)!;assert.equal(claim.id,created[0].id);
 const grid=await sharp({create:{width:2880,height:2880,channels:3,background:"purple"}}).png().toBuffer();
 await assert.rejects(completeFourViewJob(claim.id,randomUUID(),grid),coded("LEASE_LOST"));
 const bad=await sharp({create:{width:3840,height:2880,channels:3,background:"gray"}}).png().toBuffer();await assert.rejects(completeFourViewJob(claim.id,claim.leaseToken,bad),coded("GRID_DIMENSIONS_INVALID"));
 // A stopped worker keeps its paid result and lease identity for completion recovery.
 await db.$executeRaw`UPDATE visual_four_view_jobs SET "leaseUntil"=NOW()-interval '1 second' WHERE id=${claim.id}::uuid`;
 assert.equal(await claimFourViewJob(),null);assert.equal((await listFourViewJobs(owner.id))[0].status,"NEEDS_REVIEW");assert.equal(await balance(),95);
 assert.equal((await completeFourViewJob(claim.id,claim.leaseToken,grid)).status,"SUCCEEDED");assert.equal((await completeFourViewJob(claim.id,claim.leaseToken,grid)).status,"SUCCEEDED");assert.equal(await balance(),95);
 const front=await fourViewFile(owner.id,claim.id,"front");assert.deepEqual([...(await sharp(front).raw().toBuffer()).slice(0,3)],[128,0,128]);
 await assert.rejects(fourViewFile(other.id,claim.id,"front"),coded("NOT_FOUND"));assert.deepEqual(await listFourViewJobs(other.id),[]);
 await discardFourViewJob(owner.id,claim.id);await discardFourViewJob(owner.id,claim.id);assert.equal(await balance(),95);await assert.rejects(fourViewFile(owner.id,claim.id,"front"),coded("NOT_FOUND"));
 const cancelled=await createFourViewJob(owner.id,{...input,idempotencyKey:randomUUID()},bytes);assert.equal(await balance(),90);await discardFourViewJob(owner.id,cancelled.id);await discardFourViewJob(owner.id,cancelled.id);assert.equal(await balance(),95);
 const rejected=await createFourViewJob(owner.id,{...input,idempotencyKey:randomUUID()},bytes),r=(await claimFourViewJob())!;assert.equal(r.id,rejected.id);await fourViewEvent(r.id,{type:"notSent",leaseToken:r.leaseToken});assert.equal(await balance(),95);await assert.rejects(fourViewEvent(r.id,{type:"notSent",leaseToken:r.leaseToken}),coded("LEASE_LOST"));assert.equal(await balance(),95);await discardFourViewJob(owner.id,r.id);
 const uncertain=await createFourViewJob(owner.id,{...input,idempotencyKey:randomUUID()},bytes),u=(await claimFourViewJob())!;await fourViewEvent(u.id,{type:"review",leaseToken:u.leaseToken,errorCode:"GRID_DIMENSIONS_INVALID"});assert.equal(await balance(),90);await assert.rejects(discardFourViewJob(owner.id,uncertain.id),coded("TASK_REQUIRES_REVIEW"));assert.equal(await claimFourViewJob(),null);
 assert.equal((await completeFourViewJob(u.id,u.leaseToken,grid)).status,"SUCCEEDED");await discardFourViewJob(owner.id,u.id);
 const marker=`.workbuddy/four-view-integration-assets/disk-fixture-${token}.bin`,storage=process.env.ANS_VISUAL_STORAGE_DIR;await writeFile(marker,"not a directory");
 try{process.env.ANS_VISUAL_STORAGE_DIR=marker;await assert.rejects(createFourViewJob(owner.id,{...input,idempotencyKey:randomUUID()},bytes));}finally{process.env.ANS_VISUAL_STORAGE_DIR=storage;await unlink(marker);}
 const failed=(await listFourViewJobs(owner.id)).find(job=>job.status==="FAILED")!;assert.ok(failed);assert.equal(await balance(),90);await discardFourViewJob(owner.id,failed.id);
 console.log(JSON.stringify({fourViewIntegration:"passed",insufficientNoWrite:true,failedUploadNoDebit:true,concurrentSingleDebit:true,privateIsolation:true,expiredLeaseRecovery:true,singleRefund:true,uncertainNoResubmit:true,finalBalance:await balance()}));
 await db.$disconnect();
}
main().catch(async(e:unknown)=>{console.error(e instanceof Error?e.message:"FOUR_VIEW_INTEGRATION_FAILED");await db.$disconnect();process.exitCode=1;});
