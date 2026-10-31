// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    user: { findFirst: vi.fn() },
    communityBottle: { count: vi.fn(), create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    communityBottlePick: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    communityBottleReply: { create: vi.fn() },
    communityBottleReport: { create: vi.fn(), count: vi.fn(), updateMany: vi.fn() },
    communityPost: { findUnique: vi.fn(), update: vi.fn() },
    communityPostReport: { updateMany: vi.fn() },
    notification: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/server/growth/service", () => ({ awardGrowthEvent: vi.fn(), safeAwardGrowthEvent: vi.fn() }));
vi.mock("@/server/teams/service", () => ({ TEAM_MEMBER_CAP: 50, teamPermissions: () => ({ canInvite: false }) }));

import { Prisma } from "@prisma/client";
import { pickBottle, runBottleAction, throwBottle } from "@/server/community/bottles";
import { reviewCommunityReport } from "@/server/community/moderation";
import { notificationExcerpt } from "@/server/community/notifications";
import { CommunityError } from "@/server/community/errors";

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy((error: unknown) => error instanceof CommunityError && error.code === code);
}

const duplicate = () => new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.user.findFirst.mockResolvedValue({ id: "u1", flagged: false });
  mocks.db.auditLog.create.mockResolvedValue({});
  mocks.db.$transaction.mockResolvedValue([]);
});

describe("扔瓶子", () => {
  it("limits bottles per day and keeps the text short", async () => {
    mocks.db.communityBottle.count.mockResolvedValue(0);
    mocks.db.communityBottle.create.mockResolvedValue({ id: "b1" });
    await expect(throwBottle("u1", { action: "throw", body: "期末周有人一起去图书馆吗" })).resolves.toEqual({ id: "b1" });
    await expectCode(throwBottle("u1", { body: "字".repeat(281) }), "INVALID_INPUT");
    mocks.db.communityBottle.count.mockResolvedValue(3);
    await expectCode(throwBottle("u1", { body: "再扔一个" }), "BOTTLE_THROW_LIMIT");
  });
});

describe("捞瓶子", () => {
  it("never returns my own or already-picked bottles and prefers ones nobody answered", async () => {
    mocks.db.communityBottlePick.count.mockResolvedValue(0);
    mocks.db.communityBottle.count.mockResolvedValueOnce(2);
    mocks.db.communityBottle.findFirst.mockResolvedValue({ id: "b2", body: "hello", createdAt: new Date() });
    const result = await pickBottle("u1");
    expect(result.bottle?.id).toBe("b2");
    const where = mocks.db.communityBottle.count.mock.calls[0][0].where;
    expect(where).toMatchObject({ status: "OPEN", authorId: { not: "u1" }, picks: { none: { userId: "u1" } }, replies: { none: {} } });
    expect(mocks.db.communityBottlePick.create).toHaveBeenCalledWith({ data: { bottleId: "b2", userId: "u1" } });
  });

  it("falls back to answered bottles, then reports an empty sea", async () => {
    mocks.db.communityBottlePick.count.mockResolvedValue(0);
    mocks.db.communityBottle.count.mockResolvedValue(0);
    await expect(pickBottle("u1")).resolves.toEqual({ bottle: null });
    expect(mocks.db.communityBottle.count).toHaveBeenCalledTimes(2);
    mocks.db.communityBottlePick.count.mockResolvedValue(10);
    await expectCode(pickBottle("u1"), "BOTTLE_PICK_LIMIT");
  });
});

describe("回瓶子与举报", () => {
  beforeEach(() => {
    mocks.db.communityBottle.findUnique.mockResolvedValue({ id: "b1", authorId: "thrower", status: "OPEN" });
    mocks.db.communityBottlePick.findUnique.mockResolvedValue({ id: "p1" });
  });

  it("only lets someone who picked the bottle reply, once, and tells the thrower without naming them", async () => {
    mocks.db.communityBottlePick.findUnique.mockResolvedValueOnce(null);
    await expectCode(runBottleAction("u1", "b1", { action: "reply", body: "加油" }), "NOT_PICKED");

    await expect(runBottleAction("u1", "b1", { action: "reply", body: "加油" })).resolves.toEqual({ replied: true });
    expect(mocks.db.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "thrower", actorId: null, type: "BOTTLE_REPLY", bottleId: "b1" }) });

    mocks.db.communityBottleReply.create.mockRejectedValue(duplicate());
    await expectCode(runBottleAction("u1", "b1", { action: "reply", body: "再说一句" }), "ALREADY_REPLIED");
  });

  it("does not let the thrower act on their own bottle", async () => {
    mocks.db.communityBottle.findUnique.mockResolvedValue({ id: "b1", authorId: "u1", status: "OPEN" });
    await expectCode(runBottleAction("u1", "b1", { action: "reply", body: "自问自答" }), "SELF_ACTION");
  });

  it("hides a bottle after two reports", async () => {
    mocks.db.communityBottleReport.count.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    await expect(runBottleAction("u1", "b1", { action: "report", reason: "SPAM" })).resolves.toEqual({ reported: true, hidden: false });
    await expect(runBottleAction("u2", "b1", { action: "report", reason: "SPAM" })).resolves.toEqual({ reported: true, hidden: true });
    expect(mocks.db.communityBottle.update).toHaveBeenCalledExactlyOnceWith({ where: { id: "b1" }, data: { status: "HIDDEN" } });
  });
});

describe("举报复核", () => {
  it("restores a hidden post to resolved when it had been resolved before", async () => {
    mocks.db.communityPost.findUnique.mockResolvedValue({ status: "HIDDEN", resolvedAt: new Date() });
    await expect(reviewCommunityReport("admin", { target: "post", id: "post1", decision: "restore" })).resolves.toEqual({ status: "RESOLVED" });
    expect(mocks.db.communityPostReport.updateMany).toHaveBeenCalledWith({ where: { postId: "post1", status: "PENDING" }, data: { status: "DISMISSED" } });
    expect(mocks.db.communityPost.update).toHaveBeenCalledWith({ where: { id: "post1" }, data: { status: "RESOLVED" } });
  });

  it("keeps a removed bottle hidden and marks its reports reviewed", async () => {
    mocks.db.communityBottle.findUnique.mockResolvedValue({ status: "OPEN" });
    await expect(reviewCommunityReport("admin", { target: "bottle", id: "b1", decision: "remove" })).resolves.toEqual({ status: "HIDDEN" });
    expect(mocks.db.communityBottleReport.updateMany).toHaveBeenCalledWith({ where: { bottleId: "b1", status: "PENDING" }, data: { status: "REVIEWED" } });
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actorId: "admin", action: "COMMUNITY_REPORT_REVIEWED", resourceType: "community_bottle" }) });
  });

  it("rejects unknown targets", async () => {
    await expectCode(reviewCommunityReport("admin", { target: "user", id: "x", decision: "remove" }), "INVALID_INPUT");
  });
});

it("trims notification excerpts to one short line", () => {
  expect(notificationExcerpt("  第一行\n第二行  ")).toBe("第一行 第二行");
  expect(notificationExcerpt("字".repeat(100))).toHaveLength(80);
  expect(notificationExcerpt("")).toBeNull();
});
