import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { guideHref, guideTaskForPath } from "@/domain/vibehub/guide-routing";
import { languageParam, readVibeData, type AgentEnvelope } from "../../source-data";
import type { JourneyData } from "../journey-client";
import { LegacyGuideRedirect } from "../../legacy-guide-redirect";
import labels from "../../labels.json";

export default async function Journey({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string; step?: string }> }) {
  const { id } = await params; const search = await searchParams;
  const lang = languageParam(search.lang, await getLocale());
  const task = guideTaskForPath(id);
  if (!task) {
    const payload = await readVibeData<AgentEnvelope<JourneyData>>(`journeys/${lang}/${id}.json`);
    if (!payload) notFound();
  }
  const href = guideHref(lang, { ...(task ? { task } : { topic: id }), step: search.step });
  return <LegacyGuideRedirect href={href} title={labels[lang].guides} loading={labels[lang].loading} />;
}
