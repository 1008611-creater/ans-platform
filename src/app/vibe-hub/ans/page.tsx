import { getLocale } from "next-intl/server";
import labels from "../labels.json";
import { languageParam } from "../source-data";
import { AnsPracticeLinks } from "../ans-practice-links";
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = languageParam((await searchParams).lang, await getLocale());
  return { title: labels[lang].ansPractice, description: labels[lang].practicePageBody, alternates: { canonical: `/vibe-hub/ans?lang=${lang}`, languages: { en: "/vibe-hub/ans?lang=en", "zh-CN": "/vibe-hub/ans?lang=zh" } } };
}
export default async function AnsPracticesPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = languageParam((await searchParams).lang, await getLocale()); const text = labels[lang];
  return <main className="ans-knowledge-container ans-practice-directory"><header className="ans-knowledge-page-heading"><h1>{text.practicePageTitle}</h1></header><AnsPracticeLinks /></main>;
}
