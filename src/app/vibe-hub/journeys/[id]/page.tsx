import { getAnsLearningPath } from "@/domain/vibehub/ans-learning-paths";
import { AnsPathClient } from "../ans-path-client";
﻿import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { readVibeData, languageParam, type AgentEnvelope } from "../../source-data";
import { JourneyClient, type JourneyData } from "../journey-client";
export default async function Journey({params,searchParams}: {params:Promise<{id:string}>;searchParams:Promise<{lang?:string}>}) {
  const {id} = await params; const lang = languageParam((await searchParams).lang,await getLocale());
  const ansPath = getAnsLearningPath(id); if (ansPath) return <AnsPathClient path={ansPath} />;
  const payload = await readVibeData<AgentEnvelope<JourneyData>>(`journeys/${lang}/${id}.json`); if(!payload)notFound();
  return <JourneyClient journey={payload.data} />;
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params; const lang = languageParam((await searchParams).lang, await getLocale());
  const payload = await readVibeData<AgentEnvelope<JourneyData>>(`journeys/${lang}/${id}.json`);
  const path = `/vibe-hub/journeys/${id}`;
  return { title: getAnsLearningPath(id)?.title[lang] || payload?.data.title || id, description: getAnsLearningPath(id)?.summary[lang] || payload?.data.outcome, alternates: { canonical: `${path}?lang=${lang}`, languages: { en: `${path}?lang=en`, "zh-CN": `${path}?lang=zh` } } };
}
