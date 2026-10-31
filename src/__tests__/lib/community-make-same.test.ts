// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    user: { findFirst: vi.fn() },
    communityPost: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    communityPostLike: { findUnique: vi.fn() },
    communityFollow: { findMany: vi.fn() },
    notification: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), createMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/server/growth/service", () => ({ awardGrowthEvent: vi.fn(), safeAwardGrowthEvent: vi.fn() }));
vi.mock("@/server/teams/service", () => ({ TEAM_MEMBER_CAP: 50, teamPermissions: () => ({ canInvite: false }) }));

import { createCommunityPost, getCommunityPost, recipeOf } from "@/server/community/posts";
import { CommunityError } from "@/server/community/errors";

const note = { kind: "NOTE", board: "AIGC", title: "赛博水墨猫", body: "调了一晚上", images: [] };
const recipe = { tool: "Midjourney", url: "https://www.midjourney.com/imagine", prompt: "ink wash cat, cyberpunk neon, --ar 3:4" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.$transaction.mockImplementation(async (fn: (tx: typeof mocks.db) => unknown) => fn(mocks.db));
  mocks.db.user.findFirst.mockResolvedValue({ id: "u1", flagged: false });
  mocks.db.communityPost.count.mockResolvedValue(0);
  mocks.db.communityPost.create.mockResolvedValue({ id: "new" });
  mocks.db.communityFollow.findMany.mockResolvedValue([]);
  mocks.db.notification.findMany.mockResolvedValue([]);
  mocks.db.auditLog.create.mockResolvedValue({});
});

describe("配方", () => {
  it("stores the recipe on a note and notes it in the audit log", async () => {
    await createCommunityPost("u1", { ...note, recipe });
    expect(mocks.db.communityPost.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ recipeTool: "Midjourney", recipeUrl: recipe.url, recipePrompt: recipe.prompt }) }));
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ metadata: expect.objectContaining({ recipe: true }) }) });
  });

  it("keeps the link optional and leaves notes without a recipe untouched", async () => {
    await createCommunityPost("u1", { ...note, recipe: { tool: "可灵", prompt: "镜头缓慢推进" } });
    expect(mocks.db.communityPost.create).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ recipeTool: "可灵", recipeUrl: null }) }));
    await createCommunityPost("u1", note);
    expect(mocks.db.communityPost.create.mock.calls[1][0].data).not.toHaveProperty("recipePrompt");
  });

  it("refuses plain-http links and empty prompts", async () => {
    for (const bad of [{ ...recipe, url: "http://example.com" }, { ...recipe, prompt: " " }, { ...recipe, tool: "" }]) {
      await expect(createCommunityPost("u1", { ...note, recipe: bad })).rejects.toSatisfy((error: unknown) => error instanceof CommunityError && error.code === "INVALID_INPUT");
    }
    expect(mocks.db.communityPost.create).not.toHaveBeenCalled();
  });

  it("only reads a recipe when both the tool and the prompt are there", () => {
    expect(recipeOf({ recipeTool: "Claude", recipeUrl: null, recipePrompt: "写一首诗" })).toEqual({ tool: "Claude", prompt: "写一首诗" });
    expect(recipeOf({ recipeTool: "Claude", recipeUrl: "https://claude.ai", recipePrompt: null })).toBeNull();
  });
});

describe("晒同款", () => {
  it("hangs a shared version under the recipe post like any relay", async () => {
    mocks.db.communityPost.findUnique.mockResolvedValue({ id: "root", kind: "NOTE", status: "OPEN", board: "AIGC", authorId: "lin", title: "赛博水墨猫", body: "", relayOfId: null });
    await createCommunityPost("u1", { kind: "NOTE", board: "CAMPUS", title: "我的水墨狗", body: "照着改了主体", images: [], relayOfId: "root" });
    expect(mocks.db.communityPost.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ relayOfId: "root", board: "AIGC" }) }));
    expect(mocks.db.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "lin", type: "COMMUNITY_RELAY", communityPostId: "root" }) });
  });

  it("marks the detail page with the recipe and tells a shared version it came from one", async () => {
    mocks.db.communityPost.findUnique.mockResolvedValue({
      id: "mine", authorId: "u1", status: "OPEN", kind: "NOTE", expiresAt: null, roles: null,
      recipeTool: null, recipeUrl: null, recipePrompt: null,
      relayOf: { id: "root", title: "赛博水墨猫", body: "", status: "OPEN", recipeTool: "Midjourney" },
      applications: [], helpOffers: [], relays: [], _count: { likes: 0, relays: 0 },
    });
    mocks.db.communityPostLike.findUnique.mockResolvedValue(null);
    const post = await getCommunityPost("mine", "u1");
    expect(post?.recipe).toBeNull();
    expect(post?.relayOf).toEqual({ id: "root", label: "赛博水墨猫", same: true });
    expect(post).not.toHaveProperty("recipePrompt");
  });
});
