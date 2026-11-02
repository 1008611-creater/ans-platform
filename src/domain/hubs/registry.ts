import { RESUME_WEBSITE_WORKFLOW_ID } from "@/contracts/resume-website";
import type { CatalogWorkflowId } from "@/contracts/catalog";
import type { CatalogProject } from "@/domain/catalog/projects";

export const HUB_SLUGS = ["cauhub", "vibehub", "aigc", "full-stack"] as const;
export type HubSlug = typeof HUB_SLUGS[number];
export type HubOrganization = Readonly<{ id: string; type: "university" | "topic" | "knowledge"; nameKey: string; university?: { id: string; nameKey: string } }>;
export type HubResource = Readonly<{ id: string; href: string; kind: "knowledge" | "event" | "hosted-tool"; titleKey: string; descriptionKey: string }>;
export type HubDefinition = Readonly<{ slug: HubSlug; organization: HubOrganization; projectSlugs: readonly string[]; workflowRecipeIds: readonly CatalogWorkflowId[]; resources: readonly HubResource[] }>;

/** Membership is curated explicitly. A title or keyword never associates work with a university. */
export const HUBS: readonly HubDefinition[] = [
  { slug: "cauhub", organization: { id: "cauhub", type: "university", nameKey: "organizations.cauhub", university: { id: "china-agricultural-university", nameKey: "organizations.cau" } }, projectSlugs: [], workflowRecipeIds: [], resources: [
    { id: "agrihackathon", href: "/competitions/agrihackathon", kind: "event", titleKey: "resources.agrihackathon.title", descriptionKey: "resources.agrihackathon.description" },
  ] },
  { slug: "vibehub", organization: { id: "ans-vibehub", type: "knowledge", nameKey: "organizations.vibehub" }, projectSlugs: [], workflowRecipeIds: [], resources: [
    { id: "vibehub-knowledge", href: "/vibe-hub", kind: "knowledge", titleKey: "resources.vibehub.title", descriptionKey: "resources.vibehub.description" },
  ] },
  { slug: "aigc", organization: { id: "ans-aigc", type: "topic", nameKey: "organizations.aigc" }, projectSlugs: ["image2-library", "vibephoto", "infinite-canvas", "ai-video-services", "remotion-video", "comfyui", "pyvideotrans", "video2x"], workflowRecipeIds: [], resources: [] },
  { slug: "full-stack", organization: { id: "ans-full-stack", type: "topic", nameKey: "organizations.fullStack" }, projectSlugs: ["liu-resume", "hello-algo", "build-your-own-x", "freecodecamp", "python-algorithms", "reactive-resume", "magic-resume", "vcard-portfolio", "react-interview", "hugo-site", "docsify", "astro-starlight", "code2prompt", "saleor-commerce", "plausible-analytics", "plane-projects"], workflowRecipeIds: [RESUME_WEBSITE_WORKFLOW_ID], resources: [] },
];
export function getHub(slug: string) { return HUBS.find(hub => hub.slug === slug); }
export function hubProjects(hub: HubDefinition, published: readonly CatalogProject[]) {
  const bySlug = new Map(published.map(project => [project.slug, project]));
  return hub.projectSlugs.flatMap(slug => { const project = bySlug.get(slug); return project ? [project] : []; });
}
/**
 * A Hub whose only content is one entry is a detour: send visitors straight to
 * that entry. Member workflows can still be attached later; once a Hub has any,
 * pass their count and its own page comes back.
 */
export function hubShortcut(hub: HubDefinition, memberWorkflowCount: number | null | undefined): string | null {
  if (memberWorkflowCount || hub.projectSlugs.length || hub.workflowRecipeIds.length || hub.resources.length !== 1) return null;
  return hub.resources[0].href;
}
export function getWorkflowHubMembership(workflowId: CatalogWorkflowId): HubSlug[] {
  return HUBS.filter(hub => hub.workflowRecipeIds.includes(workflowId)).map(hub => hub.slug);
}

/** Counts describe currently attested executable recipes, not configured intentions. */
export function hubWorkflowRecipes(hub: HubDefinition, publishedRecipeIds: readonly CatalogWorkflowId[] | null): readonly CatalogWorkflowId[] | null {
  if (!hub.workflowRecipeIds.length) return [];
  if (publishedRecipeIds === null) return null;
  const published = new Set(publishedRecipeIds);
  return hub.workflowRecipeIds.filter(id => published.has(id));
}
