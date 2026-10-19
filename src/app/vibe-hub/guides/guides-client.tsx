"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Cpu, FileText, Film, GitBranch, Globe, Palette, ShieldCheck, Sparkles, Trophy, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { guideHref, type GuideTask } from "@/domain/vibehub/guide-routing";
import type { JourneySummary } from "../journeys/journeys-client";
import { SkillCopyButton } from "../skill-copy-button";
import { usePersistedSetting } from "../use-persisted-setting";
import { useVibeLanguage } from "../use-vibe-language";
import type { GuideView } from "./guide-data";

const TASK_GROUPS: { heading: "guideStartHeading" | "guideMethodHeading"; items: { id: GuideTask; label: string; icon: typeof Globe }[] }[] = [
  { heading: "guideStartHeading", items: [
    { id: "website", label: "guideTaskWebsite", icon: Globe },
    { id: "ui-design", label: "guideTaskUiDesign", icon: Palette },
    { id: "skill-product", label: "guideTaskSkillProduct", icon: Cpu },
    { id: "media-pipeline", label: "guideTaskMediaPipeline", icon: Film },
    { id: "agent-team", label: "guideTaskAgentTeam", icon: Users },
    { id: "creative", label: "guideTaskCreative", icon: Sparkles },
    { id: "open-source", label: "guideTaskOpenSource", icon: GitBranch },
  ] },
  { heading: "guideMethodHeading", items: [
    { id: "brief", label: "guideTaskBrief", icon: FileText },
    { id: "evidence", label: "guideTaskEvidence", icon: Trophy },
    { id: "cost", label: "guideTaskCost", icon: ShieldCheck },
  ] },
];

