import { z } from "zod";

export const artifactReviewDecisionSchema = z.enum(["approve", "reject"]);

export const artifactReviewRequestSchema = z.object({
  artifactVersionId: z.string().trim().min(1).max(80),
  acknowledged: z.literal(true),
});

export const artifactReviewDecisionInputSchema = z.object({
  artifactVersionId: z.string().trim().min(1).max(80),
  decision: artifactReviewDecisionSchema,
  note: z.string().trim().min(1).max(500),
});
