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

import { getCompetition, registerCompetitionTeam, reviewCompetitionEntry, submitCompetitionEntry } from "@/server/competitions/service";

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
      data: expect.objectContaining({ action: "COMPETITION_ENTRY_SUBMITTED" }),
    }));
  });

  it("团队成员并发变动时拒绝不完整投稿并返回可恢复冲突", async () => {
    mocks.db.$transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("serialization", { code: "P2034", clientVersion: "6.19.0" }));
    await expect(submitCompetitionEntry("u1", "competition1", submission))
      .rejects.toMatchObject({ code: "SUBMISSION_CONFLICT", status: 409, message: "团队成员或投稿状态刚刚变化，请刷新后重新确认。" });
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
});