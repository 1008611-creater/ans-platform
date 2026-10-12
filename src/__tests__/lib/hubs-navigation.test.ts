import { describe, expect, it } from "vitest";
import { HUBS, getHub, hubProjects, getWorkflowHubMembership } from "@/domain/hubs/registry";
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
    expect(aigc.resources.map(resource => resource.kind)).toEqual(["hosted-tool", "hosted-tool"]);
    for (const hub of HUBS) for (const slug of hub.projectSlugs) expect(CATALOG_PROJECTS.some(project => project.slug === slug), slug).toBe(true);
  });
});
describe("unified finite primary navigation", () => {
  it("has exactly six canonical destinations", () => {
    expect(PRIMARY_NAVIGATION.map(item => item.href)).toEqual(["/explore", "/hubs", "/community", "/competitions", "/market", "/workspace"]);
  });
  it.each(["/hubs", "/hubs/cauhub", "/workflows", "/workflows/hypit", "/vibe-hub", "/vibe-hub/learn"])("marks %s under Hub", path => {
    expect(PRIMARY_NAVIGATION.filter(item => isPrimaryNavigationActive(item.id, path)).map(item => item.id)).toEqual(["hubs"]);
  });
  it("matches boundaries and private workspace projects without swallowing lookalikes", () => {
    expect(isPrimaryNavigationActive("hubs", "/hubs-not-a-route")).toBe(false);
    expect(isPrimaryNavigationActive("workspace", "/projects/project-a/website")).toBe(true);
    expect(isPrimaryNavigationActive("workspace", "/workspace/credits")).toBe(true);
    expect(isPrimaryNavigationActive("explore", "/")).toBe(true);
  });
});
