import type { CatalogProject } from "./projects";

/** Select only from the current published snapshot; never revive a withdrawn pick. */
export function homepageProjects(catalog: readonly CatalogProject[]) {
  const hero = catalog.find(project => project.slug === "image2-library") ?? catalog.find(project => Boolean(project.coverUrl)) ?? catalog[0];
  const preferred = ["liu-resume", "vibephoto", "infinite-canvas", "hello-algo", "remotion-video", "excalidraw"];
  const remaining = catalog.filter(project => project.slug !== hero?.slug);
  const ordered = [...preferred.flatMap(slug => remaining.filter(project => project.slug === slug)),
    ...remaining.filter(project => !preferred.includes(project.slug))];
  const showcase = [hero, ...ordered].filter((project): project is CatalogProject => Boolean(project?.coverUrl)).slice(0, 7);
  return { hero, projects: [hero, ...ordered].filter((project): project is CatalogProject => Boolean(project)), showcase };
}
