// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  db: {
    user: { findFirst: vi.fn(), findMany: vi.fn() },
    communityPost: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn(), groupBy: vi.fn() },
    communityFollow: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    notification: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), createMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/server/growth/service", () => ({ awardGrowthEvent: vi.fn(), safeAwardGrowthEvent: vi.fn() }));
vi.mock("@/server/teams/service", () => ({ TEAM_MEMBER_CAP: 50, teamPermissions: () => ({ canInvite: false }) }));

import { createCommunityPost } from "@/server/community/posts";
import { getFollowRelation, notifyFollowersOfPost, runFollowAction, suggestFollows } from "@/server/community/follows";
import { CommunityError } from "@/server/community/errors";

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy((error: unknown) => error instanceof CommunityError && error.code === code);
}

const root = { id: "root", kind: "NOTE", status: "OPEN", board: "AIGC", authorId: "official", title: "Day 03：认一片叶子", body: "题目", relayOfId: null };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.$transaction.mockImplementation(async (fn: (tx: typeof mocks.db) => unknown) => fn(mocks.db));
  mocks.db.user.findFirst.mockResolvedValue({ id: "u1", flagged: false });
  mocks.db.communityPost.count.mockResolvedValue(0);
  mocks.db.communityPost.create.mockResolvedValue({ id: "new" });
  mocks.db.communityFollow.findMany.mockResolvedValue([]);
  mocks.db.communityFollow.count.mockResolvedValue(0);
  mocks.db.notification.findMany.mockResolvedValue([]);
  mocks.db.auditLog.create.mockResolvedValue({});
});

describe("接力", () => {
  it("hangs the relay on the original, takes the original's board and tells its author", async () => {
    mocks.db.communityPost.findUnique.mockResolvedValue(root);
    await expect(createCommunityPost("u1", { kind: "TEXT", board: "CAMPUS", body: "我也做了一个", relayOfId: "root" })).resolves.toEqual({ id: "new" });
    expect(mocks.db.communityPost.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ relayOfId: "root", board: "AIGC" }) }));
    expect(mocks.db.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "official", actorId: "u1", type: "COMMUNITY_RELAY", communityPostId: "root", excerpt: "我也做了一个" }) });
  });

  it("flattens a relay of a relay onto the first post so the chain stays one level", async () => {
    mocks.db.communityPost.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => where.id === "relay1" ? { ...root, id: "relay1", authorId: "lin", relayOfId: "root" } : root);
    await createCommunityPost("u1", { kind: "NOTE", board: "AIGC", title: "银杏叶也会缺钾", body: "查了三篇文献", relayOfId: "relay1" });
    expect(mocks.db.communityPost.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ relayOfId: "root" }) }));
    expect(mocks.db.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "official", communityPostId: "root" }) });
  });

  it("refuses to relay stalls, hidden posts or posts that do not exist", async () => {
    const relay = { kind: "TEXT", board: "AIGC", body: "我也来", relayOfId: "root" };
    mocks.db.communityPost.findUnique.mockResolvedValue({ ...root, kind: "STALL" });
    await expectCode(createCommunityPost("u1", relay), "INVALID_RELAY");
    mocks.db.communityPost.findUnique.mockResolvedValue({ ...root, status: "HIDDEN" });
    await expectCode(createCommunityPost("u1", relay), "INVALID_RELAY");
    mocks.db.communityPost.findUnique.mockResolvedValue(null);
    await expectCode(createCommunityPost("u1", relay), "INVALID_RELAY");
    expect(mocks.db.communityPost.create).not.toHaveBeenCalled();
  });
});

