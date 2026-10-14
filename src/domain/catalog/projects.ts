import { REAL_CATALOG_PROJECTS } from "./real-projects";
import { CURATED_CATALOG_PROJECTS } from "./curated-projects";
import type { CatalogWorkflowId } from "@/contracts/catalog";
import type { ProjectGoal } from "@/contracts/projects";

// Public recipes are distinct from private member Project records.
export { PROJECT_CATEGORIES } from "@/contracts/catalog-content";
import { PROJECT_CATEGORIES, CATALOG_SOURCES, type CatalogEntry } from "@/contracts/catalog-content";

type CatalogProjectBase = {
  slug: string;
  category: typeof PROJECT_CATEGORIES[number]["id"];
  subcategory: string;
  goal: ProjectGoal;
  preview: "document" | "code" | "plan" | "character" | "site" | "video" | "agent";
};

export type CatalogProject = CatalogProjectBase & { source: CatalogEntry["source"]; sourceUrl?: string; licenseUrl?: string; workflowId?: CatalogWorkflowId; content?: CatalogEntry["content"]; discoveryUrl?: string; coverUrl?: string; coverNote?: string; memberHref?: string; creator?: string };

export const WORKFLOW_RECIPES: readonly CatalogProject[] = [
  { slug: "resume-website", category: "career", subcategory: "portfolio", goal: "portfolio", workflowId: "resume-website", source: "official", preview: "site" },
  { slug: "resume-story", category: "career", subcategory: "resume", goal: "career", workflowId: "resume-bullets", source: "official", preview: "document" },
  { slug: "project-page", category: "career", subcategory: "portfolio", goal: "portfolio", workflowId: "project-one-pager", source: "official", preview: "document" },
  { slug: "readme-kit", category: "web", subcategory: "documentation", goal: "portfolio", workflowId: "readme-draft", source: "official", preview: "code" },
  { slug: "competition-starter", category: "competition", subcategory: "proposal", goal: "contest", workflowId: "contest-mvp", source: "official", preview: "plan" },
  { slug: "pitch-kit", category: "business", subcategory: "validation", goal: "contest", workflowId: "pitch-outline", source: "official", preview: "plan" },
  { slug: "learning-retrospective", category: "learning", subcategory: "methods", goal: "portfolio", workflowId: "project-retrospective", source: "official", preview: "document" },
];

export const CATALOG_PROJECTS: readonly CatalogProject[] = [...REAL_CATALOG_PROJECTS, ...CURATED_CATALOG_PROJECTS];

export const FEATURED_PROJECT_SLUGS = ["liu-resume", "image2-library", "vibephoto"] as const;

export function getCatalogProject(slug: string) {
  return CATALOG_PROJECTS.find((project) => project.slug === slug);
}

export function projectStartHref(project: CatalogProject): string | undefined {
  if (!project.workflowId) return undefined;
  return `/projects?goal=${project.goal}&workflow=${project.workflowId}#new-project`;
}

export function filterCatalogProjects(
  filters: { category?: string; subcategory?: string; query?: string; source?: string; readiness?: string },
  searchableText: (project: CatalogProject) => string,
  catalog: readonly CatalogProject[] = CATALOG_PROJECTS,
) {
  const category = PROJECT_CATEGORIES.find((item) => item.id === filters.category);
  const subcategory = category?.children.find((item) => item === filters.subcategory);
  const query = filters.query?.trim().normalize("NFKC").toLocaleLowerCase() ?? "";
  const source = CATALOG_SOURCES.find((item) => item === filters.source);
  const readiness = filters.readiness === "ready" || filters.readiness === "reference" ? filters.readiness : undefined;
  return catalog.filter((project) =>
    (!category || project.category === category.id) &&
    (!subcategory || project.subcategory === subcategory) &&
    (!source || project.source === source) &&
    (!readiness || Boolean(project.workflowId) === (readiness === "ready")) &&
    (!query || searchableText(project).normalize("NFKC").toLocaleLowerCase().includes(query)),
  );
}
