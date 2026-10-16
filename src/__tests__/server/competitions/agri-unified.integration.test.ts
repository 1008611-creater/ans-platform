// @vitest-environment node
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import wallCopy from "../../../../messages/agri-wall/zh.json";
vi.mock("next-intl/server", () => ({
  getLocale: async () => "zh",
  getTranslations: async () => (key: string, values?: Record<string,string>) => String(wallCopy[key as keyof typeof wallCopy]).replace(/\{(\w+)\}/g, (_, name: string) => values?.[name] ?? ""),
}));
import { db } from "@/lib/db";
import { executeAgriWorkspaceCommand, readAgriWorkspaceRules } from "@/server/competitions/agrihackathon/workspace";
import { prepareAgriStage, executeAgriSubmissionCommand, readAgriStage } from "@/server/competitions/agrihackathon/submissions";
import { claimAgriTeamCredits, getAgriTeamCredits } from "@/server/competitions/agrihackathon/credits";
import { debitQuota, refundQuota } from "@/server/quota/service";
import { executeAgriWallCommand, readAgriWall } from "@/server/competitions/agrihackathon/wall";
import { setMarketListingStar } from "@/server/marketplace/stars";
import { executeAgriJudgeScoreCommand } from "@/server/competitions/agrihackathon/reviews";
import { executeAgriRankingCommand, readAgriRankingManagement } from "@/server/competitions/agrihackathon/rankings";
import { readAgriPublicRankings } from "@/server/competitions/agrihackathon/publications";
import type { AgriRulesDraft } from "@/contracts/agri-workspace";

