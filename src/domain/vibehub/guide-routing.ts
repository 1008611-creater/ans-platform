export const GUIDE_TASKS = [
  "website",
  "ui-design",
  "skill-product",
  "media-pipeline",
  "agent-team",
  "creative",
  "open-source",
  "github",
  "brief",
  "evidence",
  "competition",
  "cost",
  "account",
] as const;
export type GuideTask = typeof GUIDE_TASKS[number];

const PATH_TASKS: Record<string, GuideTask> = {
  "ans-first-website": "website",
  "ans-ui-design": "ui-design",
  "ans-skill-product": "skill-product",
  "ans-media-pipeline": "media-pipeline",
  "ans-agent-team": "agent-team",
  "ans-creative-delivery": "creative",
  "ans-open-source": "open-source",
};

const PRACTICE_SELECTIONS: Record<string, { task: GuideTask; step?: string }> = {
  "clear-brief": { task: "brief" },
  portfolio: { task: "website" },
  "ui-design-workflow": { task: "ui-design" },
  "skill-as-product": { task: "skill-product" },
  "media-content-flywheel": { task: "media-pipeline" },
  "agent-team-and-cost": { task: "agent-team" },
  "creative-production": { task: "creative" },
  "github-to-project": { task: "open-source" },
  "competition-evidence": { task: "evidence" },
  "account-and-cost": { task: "cost" },
};

export function guideTaskForPath(id: string): GuideTask | undefined {
  return PATH_TASKS[id];
}

export function guideSelectionForPractice(slug: string): { task: GuideTask; step?: string } | undefined {
  return PRACTICE_SELECTIONS[slug];
}

export function legacyPracticeStep(slug: string, fragment: string) {
  const selection = guideSelectionForPractice(slug);
  const match = /^step-([1-3])$/.exec(fragment);
  if (!selection || !match) return undefined;
  const steps: Partial<Record<GuideTask, readonly string[]>> = {
    website: ["content", "interface", "delivery"],
    "ui-design": ["references", "components", "polish"],
    "skill-product": ["split", "preview", "eval"],
    "media-pipeline": ["roughcut", "packaging", "repurpose"],
    "agent-team": ["worktree", "verify", "ship"],
    creative: ["facts", "assets", "shots"],
    "open-source": ["source", "roles", "handoff"],
    github: ["source", "roles", "handoff"],
  };
  return steps[selection.task]?.[Number(match[1]) - 1] || fragment;
}

export function guideHref(lang: string, options: { task?: string; topic?: string; step?: string; legacyPractice?: string } = {}) {
  const params = new URLSearchParams();
  if (options.topic) params.set("topic", options.topic);
  else if (options.task && options.task !== "website") params.set("task", options.task);
  if (options.step) params.set("step", options.step);
  else if (options.legacyPractice) params.set("legacyPractice", options.legacyPractice);
  params.set("lang", lang);
  return `/vibe-hub/guides?${params.toString()}`;
}

export function guideResourceHref(href: string, locale: string) {
  const url = new URL(href, "https://ans.local");
  if (url.origin !== "https://ans.local") return href;
  if (url.pathname.startsWith("/vibe-hub/ans/")) {
    const slug = url.pathname.split("/").pop() || "";
    const selection = guideSelectionForPractice(slug);
    if (selection) {
      const step = legacyPracticeStep(slug, url.hash.slice(1));
      return guideHref(locale, { ...selection, ...(step ? { step } : {}) }) + (url.hash === "#request" ? "#request" : "");
    }
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


