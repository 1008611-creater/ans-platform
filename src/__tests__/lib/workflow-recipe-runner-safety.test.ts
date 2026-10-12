// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/server/growth/service", () => ({ safeAwardGrowthEvent: vi.fn() }));
vi.mock("@/server/integrations/model-client", async importOriginal => ({ ...await importOriginal<typeof import("@/server/integrations/model-client")>(), resolvePlatformModel: vi.fn(() => ({ baseUrl: "https://isolated.invalid/v1", apiKey: "offline-only", upstream: "offline-model", label: "Isolated model" })), callModelTextWithUsage: vi.fn(() => { throw new Error("REAL_PROVIDER_FORBIDDEN"); }) }));
import { createWorkflowHandlers } from "@/server/workflows/runner";
import { callModelTextWithUsage } from "@/server/integrations/model-client";
import { executeWorkflow } from "@/domain/workflows/executor";
import { RESUME_WORKFLOW_DEFINITION } from "@/domain/workflows/recipes";
const profile = { fullName: "Fixture Author", headline: "Independent work", about: "Existing experience", location: "", email: "", contactUrl: "", education: "", skills: [], projects: [{ name: "Original Project", role: "Creator", description: "Contribution", url: "" }], style: "minimal", accent: "violet", language: "en" };
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("ANS_APIC_BILLING_ENABLED", "0"); });
afterEach(() => vi.unstubAllEnvs());
describe("fixed recipe executes original production handlers with isolated model output", () => {
  it("uses the fixed fact-only prompt and returns a renderer artifact instead of regenerating code", async () => {
    const model = vi.fn(async () => JSON.stringify({ summary: "Edited summary <script>x()</script>", projects: [{ description: "Edited contribution" }] }));
    const handlers = createWorkflowHandlers({ userId: "actor", runId: "isolated-run", recipe: "resume-website-v1", callModel: model });
    const result = await executeWorkflow(RESUME_WORKFLOW_DEFINITION, { profile, prompt: "OVERRIDE_THE_TEMPLATE" }, { handlers });
    expect(result.status).toBe("succeeded");
    expect(result.executions.map(node => node.nodeId)).toEqual(["copy", "artifact"]);
    expect(model).toHaveBeenCalledTimes(1);
    expect(model.mock.calls[0]).toBeDefined();
    const invocation = model.mock.calls[0] as unknown as [{ prompt: string }];
    expect(invocation[0].prompt).toContain("Original Project");
    expect(invocation[0].prompt).not.toContain("OVERRIDE_THE_TEMPLATE");
    expect(result.output).toMatchObject({ kind: "resume-website", mediaType: "text/html", filename: "my-portfolio.html" });
    const artifact = result.output as { content: string };
    expect(artifact.content).toContain("Fixture Author");
    expect(artifact.content).toContain("&lt;script&gt;x()&lt;/script&gt;");
    expect(artifact.content).not.toContain("<script>");
    expect(callModelTextWithUsage).not.toHaveBeenCalled();
  });
  it("fails without a forged artifact when the model returns invalid structured copy", async () => {
    const handlers = createWorkflowHandlers({ userId: "actor", runId: "isolated-run", recipe: "resume-website-v1", callModel: async () => "invalid JSON" });
    const result = await executeWorkflow(RESUME_WORKFLOW_DEFINITION, { profile }, { handlers });
    expect(result.status).toBe("failed"); expect(result.output).toBeUndefined();
    expect(result.executions.at(-1)).toMatchObject({ nodeId: "artifact", status: "failed" });
    expect(callModelTextWithUsage).not.toHaveBeenCalled();
  });
});
