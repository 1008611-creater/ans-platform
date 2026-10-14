import index from "@/data/vibehub/courses/index.json";
export const courseIds = ["product-website", "git-workflow"] as const;
export type CourseId = typeof courseIds[number];
const titles: Record<string, string> = {
 "01-page-structure": "Page structure", "02-visual-direction": "Visual direction", "03-hero-cta": "Hero and actions", "04-content-structure": "Content and layout", "05-evidence-pricing-faq": "Evidence, pricing and FAQs", "06-layout-surface": "Spacing and layers", "07-form-and-interaction": "Forms and interactions", "08-responsive": "Mobile layouts", "09-delivery-and-agent": "Delivery and iteration",
 "01-working-tree-and-commit": "Working tree and commits", "02-diff-and-gitignore": "Diffs and ignored files", "03-branch-and-head": "Branches and HEAD", "04-merge-and-conflicts": "Merges and conflicts", "05-remote-and-collaboration": "Remote collaboration", "06-restore-and-stash": "Restore and stash",
};
export function courseChapters(course: string) { return index.filter(item => item.course === course).sort((a,b) => a.order-b.order); }
export function chapterTitle(chapter: {id: string; title: string}, lang: "en" | "zh") { return lang === "en" ? titles[chapter.id] || chapter.title : chapter.title; }
export function practiceHref(lang: string, course?: string, chapter?: string) { return `/vibe-hub/practice?${new URLSearchParams({lang,...(course ? {course} : {}),...(chapter ? {chapter} : {})})}`; }
