export const GUIDE_TASKS = ["website", "creative", "github", "brief", "competition", "account"] as const;
export type GuideTask = typeof GUIDE_TASKS[number];
const paths: Record<string, GuideTask> = { "ans-first-website": "website", "ans-creative-delivery": "creative", "ans-open-source": "github" };
const practices: Record<string, { task: GuideTask; step?: string }> = {
  "portfolio": { task: "website", step: "content" },
  "creative-production": { task: "creative", step: "assets" },
  "github-to-project": { task: "github", step: "source" },
  "clear-brief": { task: "brief" },
  "competition-evidence": { task: "competition" },
  "account-and-cost": { task: "account" },
};
export function guideTaskForPath(id: string) { return paths[id]; }
export function guideSelectionForPractice(slug: string) { return practices[slug]; }
export function guideHref(locale: string, selection: { task?: string; topic?: string; step?: string } = {}) {
  return `/vibe-hub/guides?${new URLSearchParams({ lang: locale, ...Object.fromEntries(Object.entries(selection).filter(([, value]) => value)) })}`;
}
export function guideResourceHref(href: string, locale: string) {
  const url = new URL(href, "https://ans.local");
  if (url.pathname.startsWith("/vibe-hub/ans/")) {
    const selection = guideSelectionForPractice(url.pathname.split("/").pop() || "");
    if (selection) return guideHref(locale, selection);
  }
  if (url.pathname.startsWith("/vibe-hub/journeys/")) {
    const id = url.pathname.split("/").pop() || "";
    const task = guideTaskForPath(id);
    return guideHref(locale, task ? { task } : { topic: id });
  }
  if (["/vibe-hub/ans", "/vibe-hub/journeys"].includes(url.pathname)) return guideHref(locale);
  if (url.pathname === "/vibe-hub/topics") url.pathname = "/vibe-hub";
  if (url.pathname.startsWith("/vibe-hub")) url.searchParams.set("lang", locale);
  return `${url.pathname}${url.search}${url.hash}`;
}
