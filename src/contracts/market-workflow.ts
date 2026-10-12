import { z } from "zod";
export const marketWorkflowBindingSchema = z.object({
  workflowId: z.string().min(1).max(100), versionId: z.string().min(1).max(100),
  version: z.number().int().positive(), definitionHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export const marketWorkflowUploadSchema = z.object({
  expectedWorkflowVersion: z.number().int().positive(),
  category: z.enum(["learning", "career", "aigc", "web", "github", "business", "productivity", "competition"]),
  subcategory: z.string().min(1).max(80), licenseTerms: z.string().trim().min(10).max(3000),
}).strict();
export const marketWorkflowRunSchema = z.object({
  expectedVersion: z.number().int().positive(), acknowledged: z.literal(true),
  input: z.record(z.string(), z.unknown()), idempotencyKey: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/),
}).strict();
export type MarketWorkflowBinding = z.infer<typeof marketWorkflowBindingSchema>;
