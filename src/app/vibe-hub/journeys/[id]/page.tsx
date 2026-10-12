import { getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { guideHref, guideTaskForPath } from "@/domain/vibehub/guide-routing";
import { languageParam, readVibeData, type AgentEnvelope } from "../../source-data";
import type { JourneyData } from "../journey-client";
export default async function Journey({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string; step?: string }> }) {
  const { id } = await params; const search = await searchParams;
  const lang = languageParam(search.lang, await getLocale());
  const task = guideTaskForPath(id);
  if (task) redirect(guideHref(lang, { task, step: search.step }));
  const payload = await readVibeData<AgentEnvelope<JourneyData>>(`journeys/${lang}/${id}.json`);
  if (!payload) notFound();
  redirect(guideHref(lang, { topic: id, step: search.step }));
}
