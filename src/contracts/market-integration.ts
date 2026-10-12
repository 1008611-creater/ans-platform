import { z } from "zod";
import { marketTierIdSchema } from "./marketplace";
export const returnUrlSchema = z.string().trim().url().max(1000).refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && !url.hash;
}, "INVALID_RETURN_URL");
export const integrationSetupSchema = z.object({
  action: z.enum(["rotate", "revoke"]),
  returnOrigins: z.array(returnUrlSchema.refine(value => { const u = new URL(value); return u.pathname === "/" && !u.search; }, "ORIGIN_ONLY")).min(1).max(10).optional(),
}).strict();
export const externalCheckoutSchema = z.object({
  reference: z.string().regex(/^[A-Za-z0-9_-]{8,80}$/),
  tierId: marketTierIdSchema.optional(), returnUrl: returnUrlSchema,
}).strict();
