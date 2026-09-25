// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    prompt: { findFirst: vi.fn(), findMany: vi.fn() },
    template: { findFirst: vi.fn(), findMany: vi.fn() },
    workflow: { findFirst: vi.fn(), findMany: vi.fn() },
    contentFavorite: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

import {
  FavoriteServiceError,
  addFavorite,
  isFavorited,
  listFavorites,
  removeFavorite,
} from "@/server/favorites/service";

const visiblePrompt = {
  id: "p1",
  slug: "campus-ai",
  title: "校园 AI 提示词",
  description: "写一段招新文案",
  author: { nickname: "匿名同学" },
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.$transaction.mockImplementation(async (fn: (tx: typeof mocks.db) => unknown) => fn(mocks.db));
  mocks.db.contentFavorite.create.mockResolvedValue({ id: "fav1" });
  mocks.db.auditLog.create.mockResolvedValue({ id: "audit1" });
  mocks.db.prompt.findFirst.mockResolvedValue(visiblePrompt);
  mocks.db.template.findFirst.mockResolvedValue(null);
  mocks.db.workflow.findFirst.mockResolvedValue(null);
  mocks.db.prompt.findMany.mockResolvedValue([]);
  mocks.db.template.findMany.mockResolvedValue([]);
  mocks.db.workflow.findMany.mockResolvedValue([]);
});

describe("addFavorite", () => {
  it("rejects an unknown target type before touching the database", async () => {
    await expect(addFavorite("user1", "ARTICLE", "p1")).rejects.toBeInstanceOf(FavoriteServiceError);
    expect(mocks.db.prompt.findFirst).not.toHaveBeenCalled();
    expect(mocks.db.contentFavorite.create).not.toHaveBeenCalled();
  });

  it("rejects a missing target id", async () => {
    await expect(addFavorite("user1", "PROMPT", "  ")).rejects.toBeInstanceOf(FavoriteServiceError);
    expect(mocks.db.contentFavorite.create).not.toHaveBeenCalled();
  });

  it("refuses to favorite a prompt that is private or deleted", async () => {
    mocks.db.prompt.findFirst.mockResolvedValue(null);

    const error = await addFavorite("user1", "PROMPT", "p1").catch((thrown) => thrown);

    expect(error).toBeInstanceOf(FavoriteServiceError);
    expect((error as FavoriteServiceError).code).toBe("TARGET_UNAVAILABLE");
    expect((error as FavoriteServiceError).status).toBe(404);
    expect(mocks.db.contentFavorite.create).not.toHaveBeenCalled();
  });

  it("creates the favorite and an audit entry", async () => {
    mocks.db.contentFavorite.findUnique.mockResolvedValue(null);

    expect(await addFavorite("user1", "PROMPT", " p1 ")).toEqual({ favorited: true, created: true });
    expect(mocks.db.contentFavorite.create).toHaveBeenCalledWith({
      data: { userId: "user1", targetType: "PROMPT", targetId: "p1" },
    });
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "FAVORITE_ADDED" }) }),
    );
  });

  it("is idempotent: a repeated favorite neither duplicates nor re-audits", async () => {
    mocks.db.contentFavorite.findUnique.mockResolvedValue({ id: "fav1" });

    expect(await addFavorite("user1", "PROMPT", "p1")).toEqual({ favorited: true, created: false });
    expect(mocks.db.contentFavorite.create).not.toHaveBeenCalled();
    expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
  });

  it("accepts a published template and workflow", async () => {
    mocks.db.contentFavorite.findUnique.mockResolvedValue(null);
    mocks.db.template.findFirst.mockResolvedValue({
      id: "t1",
      slug: "poster",
      title: "海报模板",
      summary: "一键生成海报",
      estimatedCost: 4,
      author: { nickname: "设计组" },
    });

    expect(await addFavorite("user1", "TEMPLATE", "t1")).toEqual({ favorited: true, created: true });

    mocks.db.template.findFirst.mockResolvedValue(null);
    mocks.db.workflow.findFirst.mockResolvedValue({
      id: "w1",
      slug: "weekly",
      title: "周报工作流",
      summary: "汇总并润色",
      estimatedCost: 6,
      author: { nickname: "编辑部" },
    });

    expect(await addFavorite("user1", "WORKFLOW", "w1")).toEqual({ favorited: true, created: true });
  });
});

