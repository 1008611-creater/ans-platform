import { z } from "zod";
import { catalogWorkflowIdSchema } from "./catalog";
import { projectGoalSchema } from "./projects";

export const PROJECT_CATEGORIES = [
  { id: "learning", children: ["methods", "notes", "research"] },
  { id: "career", children: ["resume", "portfolio", "interview"] },
  { id: "aigc", children: ["video", "image", "writing"] },
  { id: "web", children: ["personal-site", "documentation", "applications"] },
  { id: "github", children: ["agents", "creative-tools", "automation"] },
  { id: "business", children: ["services", "content", "validation"] },
  { id: "productivity", children: ["knowledge", "automation", "collaboration"] },
  { id: "competition", children: ["proposal", "pitch", "delivery", "agri-wall"] },
] as const;
export const CATALOG_SOURCES = ["official", "github", "bilibili", "web"] as const;
export const CATALOG_TEXT_FIELDS = ["title", "summary", "sample", "output", "inputs", "decisions", "model", "prompt", "skill", "sourceNote"] as const;
export type CatalogTextField = typeof CATALOG_TEXT_FIELDS[number];
const text = z.string().trim().min(1).max(4000);
export const catalogTextSchema = z.object({ title: text.max(100), summary: text.max(600), sample: text.max(1000), output: text, inputs: text, decisions: text, model: text, prompt: text, skill: text, sourceNote: text }).strict();
export type CatalogText = z.infer<typeof catalogTextSchema>;
const publicUrl = z.string().url().max(2000).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}, "HTTPS URL without embedded credentials required");
const relatedSlugs = z.array(z.string().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).max(8).refine(items => new Set(items).size === items.length, "Duplicate association");
export const catalogEntrySchema = z.object({
  slug: z.string().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.enum(["learning", "career", "aigc", "web", "github", "business", "productivity", "competition"]),
  subcategory: z.string().max(80), goal: projectGoalSchema,
  preview: z.enum(["document", "code", "plan", "character", "site", "video", "agent"]),
  source: z.enum(CATALOG_SOURCES), sourceUrl: publicUrl.optional(), licenseUrl: publicUrl.optional(),
  workflowId: catalogWorkflowIdSchema.optional(),
  workflowSlugs: relatedSlugs.optional(), marketSlugs: relatedSlugs.optional(),
  discoveryUrl: publicUrl.optional(), coverUrl: z.union([publicUrl, z.string().regex(/^\/catalog\/(?:[a-z0-9][a-z0-9-]*\/)*[a-z0-9][a-z0-9.-]*\.(?:webp|png|jpg|jpeg|svg)$/)]).optional(), coverNote: text.max(160).optional(),
  content: z.object({ zh: catalogTextSchema, en: catalogTextSchema.optional() }).strict(),
}).strict().superRefine((entry, ctx) => {
  const category = PROJECT_CATEGORIES.find((item) => item.id === entry.category);
  if (!category?.children.some((child) => child === entry.subcategory)) ctx.addIssue({ code: "custom", path: ["subcategory"], message: "Invalid subcategory" });
  if (entry.source !== "official" && (!entry.sourceUrl || entry.workflowId)) ctx.addIssue({ code: "custom", path: ["source"], message: "Reference requires provenance and cannot claim execution" });
  let hostname: string | undefined;
  try { if (entry.sourceUrl) hostname = new URL(entry.sourceUrl).hostname; } catch { /* URL schema reports malformed provenance. */ }
  if (entry.source === "github" && entry.sourceUrl && hostname !== "github.com") ctx.addIssue({ code: "custom", path: ["sourceUrl"], message: "GitHub provenance required" });
  if (entry.source === "bilibili" && entry.sourceUrl && !["bilibili.com", "www.bilibili.com", "space.bilibili.com", "b23.tv"].includes(hostname ?? "")) ctx.addIssue({ code: "custom", path: ["sourceUrl"], message: "Bilibili provenance required" });
});
export type CatalogEntry = z.infer<typeof catalogEntrySchema>;
export const catalogSaveSchema = z.object({ expectedRevision: z.number().int().nonnegative(), entry: catalogEntrySchema }).strict();
export const catalogActionSchema = z.object({ action: z.enum(["publish", "withdraw"]), expectedRevision: z.number().int().positive() }).strict();
export type CatalogAdminEntry = { id: string; slug: string; revision: number; publishedRevision: number | null; withdrawn: boolean; draft: CatalogEntry; published: CatalogEntry | null };