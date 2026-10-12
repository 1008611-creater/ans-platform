import { expect, it } from "vitest";
import { homepageProjects } from "@/domain/catalog/homepage";
import { CATALOG_PROJECTS } from "@/domain/catalog/projects";
it("uses only current published choices without repeating the hero in recommendations", () => {
  const selected = homepageProjects(CATALOG_PROJECTS);
  expect(selected.hero?.slug).toBe("image2-library");
  expect(selected.featured).toHaveLength(3);
  expect(selected.featured.some(project => project.slug === selected.hero?.slug)).toBe(false);
});
it("never resurrects withdrawn featured entries and falls back to remaining published projects", () => {
  const live = CATALOG_PROJECTS.filter(project => !["image2-library", "liu-resume", "vibephoto"].includes(project.slug));
  const selected = homepageProjects(live);
  expect(selected.hero).toBe(live.find(project => Boolean(project.coverUrl)));
  expect(selected.featured.every(project => live.includes(project))).toBe(true);
  expect(new Set(selected.featured.map(project => project.slug)).size).toBe(selected.featured.length);
});
it("handles an empty or single-project public catalog without fake fallback entries", () => {
  expect(homepageProjects([])).toEqual({ hero: undefined, featured: [], showcase: [] });
  expect(homepageProjects([CATALOG_PROJECTS[0]])).toEqual({ hero: CATALOG_PROJECTS[0], featured: [], showcase: CATALOG_PROJECTS[0].coverUrl ? [CATALOG_PROJECTS[0]] : [] });
});

it("bounds showcase covers to seven entries from the published snapshot", () => {
  const live = CATALOG_PROJECTS.filter(project => project.slug !== "image2-library");
  const selected = homepageProjects(live);
  expect(selected.showcase.length).toBeLessThanOrEqual(7);
  expect(selected.showcase.every(project => live.includes(project) && Boolean(project.coverUrl))).toBe(true);
  expect(new Set(selected.showcase.map(project => project.slug)).size).toBe(selected.showcase.length);
});
