/** Real services + isolated PostgreSQL. Fixtures never reach production. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { AgriRulesDraft } from "../src/contracts/agri-workspace";
for (const value of [process.env.DATABASE_URL, process.env.DIRECT_URL]) {
  if (!value) throw new Error("Explicit isolated database required");
  const url = new URL(value);
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/ans_product_verify_agri_workspace_r1") throw new Error("Non-isolated workspace writes refused");
}
async function main() {
  const { db } = await import("../src/lib/db");
  const { executeAgriWorkspaceCommand: run, executeAgriGrantCommand: grant, readAgriWorkspaceRules: get, readAgriPublicGuide: guide, requireAgriScope, lockAgriWorkspace } = await import("../src/server/competitions/agrihackathon/workspace");
  const checks: Array<{label:string;passed:boolean}> = [];
  const report = { checks, passed:false, isolatedPostgres:true, productionWrites:false, modelCalls:0, failures:[] as string[] };
  const check = async (label:string, fn:()=>Promise<void>) => { await fn(); checks.push({label,passed:true}); console.log("[workspace] PASS "+label); };
  const prefix="agri-workspace-fixture-"+randomUUID();
  try {
    const edition=await db.competition.create({data:{title:prefix+" LOCAL FIXTURE"},select:{id:true}});
    const other=await db.competition.create({data:{title:prefix+" OTHER FIXTURE"},select:{id:true}});
    const makeUser=(suffix:string,role:"USER"|"ADMIN"="USER")=>db.user.create({data:{email:prefix+suffix+"@example.invalid",username:prefix+suffix,role},select:{id:true,xp:true,quotaPoints:true}});
    const [owner,recipient,admin,outsider]=await Promise.all([makeUser("owner"),makeUser("recipient"),makeUser("admin","ADMIN"),makeUser("outsider")]);
    await db.$executeRaw`INSERT INTO agri_workspaces (id,"competitionId") VALUES (${randomUUID()},${edition.id}),(${randomUUID()},${other.id})`;
    process.env.ANS_AGRIHACKATHON_COMPETITION_ID=edition.id;
    const root = async(userId:string,scope:string,expiresAt:Date|null=null,delegable=true) => {
      const id=randomUUID();await db.$executeRaw`INSERT INTO agri_access_grants (id,"competitionId","userId",scope,"grantedById","grantedAt","expiresAt",delegable) VALUES (${id},${edition.id},${userId},${scope},${owner.id},clock_timestamp(),${expiresAt},${delegable})`;return id;
    };
    const rulesId=await root(owner.id,"RULES_CONFIRM");await root(owner.id,"ACCESS_MANAGE");await root(owner.id,"TECHNICAL_WRITE");
    const draft:AgriRulesDraft={schemaVersion:1,guidanceMarkdown:"LOCAL FIXTURE confirmed by test only",requirements:{schemaVersion:1,repositoryRequired:false,repositoryRefRequired:false,demoRequired:false,materials:[]},windows:["REGISTRATION","PRELIMINARY","FINAL"].map(stage=>({stage:stage as "REGISTRATION"|"PRELIMINARY"|"FINAL",state:"PENDING",opensAt:null,closesAt:null}))};
    const command = (action:string,expectedRevision:number,extra:Record<string,unknown>={})=>({action,expectedRevision,idempotencyKey:randomUUID(),...extra});
    await check("exact edition binding fails closed; global ADMIN has no scope bypass",async()=>{
      delete process.env.ANS_AGRIHACKATHON_COMPETITION_ID;await assert.rejects(get(owner.id),/AGRI_EDITION_NOT_CONFIGURED/);
      process.env.ANS_AGRIHACKATHON_COMPETITION_ID="missing";await assert.rejects(get(owner.id),/AGRI_WORKSPACE_NOT_CONFIGURED/);
      process.env.ANS_AGRIHACKATHON_COMPETITION_ID=edition.id;
      for(const id of [admin.id,outsider.id]) await assert.rejects(get(id),/AGRI_SCOPE_REQUIRED/);
      assert.equal(await guide(),null);
    });
    let revision=1,ruleId="";
    await check("same-key concurrent draft saves append one revision/event/receipt; altered replay rejected",async()=>{
      const cmd=command("saveRulesDraft",revision,{draft});
      const results=await Promise.all(Array.from({length:5},()=>run(owner.id,cmd)));
      assert.equal(results.filter(r=>!r.duplicate).length,1);assert.ok(results.every(r=>r.appliedRevision===2));revision=2;
      await assert.rejects(run(owner.id,{...cmd,draft:{...draft,guidanceMarkdown:"changed"}}),/AGRI_IDEMPOTENCY_CONFLICT/);
      const view=await get(owner.id);assert.deepEqual(view.draft,draft);assert.equal(view.revision,2);
    });
    await check("competing revisions permit only one confirmation, preserve three windows",async()=>{
      const results=await Promise.allSettled([run(owner.id,command("confirmRules",revision)),run(owner.id,command("confirmRules",revision))]);
      assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
      assert.match(String((results.find(r=>r.status==="rejected") as PromiseRejectedResult).reason),/AGRI_REVISION_CONFLICT/);
      const view=await get(owner.id);ruleId=view.confirmedRule!.id;revision=3;assert.equal(view.confirmedRule!.windows.length,3);
      await assert.rejects(run(owner.id,command("confirmRules",revision)),/AGRI_RULE_ALREADY_CONFIRMED/);
      assert.equal((await get(owner.id)).revision,revision);
    });
    await check("pending published rules remain disabled; publication is separate; history immutable",async()=>{
      await run(owner.id,command("publishRules",revision,{ruleVersionId:ruleId}));revision++;
      assert.equal((await guide())!.enabled,false);
      await assert.rejects(run(owner.id,command("setEnabled",revision,{enabled:true})),/AGRI_PRELIMINARY_WINDOW_REQUIRED/);
      await assert.rejects(db.$executeRaw`UPDATE agri_rule_versions SET "guidanceMarkdown"='tampered' WHERE id=${ruleId}`,/AGRI_FOUNDATION_IMMUTABLE/);
      await assert.rejects(db.$executeRaw`DELETE FROM agri_stage_windows WHERE "ruleVersionId"=${ruleId}`,/AGRI_FOUNDATION_IMMUTABLE/);
      await assert.rejects(db.$executeRaw`UPDATE agri_workspaces SET "publishedRuleVersionId"=${ruleId},"draftRevision"="draftRevision"+1 WHERE "competitionId"=${other.id}`);
    });
    await check("confirmed preliminary window enables; pending replacement cannot silently change active window",async()=>{
      const ready:AgriRulesDraft={...draft,windows:draft.windows.map(w=>w.stage==="PRELIMINARY"?{stage:w.stage,state:"READY",opensAt:"2026-10-07T00:00:00Z",closesAt:"2026-12-01T00:00:00Z",includesDeadline:false}:w)};
      await run(owner.id,command("saveRulesDraft",revision,{draft:ready}));revision++;
      const confirmed=await run(owner.id,command("confirmRules",revision));revision++;ruleId=confirmed.resourceId;
      await run(owner.id,command("publishRules",revision,{ruleVersionId:ruleId}));revision++;
      await run(owner.id,command("setEnabled",revision,{enabled:true}));revision++;
      assert.equal((await guide())!.enabled,true);
      await run(owner.id,command("saveRulesDraft",revision,{draft}));revision++;
      const pending=await run(owner.id,command("confirmRules",revision));revision++;
      await assert.rejects(run(owner.id,command("publishRules",revision,{ruleVersionId:pending.resourceId})),/AGRI_PRELIMINARY_WINDOW_REQUIRED/);
      assert.equal((await guide())!.rule.id,ruleId);
      await assert.rejects(run(owner.id,command("publishRules",revision,{ruleVersionId:ruleId})),/AGRI_RULE_VERSION_CONFLICT/);
    });
    await check("reconfirm unchanged windows in different order refuses redundant version",async()=>{
      await run(owner.id,command("saveRulesDraft",revision,{draft:{...draft,windows:[...draft.windows].reverse()}}));revision++;
      await assert.rejects(run(owner.id,command("confirmRules",revision)),/AGRI_RULE_ALREADY_CONFIRMED/);
    });
    let delegatedId="";
    const delegation={action:"delegateScope",recipientId:recipient.id,scope:"TECHNICAL_WRITE",expectedRevision:0,expiresAt:null,delegable:false,idempotencyKey:randomUUID()};
    await check("delegation requires both manager and delegable same-scope grant, duplicate applies once",async()=>{
      const results=await Promise.all(Array.from({length:4},()=>grant(owner.id,delegation)));assert.equal(results.filter(r=>!r.duplicate).length,1);delegatedId=results[0].resourceId;
      await db.$transaction(async tx=>{const ctx=await lockAgriWorkspace(tx,recipient.id);assert.equal((await requireAgriScope(tx,ctx,"TECHNICAL_WRITE")).id,delegatedId);});
      await assert.rejects(grant(owner.id,{...delegation,scope:"ACCESS_MANAGE",idempotencyKey:randomUUID()}));
      await assert.rejects(grant(owner.id,{...delegation,recipientId:owner.id,idempotencyKey:randomUUID()}),/AGRI_SELF_GRANT_FORBIDDEN/);
      await assert.rejects(grant(outsider.id,{...delegation,recipientId:admin.id,idempotencyKey:randomUUID()}),/AGRI_SCOPE_REQUIRED/);
    });
    await check("flagged recipient/ancestor and revoked upstream invalidate delegated authorization and replays",async()=>{
      await db.user.update({where:{id:recipient.id},data:{flagged:true}});await assert.rejects(grant(owner.id,delegation),/ACCOUNT_UNAVAILABLE/);
      await db.user.update({where:{id:recipient.id},data:{flagged:false}});
      await db.user.update({where:{id:owner.id},data:{flagged:true}});
      await assert.rejects(db.$transaction(async tx=>requireAgriScope(tx,await lockAgriWorkspace(tx,recipient.id),"TECHNICAL_WRITE")),/AGRI_SCOPE_REQUIRED/);
      await db.user.update({where:{id:owner.id},data:{flagged:false}});
      const [upstream]=await db.$queryRaw<Array<{id:string}>>`SELECT id FROM agri_access_grants WHERE "userId"=${owner.id} AND scope='TECHNICAL_WRITE' AND "competitionId"=${edition.id}`;
      await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=clock_timestamp(),revision=revision+1 WHERE id=${upstream.id}`;
      await assert.rejects(db.$transaction(async tx=>requireAgriScope(tx,await lockAgriWorkspace(tx,recipient.id),"TECHNICAL_WRITE")),/AGRI_SCOPE_REQUIRED/);
      await assert.rejects(grant(owner.id,delegation),/AGRI_SCOPE_REQUIRED/);
    });
    await check("account SHARE lock prevents concurrent flagging until accepted read commits",async()=>{
      await root(recipient.id,"WORKS_READ");
      let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let locked!:()=>void;const ready=new Promise<void>(resolve=>{locked=resolve;});
      const held=db.$transaction(async tx=>{await requireAgriScope(tx,await lockAgriWorkspace(tx,recipient.id),"WORKS_READ");locked();await gate;},{timeout:15000});
      await ready;let changed=false;const update=db.user.update({where:{id:recipient.id},data:{flagged:true}}).then(()=>{changed=true;});
      await new Promise(resolve=>setTimeout(resolve,150));assert.equal(changed,false);release();await held;await update;
      await db.user.update({where:{id:recipient.id},data:{flagged:false}});
    });
    await check("scope expiring during accepted write rolls back draft,event,audit and receipt",async()=>{
      const before=await db.$queryRaw<Array<{events:bigint;audits:bigint}>>`SELECT (SELECT count(*) FROM agri_workspace_events WHERE "competitionId"=${edition.id}) AS events, (SELECT count(*) FROM audit_logs WHERE "actorId"=${owner.id}) AS audits`;
      await db.$executeRaw`UPDATE agri_access_grants SET "expiresAt"=clock_timestamp()+interval '900 milliseconds',revision=revision+1 WHERE id=${rulesId}`;
      await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION fixture_agri_pause() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='AGRI_SAVERULESDRAFT' THEN PERFORM pg_sleep(1.1); END IF; RETURN NEW; END; $$`);
      await db.$executeRawUnsafe(`CREATE TRIGGER fixture_agri_pause BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fixture_agri_pause()`);
      const cmd=command("saveRulesDraft",revision,{draft:{...draft,guidanceMarkdown:"must rollback"}});
      try {await assert.rejects(run(owner.id,cmd),/AGRI_SCOPE_REQUIRED/);} finally {await db.$executeRawUnsafe(`DROP TRIGGER fixture_agri_pause ON audit_logs`);}
      const [row]=await db.$queryRaw<Array<{draftRevision:number;rulesDraft:AgriRulesDraft}>>`SELECT "draftRevision","rulesDraft" FROM agri_workspaces WHERE "competitionId"=${edition.id}`;
      assert.equal(row.draftRevision,revision);assert.notEqual(row.rulesDraft.guidanceMarkdown,"must rollback");
      const [count]=await db.$queryRaw<Array<{count:bigint}>>`SELECT count(*) AS count FROM agri_command_receipts WHERE "idempotencyKey"=${cmd.idempotencyKey}`;assert.equal(Number(count.count),0);
      await assert.rejects(get(owner.id),/AGRI_SCOPE_REQUIRED/);
      const after=await db.$queryRaw<Array<{events:bigint;audits:bigint}>>`SELECT (SELECT count(*) FROM agri_workspace_events WHERE "competitionId"=${edition.id}) AS events, (SELECT count(*) FROM audit_logs WHERE "actorId"=${owner.id}) AS audits`;
      assert.deepEqual(after,before);
    });
    await check("manager expiring during delegation rolls back new grant and receipt",async()=>{
      await root(owner.id,"DEMO_WRITE");
      const [manager]=await db.$queryRaw<Array<{expiresAt:Date}>>`UPDATE agri_access_grants SET "expiresAt"=clock_timestamp()+interval '900 milliseconds',revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${owner.id} AND scope='ACCESS_MANAGE' RETURNING "expiresAt"`;
      const before=await db.$queryRaw<Array<{receipts:bigint;audits:bigint}>>`SELECT (SELECT count(*) FROM agri_command_receipts WHERE "competitionId"=${edition.id}) AS receipts, (SELECT count(*) FROM audit_logs WHERE "actorId"=${owner.id}) AS audits`;
      await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION fixture_agri_pause() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='AGRI_DELEGATESCOPE' THEN PERFORM pg_sleep(1.1); END IF; RETURN NEW; END; $$`);
      await db.$executeRawUnsafe(`CREATE TRIGGER fixture_agri_pause BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fixture_agri_pause()`);
      const cmd={...delegation,scope:"DEMO_WRITE",expiresAt:manager.expiresAt.toISOString(),idempotencyKey:randomUUID()};
      try {await assert.rejects(grant(owner.id,cmd),/AGRI_SCOPE_REQUIRED/);} finally {await db.$executeRawUnsafe(`DROP TRIGGER fixture_agri_pause ON audit_logs`);}
      const [count]=await db.$queryRaw<Array<{count:bigint}>>`SELECT count(*) AS count FROM agri_access_grants WHERE "competitionId"=${edition.id} AND "userId"=${recipient.id} AND scope='DEMO_WRITE'`;assert.equal(Number(count.count),0);
      const after=await db.$queryRaw<Array<{receipts:bigint;audits:bigint}>>`SELECT (SELECT count(*) FROM agri_command_receipts WHERE "competitionId"=${edition.id}) AS receipts, (SELECT count(*) FROM audit_logs WHERE "actorId"=${owner.id}) AS audits`;
      assert.deepEqual(after,before);
    });
    await check("duplicate delegation rechecks authority after waiting on recipient account",async()=>{
      await db.$executeRaw`UPDATE agri_access_grants SET "expiresAt"=NULL,revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${owner.id} AND scope='ACCESS_MANAGE'`;
      const cmd={...delegation,scope:"DEMO_WRITE",idempotencyKey:randomUUID()};await grant(owner.id,cmd);
      await db.$executeRaw`UPDATE agri_access_grants SET "expiresAt"=clock_timestamp()+interval '700 milliseconds',revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${owner.id} AND scope='ACCESS_MANAGE'`;
      let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let locked!:()=>void;const ready=new Promise<void>(resolve=>{locked=resolve;});
      const held=db.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM users WHERE id=${recipient.id} FOR UPDATE`;locked();await gate;},{timeout:15000});await ready;
      const replay=grant(owner.id,cmd);const rejected=assert.rejects(replay,/AGRI_SCOPE_REQUIRED/);
      await new Promise(resolve=>setTimeout(resolve,950));release();await held;await rejected;
    });
    await check("technical authorization/rule actions do not grant XP, quota or publish member works",async()=>{
      for(const user of [owner,recipient,admin,outsider]) {const live=await db.user.findUniqueOrThrow({where:{id:user.id},select:{xp:true,quotaPoints:true}});assert.equal(live.xp,user.xp);assert.equal(live.quotaPoints,user.quotaPoints);}
      assert.equal(await db.teamCompetition.count({where:{competitionId:edition.id}}),0);
    });
    await check("all current migration names and SQL checksums match the applied isolated database",async()=>{
      const rows=await db.$queryRaw<Array<{migration_name:string;checksum:string;finished:boolean}>>`SELECT migration_name,checksum,finished_at IS NOT NULL AS finished FROM _prisma_migrations ORDER BY migration_name`;
      const names=(await readdir("prisma/migrations",{withFileTypes:true})).filter(item=>item.isDirectory()).map(item=>item.name).sort();assert.deepEqual(rows.map(r=>r.migration_name),names);for(const row of rows){assert.ok(row.finished);assert.equal(row.checksum,createHash("sha256").update(await readFile("prisma/migrations/"+row.migration_name+"/migration.sql")).digest("hex"));}
      const file=await readFile("prisma/migrations/20261008000000_agri_workspace_foundation/migration.sql");assert.equal(rows.find(r=>r.migration_name==="20261008000000_agri_workspace_foundation")!.checksum,createHash("sha256").update(file).digest("hex"));
    });
    report.passed=true;
  } catch(error) {report.failures.push(error instanceof Error?error.message:"Unknown integration failure");throw error;}
  finally {await mkdir(".workbuddy/evidence/agri-workspace",{recursive:true});const file=".workbuddy/evidence/agri-workspace/integration.json";
    try { const previous=await readFile(file);await writeFile(file.replace(".json","-previous-"+Date.now()+".json"),previous); } catch(error) {if ((error as NodeJS.ErrnoException).code!=="ENOENT") throw error;}
    await writeFile(file,JSON.stringify(report,null,2)+"\n");await db.$disconnect();}
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Workspace integration failed");process.exitCode=1;});
