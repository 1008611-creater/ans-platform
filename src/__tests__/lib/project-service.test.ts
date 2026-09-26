// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    project: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    projectFact: { upsert: vi.fn() },
    artifact: { upsert: vi.fn() },
    artifactVersion: { create: vi.fn(), findFirst: vi.fn() },
    workflowRun: { findFirst: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  workflowService: { createWorkflowRun: vi.fn(), ensureOfficialWorkflow: vi.fn() },
  workflowRunner: { executePersistedWorkflow: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/server/workflows/service", () => mocks.workflowService);
vi.mock("@/server/workflows/runner", () => mocks.workflowRunner);

import { ProjectServiceError, createProject, exportProject, getProject, runProjectWorkflow, updateProject } from "@/server/projects/service";

const project = {
  id: "p1", ownerId: "u1", title: "教材流转", goal: "CAREER", status: "ACTIVE", visibility: "PRIVATE", updatedAt: new Date("2026-09-25T00:00:00Z"),
  facts: [
    { key: "problem", value: "流转慢", confirmation: "CONFIRMED", evidenceUrl: null },
    { key: "contribution", value: "整理需求", confirmation: "CONFIRMED", evidenceUrl: null },
  ],
  artifacts: [],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.$transaction.mockImplementation(async (fn: (tx: typeof mocks.db) => unknown) => fn(mocks.db));
  mocks.db.auditLog.create.mockResolvedValue({ id: "a1" });
  mocks.db.project.findFirst.mockResolvedValue(project);
  mocks.workflowService.ensureOfficialWorkflow.mockResolvedValue({ id: "official1", slug: "ans-official-resume-bullets" });
  mocks.workflowService.createWorkflowRun.mockResolvedValue({ id: "run1", status: "QUEUED" });
  mocks.workflowRunner.executePersistedWorkflow.mockResolvedValue({
    status: "succeeded",
    output: "Generated draft",
    executions: [],
    elapsedMs: 5,
  });
  mocks.db.artifact.upsert.mockResolvedValue({ id: "artifact1", currentVersion: 1 });
  mocks.db.artifactVersion.create.mockResolvedValue({ id: "version1", version: 1 });
  mocks.db.artifactVersion.findFirst.mockResolvedValue({ id: "version1", version: 1, contentMarkdown: "# Generated draft" });
});

describe("项目服务", () => {
  it("只创建私密项目", async () => {
    mocks.db.project.create.mockResolvedValue({ ...project, facts: [], artifacts: [] });
    const created = await createProject("u1", { title: "教材流转", goal: "career" });
    expect(created.visibility).toBe("private");
    expect(mocks.db.project.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ visibility: "PRIVATE" }) }));
  });

  it("拒绝他人读取项目", async () => {
    mocks.db.project.findFirst.mockResolvedValue(null);
    await expect(getProject("p1", "u2")).rejects.toMatchObject({ status: 404 });
  });

  it("拒绝把成果改为公开", async () => {
    await expect(updateProject("p1", "u1", { visibility: "public" })).rejects.toBeInstanceOf(ProjectServiceError);
  });

  it("缺少必填事实时在注册或扣费前拒绝生成", async () => {
    await expect(runProjectWorkflow("p1", "u1", { workflowId: "readme-draft" })).rejects.toMatchObject({ code: "FACTS_INCOMPLETE" });
    expect(mocks.workflowService.ensureOfficialWorkflow).not.toHaveBeenCalled();
    expect(mocks.workflowService.createWorkflowRun).not.toHaveBeenCalled();
  });

  it("运行持久化官方 DAG 并保存可追溯的成果版本", async () => {
    const result = { status: "succeeded" as const, output: "Generated draft", executions: [], elapsedMs: 5 };
    mocks.workflowRunner.executePersistedWorkflow.mockImplementation(async (...args: unknown[]) => {
      const options = args[2] as { onSucceeded?: (tx: never, value: typeof result) => Promise<void> };
      await options.onSucceeded?.(mocks.db as never, result);
      return result;
    });

    const response = await runProjectWorkflow("p1", "u1", { workflowId: "resume-bullets", idempotencyKey: "resume-12345678" });

    expect(response.version).toBe(1);
    expect(mocks.workflowService.ensureOfficialWorkflow).toHaveBeenCalledWith(expect.objectContaining({
      officialId: "resume-bullets",
      slug: "ans-official-resume-bullets",
      actorId: "u1",
    }));
    expect(mocks.workflowService.createWorkflowRun).toHaveBeenCalledWith(
      "ans-official-resume-bullets",
      "u1",
      expect.objectContaining({ input: expect.objectContaining({ facts: expect.any(Array), prompt: expect.any(String) }) }),
      { projectId: "p1" },
    );
    expect(mocks.workflowRunner.executePersistedWorkflow).toHaveBeenCalledWith("run1", "u1", expect.objectContaining({ onSucceeded: expect.any(Function) }));
    expect(mocks.db.artifactVersion.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ workflowRunId: "run1", version: 1 }),
    }));
  });

  it("重复幂等运行直接复用已完成成果", async () => {
    mocks.workflowService.createWorkflowRun.mockResolvedValue({ id: "run-old", status: "SUCCEEDED" });
    mocks.db.artifactVersion.findFirst.mockResolvedValue({ id: "version-old", version: 3, contentMarkdown: "# Existing" });

    const response = await runProjectWorkflow("p1", "u1", { workflowId: "resume-bullets", idempotencyKey: "resume-12345678" });

    expect(response.version).toBe(3);
    expect(mocks.workflowRunner.executePersistedWorkflow).not.toHaveBeenCalled();
    expect(mocks.db.artifactVersion.create).not.toHaveBeenCalled();
  });

  it("没有成果时不能导出", async () => {
    await expect(exportProject("p1", "u1")).rejects.toMatchObject({ code: "NOTHING_TO_EXPORT" });
  });
  it("reports a concurrently cancelled run instead of waiting forever", async () => {
    mocks.workflowRunner.executePersistedWorkflow.mockResolvedValue(null);
    mocks.db.workflowRun.findFirst.mockResolvedValue({ status: "CANCELLED" });

    await expect(runProjectWorkflow("p1", "u1", { workflowId: "resume-bullets" })).rejects.toMatchObject({
      code: "RUN_CANCELLED",
      status: 409,
    });
  });

});