describe("关注", () => {
  it("cannot follow yourself or a removed account", async () => {
    await expectCode(runFollowAction("u1", { action: "follow", userId: "u1" }), "SELF_ACTION");
    mocks.db.user.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => where.id === "u1" ? { id: "u1", flagged: false } : null);
    await expectCode(runFollowAction("u1", { action: "follow", userId: "gone" }), "NOT_FOUND");
  });

  it("follows once, tells the person, and treats a repeat as already done", async () => {
    await expect(runFollowAction("u1", { action: "follow", userId: "kai" })).resolves.toEqual({ following: true });
    expect(mocks.db.communityFollow.create).toHaveBeenCalledWith({ data: { followerId: "u1", followeeId: "kai" } });
    expect(mocks.db.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "kai", actorId: "u1", type: "COMMUNITY_FOLLOWED" }) });

    mocks.db.communityFollow.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "test" }));
    await expect(runFollowAction("u1", { action: "follow", userId: "kai" })).resolves.toEqual({ following: true });
  });

  it("caps follows per day and unfollows without a confirmation step", async () => {
    mocks.db.communityFollow.count.mockResolvedValue(100);
    await expectCode(runFollowAction("u1", { action: "follow", userId: "kai" }), "DAILY_LIMIT");
    await expect(runFollowAction("u1", { action: "unfollow", userId: "kai" })).resolves.toEqual({ following: false });
    expect(mocks.db.communityFollow.deleteMany).toHaveBeenCalledWith({ where: { followerId: "u1", followeeId: "kai" } });
  });

  it("reads both directions so the button can say follow back or mutual", async () => {
    mocks.db.communityFollow.findMany.mockResolvedValue([{ followerId: "kai" }]);
    await expect(getFollowRelation("u1", "kai")).resolves.toEqual({ following: false, followedBy: true });
    mocks.db.communityFollow.findMany.mockResolvedValue([{ followerId: "kai" }, { followerId: "u1" }]);
    await expect(getFollowRelation("u1", "kai")).resolves.toEqual({ following: true, followedBy: true });
    await expect(getFollowRelation(null, "kai")).resolves.toEqual({ following: false, followedBy: false });
  });

  it("puts people who follow you first and only uses real counts as the reason", async () => {
    mocks.db.communityFollow.findMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => "followerId" in where && typeof where.followerId === "string"
      ? [{ followeeId: "already" }]
      : [{ follower: { id: "kai", username: "kai", nickname: null, avatar: null } }]);
    mocks.db.communityPost.groupBy.mockResolvedValue([{ authorId: "bai", _count: { _all: 6, relayOfId: 4 } }]);
    mocks.db.user.findMany.mockResolvedValue([{ id: "bai", username: "bai", nickname: "白榆", avatar: null }]);
    const people = await suggestFollows("u1", 2);
    expect(people.map((person) => [person.id, person.reason, person.count])).toEqual([["kai", "fan", 0], ["bai", "relays", 4]]);
    expect(mocks.db.communityPost.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ authorId: { notIn: ["u1", "already", "kai"] } }) }));
  });
});

describe("粉丝提醒", () => {
  it("folds a second unread post from the same person into the existing reminder", async () => {
    mocks.db.communityFollow.findMany.mockResolvedValue([{ followerId: "a" }, { followerId: "b" }]);
    mocks.db.notification.findMany.mockResolvedValue([{ id: "n-a", userId: "a" }]);
    await notifyFollowersOfPost("kai", "post2", "第二条");
    expect(mocks.db.notification.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["n-a"] } }, data: expect.objectContaining({ communityPostId: "post2", excerpt: "第二条" }) });
    expect(mocks.db.notification.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ userId: "b", actorId: "kai", type: "COMMUNITY_FOLLOWEE_POST", communityPostId: "post2" })] });
    expect(mocks.db.communityFollow.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 500 }));
  });

  it("never breaks posting when reminders fail", async () => {
    mocks.db.communityFollow.findMany.mockRejectedValue(new Error("db down"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(createCommunityPost("u1", { kind: "TEXT", board: "CAMPUS", body: "插座修好了" })).resolves.toEqual({ id: "new" });
    expect(error).toHaveBeenCalledWith("COMMUNITY_FOLLOWER_NOTIFY_FAILED");
    error.mockRestore();
  });
});
