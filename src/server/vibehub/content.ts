import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

export type VibeLanguage = "en" | "zh";
export type SourcePage = { name?: string; title?: string; description?: string; quote?: string; agentPrompt?: string; markdown?: string; html: string; sourceUrl: string };
export type FlowLesson = { steps: { id: string; label: string; owner: string; detail: string; focused: boolean }[]; practice?: { title: string; options: { label: string; feedback: string; correct: boolean }[] }; agentPrompt?: string };
export type Lesson = {
  id: string; title: string; secondaryTitle?: string; tagline?: string; description?: string; category?: string;
  agentPrompt?: string; flowLesson?: FlowLesson | null;
  lessonPractice?: { title: string; options: { label: string; feedback: string; correct: boolean }[] } | null;
  references?: { title: string; source?: string; url: string }[];
};
export type AgentEnvelope<T> = { schemaVersion: string; revision: string; data: T };

const directory = path.join(process.cwd(), "src/data/vibehub");

export const readVibeData = cache(async <T,>(relativePath: string): Promise<T | null> => {
  if (!/^[a-zA-Z0-9_./-]+$/.test(relativePath) || relativePath.includes("..")) return null;
  try { return JSON.parse(await readFile(path.join(directory, relativePath), "utf8")) as T; }
  catch { return null; }
});

export function languageParam(value: string | string[] | undefined, fallback = "zh"): VibeLanguage {
  return value === "en" || value === "zh" ? value : fallback.startsWith("zh") ? "zh" : "en";
}
