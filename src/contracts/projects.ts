import { z } from "zod";

export const projectGoalSchema = z.enum(["career", "contest", "portfolio"]);
export const projectVisibilitySchema = z.enum(["private", "team", "public"]);
export const factConfirmationSchema = z.enum(["missing", "unconfirmed", "confirmed"]);

export const officialWorkflowIds = [
  "project-facts",
  "resume-bullets",
  "readme-draft",
  "project-one-pager",
  "contest-mvp",
  "pitch-outline",
  "defense-qa",
  "project-retrospective",
] as const;

export const officialWorkflowIdSchema = z.enum(officialWorkflowIds);

export const factKeySchema = z.enum([
  "problem",
  "contribution",
  "method",
  "result",
  "evidence",
]);

export const projectCreateSchema = z.object({
  title: z.string().trim().min(1).max(80),
  goal: projectGoalSchema,
  teamId: z.string().trim().min(1).max(80).optional(),
});

export const projectUpdateSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  status: z.enum(["active", "archived"]).optional(),
  visibility: projectVisibilitySchema.optional(),
}).refine((value) => Object.keys(value).length > 0, "至少修改一项。");

export const projectFactInputSchema = z.object({
  key: factKeySchema,
  value: z.string().trim().max(2000),
  evidenceUrl: z.string().trim().max(500).optional(),
  confirmation: factConfirmationSchema,
});

export const projectFactsInputSchema = z.object({
  facts: z.array(projectFactInputSchema).min(1).max(5),
});

export const projectRunInputSchema = z.object({
  workflowId: officialWorkflowIdSchema,
  idempotencyKey: z.string().trim().regex(/^[a-zA-Z0-9_-]{8,80}$/).optional(),
});

export type ProjectGoal = z.infer<typeof projectGoalSchema>;
export type OfficialWorkflowId = z.infer<typeof officialWorkflowIdSchema>;
export type FactKey = z.infer<typeof factKeySchema>;
export type FactConfirmation = z.infer<typeof factConfirmationSchema>;
