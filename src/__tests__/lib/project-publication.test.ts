// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    user: { findUnique: vi.fn() },
    project: { findFirst: vi.fn() },
    artifact: { update: vi.fn() },
    artifactVersion: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { decideArtifactPublication, requestArtifactPublication } from "@/server/projects/publication";

const project = {
  id: "p1",
  ownerId: "u1",
  facts: [{ key: "problem", value: "校园教材流转慢", confirmation: "CONFIRMED", evidenceUrl: null }],
  artifacts: [{
    id: "art1",
    versions: [{ id: "v1", contentMarkdown: "# 项目说明\n结果：暂无" }],
  }],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.$transaction.mockImplementation(async (fn: (tx: typeof mocks.db) => unknown) => fn(mocks.db));
  mocks.db.auditLog.create.mockResolvedValue({ id: "audit1" });
  mocks.db.artifact.update.mockResolvedValue({ id: "art1" });
});

describe("成果公开审核", () => {
  it("敏感内容不能提交公开", async () => {
    mocks.db.project.findFirst.mockResolvedValue({
      ...project,
      artifacts: [{ ...project.artifacts[0], versions: [{ id: "v1", contentMarkdown: "电话 13800138000" }] }],
    });
    await expect(requestArtifactPublication("p1", "u1", { artifactVersionId: "v1", acknowledged: true }))
      .rejects.toMatchObject({ code: "PUBLICATION_BLOCKED", status: 409 });
  });

  it("通过检查后记录待审核申请", async () => {
    mocks.db.project.findFirst.mockResolvedValue(project);
    const result = await requestArtifactPublication("p1", "u1", { artifactVersionId: "v1", acknowledged: true });
    expect(result.status).toBe("pending");
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "PROJECT_PUBLICATION_REQUESTED" }),
    }));
  });

  it("非管理员不能审核", async () => {
    mocks.db.user.findUnique.mockResolvedValue({ role: "USER" });
    await expect(decideArtifactPublication("admin1", { artifactVersionId: "v1", decision: "approve", note: "可以公开" }))
      .rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("管理员不能审核自己的成果", async () => {
    mocks.db.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    mocks.db.artifactVersion.findUnique.mockResolvedValue({
      id: "v1", artifactId: "art1", artifact: { projectId: "p1", project: { ownerId: "admin1" } },
    });
    await expect(decideArtifactPublication("admin1", { artifactVersionId: "v1", decision: "approve", note: "自己的成果" }))
      .rejects.toMatchObject({ code: "SELF_REVIEW", status: 403 });
  });

  it("通过后公开成果，退回时保留私密", async () => {
    mocks.db.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    mocks.db.artifactVersion.findUnique.mockResolvedValue({
      id: "v1", artifactId: "art1", artifact: { projectId: "p1", project: { ownerId: "u1" } },
    });
    const approved = await decideArtifactPublication("admin1", { artifactVersionId: "v1", decision: "approve", note: "事实完整" });
    expect(approved.status).toBe("public");
    expect(mocks.db.artifact.update).toHaveBeenCalledWith({ where: { id: "art1" }, data: { visibility: "PUBLIC" } });

    const rejected = await decideArtifactPublication("admin1", { artifactVersionId: "v1", decision: "reject", note: "需要补充证据" });
    expect(rejected.status).toBe("rejected");
    expect(mocks.db.artifact.update).toHaveBeenCalledTimes(1);
  });
});
