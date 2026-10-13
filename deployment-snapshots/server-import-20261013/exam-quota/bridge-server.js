"use strict";
const http=require("node:http"),https=require("node:https"),fs=require("node:fs");
const {PrismaClient}=require("/app/node_modules/@prisma/client");
const key=String(process.env.EXAM_ANALYSIS_QUOTA_KEY||"");
const allowedRemotes=String(process.env.ALLOWED_REMOTE_IP||"").split(",").map(s=>s.trim()).filter(Boolean);
const tlsCert=String(process.env.EXAM_ANALYSIS_QUOTA_TLS_CERT||"");
const tlsKey=String(process.env.EXAM_ANALYSIS_QUOTA_TLS_KEY||"");
if(key.length<40||allowedRemotes.length===0) throw new Error("quota bridge configuration missing");
if(Boolean(tlsCert)!==Boolean(tlsKey)) throw new Error("quota bridge TLS configuration missing");
const db=new PrismaClient();
const REF_TYPE="exam-analysis";
const {createHash}=require("node:crypto");
async function lockAccount(tx,id){await tx.$queryRaw`SELECT id FROM users WHERE id=${id} FOR UPDATE`;}
function settlementKey(input){return "exam-settle:"+createHash("sha256").update(JSON.stringify([input.subject,input.refId])).digest("hex");}
function send(res,status,data){const body=Buffer.from(JSON.stringify(data));res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","content-length":body.length});res.end(body);}
function fail(code,message,status){const e=new Error(message);e.code=code;e.status=status;return e;}
function validate(input){if(!input||typeof input.subject!=="string"||!input.subject||input.subject.length>256||/[\u0000-\u001f\u007f]/.test(input.subject))throw fail("INVALID","ANS账号身份无效",400);if(typeof input.refId!=="string"||!/^[A-Za-z0-9:_-]{1,128}$/.test(input.refId))throw fail("INVALID","积分幂等编号无效",400);if(!Number.isSafeInteger(input.costPoints)||input.costPoints<1||input.costPoints>100)throw fail("INVALID","积分消耗无效",400);}
async function balance(tx,id){const u=await tx.user.findUnique({where:{id},select:{quotaPoints:true}});return Number(u?.quotaPoints??0);}
async function reserve(input){validate(input);return db.$transaction(async tx=>{await lockAccount(tx,input.subject);const old=await tx.quotaLedger.findFirst({where:{userId:input.subject,reason:"RUN_COST",refType:REF_TYPE,refId:input.refId},select:{amount:true,balanceAfter:true}});if(old){if(Number(old.amount)!==-input.costPoints)throw fail("CONFLICT","同一任务的积分消耗不一致",409);return {ok:true,duplicate:true,balance:Number(old.balanceAfter??await balance(tx,input.subject))};}const user=await tx.user.findUnique({where:{id:input.subject},select:{id:true,quotaPoints:true,flagged:true,deletedAt:true}});if(!user||user.deletedAt)throw fail("ACCOUNT_UNAVAILABLE","ANS账号不可用",401);if(user.flagged)throw fail("ACCOUNT_UNAVAILABLE","ANS账号当前受限",403);const updated=await tx.user.updateMany({where:{id:input.subject,quotaPoints:{gte:input.costPoints},flagged:false,deletedAt:null},data:{quotaPoints:{decrement:input.costPoints}}});if(updated.count!==1)throw fail("INSUFFICIENT_QUOTA",`ANS积分不足，本次需要${input.costPoints}点`,402);const after=await balance(tx,input.subject);await tx.quotaLedger.create({data:{userId:input.subject,amount:-input.costPoints,balanceAfter:after,reason:"RUN_COST",refType:REF_TYPE,refId:input.refId,note:"考公错题分析调用"}});return {ok:true,duplicate:false,balance:after};});}
async function settle(input){
 validate(input);
 if(typeof input.success!=="boolean")throw fail("INVALID","success must be boolean",400);
 return db.$transaction(async tx=>{
  await lockAccount(tx,input.subject);
  const debit=await tx.quotaLedger.findFirst({where:{userId:input.subject,reason:"RUN_COST",refType:REF_TYPE,refId:input.refId},select:{amount:true}});
  if(!debit)throw fail("NOT_FOUND","missing debit",404);
  if(Number(debit.amount)!==-input.costPoints)throw fail("CONFLICT","cost mismatch",409);
  const operationKey=settlementKey(input);
  const requestHash=createHash("sha256").update(JSON.stringify([input.costPoints,input.success])).digest("hex");
  const previous=await tx.auditLog.findFirst({where:{actorId:input.subject,action:"EXAM_ANALYSIS_SETTLED",resourceType:REF_TYPE,resourceId:operationKey}});
  if(previous){if(previous.metadata.requestHash!==requestHash)throw fail("CONFLICT","settlement already finalized",409);return {ok:true,duplicate:true,refunded:!input.success,balance:await balance(tx,input.subject)};}
  const refund=await tx.quotaLedger.findFirst({where:{userId:input.subject,reason:"REFUND",refType:REF_TYPE,refId:input.refId}});
  if(refund&&input.success)throw fail("CONFLICT","task already refunded",409);
  if(!input.success&&!refund){
   const user=await tx.user.update({where:{id:input.subject},data:{quotaPoints:{increment:input.costPoints}},select:{quotaPoints:true}});
   await tx.quotaLedger.create({data:{userId:input.subject,amount:input.costPoints,balanceAfter:user.quotaPoints,reason:"REFUND",refType:REF_TYPE,refId:input.refId,note:"Exam analysis failure refund"}});
  }
  const after=await balance(tx,input.subject);
  await tx.auditLog.create({data:{actorId:input.subject,action:"EXAM_ANALYSIS_SETTLED",resourceType:REF_TYPE,resourceId:operationKey,metadata:{requestHash,costPoints:input.costPoints,success:input.success,refId:input.refId}}});
  return {ok:true,duplicate:!!refund,refunded:!input.success,balance:after};
 });
}
function read(req){return new Promise((resolve,reject)=>{let n=0,parts=[];req.on("data",b=>{n+=b.length;if(n>65536)reject(fail("INVALID","请求过大",413));else parts.push(b);});req.on("end",()=>{try{resolve(JSON.parse(Buffer.concat(parts).toString("utf8")));}catch{reject(fail("INVALID","请求格式不正确",400));}});req.on("error",()=>reject(fail("INVALID","请求读取失败",400)));});}
const handler=async(req,res)=>{if(req.method==="GET"&&req.url==="/health"&&["127.0.0.1","::1","::ffff:127.0.0.1"].includes(req.socket.remoteAddress)){try{await db.$queryRaw`SELECT 1`;return send(res,200,{status:"healthy"});}catch{return send(res,503,{status:"unavailable"});}}if(allowedRemotes.length&& !allowedRemotes.some(ip=>req.socket.remoteAddress===ip||req.socket.remoteAddress==="::ffff:"+ip))return send(res,404,{error:"not_found"});if(req.method!=="POST"||req.url!=="/quota")return send(res,404,{error:"not_found"});if(req.headers.authorization!=="Bearer "+key)return send(res,404,{error:"not_found"});try{const b=await read(req);if(b.operation!=="reserve"&&b.operation!=="settle")throw fail("INVALID","积分操作无效",400);const result=b.operation==="reserve"?await reserve(b):await settle(b);return send(res,200,result);}catch(e){if(e.code)return send(res,e.status||503,{error:String(e.code).toLowerCase(),message:e.message});return send(res,503,{error:"server_error",message:"积分结算暂时不可用"});}};
const server=tlsCert?https.createServer({cert:fs.readFileSync(tlsCert),key:fs.readFileSync(tlsKey)},handler):http.createServer(handler);
server.requestTimeout=15000;server.headersTimeout=10000;server.listen(Number(process.env.EXAM_ANALYSIS_QUOTA_PORT||8160),"0.0.0.0");
const healthServer=http.createServer(async(req,res)=>{
 if(req.method!=="GET"||req.url!=="/api/health")return send(res,404,{error:"not_found"});
 try{await db.$queryRaw`SELECT 1`;return send(res,200,{status:"healthy"});}catch{return send(res,503,{status:"unavailable"});}
});
healthServer.listen(3000,"127.0.0.1");
process.once("SIGTERM",async()=>{healthServer.close();await db.$disconnect();server.close(()=>process.exit(0));});

