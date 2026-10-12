"use client";
import { usePersistedSetting } from "../use-persisted-setting";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useVibeLanguage } from "../use-vibe-language";
export type JourneyData = {id:string;title:string;outcome:string;stages:{id:string;order:number;title:string;action:string;evidence:string;optionalWhen:string|null;lessons:{id:string;title:string;tagline:string}[]}[]};
export function JourneyClient({journey}: {journey: JourneyData}) {
  const [saved,setSaved,persisted] = usePersistedSetting(`vibehub:journey:${journey.id}`, "[]");
  let completed: string[] = [];
  try { const value: unknown = JSON.parse(saved); if (Array.isArray(value)) completed = value.filter((id): id is string => typeof id === "string" && journey.stages.some(stage => stage.id === id)); } catch { /* Ignore invalid browser storage. */ } const t = useTranslations("vibehub"); const lang = useVibeLanguage();
  return <main className="vh-page"><Link href={`/vibe-hub/journeys?lang=${lang}`}>← {t("journeys")}</Link><header className="vh-feature-heading mt-8"><p className="ans-knowledge-eyebrow">{t("pathSourceTitle")}</p><h1>{journey.title}</h1><p>{journey.outcome}</p></header>
    <p className="ans-device-state" role="status">{t(persisted ? "deviceProgress" : "deviceSaveFailed")}</p><div className="vh-progress"><span style={{width:`${completed.length/journey.stages.length*100}%`}} /></div>
    <div className="vh-pattern-sections">{journey.stages.map((stage) => <section key={stage.id}><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={completed.includes(stage.id)} onChange={(event) => setSaved(JSON.stringify(event.target.checked ? Array.from(new Set([...completed,stage.id])) : completed.filter((id) => id!==stage.id)))} />{t("stage",{number:stage.order})}</label><h2 className="mt-3">{stage.title}</h2><p>{stage.action}</p><p className="mt-3 text-sm text-[var(--vh-muted)]">{stage.evidence}</p>{stage.optionalWhen && <p>{stage.optionalWhen}</p>}
      <div className="vh-topic-row mt-4">{stage.lessons.map((lesson) => <Link key={lesson.id} href={`/vibe-hub/${lesson.id}?lang=${lang}`} title={lesson.tagline}>{lesson.title} ↗</Link>)}</div>
    </section>)}</div>
  </main>;
}
