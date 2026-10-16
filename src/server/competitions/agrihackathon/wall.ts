import type { DbTransaction } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createHash,randomUUID } from "node:crypto";
import { agriWallCommandSchema,type AgriWallView,type AgriWallMine } from "@/contracts/agri-wall";
import { marketListingInputSchema } from "@/contracts/marketplace";
import type { MarketOfferView } from "@/contracts/marketplace-view";
import type { AgriStageSubmissionContent } from "@/contracts/agri-submissions";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { marketTransaction,requireMarketActor } from "@/server/marketplace/shared";
import { agriDatabaseClock,lockAgriWorkspace,requireAgriScope,assertAgriAuthorityCurrent,type AgriWorkspaceContext } from "./workspace";
import { bootstrapAgriEditionInTx,shouldAutoBootstrapAgriEdition } from "./bootstrap";
import { wallFailure,lockPopularityRound,popularityView,assertAgriListingRevision } from "./popularity";

interface WallRow {id:string;competitionId:string;teamCompetitionId:string;listingId:string;projectId:string;artifactVersionId:string;listingVersion:number}
interface PublicRow {id:string;slug:string;official:boolean;status:string;version:number;payload:unknown;sellerId:string;username:string;nickname:string|null;avatar:string|null;starCount:number;starred:boolean}
function offer(row:PublicRow):MarketOfferView {return {id:row.id,slug:row.slug,official:row.official,status:row.status,version:row.version,listing:marketListingInputSchema.parse(row.payload),seller:{id:row.sellerId,username:row.username,nickname:row.nickname,avatar:row.avatar},starCount:row.starCount,starred:row.starred,submittedAt:null,reviewedAt:null,reviewNote:null};}
async function publicOffers(tx:DbTransaction,competitionId:string,viewerId?:string) {
 return tx.$queryRaw<Array<PublicRow & {wallId:string;projectId:string;teamName:string;viewerEligible:boolean;viewerVoted:boolean}>>`SELECT l.id,l.slug,l.official,l.status,lv.version,lv.payload,l."sellerId",u.username,u.nickname,u.avatar,w.id AS "wallId",w."projectId",t.name AS "teamName",
  (EXISTS(SELECT 1 FROM users vu WHERE vu.id=${viewerId??""} AND NOT vu.flagged AND vu."deletedAt" IS NULL)
   AND l."sellerId"<>${viewerId??""}
   AND NOT EXISTS(SELECT 1 FROM team_members tm WHERE tm."teamId"=tc."teamId" AND tm."userId"=${viewerId??""} AND tm.status='ACTIVE')
   AND NOT EXISTS(SELECT 1 FROM agri_official_roster_members rm JOIN agri_official_rosters rr ON rr.id=rm."rosterId" WHERE rr."teamCompetitionId"=tc.id AND rm."userId"=${viewerId??""})) AS "viewerEligible",
  EXISTS(SELECT 1 FROM agri_popularity_votes pv JOIN agri_popularity_rounds pr ON pr.id=pv."roundId" WHERE pr."competitionId"=w."competitionId" AND pv."wallEntryId"=w.id AND pv."userId"=${viewerId??""}) AS "viewerVoted",
  (SELECT count(*)::integer FROM market_listing_stars ms WHERE ms."listingId"=l.id) AS "starCount",EXISTS(SELECT 1 FROM market_listing_stars ms WHERE ms."listingId"=l.id AND ms."userId"=${viewerId??""}) AS starred
  FROM agri_wall_entries w JOIN team_competitions tc ON tc.id=w."teamCompetitionId" JOIN teams t ON t.id=tc."teamId" JOIN market_listings l ON l.id=w."listingId" JOIN market_listing_versions lv ON lv."listingId"=l.id AND lv.version=l."publishedVersion" JOIN users u ON u.id=l."sellerId"
  WHERE w."competitionId"=${competitionId} AND l.status='PUBLISHED' AND NOT u.flagged AND u."deletedAt" IS NULL AND lv."reviewedAt" IS NOT NULL AND lv.payload->>'category'='competition' AND lv.payload->>'subcategory'='agri-wall' ORDER BY w."createdAt",w.id`;
}
export async function readAgriWall(viewerId?:string):Promise<AgriWallView> {
 const competitionId=process.env.ANS_AGRIHACKATHON_COMPETITION_ID?.trim();
 if(!competitionId) return {configured:false,competitionId:null,round:null,entries:[]};
 return marketTransaction(async tx=>{
  if(viewerId)await requireMarketActor(tx,viewerId);
  let workspace=await tx.agriWorkspace.findUnique({where:{competitionId},select:{id:true}});
  if(!workspace && shouldAutoBootstrapAgriEdition(competitionId)) {
   await bootstrapAgriEditionInTx(tx,{competitionId,silent:true});
   workspace=await tx.agriWorkspace.findUnique({where:{competitionId},select:{id:true}});
  }
  if(!workspace) return {configured:false,competitionId,round:null,entries:[]};
  const round=await popularityView(tx,await lockPopularityRound(tx,competitionId));
  const rows=await publicOffers(tx,competitionId,viewerId);
  return {configured:true,competitionId,round,entries:rows.map(row=>({id:row.wallId,teamName:row.teamName,projectId:row.projectId,offer:offer(row),validStars:round?.results.find(item=>item.entryId===row.wallId)?.votes??0,eligible:true,viewerEligible:viewerId ? row.viewerEligible : null,viewerVoted:row.viewerVoted}))};
 });
}
export async function readAgriWallMine(actorId:string):Promise<AgriWallMine> {
 return marketTransaction(async tx=>{
  const ctx=await lockAgriWorkspace(tx,actorId),competitionId=ctx.workspace.competitionId;
  const round=await popularityView(tx,await lockPopularityRound(tx,competitionId));
  let canConfigure=false;
  try{const grant=await requireAgriScope(tx,ctx,"RULES_CONFIRM");await assertAgriAuthorityCurrent(tx,grant);canConfigure=true;}catch(error){if(!(error instanceof AgriWorkspaceError)||error.code!=="AGRI_SCOPE_REQUIRED")throw error;}
  const rows=await tx.$queryRaw<Array<{id:string;teamName:string;wallId:string|null;listingId:string|null;projectId:string|null;artifactVersionId:string|null;title:string|null;published:boolean}>>`SELECT tc.id,t.name AS "teamName",w.id AS "wallId",w."listingId",w."projectId",w."artifactVersionId",coalesce(lv.payload->>'title',p.title) AS title,
   (l.status='PUBLISHED' AND NOT seller.flagged AND seller."deletedAt" IS NULL AND lv.payload->>'category'='competition' AND lv.payload->>'subcategory'='agri-wall') AS published
   FROM team_competitions tc JOIN teams t ON t.id=tc."teamId" JOIN team_members tm ON tm."teamId"=t.id AND tm."userId"=${actorId} AND tm.status='ACTIVE' AND tm.role IN ('OWNER','ADMIN')
   LEFT JOIN agri_official_rosters roster ON roster."teamCompetitionId"=tc.id LEFT JOIN projects roster_project ON roster_project.id=roster."projectId"
   LEFT JOIN agri_wall_entries w ON w."teamCompetitionId"=tc.id LEFT JOIN projects p ON p.id=w."projectId" LEFT JOIN market_listings l ON l.id=w."listingId" LEFT JOIN users seller ON seller.id=l."sellerId" LEFT JOIN market_listing_versions lv ON lv."listingId"=l.id AND lv.version=l."publishedVersion"
   WHERE tc."competitionId"=${competitionId} AND (w.id IS NULL OR p."ownerId"=${actorId}) AND (roster.id IS NULL OR roster_project."ownerId"=${actorId}) ORDER BY t.name,tc.id`;
  const listings=await tx.$queryRaw<PublicRow[]>`SELECT l.id,l.slug,l.official,l.status,lv.version,lv.payload,l."sellerId",u.username,u.nickname,u.avatar,
   (SELECT count(*)::integer FROM market_listing_stars ms WHERE ms."listingId"=l.id) AS "starCount",EXISTS(SELECT 1 FROM market_listing_stars ms WHERE ms."listingId"=l.id AND ms."userId"=${actorId}) AS starred
   FROM market_listings l JOIN market_listing_versions lv ON lv."listingId"=l.id AND lv.version=l."publishedVersion" JOIN users u ON u.id=l."sellerId"
   WHERE l."sellerId"=${actorId} AND l.status='PUBLISHED' AND lv."reviewedAt" IS NOT NULL AND lv.payload->>'category'='competition' AND lv.payload->>'subcategory'='agri-wall' ORDER BY l."updatedAt" DESC`;
  return {competitionId,entries:rows.map(row=>({id:row.id,teamName:row.teamName,wall:row.wallId ? {id:row.wallId,listingId:row.listingId!,projectId:row.projectId!,artifactVersionId:row.artifactVersionId!,title:row.title??row.teamName,published:Boolean(row.published)}:null})),listings:listings.map(offer).filter(item=>item.listing.priceMinor===0 && item.listing.fulfillment==='resource' && !item.listing.execution && !item.listing.computeIncluded && !item.listing.pricingTiers?.length),canConfigure,round};
 });
}
export async function executeAgriWallCommand(actorId:string,raw:unknown) {
 const command=agriWallCommandSchema.parse(raw);
 return marketTransaction(async tx=>{
  const ctx=await lockAgriWorkspace(tx,actorId),competitionId=ctx.workspace.competitionId;
  const round=await lockPopularityRound(tx,competitionId);
  if(command.action==='configurePopularity'){
   const authority=await requireAgriScope(tx,ctx,'RULES_CONFIRM');
   const now=await agriDatabaseClock(tx);
   if((round?.revision??0)!==command.expectedRevision)wallFailure('AGRI_POPULARITY_REVISION_CONFLICT');
   if(round&&(round.frozenAt||now>=round.opensAt))wallFailure('AGRI_POPULARITY_WINDOW_LOCKED');
   const opensAt=new Date(command.opensAt),closesAt=new Date(command.closesAt);
   if(opensAt<=now)wallFailure('AGRI_POPULARITY_FUTURE_WINDOW_REQUIRED',422);
   const id=round?.id??randomUUID(),revision=(round?.revision??0)+1;
   if(round)await tx.$executeRaw`UPDATE agri_popularity_rounds SET revision=${revision},"opensAt"=${opensAt},"closesAt"=${closesAt},"configuredById"=${actorId} WHERE id=${id}`;
   else await tx.$executeRaw`INSERT INTO agri_popularity_rounds(id,"competitionId",revision,"opensAt","closesAt","configuredById") VALUES(${id},${competitionId},${revision},${opensAt},${closesAt},${actorId})`;
   await tx.auditLog.create({data:{actorId,action:'AGRI_POPULARITY_CONFIGURED',resourceType:'agri_popularity_round',resourceId:id,metadata:{competitionId,revision}}});
   await assertAgriAuthorityCurrent(tx,authority);
   return {roundId:id,revision};
  }
  if(!ctx.workspace.enabled)wallFailure('AGRI_WORKSPACE_DISABLED');
  const [entry]=await tx.$queryRaw<Array<{id:string;teamId:string}>>`SELECT id,"teamId" FROM team_competitions WHERE id=${command.teamCompetitionId} AND "competitionId"=${competitionId} FOR UPDATE`;
  if(!entry)wallFailure('AGRI_ENTRY_NOT_FOUND',404);
  const [member]=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM team_members WHERE "teamId"=${entry.teamId} AND "userId"=${actorId} AND status='ACTIVE' AND role IN('OWNER','ADMIN') FOR SHARE`;
  if(!member)wallFailure('AGRI_TEAM_MANAGER_REQUIRED',403);
  const [prior]=await tx.$queryRaw<WallRow[]>`SELECT * FROM agri_wall_entries WHERE "teamCompetitionId"=${entry.id} FOR UPDATE`;
  if(prior&&prior.listingId!==command.listingId)wallFailure('AGRI_WALL_ALREADY_BOUND');
  const [otherWall]=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM agri_wall_entries WHERE "competitionId"=${competitionId} AND "listingId"=${command.listingId} AND "teamCompetitionId"<>${entry.id}`;
  if(otherWall)wallFailure('AGRI_WALL_ALREADY_BOUND');
  const now=await agriDatabaseClock(tx);
  if(!prior&&round&&now>=round.opensAt)wallFailure('AGRI_WALL_BINDING_CLOSED');
  const [listing]=await tx.$queryRaw<Array<{id:string;sellerId:string;status:string;publishedVersion:number|null;payload:unknown;reviewedAt:Date|null}>>`SELECT l.id,l."sellerId",l.status,l."publishedVersion",lv.payload,lv."reviewedAt" FROM market_listings l LEFT JOIN market_listing_versions lv ON lv."listingId"=l.id AND lv.version=l."publishedVersion" WHERE l.id=${command.listingId} FOR UPDATE OF l`;
  if(!listing||listing.sellerId!==actorId||listing.status!=='PUBLISHED'||!listing.reviewedAt)wallFailure('AGRI_WALL_PUBLIC_PROJECT_REQUIRED',422);
  if(listing.publishedVersion!==command.expectedVersion)wallFailure('AGRI_WALL_VERSION_CONFLICT');
  const payload=marketListingInputSchema.parse(listing.payload);
  if(payload.category!=='competition'||payload.subcategory!=='agri-wall'||payload.priceMinor!==0||payload.fulfillment!=='resource'||payload.execution||payload.computeIncluded||payload.pricingTiers?.length)wallFailure('AGRI_WALL_PUBLIC_PROJECT_REQUIRED',422);
  await assertAgriListingRevision(tx,listing.id,payload);
  const [roster]=await tx.$queryRaw<Array<{projectId:string}>>`SELECT "projectId" FROM agri_official_rosters WHERE "teamCompetitionId"=${entry.id}`;
  let projectId=prior?.projectId??roster?.projectId;
  if(projectId){
   const [project]=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM projects WHERE id=${projectId} AND "ownerId"=${actorId} AND "teamId"=${entry.teamId} AND status='ACTIVE' FOR SHARE`;
   if(!project)wallFailure('AGRI_WALL_PROJECT_MISMATCH',403);
  }else{
   const project=await tx.project.create({data:{ownerId:actorId,teamId:entry.teamId,title:payload.title.slice(0,80),goal:'CONTEST',status:'ACTIVE',visibility:'PRIVATE'},select:{id:true}});projectId=project.id;
  }
  if(prior&&prior.listingVersion===command.expectedVersion)return {wallEntryId:prior.id,projectId,artifactVersionId:prior.artifactVersionId,duplicate:true};
  const workflowId='agri-external-project';
  let artifact=await tx.artifact.findUnique({where:{projectId_workflowId:{projectId,workflowId}},select:{id:true,currentVersion:true}});
  if(!artifact)artifact=await tx.artifact.create({data:{projectId,workflowId,kind:'PROJECT_ONE_PAGER',title:payload.title,visibility:'PRIVATE',createdById:actorId},select:{id:true,currentVersion:true}});
  const version=artifact.currentVersion+1;
  const markdown=[`# ${payload.title}`,payload.summary,payload.description,payload.githubUrl?`Repository: ${payload.githubUrl}`:'',payload.usageUrl?`Demo: ${payload.usageUrl}`:'',payload.previewUrl?`Preview: ${payload.previewUrl}`:'',payload.sourceUrl?`Source: ${payload.sourceUrl}`:''].filter(Boolean).join('\n\n');
  const content={workflowId,sections:[{heading:payload.title,body:markdown}],pending:[],facts:[],editKind:'external',sourceListingId:listing.id,sourceListingVersion:command.expectedVersion};
  const artifactVersion=await tx.artifactVersion.create({data:{artifactId:artifact.id,version,contentJson:content as Prisma.InputJsonValue,contentMarkdown:markdown,factSnapshotHash:createHash('sha256').update(JSON.stringify(payload)).digest('hex'),createdById:actorId,workflowRunId:null},select:{id:true}});
  await tx.artifact.update({where:{id:artifact.id},data:{currentVersion:version}});
  const id=prior?.id??randomUUID(),acceptedAt=await agriDatabaseClock(tx);
  if(!prior&&round&&acceptedAt>=round.opensAt)wallFailure('AGRI_WALL_BINDING_CLOSED');
  if(prior)await tx.$executeRaw`UPDATE agri_wall_entries SET "artifactVersionId"=${artifactVersion.id},"listingVersion"=${command.expectedVersion},"updatedAt"=${acceptedAt} WHERE id=${id}`;
  else await tx.$executeRaw`INSERT INTO agri_wall_entries(id,"competitionId","teamCompetitionId","listingId","projectId","artifactVersionId","listingVersion","createdAt","updatedAt") VALUES(${id},${competitionId},${entry.id},${listing.id},${projectId},${artifactVersion.id},${command.expectedVersion},${acceptedAt},${acceptedAt})`;
  await tx.auditLog.create({data:{actorId,action:prior?'AGRI_WALL_REFRESHED':'AGRI_WALL_BOUND',resourceType:'agri_wall_entry',resourceId:id,metadata:{competitionId,teamCompetitionId:entry.id,listingId:listing.id,listingVersion:command.expectedVersion}}});
  return {wallEntryId:id,projectId,artifactVersionId:artifactVersion.id,duplicate:false};
 });
}
export async function assertAgriWallSubmission(tx:DbTransaction,ctx:AgriWorkspaceContext,teamCompetitionId:string,content:AgriStageSubmissionContent) {
 const [wall]=await tx.$queryRaw<Array<WallRow & {status:string;publishedVersion:number|null;payload:unknown;sellerId:string;flagged:boolean;deletedAt:Date|null}>>`SELECT w.*,l.status,l."publishedVersion",lv.payload,l."sellerId",u.flagged,u."deletedAt" FROM agri_wall_entries w JOIN market_listings l ON l.id=w."listingId" JOIN users u ON u.id=l."sellerId" LEFT JOIN market_listing_versions lv ON lv."listingId"=l.id AND lv.version=l."publishedVersion" WHERE w."teamCompetitionId"=${teamCompetitionId} AND w."competitionId"=${ctx.workspace.competitionId} FOR SHARE OF w,l`;
 if(!wall)wallFailure('AGRI_WALL_REQUIRED',422);
 if(wall.status!=='PUBLISHED'||wall.flagged||wall.deletedAt)wallFailure('AGRI_WALL_PUBLIC_PROJECT_REQUIRED',422);
 const payload=marketListingInputSchema.parse(wall.payload);
 if(payload.category!=='competition'||payload.subcategory!=='agri-wall')wallFailure('AGRI_WALL_PUBLIC_PROJECT_REQUIRED',422);
 if(wall.projectId!==content.projectId||wall.sellerId!==ctx.actorId)wallFailure('AGRI_WALL_PROJECT_MISMATCH',403);
 if(wall.listingVersion!==wall.publishedVersion)wallFailure('AGRI_WALL_VERSION_CONFLICT');
}
