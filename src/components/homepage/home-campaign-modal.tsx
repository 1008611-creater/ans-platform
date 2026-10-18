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
              ? "Activity Guide · Claim 100–150 Pts"
              : "算力活动指南 · 领 100~150 积分"}
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
            <div className="relative border-b border-border bg-gradient-to-r from-emerald-500/15 via-amber-500/15 to-rose-500/15 px-5 py-4 sm:px-7 sm:py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-600 px-3 py-0.5 text-[11px] font-black text-white dark:bg-emerald-400 dark:text-slate-950">
                      {isEn ? "📖 ANS ONBOARDING GUIDE" : "📖 新手引导 · 算力积分怎么领、怎么用"}
                    </span>
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                      {isEn ? "10 Points = ¥1 CNY = $1 USD Quota" : "计费规则：10 积分 = ¥1 元算力额度"}
                    </span>
                  </div>
                  <div className="text-lg font-black tracking-tight text-foreground sm:text-2xl">
                    {isEn
                      ? "Claim 100–150 Free Points · Play 3D Claw Machine · Spend in Market"
                      : "免费领 100~150 积分 · 体验 3D 抓娃娃 · 在工作台与市场直接使用"}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {isEn
                      ? "New users can claim 100–150 free compute points by completing the 30-second questionnaire and daily check-ins. Points can be spent directly on AI workflows in /market or in the 3D Claw Machine."
                      : "新同学完成 30 秒问卷与每日打卡可领 100~150 免费算力积分。积分可在【工具市场】兑换 AI 工作流、在【AI 工作台】调用模型，或在【3D 抓娃娃机】兑换游戏币抽取最高 1000 积分奖励。"}
                  </p>
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
                      {isEn ? "STEP 1 · CLAIM" : "第 1 步 · 免费领积分"}
                    </span>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                      {isEn ? "100–150 Pts" : "可领 100~150 分"}
                    </span>
                  </div>
                  <div className="mt-2.5 text-base font-black text-foreground">
                    {isEn ? "🎁 Free Starter Points" : "🎁 领新用户与农客松算力包"}
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                    <li>
                      • {isEn ? "Sign up + 30s Questionnaire: " : "注册 + 30 秒问卷："}
                      <strong className="text-foreground">{isEn ? "+60 Pts" : "领 60 积分"}</strong>
                    </li>
                    <li>
                      • {isEn ? "Daily check-in & tasks: " : "每日打卡与互动任务："}
                      <strong className="text-foreground">{isEn ? "+40–90 Pts" : "再领 40~90 积分"}</strong>
                    </li>
                    <li>
                      • {isEn ? "CAU AgriHackathon Team Pack: " : "农客松参赛战队专项："}
                      <strong className="text-foreground">{isEn ? "+60 Pts" : "额外 +60 积分"}</strong>
                    </li>
                  </ul>
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
                      {isEn ? "STEP 2 · 3D ARCADE" : "第 2 步 · 3D 抓娃娃"}
                    </span>
                    <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                      {isEn ? "10 Pts / Token" : "10 积分 / 币"}
                    </span>
                  </div>
                  <div className="mt-2.5 text-base font-black text-foreground">
                    {isEn ? "🕹️ 3D Claw & Lucky Wheel" : "🕹️ 3D 抓娃娃机与幸运转盘"}
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                    <li>
                      • {isEn ? "Starter gift: " : "免费体验："}
                      <strong className="text-foreground">{isEn ? "3 Free Tokens" : "3 枚免费抓娃娃币"}</strong>
                    </li>
                    <li>
                      • {isEn ? "Exchange anytime: " : "积分兑币："}
                      <strong className="text-foreground">
                        {isEn ? "10 Pts = 1 Token (100% Win)" : "10 积分兑 1 币（每次必得积分）"}
                      </strong>
                    </li>
                    <li>
                      • {isEn ? "Top Prizes: " : "特等奖项："}
                      <strong className="text-rose-600 dark:text-rose-400">
                        {isEn
                          ? "👑 Top Prize +1,000 Pts · 🐉 +300 Pts"
                          : "👑 特等奖 +1000分 · 🐉 一等奖 +300分"}
                      </strong>
                    </li>
                  </ul>
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
                      {isEn ? "STEP 3 · MARKET" : "第 3 步 · 去市场用积分"}
                    </span>
                    <span className="text-xs font-black text-cyan-700 dark:text-cyan-300">
                      {isEn ? "Spend & Earn" : "兑工具 / 赚分成"}
                    </span>
                  </div>
                  <div className="mt-2.5 text-base font-black text-foreground">
                    {isEn ? "🛒 ANS Marketplace" : "🛒 在市场兑换实用工作流"}
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                    <li>
                      • {isEn ? "Spend points directly in " : "在 "}
                      <strong className="text-foreground">{isEn ? "ANS Market (/market)" : "工具市场 (/market)"}</strong>
                      {isEn ? " to run AI workflows" : " 直接用积分解锁 AI 工作流、简历建站与农大科研工具"}
                    </li>
                    <li>
                      • {isEn ? "Call DeepSeek / GPT / Claude in " : "在 "}
                      <strong className="text-foreground">{isEn ? "Model Plaza (/models)" : "模型广场 (/models)"}</strong>
                      {isEn ? "" : " 在线直接调用主流大模型"}
                    </li>
                    <li>
                      • {isEn ? "Publish your own workflow to earn points!" : "上架原创工作流还能获得积分分成"}
                    </li>
                  </ul>
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

            {/* Bottom Rule Note & Dismiss Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-3.5 sm:px-7">
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-emerald-600/20 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                  {isEn ? "RULE" : "积分说明"}
                </span>
                <span className="font-medium text-muted-foreground">
                  {isEn
                    ? "10 Points = ¥1 CNY quota · Spend points directly on 22 workflows in /market or in the AI Workbench"
                    : "10 积分 = ¥1 元算力额度 · 可直接在 /market 兑换 22 款工作流或在工作台调用模型"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-xl border border-border bg-background px-3.5 py-1.5 text-xs font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {isEn ? "Browse Homepage First" : "先逛首页"}
                </button>
                <Link
                  href="/workspace/benefits"
                  onClick={handleDismiss}
                  className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-black text-white shadow-2xs transition hover:bg-emerald-500 dark:bg-emerald-400 dark:text-slate-950"
                >
                  {isEn ? "🎁 Start Claiming →" : "🎁 立即去领积分 →"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
