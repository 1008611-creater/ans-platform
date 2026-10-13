import { CATALOG_SOURCES } from "@/contracts/catalog-content";
import { filterCatalogProjects, PROJECT_CATEGORIES, type CatalogProject } from "./projects";

export const CATALOG_PAGE_SIZE = 24;
export type CatalogBrowseQuery = { category?: string | string[]; subcategory?: string | string[]; q?: string | string[]; source?: string | string[]; readiness?: string | string[]; page?: string | string[] };
export type CatalogBrowseFilters = { category?: string; subcategory?: string; q: string; source?: string; readiness?: string };

/** Filter the current published snapshot before paging; never supplement it with static picks. */
export function browseCatalog(catalog: readonly CatalogProject[], params: CatalogBrowseQuery, searchableText: (project: CatalogProject) => string) {
  const q = typeof params.q === "string" ? params.q.slice(0, 200) : "";
  const category = PROJECT_CATEGORIES.find(item => item.id === params.category);
  const subcategory = category?.children.find(item => item === params.subcategory);
  const source = CATALOG_SOURCES.find(item => item === params.source);
  const readiness = params.readiness === "ready" || params.readiness === "reference" ? params.readiness : undefined;
  const filters: CatalogBrowseFilters = { category: category?.id, subcategory, q, source, readiness };
  const projects = filterCatalogProjects({ ...filters, query: q }, searchableText, catalog);
  const pages = Math.max(1, Math.ceil(projects.length / CATALOG_PAGE_SIZE));
  const requested = typeof params.page === "string" && /^[1-9]\d{0,8}$/.test(params.page) ? Number(params.page) : 1;
  const page = Math.min(requested, pages);
  return { category, subcategory, filters, total: projects.length, pages, page, projects: projects.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE) };
}

export function catalogBrowseHref(route: "/" | "/explore", filters: CatalogBrowseFilters, updates: Partial<CatalogBrowseFilters> = {}, page = 1) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...updates })) if (value) params.set(key, value);
  if (page > 1) params.set("page", String(page));
  return `${route}${params.size ? `?${params}` : ""}#${route === "/" ? "home-projects-title" : "project-results"}`;
}
