import type { CatalogProject } from "./projects";

/** Select only from the current published snapshot; never revive a withdrawn pick. */
export function homepageProjects(catalog: readonly CatalogProject[]) {
  const hero = catalog.find(project => project.slug === "image2-library") ?? catalog.find(project => Boolean(project.coverUrl)) ?? catalog[0];
  const preferred = ["ans-3d-showcase", "liu-resume", "magic-resume", "vibephoto", "infinite-canvas", "ai-video-services", "hello-algo", "remotion-video", "excalidraw"];
  const remaining = catalog.filter(project => project.slug !== hero?.slug);
  const ordered = [...preferred.flatMap(slug => remaining.filter(project => project.slug === slug)),
    ...remaining.filter(project => !preferred.includes(project.slug))];
  const showcase = [hero, ...ordered].filter((project): project is CatalogProject => Boolean(project?.coverUrl)).slice(0, 7);
  const allProjects = [hero, ...ordered].filter((project): project is CatalogProject => Boolean(project));
  return { hero, projects: allProjects, showcase };
}

/**
 * Pure route resolver for homepage spotlight cards (ans-code-simplify: no nested inline ternaries in JSX).
 */
export function resolveCatalogShowcaseHref(project: CatalogProject): string {
  if (project.memberHref) return project.memberHref;
  const workflowId = String(project.workflowId ?? "");
  if (workflowId === "resume-website") return "/market/resume-website";
  if (workflowId === "easel") return "/competitions/aigc";
  if (workflowId === "hypit") return "/workflows/hypit";
  if (workflowId === "toonflow") return "https://toonflow.cauai.fun";
  if (project.workflowId) return `/projects?goal=${project.goal}&workflow=${project.workflowId}#new-project`;
  return project.sourceUrl ?? `/explore/${project.slug}`;
}

