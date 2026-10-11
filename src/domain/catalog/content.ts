import type { CatalogEntry, CatalogTextField } from "@/contracts/catalog-content";
import type { CatalogProject } from "./projects";

export function catalogSourceLabel(source: CatalogEntry["source"]) {
  return { official: "official", github: "githubSource", bilibili: "bilibiliSource", web: "webSource" }[source];
}
export function catalogText(project: CatalogProject, translate: (key: string) => string, field: CatalogTextField, locale = "zh"): string {
  if (project.content) return (locale.startsWith("zh") ? project.content.zh : project.content.en ?? project.content.zh)[field];
  return translate(`projects.${project.slug}.${field}`);
}
export function mergeCatalog(builtins: readonly CatalogProject[], managed: readonly { slug: string; withdrawn: boolean; published: CatalogEntry | null }[]): CatalogProject[] {
  const entries = new Map(builtins.map((item) => [item.slug, item]));
  for (const row of managed) {
    if (row.withdrawn) entries.delete(row.slug);
    else if (row.published) entries.set(row.slug, row.published);
  }
  return [...entries.values()];
}