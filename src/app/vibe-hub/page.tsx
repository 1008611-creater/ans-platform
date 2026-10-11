import { getLocale } from "next-intl/server";
import { Catalog, type CatalogData } from "./catalog-client";
import { KnowledgeHome } from "./knowledge-home";
import { readVibeData, languageParam } from "./source-data";
import labels from "./labels.json";
import courseIndex from "@/data/vibehub/courses/index.json";

export default async function VibeHubPage({ searchParams }: { searchParams: Promise<{ q?: string; lang?: string; topic?: string }> }) {
  const params = await searchParams; const language = languageParam(params.lang, await getLocale());
  const data = await readVibeData<CatalogData>("catalog.json");
  if (!data) return <main className="vh-page"><h1>ANS VibeHub</h1><p>{language === "zh" ? "内容暂不可用。" : "Content is unavailable."}</p></main>;
  if (params.q || params.topic) {
    const localizedData = { ...data, entries: data.entries.map(entry => ({ ...entry, en: { ...entry.en, preview: language === "en" ? entry.en.preview : "" }, zh: { ...entry.zh, preview: language === "zh" ? entry.zh.preview : "" } })) };
    return <Catalog key={`${params.topic || "frontend"}-${params.q || ""}-${language}`} data={localizedData} initialTopic={params.topic} initialQuery={params.q} />;
  }
  return <KnowledgeHome termCount={data.entries.length} courseCount={new Set(courseIndex.map(chapter => chapter.course)).size} />;
}
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string; lang?: string; topic?: string }> }) {
  const params = await searchParams; const lang = languageParam(params.lang, await getLocale());
  return { title: { absolute: `ANS VibeHub · ${labels[lang].knowledgeHome}` }, description: labels[lang].knowledgeHeroBody, alternates: { canonical: `/vibe-hub?lang=${lang}`, languages: { en: "/vibe-hub?lang=en", "zh-CN": "/vibe-hub?lang=zh" } } };
}
