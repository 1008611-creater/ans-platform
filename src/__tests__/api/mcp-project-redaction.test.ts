// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    project: { findFirst: vi.fn() },
    artifactVersion: { findFirst: vi.fn() },
  },
  workflows: { ensureOfficialWorkflow: vi.fn(), createWorkflowRun: vi.fn() },
  runner: { executePersistedWorkflow: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/server/workflows/service", () => mocks.workflows);
vi.mock("@/server/workflows/runner", () => mocks.runner);
vi.mock("@/lib/api-key", () => ({ isValidApiKeyFormat: () => true, hashApiKey: (value: string) => value }));
vi.mock("@/../prompts.config", () => ({ default: { features: { mcp: true } } }));
vi.mock("@/lib/rate-limit", () => ({
  mcpGeneralLimiter: { check: () => ({ allowed: true }) },
  mcpToolCallLimiter: { check: () => ({ allowed: true }) },
  mcpWriteToolLimiter: { check: () => ({ allowed: true }) },
  mcpAiToolLimiter: { check: () => ({ allowed: true }) },
}));

import { POST } from "@/app/api/mcp/route";

const marker = "MCP_PRIVATE_DIAGNOSTIC_MARKER";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.user.findUnique.mockResolvedValue({ id: "owner", username: "fixture", mcpPromptsPublicByDefault: false });
  mocks.db.project.findFirst.mockResolvedValue({
    id: "project", ownerId: "owner", title: "Fixture", goal: "CAREER", status: "ACTIVE", visibility: "PRIVATE", updatedAt: new Date(),
    facts: ["problem", "contribution", "method", "result", "evidence"].map(key => ({ key, value: "Verified fixture", confirmation: "CONFIRMED", evidenceUrl: null })),
    artifacts: [],
  });
  mocks.workflows.ensureOfficialWorkflow.mockImplementation(async ({ officialId }: { officialId: string }) => ({ id: officialId, slug: `ans-official-${officialId}` }));
  mocks.db.artifactVersion.findFirst.mockResolvedValue({ id: "version", version: 1, contentMarkdown: "# Completed fixture" });
});

async function call(tool: string, arguments_: Record<string, string>) {
  const response = await POST(new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", Authorization: `Bearer fixture-${tool}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: tool, arguments: arguments_ } }),
  }));
  expect(response.status).toBe(200);
  const text = await response.text();
  expect(text).not.toContain(marker);
  const rpc = JSON.parse(text);
  return { result: JSON.parse(rpc.result.content[0].text), isError: rpc.result.isError };
}

describe("MCP transport with the actual project service", () => {
  it("redacts partial pack failures on the wire and retains completed artifacts", async () => {
    mocks.workflows.createWorkflowRun.mockImplementation(async (slug: string) => {
      if (slug.endsWith("project-one-pager")) throw new Error(`Private database diagnostic ${marker}`);
      return { id: "completed-run", status: "SUCCEEDED" };
    });
    const { result, isError } = await call("run_project_pack", { projectId: "project", idempotencyKey: "pack-wire-12345" });
    expect(result.status).toBe("partial");
    expect(result.artifacts).toHaveLength(2);
    expect(isError).not.toBe(true);
    expect(result.failures).toEqual([{ workflowId: "project-one-pager", code: "WORKFLOW_FAILED", error: "成果生成失败，请稍后重试。" }]);
  });

  it.each(["persisted", "executor"])("redacts %s failed workflow errors on the wire", async source => {
    mocks.workflows.createWorkflowRun.mockResolvedValue({ id: "failed-run", status: source === "persisted" ? "FAILED" : "QUEUED", error: marker });
    mocks.runner.executePersistedWorkflow.mockResolvedValue({ status: "failed", error: marker, executions: [], elapsedMs: 1 });
    const { result, isError } = await call("run_project_workflow", { projectId: "project", workflowId: "resume-bullets", idempotencyKey: "run-wire-12345" });
    expect(isError).toBe(true);
    expect(result.error).toContain("工作流运行失败");
  });
});
