"use client";
import { useEffect, useRef, type MouseEvent } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Copy, FileText, Flag, GitBranch, PanelsTopLeft, Clapperboard, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { guideHref, guideResourceHref } from "@/domain/vibehub/guide-routing";
import { CopyTermButton } from "../copy-term-button";
import { usePersistedSetting } from "../use-persisted-setting";
import { useVibeLanguage } from "../use-vibe-language";
import type { JourneySummary } from "../journeys/journeys-client";
import type { GuideView } from "./guide-data";
const taskLinks = [
  { id: "website", label: "guideWebsite", Icon: PanelsTopLeft },
  { id: "creative", label: "guideCreative", Icon: Clapperboard },
  { id: "github", label: "guideGithub", Icon: GitBranch },
] as const;
const methodLinks = [
  { id: "brief", label: "guideBrief", Icon: FileText },
  { id: "competition", label: "guideCompetition", Icon: Flag },
  { id: "account", label: "guideAccount", Icon: Wallet },
] as const;
function readCompleted(value: string, guide: GuideView) {
  try { const items: unknown = JSON.parse(value); return Array.isArray(items) ? [...new Set(items.filter((id): id is string => typeof id === "string" && guide.steps.some(step => step.id === id)))] : []; }
  catch { return []; }
}
export function GuidesClient({ guide, topicMode, topics, initialStep }: { guide: GuideView; topicMode: boolean; topics: JourneySummary[]; initialStep?: string }) {
  const lang = useVibeLanguage(); const t = useTranslations("vibehub");
  const router = useRouter(); const params = useSearchParams();
  const [saved, setSaved, persisted] = usePersistedSetting(guide.storageKey, "[]");
  const completed = readCompleted(saved, guide);
  const requestedStep = params.get("step") || initialStep;
  const active = guide.steps.find(step => step.id === requestedStep) || guide.steps[0];
  const panel = useRef<HTMLElement>(null);
  const enteredSelection = useRef(params.has("task") || params.has("topic"));
  // A legacy URL's fragment still points to the matching step after its redirect.
  useEffect(() => {
    let id = "";
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
    if (!params.has("step") && guide.steps.some(step => step.id === id)) {
      const next = new URLSearchParams(params.toString()); next.set("step", id);
      router.replace(`/vibe-hub/guides?${next}`, { scroll: false });
    }
  }, [guide.steps, params, router]);
  useEffect(() => {
    if (!enteredSelection.current) return;
    panel.current?.focus({ preventScroll: true });
    if (window.matchMedia("(max-width: 760px)").matches) panel.current?.scrollIntoView({ block: "start" });
  }, [guide.id]);
  const selection = topicMode ? { topic: guide.id } : { task: guide.id };
  function stepHref(id: string) { return guideHref(lang, { ...selection, step: id }); }
  function selectStep(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.history.pushState(null, "", stepHref(id));
    requestAnimationFrame(() => {
      const trigger = document.getElementById(`guide-trigger-${id}`);
      trigger?.focus({ preventScroll: true });
      const top = trigger?.getBoundingClientRect().top;
      if (top !== undefined && (top < 144 || top > window.innerHeight - 120)) trigger?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }
  const reference = guide.reference;
  const total = guide.steps.length;
  return <main className="ans-knowledge-container ans-guide-page">
    <header className="ans-guide-page-heading"><h1>{t("guides")}</h1><Link href={`/vibe-hub?lang=${lang}`} className="ans-editorial-link">{t("terms")}<ArrowUpRight size={15} aria-hidden="true" /></Link></header>
    <div className="ans-guide-layout">
      <aside className="ans-guide-navigation"><nav aria-label={t("guideTaskNavigation")}>
        <h2>{t("guideTasks")}</h2><div className="ans-guide-task-list">{taskLinks.map(({ id, label, Icon }) => <Link href={guideHref(lang, { task: id })} scroll={false} key={id} aria-current={!topicMode && guide.id === id ? "page" : undefined}><Icon size={18} aria-hidden="true" /><span>{t(label)}</span><ArrowRight size={14} className="ans-guide-nav-arrow" aria-hidden="true" /></Link>)}</div>
        <h2>{t("guideMethods")}</h2><div className="ans-guide-method-list">{methodLinks.map(({ id, label, Icon }) => <Link href={guideHref(lang, { task: id })} scroll={false} key={id} aria-current={!topicMode && guide.id === id ? "page" : undefined}><Icon size={17} aria-hidden="true" /><span>{t(label)}</span></Link>)}</div>
        {topics.length > 0 && <details className="ans-guide-more" open={topicMode || undefined}><summary>{t("guideTopics")}<ChevronDown size={15} aria-hidden="true" /></summary><div>{topics.map(topic => <Link key={topic.id} href={guideHref(lang, { topic: topic.id })} scroll={false} aria-current={topicMode && guide.id === topic.id ? "page" : undefined}>{topic.title}</Link>)}</div></details>}
      </nav></aside>
      <section ref={panel} tabIndex={-1} className="ans-guide-work" aria-labelledby="ans-guide-title">
        <header className="ans-guide-title-row"><div><h2 id="ans-guide-title">{guide.title}</h2><p>{guide.outcome}</p></div><Button asChild className="ans-knowledge-button" data-variant="default"><Link href={`/vibe-hub/vibehub-skill?scenario=${guide.scenario}&lang=${lang}`}>{t("guideBriefAction")}<ArrowUpRight size={16} aria-hidden="true" /></Link></Button></header>
        <div className="ans-guide-progress"><progress value={completed.length} max={total} aria-label={t("pathProgressLabel")} /><span role="status">{t("guideProgress", { count: completed.length, total })}</span><span className={persisted ? "ans-guide-device" : "ans-guide-save-error"} role="status">{t(persisted ? "guideManualProgress" : "deviceSaveFailed")}</span></div>
        <div className="ans-guide-steps" aria-label={t("guideSteps")}>{guide.steps.map((step, index) => {
          const expanded = step.id === active.id; const done = completed.includes(step.id);
          return <section key={step.id} id={step.id} className={`ans-guide-step${expanded ? " is-open" : ""}`}>
            <h3><Link id={`guide-trigger-${step.id}`} href={stepHref(step.id)} onClick={event => selectStep(event, step.id)} scroll={false} aria-expanded={expanded} aria-controls={`guide-content-${step.id}`} className="ans-guide-step-trigger"><span className={`ans-guide-step-number${done ? " is-done" : ""}`}>{done ? <Check size={16} aria-label={t("guideComplete")} /> : String(index + 1).padStart(2, "0")}</span><span>{step.title}</span><ChevronDown size={18} aria-hidden="true" /></Link></h3>
            <div id={`guide-content-${step.id}`} hidden={!expanded} className="ans-guide-step-body"><p className="ans-guide-action">{step.action}</p>
              {step.checklist.length > 0 && <ul className="ans-guide-checklist">{step.checklist.map(item => <li key={item}><span aria-hidden="true" /><span>{item}</span></li>)}</ul>}
              {step.evidence && <div className="ans-guide-evidence"><strong>{t("guideDeliverable")}</strong><p>{step.evidence}</p></div>}
              {step.optional && <p className="ans-guide-optional">{step.optional}</p>}
              {step.resources.length > 0 && <nav className="ans-guide-resources" aria-label={t("guideResources")}>{step.resources.map(resource => <Link className="ans-editorial-link" key={resource.href} href={guideResourceHref(resource.href, lang)}>{resource.label}<ArrowUpRight size={14} aria-hidden="true" /></Link>)}</nav>}
              <div className="ans-guide-step-actions"><label><input type="checkbox" checked={done} onChange={event => setSaved(JSON.stringify(event.target.checked ? [...new Set([...completed, step.id])] : completed.filter(id => id !== step.id)))} />{t("guideComplete")}</label>{index + 1 < total && <Link href={stepHref(guide.steps[index + 1].id)} onClick={event => selectStep(event, guide.steps[index + 1].id)} scroll={false} className="ans-editorial-link">{t("guideNextStep")}<ArrowRight size={16} aria-hidden="true" /></Link>}</div>
            </div>
          </section>;
        })}</div>
        {completed.length === total && <div className="ans-guide-finished" role="status"><Check size={20} aria-hidden="true" /><span>{t("guideFinish")}</span><Link href="/workspace" className="ans-editorial-link">{t("workspaceAns")}<ArrowUpRight size={15} aria-hidden="true" /></Link></div>}
        {reference && <div className="ans-guide-reference">
          <details><summary><Copy size={16} aria-hidden="true" />{t("guideReferencePrompt")}<ChevronDown size={16} aria-hidden="true" /></summary><div className="ans-guide-prompt"><p>{reference.prompt[lang]}</p><CopyTermButton text={reference.prompt[lang]} /></div></details>
          <nav aria-label={t("guideBrowseTerms")}>{reference.terms.map(term => <Link href={`/vibe-hub/${term.slug}?lang=${lang}`} key={term.slug}>{term.name[lang]}<ArrowUpRight size={13} aria-hidden="true" /></Link>)}</nav>
          <nav className="ans-guide-destinations" aria-label={t("continueInAns")}>{reference.destinations.map(link => <Link key={link.href} href={guideResourceHref(link.href, lang)} className="ans-editorial-link">{link.label[lang]}<ArrowUpRight size={15} aria-hidden="true" /></Link>)}</nav>
        </div>}
      </section>
    </div>
  </main>;
}
