import { describe, expect, it, vi } from "vitest";
import { catalogEntrySchema, CATALOG_TEXT_FIELDS, type CatalogEntry } from "@/contracts/catalog-content";
import { catalogWorkflowIdSchema } from "@/contracts/catalog";
import { catalogText, mergeCatalog } from "@/domain/catalog/content";
import { CATALOG_PROJECTS, filterCatalogProjects } from "@/domain/catalog/projects";
import { hasAdminPermission } from "@/lib/admin-permission-values";
import zh from "../../../messages/product/zh.json";
import en from "../../../messages/product/en.json";
vi.mock("next-intl/server", () => ({ getTranslations: async ({ locale }: { locale: "zh" | "en" }) => {
  const messages = locale === "zh" ? zh : en;
  const get = (key: string) => key.split(".").reduce<unknown>((value, part) => (value as Record<string, unknown>)?.[part], messages);
  return Object.assign((key: string) => get(key), { has: (key: string) => typeof get(key) === "string" });
} }));
const text = Object.fromEntries(CATALOG_TEXT_FIELDS.map(field => [field, "中文 " + field])) as CatalogEntry["content"]["zh"];
const draft: CatalogEntry = { slug: "test-project", category: "learning", subcategory: "methods", goal: "career", preview: "document", source: "official", content: { zh: text } };
describe("official catalog content", () => {
  it("materializes all existing recipes as valid editable drafts", async () => {
    const { builtinCatalogDrafts } = await import("@/server/catalog/builtin-drafts");
    const drafts = await builtinCatalogDrafts();
    expect(drafts).toHaveLength(CATALOG_PROJECTS.length);
    drafts.forEach(entry => expect(catalogEntrySchema.safeParse(entry).success).toBe(true));
  });
  it("has every supported workflow label in both languages", () => {
    for (const id of catalogWorkflowIdSchema.options) {
      expect(zh.catalogAdmin.workflows).toHaveProperty(id);
      expect(en.catalogAdmin.workflows).toHaveProperty(id);
    }
  });
  it.each(["not-a-url", "http://example.com", "javascript:alert(1)", "https://secret:password@example.com", "https://github.com.evil.test/user/repo"])("rejects unsafe GitHub provenance %s without throwing", sourceUrl => {
    expect(catalogEntrySchema.safeParse({ ...draft, source: "github", sourceUrl }).success).toBe(false);
  });
  it.each(["https://www.bilibili.com/video/BV1", "https://space.bilibili.com/123", "https://b23.tv/example"])("accepts Bilibili provenance %s", sourceUrl => {
    expect(catalogEntrySchema.safeParse({ ...draft, source: "bilibili", sourceUrl }).success).toBe(true);
  });
  it("requires provenance and rejects forged workflow readiness and unknown execution", () => {
    expect(catalogEntrySchema.safeParse({ ...draft, source: "web" }).success).toBe(false);
    expect(catalogEntrySchema.safeParse({ ...draft, source: "github", sourceUrl: "https://github.com/a/b", workflowId: "resume-website" }).success).toBe(false);
    expect(catalogEntrySchema.safeParse({ ...draft, workflowId: "run-arbitrary-script" }).success).toBe(false);
    expect(catalogEntrySchema.safeParse({ ...draft, category: "career" }).success).toBe(false);
    expect(catalogEntrySchema.safeParse({ ...draft, content: { zh: text, en: { title: "incomplete" } } }).success).toBe(false);
  });
  it("selects English only when complete and falls back to Chinese", () => {
    expect(catalogText(draft, () => "wrong", "title", "en")).toBe(text.title);
    expect(catalogText({ ...draft, content: { zh: text, en: { ...text, title: "English" } } }, () => "wrong", "title", "en")).toBe("English");
    expect(catalogText(draft, () => "wrong", "title", "zh-CN")).toBe(text.title);
  });
  it("drafts preserve public content, publication replaces it, withdrawal prevents builtin resurrection", () => {
    const original = CATALOG_PROJECTS[0]; const managed = { ...draft, slug: original.slug };
    expect(mergeCatalog([original], [{ slug: original.slug, withdrawn: false, published: null }])).toEqual([original]);
    expect(mergeCatalog([original], [{ slug: original.slug, withdrawn: false, published: managed }])).toEqual([managed]);
    expect(mergeCatalog([original], [{ slug: original.slug, withdrawn: true, published: managed }])).toEqual([]);
    expect(mergeCatalog([], [{ slug: draft.slug, withdrawn: false, published: null }])).toEqual([]);
  });
  it("searches managed titles and filters Bilibili references", () => {
    const reference = { ...draft, source: "bilibili" as const, sourceUrl: "https://b23.tv/example" };
    expect(filterCatalogProjects({ query: "中文", source: "bilibili", readiness: "reference" }, entry => catalogText(entry, () => "wrong", "title"), [reference])).toEqual([reference]);
    expect(filterCatalogProjects({ source: "github" }, entry => entry.slug, [reference])).toEqual([]);
  });
  it("explicit empty/scoped admin permissions stay restrictive; legacy permissions remain compatible", () => {
    expect(hasAdminPermission([], "CATALOG_MANAGE")).toBe(false);
    expect(hasAdminPermission(["USERS_MANAGE"], "CATALOG_MANAGE")).toBe(false);
    expect(hasAdminPermission(["CATALOG_MANAGE"], "CATALOG_MANAGE")).toBe(true);
    expect(hasAdminPermission(null, "CATALOG_MANAGE")).toBe(true);
  });
});