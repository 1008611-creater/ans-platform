import { z } from "zod";
import { agriStageSchema, agriWorkspaceScopeSchema } from "./agrihackathon";
import { agriSubmissionRequirementsSchema } from "./agri-submissions";

const id = z.string().trim().min(1).max(80);
const revision = z.number().int().min(1).max(2147483646);
const instant = z.string().datetime({ offset: true });
const window = z.discriminatedUnion("state", [
  z.object({ stage: agriStageSchema, state: z.literal("PENDING"), opensAt: instant.nullable(), closesAt: instant.nullable() }).strict(),
  z.object({ stage: agriStageSchema, state: z.literal("READY"), opensAt: instant, closesAt: instant, includesDeadline: z.boolean() }).strict(),
]).superRefine((value, ctx) => {
  if (value.opensAt && value.closesAt && Date.parse(value.opensAt) > Date.parse(value.closesAt)) {
    ctx.addIssue({ code: "custom", path: ["closesAt"], message: "INVALID_WINDOW_ORDER" });
  }
});
export const agriRulesDraftSchema = z.object({
  schemaVersion: z.literal(1), guidanceMarkdown: z.string().trim().min(1).max(20000),
  requirements: agriSubmissionRequirementsSchema,
  windows: z.array(window).length(3),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.windows.map(item => item.stage)).size !== 3) {
    ctx.addIssue({ code: "custom", path: ["windows"], message: "EXACT_THREE_STAGES_REQUIRED" });
  }
});
export type AgriRulesDraft = z.infer<typeof agriRulesDraftSchema>;
const base = { idempotencyKey: z.string().uuid(), expectedRevision: revision };
export const agriWorkspaceCommandSchema = z.discriminatedUnion("action", [
  z.object({ ...base, action: z.literal("saveRulesDraft"), draft: agriRulesDraftSchema }).strict(),
  z.object({ ...base, action: z.literal("confirmRules") }).strict(),
  z.object({ ...base, action: z.literal("publishRules"), ruleVersionId: id }).strict(),
  z.object({ ...base, action: z.literal("setEnabled"), enabled: z.boolean() }).strict(),
]);
export const agriGrantCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("delegateScope"), idempotencyKey: z.string().uuid(), recipientId: id,
    scope: agriWorkspaceScopeSchema.exclude(["ACCESS_MANAGE"]), expectedRevision: z.number().int().min(0).max(2147483646),
    expiresAt: instant.nullable(), delegable: z.boolean() }).strict(),
  z.object({ action: z.literal("revokeScope"), idempotencyKey: z.string().uuid(), recipientId: id,
    scope: agriWorkspaceScopeSchema.exclude(["ACCESS_MANAGE"]), expectedRevision: revision }).strict(),
]);
export class AgriWorkspaceError extends Error {
  constructor(public readonly code: string, public readonly status = 409) { super(code); this.name = "AgriWorkspaceError"; }
}