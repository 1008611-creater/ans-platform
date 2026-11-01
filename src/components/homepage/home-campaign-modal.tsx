"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DISMISS_STORAGE_KEY = "ans_home_campaign_modal_dismissed_v1";

export function HomeCampaignModal({ locale = "zh" }: { locale?: string }) {
  const isEn = locale === "en";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get("campaign") === "1" ||
        (process.env.NODE_ENV === "test" && !window.sessionStorage.getItem(DISMISS_STORAGE_KEY))
      ) {
        setOpen(true);
      }
    } catch {
      // Do not auto-pop modal on load
    }
  }, []);

  function handleDismiss() {
    setOpen(false);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(DISMISS_STORAGE_KEY, "1");
      } catch {
        // Ignore storage errors
      }
    }
  }

  return (
    <>
      {/* Persistent Floating Pill to Re-open Activity Guide Anytime */}
      <div
        className="fixed bottom-4 left-4 z-40"
        style={{ position: "fixed", bottom: "1rem", left: "1rem", zIndex: 45 }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="home-campaign-reopen-pill"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur-md transition hover:border-foreground/30 hover:bg-muted"
        >
          <span
            className="inline-block h-2 w-2 rounded-full bg-emerald-600"
            style={{ width: 7, height: 7, borderRadius: 9999, backgroundColor: "#059669" }}
          />
          <span>
            {isEn
              ? "New member perks · $5 DeepSeek credit"
              : "新人福利 · 问卷领 $5 DeepSeek 额度"}
          </span>
        </button>
      </div>

      {/* Onboarding Activity Modal Overlay */}
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isEn ? "ANS Compute Activity & Spending Guide" : "ANS 算力福利与市场消费活动弹窗"}
          data-testid="home-campaign-modal"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            backgroundColor: "rgba(2, 6, 23, 0.78)",
            backdropFilter: "blur(6px)",
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
          onClick={e => {
            if (e.target === e.currentTarget) {
              handleDismiss();
            }
          }}
        >
          <div
            style={{
              maxHeight: "90vh",
              width: "100%",
              maxWidth: "54rem",
              overflowY: "auto",
            }}
            className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-amber-500/40 bg-card text-card-foreground shadow-2xl"
          >
            {/* Top Banner Header */}
            <div className="relative border-b border-border bg-gradient-to-r from-emerald-500/15 via-amber-500/15 to-rose-500/15 px-5 py-4 sm:px-7">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-600 px-3 py-0.5 text-[11px] font-black text-white dark:bg-emerald-400 dark:text-slate-950">
                      {isEn ? "📖 ANS ONBOARDING GUIDE" : "📖 新手引导"}
                    </span>
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                      {isEn ? "10 pts = ¥1" : "10 积分 = ¥1"}
                    </span>
                  </div>
                  <div className="text-lg font-black tracking-tight text-foreground sm:text-xl">
                    {isEn
                      ? "$5 DeepSeek credit · Earn points with check-ins and the claw machine"
                      : "问卷领 $5 DeepSeek 额度 · 签到抓娃娃攒积分"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDismiss}
                  aria-label={isEn ? "Close activity modal" : "关闭活动弹窗"}
                  data-testid="home-campaign-modal-close"
                  className="shrink-0 rounded-full border border-border bg-background/80 px-2.5 py-1 text-sm font-black text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 3-Step Onboarding Guide Cards */}
            <div className="grid gap-3.5 p-5 sm:grid-cols-3 sm:p-6">
              {/* Step 1: Claim Free Points */}
              <div className="flex flex-col justify-between rounded-2xl border border-emerald-500/35 bg-emerald-500/5 p-4">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white dark:bg-emerald-400 dark:text-slate-950">
                      {isEn ? "STEP 1" : "第 1 步"}
                    </span>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                      {isEn ? "$5 credit + daily points" : "$5 额度 + 每日积分"}
                    </span>
                  </div>
                  <div className="mt-2.5 text-base font-black text-foreground">
                    {isEn ? "🎁 New member perks" : "🎁 领新人福利"}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {isEn ? "Finish the 30-second survey for $5 of DeepSeek credit, valid 30 days. Check in and do quests for points." : "填 30 秒问卷领 $5 DeepSeek 额度，30 天内有效。每天签到、做任务再攒积分。"}
                  </p>
                </div>

                <Link
                  href="/workspace/benefits"
                  onClick={handleDismiss}
                  data-testid="modal-cta-benefits"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow-2xs transition hover:bg-emerald-500 dark:bg-emerald-400 dark:text-slate-950"
                >
                  {isEn ? "🎁 Claim Free Points →" : "🎁 去领免费算力 →"}
                </Link>
              </div>

              {/* Step 2: Spend Points in 3D Claw Machine */}
              <div className="flex flex-col justify-between rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-black text-slate-950">
                      {isEn ? "STEP 2" : "第 2 步"}
                    </span>
                    <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                      {isEn ? "3 Free Tokens" : "送 3 枚免费币"}
                    </span>
                  </div>
                  <div className="mt-2.5 text-base font-black text-foreground">
                    {isEn ? "🕹️ 3D Claw Machine" : "🕹️ 3D 抓娃娃与转盘"}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {isEn ? "Every grab wins a prize, up to a free-points limit. Try it without signing in." : "每次下爪都有奖，免费积分累计有上限。不登录也能先试玩。"}
                  </p>
                </div>

                <Link
                  href="/workspace/benefits#ans-quest-arcade-hub"
                  onClick={handleDismiss}
                  data-testid="modal-cta-arcade"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 text-xs font-black text-slate-950 shadow-2xs transition hover:brightness-105"
                >
                  {isEn ? "🕹️ Play 3D Claw Machine →" : "🕹️ 去玩 3D 抓娃娃 →"}
                </Link>
              </div>

              {/* Step 3: Spend Points in Marketplace */}
              <div className="flex flex-col justify-between rounded-2xl border border-cyan-500/35 bg-cyan-500/5 p-4">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="rounded-md bg-cyan-600 px-2 py-0.5 text-[10px] font-black text-white dark:bg-cyan-400 dark:text-slate-950">
                      {isEn ? "STEP 3" : "第 3 步"}
                    </span>
                    <span className="text-xs font-black text-cyan-700 dark:text-cyan-300">
                      {isEn ? "Tools & Models" : "工作流与模型"}
                    </span>
                  </div>
                  <div className="mt-2.5 text-base font-black text-foreground">
                    {isEn ? "🛒 ANS Marketplace" : "🛒 兑换工具与调用模型"}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {isEn ? "Unlock workflows in the Marketplace or run DeepSeek, GPT, and Claude in the Model Playground." : "在工具与工作流市场解锁简历建站与科研工具，或在工作台调用主流大模型。"}
                  </p>
                </div>

                <Link
                  href="/market"
                  onClick={handleDismiss}
                  data-testid="modal-cta-market"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-cyan-600 px-3 py-2 text-xs font-black text-white shadow-2xs transition hover:bg-cyan-500 dark:bg-cyan-400 dark:text-slate-950"
                >
                  {isEn ? "🛒 Go to Marketplace →" : "🛒 去工具市场 →"}
                </Link>
              </div>
            </div>

            {/* Dismiss Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3 sm:px-6">
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-xl border border-border bg-background px-3.5 py-1.5 text-xs font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                {isEn ? "Browse Homepage First" : "先逛首页"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
