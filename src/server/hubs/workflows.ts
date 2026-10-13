import { Prisma } from "@prisma/client";
import { randomUUID, createHash } from "node:crypto";
import { db, type DbTransaction } from "@/lib/db";
import { hasAdminPermission } from "@/lib/admin-permission-values";
import { hasWorkflowManualApproval } from "@/server/workflows/approval";
import { marketListingInputSchema } from "@/contracts/marketplace";
import { validateWorkflow } from "@/domain/workflows/graph";
import { assertSupportedRecipe } from "@/domain/workflows/recipes";
import { marketHash } from "@/server/marketplace/shared";
import { workflowDefinitionHash } from "@/server/marketplace/workflow-binding";
import { workflowDefinitionSchema } from "@/contracts/workflow";
import { workflowHubCommandSchema, workflowHubManagementSchema, workflowHubQuerySchema, type WorkflowHubManagement, type WorkflowHubSlug, type HubWorkflowPage } from "@/contracts/workflow-hubs";
export class WorkflowHubError extends Error { constructor(public code:string,public status=409){super(code);} }
const fail=(code:string,status=409):never=>{throw new WorkflowHubError(code,status);};
type Tx=DbTransaction;
interface Head{id:string;workflowId:string;hubSlug:WorkflowHubSlug;revision:number;requestEventId:string|null;approvedEventId:string|null}
interface Event{id:string;associationId:string;workflowId:string;hubSlug:WorkflowHubSlug;revision:number;action:"REQUEST"|"APPROVE"|"REJECT"|"WITHDRAW";versionId:string;actorId:string;requestEventId:string|null;reason:string;createdAt:Date}
async function actor(tx:Tx,id:string){const row=await tx.user.findUnique({where:{id},select:{id:true,role:true,adminPermissions:true,flagged:true,deletedAt:true}});if(!row||row.flagged||row.deletedAt)return fail("ACCOUNT_UNAVAILABLE",403);return row;}
const moderator=(row:Awaited<ReturnType<typeof actor>>)=>row.role==="ADMIN"&&hasAdminPermission(row.adminPermissions,"CATALOG_MANAGE");
async function workflow(tx:Tx,slug:string,lock=false){
 if(lock)await tx.$queryRaw`SELECT id FROM workflows WHERE slug=${slug} FOR UPDATE`;
 const row=await tx.workflow.findUnique({where:{slug},include:{versions:{orderBy:{version:"desc"}},author:{select:{id:true,deletedAt:true,flagged:true}}}});if(!row)return fail("NOT_FOUND",404);return row;
}
async function lockPeople(tx:Tx,ids:string[]){await tx.$queryRaw`SELECT id FROM users WHERE id=ANY(${[...new Set(ids)].sort()}::text[]) ORDER BY id FOR SHARE`;}
async function lockedSource(tx:Tx,slug:string,actorId:string,write=false){await tx.$queryRawUnsafe('SELECT id FROM workflows WHERE slug=$1 FOR '+(write?'UPDATE':'SHARE'),slug);const initial=await workflow(tx,slug);await lockPeople(tx,[initial.authorId,actorId]);return workflow(tx,slug);}
type Source=Awaited<ReturnType<typeof workflow>>;
async function eligible(tx:Tx,row:Source,versionId:string){const version=row.versions.find(v=>v.id===versionId);if(version){const parsed=workflowDefinitionSchema.safeParse(version.definition);if(!parsed.success||!validateWorkflow(parsed.data).ok)return false;try{assertSupportedRecipe(parsed.data);}catch{return false;}}return !row.isOfficial&&row.status==="PUBLISHED"&&!row.author.flagged&&!row.author.deletedAt&&!!version&&version.version===row.publishedVersion&&await hasWorkflowManualApproval(tx,row,version);}
async function heads(tx:Tx,id:string){return tx.$queryRaw<Head[]>`SELECT * FROM workflow_hub_associations WHERE "workflowId"=${id} ORDER BY "hubSlug"`;}
async function events(tx:Tx,id:string,before?:number){return tx.$queryRaw<Event[]>`SELECT * FROM workflow_hub_events WHERE "associationId"=${id} AND (${before??null}::integer IS NULL OR revision<${before??null}) ORDER BY revision DESC LIMIT 31`;}
async function event(tx:Tx,id:string|null){if(!id)return null;const [row]=await tx.$queryRaw<Event[]>`SELECT * FROM workflow_hub_events WHERE id=${id}`;return row??null;}
async function authorizedOrigin(tx:Tx,h:Head,actorId:string){const pending=await event(tx,h.requestEventId),approved=await event(tx,h.approvedEventId),origin=approved?await event(tx,approved.requestEventId):null;return pending?.actorId===actorId||origin?.actorId===actorId;}
async function bindingValid(tx:Tx,row:Source,h:Head){const approval=await event(tx,h.approvedEventId),request=approval?await event(tx,approval.requestEventId):null;if(!approval||!request||request.actorId!==row.authorId||approval.actorId===request.actorId)return false;return eligible(tx,row,approval.versionId);}
async function management(tx:Tx,row:Source,actorId:string,query:{hubSlug?:WorkflowHubSlug;beforeRevision?:number}={}):Promise<WorkflowHubManagement>{
 const user=await actor(tx,actorId),isModerator=moderator(user),all=await heads(tx,row.id);
 const former=await Promise.all(all.map(h=>authorizedOrigin(tx,h,actorId)));
 if(row.authorId!==actorId&&!isModerator&&!former.some(Boolean))return fail("FORBIDDEN",403);
 const published=row.versions.find(v=>v.version===row.publishedVersion),canRequest=row.authorId===actorId&&!!published&&await eligible(tx,row,published.id);
 const formerOnly=row.authorId!==actorId&&!isModerator;
 const associations=[];
 for(const hubSlug of ["cauhub","vibehub","aigc","full-stack"] as const){
  if(query.hubSlug&&query.hubSlug!==hubSlug)continue;const h=all.find(item=>item.hubSlug===hubSlug);
  if(!h){if(formerOnly)continue;associations.push({hubSlug,revision:0,state:"NONE" as const,requestEventId:null,requestVersionId:null,requestVersion:null,approvedVersionId:null,approvedVisible:false,canReview:false,canWithdraw:false,withdrawRequestEventIds:[],requestReason:null,events:[],nextBeforeRevision:null});continue;}
  // Former owners only access the exact associations where their consent is still pending or approved.
  if(row.authorId!==actorId&&!isModerator&&!await authorizedOrigin(tx,h,actorId))continue;
  const pending=await event(tx,h.requestEventId),approved=await event(tx,h.approvedEventId),visible=await bindingValid(tx,row,h);
  const validPending=!!pending&&pending.actorId===row.authorId&&await eligible(tx,row,pending.versionId);
  const latest=(await events(tx,h.id))[0];
  const ownRequests=formerOnly?new Set((await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM workflow_hub_events WHERE "associationId"=${h.id} AND action='REQUEST' AND "actorId"=${actorId}`).map(e=>e.id)):null;
  const history=ownRequests?await tx.$queryRaw<Event[]>`SELECT * FROM workflow_hub_events WHERE "associationId"=${h.id} AND (id=ANY(${[...ownRequests]}::text[]) OR "requestEventId"=ANY(${[...ownRequests]}::text[])) AND (${query.beforeRevision??null}::integer IS NULL OR revision<${query.beforeRevision??null}) ORDER BY revision DESC LIMIT 31`:await events(tx,h.id,query.beforeRevision);
  const displayedHistory=history;
  const approvedOrigin=approved?await event(tx,approved.requestEventId):null;
  const ownPending=pending&&(!formerOnly||pending.actorId===actorId)?pending:null;
  const ownApproved=approved&&(!formerOnly||approvedOrigin?.actorId===actorId)?approved:null;
  const withdrawRequestEventIds=[...new Set([pending&&(isModerator||pending.actorId===actorId)?pending.id:null,approvedOrigin&&(isModerator||approvedOrigin.actorId===actorId)?approvedOrigin.id:null].filter((id):id is string=>!!id))];
  associations.push({hubSlug,revision:h.revision,state:ownPending?(validPending?"PENDING" as const:"STALE" as const):visible&&!formerOnly?"APPROVED" as const:ownApproved?"STALE" as const:!formerOnly&&latest?.action==="REJECT"?"REJECTED" as const:!formerOnly&&latest?.action==="WITHDRAW"?"WITHDRAWN" as const:"NONE" as const,
   requestEventId:ownPending?.id??null,requestVersionId:ownPending?.versionId??null,requestVersion:row.versions.find(v=>v.id===ownPending?.versionId)?.version??null,approvedVersionId:ownApproved?.versionId??null,approvedVisible:!formerOnly&&visible,requestReason:ownPending?.reason??null,
   canReview:isModerator&&!!pending&&validPending&&pending.actorId!==actorId,
   canWithdraw:withdrawRequestEventIds.length>0,withdrawRequestEventIds,
   events:displayedHistory.slice(0,30).map(e=>({id:e.id,revision:e.revision,action:e.action,versionId:e.versionId,requestEventId:e.requestEventId,reason:e.reason,createdAt:e.createdAt.toISOString()})),nextBeforeRevision:history.length>30?history[29].revision:null});
 }
 return workflowHubManagementSchema.parse({workflowId:row.id,slug:row.slug,title:formerOnly?"":row.title,isOfficial:row.isOfficial,canRequest,publishedVersion:!formerOnly&&published?{id:published.id,version:published.version}:null,associations});
}
export async function readWorkflowHubManagement(slug:string,actorId:string,raw:unknown={}){const query=workflowHubQuerySchema.parse(raw);return db.$transaction(async tx=>{const result=await management(tx,await lockedSource(tx,slug,actorId),actorId,query);await assertAuthority(tx,actorId,false);return result;},{timeout:15000});}
async function assertAuthority(tx:Tx,actorId:string,requireModerator:boolean){const user=await actor(tx,actorId);if(requireModerator&&!moderator(user))return fail("FORBIDDEN",403);}
export async function executeWorkflowHubCommand(slug:string,actorId:string,raw:unknown){
 const command=workflowHubCommandSchema.parse(raw),requestHash=createHash("sha256").update(JSON.stringify(command)).digest("hex");
 return db.$transaction(async tx=>{
  const row=await lockedSource(tx,slug,actorId,true),user=await actor(tx,actorId);if(row.isOfficial)return fail("OFFICIAL_WORKFLOW_LOCKED",403);

  const [head]=await tx.$queryRaw<Head[]>`SELECT * FROM workflow_hub_associations WHERE "workflowId"=${row.id} AND "hubSlug"=${command.hubSlug} FOR UPDATE`;
  const owner=row.authorId===actorId,isModerator=moderator(user),origin=head?await authorizedOrigin(tx,head,actorId):false;
  const [receipt]=await tx.$queryRaw<Array<{associationId:string;workflowId:string;hubSlug:string;eventId:string;appliedRevision:number;requestHash:string}>>`SELECT * FROM workflow_hub_receipts WHERE "actorId"=${actorId} AND "idempotencyKey"=${command.idempotencyKey}::uuid`;
  if(receipt){if(receipt.workflowId!==row.id||receipt.hubSlug!==command.hubSlug||receipt.requestHash!==requestHash)return fail("IDEMPOTENCY_CONFLICT");await assertAuthority(tx,actorId,command.action==="reviewAssociation");return{associationId:receipt.associationId,eventId:receipt.eventId,appliedRevision:receipt.appliedRevision,duplicate:true};}
  if(command.action==="requestAssociation"&&!owner)return fail("FORBIDDEN",403);
  if(command.action==="reviewAssociation"&&!isModerator)return fail("FORBIDDEN",403);
  if(command.action==="withdrawAssociation"&&!isModerator&&!origin)return fail("FORBIDDEN",403);

  if((head?.revision??0)!==command.expectedRevision)return fail("REVISION_CONFLICT");
  let versionId:string,requestEventId:string|null=null,action:"REQUEST"|"APPROVE"|"REJECT"|"WITHDRAW",reason:string;
  if(command.action==="requestAssociation"){
   if(!await eligible(tx,row,command.versionId))return fail("REVIEWED_VERSION_REQUIRED");versionId=command.versionId;action="REQUEST";reason=command.relationReason;
  }else{
   if(!head)return fail("NOT_FOUND",404);
   const request=await event(tx,command.action==="reviewAssociation"?head.requestEventId:command.targetRequestEventId);
   if(!request)return fail("INVALID_STATE");requestEventId=request.id;versionId=request.versionId;reason=command.reason;
   if(command.action==="reviewAssociation"){
    if(request.id!==command.requestEventId)return fail("REVISION_CONFLICT");if(request.actorId===actorId)return fail("SELF_REVIEW_FORBIDDEN",403);
    if(command.decision==="APPROVE"&&(request.actorId!==row.authorId||!await eligible(tx,row,request.versionId)))return fail("REVIEWED_VERSION_REQUIRED");action=command.decision;
   }else{const approved=await event(tx,head.approvedEventId);if(request.id!==head.requestEventId&&request.id!==approved?.requestEventId)return fail("INVALID_STATE");if(!isModerator&&request.actorId!==actorId)return fail("FORBIDDEN",403);action="WITHDRAW";}
  }
  const associationId=head?.id??randomUUID(),revision=(head?.revision??0)+1,eventId=randomUUID();
  if(!head)await tx.$executeRaw`INSERT INTO workflow_hub_associations(id,"workflowId","hubSlug") VALUES(${associationId},${row.id},${command.hubSlug})`;
  await tx.$executeRaw`INSERT INTO workflow_hub_events(id,"associationId","workflowId","hubSlug",revision,action,"versionId","actorId","requestEventId",reason) VALUES(${eventId},${associationId},${row.id},${command.hubSlug},${revision},${action},${versionId},${actorId},${requestEventId},${reason})`;
  const oldApproved=await event(tx,head?.approvedEventId??null);
  const nextRequest=action==="REQUEST"?eventId:action==="WITHDRAW"&&head?.requestEventId!==requestEventId?head?.requestEventId??null:null;
  const nextApproval=action==="APPROVE"?eventId:action==="WITHDRAW"&&oldApproved?.requestEventId===requestEventId?null:head?.approvedEventId??null;
  await tx.$executeRaw`UPDATE workflow_hub_associations SET revision=${revision},"requestEventId"=${nextRequest},"approvedEventId"=${nextApproval},"updatedAt"=clock_timestamp() WHERE id=${associationId}`;
  await tx.$executeRaw`INSERT INTO workflow_hub_receipts(id,"associationId","workflowId","hubSlug","actorId","idempotencyKey","requestHash","eventId","appliedRevision") VALUES(${randomUUID()},${associationId},${row.id},${command.hubSlug},${actorId},${command.idempotencyKey}::uuid,${requestHash},${eventId},${revision})`;
  await tx.auditLog.create({data:{actorId,action:"WORKFLOW_HUB_"+action,resourceType:"workflow_hub",resourceId:associationId,metadata:{workflowId:row.id,hubSlug:command.hubSlug,versionId,eventId,revision}}});
  await assertAuthority(tx,actorId,command.action==="reviewAssociation");
  return {associationId,eventId,appliedRevision:revision,duplicate:false};
 },{timeout:15000});
}
export async function readWorkflowHubQueue(actorId:string,raw:unknown={}){const query=workflowHubQuerySchema.parse(raw);return db.$transaction(async tx=>{
 const initialUser=await actor(tx,actorId);if(!moderator(initialUser))return fail("FORBIDDEN",403);
 const rows=await tx.$queryRaw<Array<{id:string;slug:string}>>`SELECT w.id,w.slug FROM workflows w WHERE EXISTS(SELECT 1 FROM workflow_hub_associations h WHERE h."workflowId"=w.id AND h."requestEventId" IS NOT NULL) AND (${query.cursor??null}::text IS NULL OR w.id>${query.cursor??null}) ORDER BY w.id LIMIT 21`;
 await tx.$queryRaw`SELECT id FROM workflows WHERE id=ANY(${rows.map(r=>r.id)}::text[]) ORDER BY id FOR SHARE`;
 const owners=await tx.workflow.findMany({where:{id:{in:rows.map(r=>r.id)}},select:{authorId:true}});await lockPeople(tx,[actorId,...owners.map(r=>r.authorId)]);await assertAuthority(tx,actorId,true);
 const items=[];for(const row of rows.slice(0,20))items.push(await management(tx,await workflow(tx,row.slug),actorId));await assertAuthority(tx,actorId,true);return {items,nextCursor:rows.length>20?rows[19].id:null};
 },{timeout:15000});}
/** Discovery is read-only at one repeatable PostgreSQL snapshot: count, exact
 * approvals, owner state and market links describe the same committed instant.
 * No row locks are taken, so marketplace listing?workflow writers cannot deadlock. */
export async function readHubMemberWorkflows(hubSlug:WorkflowHubSlug,cursor?:string):Promise<HubWorkflowPage>{
 return db.$transaction(async tx=>{
  const qualified=Prisma.sql`SELECT h.id AS cursor,w.id,w.slug,w.title,w.summary,w."authorId",w."estimatedCost",v.id AS "versionId",v.version,v.definition
   FROM workflow_hub_associations h JOIN workflow_hub_events a ON a.id=h."approvedEventId" AND a.action='APPROVE'
   JOIN workflow_hub_events r ON r.id=a."requestEventId" AND r.action='REQUEST' AND r."actorId"<>a."actorId"
   JOIN workflows w ON w.id=h."workflowId" AND w."authorId"=r."actorId" AND w.status='PUBLISHED' AND NOT w."isOfficial"
   JOIN users u ON u.id=w."authorId" AND NOT u.flagged AND u."deletedAt" IS NULL
   JOIN workflow_versions v ON v.id=a."versionId" AND v."workflowId"=w.id AND v.version=w."publishedVersion"
   WHERE h."hubSlug"=${hubSlug} AND workflow_hub_definition_valid(v.definition) AND EXISTS(
    SELECT 1 FROM (SELECT "createdAt",after FROM audit_logs WHERE "resourceType"='workflow' AND "resourceId"=w.id AND action='WORKFLOW_APPROVED' AND "createdAt">=v."createdAt" ORDER BY "createdAt" DESC LIMIT 100) approval
    WHERE after->>'status'='PUBLISHED' AND CASE WHEN jsonb_typeof(after->'publishedVersion')='number' THEN (after->>'publishedVersion')::numeric=v.version AND (NOT(after ? 'versionId') OR (jsonb_typeof(after->'versionId')='string' AND after->>'versionId'=v.id))
     ELSE v.id=(SELECT id FROM workflow_versions historical WHERE historical."workflowId"=w.id AND historical."createdAt"<=approval."createdAt" ORDER BY historical.version DESC LIMIT 1) END)`;
  const [count]=await tx.$queryRaw<Array<{total:number}>>`WITH qualified AS (${qualified}) SELECT count(*)::integer AS total FROM qualified`;
  const rows=await tx.$queryRaw<Array<{cursor:string;id:string;slug:string;title:string;summary:string|null;authorId:string;estimatedCost:number;versionId:string;version:number;definition:unknown}>>`WITH qualified AS (${qualified}) SELECT * FROM qualified WHERE (${cursor??null}::text IS NULL OR cursor>${cursor??null}) ORDER BY cursor LIMIT 25`;
  // At most 24 definitions and market payloads leave PostgreSQL; SQL count/list
  // use one qualification predicate in the same repeatable-read snapshot.
  const page=rows.slice(0,24).map(row=>{const definition=workflowDefinitionSchema.parse(row.definition);if(!validateWorkflow(definition).ok)throw new WorkflowHubError("INTERNAL_ERROR",500);assertSupportedRecipe(definition);return{cursor:row.cursor,w:{id:row.id,slug:row.slug,title:row.title,summary:row.summary,authorId:row.authorId,estimatedCost:row.estimatedCost},v:{id:row.versionId,version:row.version},definition};});
  const slugs=page.map(({w,v})=>`workflow-${marketHash(w.id).slice(0,24)}-v${v.version}`);
  const listings=slugs.length ? await tx.marketListing.findMany({where:{slug:{in:slugs},status:"PUBLISHED",seller:{deletedAt:null,flagged:false}},include:{versions:true}}) : [];
  const items=page.map(({w,v,definition})=>{const slug=`workflow-${marketHash(w.id).slice(0,24)}-v${v.version}`,listing=listings.find(l=>l.slug===slug&&l.sellerId===w.authorId),published=listing?.versions.find(v=>v.version===listing.publishedVersion),parsed=marketListingInputSchema.safeParse(published?.payload),binding=parsed.success?parsed.data.execution:null;
   const exact=published?.reviewedAt&&binding&&binding.workflowId===w.id&&binding.versionId===v.id&&binding.version===v.version&&binding.definitionHash===workflowDefinitionHash(definition);
   return{id:w.id,slug:w.slug,title:w.title,summary:w.summary,versionId:v.id,version:v.version,estimatedCost:w.estimatedCost,marketPath:exact?`/market/${slug}`:null};});
  return {items,total:count.total,nextCursor:rows.length>24?page[23].cursor:null};
 },{timeout:15000,isolationLevel:"RepeatableRead"});
}
