import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { db,type DbTransaction } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriRankingStageSchema,agriRankingCommandSchema,agriScoreDimensionsSchema,type AgriRankingManagement,type AgriRankingCandidate } from "@/contracts/agri-rankings";
import { lockAgriWorkspace,requireAgriScope,assertAgriAuthorityCurrent,agriDatabaseClock,type AgriWorkspaceContext } from "./workspace";
import { lockPopularityRound,freezePopularityRound } from "./popularity";
import { agriProfessionalScore,agriPublicScore,agriRankTotals,agriValidateConfirmedOrder,agriRankingFraction,agriCompareFractions,type AgriScoreFraction } from "./scoring";

import { projectAgriStageFreeze } from "./submissions";
type Tx=DbTransaction;
type Stage="PRELIMINARY"|"FINAL";
const hash=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const fail=(code:string,status=409):never=>{throw new AgriWorkspaceError(code,status);};
export interface RankingEvent {id:string;competitionId:string;stage:Stage;action:"PANEL"|"CONFIRM"|"WITHDRAW";snapshot:unknown;sourceHash:string;createdAt:Date;requestHash:string}
export async function latestAgriRankingEvent(tx:Tx,competitionId:string,stage:Stage,actions:string[]=["CONFIRM","WITHDRAW"]){
 const rows=actions.length===1&&actions[0]==="PANEL"?await tx.$queryRaw<RankingEvent[]>`SELECT * FROM agri_ranking_publications WHERE "competitionId"=${competitionId} AND stage=${stage} AND action='PANEL' ORDER BY "createdAt" DESC,id DESC LIMIT 1`:await tx.$queryRaw<RankingEvent[]>`SELECT * FROM agri_ranking_publications WHERE "competitionId"=${competitionId} AND stage=${stage} AND action IN('CONFIRM','WITHDRAW') ORDER BY "createdAt" DESC,id DESC LIMIT 1`;
 return rows.find(row=>actions.includes(row.action))??null;
}
export async function agriJudgePanel(tx:Tx,competitionId:string,stage:Stage):Promise<string[]> {
 const event=await latestAgriRankingEvent(tx,competitionId,stage,["PANEL"]);
 return event?z.object({judgeIds:z.array(z.string())}).parse(event.snapshot).judgeIds:[];
}
interface Entry{entryStageId:string;teamCompetitionId:string;teamId:string;teamName:string;submissionId:string;artifactVersionId:string;stage:Stage;currentSubmissionId:string|null;frozenSubmissionId:string|null}
export async function agriRankingCandidates(tx:Tx,ctx:AgriWorkspaceContext,stage:Stage) {
 const competitionId=ctx.workspace.competitionId,panel=await agriJudgePanel(tx,competitionId,stage);
 const round=await lockPopularityRound(tx,competitionId);if(round)await freezePopularityRound(tx,round);
 const results=round?.frozenAt?z.array(z.object({entryId:z.string(),votes:z.number().int().nonnegative(),winner:z.boolean()})).parse(round.results):null;
 const wallEntries=await tx.$queryRaw<Array<{id:string;teamCompetitionId:string;listingId:string;artifactVersionId:string;listingVersion:number}>>`SELECT id,"teamCompetitionId","listingId","artifactVersionId","listingVersion" FROM agri_wall_entries WHERE "competitionId"=${competitionId}`;
 const entries=await tx.$queryRaw<Entry[]>`SELECT es.id AS "entryStageId",es."teamCompetitionId",tc."teamId",t.name AS "teamName",es.stage,es."currentSubmissionId",es."frozenSubmissionId",COALESCE(es."frozenSubmissionId",es."currentSubmissionId") AS "submissionId",s."artifactVersionId" FROM agri_entry_stages es JOIN team_competitions tc ON tc.id=es."teamCompetitionId" JOIN teams t ON t.id=tc."teamId" JOIN agri_wall_entries public_wall ON public_wall."teamCompetitionId"=tc.id AND public_wall."competitionId"=es."competitionId" JOIN market_listings public_listing ON public_listing.id=public_wall."listingId" AND public_listing.status='PUBLISHED' JOIN market_listing_versions public_version ON public_version."listingId"=public_listing.id AND public_version.version=public_listing."publishedVersion" AND public_version."reviewedAt" IS NOT NULL AND public_version.payload->>'category'='competition' AND public_version.payload->>'subcategory'='agri-wall' JOIN users public_seller ON public_seller.id=public_listing."sellerId" AND NOT public_seller.flagged AND public_seller."deletedAt" IS NULL JOIN agri_stage_submissions s ON s.id=COALESCE(es."frozenSubmissionId",es."currentSubmissionId") WHERE es."competitionId"=${competitionId} AND es.stage=${stage} AND tc."entryStatus"<>'REJECTED' ORDER BY es.id FOR SHARE OF es,tc,s,public_wall,public_listing,public_version,public_seller`;
 const fractions=new Map<string,AgriScoreFraction>();
 const maximum=results?Math.max(0,...results.map(row=>row.votes)):0;
 const items:AgriRankingCandidate[]=[],sources:Array<{entryStageId:string;submissionId:string;artifactVersionId:string;scoreIds:string[];wallId:string|null;wallVersion:number|null;wallArtifactVersionId:string|null;votes:number}>=[];
 let incompleteFreeze=false;
 for(const entry of entries){
  const freeze=await projectAgriStageFreeze(tx,{...entry,id:entry.entryStageId,competitionId},await agriDatabaseClock(tx));
  if(!freeze.frozenSubmissionId){incompleteFreeze=true;}
  const submissionId=freeze.frozenSubmissionId??entry.submissionId;
  const scores=await tx.$queryRaw<Array<{id:string;judgeId:string;dimensions:unknown}>>`SELECT id,"judgeId",dimensions FROM agri_judge_scores WHERE "competitionId"=${competitionId} AND "submissionId"=${submissionId} ORDER BY "judgeId"`;
  const accepted=scores.filter(score=>panel.includes(score.judgeId));
  const ballots=accepted.map(score=>({...score,dimensions:agriScoreDimensionsSchema.parse(score.dimensions)}));
  const professionalScore=agriProfessionalScore(stage,ballots);
  const wall=wallEntries.find(w=>w.teamCompetitionId===entry.teamCompetitionId),votes=wall?results?.find(r=>r.entryId===wall.id)?.votes??0:0;
  const fraction=agriRankingFraction(stage,ballots,votes,maximum);if(fraction)fractions.set(entry.entryStageId,fraction);
  sources.push({entryStageId:entry.entryStageId,submissionId,artifactVersionId:entry.artifactVersionId,scoreIds:accepted.map(s=>s.id),wallId:wall?.id??null,wallVersion:wall?.listingVersion??null,wallArtifactVersionId:wall?.artifactVersionId??null,votes});
  items.push({entryStageId:entry.entryStageId,teamCompetitionId:entry.teamCompetitionId,submissionId,teamName:entry.teamName,judgeCount:accepted.length,requiredJudges:stage==="PRELIMINARY"?3:7,professionalScore,validStars:results?votes:null,publicScore:null,totalScore:null,rank:null});
 }

 for(const item of items){item.publicScore=results?agriPublicScore(item.validStars!,maximum):null;item.totalScore=item.professionalScore===null?null:stage==="FINAL"?item.professionalScore:item.publicScore===null?null:item.professionalScore*.8+item.publicScore*.2;}
 const blockedReasons:string[]=[];
 if(!panel.length)blockedReasons.push("AGRI_RANKING_PANEL_REQUIRED");if(!results)blockedReasons.push("AGRI_RANKING_VOTES_NOT_FROZEN");if(!entries.length)blockedReasons.push("AGRI_RANKING_NO_ENTRIES");if(incompleteFreeze)blockedReasons.push("AGRI_SCORE_FROZEN_SUBMISSION_REQUIRED");if(items.some(item=>item.professionalScore===null))blockedReasons.push("AGRI_RANKING_JUDGES_INCOMPLETE");
 const compare=(a:AgriRankingCandidate,b:AgriRankingCandidate)=>{const av=fractions.get(a.entryStageId),bv=fractions.get(b.entryStageId);return av&&bv?agriCompareFractions(av,bv):av?1:bv?-1:0;};
 return {items:agriRankTotals(items,compare),compare,ready:blockedReasons.length===0,blockedReasons,sourceHash:hash({stage,panel,roundId:round?.id,roundRevision:round?.revision,frozenAt:round?.frozenAt?.toISOString(),sources}),results,wallEntries,sources};
}
export async function readAgriRankingManagement(actorId:string,rawStage:unknown):Promise<AgriRankingManagement>{
 const stage=agriRankingStageSchema.parse(rawStage);
 return db.$transaction(async tx=>{const ctx=await lockAgriWorkspace(tx,actorId);let score=null,publication=null;
 try{score=await requireAgriScope(tx,ctx,"TECHNICAL_WRITE");}catch(error){if(!(error instanceof AgriWorkspaceError)||error.code!=="AGRI_SCOPE_REQUIRED")throw error;}
 try{publication=await requireAgriScope(tx,ctx,"PUBLICATIONS_REVIEW");}catch(error){if(!(error instanceof AgriWorkspaceError)||error.code!=="AGRI_SCOPE_REQUIRED")throw error;}
 if(!score&&!publication)return fail("AGRI_SCOPE_REQUIRED",403);
 const works=score?await requireAgriScope(tx,ctx,"WORKS_READ"):null;
 const panel=await agriJudgePanel(tx,ctx.workspace.competitionId,stage);
 const view=await agriRankingCandidates(tx,ctx,stage),latest=await latestAgriRankingEvent(tx,ctx.workspace.competitionId,stage);
 await assertAgriAuthorityCurrent(tx,score,publication,works);
 return {competitionId:ctx.workspace.competitionId,stage,canScore:!!score&&panel.includes(actorId)&&ctx.workspace.enabled,canConfirm:!!publication&&ctx.workspace.enabled,panelJudgeIds:publication?panel:[],sourceHash:publication?view.sourceHash:"",ready:!!publication&&view.ready,blockedReasons:publication?view.blockedReasons:[],items:publication?view.items:view.items.map(item=>({...item,professionalScore:null,publicScore:null,totalScore:null,rank:null})),publicationId:latest?.action==="CONFIRM"?latest.id:null};
 },{timeout:20000});
}
export async function executeAgriRankingCommand(actorId:string,raw:unknown){
 const command=agriRankingCommandSchema.parse(raw);
 return db.$transaction(async tx=>{const ctx=await lockAgriWorkspace(tx,actorId),authority=await requireAgriScope(tx,ctx,"PUBLICATIONS_REVIEW");if(!ctx.workspace.enabled)return fail("AGRI_WORKSPACE_DISABLED");
 const eligibilityAuthority=command.stage==="PRELIMINARY"&&command.action!=="configurePanel"?await requireAgriScope(tx,ctx,"RULES_CONFIRM"):null;
 const panelAuthorities:Array<Awaited<ReturnType<typeof requireAgriScope>>>=[];
 const qualificationChanges:Array<{entryId:string;state:"ELIGIBLE"|"INELIGIBLE"}>=[];
 const requestHash=hash(command),competitionId=ctx.workspace.competitionId;
 const [prior]=await tx.$queryRaw<RankingEvent[]>`SELECT * FROM agri_ranking_publications WHERE "competitionId"=${competitionId} AND "actorId"=${actorId} AND "idempotencyKey"=${command.idempotencyKey}`;
 if(prior){if(prior.requestHash!==requestHash)return fail("AGRI_IDEMPOTENCY_CONFLICT");await assertAgriAuthorityCurrent(tx,authority,eligibilityAuthority);return {publicationId:prior.id,duplicate:true};}
 const latest=await latestAgriRankingEvent(tx,competitionId,command.stage);let snapshot:unknown,sourceHash="",previousId=latest?.id??null;
 if(command.action==="configurePanel"){
  const already=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM agri_judge_scores WHERE "competitionId"=${competitionId} AND stage=${command.stage} LIMIT 1`;
  if(already.length||latest)return fail("AGRI_RANKING_PANEL_LOCKED");
  if(command.judgeIds.length!==(command.stage==="PRELIMINARY"?3:7)||new Set(command.judgeIds).size!==command.judgeIds.length)return fail("AGRI_RANKING_PANEL_INVALID",422);
  for(const judgeId of command.judgeIds){panelAuthorities.push(await requireAgriScope(tx,{...ctx,actorId:judgeId},"TECHNICAL_WRITE"));panelAuthorities.push(await requireAgriScope(tx,{...ctx,actorId:judgeId},"WORKS_READ"));const [self]=await tx.$queryRaw<Array<{blocked:boolean}>>`SELECT EXISTS(SELECT 1 FROM team_competitions tc JOIN team_members tm ON tm."teamId"=tc."teamId" WHERE tc."competitionId"=${competitionId} AND tc."entryStatus"<>'REJECTED' AND tm."userId"=${judgeId} AND tm.status='ACTIVE') OR EXISTS(SELECT 1 FROM agri_official_roster_members m JOIN agri_official_rosters r ON r.id=m."rosterId" WHERE r."competitionId"=${competitionId} AND m."userId"=${judgeId}) AS blocked`;if(self?.blocked)return fail("AGRI_SCORE_INDEPENDENT_JUDGE_REQUIRED",403);}
  snapshot={judgeIds:command.judgeIds};sourceHash=hash(snapshot);previousId=(await latestAgriRankingEvent(tx,competitionId,command.stage,["PANEL"]))?.id??null;
 }else if(command.action==="withdrawRanking"){
  if(latest?.action!=="CONFIRM"||latest.id!==command.publicationId)return fail("AGRI_RANKING_REVISION_CONFLICT");snapshot={reason:command.reason};
  if(command.stage==="PRELIMINARY"){for(const item of (latest.snapshot as {items:Array<{teamCompetitionId:string}>}).items){const [decision]=await tx.$queryRaw<Array<{state:string;sourceReference:string}>>`SELECT state,"sourceReference" FROM agri_final_decisions WHERE "competitionId"=${competitionId} AND "teamCompetitionId"=${item.teamCompetitionId} ORDER BY sequence DESC LIMIT 1`;if(decision?.state==="ELIGIBLE"&&decision.sourceReference==="ranking:"+latest.id)qualificationChanges.push({entryId:item.teamCompetitionId,state:"INELIGIBLE"});}}
 }else{
  if(latest?.action==="CONFIRM")return fail("AGRI_RANKING_ALREADY_CONFIRMED");
  const candidates=await agriRankingCandidates(tx,ctx,command.stage);if(!candidates.ready)return fail(candidates.blockedReasons[0]);if(candidates.sourceHash!==command.sourceHash)return fail("AGRI_RANKING_SOURCE_CHANGED");
  if(!agriValidateConfirmedOrder(candidates.items,command.orderedEntryIds,command.stage==="PRELIMINARY"?10:candidates.items.length,candidates.compare))return fail("AGRI_RANKING_ORDER_INVALID",422);
  if(command.stage==="PRELIMINARY"&&(command.technicalEntryId||command.creativeEntryId))return fail("INVALID_INPUT",422);
  if([command.technicalEntryId,command.creativeEntryId].some(id=>id&&!command.orderedEntryIds.includes(id)))return fail("AGRI_RANKING_AWARD_INVALID",422);
  if(command.stage==="PRELIMINARY")for(const item of candidates.items)qualificationChanges.push({entryId:item.teamCompetitionId,state:command.orderedEntryIds.includes(item.entryStageId)?"ELIGIBLE":"INELIGIBLE"});
  const popularityAwards:Array<{entryStageId:string;submissionId:string;artifactVersionId:string;listingId:string;listingVersion:number;validStars:number}>=[];
  if(command.stage==="FINAL")for(const winner of candidates.results??[]){if(!winner.winner)continue;const wall=candidates.wallEntries.find(item=>item.id===winner.entryId);if(!wall)continue;const [submitted]=await tx.$queryRaw<Array<{entryStageId:string;submissionId:string}>>`SELECT s."entryStageId",s.id AS "submissionId" FROM agri_stage_submissions s JOIN agri_entry_stages es ON es.id=s."entryStageId" AND es."teamCompetitionId"=${wall.teamCompetitionId} WHERE s."competitionId"=${competitionId} AND s."artifactVersionId"=${wall.artifactVersionId} ORDER BY s."acceptedAt" DESC,s.id DESC LIMIT 1`;if(submitted)popularityAwards.push({...submitted,artifactVersionId:wall.artifactVersionId,listingId:wall.listingId,listingVersion:wall.listingVersion,validStars:winner.votes});}
  snapshot={popularityAwards,items:command.orderedEntryIds.map((id,index)=>{const item=candidates.items.find(row=>row.entryStageId===id)!;const wall=candidates.wallEntries.find(w=>w.teamCompetitionId===item.teamCompetitionId);const awards=command.stage==="PRELIMINARY"?["FINALIST"]:[...(index===0?["FIRST"]:index===1?["SECOND"]:index===2?["THIRD"]:[]),...(id===command.technicalEntryId?["TECHNICAL"]:[]),...(id===command.creativeEntryId?["CREATIVE"]:[])];const exactWall=wall&&candidates.sources.find(source=>source.submissionId===item.submissionId)?.artifactVersionId===wall.artifactVersionId?wall:null;return {...item,rank:index+1,artifactVersionId:exactWall?.artifactVersionId??null,listingId:exactWall?.listingId??null,listingVersion:exactWall?.listingVersion??null,awards,prizeMinor:command.stage==="FINAL"?(index===0?150000:index===1?100000:index===2?80000:0):0};})};sourceHash=candidates.sourceHash;
 }
 const id=randomUUID(),now=await agriDatabaseClock(tx),action=command.action==="configurePanel"?"PANEL":command.action==="confirmRanking"?"CONFIRM":"WITHDRAW";
 await tx.$executeRaw`INSERT INTO agri_ranking_publications(id,"competitionId",stage,action,"previousId",snapshot,"sourceHash","actorId","idempotencyKey","requestHash","createdAt") VALUES(${id},${competitionId},${command.stage},${action},${previousId},${JSON.stringify(snapshot)}::jsonb,${sourceHash},${actorId},${command.idempotencyKey},${requestHash},${now})`;
 for(const change of qualificationChanges){await tx.$queryRaw`SELECT id FROM team_competitions WHERE id=${change.entryId} AND "competitionId"=${competitionId} FOR UPDATE`;const [previous]=await tx.$queryRaw<Array<{sequence:number}>>`SELECT COALESCE(max(sequence),0)::integer AS sequence FROM agri_final_decisions WHERE "teamCompetitionId"=${change.entryId}`;await tx.$executeRaw`INSERT INTO agri_final_decisions(id,"competitionId","teamCompetitionId",sequence,state,reason,"sourceReference","actorId","decidedAt") VALUES(${randomUUID()},${competitionId},${change.entryId},${previous.sequence+1},${change.state},${action==="CONFIRM"?"AGRI_PRELIMINARY_RANKING_CONFIRMED":"AGRI_PRELIMINARY_RANKING_WITHDRAWN"},${"ranking:"+id},${actorId},${now})`;}
 await tx.auditLog.create({data:{actorId,action:"AGRI_RANKING_"+action,resourceType:"agri_ranking",resourceId:id,metadata:{competitionId,stage:command.stage,sourceHash}}});await assertAgriAuthorityCurrent(tx,authority,eligibilityAuthority,...panelAuthorities);return {publicationId:id,duplicate:false};
 },{timeout:25000});
}
