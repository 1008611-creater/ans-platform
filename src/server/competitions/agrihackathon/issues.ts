import type { DbTransaction } from "@/lib/db";
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriIssueCommandSchema, agriIssuesQuerySchema, type AgriIssueItem, type AgriIssueEventItem, type AgriIssueList, type AgriIssueDetail, type AgriIssueResult, type AgriIssueFields } from "@/contracts/agri-issues";
import { lockAgriWorkspace, requireAgriScope, assertAgriAuthorityCurrent, agriDatabaseClock, type AgriWorkspaceContext } from "./workspace";
type Tx=DbTransaction;
type Authority=Awaited<ReturnType<typeof requireAgriScope>>;
const idSchema=z.string().trim().min(1).max(80);
const fail=(code:string,status=409):never=>{throw new AgriWorkspaceError(code,status);};
interface Target {id:string;competitionId:string;entryStageId:string;teamId:string;artifactVersionId:string;sequence:number}
interface Row extends Omit<AgriIssueFields,"reviewedForTeam"|"dueAt"> {id:string;competitionId:string;entryStageId:string;submissionId:string;basis:"METADATA"|"PRIVATE_MATERIALS";revision:number;dueAt:Date|null;createdById:string;createdAt:Date;updatedAt:Date;completedById:string|null;completedAt:Date|null}
interface EventRow {id:string;kind:AgriIssueEventItem["kind"];body:string;visibility:Row["visibility"];basis:Row["basis"];revision:number;actorId:string;afterState:unknown;createdAt:Date}
const cursorSchema=z.object({actorId:idSchema,competitionId:idSchema,targetId:idSchema,scope:z.enum(["team","staff"]),kind:z.enum(["issues","events"]),id:idSchema,createdAt:z.string().datetime()}).strict();
function cursor(raw:string|undefined){if(!raw)return null;try{return cursorSchema.parse(JSON.parse(Buffer.from(raw,"base64url").toString("utf8")));}catch{return fail("INVALID_CURSOR",400);}}
async function optional(tx:Tx,ctx:AgriWorkspaceContext,scope:"PRIVATE_MATERIALS_READ"|"INTERNAL_NOTES_READ"|"ISSUES_WRITE"){try{return await requireAgriScope(tx,ctx,scope);}catch(e){if(e instanceof AgriWorkspaceError&&e.code==="AGRI_SCOPE_REQUIRED")return null;throw e;}}
async function target(tx:Tx,ctx:AgriWorkspaceContext,submissionId:string,team:boolean){
 const [row]=await tx.$queryRaw<Target[]>`SELECT s.id,s."competitionId",s."entryStageId",s."artifactVersionId",s.sequence,tc."teamId" FROM agri_stage_submissions s JOIN agri_entry_stages es ON es.id=s."entryStageId" JOIN team_competitions tc ON tc.id=es."teamCompetitionId" WHERE s.id=${submissionId} AND s."competitionId"=${ctx.workspace.competitionId} FOR SHARE OF tc,es`;
 if(!row)return fail("AGRI_SUBMISSION_NOT_FOUND",404);
 if(team){const [member]=await tx.$queryRaw<Array<{status:string}>>`SELECT status FROM team_members WHERE "teamId"=${row.teamId} AND "userId"=${ctx.actorId} FOR SHARE`;if(member?.status!=="ACTIVE")return fail("AGRI_TEAM_PERMISSION_REQUIRED",403);}
 return row;
}
async function authority(tx:Tx,ctx:AgriWorkspaceContext,staff:boolean){
 const read=staff?await requireAgriScope(tx,ctx,"WORKS_READ"):null,write=staff?await optional(tx,ctx,"ISSUES_WRITE"):null;
 const notes=staff?await optional(tx,ctx,"INTERNAL_NOTES_READ"):null,materials=staff?await optional(tx,ctx,"PRIVATE_MATERIALS_READ"):null;
 return {read,write,notes,materials};
}
function permissions(ctx:AgriWorkspaceContext,item:Target,a:Awaited<ReturnType<typeof authority>>){return {competitionId:item.competitionId,submissionId:item.id,artifactVersionId:item.artifactVersionId,submissionSequence:item.sequence,workspaceEnabled:ctx.workspace.enabled,canWrite:!!a.write&&ctx.workspace.enabled,canUseInternalNotes:!!a.notes,canReadPrivateMaterials:!!a.materials};}
function visible(row:Pick<Row,"visibility"|"basis">,staff:boolean,a:Awaited<ReturnType<typeof authority>>){return staff?(row.visibility==="TEAM"||!!a.notes)&&(row.basis==="METADATA"||!!a.materials):row.visibility==="TEAM";}
function view(row:Row,item:Target,staff:boolean):AgriIssueItem {return {id:row.id,submissionId:row.submissionId,artifactVersionId:item.artifactVersionId,title:row.title,body:row.body,status:row.status,severity:row.severity,type:row.type,basis:row.basis,visibility:row.visibility,dueState:row.dueState,dueAt:row.dueAt?.toISOString()??null,processingSummary:row.processingSummary,createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString(),...(staff?{revision:row.revision,assigneeId:row.assigneeId,createdById:row.createdById,completedById:row.completedById,completedAt:row.completedAt?.toISOString()??null}:{})};}
function validateCursor(c:ReturnType<typeof cursor>,ctx:AgriWorkspaceContext,targetId:string,scope:string,kind:string){if(c&&(c.actorId!==ctx.actorId||c.competitionId!==ctx.workspace.competitionId||c.targetId!==targetId||c.scope!==scope||c.kind!==kind))return fail("INVALID_CURSOR",400);}
function nextCursor(rows:Array<{id:string;createdAt:Date}>,ctx:AgriWorkspaceContext,targetId:string,scope:string,kind:string){const last=rows[29];return rows.length>30?Buffer.from(JSON.stringify({actorId:ctx.actorId,competitionId:ctx.workspace.competitionId,targetId,scope,kind,id:last.id,createdAt:last.createdAt.toISOString()})).toString("base64url"):null;}
/** Team membership and issue/event visibility are checked independently before pagination. */
export async function readAgriIssues(actorId:string,rawSubmissionId:string,rawQuery:unknown={}):Promise<AgriIssueList>{
 const submissionId=idSchema.parse(rawSubmissionId),query=agriIssuesQuerySchema.parse(rawQuery),c=cursor(query.cursor);
 return db.$transaction(async tx=>{const ctx=await lockAgriWorkspace(tx,actorId),staff=query.scope==="staff",a=await authority(tx,ctx,staff),item=await target(tx,ctx,submissionId,!staff);validateCursor(c,ctx,submissionId,query.scope,"issues");
 const rows=await tx.$queryRaw<Row[]>`SELECT * FROM agri_issues WHERE "competitionId"=${item.competitionId} AND "submissionId"=${submissionId} AND (visibility='TEAM' OR ${staff&&!!a.notes}) AND (basis='METADATA' OR ${!staff||!!a.materials}) AND (${c?.id??null}::text IS NULL OR ("createdAt",id)<(${c?new Date(c.createdAt):null}::timestamptz,${c?.id??null}::text)) ORDER BY "createdAt" DESC,id DESC LIMIT 31`;
 const result={...permissions(ctx,item,a),issues:rows.slice(0,30).map(row=>view(row,item,staff)),nextCursor:nextCursor(rows,ctx,submissionId,query.scope,"issues")};await assertAgriAuthorityCurrent(tx,a.read,a.write,a.notes,a.materials);return result;
 },{timeout:15000});
}
export async function readAgriIssue(actorId:string,rawIssueId:string,rawQuery:unknown={}):Promise<AgriIssueDetail>{
 const issueId=idSchema.parse(rawIssueId),query=agriIssuesQuerySchema.parse(rawQuery),c=cursor(query.cursor);
 return db.$transaction(async tx=>{const ctx=await lockAgriWorkspace(tx,actorId),staff=query.scope==="staff",a=await authority(tx,ctx,staff);const [row]=await tx.$queryRaw<Row[]>`SELECT * FROM agri_issues WHERE id=${issueId} AND "competitionId"=${ctx.workspace.competitionId} FOR SHARE`;
 if(!row)return fail("AGRI_ISSUE_NOT_FOUND",404);const item=await target(tx,ctx,row.submissionId,!staff);if(!visible(row,staff,a))return fail("AGRI_ISSUE_NOT_FOUND",404);validateCursor(c,ctx,issueId,query.scope,"events");
 const rows=await tx.$queryRaw<EventRow[]>`SELECT * FROM agri_issue_events WHERE "issueId"=${issueId} AND "competitionId"=${item.competitionId} AND (visibility='TEAM' OR ${staff&&!!a.notes}) AND (basis='METADATA' OR ${!staff||!!a.materials}) AND (${c?.id??null}::text IS NULL OR ("createdAt",id)<(${c?new Date(c.createdAt):null}::timestamptz,${c?.id??null}::text)) ORDER BY "createdAt" DESC,id DESC LIMIT 31`;
 const result={...permissions(ctx,item,a),issue:view(row,item,staff),events:rows.slice(0,30).map(event=>({id:event.id,kind:event.kind,visibility:event.visibility,basis:event.basis,body:event.body,createdAt:event.createdAt.toISOString(),...(staff?{revision:event.revision,actorId:event.actorId,afterState:event.afterState}:{})})),nextCursor:nextCursor(rows,ctx,issueId,query.scope,"events")};await assertAgriAuthorityCurrent(tx,a.read,a.write,a.notes,a.materials);return result;
 },{timeout:15000});
}
/** A command, its new revision, event, receipt and metadata-only audit commit together. */
export async function executeAgriIssueCommand(actorId:string,raw:unknown):Promise<AgriIssueResult>{
 const command=agriIssueCommandSchema.parse(raw);
 return db.$transaction(async tx=>{const ctx=await lockAgriWorkspace(tx,actorId);if(!ctx.workspace.enabled)return fail("AGRI_WORKSPACE_DISABLED");const read=await requireAgriScope(tx,ctx,"WORKS_READ"),write=await requireAgriScope(tx,ctx,"ISSUES_WRITE"),additional:Authority[]=[];let row:Row|null=null;
 if(command.action!=="createIssue"){const [found]=await tx.$queryRaw<Row[]>`SELECT * FROM agri_issues WHERE id=${command.issueId} AND "competitionId"=${ctx.workspace.competitionId} FOR UPDATE`;if(!found)return fail("AGRI_ISSUE_NOT_FOUND",404);row=found;}
 const item=await target(tx,ctx,command.action==="createIssue"?command.submissionId:row!.submissionId,false);
 if(row?.visibility==="INTERNAL"||command.visibility==="INTERNAL")additional.push(await requireAgriScope(tx,ctx,"INTERNAL_NOTES_READ"));
 const basis=command.action==="updateIssue"?row!.basis:command.basis;
 if(row?.basis==="PRIVATE_MATERIALS"||basis==="PRIVATE_MATERIALS")additional.push(await requireAgriScope(tx,ctx,"PRIVATE_MATERIALS_READ"));
 if(command.action==="appendEvent"&&((row!.visibility==="INTERNAL"&&command.visibility==="TEAM")||(row!.basis==="PRIVATE_MATERIALS"&&command.basis!=="PRIVATE_MATERIALS")))return fail("AGRI_EVENT_VISIBILITY_INVALID",422);
 const requestHash=createHash("sha256").update(JSON.stringify(command)).digest("hex");
 const [prior]=await tx.$queryRaw<Array<{issueId:string;eventId:string;appliedRevision:number;requestHash:string}>>`SELECT "issueId","eventId","appliedRevision","requestHash" FROM agri_issue_receipts WHERE "competitionId"=${item.competitionId} AND "actorId"=${actorId} AND operation=${command.action} AND "idempotencyKey"=${command.idempotencyKey}`;
 if(prior){if(prior.requestHash!==requestHash)return fail("AGRI_IDEMPOTENCY_CONFLICT");
  // Replays retain the original internal authority requirement even after declassification.
  if(command.action==="updateIssue"){const [previous]=await tx.$queryRaw<Array<{visibility:string}>>`SELECT visibility FROM agri_issue_events WHERE "issueId"=${prior.issueId} AND revision<${prior.appliedRevision} AND kind IN ('CREATE','UPDATE') ORDER BY revision DESC LIMIT 1`;if(previous?.visibility==="INTERNAL")additional.push(await requireAgriScope(tx,ctx,"INTERNAL_NOTES_READ"));}
  await assertAgriAuthorityCurrent(tx,read,write,...additional);return {issueId:prior.issueId,eventId:prior.eventId,appliedRevision:prior.appliedRevision,duplicate:true};}
 if(command.action!=="createIssue"&&row!.revision!==command.expectedRevision)return fail("AGRI_ISSUE_REVISION_CONFLICT");
 if(command.action!=="appendEvent"&&command.assigneeId){const [assignee]=await tx.$queryRaw<Array<{flagged:boolean;deletedAt:Date|null}>>`SELECT flagged,"deletedAt" FROM users WHERE id=${command.assigneeId} FOR SHARE`;if(!assignee||assignee.flagged||assignee.deletedAt)return fail("AGRI_ASSIGNEE_UNAVAILABLE",422);}
 const now=await agriDatabaseClock(tx),issueId=row?.id??randomUUID(),eventId=randomUUID(),revision=(row?.revision??0)+1;
 const done=command.action!=="appendEvent"&&["RESOLVED","CLOSED"].includes(command.status),completedBy=done?actorId:null,completedAt=done?now:null;
 if(command.action==="createIssue")await tx.$executeRaw`INSERT INTO agri_issues (id,"competitionId","entryStageId","submissionId",title,body,status,severity,type,basis,visibility,"assigneeId","dueState","dueAt","processingSummary","completedById","completedAt",revision,"createdById","createdAt","updatedAt") VALUES (${issueId},${item.competitionId},${item.entryStageId},${item.id},${command.title},${command.body},${command.status},${command.severity},${command.type},${basis},${command.visibility},${command.assigneeId},${command.dueState},${command.dueAt?new Date(command.dueAt):null},${command.processingSummary},${completedBy},${completedAt},${revision},${actorId},${now},${now})`;
 else if(command.action==="updateIssue")await tx.$executeRaw`UPDATE agri_issues SET title=${command.title},body=${command.body},status=${command.status},severity=${command.severity},type=${command.type},visibility=${command.visibility},"assigneeId"=${command.assigneeId},"dueState"=${command.dueState},"dueAt"=${command.dueAt?new Date(command.dueAt):null},"processingSummary"=${command.processingSummary},"completedById"=${completedBy},"completedAt"=${completedAt},revision=${revision},"updatedAt"=${now} WHERE id=${issueId} AND revision=${command.expectedRevision}`;
 else await tx.$executeRaw`UPDATE agri_issues SET revision=${revision},"updatedAt"=${now} WHERE id=${issueId} AND revision=${command.expectedRevision}`;
 const eventBody=command.action==="appendEvent"?command.body:command.processingSummary??command.body;
 const afterState=command.action==="appendEvent"?null:JSON.stringify({title:command.title,body:command.body,status:command.status,severity:command.severity,type:command.type,visibility:command.visibility,assigneeId:command.assigneeId,dueState:command.dueState,dueAt:command.dueAt,processingSummary:command.processingSummary});
 await tx.$executeRaw`INSERT INTO agri_issue_events (id,"competitionId","issueId",revision,kind,visibility,basis,body,"afterState","actorId","createdAt") VALUES (${eventId},${item.competitionId},${issueId},${revision},${command.action==="createIssue"?"CREATE":command.action==="updateIssue"?"UPDATE":"COMMENT"},${command.visibility},${basis},${eventBody},${afterState}::jsonb,${actorId},${now})`;
 await tx.$executeRaw`INSERT INTO agri_issue_receipts (id,"competitionId","issueId","eventId","actorId",operation,"idempotencyKey","requestHash","appliedRevision","createdAt") VALUES (${randomUUID()},${item.competitionId},${issueId},${eventId},${actorId},${command.action},${command.idempotencyKey},${requestHash},${revision},${now})`;
 await tx.auditLog.create({data:{actorId,action:"AGRI_"+command.action.toUpperCase(),resourceType:"agri_issue",resourceId:issueId,metadata:{competitionId:item.competitionId,submissionId:item.id,revision,eventId}}});await assertAgriAuthorityCurrent(tx,read,write,...additional);return {issueId,eventId,appliedRevision:revision,duplicate:false};
 },{timeout:15000});
}
