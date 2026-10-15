// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG_TEXT_FIELDS, type CatalogEntry } from "@/contracts/catalog-content";
import { CATALOG_PROJECTS } from "@/domain/catalog/projects";

const database = vi.hoisted(() => ({ $queryRaw: vi.fn(), $transaction: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: database }));
vi.mock("@/server/marketplace/listings", () => ({ listMarketListings: vi.fn(async () => []) }));
import { listPublishedCatalog } from "@/server/catalog/service";

const text = Object.fromEntries(CATALOG_TEXT_FIELDS.map(field => [field, "Published " + field])) as CatalogEntry["content"]["zh"];
const entry: CatalogEntry = { slug: "public-catalog-regression", category: "learning", subcategory: "methods", goal: "career", preview: "document", source: "official", content: { zh: text } };
const row = (changes = {}) => ({ slug: entry.slug, withdrawn: false, publishedRevision: 2, payload: entry, ...changes });
const builtin = CATALOG_PROJECTS.find(project => !["resume-website", "resume-story", "project-page", "readme-kit", "competition-starter", "pitch-kit", "learning-retrospective", "grok-motion-lab", "open-resume", "dify-agent"].includes(project.slug) && project.subcategory !== "agri-wall")!;

beforeEach(() => {
  vi.clearAllMocks();
  database.$queryRaw.mockResolvedValue([]);
});

describe("public catalog snapshot reads", () => {
  it("reads the exact published version in one statement without an interactive transaction", async () => {
    database.$queryRaw.mockResolvedValue([row()]);
    expect(await listPublishedCatalog()).toContainEqual(entry);
    expect(database.$queryRaw).toHaveBeenCalledTimes(1);
    const [strings, ...values] = database.$queryRaw.mock.calls[0];
    const sql = strings.join("");
    expect(values).toEqual([]);
    expect(sql).toContain('LEFT JOIN "catalog_project_versions"');
    expect(sql).toContain('v."projectId" = p."id" AND v."revision" = p."publishedRevision"');
    expect(sql).toContain('p."withdrawn" = false');
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("keeps withdrawn builtins hidden even if their payload is invalid", async () => {
    database.$queryRaw.mockResolvedValue([row({ slug: builtin.slug, withdrawn: true, payload: null })]);
    expect((await listPublishedCatalog()).some(project => project.slug === builtin.slug)).toBe(false);
  });

  it("does not expose an unpublished draft or replace a builtin with it", async () => {
    database.$queryRaw.mockResolvedValue([
      row({ publishedRevision: null, payload: { privateDraft: true } }),
      row({ slug: builtin.slug, publishedRevision: null, payload: { privateDraft: true } }),
    ]);
    const result = await listPublishedCatalog();
    expect(result.some(project => project.slug === entry.slug)).toBe(false);
    expect(result).toContainEqual(builtin);
  });

  it.each([null, { privateDraft: true }])("rejects a missing or invalid published payload instead of resurrecting content", async payload => {
    database.$queryRaw.mockResolvedValue([row({ payload })]);
    await expect(listPublishedCatalog()).rejects.toThrow();
  });

  it("shares only in-flight reads and observes withdrawal on the next read", async () => {
    let resolveRows!: (rows: ReturnType<typeof row>[]) => void;
    database.$queryRaw.mockReturnValueOnce(new Promise(resolve => { resolveRows = resolve; }));
    const first = listPublishedCatalog();
    const concurrent = listPublishedCatalog();
    expect(first).toBe(concurrent);
    resolveRows([row()]);
    expect(await first).toContainEqual(entry);
    database.$queryRaw.mockResolvedValueOnce([row({ withdrawn: true, payload: null })]);
    expect((await listPublishedCatalog()).some(project => project.slug === entry.slug)).toBe(false);
    expect(database.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it("propagates a database failure and clears it for the next request", async () => {
    const error = new Error("database unavailable");
    database.$queryRaw.mockRejectedValueOnce(error);
    await expect(listPublishedCatalog()).rejects.toBe(error);
    database.$queryRaw.mockResolvedValueOnce([row()]);
    expect(await listPublishedCatalog()).toContainEqual(entry);
    expect(database.$queryRaw).toHaveBeenCalledTimes(2);
  });
});
