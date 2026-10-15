import { z } from "zod";

const identifier = z.string().min(8).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/);
const userId = z.string().min(1).max(128);
const modelId = z.string().min(1).max(160);
const taskFields = { userId, taskId: identifier, eventId: identifier, expectedRevision: z.number().int().min(1) };
export const computeCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("balance"), userId }).strict(),
  z.object({ action: z.literal("quote"), userId, modelId, maxUnits: z.number().int().min(1).max(1_000_000_000) }).strict(),
  z.object({ action: z.literal("reserve"), userId, modelId, maxUnits: z.number().int().min(1).max(1_000_000_000), idempotencyKey: identifier, expectedPolicyVersion: identifier.optional(), expectedUnit: z.enum(["token", "image", "second"]).optional(), maxAuthorizedPoints: z.number().int().min(1).max(2_000_000_000).optional() }).strict(),
  z.object({ action: z.literal("reservation"), userId, modelId, maxUnits: z.number().int().min(1).max(1_000_000_000), idempotencyKey: identifier, expectedPolicyVersion: identifier.optional(), expectedUnit: z.enum(["token", "image", "second"]).optional(), maxAuthorizedPoints: z.number().int().min(1).max(2_000_000_000).optional() }).strict(),
  z.object({ action: z.literal("read"), userId, taskId: identifier }).strict(),
  z.object({ action: z.literal("history"), userId, limit: z.number().int().min(1).max(100).default(30) }).strict(),
  z.object({ action: z.literal("start"), ...taskFields }).strict(),
  z.object({ action: z.literal("uncertain"), ...taskFields }).strict(),
  z.object({ action: z.literal("settle"), ...taskFields, units: z.number().int().min(1).max(1_000_000_000), outcome: z.enum(["succeeded", "partial", "failed"]), evidenceRef: identifier }).strict(),
  z.object({ action: z.literal("release"), ...taskFields, evidence: z.enum(["not_started", "confirmed_no_usage"]), evidenceRef: identifier }).strict(),
]);
export type ComputeCommand = z.infer<typeof computeCommandSchema>;
export const computePriceSchema = z.object({
  unit: z.enum(["token", "image", "second"]),
  ratePoints: z.number().int().min(1).max(1_000_000_000),
  rateUnits: z.number().int().min(1).max(1_000_000_000),
  maxUnits: z.number().int().min(1).max(1_000_000_000),
}).strict();
export const computePolicySchema = z.object({
  version: identifier,
  concurrentMax: z.number().int().min(1).max(20),
  models: z.record(modelId, computePriceSchema),
}).strict();
export type ComputePrice = z.infer<typeof computePriceSchema>;
export type ComputePolicy = z.infer<typeof computePolicySchema>;
