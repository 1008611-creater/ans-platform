import { describe, expect, it } from "vitest";
import { CATALOG_PROJECTS, FEATURED_PROJECT_SLUGS, PROJECT_CATEGORIES, filterCatalogProjects, projectStartHref } from "@/domain/catalog/projects";
import { resolveProjectSelection, studioSelectionHref } from "@/domain/catalog/selection";
import { catalogWorkflowIdSchema } from "@/contracts/catalog";
import zh from "../../../messages/product/zh.json";
import en from "../../../messages/product/en.json";

function keys(value: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, item]) => item && typeof item === "object" ? keys(item as Record<string, unknown>, `${prefix}${key}.`) : [`${prefix}${key}`]).sort();
}

describe("public project catalog", () => {
  it("every card has a valid category, translated recipe and honest executable state", () => {
    expect(new Set(CATALOG_PROJECTS.map((project) => project.slug)).size).toBe(CATALOG_PROJECTS.length);
    for (const project of CATALOG_PROJECTS) {
      const category = PROJECT_CATEGORIES.find((item) => item.id === project.category)!;
      expect([...category.children]).toContain(project.subcategory);
      expect(zh.projects).toHaveProperty(project.slug);
      if (project.workflowId) expect(catalogWorkflowIdSchema.safeParse(project.workflowId).success).toBe(true);
      else expect(projectStartHref(project)).toBeUndefined();
    }
  });
  it("narrows categories and topics, searches normalized text, returns real empty states", () => {
    expect(filterCatalogProjects({ category: "career", subcategory: "resume" }, (p) => p.slug).map((p) => p.slug)).toEqual(["resume-story", "open-resume"]);
    expect(filterCatalogProjects({ category: "aigc" }, (p) => p.slug).map((p) => p.slug)).toEqual(["remotion-video"]);
    expect(filterCatalogProjects({ query: "ＲＥＡＤＭＥ" }, (p) => p.slug).map((p) => p.slug)).toEqual(["readme-kit"]);
    expect(filterCatalogProjects({ category: "unknown", subcategory: "resume" }, (p) => p.slug)).toHaveLength(CATALOG_PROJECTS.length);
    expect(filterCatalogProjects({ query: "no-such-project" }, (p) => p.slug)).toEqual([]);
  });
  it("combines source and readiness with category and search", () => {
    expect(filterCatalogProjects({ category: "career", source: "github", readiness: "reference" }, (p) => p.slug).map((p) => p.slug)).toEqual(["open-resume"]);
    expect(filterCatalogProjects({ source: "official", readiness: "reference" }, (p) => p.slug)).toEqual([]);
    expect(filterCatalogProjects({ source: "github", readiness: "ready" }, (p) => p.slug)).toEqual([]);
    expect(filterCatalogProjects({ readiness: "ready", query: "resume" }, (p) => p.slug).map((p) => p.slug)).toEqual(["resume-website", "resume-story"]);
    expect(filterCatalogProjects({ source: "invalid", readiness: "invalid" }, (p) => p.slug)).toHaveLength(CATALOG_PROJECTS.length);
  });
  it("keeps reference provenance and featured choices valid", () => {
    for (const project of CATALOG_PROJECTS) {
      if (project.source !== "github") continue;
      expect(project.sourceUrl).toBeTruthy();
      const source = new URL(project.sourceUrl!);
      expect(source.protocol).toBe("https:");
      expect(source.hostname).toBe("github.com");
      expect(zh.projects).toHaveProperty(`${project.slug}.sourceNote`);
      expect(zh.projects).toHaveProperty(`${project.slug}.model`);
      expect(zh.projects).toHaveProperty(`${project.slug}.skill`);
      if (project.licenseUrl) expect(new URL(project.licenseUrl).pathname).toContain(source.pathname);
    }
    expect(FEATURED_PROJECT_SLUGS.every((slug) => CATALOG_PROJECTS.some((project) => project.slug === slug))).toBe(true);
    expect(new Set(FEATURED_PROJECT_SLUGS.map((slug) => CATALOG_PROJECTS.find((project) => project.slug === slug)?.category)).size).toBe(3);
  });
  it("preserves each runnable recipe through sign-in and studio navigation", () => {
    for (const project of CATALOG_PROJECTS.filter((item) => item.workflowId)) {
      const link = new URL(projectStartHref(project)!, "https://ans.test");
      const selection = resolveProjectSelection(Object.fromEntries(link.searchParams));
      expect(selection.workflowId).toBe(project.workflowId);
      expect(selection.goal).toBe(project.goal);
      expect(selection.callbackPath).toBe(link.pathname + link.search + link.hash);
      expect(studioSelectionHref("my-project", selection.workflowId)).toBe(project.workflowId === "resume-website" ? "/projects/my-project/website" : `/projects/my-project?workflow=${project.workflowId}#selected-workflow`);
    }
  });
  it("never forwards arbitrary targets or invalid workflows to login or studio", () => {
    const selection = resolveProjectSelection({ goal: "//evil.test", workflow: "javascript:alert(1)" });
    expect(selection).toEqual({ goal: "career", workflowId: undefined, callbackPath: "/projects#new-project" });
    expect(studioSelectionHref("my-project", "//evil.test")).toBe("/projects/my-project");
    expect(resolveProjectSelection({ goal: ["contest", "career"], workflow: ["pitch-outline", "x"] }).workflowId).toBe("pitch-outline");
  });
  it("ships matching Chinese and English keys", () => {
    expect(keys(zh)).toEqual(keys(en));
    for (const category of PROJECT_CATEGORIES) {
      expect(zh.categories).toHaveProperty(category.id);
      category.children.forEach((child) => expect(zh.children).toHaveProperty(child));
    }
  });
});
