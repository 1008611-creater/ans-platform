import { z } from "zod";
const id=z.string().trim().min(1).max(80);
export const agriIssueStatusSchema=z.enum(["OPEN","IN_PROGRESS","BLOCKED","RESOLVED","CLOSED"]);
export const agriIssueSeveritySchema=z.enum(["LOW","MEDIUM","HIGH","CRITICAL"]);
export const agriIssueTypeSchema=z.enum(["BUG","ENVIRONMENT","DATA","ACCESS","OTHER"]);
export const agriIssueVisibilitySchema=z.enum(["TEAM","INTERNAL"]);
export const agriIssueBasisSchema=z.enum(["METADATA","PRIVATE_MATERIALS"]);
export const agriIssueFieldsSchema=z.object({
 title:z.string().trim().min(1).max(180),body:z.string().trim().min(1).max(4000),
 status:agriIssueStatusSchema,severity:agriIssueSeveritySchema,type:agriIssueTypeSchema,visibility:agriIssueVisibilitySchema,
 assigneeId:id.nullable(),dueState:z.enum(["UNKNOWN","TENTATIVE","CONFIRMED"]),dueAt:z.string().datetime({offset:true}).nullable(),
 processingSummary:z.string().trim().min(1).max(4000).nullable(),reviewedForTeam:z.boolean(),
}).strict();
function consistent(value:z.infer<typeof agriIssueFieldsSchema>,ctx:z.RefinementCtx){
 if((value.dueState==="UNKNOWN")!==(value.dueAt===null))ctx.addIssue({code:"custom",path:["dueAt"],message:"AGRI_DUE_STATE_INVALID"});
 if(["RESOLVED","CLOSED"].includes(value.status)!==(value.processingSummary!==null))ctx.addIssue({code:"custom",path:["processingSummary"],message:"AGRI_PROCESSING_REQUIRED"});
 if(value.visibility==="TEAM"&&!value.reviewedForTeam)ctx.addIssue({code:"custom",path:["reviewedForTeam"],message:"AGRI_TEAM_REVIEW_REQUIRED"});
}
const common={idempotencyKey:z.string().uuid()};
export const agriIssueCommandSchema=z.discriminatedUnion("action",[
 agriIssueFieldsSchema.extend({...common,action:z.literal("createIssue"),submissionId:id,basis:agriIssueBasisSchema}).superRefine(consistent),
 agriIssueFieldsSchema.extend({...common,action:z.literal("updateIssue"),issueId:id,expectedRevision:z.number().int().min(1).max(2147483646)}).superRefine(consistent),
 z.object({...common,action:z.literal("appendEvent"),issueId:id,expectedRevision:z.number().int().min(1).max(2147483646),visibility:agriIssueVisibilitySchema,basis:agriIssueBasisSchema,body:z.string().trim().min(1).max(4000),reviewedForTeam:z.boolean()}).strict().superRefine((value,ctx)=>{if(value.visibility==="TEAM"&&!value.reviewedForTeam)ctx.addIssue({code:"custom",path:["reviewedForTeam"],message:"AGRI_TEAM_REVIEW_REQUIRED"});}),
]);
export type AgriIssueCommand=z.infer<typeof agriIssueCommandSchema>;
export type AgriIssueFields=z.infer<typeof agriIssueFieldsSchema>;
export const agriIssuesQuerySchema=z.object({scope:z.enum(["team","staff"]).default("team"),cursor:z.string().max(1600).optional()}).strict();
export interface AgriIssueItem {
 id:string;submissionId:string;artifactVersionId:string;title:string;body:string;status:AgriIssueFields["status"];severity:AgriIssueFields["severity"];type:AgriIssueFields["type"];basis:"METADATA"|"PRIVATE_MATERIALS";visibility:"TEAM"|"INTERNAL";
 dueState:AgriIssueFields["dueState"];dueAt:string|null;processingSummary:string|null;createdAt:string;updatedAt:string;
 revision?:number;assigneeId?:string|null;createdById?:string;completedById?:string|null;completedAt?:string|null;
}
export interface AgriIssueEventItem {id:string;kind:"CREATE"|"UPDATE"|"COMMENT";body:string;createdAt:string;visibility:"TEAM"|"INTERNAL";basis:"METADATA"|"PRIVATE_MATERIALS";revision?:number;actorId?:string;afterState?:unknown}
export interface AgriIssuePermissions {competitionId:string;submissionId:string;artifactVersionId:string;submissionSequence:number;workspaceEnabled:boolean;canWrite:boolean;canUseInternalNotes:boolean;canReadPrivateMaterials:boolean}
export interface AgriIssueList extends AgriIssuePermissions {issues:AgriIssueItem[];nextCursor:string|null}
export interface AgriIssueDetail extends AgriIssuePermissions {issue:AgriIssueItem;events:AgriIssueEventItem[];nextCursor:string|null}
export const agriIssueResultSchema=z.object({issueId:id,eventId:id,appliedRevision:z.number().int().min(1),duplicate:z.boolean()}).strict();
export type AgriIssueResult=z.infer<typeof agriIssueResultSchema>;
