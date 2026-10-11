import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import type { VibeLanguage } from "@/contracts/vibehub-content";
export type { VibeLanguage, SourcePage, FlowLesson, Lesson, AgentEnvelope } from "@/contracts/vibehub-content";

const directory = path.join(process.cwd(), "src/data/vibehub");

export const readVibeData = cache(async <T,>(relativePath: string): Promise<T | null> => {
  if (!/^[a-zA-Z0-9_./-]+$/.test(relativePath) || relativePath.includes("..")) return null;
  try { return JSON.parse(await readFile(path.join(directory, relativePath), "utf8")) as T; }
  catch { return null; }
});

export function languageParam(value: string | string[] | undefined, fallback = "zh"): VibeLanguage {
  return value === "en" || value === "zh" ? value : fallback.startsWith("zh") ? "zh" : "en";
}
