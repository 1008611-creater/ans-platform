/** Loopback-only production Next, actual Credentials/CSRF, and isolated PostgreSQL. No suppliers. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import bcrypt from "bcryptjs";
import type { AgriRulesDraft } from "../src/contracts/agri-workspace";
import type { AgriStageSubmissionContent } from "../src/contracts/agri-submissions";
import type * as SubmissionService from "../src/server/competitions/agrihackathon/submissions";
type Detail = Awaited<ReturnType<typeof SubmissionService.readAgriStage>>;
type Versions = Awaited<ReturnType<typeof SubmissionService.listAgriSubmissionVersions>>;
type Stages = Awaited<ReturnType<typeof SubmissionService.listAgriStages>>;
type Entries = Awaited<ReturnType<typeof SubmissionService.listAgriTeamEntries>>;
type Mutation = Awaited<ReturnType<typeof SubmissionService.executeAgriSubmissionCommand>>;
type Prepare = Awaited<ReturnType<typeof SubmissionService.prepareAgriStage>>;
for (const value of [process.env.DATABASE_URL, process.env.DIRECT_URL]) {
  const url = new URL(value ?? "http://invalid");
  if (url.hostname !== "127.0.0.1" || url.port !== "55438" || url.pathname !== "/ans_product_verify_agri_submissions_r1") throw new Error("Refusing non-isolated submission HTTP writes");
}
const origin = "http://127.0.0.1:3148", api = "/api/competitions/agrihackathon/submissions", reportDir = ".workbuddy/evidence/agri-submissions";
// This fixed password belongs only to generated, loopback example.invalid fixtures.
const fixturePassword = "LocalSubmissionOnly!2026";
class Client {
  private cookies = new Map<string, string>();
  constructor(readonly actorId: string | null) {}
  async fetch(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("cookie", Array.from(this.cookies, ([key, value]) => `${key}=${value}`).join("; "));
    const response = await fetch(origin + path, { ...init, headers, redirect: "manual", signal: AbortSignal.timeout(15_000) });
    for (const cookie of response.headers.getSetCookie()) {
      const entry = cookie.split(";", 1)[0], split = entry.indexOf("=");
      if (split > 0) this.cookies.set(entry.slice(0, split), entry.slice(split + 1));
    }
    return response;
  }
  async login(email: string, password = fixturePassword) {
    const csrf = await this.fetch("/api/auth/csrf"); assert.equal(csrf.status, 200);
    const { csrfToken } = await csrf.json() as { csrfToken: string }; assert.ok(csrfToken);
    const response = await this.fetch("/api/auth/callback/credentials", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1", origin }, body: new URLSearchParams({ csrfToken, email, password, callbackUrl: origin + "/competitions/agrihackathon/submissions" }) });
    assert.equal(response.status, 200);
    const loginResult = await response.json() as { url?: string };
    if (password === fixturePassword) assert.ok(loginResult.url && !new URL(loginResult.url).searchParams.has("error"), "Credentials callback: " + String(loginResult.url));
    const session = await (await this.fetch("/api/auth/session")).json() as { user?: { id: string } } | null;
    return session?.user?.id ?? null;
  }
  request(command?: unknown, suffix = "", extra: Record<string, string> = {}) {
    return this.fetch(api + suffix, { headers: { ...(this.actorId ? { "x-ans-submission-actor": this.actorId } : {}), ...(command ? { "content-type": "application/json", origin } : {}), ...extra }, ...(command ? { method: "POST", body: JSON.stringify(command) } : {}) });
  }
  async data<T>(command?: unknown, suffix = ""): Promise<T> {
    const response = await this.request(command, suffix); assert.equal(response.status, 200);
    const body = await response.json() as { ok: boolean; data: T }; assert.equal(body.ok, true); return body.data;
  }
}
async function main() {
  const { db } = await import("../src/lib/db");
  const { executeAgriWorkspaceCommand: rules, readAgriWorkspaceRules: getRules } = await import("../src/server/competitions/agrihackathon/workspace");
  const checks: Array<{ label: string; passed: boolean }> = [];
  let current = "prepare", server: ChildProcess | null = null;
  const prefix = "agri-sub-http-" + randomUUID();
  const competition = await db.competition.create({ data: { title: prefix + " LOCAL FIXTURE", status: "ONGOING" }, select: { id: true } });
  process.env.ANS_AGRIHACKATHON_COMPETITION_ID = competition.id;
  const password = await bcrypt.hash(fixturePassword, 10);
  const makeUser = (suffix: string, role: "USER" | "ADMIN" = "USER") => db.user.create({ data: { email: prefix + "-" + suffix + "@example.invalid", username: prefix + "-" + suffix, password, locale: "zh", role, quotaPoints: 101 }, select: { id: true, email: true } });
  const [owner, teammate, admin, staff, fullStaff] = await Promise.all([makeUser("owner"), makeUser("member"), makeUser("admin", "ADMIN"), makeUser("staff"), makeUser("fullstaff")]);
  await db.$executeRaw`INSERT INTO agri_workspaces (id,"competitionId") VALUES (${randomUUID()},${competition.id})`;
  const grant = async (userId: string, scope: string) => db.$executeRaw`INSERT INTO agri_access_grants (id,"competitionId","userId",scope,"grantedById","grantedAt") VALUES (${randomUUID()},${competition.id},${userId},${scope},${owner.id},clock_timestamp())`;
  await grant(owner.id,"RULES_CONFIRM"); await grant(staff.id,"WORKS_READ"); await grant(fullStaff.id,"WORKS_READ"); await grant(fullStaff.id,"PRIVATE_MATERIALS_READ"); await grant(fullStaff.id,"EXPORT");
  const [clock] = await db.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
  const browserFixture = process.argv.includes("--browser");
  const draft: AgriRulesDraft = { schemaVersion: 1, guidanceMarkdown: browserFixture ? "本地验收样例，不是正式比赛规范。选择自己的作品版本，填写介绍、仓库版本和 Demo，再提交。" : "LOCAL FIXTURE guidance", requirements: { schemaVersion: 1, repositoryRequired: true, repositoryRefRequired: true, demoRequired: true,
    materials: [{ key: "proof", kind: "ARTIFACT", required: true }, ...(browserFixture ? [{ key: "overview", kind: "TEXT" as const, required: true }, { key: "guide", kind: "LINK" as const, required: false }] : [])] }, windows: [
      { stage: "REGISTRATION", state: "PENDING", opensAt: null, closesAt: null },
      { stage: "PRELIMINARY", state: "READY", opensAt: new Date(clock.now.getTime()-60000).toISOString(), closesAt: new Date(clock.now.getTime()+(browserFixture ? 3600000 : 600000)).toISOString(), includesDeadline: false },
      { stage: "FINAL", state: "PENDING", opensAt: null, closesAt: null }] };
  let rev = (await getRules(owner.id)).revision;
  await rules(owner.id,{action:"saveRulesDraft",idempotencyKey:randomUUID(),expectedRevision:rev++,draft});
  const confirmed = await rules(owner.id,{action:"confirmRules",idempotencyKey:randomUUID(),expectedRevision:rev++});
  await rules(owner.id,{action:"publishRules",idempotencyKey:randomUUID(),expectedRevision:rev++,ruleVersionId:confirmed.resourceId});
  await rules(owner.id,{action:"setEnabled",idempotencyKey:randomUUID(),expectedRevision:rev,enabled:true});
  const team = await db.team.create({data:{name:prefix+" LOCAL TEAM",slug:prefix,ownerId:owner.id},select:{id:true}});
  await db.teamMember.createMany({data:[{teamId:team.id,userId:owner.id,role:"OWNER"},{teamId:team.id,userId:teammate.id,role:"MEMBER"}]});
  const entry = await db.teamCompetition.create({data:{teamId:team.id,competitionId:competition.id},select:{id:true}});
  const makeVersion = async (actorId: string) => {
    const project=await db.project.create({data:{ownerId:actorId,teamId:team.id,title:prefix+" PRIVATE_PROJECT",goal:"CONTEST"},select:{id:true}});
    const artifact=await db.artifact.create({data:{projectId:project.id,createdById:actorId,workflowId:"local-fixture",kind:"CONTEST_MVP",title:"LOCAL TITLE"},select:{id:true}});
    const version=await db.artifactVersion.create({data:{artifactId:artifact.id,createdById:actorId,version:1,contentMarkdown:"PRIVATE_BODY_NOT_PROJECTED",contentJson:{private:"PRIVATE_BODY_NOT_PROJECTED"},factSnapshotHash:"fixture"},select:{id:true}});
    return {projectId:project.id,artifactVersionId:version.id};
  };
  const [own, privateMember] = await Promise.all([makeVersion(owner.id),makeVersion(teammate.id)]);
  const content: AgriStageSubmissionContent = {...own, repository:{url:"https://example.invalid/PRIVATE_SUBMISSION",ref:{kind:"COMMIT_SHA",value:"a".repeat(40)}}, demoUrl:"https://example.invalid/PRIVATE_SUBMISSION/demo", summary:"PRIVATE_SUBMISSION summary", materials:{schemaVersion:1,items:[{key:"proof",kind:"ARTIFACT",artifactVersionId:own.artifactVersionId}]}};
  async function stop() {
    const child=server; server=null; if(!child||child.exitCode!==null)return;
    child.kill(); await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("Isolated Next did not stop")),5000);child.once("exit",()=>{clearTimeout(timer);resolve();});});
  }
  async function start() {
    assert.equal(server,null);
    try { const response=await fetch(origin+"/api/health",{signal:AbortSignal.timeout(500)}); if(response)throw new Error("Acceptance port already occupied"); }
    catch(error) { if(error instanceof Error&&error.message==="Acceptance port already occupied")throw error; }
    server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port","3148"],{env:{...process.env,ANS_LOCAL_DIST_DIR:".next-agri-submissions",ANS_AGRIHACKATHON_COMPETITION_ID:competition.id},windowsHide:true,stdio:"ignore"});
    let ended=false; server.once("exit",()=>{ended=true;});
    for(let attempt=0;attempt<60;attempt++){
      if(ended)throw new Error("Isolated Next failed to start");
      try{const response=await fetch(origin+"/api/health",{signal:AbortSignal.timeout(1000)});if(response.ok)return;}catch{/* readiness */}
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    throw new Error("Isolated Next did not become ready");
  }
  const check=async(label:string,run:()=>Promise<void>)=>{current=label;await run();checks.push({label,passed:true});console.log("[submission-http] PASS "+label);};
  if (process.argv.includes("--browser")) {
    const { prepareAgriStage, executeAgriSubmissionCommand } = await import("../src/server/competitions/agrihackathon/submissions");
    const stage = await prepareAgriStage(owner.id, { action: "prepareStage", teamCompetitionId: entry.id, stage: "PRELIMINARY" });
    const browserContent = { ...content, summary: "本地样例：已提交的农客松作品，用于验证作品汇总。", materials: { schemaVersion: 1 as const, items: [...content.materials.items, { key: "overview", kind: "TEXT" as const, text: "本地验收材料，不是正式参赛内容。" }] } };
    for (let index = 0; index < 2; index++) await executeAgriSubmissionCommand(owner.id, { action: "submit", entryStageId: stage.entryStageId, expectedRevision: index + 1, expectedRuleVersionId: confirmed.resourceId, idempotencyKey: randomUUID(), content: { ...browserContent, summary: browserContent.summary + " v" + (index + 1) } });
    await start();
    await mkdir(reportDir,{recursive:true});
    await writeFile(reportDir + "/browser-fixture.json", JSON.stringify({localFixtureOnly:true, origin, competitionId:competition.id, owner, teammate, staff, fullStaff, own, entryId:entry.id, stopFile:reportDir + "/browser-stop.signal"},null,2)+"\n");
    console.log("[submission-browser] Isolated fixture ready on loopback 3148");
    // Task-scoped stop file makes shutdown reviewable without terminating unrelated Node processes.
    await new Promise<void>(resolve => {
      const finish = () => { clearInterval(timer); resolve(); };
      const timer = setInterval(() => {
        void readFile(reportDir + "/browser-stop.signal").then(finish).catch(() => {});
      }, 500);
      process.once("SIGINT",finish); process.once("SIGTERM",finish);
    });
    await stop(); await db.$disconnect(); return;
  }
  const a=new Client(owner.id),b=new Client(teammate.id),c=new Client(admin.id),d=new Client(staff.id),e=new Client(fullStaff.id),anon=new Client(null);
  let stageId="",firstId="",lostCommand:unknown;
  const prepare={action:"prepareStage",teamCompetitionId:entry.id,stage:"PRELIMINARY"};
  const command=(revision:number)=>({action:"submit",entryStageId:stageId,expectedRevision:revision,expectedRuleVersionId:confirmed.resourceId,idempotencyKey:randomUUID(),content});
  await mkdir(reportDir,{recursive:true});
  try{
    await start();
    await check("anonymous requests cannot list entries, versions, stages or write",async()=>{
      for(const suffix of ["","/entries","/absent","/absent/versions","/export"])assert.equal((await anon.request(undefined,suffix)).status,401);
      assert.equal((await anon.request(prepare)).status,401);
    });
    await check("actual Credentials CSRF login authenticates five distinct database accounts",async()=>{
      for(const [client,user] of [[a,owner],[b,teammate],[c,admin],[d,staff],[e,fullStaff]] as const)assert.equal(await client.login(user.email),user.id);
    });
    await check("stale or missing actor headers refuse every private endpoint",async()=>{
      assert.equal((await a.fetch(api)).status,409);
      for(const suffix of ["","/entries","/absent","/absent/versions","/export"])assert.equal((await a.request(undefined,suffix,{"x-ans-submission-actor":teammate.id})).status,409);
    });
    await check("cross-origin, malformed, oversized and forged commands never persist",async()=>{
      assert.equal((await a.request(prepare,"",{origin:"https://untrusted.example.invalid"})).status,403);
      for(const body of [{...prepare,competitionId:"forged"},{...prepare,submittedById:admin.id}])assert.equal((await a.request(body)).status,400);
      assert.equal((await a.fetch(api,{method:"POST",headers:{origin,"content-type":"application/json","x-ans-submission-actor":owner.id},body:"{"})).status,400);
      assert.equal((await a.request({padding:"x".repeat(100001)})).status,413);
    });
    await check("team entries and manager rights come from the authenticated membership",async()=>{
      const entries=await a.data<Entries>(undefined,"/entries");assert.equal(entries.entries[0].role,"OWNER");assert.equal(entries.entries[0].id,entry.id);
      assert.equal((await b.data<Entries>(undefined,"/entries")).entries[0].role,"MEMBER");assert.equal((await c.data<Entries>(undefined,"/entries")).entries.length,0);
      assert.equal((await b.request(prepare)).status,403);
    });
    await check("concurrent preparation produces one durable stage",async()=>{
      const results=await Promise.all([a.data<Prepare>(prepare),a.data<Prepare>(prepare)]);assert.equal(results.filter(row=>!row.duplicate).length,1);stageId=results[0].entryStageId;
      assert.equal((await a.data<Stages>()).stages.length,1);
    });
    await check("candidate metadata excludes member projects and private document bodies",async()=>{
      const page=await a.data<Versions>(undefined,"/"+stageId+"/versions");assert.deepEqual(page.versions.map(row=>row.id),[own.artifactVersionId]);
      assert.ok(!JSON.stringify(page).includes("PRIVATE_BODY_NOT_PROJECTED"));assert.ok(!JSON.stringify(page).includes(privateMember.projectId));
      for(const actor of [b,c,d])assert.equal((await actor.request(undefined,"/"+stageId+"/versions")).status,403);
      assert.equal((await a.request(undefined,"/"+stageId+"/versions?ownerId=forged")).status,400);
    });
    await check("concurrent draft saves persist once and expose no formal submission",async()=>{
      const cmd={action:"saveDraft",entryStageId:stageId,expectedRevision:1,idempotencyKey:randomUUID(),draft:content};
      const results=await Promise.all([a.data<Mutation>(cmd),a.data<Mutation>(cmd)]);assert.equal(results.filter(row=>!row.duplicate).length,1);
      const detail=await a.data<Detail>(undefined,"/"+stageId);assert.deepEqual(detail.draft,content);assert.equal(detail.current,null);assert.equal(detail.revision,2);
    });
    await check("formal submission binds the confirmed rule, version and immutable sequence",async()=>{
      const cmd=command(2);const first=await a.data<Mutation>(cmd);firstId=first.submissionId!;
      assert.equal((await a.data<Mutation>(cmd)).duplicate,true);
      const detail=await a.data<Detail>(undefined,"/"+stageId);assert.equal(detail.current?.id,firstId);assert.equal(detail.history.length,1);assert.equal(detail.draft,null);
      assert.equal(detail.current?.ruleVersionId,confirmed.resourceId);assert.equal(detail.windowState,"OPEN");
      assert.equal((await a.request({...cmd,content:{...content,summary:"changed"}})).status,409);
      assert.equal((await a.request(command(2))).status,409);
    });
    await check("team reads, WORKS_READ minimum projection, explicit materials scope and ADMIN isolation",async()=>{
      assert.equal((await b.data<Detail>(undefined,"/"+stageId)).hasPrivateMaterials,true);
      assert.equal((await b.request(command(3))).status,403);assert.equal((await c.request(undefined,"/"+stageId)).status,403);
      const limited=await d.data<Detail>(undefined,"/"+stageId);assert.equal(limited.hasPrivateMaterials,false);assert.equal(limited.draft,null);
      assert.ok(!JSON.stringify(limited).includes("PRIVATE_SUBMISSION"));assert.ok(!("content" in limited.current!));
      const full=await e.data<Detail>(undefined,"/"+stageId);assert.equal(full.hasPrivateMaterials,true);assert.ok(JSON.stringify(full.current).includes("PRIVATE_SUBMISSION"));
      assert.equal((await d.data<Stages>(undefined,"?scope=staff")).stages.length,1);assert.equal((await c.request(undefined,"?scope=staff")).status,403);
    });
    await check("actual CSV endpoint checks separate export permissions and full server filters",async()=>{
      for (const client of [a,b,c,d]) assert.equal((await client.request(undefined,"/export")).status,403);
      for (const query of ["cursor=page","scope=staff","mode=all"]) assert.equal((await e.request(undefined,"/export?"+query)).status,400);
      const metadata=await e.request(undefined,"/export?status=SUBMITTED&stage=PRELIMINARY");assert.equal(metadata.status,200);
      assert.equal(metadata.headers.get("cache-control"),"no-store");assert.equal(metadata.headers.get("x-content-type-options"),"nosniff");assert.ok(metadata.headers.get("content-disposition")?.startsWith("attachment;"));
      const csv=await metadata.text();assert.ok(csv.includes(stageId));assert.ok(!csv.includes("PRIVATE_SUBMISSION"));assert.ok(!csv.includes("PRIVATE_BODY_NOT_PROJECTED"));
      const material=await e.request(undefined,"/export?mode=materials&status=SUBMITTED");assert.equal(material.status,200);assert.ok((await material.text()).includes("PRIVATE_SUBMISSION"));
      const notSubmitted=await e.data<Stages>(undefined,"?scope=staff&status=NOT_SUBMITTED");assert.equal(notSubmitted.stages.length,0);
      const literal=await e.data<Stages>(undefined,"?scope=staff&q=%25_");assert.equal(literal.stages.length,0);
    });
    await check("pending final dates read normally while unconfirmed eligibility refuses submission",async()=>{
      const final=await a.data<Prepare>({...prepare,stage:"FINAL"});const detail=await a.data<Detail>(undefined,"/"+final.entryStageId);
      assert.equal(detail.windowState,"RULES_PENDING");assert.equal(detail.publishedRule?.window.state,"PENDING");
      const response=await a.request({...command(1),entryStageId:final.entryStageId});assert.equal(response.status,409);
      assert.equal((await response.json() as {error:{code:string}}).error.code,"AGRI_FINAL_ELIGIBILITY_REQUIRED");
    });
    await check("required material omissions and foreign versions are rejected before append",async()=>{
      assert.equal((await a.request({...command(3),content:{...content,materials:{schemaVersion:1,items:[]}}})).status,422);
      assert.equal((await a.request({...command(3),content:{...content,...privateMember}})).status,403);
      assert.equal((await a.data<Detail>(undefined,"/"+stageId)).history.length,1);
    });
    await check("legacy submit and review return stable stage-workspace rejection without XP/publication",async()=>{
      const response=await a.fetch("/api/competitions/"+competition.id+"/submission",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify({...own,teamId:team.id,summary:content.summary,publicConsent:true})});
      assert.equal(response.status,409);assert.equal((await response.json() as {error:{code:string}}).error.code,"AGRI_STAGE_WORKSPACE_REQUIRED");
      const review=await c.fetch("/api/admin/competitions/review",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify({teamCompetitionId:entry.id,decision:"approve",note:"LOCAL REVIEW",awardedXp:50})});
      assert.equal(review.status,409);assert.equal((await review.json() as {error:{code:string}}).error.code,"AGRI_STAGE_WORKSPACE_REQUIRED");
    });
    await check("private response caching is disabled and query expansions are refused",async()=>{
      const response=await a.request(undefined,"/"+stageId);assert.equal(response.headers.get("cache-control"),"no-store");
      for(const query of ["?ownerId=forged","?stage=UNKNOWN","?scope=everyone"])assert.equal((await a.request(undefined,query)).status,400);
    });
    await check("lost response is accepted before an actual Next process restart",async()=>{
      lostCommand=command(3);const response=await a.request(lostCommand);assert.equal(response.status,200);await response.arrayBuffer();await stop();await start();
    });
    await check("authenticated cookie and exact receipt survive restart with no duplicate history",async()=>{
      const replay=await a.data<Mutation>(lostCommand);assert.equal(replay.duplicate,true);assert.equal(replay.appliedRevision,4);
      const detail=await a.data<Detail>(undefined,"/"+stageId);assert.equal(detail.history.length,2);assert.equal(detail.current?.id,replay.submissionId);
    });
    await check("account and member revocation reject still-authenticated reads and replays",async()=>{
      await db.user.update({where:{id:owner.id},data:{flagged:true}});
      try{assert.equal((await a.request(lostCommand)).status,403);assert.equal((await a.request()).status,403);}finally{await db.user.update({where:{id:owner.id},data:{flagged:false}});}
      await db.teamMember.update({where:{teamId_userId:{teamId:team.id,userId:owner.id}},data:{status:"LEFT"}});
      try{assert.equal((await a.request(lostCommand)).status,403);assert.equal((await a.data<Stages>()).stages.length,0);}finally{await db.teamMember.update({where:{teamId_userId:{teamId:team.id,userId:owner.id}},data:{status:"ACTIVE"}});}
    });
    await check("submission operations leave quota, XP, approval and publications unchanged",async()=>{
      for(const user of [owner,teammate,admin,staff,fullStaff]){
        const row=await db.user.findUniqueOrThrow({where:{id:user.id},select:{quotaPoints:true,xp:true}});assert.deepEqual(row,{quotaPoints:101,xp:0});
        assert.equal(await db.quotaLedger.count({where:{userId:user.id}}),0);assert.equal(await db.xpLedger.count({where:{userId:user.id}}),0);
      }
      const row=await db.teamCompetition.findUniqueOrThrow({where:{id:entry.id}});assert.equal(row.entryStatus,"REGISTERED");assert.equal(row.publicConsent,false);assert.equal(row.submissionVersionId,null);
      assert.equal(await db.artifactPublication.count({where:{artifactVersionId:{in:[own.artifactVersionId,privateMember.artifactVersionId]}}}),0);
    });
    await writeFile(reportDir+"/http-fixture.json",JSON.stringify({localFixtureOnly:true,origin,competitionId:competition.id,owner,teammate,admin,staff,fullStaff,stageId},null,2));
    current="complete";
  }finally{
    await stop();await db.$disconnect();const file=reportDir+"/http.json";
    try{await writeFile(file.replace(".json","-previous-"+Date.now()+".json"),await readFile(file));}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
    await writeFile(file,JSON.stringify({completed:current==="complete",current,actualNextHttp:true,actualCredentialsCsrf:true,syntheticAuthCookies:false,isolatedPostgres:true,nextProcessRestart:true,databaseRestart:false,retainedLocalFixtures:true,productionWrites:false,providerCalls:0,realFunds:false,checks},null,2));
  }
}
main().catch(error=>{console.error("[submission-http] FAILED "+(error instanceof Error?error.name+": "+error.message.replaceAll(process.env.DATABASE_URL??"[unused]","[isolated-db]").slice(0,500):"diagnostics withheld"));process.exitCode=1;});
