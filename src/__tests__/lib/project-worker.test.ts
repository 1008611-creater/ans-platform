// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RESUME_WEBSITE_WORKFLOW_ID } from "@/contracts/resume-website";
import { officialWorkflowIds } from "@/contracts/projects";
const mocks = vi.hoisted(() => ({ findMany: vi.fn(), execute: vi.fn(), document: vi.fn(), recover: vi.fn(), generic: vi.fn(), auditMany: vi.fn(), auditFirst: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { workflowRun: { findMany: mocks.findMany }, auditLog: { findMany: mocks.auditMany, findFirst: mocks.auditFirst } } }));
vi.mock("@/server/projects/resume-website", () => ({ executeResumeWebsiteRun: mocks.execute }));
vi.mock("@/server/projects/service", () => ({ executeProjectDocumentRun: mocks.document }));
vi.mock("@/server/workflows/runner", () => ({ executePersistedWorkflow: mocks.generic, recoverInterruptedWorkflowRun: mocks.recover, MAX_WORKFLOW_EXECUTION_MS: 120_000 }));
import { processProjectQueue } from "@/server/projects/worker";
const queued = (id: string, officialId: string = RESUME_WEBSITE_WORKFLOW_ID) => ({ id, userId: "member-one", projectId: "project-one", workflow: { officialId } });
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-09T03:00:00Z")); vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.findMany.mockResolvedValue([]); mocks.auditMany.mockResolvedValue([]);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe("durable project queue", () => {
  it("one stale recovery failure does not block other recoveries or accepted work", async () => {
    mocks.findMany.mockResolvedValueOnce([{ id: "bad-stale" }, { id: "good-stale" }]).mockResolvedValueOnce([queued("valid")]);
    mocks.recover.mockRejectedValueOnce(new Error("PRIVATE_TASK_FAILURE_DETAIL"));
    await processProjectQueue();
    expect(mocks.recover).toHaveBeenNthCalledWith(2, "good-stale", new Date("2026-10-09T02:57:00Z"));
    expect(mocks.execute).toHaveBeenCalledWith("valid", "member-one");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("PRIVATE_TASK_FAILURE_DETAIL");
  });
  it("waits for all claimed work even if one execution rejects", async () => {
    mocks.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([queued("bad"), queued("good")]);
    let finish!: () => void;
    mocks.execute.mockRejectedValueOnce(new Error("PRIVATE_EXECUTION_FAILURE_DETAIL")).mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));
    let done = false; const tick = processProjectQueue().then(() => { done = true; });
    await vi.waitFor(() => expect(mocks.execute).toHaveBeenCalledTimes(2));
    expect(done).toBe(false); finish(); await tick;
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("PRIVATE_EXECUTION_FAILURE_DETAIL");
  });
  it("queues every document recipe and keeps two concurrent tasks", async () => {
    mocks.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([queued("doc", "readme-draft"), queued("website")]);
    await processProjectQueue();
    expect(mocks.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: { status: "QUEUED", projectId: { not: null }, workflow: { officialId: { in: [RESUME_WEBSITE_WORKFLOW_ID, ...officialWorkflowIds] } } }, take: 2 }));
    expect(mocks.document).toHaveBeenCalledWith("doc", "member-one");
    expect(mocks.execute).toHaveBeenCalledWith("website", "member-one");
  });
  it("recovers general workflows only after an explicit execution with durable options", async () => {
    mocks.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "generic", userId: "member-one", projectId: null, workflow: { officialId: null } }]);
    mocks.auditMany.mockResolvedValue([{ resourceId: "generic" }]);
    mocks.auditFirst.mockResolvedValue({ metadata: { modelKey: "gpt-6.1-sol", credentialId: "owned-credential", reasoningEffort: "high" } });
    await processProjectQueue();
    expect(mocks.generic).toHaveBeenCalledWith("generic", "member-one", { modelKey: "gpt-6.1-sol", credentialId: "owned-credential", reasoningEffort: "high" });
  });
  it("does not execute general runs which the user has not started", async () => {
    mocks.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "not-started", userId: "member-one", projectId: null, workflow: { officialId: null } }]);
    await processProjectQueue(); expect(mocks.generic).not.toHaveBeenCalled();
  });
});
