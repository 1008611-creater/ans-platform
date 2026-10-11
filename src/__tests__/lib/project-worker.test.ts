// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RESUME_WEBSITE_WORKFLOW_ID } from "@/contracts/resume-website";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), execute: vi.fn(), expire: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { workflowRun: { findMany: mocks.findMany } } }));
vi.mock("@/server/projects/resume-website", () => ({ executeResumeWebsiteRun: mocks.execute, expireResumeWebsiteRun: mocks.expire }));
import { processProjectQueue } from "@/server/projects/worker";

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-09T03:00:00Z"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.execute.mockResolvedValue(null);
  mocks.expire.mockResolvedValue(null);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("project queue failure isolation", () => {
  it("a failed stale-task recovery cannot prevent other recoveries or queued work", async () => {
    mocks.findMany.mockResolvedValueOnce([{ id: "stale-unavailable" }, { id: "stale-recoverable" }])
      .mockResolvedValueOnce([{ id: "queued-valid", userId: "member-one" }]);
    mocks.expire.mockRejectedValueOnce(new Error("PRIVATE_TASK_FAILURE_DETAIL"));
    await expect(processProjectQueue()).resolves.toBeUndefined();
    expect(mocks.expire).toHaveBeenCalledTimes(2);
    expect(mocks.expire).toHaveBeenNthCalledWith(2, "stale-recoverable", new Date("2026-10-09T02:57:00Z"));
    expect(mocks.execute).toHaveBeenCalledWith("queued-valid", "member-one");
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("PRIVATE_TASK_FAILURE_DETAIL");
  });
  it("waits for all claimed work even if one execution rejects", async () => {
    mocks.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { id: "queued-failed", userId: "member-one" }, { id: "queued-valid", userId: "member-two" },
    ]);
    let finishValid!: () => void;
    const valid = new Promise<void>(resolve => { finishValid = resolve; });
    mocks.execute.mockRejectedValueOnce(new Error("PRIVATE_EXECUTION_FAILURE_DETAIL")).mockReturnValueOnce(valid);
    let tickFinished = false;
    const tick = processProjectQueue().then(() => { tickFinished = true; }, () => { tickFinished = true; });
    await vi.waitFor(() => expect(mocks.execute).toHaveBeenCalledTimes(2));
    expect(tickFinished).toBe(false);
    finishValid();
    await tick;
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("PRIVATE_EXECUTION_FAILURE_DETAIL");
  });
  it("keeps recovery and queue scope, age limit, ordering and concurrency unchanged", async () => {
    mocks.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await processProjectQueue();
    expect(mocks.findMany).toHaveBeenNthCalledWith(1, {
      where: { status: "RUNNING", startedAt: { lt: new Date("2026-10-09T02:57:00Z") }, workflow: { officialId: RESUME_WEBSITE_WORKFLOW_ID } },
      select: { id: true }, take: 20,
    });
    expect(mocks.findMany).toHaveBeenNthCalledWith(2, {
      where: { status: "QUEUED", projectId: { not: null }, workflow: { officialId: RESUME_WEBSITE_WORKFLOW_ID } },
      orderBy: { createdAt: "asc" }, take: 2, select: { id: true, userId: true },
    });
    expect(console.error).not.toHaveBeenCalled();
  });
  it("does not swallow a queue database read failure", async () => {
    mocks.findMany.mockRejectedValueOnce(new Error("database-unavailable"));
    await expect(processProjectQueue()).rejects.toThrow("database-unavailable");
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(mocks.expire).not.toHaveBeenCalled();
  });
});