import { getLocale } from "next-intl/server";
import { Catalog, type CatalogData } from "./catalog-client";
import { readVibeData, languageParam } from "./source-data";

export default async function VibeHubPage({ searchParams }: { searchParams: Promise<{ q?: string; lang?: string; topic?: string }> }) {
  const params = await searchParams;
  const language = languageParam(params.lang, await getLocale());
  const data = await readVibeData<CatalogData>("catalog.json");
  if (!data) return <main className="vh-page"><h1>VibeHub</h1><p>{language === "zh" ? "内容暂不可用。" : "Content is unavailable."}</p></main>;
  const localizedData = { ...data, entries: data.entries.map(entry => ({ ...entry, en: { ...entry.en, preview: language === "en" ? entry.en.preview : "" }, zh: { ...entry.zh, preview: language === "zh" ? entry.zh.preview : "" } })) };
  return <Catalog key={`${params.topic || "frontend"}-${params.q || ""}-${language}`} data={localizedData} initialTopic={params.topic} initialQuery={params.q} />;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string; lang?: string; topic?: string }> }) {
  const params = await searchParams; const lang = languageParam(params.lang, await getLocale());
  const data = await readVibeData<CatalogData>("catalog.json"); const topic = data?.topics.find(item => item.slug === params.topic) || data?.topics[0];
  const path = params.topic ? `/vibe-hub/topics?topic=${topic?.slug || "frontend"}&` : "/vibe-hub?";
  return { title: topic?.[lang].title || "VibeHub", alternates: { canonical: `${path}lang=${lang}`, languages: { en: `${path}lang=en`, "zh-CN": `${path}lang=zh` } } };
}
