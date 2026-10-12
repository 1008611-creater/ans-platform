import { workflowDefinitionSchema, type WorkflowDefinition } from "@/contracts/workflow";
import { resumeWebsiteInputSchema } from "@/contracts/resume-website";
import { parseResumeWebsiteCopy, renderResumeWebsite } from "@/domain/projects/resume-website";

/** Platform code is fixed; only validated personal facts and model-written copy vary. */
export const RESUME_WORKFLOW_DEFINITION: WorkflowDefinition = workflowDefinitionSchema.parse({
  version: 1, recipe: "resume-website-v1", maxNodes: 2,
  nodes: [
    { id: "copy", type: "model", label: "Personal copy", config: {}, timeoutMs: 90000, maxRetries: 0 },
    { id: "artifact", type: "output", label: "HTML artifact", config: {}, timeoutMs: 5000, maxRetries: 0 },
  ], edges: [{ id: "copy-artifact", from: "copy", to: "artifact", mapping: {} }],
});
export function assertSupportedRecipe(definition: WorkflowDefinition) {
  if (!definition.recipe) return;
  if (stableWorkflowInput(definition) !== stableWorkflowInput(RESUME_WORKFLOW_DEFINITION)) throw new Error("INVALID_RECIPE_DEFINITION");
}
export function normalizeRecipeInput(definition: WorkflowDefinition, input: Record<string, unknown>): Record<string, unknown> {
  if (definition.recipe === "resume-website-v1") return { profile: resumeWebsiteInputSchema.parse(input.profile) };
  return input;
}
export type WorkflowHtmlArtifact = { kind: "resume-website"; recipeVersion: 1; mediaType: "text/html"; filename: string; content: string };
export function renderRecipeArtifact(profile: unknown, copy: unknown): WorkflowHtmlArtifact {
  const input = resumeWebsiteInputSchema.parse(profile);
  if (typeof copy !== "string") throw new Error("INVALID_MODEL_COPY");
  const parsed = parseResumeWebsiteCopy(copy, input);
  return { kind: "resume-website", recipeVersion: 1, mediaType: "text/html", filename: "my-portfolio.html", content: renderResumeWebsite(input, parsed) };
}

/** JSONB may reorder object keys; equality must preserve array order but ignore object key order. */
export function stableWorkflowInput(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stableWorkflowInput).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stableWorkflowInput((value as Record<string, unknown>)[key])).join(",") + "}";
  return JSON.stringify(value) ?? "null";
}
