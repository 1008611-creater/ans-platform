import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { GUIDE_TASKS, type GuideTask, guideHref } from "@/domain/vibehub/guide-routing";
import { languageParam, readVibeData, type AgentEnvelope } from "../source-data";
import type { JourneySummary } from "../journeys/journeys-client";
import type { JourneyData } from "../journeys/journey-client";
import labels from "../labels.json";
import { taskGuide, topicGuide } from "./guide-data";
import { GuidesClient } from "./guides-client";
type Props = { searchParams: Promise<{ lang?: string; task?: string; topic?: string; step?: string }> };
export async function generateMetadata({ searchParams }: Props) {
  const params = await searchParams; const lang = languageParam(params.lang, await getLocale());
  const selection = params.topic ? { topic: params.topic } : params.task ? { task: params.task } : {};
  return { title: { absolute: `${labels[lang].guides} | ANS VibeHub` }, description: labels[lang].guidePageDescription,
    alternates: { canonical: guideHref(lang, selection), languages: { en: guideHref("en", selection), "zh-CN": guideHref("zh", selection) } },
  };
}
export default async function GuidesPage({ searchParams }: Props) {
  const params = await searchParams; const lang = languageParam(params.lang, await getLocale());
  const index = await readVibeData<AgentEnvelope<{ results: JourneySummary[] }>>(`journeys-${lang}.json`);
  const topics = index?.data.results || [];
  const task = params.task || "website";
  if (!params.topic && !GUIDE_TASKS.includes(task as GuideTask)) notFound();
  const topic = params.topic && topics.some(item => item.id === params.topic)
    ? await readVibeData<AgentEnvelope<JourneyData>>(`journeys/${lang}/${params.topic}.json`) : null;
  if (params.topic && !topic) notFound();
  const guide = topic ? topicGuide(topic.data) : taskGuide(task as GuideTask, lang);
  return <GuidesClient key={`${guide.id}:${lang}`} guide={guide} topicMode={Boolean(topic)} topics={topics} initialStep={params.step} />;
}
