import { z } from "zod";

export const RESUME_WEBSITE_WORKFLOW_ID = "resume-website" as const;
export const RESUME_WEBSITE_RECIPE_VERSION = 1;
export const RESUME_WEBSITE_TEMPLATE_VERSION = 1;
export const RESUME_WEBSITE_COST_POINTS = 2;

const webUrl = z.string().trim().max(500).refine((value) => {
  if (!value) return true;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
});
const entry = z.object({
  name: z.string().trim().min(1).max(100),
  role: z.string().trim().max(100),
  description: z.string().trim().min(1).max(2000),
  url: webUrl,
}).strict();

export const resumeWebsiteInputSchema = z.object({
  fullName: z.string().trim().min(1).max(80),
  headline: z.string().trim().min(1).max(120),
  about: z.string().trim().min(1).max(3000),
  location: z.string().trim().max(100),
  email: z.union([z.literal(""), z.email().max(254)]),
  contactUrl: webUrl,
  education: z.string().trim().max(1500),
  skills: z.array(z.string().trim().min(1).max(80)).max(20),
  projects: z.array(entry).min(1).max(6),
  style: z.enum(["editorial", "minimal"]),
  accent: z.enum(["emerald", "violet", "orange"]),
  language: z.enum(["zh", "en"]),
}).strict();

export const resumeWebsiteSaveSchema = z.object({
  expectedRevision: z.number().int().min(0),
  input: resumeWebsiteInputSchema,
}).strict();
export const resumeWebsiteRunSchema = z.object({
  revision: z.number().int().positive(),
  acknowledged: z.literal(true),
  idempotencyKey: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/),
}).strict();
export const resumeWebsiteCopySchema = z.object({
  summary: z.string().trim().min(1).max(3000),
  projects: z.array(z.object({ description: z.string().trim().min(1).max(2000) }).strict()).min(1).max(6),
}).strict();
export const resumeWebsiteEditSchema = z.object({
  baseVersionId: z.string().min(1).max(100),
  expectedVersion: z.number().int().positive(),
  copy: resumeWebsiteCopySchema,
}).strict();
export const resumeWebsiteSnapshotSchema = z.object({
  recipeVersion: z.literal(1),
  templateVersion: z.literal(1),
  inputRevision: z.number().int().positive(),
  input: resumeWebsiteInputSchema,
  copy: resumeWebsiteCopySchema,
  editKind: z.enum(["generated", "manual"]),
  sourceWorkflowRunId: z.string().nullable(),
}).strict();

export type ResumeWebsiteInput = z.infer<typeof resumeWebsiteInputSchema>;
export type ResumeWebsiteCopy = z.infer<typeof resumeWebsiteCopySchema>;
export type ResumeWebsiteSnapshot = z.infer<typeof resumeWebsiteSnapshotSchema>;
export type ResumeWebsiteState = {
  projectId: string;
  title: string;
  archived: boolean;
  revision: number;
  input: ResumeWebsiteInput | null;
  runs: Array<{ id: string; status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED"; costPoints: number; createdAt: string; finishedAt: string | null; requestKey: string | null }>;
  versions: Array<{ id: string; version: number; createdAt: string; snapshot: ResumeWebsiteSnapshot }>;
};
