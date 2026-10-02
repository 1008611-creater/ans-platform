// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const db = {
    user: { findUnique: vi.fn(), update: vi.fn() },
    xpRewardRule: { findUnique: vi.fn(), upsert: vi.fn(), findMany: vi.fn() },
    xpRewardGrant: { count: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    xpRewardAppeal: { create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
    xpRewardReviewCase: { create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    xpLedger: { create: vi.fn(), findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  return { db };
});

vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { createRewardAppeal, grantCommunityReward, openRewardReviewCase, resolveRewardReviewCase } from "@/server/rewards/service";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.$transaction.mockImplementation(async (fn: (tx: typeof mocks.db) => unknown) => fn(mocks.db));
  mocks.db.user.findUnique.mockResolvedValue({ role: "ADMIN" });
  mocks.db.auditLog.create.mockResolvedValue({ id: "audit" });
});

describe("创作者奖励治理", () => {
  it("把可配置奖励与账本、XP 余额和审计放进同一事务", async () => {
    mocks.db.xpRewardRule.findUnique.mockResolvedValue({ id: "rule1", title: "社区贡献", amount: 25, dailyLimit: 2, active: true });
    mocks.db.user.findUnique.mockResolvedValueOnce({ role: "ADMIN" }).mockResolvedValueOnce({ id: "user1", deletedAt: null });
    mocks.db.xpRewardGrant.count.mockResolvedValue(0);
    mocks.db.xpLedger.create.mockResolvedValue({ id: "ledger1" });
    mocks.db.xpRewardGrant.create.mockResolvedValue({ id: "grant1", amount: 25 });

    const result = await grantCommunityReward("admin", { ruleId: "rule1", userId: "user1", sourceType: "showcase_comment", sourceId: "comment1" });

    expect(result).toMatchObject({ id: "grant1", amount: 25 });
    expect(mocks.db.xpLedger.create).toHaveBeenCalledWith({ data: expect.objectContaining({ reason: "COMMUNITY_REWARD", userId: "user1", amount: 25 }) });
    expect(mocks.db.user.update).toHaveBeenCalledWith({ where: { id: "user1" }, data: { xp: { increment: 25 } } });
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actorId: "admin", action: "COMMUNITY_REWARD_GRANTED" }) });
  });

  it("只允许本人对赛事或社区奖励流水发起一次申诉", async () => {
    mocks.db.xpLedger.findUnique.mockResolvedValue({ id: "ledger1", userId: "other", reason: "COMPETITION_AWARD" });

    await expect(createRewardAppeal("user1", { ledgerId: "ledger1", message: "请重新核对本次团队贡献与奖励分配结果。" }))
      .rejects.toMatchObject({ code: "REWARD_NOT_APPEALABLE", status: 404 });
    expect(mocks.db.xpRewardAppeal.create).not.toHaveBeenCalled();
  });

  it("为正向奖励打开单一复核案件", async () => {
    mocks.db.xpLedger.findUnique.mockResolvedValue({ id: "ledger1", amount: 20, reason: "COMMUNITY_REWARD" });
    mocks.db.xpRewardReviewCase.create.mockResolvedValue({ id: "case1", status: "OPEN" });

    const result = await openRewardReviewCase("admin", { ledgerId: "ledger1", reason: "发现同一来源对应多笔高度相似的贡献奖励记录。" });

    expect(result).toMatchObject({ id: "case1", status: "OPEN" });
    expect(mocks.db.xpRewardReviewCase.create).toHaveBeenCalledWith({ data: expect.objectContaining({ ledgerId: "ledger1", openedById: "admin" }) });
  });

  it("复核反作弊扣回时写入负向账本并同步余额", async () => {
    mocks.db.xpRewardReviewCase.findUnique.mockResolvedValue({ id: "case1", status: "OPEN", ledgerId: "ledger1", ledger: { userId: "user1", amount: 15 } });
    mocks.db.xpRewardReviewCase.updateMany.mockResolvedValue({ count: 1 });
    mocks.db.user.findUnique.mockResolvedValueOnce({ role: "ADMIN" }).mockResolvedValueOnce({ xp: 40 });
    mocks.db.xpLedger.create.mockResolvedValue({ id: "reversal1" });

    await resolveRewardReviewCase("admin", { caseId: "case1", decision: "reverse", resolution: "确认来源重复，撤销重复奖励。" });

    expect(mocks.db.xpLedger.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "user1", amount: -15, reason: "REWARD_REVERSAL" }) });
    expect(mocks.db.user.update).toHaveBeenCalledWith({ where: { id: "user1" }, data: { xp: { decrement: 15 } } });
  });
});
