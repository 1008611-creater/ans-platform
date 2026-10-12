"use client";
import Link from "next/link";
import { guideHref, guideSelectionForPractice } from "@/domain/vibehub/guide-routing";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { BRIEF_FIELDS, BRIEF_SCENARIOS, getBriefScenario, type BriefField } from "@/domain/vibehub/brief-scenarios";
import { useVibeLanguage } from "../use-vibe-language";
import { usePersistedSetting } from "../use-persisted-setting";
import { CopyTermButton } from "../copy-term-button";
export function SkillClient() {
  const lang = useVibeLanguage(); const t = useTranslations("vibehub");
  const router = useRouter(); const params = useSearchParams();
  const [legacy] = usePersistedSetting("ans:vibehub:brief:v1", "{}");
  let hasLegacy = false;
  try { const value: unknown = JSON.parse(legacy); hasLegacy = !!value && typeof value === "object" && BRIEF_FIELDS.some(key => typeof (value as Record<string, unknown>)[key] === "string" && !!((value as Record<string, string>)[key]).trim()); } catch { /* Keep invalid legacy storage untouched. */ }
  const scenario = getBriefScenario(params.get("scenario") || (hasLegacy ? "custom" : "website"));
  const [saved, setSaved, persisted] = usePersistedSetting(`ans:vibehub:brief:${scenario.id}:v2`, scenario.id === "custom" ? legacy : "{}");
  const [templateApplied, setTemplateApplied] = useState(false);
  const draft: Partial<Record<BriefField, string>> = {};
  try { const value: unknown = JSON.parse(saved); if (value && typeof value === "object") for (const key of BRIEF_FIELDS) { const entry = (value as Record<string, unknown>)[key]; if (typeof entry === "string") draft[key] = entry; } } catch { /* Invalid device drafts start empty. */ }
  const missing = BRIEF_FIELDS.filter(key => !draft[key]?.trim());
  const hasContent = missing.length < BRIEF_FIELDS.length;
  const brief = [t("agentBriefOpening"), ...BRIEF_FIELDS.map(key => `${t(`agentField${key}`)}: ${draft[key]?.trim() || t("agentBriefMissing")}`), t("agentBriefConstraint")].join("\n\n");
  function useTemplate() {
    const next = { ...draft };
    for (const key of BRIEF_FIELDS) if (!next[key]?.trim() && scenario.starter?.[key]) next[key] = scenario.starter[key][lang];
    setSaved(JSON.stringify(next)); setTemplateApplied(true);
  }
  return <main className="ans-knowledge-container ans-editorial-page"><header className="ans-knowledge-page-heading"><h1>{t("agentTitle")}</h1><p>{t("agentBody")}</p></header>
    <section className="ans-brief-start" aria-label={t("briefScenario")}>
      <div className="ans-brief-scenarios">{BRIEF_SCENARIOS.map(item => <button type="button" key={item.id} aria-pressed={scenario.id === item.id} onClick={() => { const next = new URLSearchParams(params.toString()); next.set("scenario", item.id); router.replace(`/vibe-hub/vibehub-skill?${next}`, { scroll: false }); setTemplateApplied(false); }}>{t(item.label)}</button>)}</div>
      {scenario.starter && <button type="button" className="ans-editorial-link" onClick={useTemplate} disabled={BRIEF_FIELDS.every(key => draft[key]?.trim() || !scenario.starter?.[key])}>{t("briefUseTemplate")}<ArrowUpRight size={16} aria-hidden="true" /></button>}
      <span className="ans-brief-template-status" role="status">{templateApplied ? t("briefTemplateApplied") : ""}</span>
    </section>
    <section className="ans-brief-workbench" aria-labelledby="brief-title"><div className="ans-brief-inputs"><div className="ans-brief-heading"><h2 id="brief-title">{t("agentBriefTitle")}</h2><span className="ans-device-state" role="status">{t(persisted ? "deviceDraft" : "deviceTemporary")}</span></div>{BRIEF_FIELDS.map(key => <label key={key} htmlFor={`brief-${key}`}><span>{t(`agentField${key}`)}</span><textarea id={`brief-${key}`} rows={3} maxLength={4000} value={draft[key] || ""} placeholder={scenario.hints[key][lang]} onChange={event => { setSaved(JSON.stringify({ ...draft, [key]: event.target.value })); setTemplateApplied(false); }} /></label>)}</div>
    <div className="ans-brief-preview"><div><h3>{t("agentBriefPreview")}</h3><CopyTermButton text={brief} disabled={missing.length > 0} /></div>
      {missing.length > 0 ? <div className="ans-brief-missing"><span>{t("briefMissingFields")}</span>{missing.map(key => <button key={key} type="button" onClick={() => document.getElementById(`brief-${key}`)?.focus()}>{t(`agentField${key}`)}</button>)}</div> : <p className="ans-brief-ready" role="status">{t("briefReady")}</p>}
      {hasContent ? <pre>{brief}</pre> : <p className="ans-brief-empty">{t("briefEmptyPreview")}</p>}
      <nav className="ans-brief-next" aria-label={t("related")}><Link className="ans-editorial-link" href={guideHref(lang, guideSelectionForPractice(scenario.guide))}>{t("guideSeeSteps")}<ArrowUpRight size={16} aria-hidden="true" /></Link></nav>
    </div></section>
  </main>;
}
