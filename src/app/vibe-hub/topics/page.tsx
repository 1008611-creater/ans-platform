import { getLocale } from "next-intl/server";
import { Catalog, type CatalogData } from "../catalog-client";
import { readVibeData, languageParam } from "../source-data";
import labels from "../labels.json";
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = languageParam((await searchParams).lang, await getLocale());
  return { title: labels[lang].terms, alternates: { canonical: `/vibe-hub/topics?lang=${lang}` } };
}
export default async function Topics({ searchParams }: { searchParams: Promise<{ q?: string; lang?: string; topic?: string }> }) {
  const params = await searchParams; const lang = languageParam(params.lang, await getLocale());
  const data = await readVibeData<CatalogData>("catalog.json");
  if (!data) return <main className="vh-page"><p>{labels[lang].empty}</p></main>;
  const localized = { ...data, entries: data.entries.map(entry => ({ ...entry, en: { ...entry.en, preview: lang === "en" ? entry.en.preview : "" }, zh: { ...entry.zh, preview: lang === "zh" ? entry.zh.preview : "" } })) };
  return <Catalog key={`${params.topic || "frontend"}:${params.q || ""}:${lang}`} data={localized} initialTopic={params.topic} initialQuery={params.q} />;
}
