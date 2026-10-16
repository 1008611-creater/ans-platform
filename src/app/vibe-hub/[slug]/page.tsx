import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import terms from "../terms.json";
import VibeHubTermClient from "../term-client";
import { readVibeData, languageParam, type SourcePage, type AgentEnvelope, type Lesson } from "../source-data";
import type { OfficialDetail } from "../official/types";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> };
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params; const lang = languageParam((await searchParams).lang, await getLocale());
  const content = await readVibeData<SourcePage>(`entries/${lang}/${slug}.json`);
  return { title: content?.name || slug, description: content?.description, alternates: { canonical: `/vibe-hub/${slug}?lang=${lang}`, languages: { en: `/vibe-hub/${slug}?lang=en`, "zh-CN": `/vibe-hub/${slug}?lang=zh` } } };
}
export default async function VibeHubTerm({ params, searchParams }: Props) {
  const { slug } = await params; const index = terms.findIndex((term) => term.slug === slug); if (index < 0) notFound();
  const lang = languageParam((await searchParams).lang, await getLocale());
  const [content, lesson, detail] = await Promise.all([readVibeData<SourcePage>(`entries/${lang}/${slug}.json`), readVibeData<AgentEnvelope<Lesson>>(`lessons/${lang}/${slug}.json`), readVibeData<OfficialDetail>(`details/${slug}.json`)]);
  if (!content) notFound();
  return <VibeHubTermClient slug={slug} content={content} detail={detail?.entry || null} lesson={lesson?.data || null} previous={terms[(index - 1 + terms.length) % terms.length]} next={terms[(index + 1) % terms.length]} />;
}
