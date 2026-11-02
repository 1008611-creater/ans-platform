// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const catalog = [
  { slug: "resume-website", category: "career", subcategory: "portfolio", goal: "portfolio", workflowId: "resume-website", source: "official", preview: "site" },
  { slug: "leaf-classifier", category: "aigc", subcategory: "vision", goal: "portfolio", source: "github", preview: "site", content: { zh: { title: "叶片识别", summary: "拍一片叶子认出植物" } } },
];

const mocks = vi.hoisted(() => ({
  db: {
    user: { findFirst: vi.fn() },
    communityPost: { count: vi.fn(), create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    communityFollow: { findMany: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  listPublishedCatalog: vi.fn(),
  findPublishedCatalog: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/server/growth/service", () => ({ awardGrowthEvent: vi.fn(), safeAwardGrowthEvent: vi.fn() }));
vi.mock("@/server/teams/service", () => ({ TEAM_MEMBER_CAP: 50, teamPermissions: () => ({ canInvite: false }) }));
vi.mock("@/server/catalog/service", () => ({ listPublishedCatalog: mocks.listPublishedCatalog, findPublishedCatalog: mocks.findPublishedCatalog }));
vi.mock("next-intl/server", () => ({
  getLocale: async () => "zh",
  getTranslations: async () => (key: string) => key === "projects.resume-website.title" ? "简历网站" : key === "projects.resume-website.summary" ? "把简历做成一个网页" : key,
}));

import { createCommunityPostSchema } from "@/contracts/community-posts";
import { createCommunityPost } from "@/server/community/posts";
import { loadRemixProjects, searchRemixProjects } from "@/server/community/remix";
import { CommunityError } from "@/server/community/errors";

const note = { kind: "NOTE", board: "AIGC", title: "我也做了简历网站", body: "照着做了一版" } as const;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.db.$transaction.mockImplementation(async (fn: (tx: typeof mocks.db) => unknown) => fn(mocks.db));
  mocks.db.user.findFirst.mockResolvedValue({ id: "u1", flagged: false });
  mocks.db.communityPost.count.mockResolvedValue(0);
  mocks.db.communityPost.create.mockResolvedValue({ id: "new" });
  mocks.db.communityFollow.findMany.mockResolvedValue([]);
  mocks.db.auditLog.create.mockResolvedValue({});
  mocks.listPublishedCatalog.mockResolvedValue(catalog);
  mocks.findPublishedCatalog.mockImplementation(async (slug: string) => catalog.find((item) => item.slug === slug));
});

describe("做同款：发帖附项目", () => {
  it("only accepts catalog-style slugs on notes", () => {
    expect(createCommunityPostSchema.safeParse({ ...note, catalogSlug: "resume-website" }).success).toBe(true);
    expect(createCommunityPostSchema.safeParse({ ...note, catalogSlug: "../admin" }).success).toBe(false);
    const text = createCommunityPostSchema.parse({ kind: "TEXT", board: "AIGC", body: "一句话", catalogSlug: "resume-website" });
    expect("catalogSlug" in text).toBe(false);
  });

  it("stores a published project on the note", async () => {
    await createCommunityPost("u1", { ...note, catalogSlug: "resume-website" });
    expect(mocks.db.communityPost.create.mock.calls[0][0].data.catalogSlug).toBe("resume-website");
  });

  it("rejects a project that is not listed", async () => {
    await expect(createCommunityPost("u1", { ...note, catalogSlug: "gone-project" })).rejects.toSatisfy((error: unknown) => error instanceof CommunityError && error.code === "INVALID_PROJECT");
    expect(mocks.db.communityPost.create).not.toHaveBeenCalled();
  });

  it("leaves notes without a project untouched", async () => {
    await createCommunityPost("u1", note);
    expect(mocks.db.communityPost.create.mock.calls[0][0].data.catalogSlug).toBeNull();
    expect(mocks.findPublishedCatalog).not.toHaveBeenCalled();
  });
});

describe("做同款：项目入口", () => {
  it("sends workflow projects to their start entry and others to the project page", async () => {
    const projects = await loadRemixProjects(["resume-website", "leaf-classifier", "withdrawn", null]);
    expect(projects.get("resume-website")).toMatchObject({ title: "简历网站", href: "/projects?goal=portfolio&workflow=resume-website#new-project" });
    expect(projects.get("leaf-classifier")).toMatchObject({ title: "叶片识别", href: "/explore/leaf-classifier" });
    expect(projects.has("withdrawn")).toBe(false);
  });

  it("searches titles and summaries", async () => {
    expect(await searchRemixProjects("叶子")).toEqual([{ slug: "leaf-classifier", title: "叶片识别" }]);
    expect(await searchRemixProjects("没有这个")).toEqual([]);
  });
});
