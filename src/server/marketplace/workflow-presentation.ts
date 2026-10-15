import type { WorkflowDefinition } from "@/contracts/workflow";
import { extractInputVariables } from "@/domain/workflows/variables";
import { unifiedModelBilling } from "@/server/integrations/metered-cost";

/** Presentation only. The caller must have resolved and verified the published workflow. */
export function presentMarketWorkflow(definition: WorkflowDefinition, estimatedCost: number | null, version: number) {
  const estimate = unifiedModelBilling() ? null : process.env.ANS_APIC_BILLING_ENABLED === "1" ? Math.max(.25, definition.nodes.filter(n => n.type === "model").length * .25) : Math.max(1, estimatedCost || 1);
  return { available: true as const, recipe: definition.recipe ?? null, variables: extractInputVariables(definition), estimatedCost: estimate, version };
}