export function GuidesClient({ guide, topicMode, topics, initialStep }: { guide: GuideView; topicMode: boolean; topics: JourneySummary[]; initialStep?: string }) {
  const lang = useVibeLanguage(); const t = useTranslations("vibehub");
  const workRef = useRef<HTMLElement>(null);
  const [saved, setSaved, persisted] = usePersistedSetting(`ans:vibehub:guide:${guide.id}:v1`, "[]");
  let completed: string[] = [];
  try {
    const parsed: unknown = JSON.parse(saved);
    if (Array.isArray(parsed)) completed = [...new Set(parsed.filter((id): id is string => typeof id === "string" && guide.steps.some(step => step.id === id)))];
  } catch { /* Broken browser storage falls back to an empty checklist. */ }
  const firstIncomplete = guide.steps.find(step => !completed.includes(step.id))?.id || guide.steps[0]?.id || "";
  const [openStep, setOpenStep] = useState(() => guide.steps.some(step => step.id === initialStep) ? initialStep! : firstIncomplete);
  const destination = (href: string) => href.startsWith("/vibe-hub") && !href.includes("lang=") ? `${href}${href.includes("?") ? "&" : "?"}lang=${lang}` : href;
  function toggleDone(stepId: string, checked: boolean) {
    const next = checked ? [...new Set([...completed, stepId])] : completed.filter(id => id !== stepId);
    setSaved(JSON.stringify(next));
    if (checked) {
      const nextOpen = guide.steps.find(step => !next.includes(step.id))?.id;
      if (nextOpen) setOpenStep(nextOpen);
    }
  }
  return <main className="ans-knowledge-container ans-guide-page">
    <header className="ans-guide-page-heading">
      <div><p className="ans-knowledge-eyebrow">{t("guides")}</p><h1>{t("guidePageTitle")}</h1></div>
      <Link className="ans-editorial-link" href={`/vibe-hub/vibehub-skill?lang=${lang}`}>{t("briefAction")}<ArrowUpRight size={16} aria-hidden="true" /></Link>
    </header>
    <div className="ans-guide-layout">
      <aside className="ans-guide-navigation" aria-label={t("guides")}>
        {TASK_GROUPS.map(group => <div key={group.heading}>
          <h2>{t(group.heading)}</h2>
          <nav className={group.heading === "guideStartHeading" ? "ans-guide-task-list" : "ans-guide-method-list"} aria-label={t(group.heading)}>
            {group.items.map(item => {
              const Icon = item.icon; const current = !topicMode && guide.task === item.id;
              return <Link key={item.id} href={guideHref(lang, { task: item.id })} aria-current={current ? "page" : undefined} onClick={() => requestAnimationFrame(() => workRef.current?.focus({ preventScroll: true }))}>
                <Icon size={17} aria-hidden="true" /><span>{t(item.label)}</span><ArrowRight size={15} className="ans-guide-nav-arrow" aria-hidden="true" />
              </Link>;
            })}
          </nav>
        </div>)}
        {topics.length > 0 && <details className="ans-guide-more" open={topicMode}>
          <summary>{t("guideMoreTopics", { count: topics.length })}<ChevronDown size={16} aria-hidden="true" /></summary>
          <nav aria-label={t("guideTopicsLabel")}>{topics.map(topic => <Link key={topic.id} href={guideHref(lang, { topic: topic.id })} aria-current={ guide.id === `topic:${topic.id}` ? "page" : undefined}>{topic.title}</Link>)}</nav>
        </details>}
      </aside>
      <section ref={workRef} tabIndex={-1} className="ans-guide-work" aria-labelledby="ans-current-guide-title">
        <header className="ans-guide-work-head">
          <div className="mb-4 grid gap-5 sm:grid-cols-[1.2fr_0.8fr] sm:items-center">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <span>{lang === "en" ? "📖 Step-by-Step Guide & Ready Prompt" : "📖 实操步骤清单与提示词模板"}</span>
              </div>
              <h2 id="ans-current-guide-title">{guide.title}</h2>
              <p>{guide.summary}</p>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Link className="ans-knowledge-button" data-variant="default" href={destination(guide.briefHref)}>{t("guideWriteBrief")}<ArrowUpRight size={16} aria-hidden="true" /></Link>
                {guide.destinations[0] && <Link className="ans-editorial-link" href={destination(guide.destinations[0].href)}>{guide.destinations[0].label}<ArrowUpRight size={14} aria-hidden="true" /></Link>}
              </div>
            </div>
            <div className="aspect-[16/9] w-full overflow-hidden rounded-xl border bg-muted shadow-xs">
              <img
                src={
                  guide.task === "media-pipeline" || guide.task === "creative"
                    ? "/catalog/ans-pro-v1/infinite-canvas.webp"
                    : guide.task === "agent-team" || guide.task === "skill-product" || guide.task === "evidence"
                      ? "/catalog/ans-pro-v1/agent-team.webp"
                      : guide.task === "open-source"
                        ? "/catalog/ans-pro-v1/git-ship.webp"
                        : guide.task === "website" || guide.task === "ui-design"
                          ? "/catalog/ans-pro-v1/vibephoto.webp"
                          : "/catalog/ans-pro-v1/magic-resume.webp"
                }
                alt={guide.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
          {guide.prompt && (
            <div id="prompt" className="mb-4 rounded-xl border border-emerald-500/25 bg-card/85 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">⚡ {guide.prompt.title}</strong>
                <SkillCopyButton text={guide.prompt.text} label={t("copyRequest")} copiedLabel={t("copied")} />
              </div>
              <p className="mt-2 line-clamp-3 font-mono text-xs leading-5 text-muted-foreground">{guide.prompt.text}</p>
            </div>
          )}
          <div className="ans-guide-progress" role="status"><span>{t("pathProgress", { count: completed.length, total: guide.steps.length })}</span><progress value={completed.length} max={guide.steps.length} aria-label={t("pathProgressLabel")} />{!persisted && <span className="ans-guide-save-error">{t("deviceSaveFailed")}</span>}</div>
        </header>
        <ol className="ans-guide-steps">
          {guide.steps.map((step, index) => {
            const done = completed.includes(step.id); const open = openStep === step.id;
            const nextStep = guide.steps[index + 1];
            return <li key={step.id} id={step.id} className={`ans-guide-step${open ? " is-open" : ""}${done ? " is-done" : ""}`}>
              <div className="ans-guide-step-trigger">
                <button type="button" className={`ans-guide-step-number${done ? " is-done" : ""}`} aria-label={`${t("pathMarkComplete")}: ${step.title}`} aria-pressed={done} onClick={() => toggleDone(step.id, !done)}>{done ? <Check size={14} aria-hidden="true" /> : String(index + 1).padStart(2, "0")}</button>
                <button type="button" className="ans-guide-step-toggle" aria-expanded={open} aria-controls={`panel-${step.id}`} onClick={() => setOpenStep(open ? "" : step.id)}><h3>{step.title}</h3></button>
                <ChevronDown size={18} aria-hidden="true" />
              </div>
              <div id={`panel-${step.id}`} className="ans-guide-step-body" hidden={!open}>
                <p className="ans-guide-action">{step.action}</p>
                {step.checklist && <ul className="ans-guide-checklist">{step.checklist.map(item => <li key={item}><span aria-hidden="true" />{item}</li>)}</ul>}
                {step.evidence && <div className="ans-guide-evidence"><strong>{t("pathEvidence")}</strong><p>{step.evidence}</p></div>}
                {step.optional && <p className="ans-guide-optional">{step.optional}</p>}
                {step.links.length > 0 && <nav className="ans-guide-resources" aria-label={t("pathResources")}>{step.links.map(link => <Link key={link.href} className="ans-editorial-link" href={destination(link.href)}>{link.label}<ArrowUpRight size={14} aria-hidden="true" /></Link>)}</nav>}
                <div className="ans-guide-step-actions">
                  <label><input type="checkbox" checked={done} onChange={event => toggleDone(step.id, event.target.checked)} />{t("pathMarkComplete")}</label>
                  {nextStep && <button type="button" className="ans-editorial-link" onClick={() => setOpenStep(nextStep.id)}>{t("guideNextStep")}: {nextStep.title}<ArrowRight size={15} aria-hidden="true" /></button>}
                </div>
              </div>
            </li>;
          })}
        </ol>
        <footer className="ans-guide-reference">
          {(guide.terms.length > 0 || guide.destinations.length > 1) && <nav aria-label={t("relatedTerms")}>
            {guide.terms.map(term => <Link key={term.slug} href={`/vibe-hub/${term.slug}?lang=${lang}`}>{term.label}<ArrowUpRight size={13} aria-hidden="true" /></Link>)}
            {guide.destinations.slice(1).map(item => <Link key={item.href} className="ans-editorial-link" href={destination(item.href)}>{item.label}<ArrowUpRight size={14} aria-hidden="true" /></Link>)}
          </nav>}
          {completed.length === guide.steps.length && <div className="ans-guide-finished" role="status"><strong>{t("pathCompleteTitle")}</strong><Link className="ans-editorial-link" href="/workspace">{t("workspaceAns")}<ArrowUpRight size={15} aria-hidden="true" /></Link></div>}
        </footer>
      </section>
    </div>
  </main>;
}
