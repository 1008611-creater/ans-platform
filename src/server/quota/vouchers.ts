import { createHash,randomBytes,randomUUID } from "node:crypto";
import { z } from "zod";
import { db,type DbTransaction } from "@/lib/db";
import { hasAdminPermission } from "@/lib/admin-permission-values";
import { marketTransaction } from "@/server/marketplace/shared";
import { QuotaError } from "./service";
export function normalizeVoucher(code:string){return code.trim().toUpperCase().replace(/[\s-]/g,"");}
export function hashVoucher(code:string){return createHash("sha256").update(normalizeVoucher(code)).digest("hex");}
async function admin(tx:DbTransaction,id:string){const u=await tx.user.findUnique({where:{id},select:{role:true,flagged:true,deletedAt:true,adminPermissions:true}});if(!u||u.role!=="ADMIN"||u.flagged||u.deletedAt||!hasAdminPermission(u.adminPermissions,"USERS_MANAGE"))throw new QuotaError("FORBIDDEN","ACCOUNT_UNAVAILABLE",403);}
export async function createVoucherBatch(actorId:string,raw:unknown){
 const input=z.object({name:z.string().trim().min(1).max(100),points:z.number().int().min(1).max(1000000),quantity:z.number().int().min(1).max(1000),expiresAt:z.string().datetime().optional()}).strict().parse(raw);
 const expiresAt=input.expiresAt?new Date(input.expiresAt):null;
 if(expiresAt&&expiresAt<=new Date())throw new QuotaError("INVALID_EXPIRY","ACCOUNT_UNAVAILABLE",400);
 const batchId=randomUUID();const codes=Array.from({length:input.quantity},()=>"ANS-"+randomBytes(20).toString("hex").toUpperCase().match(/.{1,8}/g)!.join("-"));
 await marketTransaction(async tx=>{await admin(tx,actorId);await tx.creditVoucher.createMany({data:codes.map(code=>({batchId,batchName:input.name,codeHash:hashVoucher(code),points:input.points,createdBy:actorId,expiresAt}))});await tx.auditLog.create({data:{actorId,action:"CREDIT_VOUCHERS_CREATED",resourceType:"credit_voucher_batch",resourceId:batchId,metadata:{name:input.name,points:input.points,quantity:input.quantity}}});});
 return {batchId,codes,points:input.points};
}
export async function redeemVoucher(userId:string,code:string){
 const normalized=normalizeVoucher(code);if(!/^ANS[0-9A-F]{40}$/.test(normalized))throw new QuotaError("VOUCHER_INVALID","ACCOUNT_UNAVAILABLE",400);
 return marketTransaction(async tx=>{
 const v=await tx.creditVoucher.findUnique({where:{codeHash:hashVoucher(normalized)}});
 if(!v)throw new QuotaError("VOUCHER_INVALID","ACCOUNT_UNAVAILABLE",400);
 const account=await tx.user.findFirst({where:{id:userId,deletedAt:null,flagged:false},select:{quotaPoints:true}});if(!account)throw new QuotaError("ACCOUNT_UNAVAILABLE","ACCOUNT_UNAVAILABLE",403);
 if(v.redeemedBy){if(v.redeemedBy!==userId)throw new QuotaError("VOUCHER_USED","ACCOUNT_UNAVAILABLE",409);return {points:Number(v.points),balance:account.quotaPoints,duplicate:true};}
 if(v.revokedAt||(v.expiresAt&&v.expiresAt<=new Date()))throw new QuotaError("VOUCHER_INVALID","ACCOUNT_UNAVAILABLE",400);
 const c=await tx.creditVoucher.updateMany({where:{id:v.id,redeemedAt:null,revokedAt:null},data:{redeemedBy:userId,redeemedAt:new Date()}});if(c.count!==1)throw new QuotaError("VOUCHER_USED","ACCOUNT_UNAVAILABLE",409);
 await tx.user.update({where:{id:userId},data:{quotaPoints:{increment:v.points}}});const u=await tx.user.findUniqueOrThrow({where:{id:userId},select:{quotaPoints:true}});
 const op=await tx.quotaOperation.create({data:{operationKey:"voucher:"+v.id,requestHash:v.codeHash,userId,actorId:userId,kind:"TOP_UP",amount:v.points,balanceAfter:u.quotaPoints,evidenceRef:"voucher:"+v.id,note:"Voucher redemption"}});
 await tx.quotaLedger.create({data:{userId,amount:v.points,balanceAfter:u.quotaPoints,reason:"RECHARGE",refType:"recharge",refId:op.id,note:"Voucher redemption"}});
 return {points:Number(v.points),balance:u.quotaPoints,duplicate:false};
 });
}
export async function listVoucherBatches(){
 const rows=await db.creditVoucher.groupBy({by:["batchId"],_count:{id:true},_min:{createdAt:true},orderBy:{_min:{createdAt:"desc"}},take:100});
 return Promise.all(rows.map(async r=>{const [v,redeemed,revoked]=await Promise.all([db.creditVoucher.findFirstOrThrow({where:{batchId:r.batchId}}),db.creditVoucher.count({where:{batchId:r.batchId,redeemedAt:{not:null}}}),db.creditVoucher.findFirst({where:{batchId:r.batchId,revokedAt:{not:null}},select:{revokedAt:true}})]);return {id:r.batchId,name:v.batchName,points:Number(v.points),quantity:r._count.id,redeemed,expiresAt:v.expiresAt,revokedAt:revoked?.revokedAt??null};}));
}
export async function revokeVoucherBatch(actorId:string,batchId:string){return marketTransaction(async tx=>{await admin(tx,actorId);const r=await tx.creditVoucher.updateMany({where:{batchId,redeemedAt:null},data:{revokedAt:new Date()}});await tx.auditLog.create({data:{actorId,action:"CREDIT_VOUCHERS_REVOKED",resourceType:"credit_voucher_batch",resourceId:batchId}});return {count:r.count};});}
