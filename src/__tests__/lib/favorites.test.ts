// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  platform: vi.fn(),
  catalog: { findPublishedCatalog: vi.fn(), listPublishedCatalog: vi.fn() },
  db: {
    prompt: { findFirst: vi.fn(), findMany: vi.fn() },
    template: { findFirst: vi.fn(), findMany: vi.fn() },
    workflow: { findFirst: vi.fn(), findMany: vi.fn() },
    contentFavorite: { findUnique: vi.fn(), findMany: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/workflows/platform-recipes", () => ({ findPublishedPlatformRecipe: mocks.platform }));
vi.mock("@/server/catalog/service", () => mocks.catalog);
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
  mocks.platform.mockResolvedValue(null);
  mocks.catalog.findPublishedCatalog.mockResolvedValue(null);
  mocks.catalog.listPublishedCatalog.mockResolvedValue([]);
  mocks.db.$transaction.mockImplementation(async (fn: (tx: typeof mocks.db) => unknown) => fn(mocks.db));
  mocks.db.contentFavorite.createMany.mockResolvedValue({ count: 1 });
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
    expect(mocks.db.contentFavorite.createMany).not.toHaveBeenCalled();
  });

  it("rejects a missing target id", async () => {
    await expect(addFavorite("user1", "PROMPT", "  ")).rejects.toBeInstanceOf(FavoriteServiceError);
    expect(mocks.db.contentFavorite.createMany).not.toHaveBeenCalled();
  });

  it("refuses to favorite a prompt that is private or deleted", async () => {
    mocks.db.prompt.findFirst.mockResolvedValue(null);

    const error = await addFavorite("user1", "PROMPT", "p1").catch((thrown) => thrown);

    expect(error).toBeInstanceOf(FavoriteServiceError);
    expect((error as FavoriteServiceError).code).toBe("TARGET_UNAVAILABLE");
    expect((error as FavoriteServiceError).status).toBe(404);
    expect(mocks.db.contentFavorite.createMany).not.toHaveBeenCalled();
  });

  it("creates the favorite and an audit entry", async () => {
    mocks.db.contentFavorite.findUnique.mockResolvedValue(null);

    expect(await addFavorite("user1", "PROMPT", " p1 ")).toEqual({ favorited: true, created: true });
    expect(mocks.db.contentFavorite.createMany).toHaveBeenCalledWith({
      data: [{ userId: "user1", targetType: "PROMPT", targetId: "p1" }],
      skipDuplicates: true,
    });
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "FAVORITE_ADDED" }) }),
    );
  });

  it("is idempotent: a repeated favorite neither duplicates nor re-audits", async () => {
    mocks.db.contentFavorite.createMany.mockResolvedValue({ count: 0 });

    expect(await addFavorite("user1", "PROMPT", "p1")).toEqual({ favorited: true, created: false });
    expect(mocks.db.contentFavorite.createMany).toHaveBeenCalledTimes(1);
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

  it("filters retired targets before pagination without deleting historical records", async () => {
    mocks.db.contentFavorite.findMany.mockResolvedValue([]);
    await listFavorites("user1", 100);
    expect(mocks.db.contentFavorite.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user1", targetType: { in: ["PROJECT", "WORKFLOW", "VIBEHUB_TERM"] } } }));
    expect(await listFavorites("user1", 100, "PROMPT")).toEqual([]);
    expect(mocks.db.contentFavorite.deleteMany).not.toHaveBeenCalled();
  });

  it("only hydrates projects from the current published catalog and preserves order", async () => {
    const at = new Date();
    mocks.db.contentFavorite.findMany.mockResolvedValue([
      { targetType: "PROJECT", targetId: "withdrawn", createdAt: at },
      { targetType: "PROJECT", targetId: "member-real", createdAt: at },
      { targetType: "WORKFLOW", targetId: "w1", createdAt: at },
    ]);
    mocks.catalog.listPublishedCatalog.mockResolvedValue([{ slug: "member-real", creator: "Creator", content: { zh: { title: "Real project", summary: "Published offer" } } }]);
    mocks.db.workflow.findMany.mockResolvedValue([{ id: "w1", slug: "weekly", title: "Weekly", summary: null, estimatedCost: 2, author: null }]);
    const items = await listFavorites("user1");
    expect(items.map(item => item.targetId)).toEqual(["member-real", "w1"]);
    expect(items[0]).toMatchObject({ targetType: "PROJECT", href: "/explore/member-real", title: "Real project" });
  });

  it("rejects unavailable projects and never treats a private project ID as a catalog slug", async () => {
    await expect(addFavorite("user1", "PROJECT", "private-id")).rejects.toMatchObject({ code: "TARGET_UNAVAILABLE", status: 404 });
    expect(mocks.db.contentFavorite.createMany).not.toHaveBeenCalled();
    mocks.catalog.findPublishedCatalog.mockResolvedValue({ slug: "real" });
    await addFavorite("user1", "PROJECT", "real");
    expect(mocks.db.contentFavorite.createMany).toHaveBeenCalledWith({ data: [{ userId: "user1", targetType: "PROJECT", targetId: "real" }], skipDuplicates: true });
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

describe("registered platform favorites", () => {
  it("only accepts a registered exact workflow id, never a guessed slug", async () => {
    mocks.platform.mockResolvedValue({ workflow: { id: "registered-id", slug: "ans-portfolio-website", title: "Real recipe", summary: "Fixed code", estimatedCost: 2, author: { id: "user1", nickname: "Owner" } } });
    await expect(addFavorite("user1", "WORKFLOW", "registered-id")).resolves.toEqual({ favorited: true, created: true });
    mocks.db.contentFavorite.createMany.mockClear();
    await expect(addFavorite("user1", "WORKFLOW", "ans-portfolio-website")).rejects.toMatchObject({ code: "TARGET_UNAVAILABLE" });
    expect(mocks.db.contentFavorite.createMany).not.toHaveBeenCalled();
  });
  it("hides a platform favorite when registration is no longer valid", async () => {
    mocks.db.contentFavorite.findMany.mockResolvedValue([{ targetType: "WORKFLOW", targetId: "registered-id", createdAt: new Date() }]);
    mocks.platform.mockResolvedValue(null);
    await expect(listFavorites("user1")).resolves.toEqual([]);
    expect(mocks.platform).toHaveBeenCalledExactlyOnceWith();
  });
});
