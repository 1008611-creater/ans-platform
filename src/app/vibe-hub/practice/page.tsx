import { vibePageMetadata } from "../metadata";
import { getLocale } from "next-intl/server";
import terms from "../terms.json";
import { readVibeData, languageParam, type AgentEnvelope, type Lesson } from "../source-data";
import { PracticeClient } from "./practice-client";
export default async function Practice({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = languageParam((await searchParams).lang, await getLocale());
  const payloads = await Promise.all(terms.map(async (term) => {
    const item = await readVibeData<AgentEnvelope<Lesson>>(`lessons/${lang}/${term.slug}.json`);
    return item?.data.lessonPractice ? { id: term.slug, title: item.data.title, lessonPractice: item.data.lessonPractice, macroCategory: term.macroCategory } : null;
  }));
  return <PracticeClient lessons={payloads.flatMap(item => item ? [item] : [])} />;
}

export function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }) { return vibePageMetadata("practice", searchParams); }