describe("removeFavorite", () => {
  it("reports a miss without writing an audit entry", async () => {
    mocks.db.contentFavorite.deleteMany.mockResolvedValue({ count: 0 });

    expect(await removeFavorite("user1", "PROMPT", "p1")).toEqual({ favorited: false, removed: false });
    expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
  });

  it("deletes and audits an existing favorite", async () => {
    mocks.db.contentFavorite.deleteMany.mockResolvedValue({ count: 1 });

    expect(await removeFavorite("user1", "PROMPT", "p1")).toEqual({ favorited: false, removed: true });
    expect(mocks.db.contentFavorite.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user1", targetType: "PROMPT", targetId: "p1" },
    });
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "FAVORITE_REMOVED" }) }),
    );
  });
});

describe("listFavorites", () => {
  it("returns an empty list without querying targets", async () => {
    mocks.db.contentFavorite.findMany.mockResolvedValue([]);

    expect(await listFavorites("user1")).toEqual([]);
    expect(mocks.db.prompt.findMany).not.toHaveBeenCalled();
  });

  it("keeps collection order and hydrates prompt, template and workflow rows", async () => {
    const favoritedAt = new Date("2026-09-01T00:00:00.000Z");
    mocks.db.contentFavorite.findMany.mockResolvedValue([
      { targetType: "WORKFLOW", targetId: "w1", createdAt: favoritedAt },
      { targetType: "PROMPT", targetId: "p1", createdAt: favoritedAt },
    ]);
    mocks.db.prompt.findMany.mockResolvedValue([visiblePrompt]);
    mocks.db.workflow.findMany.mockResolvedValue([
      {
        id: "w1",
        slug: "weekly",
        title: "周报工作流",
        summary: "汇总并润色",
        estimatedCost: 6,
        author: { nickname: "编辑部" },
      },
    ]);

    const items = await listFavorites("user1");

    expect(items.map((item) => item.targetType)).toEqual(["WORKFLOW", "PROMPT"]);
    expect(items[0]).toEqual({
      targetType: "WORKFLOW",
      targetId: "w1",
      title: "周报工作流",
      href: "/workflows/weekly",
      subtitle: "汇总并润色",
      authorName: "编辑部",
      costPoints: 6,
      favoritedAt,
    });
    expect(items[1]).toEqual(
      expect.objectContaining({ href: "/prompts/campus-ai", authorName: "匿名同学", costPoints: null }),
    );
  });

  it("skips favorites whose target was delisted", async () => {
    mocks.db.contentFavorite.findMany.mockResolvedValue([
      { targetType: "TEMPLATE", targetId: "gone", createdAt: new Date() },
      { targetType: "PROMPT", targetId: "p1", createdAt: new Date() },
    ]);
    mocks.db.prompt.findMany.mockResolvedValue([visiblePrompt]);

    expect((await listFavorites("user1")).map((item) => item.targetId)).toEqual(["p1"]);
  });

  it("falls back to the prompt id when there is no slug", async () => {
    mocks.db.contentFavorite.findMany.mockResolvedValue([
      { targetType: "PROMPT", targetId: "p2", createdAt: new Date() },
    ]);
    mocks.db.prompt.findMany.mockResolvedValue([{ ...visiblePrompt, id: "p2", slug: null }]);

    expect((await listFavorites("user1"))[0].href).toBe("/prompts/p2");
  });

  it("clamps the page size to a safe maximum", async () => {
    mocks.db.contentFavorite.findMany.mockResolvedValue([]);

    await listFavorites("user1", 10_000);

    expect(mocks.db.contentFavorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
  });
});

describe("isFavorited", () => {
  it("maps a row to a boolean", async () => {
    mocks.db.contentFavorite.findUnique.mockResolvedValue({ id: "fav1" });
    expect(await isFavorited("user1", "PROMPT", "p1")).toBe(true);

    mocks.db.contentFavorite.findUnique.mockResolvedValue(null);
    expect(await isFavorited("user1", "PROMPT", "p1")).toBe(false);
  });
});
