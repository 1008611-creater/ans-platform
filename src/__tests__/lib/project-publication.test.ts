// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  db: {
    user: { findUnique: vi.fn() },
    project: { findFirst: vi.fn() },
    artifactVersion: { findUnique: vi.fn(), findFirst: vi.fn() },
    artifactPublication: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
    artifactReaction: { findUnique: vi.fn(), delete: vi.fn(), create: vi.fn() },
    artifactComment: { create: vi.fn() },
    artifactReport: { findFirst: vi.fn(), create: vi.fn() },
    contentFavorite: { count: vi.fn(), findFirst: vi.fn(), delete: vi.fn(), create: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

import {
  addArtifactComment,
  decideArtifactPublication,
  getPublishedArtifact,
  listPublishedArtifacts,
  reportArtifact,
  requestArtifactPublication,
  toggleArtifactReaction,
  withdrawArtifactPublication,
} from "@/server/projects/publication";

const project = {
  id: "p1",
  ownerId: "u1",
  facts: [{ key: "problem", value: "校园教材流转慢", confirmation: "CONFIRMED", evidenceUrl: null }],
  artifacts: [{ id: "art1", versions: [{ id: "v1", contentMarkdown: "# 项目说明\n结果：暂无" }] }],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.$transaction.mockImplementation(async (fn: (tx: typeof mocks.db) => unknown) => fn(mocks.db));
  mocks.db.auditLog.create.mockResolvedValue({ id: "audit1" });
  mocks.db.project.findFirst.mockResolvedValue(project);
});

describe("成果版本公开与社区互动", () => {
  it("敏感内容不能申请公开", async () => {
    mocks.db.project.findFirst.mockResolvedValue({
      ...project,
      artifacts: [{ ...project.artifacts[0], versions: [{ id: "v1", contentMarkdown: "电话 13800138000" }] }],
    });
    await expect(requestArtifactPublication("p1", "u1", { artifactVersionId: "v1", acknowledged: true }))
      .rejects.toMatchObject({ code: "PUBLICATION_BLOCKED", status: 409 });
  });

  it("创作者主页按具体版本作者筛选，并显示版本作者", async () => {
    const artifactCreator = { id: "team-owner", username: "owner", nickname: null, avatar: null };
    const versionCreator = { id: "member", username: "member", nickname: "成员", avatar: null };
    mocks.db.artifactPublication.findMany.mockResolvedValue([{
      reviewedAt: new Date(),
      artifactVersion: {
        id: "v1", version: 2, contentMarkdown: "作品", createdAt: new Date(),
        createdBy: versionCreator,
        artifact: { title: "团队作品", kind: "CONTEST_MVP", project: { id: "p1", title: "比赛项目", goal: "CONTEST", team: null }, createdBy: artifactCreator },
        _count: { reactions: 1, comments: 0 },
      },
    }]);
    const result = await listPublishedArtifacts(24, "member");
    expect(mocks.db.artifactPublication.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: "APPROVED", artifactVersion: { createdById: "member" } },
    }));
    expect(result[0].author).toEqual(versionCreator);
  });
  it("新公开申请写入状态和审计", async () => {
    mocks.db.artifactPublication.findUnique.mockResolvedValue(null);
    mocks.db.artifactPublication.upsert.mockResolvedValue({ status: "PENDING" });
    const result = await requestArtifactPublication("p1", "u1", { artifactVersionId: "v1", acknowledged: true });
    expect(result).toEqual({ artifactVersionId: "v1", status: "pending" });
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "PROJECT_PUBLICATION_REQUESTED", resourceId: "v1" }),
    }));
  });

  it("重复申请不会重复写审计", async () => {
    mocks.db.artifactPublication.findUnique.mockResolvedValue({ status: "PENDING" });
    await expect(requestArtifactPublication("p1", "u1", { artifactVersionId: "v1", acknowledged: true }))
      .resolves.toEqual({ artifactVersionId: "v1", status: "pending" });
    expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
    expect(mocks.db.artifactPublication.upsert).not.toHaveBeenCalled();
  });

  it("两位管理员竞争时只允许一个完成审核", async () => {
    mocks.db.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    mocks.db.artifactVersion.findUnique.mockResolvedValue({
      id: "v1", artifact: { projectId: "p1", project: { ownerId: "u1" } },
    });
    mocks.db.artifactPublication.updateMany.mockResolvedValue({ count: 0 });
    await expect(decideArtifactPublication("admin1", { artifactVersionId: "v1", decision: "approve", note: "已核验" }))
      .rejects.toMatchObject({ code: "REVIEW_NOT_PENDING", status: 409 });
    expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
  });

  it("原投稿者即使离开团队仍可撤回自己的公开授权", async () => {
    mocks.db.artifactVersion.findFirst.mockResolvedValue({
      id: "v1",
      createdById: "former-member",
      publication: { requestedById: "former-member" },
      artifact: { project: { ownerId: "team-owner", team: { members: [] } } },
    });
    mocks.db.artifactPublication.updateMany.mockResolvedValue({ count: 1 });
    await expect(withdrawArtifactPublication("p1", "former-member", "v1"))
      .resolves.toEqual({ artifactVersionId: "v1", status: "withdrawn" });
    expect(mocks.db.artifactPublication.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { artifactVersionId: "v1", status: { in: ["PENDING", "APPROVED"] } },
    }));
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "PROJECT_PUBLICATION_WITHDRAWN", actorId: "former-member" }),
    }));
  });
  it("撤回公开授权后，作品详情和点赞入口立即失效", async () => {
    mocks.db.artifactPublication.findFirst.mockResolvedValue(null);
    await expect(getPublishedArtifact("v1")).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
    await expect(toggleArtifactReaction("viewer", "v1")).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
    expect(mocks.db.artifactReaction.create).not.toHaveBeenCalled();
  });

  it("撤回公开授权后，评论入口拒绝新互动", async () => {
    mocks.db.artifactPublication.findFirst.mockResolvedValue(null);
    await expect(addArtifactComment("viewer", "v1", { content: "很有启发" }))
      .rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
    expect(mocks.db.artifactComment.create).not.toHaveBeenCalled();
  });

  it("并发重复举报命中唯一约束后复用现有待处理记录", async () => {
    mocks.db.artifactVersion.findUnique.mockResolvedValue({ artifact: { project: { ownerId: "creator" } } });
    mocks.db.artifactPublication.findFirst.mockResolvedValue({ id: "pub1" });
    mocks.db.artifactReport.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "report1" });
    mocks.db.$transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "6.19.0" }));
    await expect(reportArtifact("viewer", "v1", { reason: "SPAM" }))
      .resolves.toEqual({ created: false, id: "report1" });
    expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
  });
  it("同一用户重复举报复用待处理记录", async () => {
    mocks.db.artifactVersion.findUnique.mockResolvedValue({ artifact: { project: { ownerId: "creator" } } });
    mocks.db.artifactPublication.findFirst.mockResolvedValue({ id: "pub1" });
    mocks.db.artifactReport.findFirst.mockResolvedValue({ id: "report1" });
    await expect(reportArtifact("viewer", "v1", { reason: "SPAM" }))
      .resolves.toEqual({ created: false, id: "report1" });
    expect(mocks.db.artifactReport.create).not.toHaveBeenCalled();
    expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
  });
});