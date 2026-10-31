// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    user: { findFirst: vi.fn() },
    competition: { findUnique: vi.fn() },
    teamMember: { findFirst: vi.fn(), findUnique: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
    communityPost: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    communityPostLike: { findUnique: vi.fn() },
    communityReply: { count: vi.fn(), create: vi.fn() },
    communityHelpOffer: { create: vi.fn(), findUnique: vi.fn() },
    communityTeamApplication: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    communityPostReport: { create: vi.fn(), count: vi.fn() },
    notification: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    communityFollow: { findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
  award: vi.fn(),
  safeAward: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/server/growth/service", () => ({ awardGrowthEvent: mocks.award, safeAwardGrowthEvent: mocks.safeAward }));
vi.mock("@/server/teams/service", () => ({
  TEAM_MEMBER_CAP: 50,
  teamPermissions: (role: string | null) => ({ canInvite: role === "OWNER" || role === "ADMIN" }),
}));

import { createCommunityPost, getCommunityPost, isPostActive, listCommunityPosts, roleVacancies, runCommunityPostAction } from "@/server/community/posts";
import { CommunityError } from "@/server/community/errors";

const DAY = 86_400_000;
const inDays = (days: number) => new Date(Date.now() + days * DAY);
const teamStall = { kind: "STALL", stall: "TEAM", board: "TEAM", title: "农客松缺一个前端", expiresAt: inDays(7).toISOString(), teamId: "team1", roles: [{ name: "前端", slots: 1 }] };
const openPost = (overrides: Record<string, unknown> = {}) => ({ id: "post1", authorId: "author", kind: "STALL", stall: "SEEK", status: "OPEN", expiresAt: inDays(3), teamId: null, roles: null, ...overrides });

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy((error: unknown) => error instanceof CommunityError && error.code === code);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.$transaction.mockImplementation(async (fn: (tx: typeof mocks.db) => unknown) => fn(mocks.db));
  mocks.db.user.findFirst.mockResolvedValue({ id: "u1", flagged: false });
  mocks.db.communityPost.count.mockResolvedValue(0);
  mocks.db.communityPost.create.mockResolvedValue({ id: "new" });
  mocks.db.auditLog.create.mockResolvedValue({});
  mocks.award.mockResolvedValue({ awarded: true });
});

describe("发帖", () => {
  it("only lets a team lead post for the team", async () => {
    mocks.db.teamMember.findFirst.mockResolvedValue({ role: "MEMBER" });
    await expectCode(createCommunityPost("u1", teamStall), "NOT_TEAM_LEAD");
    mocks.db.teamMember.findFirst.mockResolvedValue({ role: "OWNER" });
    await expect(createCommunityPost("u1", teamStall)).resolves.toEqual({ id: "new" });
    expect(mocks.db.communityPost.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ kind: "STALL", stall: "TEAM", teamId: "team1", roles: [{ name: "前端", slots: 1 }] }),
    }));
  });

  it("requires roles on a team post and a deadline within 60 days", async () => {
    await expectCode(createCommunityPost("u1", { ...teamStall, roles: [] }), "INVALID_INPUT");
    await expectCode(createCommunityPost("u1", { ...teamStall, stall: "SEEK", teamId: undefined, expiresAt: inDays(61).toISOString() }), "INVALID_DEADLINE");
    await expectCode(createCommunityPost("u1", { ...teamStall, stall: "SEEK", teamId: undefined, expiresAt: inDays(-1).toISOString() }), "INVALID_DEADLINE");
  });

  it("caps quick lines at 140 characters and posts per day", async () => {
    await expectCode(createCommunityPost("u1", { kind: "TEXT", board: "CAMPUS", body: "字".repeat(141) }), "INVALID_INPUT");
    mocks.db.communityPost.count.mockResolvedValue(10);
    await expectCode(createCommunityPost("u1", { kind: "TEXT", board: "CAMPUS", body: "插座修好了" }), "DAILY_LIMIT");
  });

  it("only accepts https images on notes and blocks restricted accounts", async () => {
    await expectCode(createCommunityPost("u1", { kind: "NOTE", board: "AIGC", title: "短片", body: "分镜在这", images: ["http://x.test/a.png"] }), "INVALID_INPUT");
    mocks.db.user.findFirst.mockResolvedValue({ id: "u1", flagged: true });
    await expectCode(createCommunityPost("u1", { kind: "TEXT", board: "CAMPUS", body: "插座修好了" }), "ACCOUNT_RESTRICTED");
  });
});

