import { z } from "zod";

export const voiceRequestKey = z.string().uuid();
export const voiceRequestSchema = z.object({
  text: z.string().trim().min(1).max(2400).refine(value => [...value].length <= 1200),
  voice: z.literal("Chloe"),
  policyVersion: z.string().min(1).max(100),
  idempotencyKey: voiceRequestKey,
}).strict();
export type VoiceInput = z.infer<typeof voiceRequestSchema>;
export type VoiceOffer = { available: boolean; mode: "free"; points: 0; modelId: string; policyVersion: string; checkedAt: string; reviewBy: string; cacheHours: number; maxCharacters: number };
