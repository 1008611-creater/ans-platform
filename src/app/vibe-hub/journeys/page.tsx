import { vibePageMetadata } from "../metadata";
﻿import { getLocale } from "next-intl/server";
import { readVibeData, languageParam, type AgentEnvelope } from "../source-data";
import { JourneysClient, type JourneySummary } from "./journeys-client";
export default async function Journeys({searchParams}: {searchParams: Promise<{lang?: string}>}) {
  const lang = languageParam((await searchParams).lang, await getLocale());
  const payload = await readVibeData<AgentEnvelope<{ results: JourneySummary[] }>>(`journeys-${lang}.json`);
  return <JourneysClient journeys={payload?.data.results || []} />;
}

export function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }) { return vibePageMetadata("journeys", searchParams); }
