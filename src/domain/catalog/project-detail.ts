import type { CatalogProject } from "./projects";
import { PROJECT_GUIDES } from "./project-guides";
import { FOUNDER_PROJECT_GUIDES } from "./founder-project-guides";

export function getProjectGuide(project: CatalogProject) {
  return [...FOUNDER_PROJECT_GUIDES, ...PROJECT_GUIDES].find(
    guide => guide.slug === project.slug && guide.sourceUrl === project.sourceUrl,
  );
}

export function relatedCatalogProjects(project: CatalogProject, catalog: readonly CatalogProject[], limit = 3) {
  return catalog
    .filter(item => item.slug !== project.slug && item.category === project.category)
    .map((item, index) => ({ item, index, score: item.subcategory === project.subcategory ? 1 : 0 }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ item }) => item);
}
