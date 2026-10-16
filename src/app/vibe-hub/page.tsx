import { getLocale } from "next-intl/server";
import { Catalog, type CatalogData } from "./catalog-client";
import { readVibeData, languageParam } from "./source-data";
import labels from "./labels.json";

type Props = { searchParams: Promise<{ q?: string; lang?: string; topic?: string }> };
export default async function VibeHubPage({ searchParams }: Props) {
  const params = await searchParams;
  const lang = languageParam(params.lang, await getLocale());
  const data = await readVibeData<CatalogData>("catalog.json");
  if (!data) return <main className="vh-page"><h1>{labels[lang].terms}</h1><p>{labels[lang].unavailable}</p></main>;
  return <Catalog key={`${params.topic || data.topics[0]?.slug || "ai"}:${params.q || ""}:${lang}`} data={data} initialTopic={params.topic} initialQuery={params.q} />;
}
export async function generateMetadata({ searchParams }: Props) {
  const lang = languageParam((await searchParams).lang, await getLocale());
  return { title: { absolute: `${labels[lang].terms} | ANS VibeHub` }, description: labels[lang].atlasDescription, alternates: { canonical: `/vibe-hub?lang=${lang}`, languages: { en: "/vibe-hub?lang=en", "zh-CN": "/vibe-hub?lang=zh" } } };
}
