import { expect, it } from "vitest";
import { browseCatalog, catalogBrowseHref, CATALOG_PAGE_SIZE } from "@/domain/catalog/browse";
import { CATALOG_PROJECTS } from "@/domain/catalog/projects";
const text = (project: typeof CATALOG_PROJECTS[number]) => `${project.slug} ${project.category}`;

it("makes the entire published catalog reachable across pages without duplicates", () => {
  const first = browseCatalog(CATALOG_PROJECTS, {}, text);
  const all = Array.from({ length: first.pages }, (_, index) => browseCatalog(CATALOG_PROJECTS, { page: String(index + 1) }, text).projects).flat();
  expect(first.projects.length).toBeLessThanOrEqual(CATALOG_PAGE_SIZE);
  expect(all).toEqual(CATALOG_PROJECTS);
  expect(new Set(all.map(project => project.slug)).size).toBe(CATALOG_PROJECTS.length);
});
it("filters before paging and never refills withdrawn projects", () => {
  const live = CATALOG_PROJECTS.filter(project => project.slug !== "liu-resume");
  const result = browseCatalog(live, { category: "aigc", page: "999" }, text);
  expect(result.total).toBe(live.filter(project => project.category === "aigc").length);
  expect(result.projects.every(project => project.category === "aigc" && live.includes(project))).toBe(true);
  expect(result.page).toBe(result.pages);
});
it("normalizes malformed filters/pages and bounds search input", () => {
  for (const page of ["-1", "1e3", "1.5", "999999999999", ["2", "3"]]) expect(browseCatalog(CATALOG_PROJECTS, { page }, text).page).toBe(1);
  const result = browseCatalog([], { category: "unknown", subcategory: "unknown", source: "unknown", readiness: "unknown", q: "x".repeat(300) }, text);
  expect(result.filters.q).toHaveLength(200);
  expect(result.category).toBeUndefined();
  expect(result.projects).toEqual([]);
  expect(result.page).toBe(1);
});
it("preserves filters between pages and resets the page when choosing a category", () => {
  const filters = { category: "web", q: "hello world", source: "github" };
  expect(catalogBrowseHref("/", filters, {}, 2)).toBe("/?category=web&q=hello+world&source=github&page=2#home-projects-title");
  expect(catalogBrowseHref("/explore", filters, { category: "aigc" })).toBe("/explore?category=aigc&q=hello+world&source=github#project-results");
});
