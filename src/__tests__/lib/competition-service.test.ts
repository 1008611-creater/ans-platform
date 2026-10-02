// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  db: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    competition: { findUnique: vi.fn(), findMany: vi.fn() },
    teamMember: { findFirst: vi.fn(), findMany: vi.fn() },
    teamCompetition: { findUnique: vi.fn(), updateMany: vi.fn(), aggregate: vi.fn(), create: vi.fn() },
    teamCompetitionContribution: { deleteMany: vi.fn(), createMany: vi.fn() },
    project: { findFirst: vi.fn() },
    artifactVersion: { findFirst: vi.fn() },
    artifactPublication: { upsert: vi.fn() },
    xpLedger: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { deriveCompetitionProgress, getCompetition, registerCompetitionTeam, reviewCompetitionEntry, submitCompetitionEntry } from "@/server/competitions/service";

const submission = {
  teamId: "team1",
  projectId: "project1",
  artifactVersionId: "version1",
  summary: "A classroom resource exchange project built by our team.",
  publicConsent: false,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.$transaction.mockImplementation(async (fn: (tx: typeof mocks.db) => unknown) => fn(mocks.db));
  mocks.db.auditLog.create.mockResolvedValue({ id: "audit1" });
});

describe("赛事参与闭环", () => {
  it.each([
    [{ viewerId: null }, "DISCOVER", "登录后报名"],
    [{ viewerId: "u1", hasTeam: false }, "TEAM", "创建或加入队伍"],
    [{ viewerId: "u1", hasTeam: true }, "REGISTER", "立即报名"],
    [{ viewerId: "u1", entry: { id: "e1", teamId: "t1", entryStatus: "REGISTERED", awardedXp: 0, publicConsent: false }, hasProject: false }, "PROJECT", "创建参赛项目"],
    [{ viewerId: "u1", entry: { id: "e1", teamId: "t1", entryStatus: "REGISTERED", awardedXp: 0, publicConsent: false }, hasProject: true }, "SUBMIT", "继续创作并提交"],
    [{ viewerId: "u1", entry: { id: "e1", entryStatus: "SUBMITTED", awardedXp: 0, publicConsent: false } }, "REVIEW", "查看审核进度"],
    [{ viewerId: "u1", entry: { id: "e1", entryStatus: "REJECTED", awardedXp: 0, publicConsent: false } }, "RESUBMIT", "修改后重新提交"],
    [{ viewerId: "u1", entry: { id: "e1", submissionVersionId: "v1", entryStatus: "APPROVED", awardedXp: 0, publicConsent: true, publicationStatus: "PENDING" } }, "PUBLISH", "查看公开进度"],
    [{ viewerId: "u1", entry: { id: "e1", submissionVersionId: "v1", entryStatus: "APPROVED", awardedXp: 0, publicConsent: true, publicationStatus: "APPROVED" } }, "SHOWCASE", "查看公开作品"],
    [{ viewerId: "u1", entry: { id: "e1", entryStatus: "APPROVED", awardedXp: 20, publicConsent: false } }, "REWARD", "查看奖励记录"],
  ] as const)("状态导向唯一下一步：%s", (input, stage, action) => {
    const result = deriveCompetitionProgress({ competitionId: "c1", status: "ONGOING", ...input });
    expect(result.currentStage).toBe(stage);
    expect(result.nextAction.label).toBe(action);
  });

  it("已结束赛事不再引导报名或投稿", () => {
    const result = deriveCompetitionProgress({ competitionId: "c1", status: "ENDED", viewerId: "u1" });
    expect(result.currentStage).toBe("ENDED");
    expect(result.nextAction.href).toBe("/competitions/c1#showcase");
  });

  it("已结束赛事的拒绝投稿不再开放重新提交入口", () => {
    const result = deriveCompetitionProgress({ competitionId: "c1", status: "ENDED", viewerId: "u1", entry: { id: "e1", entryStatus: "REJECTED", awardedXp: 0, publicConsent: false } });
    expect(result.currentStage).toBe("ENDED");
    expect(result.nextAction.href).toBe("/competitions/c1#showcase");
  });

  it("撤回逐版本公开授权后，赛事公开页不再返回作品版本信息", async () => {
    mocks.db.competition.findUnique.mockResolvedValue({
      id: "competition1",
      title: "校园创作赛",
      teams: [{
        id: "entry1",
        entryStatus: "APPROVED",
        createdAt: new Date(),
        submittedAt: new Date(),
        awardedXp: 10,
        reviewNote: "通过",
        submissionNote: "内部稿件说明",
        submissionVersion: {
          id: "version1",
          version: 3,
          publication: { status: "WITHDRAWN" },
          artifact: { title: "内部作品标题", projectId: "project1" },
        },
        team: { id: "team1", name: "团队一", slug: "team-one", ownerId: "owner1" },
      }],
    });
    mocks.db.teamMember.findMany.mockResolvedValue([]);

    const result = await getCompetition("competition1", null);
    expect(result.teams[0].submissionVersion).toBeNull();
    expect(result.teams[0]).not.toHaveProperty("submissionNote", "内部稿件说明");
    expect(result.teams[0].team).not.toHaveProperty("ownerId");
  });

  it("赛事开始前不能报名", async () => {
    mocks.db.teamMember.findFirst.mockResolvedValue({ role: "OWNER" });
    mocks.db.competition.findUnique.mockResolvedValue({ status: "UPCOMING", startsAt: new Date(Date.now() + 60_000), endsAt: null });
    await expect(registerCompetitionTeam("u1", "competition1", { teamId: "team1" }))
      .rejects.toMatchObject({ code: "COMPETITION_NOT_STARTED", status: 409 });
    expect(mocks.db.teamCompetition.create).not.toHaveBeenCalled();
  });
  it("非团队成员不能投稿", async () => {
    mocks.db.teamMember.findFirst.mockResolvedValue(null);
    mocks.db.teamMember.findMany.mockResolvedValue([]);
    mocks.db.competition.findUnique.mockResolvedValue({ status: "ONGOING", startsAt: null, endsAt: null });
    await expect(submitCompetitionEntry("outsider", "competition1", submission))
      .rejects.toMatchObject({ code: "TEAM_PERMISSION_REQUIRED", status: 403 });
    expect(mocks.db.teamCompetition.updateMany).not.toHaveBeenCalled();
  });

  it("投稿时把有效成员写入不可变贡献快照和审计", async () => {
    mocks.db.teamMember.findFirst.mockResolvedValue({ id: "membership1" });
    mocks.db.teamMember.findMany.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
    mocks.db.competition.findUnique.mockResolvedValue({ status: "ONGOING", startsAt: null, endsAt: null });
    mocks.db.project.findFirst.mockResolvedValue({ id: "project1" });
    mocks.db.artifactVersion.findFirst.mockResolvedValue({ id: "version1" });
    mocks.db.teamCompetition.findUnique.mockResolvedValue({ id: "entry1", entryStatus: "REGISTERED" });
    mocks.db.teamCompetition.updateMany.mockResolvedValue({ count: 1 });

    const result = await submitCompetitionEntry("u1", "competition1", submission);
    expect(result).toMatchObject({ status: "SUBMITTED", artifactVersionId: "version1", contributors: 2 });
    expect(mocks.db.teamCompetitionContribution.createMany).toHaveBeenCalledWith({
      data: [{ teamCompetitionId: "entry1", userId: "u1", points: 1 }, { teamCompetitionId: "entry1", userId: "u2", points: 1 }],
    });
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "COMPETITION_ENTRY_SUBMITTED",
        before: { status: "REGISTERED", artifactVersionId: null },
        after: { status: "SUBMITTED", artifactVersionId: "version1" },
        metadata: expect.objectContaining({ competitionId: "competition1", artifactVersionId: "version1" }),
      }),
    }));
  });

  it("团队成员并发变动时拒绝不完整投稿并返回可恢复冲突", async () => {
    mocks.db.$transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("serialization", { code: "P2034", clientVersion: "6.19.0" }));
    await expect(submitCompetitionEntry("u1", "competition1", submission))
      .rejects.toMatchObject({ code: "SUBMISSION_CONFLICT", status: 409 });
  });
  it("赛事奖励额度不足时不完成审核也不记账", async () => {
    mocks.db.user.findUnique.mockResolvedValue({ role: "ADMIN" });
    mocks.db.teamCompetition.findUnique.mockResolvedValue({
      id: "entry1",
      entryStatus: "SUBMITTED",
      competitionId: "competition1",
      competition: { title: "校园创作赛", rewardXp: 100 },
      publicConsent: false,
      submissionVersion: { id: "version1", artifact: { projectId: "project1", project: { facts: [] } } },
      contributions: [{ userId: "u1", points: 1 }],
      submittedById: "u1",
    });
    mocks.db.teamCompetition.aggregate.mockResolvedValue({ _sum: { awardedXp: 90 } });
    await expect(reviewCompetitionEntry("admin", { teamCompetitionId: "entry1", decision: "approve", note: "通过", awardedXp: 20 }))
      .rejects.toMatchObject({ code: "REWARD_BUDGET_EXCEEDED", status: 409 });
    expect(mocks.db.teamCompetition.updateMany).not.toHaveBeenCalled();
    expect(mocks.db.xpLedger.create).not.toHaveBeenCalled();
  });
  it("registration audit captures state transition and competition", async () => {
    mocks.db.teamMember.findFirst.mockResolvedValue({ role: "OWNER" });
    mocks.db.competition.findUnique.mockResolvedValue({ status: "ONGOING", startsAt: null, endsAt: null, maxTeams: null });
    mocks.db.teamCompetition.findUnique.mockResolvedValue(null);
    mocks.db.teamCompetition.create.mockResolvedValue({ id: "entry1", entryStatus: "REGISTERED" });

    await registerCompetitionTeam("u1", "competition1", { teamId: "team1" });

    expect(mocks.db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "COMPETITION_TEAM_REGISTERED",
        before: { status: null },
        after: { status: "REGISTERED" },
        metadata: { competitionId: "competition1", teamId: "team1", artifactVersionId: null },
      }),
    });
  });

});
