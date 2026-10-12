// @vitest-environment node
import { describe, expect, it } from "vitest";
import { workflowDefinitionSchema } from "@/contracts/workflow";
import { RESUME_WORKFLOW_DEFINITION, assertSupportedRecipe, normalizeRecipeInput, renderRecipeArtifact, stableWorkflowInput } from "@/domain/workflows/recipes";

const profile = {
  fullName: "Fixture Author <script>alert(1)</script>", headline: "My own work", about: "Recorded facts only",
  location: "", email: "", contactUrl: "", education: "", skills: ["HTML"],
  projects: [{ name: "Personal project", role: "Author", description: "My actual contribution", url: "https://example.test/work?a=1&b=2" }],
  style: "minimal", accent: "emerald", language: "en",
};
function reordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reordered);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reordered(item)]));
  return value;
}
describe("fixed recipe safety", () => {
  it("accepts a legitimate JSONB key reordering while preserving the immutable recipe", () => {
    const persisted = workflowDefinitionSchema.parse(reordered(RESUME_WORKFLOW_DEFINITION));
    expect(() => assertSupportedRecipe(persisted)).not.toThrow();
    expect(stableWorkflowInput(persisted)).toBe(stableWorkflowInput(RESUME_WORKFLOW_DEFINITION));
  });
  it.each(["prompt", "edges", "retries", "order"])("rejects a modified fixed recipe: %s", change => {
    const changed = structuredClone(RESUME_WORKFLOW_DEFINITION);
    if (change === "prompt") changed.nodes[0].config.prompt = "Unreviewed command";
    if (change === "edges") changed.edges = [];
    if (change === "retries") changed.nodes[0].maxRetries = 1;
    if (change === "order") changed.nodes.reverse();
    expect(() => assertSupportedRecipe(changed)).toThrow("INVALID_RECIPE_DEFINITION");
  });
  it("normalizes only validated profile facts and discards client prompt/cost overrides", () => {
    const normalized = normalizeRecipeInput(RESUME_WORKFLOW_DEFINITION, { profile, prompt: "arbitrary code", price: 0 });
    expect(normalized).toEqual({ profile });
    expect(normalized).not.toHaveProperty("prompt");
    expect(normalized).not.toHaveProperty("price");
  });
  it.each([undefined, { ...profile, contactUrl: "javascript:alert(1)" }, { ...profile, extra: "not accepted" }])("rejects an invalid personal input before execution", input => {
    expect(() => normalizeRecipeInput(RESUME_WORKFLOW_DEFINITION, { profile: input })).toThrow();
  });
  it("renders a real downloadable HTML artifact with escaped model and user text", () => {
    const artifact = renderRecipeArtifact(profile, JSON.stringify({ summary: "<img src=x onerror=alert(1)>", projects: [{ description: "<script>private()</script>" }] }));
    expect(artifact).toMatchObject({ kind: "resume-website", recipeVersion: 1, mediaType: "text/html", filename: "my-portfolio.html" });
    expect(artifact.content).toContain("<!doctype html>");
    expect(artifact.content).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(artifact.content).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(artifact.content).toContain("a=1&amp;b=2");
    expect(artifact.content).toContain("default-src 'none'");
    expect(artifact.content).not.toContain("<script>");
    expect(artifact.content).not.toContain("<img src=x");
  });
  it.each(["not JSON", JSON.stringify({ summary: "text", projects: [] }), { summary: "text" }])("rejects incomplete/nontext model output", copy => {
    expect(() => renderRecipeArtifact(profile, copy)).toThrow("INVALID_MODEL_COPY");
  });
  it("canonicalizes keys but keeps user arrays and distinct values significant", () => {
    expect(stableWorkflowInput({ b: 2, a: { d: 4, c: 3 } })).toBe(stableWorkflowInput({ a: { c: 3, d: 4 }, b: 2 }));
    expect(stableWorkflowInput([1, 2])).not.toBe(stableWorkflowInput([2, 1]));
    expect(stableWorkflowInput({ a: 1 })).not.toBe(stableWorkflowInput({ a: "1" }));
  });
});
