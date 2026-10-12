// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ runs: vi.fn(), auditMany: vi.fn(), auditFirst: vi.fn(), generic: vi.fn(), recover: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { workflowRun: { findMany: mocks.runs }, auditLog: { findMany: mocks.auditMany, findFirst: mocks.auditFirst } } }));
vi.mock("@/server/workflows/runner", () => ({ executePersistedWorkflow: mocks.generic, recoverInterruptedWorkflowRun: mocks.recover, MAX_WORKFLOW_EXECUTION_MS: 120000 }));
vi.mock("@/server/projects/resume-website", () => ({ executeResumeWebsiteRun: vi.fn() }));
vi.mock("@/server/projects/service", () => ({ executeProjectDocumentRun: vi.fn() }));
import { processProjectQueue } from "@/server/projects/worker";
const queued = { id: "market-run", userId: "buyer", projectId: null, workflow: { officialId: null } };
beforeEach(() => { vi.resetAllMocks(); mocks.runs.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([queued]); mocks.auditMany.mockResolvedValue([]); mocks.auditFirst.mockResolvedValue(null); });
afterEach(() => vi.restoreAllMocks());
describe("durable explicit market execution", () => {
  it.each(["market", "reviewed_workflow"])("executes durable %s confirmation without needing a browser execute request", async source => {
    mocks.auditMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ resourceId: queued.id }]);
    mocks.auditFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "confirmation", metadata: { source } });
    await processProjectQueue();
    expect(mocks.generic).toHaveBeenCalledWith(queued.id, "buyer", {});
    expect(mocks.auditFirst).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ actorId: "buyer", resourceId: queued.id, action: "WORKFLOW_RUN_QUEUED", OR: [{ metadata: { path: ["source"], equals: "market" } }, { metadata: { path: ["source"], equals: "reviewed_workflow" } }] }) }));
  });
  it("does not execute a generic queued row with no durable explicit confirmation", async () => {
    await processProjectQueue(); expect(mocks.generic).not.toHaveBeenCalled();
  });
  it("rechecks the persisted market confirmation before execution if the discovery read becomes stale", async () => {
    mocks.auditMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ resourceId: queued.id }]);
    await processProjectQueue(); expect(mocks.generic).not.toHaveBeenCalled();
  });
});
