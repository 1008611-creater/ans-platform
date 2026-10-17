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
      if (params.get("campaign") === "1") {
        setOpen(true);
        return;
      }
      const dismissed = window.sessionStorage.getItem(DISMISS_STORAGE_KEY);
      if (!dismissed) {
        setOpen(true);
      }
    } catch {
      setOpen(true);
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
      <div className="fixed bottom-5 left-5 z-40">
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="home-campaign-reopen-pill"
          className="inline-flex items-center gap-2 rounded-full border border-amber-500/50 bg-slate-950/95 px-4 py-2 text-xs font-black text-amber-300 shadow-lg backdrop-blur-md transition hover:scale-105 hover:border-amber-400 hover:bg-slate-900"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          <span>
            {isEn
              ? "🎁 Activity Guide · Claim 100–150 Pts & Spend in Market"
              : "🎁 算力活动指南 · 领100~150积分 / 抓娃娃 / 逛市场"}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
          onClick={e => {
            if (e.target === e.currentTarget) {
              handleDismiss();
            }
          }}
        >
          <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-amber-500/40 bg-card text-card-foreground shadow-2xl">
            {/* Top Banner Header */}
            <div className="relative border-b border-border bg-gradient-to-r from-emerald-500/15 via-amber-500/15 to-rose-500/15 px-5 py-4 sm:px-7 sm:py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-600 px-3 py-0.5 text-[11px] font-black text-white dark:bg-emerald-400 dark:text-slate-950">
                      {isEn ? "🔥 ANS × CAU LIVE CAMPAIGN" : "🔥 ANS × 中国农大农客松 · 算力活动指南"}
                    </span>
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                      {isEn ? "10 Points = ¥1 CNY = $1 USD Quota" : "官方锚定：10 积分 = ¥1 元 = $1 USD 算力"}
                    </span>
                  </div>
                  <div className="text-lg font-black tracking-tight text-foreground sm:text-2xl">
                    {isEn
                      ? "Claim 100–150 Free Points · Play 3D Claw Machine · Spend in Market"
                      : "免费领 100~150 积分 · 抓娃娃机搏 ¥100 锦鲤 · 去市场花积分"}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {isEn
                      ? "90% of users get 100–150 free points (¥10–¥15 value). Spend your points in the ANS Marketplace on AI workflows & tools, or spend 10 Pts/Token in the 3D Claw Machine for a shot at the 1,000-Pt (¥100) Mythic Koi!"
                      : "全站 90% 用户稳拿 100~150 免费积分（价值 ¥10~¥15 元）！积分不仅能去【市场】直接购买/运行 AI 工作流与农大实战工具，还能在【3D 抓娃娃机】花 10 积分兑币，冲刺 1000 积分（¥100）天选锦鲤大奖！"}
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

            {/* 3-Step Closed-Loop Guide Cards */}
            <div className="grid gap-3.5 p-5 sm:grid-cols-3 sm:p-6">
              {/* Step 1: Claim Free Points */}
              <div className="flex flex-col justify-between rounded-2xl border border-emerald-500/35 bg-emerald-500/5 p-4">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white dark:bg-emerald-400 dark:text-slate-950">
                      {isEn ? "STEP 1 · CLAIM" : "第 1 步 · 免费领积分"}
                    </span>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                      {isEn ? "100–150 Pts" : "稳拿 100~150 分"}
                    </span>
                  </div>
                  <div className="mt-2.5 text-base font-black text-foreground">
                    {isEn ? "🎁 Free Compute Vault" : "🎁 领普惠算力与农客松包"}
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                    <li>
                      • {isEn ? "Sign up + 30s Questionnaire: " : "注册 + 30秒破冰问卷："}
                      <strong className="text-foreground">{isEn ? "+60 Pts (¥6)" : "立得 60 积分 (¥6)"}</strong>
                    </li>
                    <li>
                      • {isEn ? "Daily check-in & 6 Easter Eggs: " : "游乐场打卡 + 6大彩蛋："}
                      <strong className="text-foreground">{isEn ? "+40–90 Pts" : "再领 40~90 积分"}</strong>
                    </li>
                    <li>
                      • {isEn ? "CAU AgriHackathon Team Pack: " : "中国农大农客松战队专属："}
                      <strong className="text-foreground">{isEn ? "+60 Pts ($6)" : "额外 +60 积分 ($6)"}</strong>
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

              {/* Step 2: Spend Points in 3D Claw Machine for Jackpots */}
              <div className="flex flex-col justify-between rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-black text-slate-950">
                      {isEn ? "STEP 2 · PLAY & WIN" : "第 2 步 · 积分抓娃娃"}
                    </span>
                    <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                      {isEn ? "10 Pts / Token" : "10 积分 / 币"}
                    </span>
                  </div>
                  <div className="mt-2.5 text-base font-black text-foreground">
                    {isEn ? "🕹️ 3D Claw & Roulette" : "🕹️ 抓娃娃机花积分搏锦鲤"}
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                    <li>
                      • {isEn ? "Starter gift: " : "进场即送 "}
                      <strong className="text-foreground">{isEn ? "3 Free Tokens" : "3 枚免费抓娃娃币"}</strong>
                    </li>
                    <li>
                      • {isEn ? "Spend points anytime: " : "用积分投币："}
                      <strong className="text-foreground">
                        {isEn ? "10 Pts = 1 Token (100% Win)" : "10 积分兑 1 币（100% 必中）"}
                      </strong>
                    </li>
                    <li>
                      • {isEn ? "Grand Jackpots: " : "低概率暴击大奖："}
                      <strong className="text-rose-600 dark:text-rose-400">
                        {isEn
                          ? "👑 SP +1,000 Pts (¥100) · 🐉 UR +300 Pts"
                          : "👑 SP 锦鲤 +1000分(¥100) · 🐉 UR +300分"}
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
                  {isEn ? "🕹️ Play 3D Claw Machine →" : "🕹️ 去抓娃娃抽锦鲤 →"}
                </Link>
              </div>

              {/* Step 3: Spend Points in Marketplace */}
              <div className="flex flex-col justify-between rounded-2xl border border-cyan-500/35 bg-cyan-500/5 p-4">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="rounded-md bg-cyan-600 px-2 py-0.5 text-[10px] font-black text-white dark:bg-cyan-400 dark:text-slate-950">
                      {isEn ? "STEP 3 · MARKET" : "第 3 步 · 去市场花积分"}
                    </span>
                    <span className="text-xs font-black text-cyan-700 dark:text-cyan-300">
                      {isEn ? "Spend & Earn" : "买工具 / 赚分成"}
                    </span>
                  </div>
                  <div className="mt-2.5 text-base font-black text-foreground">
                    {isEn ? "🛒 ANS Marketplace" : "🛒 在市场花积分买工作流"}
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                    <li>
                      • {isEn ? "Spend points directly in " : "在 "}
                      <strong className="text-foreground">{isEn ? "ANS Market (/market)" : "ANS 市场 (/market)"}</strong>
                      {isEn ? " to buy & run AI workflows" : " 直接花积分解锁 AI 工作流、简历建站与农大科研工具"}
                    </li>
                    <li>
                      • {isEn ? "Call DeepSeek / GPT / Claude in " : "在 "}
                      <strong className="text-foreground">{isEn ? "Model Plaza (/models)" : "模型广场 (/models)"}</strong>
                      {isEn ? "" : " 零配置调用满血大模型"}
                    </li>
                    <li>
                      • {isEn ? "Publish your own workflow to earn points!" : "上架原创工作流还能赚取积分分成！"}
                    </li>
                  </ul>
                </div>

                <Link
                  href="/market"
                  onClick={handleDismiss}
                  data-testid="modal-cta-market"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-cyan-600 px-3 py-2 text-xs font-black text-white shadow-2xs transition hover:bg-cyan-500 dark:bg-cyan-400 dark:text-slate-950"
                >
                  {isEn ? "🛒 Go to Marketplace →" : "🛒 去市场花积分 →"}
                </Link>
              </div>
            </div>

            {/* Bottom Live Broadcast & Dismiss Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-3.5 sm:px-7">
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-slate-950">
                  {isEn ? "LIVE" : "实时欧皇"}
                </span>
                <span className="font-medium text-muted-foreground">
                  {isEn
                    ? "👑 @cau_agr*** pulled [SP Mythic Koi +1,000 Pts] · 🛒 120+ workflows active in Market"
                    : "👑 @cau_agr*** 抓中【SP 天选锦鲤 +1000积分 (¥100)】 · 🛒 市场已上架多款农大实战工作流"}
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
