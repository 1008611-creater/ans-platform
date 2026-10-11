import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {mkdir,writeFile,readFile} from "node:fs/promises";
import type {AgriRulesDraft} from "../src/contracts/agri-workspace";
for(const value of [process.env.DATABASE_URL,process.env.DIRECT_URL]){const url=new URL(value??"http://invalid");if(url.hostname!=="127.0.0.1"||url.port!=="55438"||url.pathname!=="/ans_product_verify_agri_demo_r3")throw new Error("Refusing non-isolated review writes");}
async function main(){
 const {db}=await import("../src/lib/db");
 const {executeAgriWorkspaceCommand:rules,readAgriWorkspaceRules:getRules}=await import("../src/server/competitions/agrihackathon/workspace");
 const {prepareAgriStage:prepare,executeAgriSubmissionCommand:submit}=await import("../src/server/competitions/agrihackathon/submissions");
 const {executeAgriDemoCommand:run,readAgriDemoChecks:get}=await import("../src/server/competitions/agrihackathon/demo");
 const dir=".workbuddy/evidence/agri-demo",checks:Array<{label:string;passed:boolean}>=[];let current="prepare";
 const report={isolatedPostgres:true,productionWrites:false,providerCalls:0,realFunds:false,passed:false,checks};
 const check=async(label:string,work:()=>Promise<void>)=>{current=label;await work();checks.push({label,passed:true});};
 try{
  if(process.argv.includes("--persistence")){
   const fixture=JSON.parse(await readFile(dir+"/persistence-fixture.json","utf8")) as {actorId:string;competitionId:string;submissionId:string;checkId:string};process.env.ANS_AGRIHACKATHON_COMPETITION_ID=fixture.competitionId;
   await check("fresh Node reads exact immutable Demo chain and withdrawn feedback",async()=>{const view=await get(fixture.actorId,fixture.submissionId,{scope:"staff"});assert.equal(view.checks.length,30);assert.ok(view.nextCursor);const page=await get(fixture.actorId,fixture.submissionId,{scope:"staff",cursor:view.nextCursor});const row=page.checks.find(item=>item.id===fixture.checkId);assert.ok(row);assert.equal(row.feedback,null);assert.equal(row.feedbackSequence,2);assert.equal(row.demo?.description,"PRIVATE_DEMO_DETAILS");});report.passed=true;return;
  }
  const prefix="agri-demo-"+randomUUID();
  const edition=await db.competition.create({data:{title:prefix+" LOCAL FIXTURE",status:"ONGOING"},select:{id:true}});
  const otherEdition=await db.competition.create({data:{title:prefix+" OTHER"},select:{id:true}});process.env.ANS_AGRIHACKATHON_COMPETITION_ID=edition.id;
  const makeUser=(suffix:string,role:"USER"|"ADMIN"="USER")=>db.user.create({data:{email:prefix+suffix+"@example.invalid",username:prefix+suffix,role,quotaPoints:77},select:{id:true}});
  const [owner,member,outsider,admin,reader,writer,full]=await Promise.all([makeUser("owner"),makeUser("member"),makeUser("other"),makeUser("admin","ADMIN"),makeUser("reader"),makeUser("writer"),makeUser("full")]);
  await db.$executeRaw`INSERT INTO agri_workspaces (id,"competitionId") VALUES (${randomUUID()},${edition.id}),(${randomUUID()},${otherEdition.id})`;
  const grant=async(userId:string,scope:string)=>db.$executeRaw`INSERT INTO agri_access_grants (id,"competitionId","userId",scope,"grantedById","grantedAt") VALUES (${randomUUID()},${edition.id},${userId},${scope},${owner.id},clock_timestamp())`;
  await grant(owner.id,"RULES_CONFIRM");for(const who of [reader,writer,full])await grant(who.id,"WORKS_READ");for(const who of [writer,full])await grant(who.id,"DEMO_WRITE");await grant(full.id,"PRIVATE_MATERIALS_READ");await grant(full.id,"INTERNAL_NOTES_READ");
  const [clock]=await db.$queryRaw<Array<{now:Date}>>`SELECT clock_timestamp() AS now`;
  const draft:AgriRulesDraft={schemaVersion:1,guidanceMarkdown:"LOCAL review fixture; not official rules",requirements:{schemaVersion:1,repositoryRequired:false,repositoryRefRequired:false,demoRequired:false,materials:[]},windows:[{stage:"REGISTRATION",state:"PENDING",opensAt:null,closesAt:null},{stage:"PRELIMINARY",state:"READY",opensAt:new Date(clock.now.getTime()-60000).toISOString(),closesAt:new Date(clock.now.getTime()+3600000).toISOString(),includesDeadline:false},{stage:"FINAL",state:"PENDING",opensAt:null,closesAt:null}]};
  let rev=(await getRules(owner.id)).revision;await rules(owner.id,{action:"saveRulesDraft",idempotencyKey:randomUUID(),expectedRevision:rev++,draft});const rule=await rules(owner.id,{action:"confirmRules",idempotencyKey:randomUUID(),expectedRevision:rev++});await rules(owner.id,{action:"publishRules",idempotencyKey:randomUUID(),expectedRevision:rev++,ruleVersionId:rule.resourceId});await rules(owner.id,{action:"setEnabled",idempotencyKey:randomUUID(),expectedRevision:rev,enabled:true});
  const team=await db.team.create({data:{name:prefix+" TEAM",slug:prefix,ownerId:owner.id},select:{id:true}});await db.teamMember.createMany({data:[{teamId:team.id,userId:owner.id,role:"OWNER"},{teamId:team.id,userId:member.id,role:"MEMBER"}]});const entry=await db.teamCompetition.create({data:{teamId:team.id,competitionId:edition.id},select:{id:true}});
  const project=await db.project.create({data:{title:"PRIVATE_PROJECT_NOT_RETURNED",ownerId:owner.id,teamId:team.id,goal:"CONTEST"},select:{id:true}});const artifact=await db.artifact.create({data:{projectId:project.id,createdById:owner.id,kind:"CONTEST_MVP",workflowId:"fixture",title:"LOCAL"},select:{id:true}});const version=await db.artifactVersion.create({data:{artifactId:artifact.id,version:1,createdById:owner.id,contentJson:{secret:"PRIVATE_ARTIFACT_BODY"},contentMarkdown:"PRIVATE_ARTIFACT_BODY",factSnapshotHash:"fixture"},select:{id:true}});
  const stage=await prepare(owner.id,{action:"prepareStage",teamCompetitionId:entry.id,stage:"PRELIMINARY"});const accepted=await submit(owner.id,{action:"submit",idempotencyKey:randomUUID(),entryStageId:stage.entryStageId,expectedRevision:1,expectedRuleVersionId:rule.resourceId,content:{projectId:project.id,artifactVersionId:version.id,repository:null,demoUrl:null,summary:"PRIVATE_SUBMISSION_TEXT",materials:{schemaVersion:1,items:[]}}});assert.ok(accepted.submissionId);const submissionId=accepted.submissionId;
  const condition = {status:"PASS",note:"Checked manually"};
  const snapshot = {schemaVersion:1,mode:"LIVE",description:"LOCAL Demo",device:condition,compatibility:condition,network:condition,audio:condition,
    backup:{...condition,url:null,artifactVersionId:null},conclusion:"PASS",recheckDue:{state:"UNKNOWN",at:null}};
  const makeCheck=(extra:Record<string,unknown>={})=>({action:"recordDemoCheck",idempotencyKey:randomUUID(),submissionId,expectedLatestCheckId:null,acknowledgeStaleSubmission:false,basis:"METADATA",demo:snapshot,internalNote:null,...extra});
  const nextCheck=async(extra:Record<string,unknown>={})=>makeCheck({expectedLatestCheckId:(await get(full.id,submissionId,{scope:"staff"})).latestCheckId,...extra});
  const sideEffects=async()=>({entry:await db.teamCompetition.findUniqueOrThrow({where:{id:entry.id}}),users:await db.user.findMany({where:{id:{in:[owner.id,full.id]}},select:{id:true,xp:true,quotaPoints:true},orderBy:{id:"asc"}}),publications:await db.artifactPublication.count({where:{artifactVersionId:version.id}}),ledger:await db.quotaLedger.count({where:{userId:{in:[owner.id,full.id]}}})});
  const before=await sideEffects();let privateCheck="",recheckId="";
  await check("active own team read only; unrelated team and global ADMIN cannot cross scope",async()=>{
    assert.equal((await get(member.id,submissionId)).checks.length,0);
    for(const who of [outsider,admin,reader])await assert.rejects(get(who.id,submissionId),/AGRI_TEAM_PERMISSION_REQUIRED/);
    await assert.rejects(get(admin.id,submissionId,{scope:"staff"}),/AGRI_SCOPE_REQUIRED/);
    await assert.rejects(get(reader.id,submissionId,{scope:"staff",includeInternal:true}),/Unrecognized key/);
  });
  await check("WORKS_READ, DEMO_WRITE, private material and internal note are independent authorities",async()=>{
    await assert.rejects(run(reader.id,makeCheck()),/AGRI_SCOPE_REQUIRED/);await assert.rejects(run(owner.id,makeCheck()),/AGRI_SCOPE_REQUIRED/);
    await assert.rejects(run(writer.id,makeCheck({basis:"PRIVATE_MATERIALS"})),/AGRI_SCOPE_REQUIRED/);
    await assert.rejects(run(writer.id,makeCheck({internalNote:"PRIVATE_INTERNAL_NOTE"})),/AGRI_SCOPE_REQUIRED/);
  });
  await check("forged timestamps, identity, states and bearer URLs fail strict server validation",async()=>{
    for(const extra of [{checkedById:owner.id},{checkedAt:new Date().toISOString()},{demo:{...snapshot,network:{status:"NOT_TESTED",note:""}}},{demo:{...snapshot,backup:{...snapshot.backup,url:"https://example.invalid/?token=secret"}}}])await assert.rejects(run(full.id,makeCheck(extra)));
  });
  await check("same-key concurrent requests store one exact check, event, receipt and audit",async()=>{
    const command=makeCheck({basis:"PRIVATE_MATERIALS",internalNote:"PRIVATE_INTERNAL_NOTE",demo:{...snapshot,description:"PRIVATE_DEMO_DETAILS",backup:{...snapshot.backup,url:"https://example.invalid/backup",artifactVersionId:version.id}}});
    const results=await Promise.all(Array.from({length:5},()=>run(full.id,command)));assert.equal(results.filter(row=>!row.duplicate).length,1);privateCheck=results[0].checkId;assert.ok(results.every(row=>row.checkId===privateCheck));
    for(const table of ["agri_demo_checks","agri_demo_events","agri_demo_receipts"]){const rows=await db.$queryRawUnsafe<Array<{count:bigint}>>(`SELECT count(*) AS count FROM ${table} WHERE ${table==="agri_demo_checks"?'id':'"checkId"'}=$1`,privateCheck);assert.equal(Number(rows[0].count),1);}
    assert.equal(await db.auditLog.count({where:{resourceId:privateCheck,action:"AGRI_RECORDDEMOCHECK"}}),1);
    await assert.rejects(run(full.id,{...command,internalNote:"different"}),/AGRI_IDEMPOTENCY_CONFLICT/);
  });
  await check("team and limited staff cannot obtain private Demo notes, backup addresses, internal text or unrelated artifact bodies",async()=>{
    for(const view of [await get(member.id,submissionId),await get(reader.id,submissionId,{scope:"staff"})]){
      const text=JSON.stringify(view);for(const secret of ["PRIVATE_DEMO_DETAILS","PRIVATE_INTERNAL_NOTE","https://example.invalid/backup","PRIVATE_ARTIFACT_BODY","PRIVATE_SUBMISSION_TEXT"])assert.ok(!text.includes(secret));
    }
    const teamView=await get(member.id,submissionId);assert.equal(teamView.checks.length,0);assert.equal(teamView.latestCheckId,null);assert.ok(!JSON.stringify(teamView).includes(privateCheck));
    const limited=await get(writer.id,submissionId,{scope:"staff"});assert.equal(limited.canRecordCheck,false);assert.equal(limited.recheckBlockedCode,"AGRI_DEMO_SOURCE_PERMISSION_REQUIRED");
    assert.equal((await get(full.id,submissionId,{scope:"staff"})).checks[0].internalNote,"PRIVATE_INTERNAL_NOTE");
  });
  await check("recheck must point to exact latest check of the same submission and read its source",async()=>{
    await assert.rejects(run(full.id,makeCheck()),/AGRI_DEMO_REVISION_CONFLICT/);
    await assert.rejects(run(writer.id,makeCheck({expectedLatestCheckId:privateCheck})),/AGRI_SCOPE_REQUIRED/);
    await assert.rejects(run(full.id,makeCheck({expectedLatestCheckId:randomUUID()})),/AGRI_DEMO_CHECK_NOT_FOUND/);
    const result=await run(full.id,makeCheck({expectedLatestCheckId:privateCheck}));recheckId=result.checkId;
    const view=await get(full.id,submissionId,{scope:"staff"});assert.equal(view.latestCheckId,recheckId);assert.equal(view.checks[0].recheckOfId,privateCheck);assert.equal(view.checks[0].artifactVersionId,version.id);
  });
  await check("different-key same-parent concurrent rechecks have one CAS winner with no historical rewrite",async()=>{
    const command=await nextCheck();const results=await Promise.allSettled([run(full.id,command),run(writer.id,{...command,idempotencyKey:randomUUID()})]);assert.equal(results.filter(row=>row.status==="fulfilled").length,1);const reject=results.find(row=>row.status==="rejected");assert.ok(reject&&reject.status==="rejected"&&String(reject.reason).includes("AGRI_DEMO_REVISION_CONFLICT"));
  });
  await check("backup artifact version must be exactly submitted main or material reference",async()=>{
    const another=await db.artifactVersion.create({data:{artifactId:artifact.id,version:2,createdById:owner.id,contentJson:{},contentMarkdown:"not submitted",factSnapshotHash:"fixture"},select:{id:true}});
    await assert.rejects(run(full.id,await nextCheck({basis:"PRIVATE_MATERIALS",demo:{...snapshot,backup:{...snapshot.backup,artifactVersionId:another.id}}})),/AGRI_DEMO_BACKUP_VERSION_UNAVAILABLE/);
  });
  await check("team feedback is explicit, immutable and independently CAS/idempotency protected",async()=>{
    const command={action:"publishDemoFeedback",idempotencyKey:randomUUID(),checkId:privateCheck,expectedSequence:0,body:"TEAM_DEMO_FEEDBACK"};
    await assert.rejects(run(writer.id,command),/AGRI_SCOPE_REQUIRED/);
    const results=await Promise.all([run(full.id,command),run(full.id,command)]);assert.equal(results.filter(row=>!row.duplicate).length,1);
    assert.equal((await get(member.id,submissionId)).checks.find(row=>row.id===privateCheck)?.feedback?.body,"TEAM_DEMO_FEEDBACK");
    await assert.rejects(run(full.id,{...command,idempotencyKey:randomUUID()}),/AGRI_DEMO_FEEDBACK_REVISION_CONFLICT/);
    await assert.rejects(run(full.id,{...command,body:"changed"}),/AGRI_IDEMPOTENCY_CONFLICT/);
    const withdraw={action:"withdrawDemoFeedback",idempotencyKey:randomUUID(),checkId:privateCheck,expectedSequence:1};assert.equal((await run(full.id,withdraw)).appliedSequence,2);assert.equal((await run(full.id,withdraw)).duplicate,true);
    const withdrawn=await get(member.id,submissionId);assert.ok(!JSON.stringify(withdrawn).includes("TEAM_DEMO_FEEDBACK"));assert.equal(withdrawn.checks.length,0);assert.ok(!JSON.stringify(withdrawn).includes(privateCheck));
    await assert.rejects(run(full.id,{...withdraw,expectedSequence:2,idempotencyKey:randomUUID()}),/AGRI_DEMO_FEEDBACK_NOT_PUBLISHED/);
  });
  await check("unknown and tentative recheck dates persist without turning into official event dates",async()=>{
    const demo={...snapshot,network:{status:"NOT_TESTED",note:"Need venue network input"},conclusion:"NEEDS_ACTION",recheckDue:{state:"TENTATIVE",at:"2026-10-20T09:00:00+08:00"}};
    const created=await run(full.id,await nextCheck({demo}));const row=(await get(full.id,submissionId,{scope:"staff"})).checks.find(item=>item.id===created.checkId);assert.equal(row?.demo?.recheckDue.state,"TENTATIVE");assert.equal(row?.demo?.recheckDue.at,"2026-10-20T09:00:00+08:00");
  });
  await check("CHECK constraints, chain guard and all append-only records reject direct corruption",async()=>{
    for(const table of ["agri_demo_checks","agri_demo_feedback_events","agri_demo_events","agri_demo_receipts"])await assert.rejects(db.$executeRawUnsafe(`DELETE FROM ${table} WHERE ${table==="agri_demo_checks"?'id':'"checkId"'}=$1`,privateCheck));
    const insert=(parent:string|null,sequence:number,demo:unknown=snapshot,competitionId=edition.id)=>db.$executeRaw`INSERT INTO agri_demo_checks (id,"competitionId","entryStageId","submissionId",sequence,"recheckOfId",result,basis,demo,"checkedById","checkedAt") VALUES (${randomUUID()},${competitionId},${stage.entryStageId},${submissionId},${sequence},${parent},'PASS','METADATA',${JSON.stringify(demo)}::jsonb,${full.id},clock_timestamp())`;
    await assert.rejects(insert(privateCheck,2));await assert.rejects(insert(null,1));await assert.rejects(insert(null,1,snapshot,otherEdition.id));
    const latest=(await get(full.id,submissionId,{scope:"staff"})).latestCheckId!;
    const [count]=await db.$queryRaw<Array<{n:number}>>`SELECT count(*)::integer AS n FROM agri_demo_checks WHERE "submissionId"=${submissionId}`;
    for(const bad of [{...snapshot,network:null},{...snapshot,network:{status:null,note:""}},{...snapshot,backup:{...snapshot.backup,url:"https://user:secret@example.invalid/path"}},{...snapshot,recheckDue:{state:"UNKNOWN",at:"2026-10-08T00:00:00Z"}},{...snapshot,description:42},{...snapshot,mode:null},{...snapshot,schemaVersion:"1"},{...snapshot,hidden:"secret"}])await assert.rejects(insert(latest,count.n+1,bad));
  });
  await check("valid Demo without its same-transaction receipt and event cannot commit",async()=>{
    const view=await get(full.id,submissionId,{scope:"staff"});const [row]=await db.$queryRaw<Array<{n:number}>>`SELECT count(*)::integer AS n FROM agri_demo_checks WHERE "submissionId"=${submissionId}`;
    await assert.rejects(db.$executeRaw`INSERT INTO agri_demo_checks (id,"competitionId","entryStageId","submissionId",sequence,"recheckOfId",result,basis,demo,"checkedById","checkedAt") VALUES (${randomUUID()},${edition.id},${stage.entryStageId},${submissionId},${row.n+1},${view.latestCheckId},'PASS','METADATA',${JSON.stringify(snapshot)}::jsonb,${full.id},clock_timestamp())`,/AGRI_DEMO_ATOMIC_RECORD_REQUIRED/);
    await assert.rejects(db.$executeRaw`INSERT INTO agri_demo_feedback_events (id,"competitionId","checkId",sequence,action,body,"actorId","createdAt") VALUES (${randomUUID()},${edition.id},${privateCheck},3,'PUBLISH','team body',${full.id},clock_timestamp())`,/AGRI_DEMO_ATOMIC_FEEDBACK_REQUIRED/);
    await assert.rejects(db.$executeRaw`INSERT INTO agri_demo_events (id,"competitionId","checkId",action,"appliedSequence","actorId","createdAt") VALUES (${randomUUID()},${edition.id},${privateCheck},'recordDemoCheck',0,${full.id},clock_timestamp())`,/AGRI_DEMO_ATOMIC_EVENT_REQUIRED/);
  });
  await check("blocked user and withdrawn membership lose read access immediately",async()=>{
    await db.teamMember.updateMany({where:{teamId:team.id,userId:member.id},data:{status:"LEFT"}});await assert.rejects(get(member.id,submissionId),/AGRI_TEAM_PERMISSION_REQUIRED/);await db.teamMember.updateMany({where:{teamId:team.id,userId:member.id},data:{status:"ACTIVE"}});
    await db.user.update({where:{id:full.id},data:{flagged:true}});await assert.rejects(get(full.id,submissionId,{scope:"staff"}),/ACCOUNT_UNAVAILABLE/);await assert.rejects(run(full.id,makeCheck()),/ACCOUNT_UNAVAILABLE/);await db.user.update({where:{id:full.id},data:{flagged:false}});
  });
  await check("revoked private and notes permissions remove details and block private-source replay",async()=>{
    const replay=await nextCheck({basis:"PRIVATE_MATERIALS",internalNote:"PRIVATE_INTERNAL_NOTE"});await run(full.id,replay);
    await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=clock_timestamp(),revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope IN ('PRIVATE_MATERIALS_READ','INTERNAL_NOTES_READ')`;
    const limited=await get(full.id,submissionId,{scope:"staff"});assert.equal(limited.canRecordCheck,false);assert.equal(limited.checks[0].demo,undefined);assert.ok(!JSON.stringify(limited).includes("PRIVATE_INTERNAL_NOTE"));await assert.rejects(run(full.id,replay),/AGRI_SCOPE_REQUIRED/);
    await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=NULL,revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope IN ('PRIVATE_MATERIALS_READ','INTERNAL_NOTES_READ')`;
    const command=await nextCheck();await run(full.id,command);await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=clock_timestamp(),revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope='DEMO_WRITE'`;await assert.rejects(run(full.id,command),/AGRI_SCOPE_REQUIRED/);await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=NULL,revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope='DEMO_WRITE'`;
  });
  await check("expiration during command atomically rolls back check, event, receipt and audit",async()=>{
    const command=await nextCheck(),counts=async()=>({checks:await db.$queryRaw`SELECT count(*) FROM agri_demo_checks WHERE "submissionId"=${submissionId}`,events:await db.$queryRaw`SELECT count(*) FROM agri_demo_events WHERE "competitionId"=${edition.id}`,receipts:await db.$queryRaw`SELECT count(*) FROM agri_demo_receipts WHERE "competitionId"=${edition.id}`,audit:await db.auditLog.count({where:{resourceType:"agri_demo_check",actorId:full.id}})});const previous=await counts();
    await db.$executeRawUnsafe(`CREATE FUNCTION agri_demo_test_delay() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.5); RETURN NEW; END; $$`);await db.$executeRawUnsafe(`CREATE TRIGGER agri_demo_test_delay BEFORE INSERT ON agri_demo_receipts FOR EACH ROW EXECUTE FUNCTION agri_demo_test_delay()`);
    await db.$executeRaw`UPDATE agri_access_grants SET "expiresAt"=clock_timestamp()+interval '0.3 seconds',revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope='DEMO_WRITE'`;
    try{await assert.rejects(run(full.id,command),/AGRI_SCOPE_REQUIRED/);}finally{await db.$executeRawUnsafe(`DROP TRIGGER agri_demo_test_delay ON agri_demo_receipts`);await db.$executeRawUnsafe(`DROP FUNCTION agri_demo_test_delay()`);await db.$executeRaw`UPDATE agri_access_grants SET "expiresAt"=NULL,revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope='DEMO_WRITE'`;}
    assert.deepEqual(await counts(),previous);
  });
  await check("cursor binds actor, edition, submission and audience; latestCheckId does not vary with history page",async()=>{
    for(let i=0;i<31;i++)await run(full.id,await nextCheck());const first=await get(full.id,submissionId,{scope:"staff"});assert.equal(first.checks.length,30);assert.ok(first.nextCursor);const next=await get(full.id,submissionId,{scope:"staff",cursor:first.nextCursor});assert.equal(next.latestCheckId,first.latestCheckId);assert.ok(next.checks.length>=5);assert.equal(new Set([...first.checks,...next.checks].map(row=>row.id)).size,first.checks.length+next.checks.length);
    for(const actor of [writer.id,reader.id])await assert.rejects(get(actor,submissionId,{scope:"staff",cursor:first.nextCursor}),/INVALID_CURSOR/);await assert.rejects(get(member.id,submissionId,{scope:"team",cursor:first.nextCursor}),/INVALID_CURSOR/);await assert.rejects(get(full.id,submissionId,{scope:"staff",cursor:"invalid"}),/INVALID_CURSOR/);
  });
  await check("Demo pass and feedback leave original review, consent, XP, public artifacts and quota unchanged",async()=>{
    assert.deepEqual(await sideEffects(),before);const logs=await db.auditLog.findMany({where:{resourceType:"agri_demo_check",resourceId:privateCheck},select:{metadata:true}});for(const secret of ["PRIVATE_DEMO_DETAILS","PRIVATE_INTERNAL_NOTE","TEAM_DEMO_FEEDBACK"])assert.ok(!JSON.stringify(logs).includes(secret));
  });
  await check("new submission preserves old checks; rechecking old version requires explicit acknowledgement",async()=>{
    const second=await submit(owner.id,{action:"submit",idempotencyKey:randomUUID(),entryStageId:stage.entryStageId,expectedRevision:2,expectedRuleVersionId:rule.resourceId,content:{projectId:project.id,artifactVersionId:version.id,repository:null,demoUrl:null,summary:"second submitted snapshot",materials:{schemaVersion:1,items:[]}}});assert.ok(second.submissionId);
    const old=await get(full.id,submissionId,{scope:"staff"});assert.equal(old.isCurrentSubmission,false);assert.equal(old.currentSubmissionId,second.submissionId);
    await assert.rejects(run(full.id,await nextCheck()),/AGRI_DEMO_STALE_SUBMISSION_ACK_REQUIRED/);const oldRecheck=await run(full.id,await nextCheck({acknowledgeStaleSubmission:true}));assert.ok(oldRecheck.checkId);
    await assert.rejects(run(full.id,makeCheck({submissionId:second.submissionId,expectedLatestCheckId:privateCheck})),/AGRI_DEMO_CHECK_NOT_FOUND/);
    const current=await get(full.id,second.submissionId,{scope:"staff"});assert.equal(current.isCurrentSubmission,true);assert.equal(current.latestCheckId,null);assert.equal(current.checks.length,0);
  });
  await writeFile(dir+"/persistence-fixture.json",JSON.stringify({actorId:full.id,competitionId:edition.id,submissionId,checkId:privateCheck}));report.passed=true;
 }catch(error){await mkdir(dir,{recursive:true});await writeFile(dir+"/failure.txt",String(error instanceof Error?error.stack:error));throw error;}
 finally{await mkdir(dir,{recursive:true});await writeFile(dir+(process.argv.includes("--persistence")?"/persistence.json":"/integration.json"),JSON.stringify({...report,current},null,2)+"\n");await db.$disconnect();}
}
main().catch(()=>{console.error("AGRI_DEMO_INTEGRATION_FAILED; inspect sanitized evidence");process.exitCode=1;});
