import { z } from "zod";

export const mediaGenerationKeySchema = z.string().min(8).max(100).regex(/^[A-Za-z0-9_-]+$/);
export const mediaGenerationInputSchema = z.object({
  idempotencyKey: mediaGenerationKeySchema,
  prompt: z.string().trim().min(1).max(10_000),
  model: z.string().min(1).max(200),
  provider: z.string().min(1).max(100),
  type: z.enum(["image", "video", "audio"]),
  inputImageUrl: z.string().url().max(2000).refine(value => new URL(value).protocol === "https:").optional(),
  resolution: z.enum(["1K", "2K", "4K"]).optional(),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"]).optional(),
}).strict();
export type MediaGenerationInput = z.infer<typeof mediaGenerationInputSchema>;

export const mediaReconciliationSchema = z.discriminatedUnion("resolution", [
  z.object({ resolution: z.literal("accepted"), reference: z.string().trim().min(8).max(300),
    task: z.object({ taskId: z.string().min(1).max(200), socketAccessToken: z.string().min(1).max(500) }).strict() }).strict(),
  z.object({ resolution: z.literal("notAccepted"), confirmedNotAccepted: z.literal(true), reference: z.string().trim().min(8).max(300) }).strict(),
]);
