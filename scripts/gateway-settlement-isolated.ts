import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
const expected="postgresql://isolated:isolated@127.0.0.1:65439/ans_gateway_main_fix";
if(process.env.DATABASE_URL!==expected || process.env.DIRECT_URL!==expected)throw new Error("Exact isolated database URL required");
process.env.ANS_APIC_BILLING_ENABLED="1";process.env.ANS_UNIFIED_POINTS_ENABLED="1";
process.env.RUN_BASE_URL="https://apic.cauai.fun/v1";process.env.RUN_API_KEY="isolated-no-live-provider-key";
process.env.APIC_COST_BRIDGE_URL="http://gateway-cost.fixture.invalid";process.env.APIC_COST_BRIDGE_SECRET="isolated-no-live-bridge-key";
async function suite(){
 const {db}=await import("../src/lib/db");const {Prisma}=await import("@prisma/client");
 const gatewayModule=process.env.GATEWAY_REPRO==="1"?"../.gateway-validation/original-main-gateway":"../src/server/integrations/codex-gateway";
 const {meteredResponses,reconcileCodexCharges,validateCodexPayload}=await import(gatewayModule);
 const {waiveUncertainRequest}=await import("../src/server/quota/review");
 const {recordGatewayEvidence}=await import("../src/server/integrations/gateway-evidence");
 const results:{name:string;status:"PASS"|"FAIL";error?:string}[]=[];const uid=()=>randomUUID();
 const receipts=new Map<string,{quota:number;wrong?:boolean}>();let calls=0,bridgeCalls=0;
 let behavior:{kind?:"reject"|"network"|"server"|"missing"|"stream";quota?:number;wrong?:boolean;requestId?:string;beforeReply?:()=>Promise<void>}={};
 const delay=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
 globalThis.fetch=async(input,init)=>{
  const url=typeof input==="string"?input:input instanceof URL?input.href:input.url;
  if(url==="https://apic.cauai.fun/v1/responses"){
   calls++;const b={...behavior};assert.equal((init?.headers as Record<string,string>).Authorization,"Bearer isolated-no-live-provider-key");
   await b.beforeReply?.();if(b.kind==="network")throw new Error("ISOLATED_UNKNOWN_NETWORK");
   const rid=b.requestId??("fixture_"+uid().replaceAll("-",""));receipts.set(rid,{quota:b.quota??10000,wrong:b.wrong});
   const headers:Record<string,string>=b.kind==="missing"?{}:{"x-oneapi-request-id":rid};
   if(b.kind==="reject"||b.kind==="server")return Response.json({error:"fixture"},{status:b.kind==="reject"?429:500,headers});
   if(b.kind==="stream")return new Response(new ReadableStream<Uint8Array>({async start(c){c.enqueue(new TextEncoder().encode("data: first\n\n"));await delay(100);c.enqueue(new TextEncoder().encode("data: done\n\n"));c.close();}}),{headers});
   return Response.json({status:"completed",output:[]},{headers});
  }
  if(url.startsWith("http://gateway-cost.fixture.invalid/cost/")){
   bridgeCalls++;assert.equal((init?.headers as Record<string,string>).Authorization,"Bearer isolated-no-live-bridge-key");
   const rid=url.split("/").pop()!,r=receipts.get(rid);if(!r)return Response.json({}, {status:404});
   return Response.json({requestId:r.wrong?"incorrect_receipt":rid,quota:r.quota});
  }
  throw new Error("All nonfixture network rejected");
 };
 const payload={model:"gpt-6.1-sol",input:"Isolated main gateway settlement",max_output_tokens:64};const reserve=validateCodexPayload(payload).reserve;
 const req=(key=uid(),body:unknown=payload,signal?:AbortSignal)=>new Request("http://ans.internal/responses",{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":key},body:JSON.stringify(body),signal});
 async function user(points=10){const u=await db.user.create({data:{username:uid(),email:uid()+"@example.invalid",quotaPoints:new Prisma.Decimal(points)}});await db.quotaLedger.create({data:{userId:u.id,amount:points,reason:"GRANT"}});return u.id;}
 const task=(owner:string)=>db.apiComputeRequest.findFirstOrThrow({where:{userId:owner},orderBy:{createdAt:"desc"}});
 const balance=async(owner:string)=>Number((await db.user.findUniqueOrThrow({where:{id:owner},select:{quotaPoints:true}})).quotaPoints);
 const evidence=async(id:string)=>db.$queryRaw<{kind:string;upstreamPoints:string;billedPoints:string;platformCoveredPoints:string;rejectedUpstreamStatus:number}[]>`SELECT kind,"upstreamPoints"::text,"billedPoints"::text,"platformCoveredPoints"::text,"rejectedUpstreamStatus" FROM api_compute_billing_evidence WHERE "requestId"=${id}`;
 async function check(name:string,fn:()=>Promise<void>){behavior={};try{await fn();results.push({name,status:"PASS"});}catch(e){results.push({name,status:"FAIL",error:e instanceof Error?e.message:String(e)});}}
 async function waitFinal(owner:string){for(let i=0;i<80;i++){const r=await task(owner);if(r.state==="SETTLED"||r.state==="RELEASED")return r;await delay(25);}throw new Error("Drain not settled");}
 try{
  const admin=await user(0);await db.user.update({where:{id:admin},data:{role:"ADMIN",adminPermissions:["USERS_MANAGE"]}});
  if(process.env.GATEWAY_REPRO==="1"){
   await check("original main successful receipt yields 502 and UNCERTAIN due immutable price",async()=>{const u=await user();const r=await meteredResponses(req(),u);assert.equal(r.status,502);assert.equal((await task(u)).state,"UNCERTAIN");assert.equal(await balance(u),10-reserve);});
   await check("original main explicit rejection throws immutable price guard",async()=>{const u=await user();behavior={kind:"reject"};await assert.rejects(()=>meteredResponses(req(),u),/API_COMPUTE_QUOTE_IMMUTABLE/);assert.equal((await task(u)).state,"RUNNING");assert.equal(await balance(u),10-reserve);});
  }else{
   await check("exact original 78 checksums and final SQL constraints preserved; no batch wallet tables",async()=>{
    const expected=JSON.parse(readFileSync(".gateway-validation/baseline-migrations-manifest.json","utf8"));
    const rows=await db.$queryRaw<{migration_name:string;checksum:string}[]>`SELECT migration_name,checksum FROM _prisma_migrations WHERE finished_at IS NOT NULL`;
    assert.equal(rows.length,78);for(const r of rows)assert.equal(r.checksum,expected.checksums[`prisma/migrations/${r.migration_name}/migration.sql`]);
    const [c]=await db.$queryRaw<{def:string}[]>`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname='api_compute_request_state_valid'`;assert.match(c.def,/<= \(10\)/);
    const [b]=await db.$queryRaw<{n:number}[]>`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name='credit_batches'`;assert.equal(b.n,0);
   });
   await check("normal verified receipt settles once; immutable original quote and net fee",async()=>{const u=await user(),key=uid();assert.equal((await meteredResponses(req(key),u)).status,200);const t=await task(u);assert.equal(t.state,"SETTLED");assert.equal(Number(t.settledPoints),.02);assert.equal(await balance(u),9.98);assert.equal((t.price as Record<string,unknown>).verifiedUpstreamPoints,undefined);assert.equal((await evidence(t.id)).length,1);const n=calls;assert.equal((await meteredResponses(req(key),u)).status,409);assert.equal(calls,n);});
   await check("supplier excess recorded and platform covered; no debit beyond authorized budget",async()=>{const u=await user();behavior={quota:1000000};assert.equal((await meteredResponses(req(),u)).status,200);const t=await task(u),[e]=await evidence(t.id);assert.equal(Number(t.settledPoints),reserve);assert.equal(await balance(u),10-reserve);assert.equal(Number(e.upstreamPoints),2);assert.equal(Number(e.billedPoints),reserve);assert.equal(Number(e.platformCoveredPoints),Number((2-reserve).toFixed(6)));});
   await check("member cap and authorized reserve both bound cost; fixed quote retained",async()=>{const u=await user();behavior={quota:1000000};assert.equal((await meteredResponses(req(),u,undefined,{memberPointsCap:reserve+.1})).status,200);const t=await task(u);assert.equal(Number(t.settledPoints),reserve);assert.equal(Number((t.price as Record<string,unknown>).memberPointsCap).toFixed(6),(reserve+.1).toFixed(6));});
   await check("verified zero cost releases original reserve with real zero receipt",async()=>{const u=await user();behavior={quota:0};assert.equal((await meteredResponses(req(),u)).status,200);const t=await task(u);assert.equal(await balance(u),10);assert.equal(t.state,"SETTLED");assert.equal(Number((await evidence(t.id))[0].upstreamPoints),0);});
   await check("explicit 429 releases with nonexecution evidence; concurrent retry runs once",async()=>{const u=await user(),key=uid();behavior={kind:"reject"};assert.equal((await meteredResponses(req(key),u)).status,429);const old=await task(u);assert.equal(old.state,"RELEASED");assert.equal(await balance(u),10);assert.equal((old.price as Record<string,unknown>).rejectedUpstreamStatus,undefined);assert.equal((await evidence(old.id))[0].rejectedUpstreamStatus,429);behavior={beforeReply:()=>delay(80)};const n=calls;const responses=await Promise.all([meteredResponses(req(key),u),meteredResponses(req(key),u)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal(calls-n,1);assert.equal(await db.apiComputeRequest.count({where:{userId:u}}),2);assert.equal(await balance(u),9.98);});
   await check("network unknown preserves reservation; retry and bad hash do not call provider",async()=>{const u=await user(),key=uid();behavior={kind:"network"};assert.equal((await meteredResponses(req(key),u)).status,502);assert.equal((await task(u)).state,"UNCERTAIN");const n=calls;assert.equal((await meteredResponses(req(key),u)).status,409);assert.equal((await meteredResponses(req(key,{...payload,input:"different"}),u)).status,409);assert.equal(calls,n);assert.equal(await balance(u),10-reserve);});
   await check("5xx, missing receipt and wrong receipt stay uncertain without fake zero evidence",async()=>{for(const b of [{kind:"server" as const},{kind:"missing" as const},{wrong:true}]){const u=await user();behavior=b;assert.equal((await meteredResponses(req(),u)).status,b.kind==="server"?500:502);const t=await task(u);assert.equal(t.state,"UNCERTAIN");assert.equal((await evidence(t.id)).length,0);assert.equal(await balance(u),10-reserve);}});
   await check("concurrent trusted late reconciliation applies one refund and one evidence",async()=>{const u=await user();behavior={wrong:true};assert.equal((await meteredResponses(req(),u)).status,502);const t=await task(u);receipts.get(t.outcome!)!.wrong=false;await Promise.all([reconcileCodexCharges(u),reconcileCodexCharges(u),reconcileCodexCharges(u)]);assert.equal((await task(u)).state,"SETTLED");assert.equal(await balance(u),9.98);assert.equal((await evidence(t.id)).length,1);assert.equal(await db.quotaLedger.count({where:{userId:u,reason:"REFUND"}}),1);});
   await check("operator waiver is authorized/idempotent and never grants retry permission",async()=>{const u=await user(),key=uid();behavior={kind:"network"};await meteredResponses(req(key),u);const t=await task(u);await assert.rejects(()=>waiveUncertainRequest(u,t.id,"unauthorized"),/FORBIDDEN/);assert.equal((await waiveUncertainRequest(admin,t.id,"isolated waiver")).duplicate,false);assert.equal((await waiveUncertainRequest(admin,t.id,"same")).duplicate,true);assert.equal(await balance(u),10);assert.equal((await evidence(t.id))[0].kind,"WAIVER");const n=calls;assert.equal((await meteredResponses(req(key),u)).status,409);assert.equal(calls,n);});
   await check("explicit waiver evidence blocks legacy RELEASED receipt collision retry",async()=>{const u=await user(),key=uid();behavior={wrong:true,requestId:"RELEASED"};assert.equal((await meteredResponses(req(key),u)).status,502);const t=await task(u);assert.equal(t.outcome,"RELEASED");await waiveUncertainRequest(admin,t.id,"collision waiver");const n=calls;assert.equal((await meteredResponses(req(key),u)).status,409);assert.equal(calls,n);assert.equal(await balance(u),10);});
   await check("waiver versus receipt concurrency chooses a single durable terminal outcome",async()=>{const u=await user();behavior={wrong:true};await meteredResponses(req(),u);const t=await task(u);receipts.get(t.outcome!)!.wrong=false;await Promise.allSettled([waiveUncertainRequest(admin,t.id,"race waiver"),reconcileCodexCharges(u)]);const done=await task(u);assert.ok(["RELEASED","SETTLED"].includes(done.state));assert.equal((await evidence(done.id)).length,1);assert.equal(await balance(u),done.state==="RELEASED"?10:9.98);});
   await check("stream disconnect drains submitted upstream and settles exactly once",async()=>{const u=await user();behavior={kind:"stream"};const r=await meteredResponses(req(uid(),{...payload,stream:true}),u);const reader=r.body!.getReader();await reader.read();await reader.cancel();assert.equal((await waitFinal(u)).state,"SETTLED");assert.equal(await balance(u),9.98);assert.equal((await evidence((await task(u)).id)).length,1);});
   await check("blocked or deleted account rejects new spend but existing trusted liability can finish",async()=>{for(const flag of [{flagged:true},{deletedAt:new Date()}]){const u=await user();behavior={wrong:true};await meteredResponses(req(),u);const t=await task(u);await db.user.update({where:{id:u},data:flag});const n=calls;assert.equal((await meteredResponses(req(),u)).status,403);assert.equal(calls,n);receipts.get(t.outcome!)!.wrong=false;await reconcileCodexCharges(u);assert.equal((await task(u)).state,"SETTLED");assert.equal(await balance(u),9.98);}});
   await check("pre-submit cancellation and insufficient credit cause no request/provider mutation",async()=>{const u=await user(),abort=new AbortController();abort.abort();const n=calls;assert.equal((await meteredResponses(req(uid(),payload,abort.signal),u)).status,409);const poor=await user(0);assert.equal((await meteredResponses(req(),poor)).status,402);assert.equal(calls,n);assert.equal(await db.apiComputeRequest.count({where:{userId:{in:[u,poor]}}}),0);});
   await check("parent workflow totals reflect child settlement/recovery/waiver without a second debit",async()=>{
    const u=await user();const w=await db.workflow.create({data:{slug:uid(),title:"Isolated fixture",authorId:u}});const v=await db.workflowVersion.create({data:{workflowId:w.id,version:1,definition:{fixture:true},createdById:u}});const parent=await db.workflowRun.create({data:{workflowId:w.id,versionId:v.id,userId:u,input:{},status:"SUCCEEDED",finishedAt:new Date()}});const ref={type:"workflow_run" as const,id:parent.id};
    assert.equal((await meteredResponses(req(),u,ref)).status,200);assert.equal(Number((await db.workflowRun.findUniqueOrThrow({where:{id:parent.id}})).costPoints),.02);assert.equal(await balance(u),9.98);
    behavior={wrong:true};await meteredResponses(req(),u,ref);const t=await task(u);receipts.get(t.outcome!)!.wrong=false;await reconcileCodexCharges(u);assert.equal(Number((await db.workflowRun.findUniqueOrThrow({where:{id:parent.id}})).costPoints),.04);assert.equal(await balance(u),9.96);
    behavior={kind:"network"};await meteredResponses(req(),u,ref);const uncertain=await task(u);await waiveUncertainRequest(admin,uncertain.id,"parent waiver");assert.equal(Number((await db.workflowRun.findUniqueOrThrow({where:{id:parent.id}})).costPoints),.04);assert.equal(await balance(u),9.96);
   });
   await check("SQL failure after evidence insert rolls back evidence/refund/state; late recovery succeeds",async()=>{
    const u=await user();await db.$executeRawUnsafe(`CREATE FUNCTION isolated_gateway_final_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.state='SETTLED' THEN RAISE EXCEPTION 'ISOLATED_FINAL_FAULT'; END IF; RETURN NEW; END $$`);await db.$executeRawUnsafe(`CREATE TRIGGER isolated_gateway_fault BEFORE UPDATE ON api_compute_requests FOR EACH ROW EXECUTE FUNCTION isolated_gateway_final_fault()`);
    try{assert.equal((await meteredResponses(req(),u)).status,502);const t=await task(u);assert.equal(t.state,"UNCERTAIN");assert.equal((await evidence(t.id)).length,0);assert.equal(await balance(u),10-reserve);}finally{await db.$executeRawUnsafe(`DROP TRIGGER isolated_gateway_fault ON api_compute_requests`);await db.$executeRawUnsafe(`DROP FUNCTION isolated_gateway_final_fault()`);}
    await reconcileCodexCharges(u);assert.equal((await task(u)).state,"SETTLED");assert.equal(await balance(u),9.98);
   });
   await check("evidence SQL rejects null receipt, wrong owner/policy, excessive debit and mutation",async()=>{
    const u=await user();behavior={wrong:true};await meteredResponses(req(),u);const t=await task(u);
    const command={kind:"VERIFIED" as const,charge:{requestId:t.outcome!,quota:10000,points:.02},billedPoints:.02};
    await assert.rejects(()=>db.$transaction(tx=>recordGatewayEvidence(tx,u,t.id,{...command,charge:{...command.charge,requestId:"!"}})),/api_compute_billing_evidence_valid/);
    await assert.rejects(()=>db.$executeRaw`INSERT INTO api_compute_billing_evidence(id,"requestId","ownerId",kind,"upstreamRequestId","upstreamQuota","upstreamPoints","billedPoints","platformCoveredPoints","policyVersion") VALUES(${uid()},${t.id},${admin},'VERIFIED',${t.outcome},10000,0.02,0.02,0,${t.policyVersion})`,/API_BILLING_EVIDENCE_REFERENCE_INVALID/);
    await assert.rejects(()=>db.$executeRaw`INSERT INTO api_compute_billing_evidence(id,"requestId","ownerId",kind,"upstreamRequestId","upstreamQuota","upstreamPoints","billedPoints","platformCoveredPoints","policyVersion") VALUES(${uid()},${t.id},${u},'VERIFIED',${t.outcome},10000,0.02,0.02,0,'wrong')`,/API_BILLING_EVIDENCE_REFERENCE_INVALID/);
    await assert.rejects(()=>db.$transaction(tx=>recordGatewayEvidence(tx,u,t.id,{...command,charge:{...command.charge,quota:1000000,points:2},billedPoints:1})),/API_BILLING_EVIDENCE_REFERENCE_INVALID/);
    receipts.get(t.outcome!)!.wrong=false;await reconcileCodexCharges(u);
    await assert.rejects(()=>db.$executeRaw`UPDATE api_compute_billing_evidence SET "ownerId"=${admin} WHERE "requestId"=${t.id}`,/API_BILLING_EVIDENCE_IMMUTABLE/);
    await assert.rejects(()=>db.$executeRaw`DELETE FROM api_compute_billing_evidence WHERE "requestId"=${t.id}`,/API_BILLING_EVIDENCE_IMMUTABLE/);
    await assert.rejects(()=>db.apiComputeRequest.update({where:{id:t.id},data:{price:{tampered:true}}}),/API_COMPUTE_QUOTE_IMMUTABLE/);
   });
   await check("deferred pair guard rejects orphan evidence and receipt/amount/state mismatches",async()=>{
    const u=await user();behavior={wrong:true};await meteredResponses(req(),u);const t=await task(u);
    const cmd={kind:"VERIFIED" as const,charge:{requestId:t.outcome!,quota:10000,points:.02},billedPoints:.02};
    await assert.rejects(()=>db.$transaction(tx=>recordGatewayEvidence(tx,u,t.id,cmd)),/API_BILLING_TERMINAL_PAIR_INVALID/);
    for(const change of [{state:"SETTLED" as const,settledPoints:.01,outcome:t.outcome},{state:"SETTLED" as const,settledPoints:.02,outcome:"wrong_receipt_pair"},{state:"RELEASED" as const,settledPoints:0,outcome:t.outcome}]){
     await assert.rejects(()=>db.$transaction(async tx=>{await recordGatewayEvidence(tx,u,t.id,cmd);await tx.apiComputeRequest.update({where:{id:t.id},data:{...change,finishedAt:new Date()}});}),/API_BILLING_TERMINAL_PAIR_INVALID/);
    }
    await assert.rejects(()=>db.$transaction(tx=>recordGatewayEvidence(tx,u,t.id,{kind:"WAIVER",actorId:u})),/API_BILLING_WAIVER_ACTOR_INVALID/);
    assert.equal((await task(u)).state,"UNCERTAIN");assert.equal((await evidence(t.id)).length,0);assert.equal(await balance(u),10-reserve);
   });
   await check("all fixture balances equal ledger totals; max one final evidence and bounded settlement",async()=>{
    const [bad]=await db.$queryRaw<{n:number}[]>`SELECT count(*)::int AS n FROM users u WHERE u."quotaPoints"<>(SELECT coalesce(sum(amount),0) FROM quota_ledgers q WHERE q."userId"=u.id)`;assert.equal(bad.n,0);
    const [cost]=await db.$queryRaw<{n:number}[]>`SELECT count(*)::int AS n FROM api_compute_requests WHERE state='SETTLED' AND "settledPoints">"authorizedPoints"`;assert.equal(cost.n,0);
   });
  }
 }finally{await db.$disconnect();}
 const output={baseline:"29d9f7a8679cc555690ce7470bea92d56e3e9fd2",database:"ans_gateway_main_fix",endpoint:"127.0.0.1:65439",originalReproduction:process.env.GATEWAY_REPRO==="1",productionWrites:0,liveProviderCalls:0,fixtureProviderCalls:calls,fixtureBridgeCalls:bridgeCalls,results};
 writeFileSync(process.env.GATEWAY_REPRO==="1"?".gateway-validation/original-main-reproduction.json":".gateway-validation/main-postgres-results.json",JSON.stringify(output,null,2));
 console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.status==="PASS").length,failed:results.filter(r=>r.status==="FAIL")},null,2));if(results.some(r=>r.status==="FAIL"))process.exitCode=1;
}
suite().catch(e=>{console.error(e);process.exitCode=1;});