describe("我能帮与帮到了", () => {
  it("does not let the author offer help or anyone help after the deadline", async () => {
    mocks.db.communityPost.findUnique.mockResolvedValue(openPost());
    await expectCode(runCommunityPostAction("author", "post1", { action: "help" }), "SELF_ACTION");
    mocks.db.communityPost.findUnique.mockResolvedValue(openPost({ expiresAt: inDays(-1) }));
    await expectCode(runCommunityPostAction("u1", "post1", { action: "help" }), "POST_CLOSED");
  });

  it("rewards the chosen helper only after they offered, once per post", async () => {
    mocks.db.communityPost.findUnique.mockResolvedValue(openPost());
    mocks.db.communityHelpOffer.findUnique.mockResolvedValue(null);
    await expectCode(runCommunityPostAction("author", "post1", { action: "resolve", helperId: "stranger" }), "HELPER_NOT_OFFERED");

    mocks.db.communityHelpOffer.findUnique.mockResolvedValue({ id: "o1" });
    mocks.db.communityPost.updateMany.mockResolvedValue({ count: 1 });
    await expect(runCommunityPostAction("author", "post1", { action: "resolve", helperId: "helper" })).resolves.toEqual({ status: "RESOLVED", rewarded: true });
    expect(mocks.award).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ userId: "helper", sourceType: "community_help", sourceId: "post1", xp: 20 }));
    expect(mocks.db.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "helper", actorId: "author", type: "COMMUNITY_HELPED", communityPostId: "post1" }) });
  });

  it("does not pay XP when an offer post is handed out, and only the author resolves", async () => {
    mocks.db.communityPost.findUnique.mockResolvedValue(openPost({ stall: "OFFER" }));
    mocks.db.communityHelpOffer.findUnique.mockResolvedValue({ id: "o1" });
    mocks.db.communityPost.updateMany.mockResolvedValue({ count: 1 });
    await expectCode(runCommunityPostAction("helper", "post1", { action: "resolve", helperId: "helper" }), "FORBIDDEN");
    await expect(runCommunityPostAction("author", "post1", { action: "resolve", helperId: "helper" })).resolves.toEqual({ status: "RESOLVED", rewarded: false });
    expect(mocks.award).not.toHaveBeenCalled();
  });
});

describe("组队申请", () => {
  const teamPost = openPost({ stall: "TEAM", board: "TEAM", teamId: "team1", roles: [{ name: "前端", slots: 1 }, { name: "设计", slots: 1 }] });

  it("rejects roles that are full or applicants already on the team", async () => {
    mocks.db.communityPost.findUnique.mockResolvedValue(teamPost);
    mocks.db.teamMember.findFirst.mockResolvedValue(null);
    mocks.db.communityTeamApplication.count.mockResolvedValue(1);
    await expectCode(runCommunityPostAction("u1", "post1", { action: "apply", role: "前端" }), "ROLE_FULL");
    await expectCode(runCommunityPostAction("u1", "post1", { action: "apply", role: "后端" }), "INVALID_ROLE");
    mocks.db.teamMember.findFirst.mockResolvedValue({ id: "m1" });
    mocks.db.communityTeamApplication.count.mockResolvedValue(0);
    await expectCode(runCommunityPostAction("u1", "post1", { action: "apply", role: "设计" }), "ALREADY_MEMBER");
  });

  it("adds the accepted applicant to the team and closes the post once every role is filled", async () => {
    mocks.db.communityPost.findUnique.mockResolvedValue(teamPost);
    mocks.db.communityTeamApplication.findFirst.mockResolvedValue({ id: "a1", applicantId: "u1", role: "前端", status: "PENDING" });
    mocks.db.teamMember.findFirst.mockResolvedValue({ role: "OWNER" });
    mocks.db.communityTeamApplication.findMany.mockResolvedValue([{ role: "设计" }]);
    mocks.db.teamMember.count.mockResolvedValue(3);
    mocks.db.communityTeamApplication.updateMany.mockResolvedValue({ count: 1 });
    mocks.db.teamMember.findUnique.mockResolvedValue({ id: "m-old", status: "LEFT" });
    mocks.db.teamMember.update.mockResolvedValue({ id: "m-old" });

    await expect(runCommunityPostAction("author", "post1", { action: "decide", applicationId: "a1", decision: "ACCEPT" })).resolves.toEqual({ status: "ACCEPTED", postStatus: "RESOLVED" });
    expect(mocks.db.teamMember.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "m-old" }, data: expect.objectContaining({ status: "ACTIVE", role: "MEMBER" }) }));
    expect(mocks.db.communityPost.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "post1" }, data: expect.objectContaining({ status: "RESOLVED" }) }));
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "TEAM_MEMBER_JOINED" }) }));
    expect(mocks.db.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "u1", type: "COMMUNITY_APPLICATION_ACCEPTED" }) });
  });

  it("refuses to accept into a role someone else just took", async () => {
    mocks.db.communityPost.findUnique.mockResolvedValue(teamPost);
    mocks.db.communityTeamApplication.findFirst.mockResolvedValue({ id: "a1", applicantId: "u1", role: "前端", status: "PENDING" });
    mocks.db.teamMember.findFirst.mockResolvedValue({ role: "OWNER" });
    mocks.db.communityTeamApplication.findMany.mockResolvedValue([{ role: "前端" }]);
    await expectCode(runCommunityPostAction("author", "post1", { action: "decide", applicationId: "a1", decision: "ACCEPT" }), "ROLE_FULL");
    expect(mocks.db.teamMember.create).not.toHaveBeenCalled();
  });
});

