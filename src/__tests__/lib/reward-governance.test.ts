// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const db = {
    $queryRaw: vi.fn(),
    user: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    growthEvent: { findMany: vi.fn(), createMany: vi.fn(), create: vi.fn() },
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

import { reviewRewardAppeal, createRewardAppeal, grantCommunityReward, openRewardReviewCase, resolveRewardReviewCase } from "@/server/rewards/service";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.$transaction.mockImplementation(async (fn: (tx: typeof mocks.db) => unknown) => fn(mocks.db));
  mocks.db.user.findUnique.mockResolvedValue({ role: "ADMIN" });
  mocks.db.user.findUniqueOrThrow.mockResolvedValue({ xp: 0 });
  mocks.db.$queryRaw.mockImplementation(async (sql: TemplateStringsArray, ...values: unknown[]) => {
    expect(sql.join("?")).toMatch(/SELECT id FROM users WHERE id = \? FOR UPDATE/);
    expect(values).toEqual(["user1"]);
    return [{ id: "user1" }];
  });
  mocks.db.growthEvent.findMany.mockResolvedValue([]);
  mocks.db.growthEvent.createMany.mockResolvedValue({ count: 1 });
  mocks.db.growthEvent.create.mockResolvedValue({ id: "growth1" });
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
    expect(mocks.db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(mocks.db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(mocks.db.xpRewardGrant.count.mock.invocationCallOrder[0]);
    expect(mocks.db.growthEvent.create).toHaveBeenCalledWith({ data: { userId: "user1", type: "COMMUNITY_REWARD", sourceType: "reward_grant", sourceId: "grant1", xp: 25, points: 0 } });
    expect(mocks.db.xpLedger.create).toHaveBeenCalledWith({ data: expect.objectContaining({ reason: "COMMUNITY_REWARD", userId: "user1", amount: 25 }) });
    expect(mocks.db.user.update).toHaveBeenCalledWith({ where: { id: "user1" }, data: { xp: { increment: 25 }, communityPoints: { increment: 0 } } });
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actorId: "admin", action: "COMMUNITY_REWARD_GRANTED" }) });
  });

  it("正向奖励补发已达到但未领取的等级积分", async () => {
    mocks.db.xpRewardRule.findUnique.mockResolvedValue({ id: "rule1", title: "社区贡献", amount: 25, dailyLimit: 2, active: true });
    mocks.db.user.findUnique.mockResolvedValueOnce({ role: "ADMIN" }).mockResolvedValueOnce({ id: "user1", deletedAt: null });
    mocks.db.user.findUniqueOrThrow.mockResolvedValue({ xp: 290 });
    mocks.db.growthEvent.findMany.mockResolvedValue([{ sourceId: "1" }]);
    mocks.db.xpRewardGrant.count.mockResolvedValue(0);
    mocks.db.xpLedger.create.mockResolvedValue({ id: "ledger1" });
    mocks.db.xpRewardGrant.create.mockResolvedValue({ id: "grant1" });
    await grantCommunityReward("admin", { ruleId: "rule1", userId: "user1", sourceType: "showcase_comment", sourceId: "comment1" });
    expect(mocks.db.growthEvent.createMany).toHaveBeenCalledWith({ data: [{ userId: "user1", type: "LEVEL_REWARD", sourceType: "level", sourceId: "2", xp: 0, points: 40 }] });
    expect(mocks.db.user.update).toHaveBeenCalledWith({ where: { id: "user1" }, data: { xp: { increment: 25 }, communityPoints: { increment: 40 } } });
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

    expect(mocks.db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(mocks.db.user.findUnique.mock.invocationCallOrder[1]);
    expect(mocks.db.xpLedger.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "user1", amount: -15, reason: "REWARD_REVERSAL" }) });
    expect(mocks.db.user.update).toHaveBeenCalledWith({ where: { id: "user1" }, data: { xp: { decrement: 15 } } });
  });
  it("复核等待账户锁后按最新余额拒绝透支，不写负向流水", async () => {
    mocks.db.xpRewardReviewCase.findUnique.mockResolvedValue({ id: "case1", status: "OPEN", ledgerId: "ledger1", ledger: { userId: "user1", amount: 15 } });
    mocks.db.xpRewardReviewCase.updateMany.mockResolvedValue({ count: 1 });
    let balance = 40;
    mocks.db.user.findUnique.mockImplementation(async (query) => query.select.role ? { role: "ADMIN" } : { xp: balance });
    mocks.db.$queryRaw.mockImplementationOnce(async () => { balance = 10; return [{ id: "user1" }]; });
    await expect(resolveRewardReviewCase("admin", { caseId: "case1", decision: "reverse", resolution: "确认来源重复，撤销重复奖励。" })).rejects.toMatchObject({ code: "XP_BALANCE_TOO_LOW", status: 409 });
    expect(mocks.db.xpLedger.create).not.toHaveBeenCalled();
    expect(mocks.db.user.update).not.toHaveBeenCalled();
  });

  it("负向申诉调整在账户锁后检查余额，避免同时扣回透支", async () => {
    mocks.db.xpRewardAppeal.findUnique.mockResolvedValue({ id: "appeal1", status: "PENDING", userId: "user1", ledgerId: "ledger1", ledger: { amount: 25 } });
    let balance = 40;
    mocks.db.user.findUnique.mockImplementation(async (query) => query.select.role ? { role: "ADMIN" } : { xp: balance });
    mocks.db.$queryRaw.mockImplementationOnce(async () => { balance = 5; return [{ id: "user1" }]; });
    await expect(reviewRewardAppeal("admin", { appealId: "appeal1", decision: "approve", adjustment: -15, resolution: "核实部分奖励需扣回。" })).rejects.toMatchObject({ code: "XP_BALANCE_TOO_LOW", status: 409 });
    expect(mocks.db.xpRewardAppeal.updateMany).not.toHaveBeenCalled();
    expect(mocks.db.user.update).not.toHaveBeenCalled();
    expect(mocks.db.xpLedger.create).not.toHaveBeenCalled();
  });

});
