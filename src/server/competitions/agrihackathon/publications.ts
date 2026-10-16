import type { DbTransaction } from "@/lib/db";
import { createHash, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriPublicationCommandSchema, agriPublicationContentSchema, agriPublicationManagementSchema, agriPublicationQuerySchema,
  agriPublicationsListQuerySchema, agriPublicPublicationSchema, agriPublicUrlSchema,
  type AgriPublicationManagement, type AgriPublicationResult, type AgriPublicationsList, type AgriPublicPublication } from "@/contracts/agri-publications";
import { configuredAgriEditionId, lockAgriWorkspace, requireAgriScope, assertAgriAuthorityCurrent, agriDatabaseClock, type AgriWorkspaceContext } from "./workspace";
import { projectAgriStageFreeze } from "./submissions";
type Tx = DbTransaction;
type Authority = Awaited<ReturnType<typeof requireAgriScope>>;
interface Allowed { submissionId:string;artifactVersionId:string;sequence:number;acceptedAt:string;basis:"FROZEN"|"CURRENT";correctionPreviousSubmissionId:string|null;repository:unknown;demoUrl:string|null;projectId:string;ownerId:string;projectStatus:string }
interface Source { allowedVersions:Allowed[]; entryStageId: string; competitionId: string; stage: "PRELIMINARY" | "FINAL"; teamId: string; submissionId: string | null; artifactVersionId: string | null; projectId: string | null; repository: unknown; demoUrl: string | null; ownerId: string | null; projectStatus: string | null; entryStatus: string }
interface Head { id: string; competitionId: string; entryStageId: string; revision: number }
interface Event { id: string; competitionId: string; entryStageId: string; publicationId: string; revision: number; action: "REQUEST" | "APPROVE" | "REJECT" | "WITHDRAW"; submissionId: string; artifactVersionId: string; consentEventId: string | null; content: unknown; reason: string | null; actorId: string; createdAt: Date }
const fail = (code: string, status = 409): never => { throw new AgriWorkspaceError(code, status); };
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function source(tx: Tx, ctx: AgriWorkspaceContext, entryStageId: string): Promise<Source> {
  const [stage] = await tx.$queryRaw<Array<{ id: string; competitionId: string; teamCompetitionId: string; stage: Source["stage"]; currentSubmissionId: string | null; frozenSubmissionId:string|null }>>`
    SELECT id,"competitionId","teamCompetitionId",stage,"currentSubmissionId","frozenSubmissionId" FROM agri_entry_stages WHERE id=${entryStageId} AND "competitionId"=${ctx.workspace.competitionId} FOR SHARE`;
  if (!stage) return fail("AGRI_STAGE_NOT_FOUND",404);
  const [entry] = await tx.$queryRaw<Array<{ teamId: string; entryStatus:string }>>`SELECT "teamId","entryStatus" FROM team_competitions WHERE id=${stage.teamCompetitionId} AND "competitionId"=${stage.competitionId} FOR SHARE`;
  if (!entry) return fail("AGRI_STAGE_NOT_FOUND",404);
  const [submission] = stage.currentSubmissionId ? await tx.$queryRaw<Array<{ id: string; artifactVersionId: string; projectId: string; repository: unknown; demoUrl: string | null }>>`
    SELECT id,"artifactVersionId","projectId",repository,"demoUrl" FROM agri_stage_submissions WHERE id=${stage.currentSubmissionId} AND "entryStageId"=${stage.id} AND "competitionId"=${stage.competitionId} FOR SHARE` : [];
  const [project] = submission ? await tx.$queryRaw<Array<{ ownerId: string; status: string; teamId: string | null }>>`SELECT "ownerId",status,"teamId" FROM projects WHERE id=${submission.projectId} FOR SHARE` : [];
  const freeze=await projectAgriStageFreeze(tx,stage,await agriDatabaseClock(tx));
  const allowedVersions:Allowed[]=[];
  for(const versionId of [...new Set([freeze.frozenSubmissionId,stage.currentSubmissionId].filter((v):v is string=>!!v))]) {
    const [v]=await tx.$queryRaw<Array<{id:string;artifactVersionId:string;sequence:number;acceptedAt:Date;projectId:string;repository:unknown;demoUrl:string|null;ownerId:string;projectStatus:string;previousSubmissionId:string|null}>>`SELECT s.id,s."artifactVersionId",s.sequence,s."acceptedAt",s."projectId",s.repository,s."demoUrl",p."ownerId",p.status AS "projectStatus",c."previousSubmissionId"
      FROM agri_stage_submissions s JOIN artifact_versions av ON av.id=s."artifactVersionId" JOIN artifacts ar ON ar.id=av."artifactId" AND ar."projectId"=s."projectId" JOIN projects p ON p.id=s."projectId" AND p."teamId"=${entry.teamId} LEFT JOIN agri_submission_corrections c ON c."submissionId"=s.id
      WHERE s.id=${versionId} AND s."entryStageId"=${stage.id} AND s."competitionId"=${stage.competitionId} FOR SHARE OF s,p,av,ar`;
    if(v) allowedVersions.push({submissionId:v.id,artifactVersionId:v.artifactVersionId,sequence:v.sequence,acceptedAt:v.acceptedAt.toISOString(),basis:versionId===freeze.frozenSubmissionId ? "FROZEN" : "CURRENT",correctionPreviousSubmissionId:v.previousSubmissionId,repository:v.repository,demoUrl:v.demoUrl,projectId:v.projectId,ownerId:v.ownerId,projectStatus:v.projectStatus});
  }
  return { allowedVersions,entryStatus:entry.entryStatus,entryStageId:stage.id,competitionId:stage.competitionId,stage:stage.stage,teamId:entry.teamId,
    submissionId:submission?.id ?? null,artifactVersionId:submission?.artifactVersionId ?? null,projectId:submission?.projectId ?? null,
    repository:submission?.repository ?? null,demoUrl:submission?.demoUrl ?? null,ownerId:project?.ownerId ?? null,projectStatus:project?.status ?? null };
}
async function team(tx: Tx, source: Source, actorId: string, write: boolean) {
  const [membership] = await tx.$queryRaw<Array<{ role: string; status: string }>>`SELECT role,status FROM team_members WHERE "teamId"=${source.teamId} AND "userId"=${actorId} FOR SHARE`;
  if (!membership || membership.status!=="ACTIVE") return fail("AGRI_TEAM_PERMISSION_REQUIRED",403);
  const manager = ["OWNER","ADMIN"].includes(membership.role);
  if (write && (!manager || source.ownerId!==actorId || source.projectStatus!=="ACTIVE")) return fail("AGRI_PUBLICATION_OWNER_REQUIRED",403);
  return manager && source.ownerId===actorId && source.projectStatus==="ACTIVE";
}
async function head(tx: Tx, ctx: AgriWorkspaceContext, entryStageId: string) {
  const [row] = await tx.$queryRaw<Head[]>`SELECT * FROM agri_publications WHERE "entryStageId"=${entryStageId} AND "competitionId"=${ctx.workspace.competitionId} FOR UPDATE`;
  return row;
}
async function events(tx: Tx, publicationId: string, beforeRevision: number | null = null) {
  return tx.$queryRaw<Event[]>`SELECT * FROM agri_publication_events WHERE "publicationId"=${publicationId} AND (${beforeRevision}::integer IS NULL OR revision<${beforeRevision}) ORDER BY revision DESC LIMIT 31`;
}
function state(latest: Event, source: Source): NonNullable<AgriPublicationManagement["publication"]>["state"] {
  if (latest.action==="WITHDRAW") return "WITHDRAWN";
  if (source.entryStatus==="REJECTED" || !source.allowedVersions.some(v=>v.submissionId===latest.submissionId && v.artifactVersionId===latest.artifactVersionId && v.projectStatus==="ACTIVE")) return "STALE";
  return latest.action==="REQUEST" ? "PENDING" : latest.action==="APPROVE" ? "APPROVED" : "REJECTED";
}
function eventView(row: Event) {
  return { id:row.id,revision:row.revision,action:row.action,submissionId:row.submissionId,artifactVersionId:row.artifactVersionId,
    consentEventId:row.consentEventId,content:row.action==="REQUEST" ? agriPublicationContentSchema.parse(row.content) : null,reason:row.reason,createdAt:row.createdAt.toISOString() };
}
function safe(value: unknown) { const result=agriPublicUrlSchema.safeParse(value);return result.success ? result.data : null; }
function repositoryUrl(value: unknown) { return value && typeof value==="object" && "url" in value ? safe(value.url) : null; }
async function management(tx: Tx, ctx: AgriWorkspaceContext, source: Source, staff: boolean, canRequest: boolean, beforeRevision: number | null = null): Promise<AgriPublicationManagement> {
  const row=await head(tx,ctx,source.entryStageId), history=row ? await events(tx,row.id,beforeRevision) : [], latest=beforeRevision && row ? (await events(tx,row.id))[0] : history[0];
  const [consent]=latest ? await tx.$queryRaw<Array<{actorId:string}>>`SELECT "actorId" FROM agri_publication_events WHERE id=${latest.consentEventId ?? latest.id}` : [];
  return agriPublicationManagementSchema.parse({ competitionId:ctx.workspace.competitionId,entryStageId:source.entryStageId,workspaceEnabled:ctx.workspace.enabled,
    context:{ stage:source.stage,submissionId:source.submissionId,artifactVersionId:source.artifactVersionId,
      repositoryUrl:canRequest ? repositoryUrl(source.repository) : null,demoUrl:canRequest ? safe(source.demoUrl) : null, allowedVersions:source.allowedVersions.map(v=>({submissionId:v.submissionId,artifactVersionId:v.artifactVersionId,sequence:v.sequence,acceptedAt:v.acceptedAt,basis:v.basis,correctionPreviousSubmissionId:v.correctionPreviousSubmissionId,repositoryUrl:canRequest ? repositoryUrl(v.repository) : null,demoUrl:canRequest ? safe(v.demoUrl) : null})) },
    canRequest:canRequest && source.allowedVersions.some(v=>v.ownerId===ctx.actorId && v.projectStatus==="ACTIVE") && source.entryStatus!=="REJECTED" && ctx.workspace.enabled && !!source.submissionId,
    canWithdraw:!!latest && latest.action!=="WITHDRAW" && (staff || canRequest || consent?.actorId===ctx.actorId),
    canReview:staff && ctx.workspace.enabled && !!latest && latest.action==="REQUEST" && state(latest,source)==="PENDING" && latest.actorId!==ctx.actorId,
    publication:row && latest ? { id:row.id,revision:row.revision,state:state(latest,source),events:history.slice(0,30).map(eventView),nextBeforeRevision:history.length>30 ? history[29].revision : null } : null });
}
export async function readAgriPublicationManagement(actorId: string, raw: unknown): Promise<AgriPublicationManagement> {
  const query=agriPublicationQuerySchema.parse(raw);
  return db.$transaction(async tx=>{
    const ctx=await lockAgriWorkspace(tx,actorId), authority=query.scope==="staff" ? await requireAgriScope(tx,ctx,"PUBLICATIONS_REVIEW") : null;
    const target=await source(tx,ctx,query.entryStageId);let owner=false,withdrawalOnly=false;
    if(query.scope==="team") {
      try {owner=await team(tx,target,actorId,false);}
      catch(error) {
        if(!(error instanceof AgriWorkspaceError) || error.code!=="AGRI_TEAM_PERMISSION_REQUIRED") throw error;
        const h=await head(tx,ctx,target.entryStageId),latest=h ? (await events(tx,h.id))[0] : null;
        const [consent]=latest ? await tx.$queryRaw<Array<{actorId:string}>>`SELECT "actorId" FROM agri_publication_events WHERE id=${latest.consentEventId ?? latest.id}` : [];
        if(consent?.actorId!==actorId) throw error;withdrawalOnly=true;
      }
    }
    const view=await management(tx,ctx,target,query.scope==="staff",owner,query.beforeRevision ?? null);
    if(withdrawalOnly) {
      view.context={stage:target.stage,submissionId:null,artifactVersionId:null,repositoryUrl:null,demoUrl:null,allowedVersions:[]};
      const h=await head(tx,ctx,target.entryStageId),latest=h ? (await events(tx,h.id))[0] : null,consentId=latest?.consentEventId ?? latest?.id;
      if(view.publication)view.publication.events=view.publication.events.filter(e=>e.id===consentId || e.consentEventId===consentId);
    }
    await assertAgriAuthorityCurrent(tx,authority);return view;
  },{timeout:15000});
}
export async function readAgriPublicationQueue(actorId: string, raw: unknown): Promise<{ competitionId: string; items: AgriPublicationManagement[]; nextCursor: string | null }> {
  const query=agriPublicationsListQuerySchema.parse(raw);
  return db.$transaction(async tx=>{
    const ctx=await lockAgriWorkspace(tx,actorId),authority=await requireAgriScope(tx,ctx,"PUBLICATIONS_REVIEW");
    const rows=await tx.$queryRaw<Array<{id:string;entryStageId:string}>>`SELECT id,"entryStageId" FROM agri_publications WHERE "competitionId"=${ctx.workspace.competitionId} AND (${query.cursor ?? null}::text IS NULL OR id>${query.cursor ?? null}) ORDER BY id LIMIT 31`;
    const items:AgriPublicationManagement[]=[];for(const row of rows.slice(0,30)) items.push(await management(tx,ctx,await source(tx,ctx,row.entryStageId),true,false));
    await assertAgriAuthorityCurrent(tx,authority);return {competitionId:ctx.workspace.competitionId,items,nextCursor:rows.length>30 ? rows[29].id : null};
  },{timeout:15000});
}
export async function executeAgriPublicationCommand(actorId: string, raw: unknown): Promise<AgriPublicationResult> {
  const command=agriPublicationCommandSchema.parse(raw),requestHash=hash(command);
  return db.$transaction(async tx=>{
    const ctx=await lockAgriWorkspace(tx,actorId);
    let authority:Authority|null=null;
    if(command.action==="reviewPublication") authority=await requireAgriScope(tx,ctx,"PUBLICATIONS_REVIEW");
    const target=await source(tx,ctx,command.entryStageId);
    const existing=await head(tx,ctx,target.entryStageId), latestExisting=existing ? (await events(tx,existing.id))[0] : null;
    const [originalConsent]=latestExisting ? await tx.$queryRaw<Event[]>`SELECT * FROM agri_publication_events WHERE id=${latestExisting.consentEventId ?? latestExisting.id}` : [];
    if(command.action!=="reviewPublication") {
      if(command.action==="requestPublication") await team(tx,target,actorId,true);
      else if(originalConsent?.actorId!==actorId) {
        try { await team(tx,target,actorId,true); }
        catch(error) { if(!(error instanceof AgriWorkspaceError) || !["AGRI_TEAM_PERMISSION_REQUIRED","AGRI_PUBLICATION_OWNER_REQUIRED"].includes(error.code)) throw error;authority=await requireAgriScope(tx,ctx,"PUBLICATIONS_REVIEW"); }
      }
    }
    let row=existing;
    const [receipt]=await tx.$queryRaw<Array<{publicationId:string;eventId:string;appliedRevision:number;requestHash:string;entryStageId:string}>>`SELECT "publicationId","eventId","appliedRevision","requestHash","entryStageId" FROM agri_publication_receipts WHERE "competitionId"=${ctx.workspace.competitionId} AND "actorId"=${actorId} AND operation=${command.action} AND "idempotencyKey"=${command.idempotencyKey}`;
    if(receipt) {
      if(receipt.requestHash!==requestHash || receipt.entryStageId!==target.entryStageId) return fail("AGRI_IDEMPOTENCY_CONFLICT");
      await assertAgriAuthorityCurrent(tx,authority);return {publicationId:receipt.publicationId,eventId:receipt.eventId,appliedRevision:receipt.appliedRevision,duplicate:true};
    }
    if(command.action!=="withdrawPublication" && target.entryStatus==="REJECTED") return fail("AGRI_ENTRY_REJECTED",403);
    if(command.action!=="withdrawPublication" && !ctx.workspace.enabled) return fail("AGRI_WORKSPACE_DISABLED");
    if((row?.revision ?? 0)!==command.expectedRevision) return fail("AGRI_REVISION_CONFLICT");
    const latest=row ? (await events(tx,row.id))[0] : null;
    let submissionId:string,artifactVersionId:string,consentEventId:string|null=null;
    if(command.action==="requestPublication") {
      const chosen=target.allowedVersions.find(v=>v.submissionId===command.submissionId && v.artifactVersionId===command.artifactVersionId);
      if(!chosen) return fail("AGRI_PUBLICATION_SOURCE_STALE");
      if(chosen.ownerId!==actorId || chosen.projectStatus!=="ACTIVE") return fail("AGRI_PUBLICATION_OWNER_REQUIRED",403);
      if((command.content.repositoryUrl!==null && command.content.repositoryUrl!==repositoryUrl(chosen.repository)) || (command.content.demoUrl!==null && command.content.demoUrl!==safe(chosen.demoUrl))) return fail("AGRI_PUBLICATION_LINK_NOT_SUBMITTED",422);
      submissionId=command.submissionId;artifactVersionId=command.artifactVersionId;
    } else {
      if(!row || !latest) return fail("AGRI_PUBLICATION_NOT_FOUND",404);
      if(command.action==="reviewPublication") {
        if(latest.action!=="REQUEST" || latest.id!==command.consentEventId) return fail("AGRI_PUBLICATION_CONSENT_STALE");
        if(state(latest,target)!=="PENDING") return fail("AGRI_PUBLICATION_SOURCE_STALE");
        if(latest.actorId===actorId) return fail("AGRI_PUBLICATION_INDEPENDENT_REVIEW_REQUIRED",403);
        await team(tx,target,latest.actorId,true);
        const [consenter]=await tx.$queryRaw<Array<{flagged:boolean;deletedAt:Date|null}>>`SELECT flagged,"deletedAt" FROM users WHERE id=${latest.actorId} FOR SHARE`;
        if(!consenter || consenter.flagged || consenter.deletedAt) return fail("AGRI_PUBLICATION_CONSENT_INVALID",403);
        consentEventId=latest.id;
      } else {
        if(latest.action==="WITHDRAW") return fail("AGRI_PUBLICATION_ALREADY_WITHDRAWN");
        consentEventId=latest.consentEventId ?? latest.id;
      }
      submissionId=latest.submissionId;artifactVersionId=latest.artifactVersionId;
    }
    if(!row) {row={id:randomUUID(),competitionId:ctx.workspace.competitionId,entryStageId:target.entryStageId,revision:0};await tx.$executeRaw`INSERT INTO agri_publications(id,"competitionId","entryStageId",revision) VALUES(${row.id},${row.competitionId},${row.entryStageId},0)`;}
    const eventId=randomUUID(),revision=row.revision+1,now=await agriDatabaseClock(tx),action=command.action==="requestPublication" ? "REQUEST" : command.action==="withdrawPublication" ? "WITHDRAW" : command.decision;
    const content=command.action==="requestPublication" ? JSON.stringify(command.content) : null,reason=command.action==="requestPublication" ? null : command.reason;
    await tx.$executeRaw`INSERT INTO agri_publication_events(id,"competitionId","entryStageId","publicationId",revision,action,"submissionId","artifactVersionId","consentEventId",content,reason,"actorId","createdAt")
      VALUES(${eventId},${row.competitionId},${row.entryStageId},${row.id},${revision},${action},${submissionId},${artifactVersionId},${consentEventId},${content}::jsonb,${reason},${actorId},${now})`;
    await tx.$executeRaw`UPDATE agri_publications SET revision=${revision} WHERE id=${row.id}`;
    await tx.$executeRaw`INSERT INTO agri_publication_receipts(id,"competitionId","entryStageId","publicationId","eventId","actorId",operation,"idempotencyKey","requestHash","appliedRevision","createdAt") VALUES(${randomUUID()},${row.competitionId},${row.entryStageId},${row.id},${eventId},${actorId},${command.action},${command.idempotencyKey},${requestHash},${revision},${now})`;
    await tx.auditLog.create({data:{actorId,action:"AGRI_PUBLICATION_"+action,resourceType:"agri_publication",resourceId:row.id,metadata:{competitionId:row.competitionId,entryStageId:row.entryStageId,revision,eventId,submissionId,artifactVersionId}}});
    await assertAgriAuthorityCurrent(tx,authority);
    return {publicationId:row.id,eventId,appliedRevision:revision,duplicate:false};
  },{timeout:15000});
}
interface PublicRow { id:string;competitionId:string;stage:AgriPublicPublication["stage"];submissionId:string;artifactVersionId:string;consentEventId:string;reviewEventId:string;acceptedAt:Date;publishedAt:Date;basis:"FROZEN"|"CURRENT";correctionPreviousSubmissionId:string|null;content:unknown }
async function publicRows(tx:Tx,competitionId:string,cursor:string|null,id:string|null) {
  return tx.$queryRaw<PublicRow[]>`SELECT h.id,h."competitionId",es.stage,s.id AS "submissionId",s."artifactVersionId",c.id AS "consentEventId",r.id AS "reviewEventId",s."acceptedAt",r."createdAt" AS "publishedAt",CASE WHEN es."frozenSubmissionId"=s.id OR (es."frozenSubmissionId" IS NULL AND es."currentSubmissionId"=s.id AND w.state='CONFIRMED' AND (clock_timestamp()>w."closesAt" OR (NOT w."includesDeadline" AND clock_timestamp()=w."closesAt"))) THEN 'FROZEN' ELSE 'CURRENT' END AS basis, correction."previousSubmissionId" AS "correctionPreviousSubmissionId",c.content
    FROM agri_publications h JOIN agri_publication_events r ON r."publicationId"=h.id AND r.revision=h.revision AND r.action='APPROVE'
    JOIN agri_publication_events c ON c.id=r."consentEventId" AND c.action='REQUEST' AND c."publicationId"=h.id
    JOIN agri_entry_stages es ON es.id=h."entryStageId" AND es."competitionId"=h."competitionId" AND (es."currentSubmissionId"=r."submissionId" OR es."frozenSubmissionId"=r."submissionId")
    JOIN agri_stage_submissions s ON s.id=r."submissionId" AND s."artifactVersionId"=r."artifactVersionId" AND s.id=c."submissionId" AND s."artifactVersionId"=c."artifactVersionId"
    JOIN agri_stage_windows w ON w."ruleVersionId"=s."ruleVersionId" AND w.stage=es.stage
    LEFT JOIN agri_submission_corrections correction ON correction."submissionId"=s.id
    JOIN artifact_versions av ON av.id=s."artifactVersionId" JOIN artifacts ar ON ar.id=av."artifactId" AND ar."projectId"=s."projectId"
    JOIN team_competitions tc ON tc.id=es."teamCompetitionId" AND tc."entryStatus"<>'REJECTED'
    JOIN projects p ON p.id=s."projectId" AND p."ownerId"=c."actorId" AND p."teamId"=tc."teamId" AND p.status='ACTIVE'
    JOIN users u ON u.id=c."actorId" AND NOT u.flagged AND u."deletedAt" IS NULL
    JOIN users reviewer ON reviewer.id=r."actorId" AND NOT reviewer.flagged AND reviewer."deletedAt" IS NULL AND reviewer.id<>u.id
    JOIN team_members m ON m."teamId"=tc."teamId" AND m."userId"=u.id AND m.status='ACTIVE' AND m.role IN('OWNER','ADMIN')
    WHERE h."competitionId"=${competitionId} AND (${cursor}::text IS NULL OR h.id>${cursor}) AND (${id}::text IS NULL OR h.id=${id}) ORDER BY h.id LIMIT 31 FOR SHARE OF h,r,c,es,s,w,av,ar,tc,p,u,reviewer,m`;
}
async function publicContext(tx:Tx) {
  const competitionId=configuredAgriEditionId();
  // Shared workspace lock linearizes every read against explicit withdrawal/correction.
  const [workspace]=await tx.$queryRaw<Array<{enabled:boolean;publishedRuleVersionId:string|null}>>`SELECT enabled,"publishedRuleVersionId" FROM agri_workspaces WHERE "competitionId"=${competitionId} FOR SHARE`;
  if(!workspace) return fail("AGRI_WORKSPACE_NOT_CONFIGURED",503);
  return {competitionId,enabled:workspace.enabled && !!workspace.publishedRuleVersionId};
}
function publicView(row:PublicRow) {return agriPublicPublicationSchema.parse({...row,acceptedAt:row.acceptedAt.toISOString(),publishedAt:row.publishedAt.toISOString()});}
export async function readAgriPublications(raw:unknown={}):Promise<AgriPublicationsList> {
  const query=agriPublicationsListQuerySchema.parse(raw);
  return db.$transaction(async tx=>{
    const ctx=await publicContext(tx);if(!ctx.enabled)return {competitionId:ctx.competitionId,items:[],nextCursor:null};
    const rows=await publicRows(tx,ctx.competitionId,query.cursor ?? null,null);return {competitionId:ctx.competitionId,items:rows.slice(0,30).map(publicView),nextCursor:rows.length>30 ? rows[29].id : null};
  },{timeout:15000});
}
export async function readAgriPublicPublication(publicationId:string):Promise<AgriPublicPublication> {
  agriPublicationsListQuerySchema.parse({cursor:publicationId});
  return db.$transaction(async tx=>{const ctx=await publicContext(tx);const [row]=ctx.enabled ? await publicRows(tx,ctx.competitionId,null,publicationId) : [];if(!row)return fail("AGRI_PUBLICATION_NOT_FOUND",404);return publicView(row);},{timeout:15000});
}


