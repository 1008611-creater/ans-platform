import { describe, expect, it } from "vitest";
import { HUBS, getHub, hubProjects, hubWorkflowRecipes, getWorkflowHubMembership } from "@/domain/hubs/registry";
import { CATALOG_PROJECTS } from "@/domain/catalog/projects";
import { PRIMARY_NAVIGATION, isPrimaryNavigationActive } from "@/domain/navigation/primary";

describe("explicit real Hub associations", () => {
  it("keeps four real categories and one explicit university, with no generic school inference", () => {
    expect(HUBS.map(hub => hub.slug)).toEqual(["cauhub", "vibehub", "aigc", "full-stack"]);
    const cau = getHub("cauhub")!;
    expect(cau.organization.university?.id).toBe("china-agricultural-university");
    expect(cau.projectSlugs).toEqual([]);
    expect(cau.workflowRecipeIds).toEqual([]);
    expect(cau.resources.map(resource => resource.href)).toEqual(["/competitions/agrihackathon"]);
    expect(getWorkflowHubMembership("resume-website")).toEqual(["full-stack"]);
    expect(getHub("made-up-university")).toBeUndefined();
  });
  it("lists published projects only and respects withdrawals rather than resurrecting static cards", () => {
    const hub = getHub("full-stack")!;
    const published = CATALOG_PROJECTS.filter(project => project.slug !== "liu-resume");
    expect(hubProjects(hub, published).some(project => project.slug === "liu-resume")).toBe(false);
    expect(hubProjects(hub, []).length).toBe(0);
    for (const item of hubProjects(hub, CATALOG_PROJECTS)) expect(hub.projectSlugs).toContain(item.slug);
  });
  it("distinguishes existing knowledge and hosted tools from executable recipes", () => {
    expect(getHub("vibehub")!.resources[0].href).toBe("/vibe-hub");
    const aigc = getHub("aigc")!;
    expect(aigc.workflowRecipeIds).toEqual([]);
    // Toonflow (an external site) and Hypit (org-only) were withdrawn with their market cards.
    expect(aigc.resources).toEqual([]);
    for (const hub of HUBS) for (const slug of hub.projectSlugs) expect(CATALOG_PROJECTS.some(project => project.slug === slug), slug).toBe(true);
  });
});
describe("unified finite primary navigation", () => {
  it("keeps the six requested destinations without a standalone workflow directory", () => {
    expect(PRIMARY_NAVIGATION.map(item => item.href)).toEqual(["/explore", "/hubs", "/community", "/competitions", "/market", "/workspace"]);
  });
  it.each(["/workflows", "/workflows/hypit"])("does not highlight retired public navigation for %s", path => {
    expect(PRIMARY_NAVIGATION.filter(item => isPrimaryNavigationActive(item.id, path))).toEqual([]);
  });
  it.each([
    ["hubs", "/hubs/cauhub"], ["hubs", "/vibe-hub"], ["community", "/community/members"],
    ["competitions", "/competitions/agrihackathon"], ["workspace", "/workspace/credits"],
    ["workspace", "/projects/private/website"], ["workspace", "/teams/example"],
  ] as const)("highlights the restored %s destination on nested routes", (id, path) => {
    expect(PRIMARY_NAVIGATION.filter(item => isPrimaryNavigationActive(item.id, path)).map(item => item.id)).toEqual([id]);
    expect(isPrimaryNavigationActive(id, `${PRIMARY_NAVIGATION.find(item => item.id === id)!.href}-unrelated`)).toBe(false);
  });
  it("matches route boundaries and the home page", () => {
    expect(isPrimaryNavigationActive("market", "/market/resume-website")).toBe(true);
    expect(isPrimaryNavigationActive("market", "/marketplace")).toBe(false);
    expect(isPrimaryNavigationActive("explore", "/explore/liu-resume")).toBe(true);
    expect(isPrimaryNavigationActive("explore", "/")).toBe(true);
  });
});

describe("published executable Hub counts", () => {
  it("does not count configured recipes which are no longer attested", () => {
    const hub = getHub("full-stack")!;
    expect(hubWorkflowRecipes(hub, [])).toEqual([]);
    expect(hubWorkflowRecipes(hub, ["resume-website"])).toEqual(["resume-website"]);
  });
  it("keeps an unknown read distinct from a confirmed empty publication", () => {
    expect(hubWorkflowRecipes(getHub("full-stack")!, null)).toBeNull();
    expect(hubWorkflowRecipes(getHub("cauhub")!, null)).toEqual([]);
  });
});
