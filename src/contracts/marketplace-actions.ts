import { z } from "zod";
export const marketListingActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submit"), expectedVersion: z.number().int().positive() }).strict(),
  z.object({ action: z.literal("withdraw") }).strict(),
]);
export const marketModerationSchema = z.object({ version: z.number().int().positive(), approve: z.boolean(), note: z.string().trim().min(1).max(2000) }).strict();
