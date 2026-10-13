import { expect, it } from "vitest";
import { homepageProjects } from "@/domain/catalog/homepage";
import { CATALOG_PROJECTS } from "@/domain/catalog/projects";

it("keeps every published project in the directory, including the hero", () => {
  const selected = homepageProjects(CATALOG_PROJECTS);
  expect(selected.hero?.slug).toBe("image2-library");
  expect(selected.projects).toHaveLength(CATALOG_PROJECTS.length);
  expect(new Set(selected.projects.map(project => project.slug))).toEqual(new Set(CATALOG_PROJECTS.map(project => project.slug)));
});
it("never resurrects withdrawn picks when ordering the published directory", () => {
  const live = CATALOG_PROJECTS.filter(project => !["image2-library", "liu-resume", "vibephoto"].includes(project.slug));
  const selected = homepageProjects(live);
  expect(selected.hero).toBe(live.find(project => Boolean(project.coverUrl)));
  expect(selected.projects.every(project => live.includes(project))).toBe(true);
  expect(new Set(selected.projects.map(project => project.slug)).size).toBe(selected.projects.length);
});
it("handles an empty or single-project public catalog without fake fallback entries", () => {
  expect(homepageProjects([])).toEqual({ hero: undefined, projects: [], showcase: [] });
  expect(homepageProjects([CATALOG_PROJECTS[0]])).toEqual({ hero: CATALOG_PROJECTS[0], projects: [CATALOG_PROJECTS[0]], showcase: CATALOG_PROJECTS[0].coverUrl ? [CATALOG_PROJECTS[0]] : [] });
});
it("bounds the hero showcase separately from the complete directory", () => {
  const live = CATALOG_PROJECTS.filter(project => project.slug !== "image2-library");
  const selected = homepageProjects(live);
  expect(selected.showcase.length).toBeLessThanOrEqual(7);
  expect(selected.showcase.every(project => live.includes(project) && Boolean(project.coverUrl))).toBe(true);
  expect(new Set(selected.showcase.map(project => project.slug)).size).toBe(selected.showcase.length);
  expect(selected.projects).toHaveLength(live.length);
});
