import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { createVoucherBatch,redeemVoucher,revokeVoucherBatch,listVoucherBatches,hashVoucher } from "../src/server/quota/vouchers";
async function main(){
 const url=new URL(process.env.DATABASE_URL!);
 assert.equal(url.hostname,"127.0.0.1");assert.equal(url.port,"55439");assert.equal(url.pathname,"/ans_voucher_verify");
 const tag=randomUUID();
 const make=(name:string,role:"ADMIN"|"USER"="USER")=>db.user.create({data:{email:`${name}-${tag}@example.test`,username:`${name}-${tag}`,role,quotaPoints:0}});
 const [admin,a,b]=await Promise.all([make("admin","ADMIN"),make("a"),make("b")]);
 const batch=await createVoucherBatch(admin.id,{name:"isolated verification",points:10,quantity:4});
 assert.equal(new Set(batch.codes).size,4);
 const stored=await db.creditVoucher.findMany({where:{batchId:batch.batchId}});
 assert.equal(stored.length,4);assert(stored.every(v=>v.codeHash.length===64&&!batch.codes.includes(v.codeHash)));
 const race=await Promise.allSettled([redeemVoucher(a.id,batch.codes[0]),redeemVoucher(b.id,batch.codes[0])]);
 assert.equal(race.filter(r=>r.status==="fulfilled").length,1);
 const winner=race[0].status==="fulfilled"?a:b;
 assert.equal((await redeemVoucher(winner.id,batch.codes[0])).duplicate,true);
 const users=await db.user.findMany({where:{id:{in:[a.id,b.id]}}});assert.equal(users.reduce((n,u)=>n+u.quotaPoints,0),10);
 assert.equal(await db.quotaOperation.count({where:{operationKey:"voucher:"+stored.find(v=>v.codeHash===hashVoucher(batch.codes[0]))!.id}}),1);
 // Force the accounting write to fail after the claim/balance write; all earlier writes must roll back.
 const blocked=stored.find(v=>v.codeHash===hashVoucher(batch.codes[1]))!;
 await db.quotaOperation.create({data:{operationKey:"voucher:"+blocked.id,requestHash:blocked.codeHash,userId:a.id,actorId:admin.id,kind:"ADJUST",amount:0,balanceAfter:0,note:"isolated rollback fault"}});
 const before=(await db.user.findUniqueOrThrow({where:{id:a.id}})).quotaPoints;
 await assert.rejects(()=>redeemVoucher(a.id,batch.codes[1]));
 assert.equal((await db.user.findUniqueOrThrow({where:{id:a.id}})).quotaPoints,before);
 assert.equal((await db.creditVoucher.findUniqueOrThrow({where:{id:blocked.id}})).redeemedAt,null);
 await db.creditVoucher.update({where:{codeHash:hashVoucher(batch.codes[2])},data:{expiresAt:new Date(0)}});
 await assert.rejects(()=>redeemVoucher(a.id,batch.codes[2]),/VOUCHER_INVALID/);
 await assert.rejects(()=>revokeVoucherBatch(a.id,batch.batchId),/FORBIDDEN/);
 await revokeVoucherBatch(admin.id,batch.batchId);
 await assert.rejects(()=>redeemVoucher(a.id,batch.codes[3]),/VOUCHER_INVALID/);
 const summary=(await listVoucherBatches()).filter(x=>x.id===batch.batchId);
 assert.equal(summary.length,1);assert.equal(summary[0].redeemed,1);assert(summary[0].revokedAt);
 assert.equal(await db.quotaLedger.count({where:{userId:{in:[a.id,b.id]}}}),1);
 console.log(JSON.stringify({passed:true,isolatedDatabase:true,concurrentClaim:true,singleLedgerPosting:true,retryIdempotency:true,rollbackAfterAccountingFailure:true,expiry:true,adminOnlyRevocation:true,batchSummary:true,realPayments:0}));
}
main().catch(()=>{console.error("Voucher integration verification failed");process.exitCode=1;}).finally(()=>db.$disconnect());
