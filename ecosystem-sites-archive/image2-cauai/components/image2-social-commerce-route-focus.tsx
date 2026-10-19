"use client";

import { useEffect } from "react";
import type { Image2SocialCommerceFocusTarget } from "./image2-social-commerce-site";

const sectionIds: Record<Image2SocialCommerceFocusTarget, string> = {
  home: "home",
  workbench: "workbench",
  results: "results",
  templates: "templates",
  case: "case",
  pricing: "pricing",
  ops: "ops"
};

export function Image2SocialCommerceRouteFocus({ section }: { section: Image2SocialCommerceFocusTarget }) {
  useEffect(() => {
    const hash = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
    const hashTarget = hash ? document.getElementById(hash) : null;

    if (hashTarget) {
      requestAnimationFrame(() => {
        hashTarget.scrollIntoView({ block: "start", behavior: "auto" });
      });
      return;
    }

    const target = document.getElementById(sectionIds[section]);

    if (!target || section === "home") {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start", behavior: "auto" });
    });
  }, [section]);

  return null;
}
