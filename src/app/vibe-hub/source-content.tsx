"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { enhanceSource } from "./source-interactions";
import type { FlowLesson } from "./source-data";

/** HTML originates only from the reviewed local synchronizer, never user input. */
export function SourceContent({ html, className = "", demo, flowLesson }: { html: string; className?: string; demo?: React.ReactNode; flowLesson?: FlowLesson | null }) {
  const container = useRef<HTMLDivElement>(null);
  const [demoHost, setDemoHost] = useState<HTMLElement | null>(null);
  const hasDemo = Boolean(demo);
  const t = useTranslations("vibehub");
  useEffect(() => {
    const root = container.current; if (!root) return;
    let active = true;
    let host: HTMLElement | null = null;
    const liveTrigger = root.querySelector<HTMLElement>(".demo-live-trigger");
    if (hasDemo) {
      const target = root.querySelector<HTMLElement>(".dh-demo");
      if (target) { host = document.createElement("div"); target.append(host); if (liveTrigger) liveTrigger.hidden = true; const currentHost = host; queueMicrotask(() => { if (active) setDemoHost(currentHost); }); }
    }
    const removeInteractions = enhanceSource(root, { done: t("demo.localAction"), invalid: t("demo.required"), fileError: t("demo.fileError"), copied: t("copied"), copyError: t("copyError") }, flowLesson);
    const handleClick = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target : null; if (!element) return;
      const part = element.closest<HTMLButtonElement>(".anat-part-trigger");
      if (part) {
        const wrap = part.closest(".anat-wrap"); const row = part.closest<HTMLElement>("[data-ap]"); const key = row?.dataset.ap;
        wrap?.querySelectorAll<HTMLElement>("[data-ap]").forEach((item) => item.classList.toggle("is-active", item.dataset.ap === key));
        wrap?.querySelectorAll(".anat-part-trigger").forEach((item) => item.setAttribute("aria-pressed", String(item === part))); return;
      }
      const chip = element.closest<HTMLButtonElement>(".cat-chips button");
      if (chip) { const buttons = [...root.querySelectorAll(".cat-chips button")]; const index = buttons.indexOf(chip); root.querySelectorAll<HTMLElement>(".cat-section")[index]?.scrollIntoView({ behavior: "auto", block: "start" }); return; }
      if (element.closest(".breadcrumb-link,[data-back]")) window.location.assign("/vibe-hub" + window.location.search);
    };
    const handleSubmit = (event: Event) => { if (event.target instanceof HTMLFormElement) event.preventDefault(); };
    root.addEventListener("click", handleClick); root.addEventListener("submit", handleSubmit);
    return () => { active = false; host?.remove(); if (liveTrigger) liveTrigger.hidden = false; removeInteractions(); root.removeEventListener("click", handleClick); root.removeEventListener("submit", handleSubmit); };
  }, [html, hasDemo, flowLesson, t]);
  return <><div ref={container} className={className} dangerouslySetInnerHTML={{ __html: html }} />{demo && demoHost && createPortal(demo, demoHost)}</>;
}