describe("站内提醒", () => {
  it("tells the author about a reply, folding unread replies on the same post into one", async () => {
    mocks.db.communityPost.findUnique.mockResolvedValue(openPost({ kind: "TEXT", stall: null, title: null, body: "图书馆三楼插座坏了" }));
    mocks.db.communityReply.count.mockResolvedValue(0);
    mocks.db.communityReply.create.mockResolvedValue({ id: "r1" });
    mocks.db.notification.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "n1" });
    await runCommunityPostAction("u1", "post1", { action: "reply", body: "二楼的是好的" });
    expect(mocks.db.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "author", actorId: "u1", type: "COMMUNITY_REPLY", communityPostId: "post1", excerpt: "二楼的是好的" }) });
    await runCommunityPostAction("u2", "post1", { action: "reply", body: "修好了" });
    expect(mocks.db.notification.update).toHaveBeenCalledWith({ where: { id: "n1" }, data: expect.objectContaining({ actorId: "u2", excerpt: "修好了" }) });
    expect(mocks.db.notification.create).toHaveBeenCalledTimes(1);
  });

  it("does not notify the author about their own reply and never fails the action when notifying breaks", async () => {
    mocks.db.communityPost.findUnique.mockResolvedValue(openPost());
    mocks.db.communityReply.count.mockResolvedValue(0);
    mocks.db.communityReply.create.mockResolvedValue({ id: "r1" });
    await runCommunityPostAction("author", "post1", { action: "reply", body: "补充一下" });
    expect(mocks.db.notification.findFirst).not.toHaveBeenCalled();

    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.db.notification.findFirst.mockRejectedValue(new Error("db down"));
    await expect(runCommunityPostAction("u1", "post1", { action: "reply", body: "我也遇到了" })).resolves.toEqual({ replyId: "r1" });
    expect(error).toHaveBeenCalledWith("COMMUNITY_NOTIFY_FAILED", "COMMUNITY_REPLY");
    error.mockRestore();
  });
});

describe("举报与可见性", () => {
  it("hides a post once three people report it", async () => {
    mocks.db.communityPost.findUnique.mockResolvedValue(openPost());
    mocks.db.communityPostReport.create.mockResolvedValue({});
    mocks.db.communityPostReport.count.mockResolvedValue(3);
    await expect(runCommunityPostAction("u1", "post1", { action: "report", reason: "PERSONAL" })).resolves.toEqual({ reported: true, hidden: true });
    expect(mocks.db.communityPost.update).toHaveBeenCalledWith({ where: { id: "post1" }, data: { status: "HIDDEN" } });
  });

  it("shows hidden posts and the applicant list only to the author", async () => {
    const row = {
      ...openPost({ stall: "TEAM", teamId: "team1", roles: [{ name: "前端", slots: 2 }] }),
      applications: [{ id: "a1", role: "前端", status: "ACCEPTED", applicantId: "u2" }, { id: "a2", role: "前端", status: "PENDING", applicantId: "u3" }],
      helpOffers: [],
    };
    mocks.db.communityPost.findUnique.mockResolvedValue({ ...row, status: "HIDDEN" });
    await expect(getCommunityPost("post1", "u3")).resolves.toBeNull();

    mocks.db.communityPost.findUnique.mockResolvedValue(row);
    mocks.db.communityPostLike.findUnique.mockResolvedValue(null);
    const visitor = await getCommunityPost("post1", "u3");
    expect(visitor).toMatchObject({ isAuthor: false, applications: [], pendingApplicationCount: 1, myApplication: { id: "a2" }, vacancies: [{ name: "前端", slots: 2, filled: 1 }] });
    const author = await getCommunityPost("post1", "author");
    expect(author?.applications).toHaveLength(2);
  });

  it("keeps expired and hidden posts out of the feed", async () => {
    mocks.db.communityPost.findMany.mockResolvedValue([]);
    await listCommunityPosts({ board: "TEAM", sort: "open" });
    expect(mocks.db.communityPost.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ board: "TEAM", status: "OPEN", kind: "STALL", stall: { in: ["SEEK", "TEAM"] }, expiresAt: { gt: expect.any(Date) } }),
    }));
    await listCommunityPosts({});
    expect(mocks.db.communityPost.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: { in: ["OPEN", "RESOLVED"] } }) }));
  });
});

it("counts filled roles and treats past deadlines as closed", () => {
  expect(roleVacancies([{ name: "前端", slots: 1 }], [{ role: "前端" }, { role: "前端" }])).toEqual([{ name: "前端", slots: 1, filled: 1 }]);
  expect(isPostActive({ status: "OPEN", expiresAt: new Date(Date.now() - 1000) })).toBe(false);
  expect(isPostActive({ status: "OPEN", expiresAt: null })).toBe(true);
  expect(isPostActive({ status: "RESOLVED", expiresAt: null })).toBe(false);
});