const enabled = process.env.ANS_AGRI_UNIFIED_VERIFY === "true";
const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
if (enabled && (url.hostname !== "127.0.0.1" || url.port !== "55437" || url.pathname !== "/ans_agri_unified_verify_20261016")) throw new Error("Isolated verification database required");
describe.skipIf(!enabled)("Agri unified PostgreSQL closure", () => {
 const prefix = "unified-" + randomUUID();
 const users: Array<{ id:string }> = [];
 let edition: string, ruleId: string, teamId: string, entryId: string, projectId:string, versionId:string, stageId:string, submissionId:string, listingId:string, latestRevision:number;
 let rejected: { entryId:string; projectId:string; versionId:string };
 let registration: {opensAt:string;closesAt:string}, preliminary: {opensAt:string;closesAt:string}, final: {opensAt:string;closesAt:string};
 const clock = async () => (await db.$queryRaw<Array<{now:Date}>>`SELECT clock_timestamp() AS now`)[0].now;
 const waitPast = async (at:string) => { const ms = new Date(at).getTime() - (await clock()).getTime(); if(ms > 0) await new Promise(resolve=>setTimeout(resolve,ms+50)); };
 beforeAll(async () => {
  for(let i=0;i<12;i++) users.push(await db.user.create({data:{username:prefix+"-"+i,email:prefix+"-"+i+"@example.invalid",quotaPoints:99},select:{id:true}}));
  edition=(await db.competition.create({data:{title:prefix,status:"ONGOING"},select:{id:true}})).id;
  process.env.ANS_AGRIHACKATHON_COMPETITION_ID=edition;
  // A rejected legacy registration is created before the managed workspace boundary.
  const rejectedTeam=await db.team.create({data:{name:prefix+" rejected",slug:prefix+"-rejected",ownerId:users[11].id},select:{id:true}});
  await db.teamMember.create({data:{teamId:rejectedTeam.id,userId:users[11].id,role:"OWNER"}});
  const rejectedEntry=await db.teamCompetition.create({data:{teamId:rejectedTeam.id,competitionId:edition,entryStatus:"REJECTED"},select:{id:true}});
  const rejectedProject=await db.project.create({data:{ownerId:users[11].id,teamId:rejectedTeam.id,title:"Rejected legacy entry",goal:"CONTEST",status:"ACTIVE"},select:{id:true}});
  const rejectedArtifact=await db.artifact.create({data:{projectId:rejectedProject.id,workflowId:"rejected-fixture",kind:"PROJECT_ONE_PAGER",title:"Rejected",createdById:users[11].id},select:{id:true}});
  const rejectedVersion=await db.artifactVersion.create({data:{artifactId:rejectedArtifact.id,version:1,contentJson:{},contentMarkdown:"Private rejected",factSnapshotHash:"synthetic",createdById:users[11].id},select:{id:true}});
  rejected={entryId:rejectedEntry.id,projectId:rejectedProject.id,versionId:rejectedVersion.id};
  await db.$executeRaw`INSERT INTO agri_workspaces(id,"competitionId") VALUES(${randomUUID()},${edition})`;
  for(const scope of ["RULES_CONFIRM","PUBLICATIONS_REVIEW","WORKS_READ"]) await db.$executeRaw`INSERT INTO agri_access_grants(id,"competitionId","userId",scope,"grantedById","grantedAt") VALUES(${randomUUID()},${edition},${users[1].id},${scope},${users[1].id},clock_timestamp())`;
  for(const judge of users.slice(2,9)) for(const scope of ["TECHNICAL_WRITE","WORKS_READ"]) await db.$executeRaw`INSERT INTO agri_access_grants(id,"competitionId","userId",scope,"grantedById","grantedAt") VALUES(${randomUUID()},${edition},${judge.id},${scope},${judge.id},clock_timestamp())`;
  const now=await clock();registration={opensAt:new Date(now.getTime()-60_000).toISOString(),closesAt:new Date(now.getTime()+60_000).toISOString()};
  preliminary={opensAt:new Date(now.getTime()-30_000).toISOString(),closesAt:new Date(now.getTime()+20_000).toISOString()};
  final={opensAt:new Date(now.getTime()+20_050).toISOString(),closesAt:new Date(now.getTime()+40_000).toISOString()};
  const draft:AgriRulesDraft={schemaVersion:1,guidanceMarkdown:"Synthetic local rules only",requirements:{schemaVersion:1,computeGrantPoints:100,repositoryRequired:false,repositoryRefRequired:false,demoRequired:false,materials:[]},windows:(["REGISTRATION","PRELIMINARY","FINAL"] as const).map(stage=>({stage,state:"READY" as const,...(stage==="REGISTRATION"?registration:stage==="PRELIMINARY"?preliminary:final),includesDeadline:false}))};
  let revision=(await readAgriWorkspaceRules(users[1].id)).revision;
  await executeAgriWorkspaceCommand(users[1].id,{action:"saveRulesDraft",idempotencyKey:randomUUID(),expectedRevision:revision++,draft});
  const confirmed=await executeAgriWorkspaceCommand(users[1].id,{action:"confirmRules",idempotencyKey:randomUUID(),expectedRevision:revision++});ruleId=confirmed.resourceId;
  await executeAgriWorkspaceCommand(users[1].id,{action:"publishRules",idempotencyKey:randomUUID(),expectedRevision:revision++,ruleVersionId:ruleId});
  await executeAgriWorkspaceCommand(users[1].id,{action:"setEnabled",idempotencyKey:randomUUID(),expectedRevision:revision,enabled:true});
  teamId=(await db.team.create({data:{name:prefix,slug:prefix,ownerId:users[0].id},select:{id:true}})).id;
  await db.teamMember.create({data:{teamId,userId:users[0].id,role:"OWNER"}});
  entryId=(await db.teamCompetition.create({data:{teamId,competitionId:edition},select:{id:true}})).id;
  projectId=(await db.project.create({data:{ownerId:users[0].id,teamId,title:"Synthetic project",goal:"CONTEST",status:"ACTIVE"},select:{id:true}})).id;
  const artifact=await db.artifact.create({data:{projectId,workflowId:"synthetic-local",kind:"PROJECT_ONE_PAGER",title:"Private artifact",createdById:users[0].id},select:{id:true}});
  versionId=(await db.artifactVersion.create({data:{artifactId:artifact.id,version:1,contentJson:{secret:"PRIVATE_ARTIFACT_NEVER_PUBLIC"},contentMarkdown:"PRIVATE_ARTIFACT_NEVER_PUBLIC",factSnapshotHash:"synthetic",createdById:users[0].id},select:{id:true}})).id;
  stageId=(await prepareAgriStage(users[0].id,{action:"prepareStage",teamCompetitionId:entryId,stage:"PRELIMINARY"})).entryStageId;
 },30_000);
 afterAll(async () => { await db.$disconnect(); });
 it("grants once under concurrent claims, spends and refunds from the event wallet",async()=>{
  const claims=await Promise.all([claimAgriTeamCredits(users[0].id,entryId),claimAgriTeamCredits(users[0].id,entryId)]);expect(claims.map(x=>x.remaining)).toEqual([100,100]);
  const [count]=await db.$queryRaw<Array<{count:number}>>`SELECT count(*)::integer AS count FROM agri_team_compute_grants WHERE "teamCompetitionId"=${entryId}`;expect(count.count).toBe(1);
  const workflow=await db.workflow.create({data:{slug:prefix,title:"Synthetic",authorId:users[0].id},select:{id:true}});
  const version=await db.workflowVersion.create({data:{workflowId:workflow.id,version:1,definition:{},createdById:users[0].id},select:{id:true}});
  const run=await db.workflowRun.create({data:{workflowId:workflow.id,versionId:version.id,userId:users[0].id,projectId,input:{}},select:{id:true}});
  const charge={userId:users[0].id,costPoints:1.234567,ref:{type:"workflow_run",id:run.id},note:"Synthetic event charge"};
  await Promise.all([db.$transaction(tx=>debitQuota(tx,charge)),db.$transaction(tx=>debitQuota(tx,charge))]);
  expect((await getAgriTeamCredits(users[0].id,entryId)).remaining).toBe(98.765433);
  expect((await db.user.findUniqueOrThrow({where:{id:users[0].id},select:{quotaPoints:true}})).quotaPoints).toBe(99);
  await db.$transaction(tx=>refundQuota(tx,charge));await db.$transaction(tx=>refundQuota(tx,charge));
  expect((await getAgriTeamCredits(users[0].id,entryId)).remaining).toBe(100);
  await expect(claimAgriTeamCredits(users[9].id,entryId)).rejects.toThrow("AGRI_TEAM_PERMISSION_REQUIRED");
 });
 it("rejects a previously rejected team without creating submissions or public listings",async()=>{
  const stage=await prepareAgriStage(users[11].id,{action:"prepareStage",teamCompetitionId:rejected.entryId,stage:"PRELIMINARY"});
  await expect(executeAgriSubmissionCommand(users[11].id,{action:"submit",entryStageId:stage.entryStageId,expectedRevision:1,expectedRuleVersionId:ruleId,idempotencyKey:randomUUID(),officialMemberIds:[users[11].id],content:{projectId:rejected.projectId,artifactVersionId:rejected.versionId,repository:null,demoUrl:null,summary:"Rejected submission",materials:{schemaVersion:1,items:[]}}})).rejects.toThrow("AGRI_TEAM_PERMISSION_REQUIRED");
  expect(await db.marketListing.count({where:{sellerId:users[11].id}})).toBe(0);
 });
 it("submits and publishes exactly one safe wall snapshot without a second form",async()=>{
  const command={action:"submit",entryStageId:stageId,expectedRevision:1,expectedRuleVersionId:ruleId,idempotencyKey:randomUUID(),officialMemberIds:[users[0].id],content:{projectId,artifactVersionId:versionId,repository:null,demoUrl:"https://example.invalid/demo",summary:"Public submitted summary",materials:{schemaVersion:1,items:[{key:"private-notes",kind:"TEXT",text:"PRIVATE_MATERIAL_NEVER_PUBLIC"}]}}};
  // Optional materials must also be declared by the actual rule; keep this submission conformant.
  command.content.materials.items=[];
  const result=await executeAgriSubmissionCommand(users[0].id,command);expect(result.wallSync.state).toBe("SYNCED");
  submissionId=result.submissionId!;latestRevision=result.appliedRevision;
  const replay=await executeAgriSubmissionCommand(users[0].id,command);expect(replay.duplicate).toBe(true);expect(replay.wallSync).toEqual(result.wallSync);
  const view=await readAgriWall();expect(view.entries).toHaveLength(1);listingId=view.entries[0].offer.id;
  expect(JSON.stringify(view)).not.toContain("PRIVATE_ARTIFACT_NEVER_PUBLIC");expect(view.entries[0].offer.listing.priceMinor).toBe(0);
  const [revisions]=await db.$queryRaw<Array<{count:number}>>`SELECT count(*)::integer AS count FROM market_listing_versions WHERE "listingId"=${listingId}`;expect(revisions.count).toBe(1);
 });
 it("counts a single Star atomically, excludes own-team votes and closes first-time binding",async()=>{
  const now=await clock(),opensAt=new Date(now.getTime()+300),closesAt=new Date(now.getTime()+2200);
  await setMarketListingStar(listingId,users[9].id,{starred:true});
  await executeAgriWallCommand(users[1].id,{action:"configurePopularity",expectedRevision:0,opensAt:opensAt.toISOString(),closesAt:closesAt.toISOString()});
  await waitPast(opensAt.toISOString());
  await Promise.all([setMarketListingStar(listingId,users[9].id,{starred:true}),setMarketListingStar(listingId,users[9].id,{starred:true})]);
  await setMarketListingStar(listingId,users[0].id,{starred:true});expect((await readAgriWall()).entries[0].validStars).toBe(1);
  const result=await executeAgriSubmissionCommand(users[0].id,{action:"submit",entryStageId:stageId,expectedRevision:latestRevision,expectedRuleVersionId:ruleId,idempotencyKey:randomUUID(),content:{projectId,artifactVersionId:versionId,repository:null,demoUrl:"https://example.invalid/demo",summary:"Updated public summary",materials:{schemaVersion:1,items:[]}}});
  submissionId=result.submissionId!;latestRevision=result.appliedRevision;expect(result.wallSync.state).toBe("SYNCED");
  const otherTeam=await db.team.create({data:{name:prefix+"B",slug:prefix+"-b",ownerId:users[10].id},select:{id:true}});await db.teamMember.create({data:{teamId:otherTeam.id,userId:users[10].id,role:"OWNER"}});
  const otherEntry=await db.teamCompetition.create({data:{teamId:otherTeam.id,competitionId:edition},select:{id:true}});
  const project=await db.project.create({data:{ownerId:users[10].id,teamId:otherTeam.id,title:"Late first binding",goal:"CONTEST",status:"ACTIVE"},select:{id:true}});
  const artifact=await db.artifact.create({data:{projectId:project.id,workflowId:"late-synthetic",kind:"PROJECT_ONE_PAGER",title:"Late",createdById:users[10].id},select:{id:true}});
  const av=await db.artifactVersion.create({data:{artifactId:artifact.id,version:1,contentJson:{},contentMarkdown:"Private late",factSnapshotHash:"synthetic",createdById:users[10].id},select:{id:true}});
  const stage=await prepareAgriStage(users[10].id,{action:"prepareStage",teamCompetitionId:otherEntry.id,stage:"PRELIMINARY"});
  const late=await executeAgriSubmissionCommand(users[10].id,{action:"submit",entryStageId:stage.entryStageId,expectedRevision:1,expectedRuleVersionId:ruleId,idempotencyKey:randomUUID(),officialMemberIds:[users[10].id],content:{projectId:project.id,artifactVersionId:av.id,repository:null,demoUrl:null,summary:"Late entry",materials:{schemaVersion:1,items:[]}}});expect(late.wallSync.state).toBe("BINDING_CLOSED");
  const privateCommand={action:"submit",entryStageId:stage.entryStageId,expectedRevision:late.appliedRevision,expectedRuleVersionId:ruleId,idempotencyKey:randomUUID(),syncToAgriWall:false,content:{projectId:project.id,artifactVersionId:av.id,repository:null,demoUrl:null,summary:"Private stage only",materials:{schemaVersion:1,items:[]}}};
  const privateOnly=await executeAgriSubmissionCommand(users[10].id,privateCommand);expect(privateOnly.wallSync.state).toBe("NOT_REQUESTED");
  const [walls]=await db.$queryRaw<Array<{count:number}>>`SELECT count(*)::integer AS count FROM agri_wall_entries WHERE "teamCompetitionId"=${otherEntry.id}`;expect(walls.count).toBe(0);
  const privateReplay=await executeAgriSubmissionCommand(users[10].id,privateCommand);expect(privateReplay.duplicate).toBe(true);
  await waitPast(closesAt.toISOString());expect((await readAgriWall()).round?.state).toBe("CLOSED");
  await setMarketListingStar(listingId,users[9].id,{starred:false});expect((await readAgriWall()).entries[0].validStars).toBe(1);
 },10_000);
 it("uses frozen 3-judge results for confirmed finalists and 7-judge trimmed final results",async()=>{
  await waitPast(preliminary.closesAt);
  const panel=users.slice(2,5).map(u=>u.id);
  await executeAgriRankingCommand(users[1].id,{action:"configurePanel",stage:"PRELIMINARY",judgeIds:panel,idempotencyKey:randomUUID()});
  // A saved submission without an eligible public wall entry cannot enter official rankings.
  const initial=await readAgriRankingManagement(users[1].id,"PRELIMINARY");expect(initial.items).toHaveLength(1);
  for(const candidate of initial.items) for(const judge of panel) await executeAgriJudgeScoreCommand(judge,{action:"recordScore",submissionId:candidate.submissionId,idempotencyKey:randomUUID(),dimensions:{innovation:80,technical:80,completeness:80,problem:80,fit:80}});
  const prelim=await readAgriRankingManagement(users[1].id,"PRELIMINARY");expect(prelim.ready).toBe(true);expect(prelim.items.find(row=>row.submissionId===submissionId)?.totalScore).toBe(84);
  const confirmation=await executeAgriRankingCommand(users[1].id,{action:"confirmRanking",stage:"PRELIMINARY",sourceHash:prelim.sourceHash,orderedEntryIds:prelim.items.map(row=>row.entryStageId),technicalEntryId:null,creativeEntryId:null,idempotencyKey:randomUUID()});
  expect((await readAgriStage(users[0].id,stageId)).finalEligibility?.state).toBe("ELIGIBLE");
  const boards=await readAgriPublicRankings();expect(boards.boards[0].items[0].totalScore).toBe(84);expect(JSON.stringify(boards)).not.toContain("PRIVATE_ARTIFACT");
  const finalStage=await prepareAgriStage(users[0].id,{action:"prepareStage",teamCompetitionId:entryId,stage:"FINAL"});
  const result=await executeAgriSubmissionCommand(users[0].id,{action:"submit",entryStageId:finalStage.entryStageId,expectedRevision:1,expectedRuleVersionId:ruleId,idempotencyKey:randomUUID(),content:{projectId,artifactVersionId:versionId,repository:null,demoUrl:"https://example.invalid/demo",summary:"Final public summary",materials:{schemaVersion:1,items:[]}}});
  await waitPast(final.closesAt);
  await executeAgriRankingCommand(users[1].id,{action:"configurePanel",stage:"FINAL",judgeIds:users.slice(2,9).map(u=>u.id),idempotencyKey:randomUUID()});
  for(const [index,judge] of users.slice(2,9).entries()){const score=[0,60,70,80,90,100,100][index];await executeAgriJudgeScoreCommand(judge.id,{action:"recordScore",submissionId:result.submissionId,idempotencyKey:randomUUID(),dimensions:{innovation:score,technical:score,completeness:score,problem:score,fit:score}});}
  const finalView=await readAgriRankingManagement(users[1].id,"FINAL");expect(finalView.items[0].totalScore).toBe(80);
  await executeAgriRankingCommand(users[1].id,{action:"confirmRanking",stage:"FINAL",sourceHash:finalView.sourceHash,orderedEntryIds:finalView.items.map(row=>row.entryStageId),technicalEntryId:finalStage.entryStageId,creativeEntryId:null,idempotencyKey:randomUUID()});
  const finalBoards=await readAgriPublicRankings();const finalBoard=finalBoards.boards.find(row=>row.stage==="FINAL")!;expect(finalBoard.items[0].prizeMinor).toBe(150000);expect(finalBoard.items[0].awards).toContain("FIRST");
  await expect(db.$executeRaw`UPDATE agri_judge_scores SET dimensions='{}'::jsonb WHERE "competitionId"=${edition}`).rejects.toThrow();
  await executeAgriRankingCommand(users[1].id,{action:"withdrawRanking",stage:"PRELIMINARY",publicationId:confirmation.publicationId,reason:"Synthetic withdrawal",idempotencyKey:randomUUID()});
  expect((await readAgriPublicRankings()).boards.some(row=>row.stage==="PRELIMINARY")).toBe(false);
 },40_000);
});