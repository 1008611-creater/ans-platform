import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { readPlatformRecipe } from "@/server/workflows/platform-recipes";
import type { DbTransaction } from "@/lib/db";
import type { MarketWorkflowBinding } from "@/contracts/market-workflow";
import { workflowDefinitionSchema } from "@/contracts/workflow";
import { assertSupportedRecipe, stableWorkflowInput } from "@/domain/workflows/recipes";
import { validateWorkflow } from "@/domain/workflows/graph";
import { MarketRuleError } from "@/domain/marketplace/order";
import { requireMarketActor } from "./shared";

/** Published alone is insufficient: author self-publication must not bypass manual review. */
export async function readReviewedWorkflow(tx: DbTransaction, workflowId: string, sellerId: string) {
  await requireMarketActor(tx, sellerId);
  const workflow = await tx.workflow.findFirst({ where: { id: workflowId, authorId: sellerId, status: "PUBLISHED", isOfficial: false, publishedVersion: { not: null } }, include: { versions: { orderBy: { version: "asc" } } } });
  const version = workflow?.versions.find(row => row.version === workflow.publishedVersion);
  if (!workflow || !version) {
    const platform = await readPlatformRecipe(tx, workflowId, sellerId);
    if (platform) return platform;
    throw new MarketRuleError("WORKFLOW_NOT_AVAILABLE", 409);
  }
  const approvals = await tx.auditLog.findMany({ where: { resourceType: "workflow", resourceId: workflow.id, action: "WORKFLOW_APPROVED", createdAt: { gte: version.createdAt } }, orderBy: { createdAt: "desc" }, take: 100, select: { createdAt: true, after: true } });
  const reviewed = approvals.some(approval => {
    const after = approval.after;
    if (!after || typeof after !== "object" || Array.isArray(after) || after.status !== "PUBLISHED") return false;
    // New evidence binds explicitly; historical reviewWorkflow audited its latest immutable version.
    if (typeof after.publishedVersion === "number") return after.publishedVersion === version.version;
    return workflow.versions.filter(row => row.createdAt <= approval.createdAt).at(-1)?.id === version.id;
  });
  if (!reviewed) throw new MarketRuleError("WORKFLOW_REVIEW_REQUIRED", 409);
  const definition = workflowDefinitionSchema.parse(version.definition);
  try { assertSupportedRecipe(definition); } catch { throw new MarketRuleError("INVALID_RECIPE_DEFINITION", 400); }
  if (!validateWorkflow(definition).ok) throw new MarketRuleError("INVALID_DEFINITION", 400);
  return { workflow, version, definition };
}
export async function assertMarketWorkflowBinding(tx: DbTransaction, sellerId: string, binding: MarketWorkflowBinding) {
  const result = await readReviewedWorkflow(tx, binding.workflowId, sellerId);
  if (result.version.id !== binding.versionId || result.version.version !== binding.version || workflowDefinitionHash(result.definition) !== binding.definitionHash) throw new MarketRuleError("VERSION_CONFLICT", 409);
  return result;
}

export function workflowDefinitionHash(definition: unknown) { return createHash("sha256").update(stableWorkflowInput(definition)).digest("hex"); }

export async function isWorkflowMarketAvailable(workflowId: string, actorId: string) {
  try { await readReviewedWorkflow(db, workflowId, actorId); return true; }
  catch (error) { if (error instanceof MarketRuleError) return false; throw error; }
}
