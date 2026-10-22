// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const runProjectPack = vi.fn();
class ProjectServiceError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 400) { super(message); }
}
vi.mock("@/server/projects/service", () => ({ runProjectPack, ProjectServiceError }));

import { runProjectPackViaPi } from "@/server/companion/project-pack";

const okPack = { projectId: "p1", status: "succeeded" as const, estimatedCostPoints: 3, artifacts: [{}, {}, {}], failures: [] };

describe("run_project_pack guards", () => {
  beforeEach(() => { runProjectPack.mockReset(); });

  it("refuses when the page is not a project and never touches the runner", async () => {
    const res = await runProjectPackViaPi("alice", null, true);
    expect(res.ok).toBe(false);
    expect(res.error).toBe("NOT_ON_PROJECT");
    expect(runProjectPack).not.toHaveBeenCalled();
  });

  it("charges nothing without an explicit confirmation", async () => {
    const res = await runProjectPackViaPi("alice", "p1", false);
    expect(res.ok).toBe(false);
    expect(res.error).toBe("CONFIRM_REQUIRED");
    expect(res.replyZh).toContain("真实生成 3 份产物");
    expect(runProjectPack).not.toHaveBeenCalled();
  });

  it("runs only after confirmation and returns the artifact link", async () => {
    runProjectPack.mockResolvedValue(okPack);
    const res = await runProjectPackViaPi("alice", "p1", true);
    expect(runProjectPack).toHaveBeenCalledWith("p1", "alice", {});
    expect(res.ok).toBe(true);
    expect(res.replyZh).toContain("3 份产物");
    expect(res.links[0]?.href).toBe("/projects/p1");
  });

  it("reports a partial run honestly instead of claiming full success", async () => {
    runProjectPack.mockResolvedValue({ ...okPack, status: "partial", artifacts: [{}], failures: [{ workflowId: "resume-entry", code: "WORKFLOW_FAILED", error: "x" }] });
    const res = await runProjectPackViaPi("alice", "p1", true);
    expect(res.replyZh).toContain("1 份");
    expect(res.replyZh).toContain("WORKFLOW_FAILED");
  });

  it("marks a total failure as not-ok and says nothing was charged for output", async () => {
    runProjectPack.mockResolvedValue({ ...okPack, status: "failed", artifacts: [], failures: [{ workflowId: "resume-entry", code: "WORKFLOW_FAILED", error: "x" }] });
    const res = await runProjectPackViaPi("alice", "p1", true);
    expect(res.ok).toBe(false);
    expect(res.replyZh).toContain("没有产出就不会按产出扣费");
  });

  it("surfaces the server machine code when facts are incomplete", async () => {
    runProjectPack.mockRejectedValue(new ProjectServiceError("missing facts", "FACTS_INCOMPLETE", 409));
    const res = await runProjectPackViaPi("alice", "p1", true);
    expect(res.ok).toBe(false);
    expect(res.error).toBe("FACTS_INCOMPLETE");
  });
});
