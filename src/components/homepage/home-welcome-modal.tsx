"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";

// 弹窗本体（兔兔龙图集、分流卡）只在真要弹的时候才去拉，不进首页首屏包。
const loadDialog = () => import("@/components/homepage/first-visit-guide-dialog");
const FirstVisitGuideDialog = dynamic(() => loadDialog().then(m => m.FirstVisitGuideDialog), { ssr: false });

/** Persisted once the visitor has been shown the first-visit guide. Same storage shape as the workbench onboarding. */
const SEEN_KEY = "ans:first-visit-guide:v1:guest";
/** 首页稳住之后再升起：load 之后再等一小拍。 */
export const FIRST_VISIT_RISE_DELAY_MS = 450;

export function readFirstVisitGuideSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markFirstVisitGuideSeen() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Optional storage: a blocked write only re-opens the guide next visit.
  }
}

/** ?campaign=1 时活动弹窗自动弹，本弹窗让位（不记已看，下次正常进站再弹）。 */
function campaignRequested() {
  try {
    return new URLSearchParams(window.location.search).get("campaign") === "1";
  } catch {
    return false;
  }
}

/**
 * 首页首访引导的触发规则：只对未登录、本地没有已看标记的访客弹一次。
 * 已登录不弹，并顺手记下已看——登出后回到首页也算回访者，不再打扰。
 */
export function HomeWelcomeModal() {
  const { status } = useSession();
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "authenticated") { markFirstVisitGuideSeen(); return; }
    if (readFirstVisitGuideSeen() || campaignRequested()) return;

    void loadDialog();
    let timer: number | undefined;
    const rise = () => { timer = window.setTimeout(() => { markFirstVisitGuideSeen(); setShown(true); setOpen(true); }, FIRST_VISIT_RISE_DELAY_MS); };
    if (document.readyState === "complete") rise();
    else window.addEventListener("load", rise, { once: true });
    return () => { window.removeEventListener("load", rise); window.clearTimeout(timer); };
  }, [status]);

  if (!shown) return null;
  return <FirstVisitGuideDialog open={open} onOpenChange={setOpen} testId="home-welcome-modal" />;
}
