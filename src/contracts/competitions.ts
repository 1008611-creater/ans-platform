import { z } from "zod";

export const competitionCreateSchema = z.object({
  title: z.string().trim().min(3).max(120),
  organizer: z.string().trim().max(120).optional(),
  url: z.string().url().max(500).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional(),
  rules: z.string().trim().max(12000).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  maxTeams: z.number().int().min(1).max(10000).nullable().optional(),
  rewardXp: z.number().int().min(0).max(1000000).default(0),
  status: z.enum(["UPCOMING", "ONGOING", "ENDED"]).default("UPCOMING"),
}).refine((value) => !value.startsAt || !value.endsAt || value.startsAt <= value.endsAt, {
  path: ["endsAt"], message: "结束时间必须晚于开始时间。",
});

export const competitionRegisterSchema = z.object({ teamId: z.string().trim().min(1).max(80) });

export const competitionSubmissionSchema = z.object({
  teamId: z.string().trim().min(1).max(80),
  projectId: z.string().trim().min(1).max(80),
  artifactVersionId: z.string().trim().min(1).max(80),
  summary: z.string().trim().min(20).max(3000),
  publicConsent: z.boolean().default(false),
});

export const competitionReviewSchema = z.object({
  teamCompetitionId: z.string().trim().min(1).max(80),
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().min(1).max(2000),
  awardedXp: z.number().int().min(0).max(1000000).default(0),
}).refine((value) => value.decision === "approve" || value.awardedXp === 0, {
  path: ["awardedXp"], message: "未通过的作品不能发放奖励。",
});


export const competitionUpdateSchema = competitionCreateSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "请至少提供一个需要修改的赛事字段。",
});
