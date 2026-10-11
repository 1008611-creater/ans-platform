"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useVibeLanguage } from "../use-vibe-language";
import { usePersistedSetting } from "../use-persisted-setting";
import { CopyTermButton } from "../copy-term-button";
import { AnsPracticeLinks } from "../ans-practice-links";
const fields = ["goal", "material", "delivery", "acceptance"] as const;
type Field = typeof fields[number];
export function SkillClient() {
  const lang = useVibeLanguage(); const t = useTranslations("vibehub");
  const [saved, setSaved] = usePersistedSetting("ans:vibehub:brief:v1", "{}");
  const draft: Partial<Record<Field, string>> = {};
  try { const value: unknown = JSON.parse(saved); if (value && typeof value === "object") for (const key of fields) { const entry = (value as Record<string, unknown>)[key]; if (typeof entry === "string") draft[key] = entry; } } catch { /* Invalid device drafts start empty. */ }
  const brief = [t("agentBriefOpening"), ...fields.map(key => `${t(`agentField${key}`)}: ${draft[key]?.trim() || t("agentBriefMissing")}`), t("agentBriefConstraint")].join("\n\n");
  return <main className="ans-knowledge-container ans-editorial-page"><header className="ans-knowledge-page-heading"><p className="ans-knowledge-eyebrow">ANS / {t("skill")}</p><h1>{t("agentTitle")}</h1><p>{t("agentBody")}</p></header>
    <section className="ans-agent-principles" aria-label={t("agentPrinciples")}>{[1,2,3].map(index => <div key={index}><span>0{index}</span><h2>{t(`agentPrinciple${index}Title`)}</h2><p>{t(`agentPrinciple${index}Body`)}</p></div>)}</section>
    <section className="ans-brief-workbench" aria-labelledby="brief-title"><div className="ans-brief-inputs"><p className="ans-knowledge-eyebrow">{t("agentBriefEyebrow")}</p><h2 id="brief-title">{t("agentBriefTitle")}</h2><p>{t("agentBriefBody")}</p>{fields.map(key => <label key={key} htmlFor={`brief-${key}`}><span>{t(`agentField${key}`)}</span><textarea id={`brief-${key}`} rows={3} maxLength={4000} value={draft[key] || ""} placeholder={t(`agentPlaceholder${key}`)} onChange={event => setSaved(JSON.stringify({ ...draft, [key]: event.target.value }))} /></label>)}<small>{t("agentDraftNote")}</small></div>
    <div className="ans-brief-preview"><div><h3>{t("agentBriefPreview")}</h3><CopyTermButton text={brief} /></div><pre>{brief}</pre><p>{t("agentBriefPreviewNote")}</p><Link className="ans-editorial-link" href={`/vibe-hub/ans/clear-brief?lang=${lang}`}>{t("agentBriefGuide")}<ArrowUpRight size={16} aria-hidden="true" /></Link></div></section>
    <AnsPracticeLinks compact />
    <details className="ans-source-disclosure"><summary>{t("agentSourceTitle")}</summary><p>{t("agentSourceBody")}</p><a className="ans-editorial-link" href="https://github.com/oil-oil/vibe-hub-skill" target="_blank" rel="noreferrer">{t("agentSourceLink")}<ArrowUpRight size={16} aria-hidden="true" /></a></details>
  </main>;
}
