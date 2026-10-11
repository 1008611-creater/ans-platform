import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import labels from "./labels.json";
import { languageParam } from "./source-data";
const sections = { practice: "practice", "anti-ai-flavor": "antiAi", "vibehub-skill": "skill", favorites: "saved", journeys: "journeys", lab: "lab", updates: "updates" } as const;
export async function vibePageMetadata(section: keyof typeof sections, searchParams: Promise<{ lang?: string }>): Promise<Metadata> {
  const lang = languageParam((await searchParams).lang, await getLocale());
  const path = `/vibe-hub/${section}`;
  return { title: labels[lang][sections[section]], alternates: { canonical: `${path}?lang=${lang}`, languages: { en: `${path}?lang=en`, "zh-CN": `${path}?lang=zh` } } };
}
