"use client";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AnsLearningPath } from "@/domain/vibehub/ans-learning-paths";
import { usePersistedSetting } from "../use-persisted-setting";
import { useVibeLanguage } from "../use-vibe-language";
export function AnsPathClient({ path }: { path: AnsLearningPath }) {
  const lang = useVibeLanguage(); const t = useTranslations("vibehub");
  const [saved, setSaved] = usePersistedSetting(`ans:vibehub:path:${path.id}:v1`, "[]");
  let completed: string[] = [];
  try { const value: unknown = JSON.parse(saved); if (Array.isArray(value)) completed = [...new Set(value.filter((id): id is string => typeof id === "string" && path.steps.some(step => step.id === id)))]; } catch { /* Invalid device data is treated as no completed steps. */ }
  const destination = (href: string) => href.startsWith("/vibe-hub") ? `${href}?lang=${lang}` : href;
  return <main className="ans-knowledge-container ans-editorial-page"><nav className="ans-knowledge-breadcrumb" aria-label={t("breadcrumb")}><Link href={`/vibe-hub?lang=${lang}`}>{t("knowledgeHome")}</Link><span aria-hidden="true">/</span><Link href={`/vibe-hub/journeys?lang=${lang}`}>{t("journeys")}</Link></nav>
    <header className="ans-knowledge-page-heading"><p className="ans-knowledge-eyebrow">{t("ansOriginal")} / {path.number}</p><h1>{path.title[lang]}</h1><p>{path.summary[lang]}</p></header>
    <div className="ans-path-layout"><aside className="ans-path-summary"><p className="ans-knowledge-eyebrow">{t("whatYouGet")}</p><strong>{path.outcome[lang]}</strong><p className="ans-path-count" role="status">{t("pathProgress", { count: completed.length, total: path.steps.length })}</p><progress value={completed.length} max={path.steps.length} aria-label={t("pathProgressLabel")} /><p className="ans-path-storage">{t("pathDeviceNote")}</p><nav aria-label={t("onThisPage")}>{path.steps.map((step, index) => <Link href={`#${step.id}`} key={step.id}><span>{completed.includes(step.id) ? <Check size={14} aria-hidden="true" /> : `0${index + 1}`}</span>{step.title[lang]}</Link>)}</nav></aside>
      <div className="ans-path-steps">{path.steps.map((step, index) => <section id={step.id} key={step.id}><p className="ans-knowledge-eyebrow">{t("stage", { number: index + 1 })}</p><h2>{step.title[lang]}</h2><p>{step.action[lang]}</p><div className="ans-path-evidence"><strong>{t("pathEvidence")}</strong><p>{step.evidence[lang]}</p></div><nav aria-label={t("pathResources")}>{step.links.map(link => <Link className="ans-editorial-link" key={link.href} href={destination(link.href)}>{link.label[lang]}<ArrowUpRight size={15} aria-hidden="true" /></Link>)}</nav><label className="ans-path-check"><input type="checkbox" checked={completed.includes(step.id)} onChange={event => setSaved(JSON.stringify(event.target.checked ? [...completed, step.id] : completed.filter(id => id !== step.id)))} />{t("pathMarkComplete", { number: index + 1 })}</label></section>)}</div></div>
    {completed.length === path.steps.length && <section className="ans-editorial-note" role="status"><h2>{t("pathCompleteTitle")}</h2><p>{t("pathCompleteBody")}</p><Link className="ans-editorial-link" href="/workspace">{t("workspaceAns")}<ArrowUpRight size={16} aria-hidden="true" /></Link></section>}
  </main>;
}
