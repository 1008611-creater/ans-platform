"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { enhanceSource } from "./source-interactions";
import { ConceptVisual, SkillGuide } from "./official/concept-visual.js";
import { FlowDetails } from "./official/flow-details.js";
import type { OfficialEntry } from "./official/types";
import { useVibeLanguage } from "./use-vibe-language";
type Slot = { host: HTMLElement; content: React.ReactNode };
/** HTML comes only from the reviewed local synchronizer. React owns each live example. */
export function SourceContent({ html, className = "", demo, slug, officialEntry }: { html: string; className?: string; demo?: React.ReactNode; slug?: string; officialEntry?: OfficialEntry | null }) {
  const presentationHtml = useMemo(() => html.replace(/<section\b[^>]*class=["'][^"']*\boil-ui-pro-recommendation\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi, ""), [html]);
  const container = useRef<HTMLDivElement>(null); const [slots, setSlots] = useState<Slot[]>([]);
  const hasDemo = Boolean(demo); const lang = useVibeLanguage(); const t = useTranslations("vibehub");
  useEffect(() => {
    const root = container.current; if (!root) return;
    let active = true; const mounted: Slot[] = []; const restore: (() => void)[] = [];
    const mount = (target: Element | null, content: React.ReactNode, append = false) => {
      if (!target) return;
      const original = [...target.childNodes]; const host = document.createElement("div");
      host.dataset.vhReact = "true"; if (append) target.append(host); else target.replaceChildren(host); mounted.push({ host, content });
      restore.push(() => target.replaceChildren(...original));
    };
    const modules = lang === "en" && officialEntry?.en?.modules?.length ? officialEntry.en.modules : officialEntry?.modules;
    const visual = modules?.find(item => item.type === "concept-visual");
    if (visual?.visualKind) mount(root.querySelector(".concept-visual-section"), <><div className="section-title">{visual.title}</div><ConceptVisual kind={visual.visualKind} locale={lang} example={visual.example} /></>);
    const guide = modules?.find(item => item.type === "agent-skill-guide");
    if (guide) mount(root.querySelector(".agent-skill-guide"), <SkillGuide module={guide} locale={lang} />);
    if (officialEntry?.flowLesson && slug) mount(root.querySelector(".flow-details"), <FlowDetails entry={{id: slug, flowLesson: officialEntry.flowLesson}} isEn={lang === "en"} />);
    const liveTrigger = root.querySelector<HTMLElement>(".demo-live-trigger");
    if (hasDemo) { mount(root.querySelector(".dh-demo"), demo, true); if (liveTrigger) liveTrigger.hidden = true; }
    queueMicrotask(() => { if (active) setSlots(mounted); });
    const removeInteractions = enhanceSource(root, { done: t("demo.localAction"), invalid: t("demo.required"), fileError: t("demo.fileError"), copied: t("copied"), copyError: t("copyError") });
    const handleClick = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target : null; if (!element || element.closest("[data-vh-react]")) return;
      const chip = element.closest<HTMLButtonElement>(".cat-chips button");
      if (chip) { const index = [...root.querySelectorAll(".cat-chips button")].indexOf(chip); root.querySelectorAll<HTMLElement>(".cat-section")[index]?.scrollIntoView({ behavior: "auto", block: "start" }); return; }
      if (element.closest(".breadcrumb-link,[data-back]")) window.location.assign("/vibe-hub" + window.location.search);
    };
    const handleSubmit = (event: Event) => { if (event.target instanceof HTMLFormElement) event.preventDefault(); };
    root.addEventListener("click", handleClick); root.addEventListener("submit", handleSubmit);
    return () => { active = false; removeInteractions(); restore.reverse().forEach(fn => fn()); if (liveTrigger) liveTrigger.hidden = false; root.removeEventListener("click", handleClick); root.removeEventListener("submit", handleSubmit); };
  }, [presentationHtml, hasDemo, demo, officialEntry, slug, lang, t]);
  return <><div ref={container} className={className} dangerouslySetInnerHTML={{ __html: presentationHtml }} />{slots.map((slot, index) => createPortal(slot.content, slot.host, String(index)))}</>;
}
