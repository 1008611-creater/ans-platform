import { z } from "zod";
import type { WorkflowExperience } from "./workflow";
export interface HubWorkflowPresentation { output: WorkflowExperience["output"]; stages: Array<{ title: string }>; nodeCount: number; }
export const workflowHubSlugSchema=z.enum(["cauhub","vibehub","aigc","full-stack"]);
export type WorkflowHubSlug=z.infer<typeof workflowHubSlugSchema>;
const id=z.string().trim().min(1).max(80),reason=z.string().trim().min(10).max(2000);
const base={hubSlug:workflowHubSlugSchema,expectedRevision:z.number().int().min(0).max(2147483646),idempotencyKey:z.string().uuid()};
export const workflowHubCommandSchema=z.discriminatedUnion("action",[
 z.object({...base,action:z.literal("requestAssociation"),versionId:id,relationReason:reason}).strict().superRefine((v,c)=>{if(v.hubSlug==="cauhub"&&v.relationReason.length<20)c.addIssue({code:"custom",path:["relationReason"],message:"CAU_RELATION_REQUIRED"});}),
 z.object({...base,action:z.literal("reviewAssociation"),requestEventId:id,decision:z.enum(["APPROVE","REJECT"]),reason}).strict(),
 z.object({...base,action:z.literal("withdrawAssociation"),targetRequestEventId:id,reason}).strict(),
]);
export type WorkflowHubCommand=z.infer<typeof workflowHubCommandSchema>;
export const workflowHubEventSchema=z.object({id,revision:z.number().int().min(1),action:z.enum(["REQUEST","APPROVE","REJECT","WITHDRAW"]),versionId:id,requestEventId:id.nullable(),reason:z.string(),createdAt:z.string().datetime()}).strict();
export const workflowHubRecordSchema=z.object({hubSlug:workflowHubSlugSchema,revision:z.number().int().min(0),state:z.enum(["NONE","PENDING","APPROVED","REJECTED","WITHDRAWN","STALE"]),requestEventId:id.nullable(),requestVersionId:id.nullable(),requestVersion:z.number().int().min(1).nullable(),approvedVersionId:id.nullable(),approvedVisible:z.boolean(),canReview:z.boolean(),canWithdraw:z.boolean(),withdrawRequestEventIds:z.array(id),requestReason:z.string().nullable(),events:z.array(workflowHubEventSchema),nextBeforeRevision:z.number().int().min(1).nullable()}).strict();
export const workflowHubManagementSchema=z.object({workflowId:id,slug:z.string(),title:z.string(),isOfficial:z.boolean(),canRequest:z.boolean(),publishedVersion:z.object({id,version:z.number().int().min(1)}).nullable(),associations:z.array(workflowHubRecordSchema)}).strict();
export type WorkflowHubManagement=z.infer<typeof workflowHubManagementSchema>;
export const workflowHubResultSchema=z.object({associationId:id,eventId:id,appliedRevision:z.number().int().min(1),duplicate:z.boolean()}).strict();
export const workflowHubQueueSchema=z.object({items:z.array(workflowHubManagementSchema),nextCursor:id.nullable()}).strict();
export const workflowHubQuerySchema=z.object({hubSlug:workflowHubSlugSchema.optional(),beforeRevision:z.coerce.number().int().min(1).optional(),cursor:id.optional()}).strict();
export interface HubWorkflowCard {id:string;slug:string;title:string;summary:string|null;versionId:string;version:number;estimatedCost:number;marketPath:string|null;presentation?:HubWorkflowPresentation;}
export interface HubWorkflowPage {items:HubWorkflowCard[];total:number;nextCursor:string|null;}
