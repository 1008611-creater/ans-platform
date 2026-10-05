// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    project: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    projectFact: { upsert: vi.fn() },
    artifact: { upsert: vi.fn(), updateMany: vi.fn() },
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

import { ProjectServiceError, createProject, exportProject, getProject, listProjects, saveProjectFacts, saveProjectArtifact, runProjectPack, runProjectWorkflow, updateProject } from "@/server/projects/service";

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
  it("lists owner-only projects even when users share a team", async () => {
    mocks.db.project.findMany.mockResolvedValue([]);
    await listProjects("u2");
    expect(mocks.db.project.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: "u2", status: { not: "ARCHIVED" } } }));
  });

  it("does not erase evidence URLs when an older client omits them", async () => {
    await saveProjectFacts("p1", "u1", { facts: [{ key: "problem", value: "A problem", confirmation: "confirmed" }] });
    const update = mocks.db.projectFact.upsert.mock.calls[0][0].update;
    expect(update).not.toHaveProperty("evidenceUrl");
  });

  it("supports explicitly clearing an evidence URL", async () => {
    await saveProjectFacts("p1", "u1", { facts: [{ key: "problem", value: "A problem", confirmation: "confirmed", evidenceUrl: "" }] });
    expect(mocks.db.projectFact.upsert.mock.calls[0][0].update.evidenceUrl).toBeNull();
  });

  it("appends manual edits with original provenance and no model charge", async () => {
    mocks.db.artifactVersion.findFirst.mockResolvedValue({ id: "v1", artifactId: "a1", contentJson: { facts: ["original facts"] }, factSnapshotHash: "hash1", workflowRunId: "run1" });
    mocks.db.artifact.updateMany.mockResolvedValue({ count: 1 });
    await saveProjectArtifact("p1", "u1", { baseVersionId: "v1", expectedVersion: 2, markdown: "# My edit" });
    expect(mocks.db.artifactVersion.findFirst).toHaveBeenCalledWith({ where: { id: "v1", artifact: { projectId: "p1", project: { ownerId: "u1" } } } });
    expect(mocks.db.artifact.updateMany).toHaveBeenCalledWith({ where: { id: "a1", currentVersion: 2, project: { ownerId: "u1", status: "ACTIVE" } }, data: { currentVersion: { increment: 1 } } });
    expect(mocks.db.artifactVersion.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ version: 3, contentMarkdown: "# My edit", workflowRunId: null, factSnapshotHash: "hash1", contentJson: expect.objectContaining({ facts: ["original facts"], sourceWorkflowRunId: "run1", editKind: "manual", baseVersionId: "v1" }) }) }));
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "PROJECT_ARTIFACT_EDITED" }) }));
    expect(mocks.workflowService.createWorkflowRun).not.toHaveBeenCalled();
  });

  it("rejects concurrent edits without creating another version", async () => {
    mocks.db.artifactVersion.findFirst.mockResolvedValue({ id: "v1", artifactId: "a1" });
    mocks.db.artifact.updateMany.mockResolvedValue({ count: 0 });
    await expect(saveProjectArtifact("p1", "u1", { baseVersionId: "v1", expectedVersion: 1, markdown: "My edit" })).rejects.toMatchObject({ code: "VERSION_CONFLICT", status: 409 });
    expect(mocks.db.artifactVersion.create).not.toHaveBeenCalled();
  });

  it("rejects a version from another project", async () => {
    mocks.db.artifactVersion.findFirst.mockResolvedValue(null);
    await expect(saveProjectArtifact("p1", "u1", { baseVersionId: "foreign", expectedVersion: 1, markdown: "My edit" })).rejects.toMatchObject({ status: 404 });
    expect(mocks.db.artifact.updateMany).not.toHaveBeenCalled();
  });

  it("rejects edits by a non-owner", async () => {
    mocks.db.project.findFirst.mockResolvedValue(null);
    await expect(saveProjectArtifact("p1", "u2", { baseVersionId: "v1", expectedVersion: 1, markdown: "My edit" })).rejects.toMatchObject({ status: 404 });
    expect(mocks.db.artifactVersion.create).not.toHaveBeenCalled();
  });

  it.each(["", " ", "x".repeat(100_001)])("rejects empty or oversized edits", async (markdown) => {
    await expect(saveProjectArtifact("p1", "u1", { baseVersionId: "v1", expectedVersion: 1, markdown })).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(mocks.db.artifactVersion.create).not.toHaveBeenCalled();
  });

  it("rejects edits to archived projects", async () => {
    mocks.db.project.findFirst.mockResolvedValue({ ...project, status: "ARCHIVED" });
    await expect(saveProjectArtifact("p1", "u1", { baseVersionId: "v1", expectedVersion: 1, markdown: "My edit" })).rejects.toMatchObject({ code: "ARCHIVED" });
  });

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

  it("reports a concurrently cancelled run instead of waiting forever", async () => {
    mocks.workflowRunner.executePersistedWorkflow.mockResolvedValue(null);
    mocks.db.workflowRun.findFirst.mockResolvedValue({ status: "CANCELLED" });

    await expect(runProjectWorkflow("p1", "u1", { workflowId: "resume-bullets" })).rejects.toMatchObject({
      code: "RUN_CANCELLED",
      status: 409,
    });
  });

  it("runs the three core artifacts from one project snapshot", async () => {
    mocks.db.project.findFirst.mockResolvedValue({
      ...project,
      facts: [...project.facts, { key: "method", value: "form intake", confirmation: "CONFIRMED", evidenceUrl: null }],
    });

    const response = await runProjectPack("p1", "u1", { idempotencyKey: "pack-12345678" });

    expect(response.status).toBe("succeeded");
    expect(response.estimatedCostPoints).toBe(6);
    expect(response.artifacts.map((artifact) => artifact.workflowId)).toEqual([
      "resume-bullets",
      "readme-draft",
      "project-one-pager",
    ]);
    expect(mocks.workflowService.createWorkflowRun).toHaveBeenCalledTimes(3);
    expect(mocks.workflowService.createWorkflowRun).toHaveBeenCalledWith(
      expect.any(String),
      "u1",
      expect.objectContaining({ idempotencyKey: "pack-12345678" }),
      { projectId: "p1" },
    );
    expect(mocks.workflowRunner.executePersistedWorkflow).toHaveBeenCalledTimes(3);
    expect(response.artifacts.every((artifact) => artifact.workflowRunId === "run1")).toBe(true);
  });

  it("validates every core artifact before creating a paid run", async () => {
    await expect(runProjectPack("p1", "u1", {})).rejects.toMatchObject({ code: "FACTS_INCOMPLETE" });
    expect(mocks.workflowService.ensureOfficialWorkflow).not.toHaveBeenCalled();
    expect(mocks.workflowService.createWorkflowRun).not.toHaveBeenCalled();
  });

  it("returns successful artifacts when one pack workflow fails", async () => {
    mocks.db.project.findFirst.mockResolvedValue({
      ...project,
      facts: [...project.facts, { key: "method", value: "form intake", confirmation: "CONFIRMED", evidenceUrl: null }],
    });
    mocks.workflowService.ensureOfficialWorkflow.mockImplementation(async ({ officialId }: { officialId: string }) => ({
      id: officialId,
      slug: `ans-official-${officialId}`,
    }));
    mocks.workflowService.createWorkflowRun.mockImplementation(async (slug: string) => {
      if (slug.endsWith("project-one-pager")) {
        throw new ProjectServiceError("quota unavailable", "INSUFFICIENT_QUOTA", 402);
      }
      return { id: slug, status: "QUEUED" };
    });

    const response = await runProjectPack("p1", "u1", {});

    expect(response.status).toBe("partial");
    expect(response.artifacts).toHaveLength(2);
    expect(response.failures).toEqual([
      { workflowId: "project-one-pager", code: "INSUFFICIENT_QUOTA", error: "quota unavailable" },
    ]);
  });

  it("exports the latest version and exposes files for zip packaging", async () => {
    mocks.db.project.findFirst.mockResolvedValue({
      ...project,
      artifacts: [{
        workflowId: "readme-draft",
        title: "README draft",
        versions: [
          { version: 1, contentMarkdown: "# Old" },
          { version: 2, contentMarkdown: "# Current" },
        ],
      }],
    });

    const result = await exportProject("p1", "u1");

    expect(result.markdown).toContain("# Current");
    expect(result.markdown).not.toContain("# Old");
    expect(result.artifacts).toEqual([{ workflowId: "readme-draft", title: "README draft", markdown: "# Current", version: 2 }]);
  });

});
