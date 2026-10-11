import { vibePageMetadata } from "../metadata";
﻿import { getLocale } from "next-intl/server";
import { readVibeData, languageParam, type SourcePage } from "../source-data";
import { SourceContent } from "../source-content";
export default async function Skill({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = languageParam((await searchParams).lang, await getLocale());
  const content = await readVibeData<SourcePage>(`specials/${lang}/vibehub-skill.json`);
  return content ? <SourceContent html={content.html} /> : null;
}

export function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }) { return vibePageMetadata("skill", searchParams); }
