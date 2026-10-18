export const GUIDE_TASKS = [
  "website",
  "ui-design",
  "skill-product",
  "media-pipeline",
  "agent-team",
  "creative",
  "open-source",
  "brief",
  "evidence",
  "cost",
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

export function guideHref(lang: "zh" | "en", options: { task?: string; topic?: string; step?: string; legacyPractice?: string } = {}) {
  const params = new URLSearchParams();
  if (options.topic) params.set("topic", options.topic);
  else if (options.task && options.task !== "website") params.set("task", options.task);
  if (options.step) params.set("step", options.step);
  else if (options.legacyPractice) params.set("legacyPractice", options.legacyPractice);
  params.set("lang", lang);
  return `/vibe-hub/guides?${params.toString()}`;
}