import { agriPublicRankingsSchema,type AgriPublicRankings } from "@/contracts/agri-rankings";
import { latestAgriRankingEvent } from "./rankings";
interface RankingSnapshotItem {entryStageId:string;submissionId:string;artifactVersionId:string|null;listingVersion:number|null;rank:number;professionalScore:number;publicScore:number|null;totalScore:number;validStars:number;awards:AgriPublicRankings["boards"][number]["items"][number]["awards"];prizeMinor:number;listingId:string|null}
/** Public leaderboards project immutable results through live consent, account and withdrawal checks. */
export async function readAgriPublicRankings():Promise<AgriPublicRankings>{
 return db.$transaction(async tx=>{
  const ctx=await publicContext(tx);const boards:AgriPublicRankings["boards"]=[];
  if(!ctx.enabled)return {competitionId:ctx.competitionId,boards};
  for(const stage of ["PRELIMINARY","FINAL"] as const){
   const event=await latestAgriRankingEvent(tx,ctx.competitionId,stage);if(event?.action!=="CONFIRM")continue;
   const snapshot=event.snapshot as {items:RankingSnapshotItem[];popularityAwards?:Array<Pick<RankingSnapshotItem,"entryStageId"|"submissionId"|"artifactVersionId"|"listingId"|"listingVersion">&{validStars:number}>};
   const items:AgriPublicRankings["boards"][number]["items"]=[];
   for(const candidate of snapshot.items){
    const [publication]=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM agri_publications WHERE "competitionId"=${ctx.competitionId} AND "entryStageId"=${candidate.entryStageId}`;
    const [row]=publication?await publicRows(tx,ctx.competitionId,null,publication.id):[];
    const exactPublic=row?.submissionId===candidate.submissionId && row?.artifactVersionId===candidate.artifactVersionId?publicView(row):null;
    if(!exactPublic)continue;
    items.push({rank:candidate.rank,professionalScore:candidate.professionalScore,publicScore:candidate.publicScore,totalScore:candidate.totalScore,validStars:candidate.validStars,awards:candidate.awards,prizeMinor:candidate.prizeMinor,publicationId:exactPublic.id,detailHref:"/competitions/agrihackathon/showcase/"+encodeURIComponent(exactPublic.id),listingId:null,wallHref:null,content:exactPublic.content});
   }
   const popularityAwards:AgriPublicRankings["boards"][number]["popularityAwards"]=[];
   // Legacy vote snapshots have no immutable submission binding. Do not attach
   // their votes to a newer current wall artifact or disclose unapproved material.

   boards.push({id:event.id,stage,publishedAt:event.createdAt.toISOString(),items,popularityAwards});
  }
  return agriPublicRankingsSchema.parse({competitionId:ctx.competitionId,boards});
 },{timeout:20000});
}
