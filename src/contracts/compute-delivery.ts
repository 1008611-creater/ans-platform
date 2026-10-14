import { z } from "zod";

const identifier = z.string().min(8).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/);
const userId = z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const revision = z.number().int().min(1).max(2147483646);
export const computeDeliveryStateSchema = z.enum(["PENDING", "AVAILABLE", "FAILED", "UNAVAILABLE"]);
export const computeDeliveryFailureSchema = z.enum(["WORKSPACE_WRITE_FAILED", "ARTIFACT_MISSING", "ARTIFACT_INVALID", "RECOVERY_PENDING", "GENERATION_FAILED"]);
export const computeDeliveryArtifactSchema = z.object({
  relativePath: z.string().min(1).max(2048).refine(path => !path.startsWith("/") && !path.includes("\\") && path.split("/").every(part =>
    part !== "" && part !== "." && part !== ".." && !/[<>:"|?*\x00-\x1f\x7f]/.test(part) && !/[. ]$/.test(part)
    && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)), "INVALID_RELATIVE_PATH"),
  sha256: digest,
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm"]),
  sizeBytes: z.number().int().min(1).max(104857600),
}).strict();
export type ComputeDeliveryArtifact = z.infer<typeof computeDeliveryArtifactSchema>;
const fields = { version: z.literal(1), userId, computeTaskId: identifier, deliveryId: digest, eventId: identifier,
  expectedDeliveryRevision: z.number().int().min(0).max(2147483645) };
// Single output only. URLs, absolute directories and browser-supplied authority
// are never part of this service-to-service receipt protocol.
export const computeDeliveryCommandSchema = z.discriminatedUnion("action", [
  z.object({ ...fields, action: z.literal("pending") }).strict(),
  z.object({ ...fields, action: z.literal("available"), artifact: computeDeliveryArtifactSchema }).strict(),
  z.object({ ...fields, action: z.literal("failed"), failureCode: computeDeliveryFailureSchema }).strict(),
  z.object({ ...fields, action: z.literal("unavailable"), failureCode: computeDeliveryFailureSchema }).strict(),
]);
export type ComputeDeliveryCommand = z.infer<typeof computeDeliveryCommandSchema>;
export const computeDeliveryViewSchema = z.object({
  version: z.literal(1), deliveryId: digest, computeTaskId: identifier,
  state: computeDeliveryStateSchema, revision, artifact: computeDeliveryArtifactSchema.nullable(),
  failureCode: computeDeliveryFailureSchema.nullable(),
  createdAt: z.string().datetime({ offset: true }), updatedAt: z.string().datetime({ offset: true }),
  availableAt: z.string().datetime({ offset: true }).nullable(),
}).strict().superRefine((receipt, ctx) => {
  const available = receipt.state === "AVAILABLE" || receipt.state === "UNAVAILABLE";
  const failure = receipt.state === "FAILED" || receipt.state === "UNAVAILABLE";
  if (available !== (receipt.artifact !== null && receipt.availableAt !== null)
    || (!available && (receipt.artifact !== null || receipt.availableAt !== null))
    || failure !== (receipt.failureCode !== null)) ctx.addIssue({ code: "custom", message: "INVALID_DELIVERY_STATE" });
});
export type ComputeDeliveryView = z.infer<typeof computeDeliveryViewSchema>;
export const computeDeliveryMutationSchema = z.object({
  delivery: computeDeliveryViewSchema, appliedRevision: revision, duplicate: z.boolean(),
}).strict().refine(result => result.appliedRevision <= result.delivery.revision, "INVALID_DELIVERY_REVISION");
export type ComputeDeliveryMutation = z.infer<typeof computeDeliveryMutationSchema>;
export const computeDeliveryReadSchema = z.object({ computeTaskId: identifier, delivery: computeDeliveryViewSchema.nullable() }).strict();
export type ComputeDeliveryRead = z.infer<typeof computeDeliveryReadSchema>;
export const computeDeliveryTaskIdSchema = identifier;
