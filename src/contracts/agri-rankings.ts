import { z } from "zod";
const id=z.string().trim().min(1).max(80);
export const agriRankingStageSchema=z.enum(["PRELIMINARY","FINAL"]);
export const agriScoreDimensionsSchema=z.object({innovation:z.number().min(0).max(100).multipleOf(0.01),technical:z.number().min(0).max(100).multipleOf(0.01),completeness:z.number().min(0).max(100).multipleOf(0.01),problem:z.number().min(0).max(100).multipleOf(0.01),fit:z.number().min(0).max(100).multipleOf(0.01)}).strict();
export type AgriScoreDimensions=z.infer<typeof agriScoreDimensionsSchema>;
export const agriJudgeScoreCommandSchema=z.object({action:z.literal("recordScore"),submissionId:id,idempotencyKey:z.string().uuid(),dimensions:agriScoreDimensionsSchema}).strict();
export const agriRankingCommandSchema=z.discriminatedUnion("action",[
 z.object({action:z.literal("configurePanel"),stage:agriRankingStageSchema,idempotencyKey:z.string().uuid(),judgeIds:z.array(id).min(3).max(7)}).strict(),
 z.object({action:z.literal("confirmRanking"),stage:agriRankingStageSchema,idempotencyKey:z.string().uuid(),sourceHash:z.string().regex(/^[a-f0-9]{64}$/),orderedEntryIds:z.array(id).max(500),technicalEntryId:id.nullable(),creativeEntryId:id.nullable()}).strict(),
 z.object({action:z.literal("withdrawRanking"),stage:agriRankingStageSchema,idempotencyKey:z.string().uuid(),publicationId:id,reason:z.string().trim().min(1).max(2000)}).strict(),
]);
export const agriRankingCandidateSchema=z.object({entryStageId:id,teamCompetitionId:id,submissionId:id,teamName:z.string(),judgeCount:z.number().int().nonnegative(),requiredJudges:z.number().int(),professionalScore:z.number().nullable(),validStars:z.number().int().nonnegative().nullable(),publicScore:z.number().nullable(),totalScore:z.number().nullable(),rank:z.number().int().nullable()}).strict();
export type AgriRankingCandidate=z.infer<typeof agriRankingCandidateSchema>;
export const agriRankingManagementSchema=z.object({competitionId:id,stage:agriRankingStageSchema,canScore:z.boolean(),canConfirm:z.boolean(),panelJudgeIds:z.array(id),sourceHash:z.string(),ready:z.boolean(),blockedReasons:z.array(z.string()),items:z.array(agriRankingCandidateSchema),publicationId:id.nullable()}).strict();
export type AgriRankingManagement=z.infer<typeof agriRankingManagementSchema>;
export const agriPublicRankingItemSchema=z.object({rank:z.number().int().positive(),professionalScore:z.number(),publicScore:z.number().nullable(),totalScore:z.number(),validStars:z.number().int().nonnegative(),awards:z.array(z.enum(["FIRST","SECOND","THIRD","TECHNICAL","CREATIVE","POPULARITY","FINALIST"])),prizeMinor:z.number().int().nonnegative(),publicationId:id.nullable(),detailHref:z.string(),listingId:id.nullable(),wallHref:z.string().nullable(),content:z.object({title:z.string(),summary:z.string(),teamName:z.string(),track:z.string(),repositoryUrl:z.string().nullable(),demoUrl:z.string().nullable()}).strict()}).strict();
export const agriPublicRankingsSchema=z.object({competitionId:id,boards:z.array(z.object({id,stage:agriRankingStageSchema,publishedAt:z.string().datetime(),items:z.array(agriPublicRankingItemSchema),popularityAwards:z.array(z.object({title:z.string(),teamName:z.string(),validStars:z.number().int().nonnegative(),detailHref:z.string()}).strict()).default([])}).strict())}).strict();
export type AgriPublicRankings=z.infer<typeof agriPublicRankingsSchema>;





export const agriRankingQuerySchema=z.object({stage:agriRankingStageSchema.default("PRELIMINARY")}).strict();
