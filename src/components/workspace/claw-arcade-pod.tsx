"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  ARCADE_PRIZES,
  CNY_PER_POINT,
  POINTS_PER_USD,
  QUEST_ARCADE_EVENT,
  QUEST_DEFINITIONS,
  USD_PER_POINT,
  advanceAndClaimQuest,
  drawArcadePrize,
  isQuestClaimedToday,
  loadQuestArcadeState,
  saveQuestArcadeState,
  type ArcadePrize,
  type PrizeRarity,
  type QuestArcadeState,
  type QuestCategory,
  type QuestDefinition,
} from "@/domain/mascot/quest-arcade";
import { SANCTUARY_EVENT_NAME, loadSanctuaryState } from "@/domain/mascot/sanctuary";

interface CapsuleItem {
  id: string;
  rarity: PrizeRarity;
  icon: string;
  labelZh: string;
  labelEn: string;
  x: number; // 12..88 (%)
  z: number; // 15..85 (%)
  colorClass: string;
}

const INITIAL_CAPSULES: readonly CapsuleItem[] = [
  {
    id: "cap-ur-1",
    rarity: "UR",
    icon: "🐉",
    labelZh: "UR 紫金龙蛋 ($100)",
    labelEn: "UR Dragon Egg ($100)",
    x: 50,
    z: 52,
    colorClass: "from-amber-300 via-fuchsia-500 to-indigo-600 ring-amber-300/80",
  },
  {
    id: "cap-ssr-1",
    rarity: "SSR",
    icon: "🔋",
    labelZh: "SSR 4090 显卡饼干",
    labelEn: "SSR 4090 Cookie",
    x: 26,
    z: 36,
    colorClass: "from-emerald-300 via-teal-500 to-cyan-600 ring-emerald-300/80",
  },
  {
    id: "cap-ssr-2",
    rarity: "SSR",
    icon: "🧊",
    labelZh: "SSR Tripo 3D 建模舱",
    labelEn: "SSR Tripo 3D Pod",
    x: 74,
    z: 64,
    colorClass: "from-cyan-300 via-teal-500 to-emerald-600 ring-cyan-300/80",
  },
  {
    id: "cap-sr-1",
    rarity: "SR",
    icon: "🌾",
    labelZh: "SR 农大黄金麦穗",
    labelEn: "SR Golden Wheat",
    x: 34,
    z: 70,
    colorClass: "from-amber-300 via-orange-400 to-amber-600 ring-amber-200/70",
  },
  {
    id: "cap-sr-2",
    rarity: "SR",
    icon: "🛠️",
    labelZh: "SR 市场算力抵扣胶囊",
    labelEn: "SR Market Voucher",
    x: 68,
    z: 30,
    colorClass: "from-orange-300 via-amber-500 to-yellow-600 ring-orange-200/70",
  },
  {
    id: "cap-r-1",
    rarity: "R",
    icon: "🦖",
    labelZh: "R 薄荷星龙 ($25)",
    labelEn: "R Mint Dino ($25)",
    x: 20,
    z: 66,
    colorClass: "from-sky-300 via-blue-500 to-indigo-600 ring-sky-200/70",
  },
  {
    id: "cap-r-2",
    rarity: "R",
    icon: "⚡",
    labelZh: "R 极速 Flash 能量球",
    labelEn: "R Flash Orb ($25)",
    x: 80,
    z: 42,
    colorClass: "from-indigo-300 via-sky-500 to-blue-600 ring-indigo-200/70",
  },
];

export function ComputeQuestArcade({ actorId }: { actorId?: string | null }) {
  const locale = useLocale();
  const isEn = locale === "en";

  const [state, setState] = useState<QuestArcadeState>(() => loadQuestArcadeState(actorId));
  const [starBeans, setStarBeans] = useState<number>(180);
  const [arcadeMode, setArcadeMode] = useState<"claw" | "roulette">("claw");
  const [activeCategory, setActiveCategory] = useState<QuestCategory>("daily");

  // 3D Claw Machine state
  const [clawX, setClawX] = useState<number>(50);
  const [clawZ, setClawZ] = useState<number>(50);
  const [clawPhase, setClawPhase] = useState<"idle" | "dropping" | "grabbing" | "lifting">("idle");
  const [grabbedCapsule, setGrabbedCapsule] = useState<CapsuleItem | null>(null);

  // Starlight Roulette state
  const [wheelAngle, setWheelAngle] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);

  // VibeHub 60s immersion timer simulation
  const [vibeTimerRunning, setVibeTimerRunning] = useState<boolean>(false);

  // Prize / Toast banner state
  const [lastWonPrize, setLastWonPrize] = useState<ArcadePrize | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string>("");
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const syncAll = () => {
      setState(loadQuestArcadeState(actorId));
      setStarBeans(loadSanctuaryState().starBeans);
    };
    syncAll();
    window.addEventListener(QUEST_ARCADE_EVENT, syncAll);
    window.addEventListener(SANCTUARY_EVENT_NAME, syncAll);
    window.addEventListener("storage", syncAll);
    return () => {
      window.removeEventListener(QUEST_ARCADE_EVENT, syncAll);
      window.removeEventListener(SANCTUARY_EVENT_NAME, syncAll);
      window.removeEventListener("storage", syncAll);
      timersRef.current.forEach(id => window.clearTimeout(id));
    };
  }, [actorId]);

  useEffect(() => {
    if (!vibeTimerRunning) return;
    const interval = window.setInterval(() => {
      const current = loadQuestArcadeState(actorId);
      const nextSec = Math.min(60, (current.vibehubReadSeconds || 0) + 15);
      const updated: QuestArcadeState = {
        ...current,
        vibehubReadSeconds: nextSec,
        questProgress: {
          ...current.questProgress,
          daily_vibehub_read: nextSec,
        },
      };
      saveQuestArcadeState(updated, actorId);
      setState(updated);
      if (nextSec >= 60) {
        setVibeTimerRunning(false);
        const res = advanceAndClaimQuest("daily_vibehub_read", actorId);
        if (res?.newlyClaimed) {
          setBannerMessage(
            isEn
              ? `🎉 VibeHub 60s Deep Reading completed! Unlocked $${res.quest.unlockUsd} (${res.quest.unlockUsd * POINTS_PER_USD} pts) + 1 Claw Token!`
              : `🎉 VibeHub 60 秒沉浸充电完成！已从金库提取 $${res.quest.unlockUsd}（${res.quest.unlockUsd * POINTS_PER_USD} 积分）+ 1 枚抓娃娃币！`,
          );
        }
      }
    }, 650);
    return () => window.clearInterval(interval);
  }, [vibeTimerRunning, actorId, isEn]);

  function moveClaw(dx: number, dz: number) {
    if (clawPhase !== "idle") return;
    setClawX(prev => Math.max(14, Math.min(86, prev + dx)));
    setClawZ(prev => Math.max(16, Math.min(84, prev + dz)));
  }

  function findNearestCapsule(x: number, z: number): CapsuleItem {
    let best = INITIAL_CAPSULES[0];
    let bestDist = Infinity;
    for (const cap of INITIAL_CAPSULES) {
      const dist = Math.hypot(cap.x - x, cap.z - z);
      if (dist < bestDist) {
        bestDist = dist;
        best = cap;
      }
    }
    return best;
  }

  function handleClawDrop() {
    if (clawPhase !== "idle") return;
    if (state.arcadeTokens < 1) {
      setBannerMessage(
        isEn
          ? "⚠️ Out of Arcade Tokens! Complete any daily quest or Dino easter egg below to earn tokens."
          : "⚠️ 抓娃娃币不足！完成下方任意每日任务或触发小恐龙反常识彩蛋即可免费领币。",
      );
      return;
    }

    const nearest = findNearestCapsule(clawX, clawZ);
    setClawPhase("dropping");
    setLastWonPrize(null);

    const t1 = window.setTimeout(() => {
      setClawPhase("grabbing");
      setGrabbedCapsule(nearest);
    }, 360);

    const t2 = window.setTimeout(() => {
      setClawPhase("lifting");
    }, 760);

    const t3 = window.setTimeout(() => {
      const outcome = drawArcadePrize("claw", actorId);
      setClawPhase("idle");
      setGrabbedCapsule(null);
      if (outcome) {
        setState(outcome.state);
        setLastWonPrize(outcome.prize);
        const pts = outcome.prize.unlockUsd * POINTS_PER_USD;
        setBannerMessage(
          isEn
            ? `🕹️ Claw Critical Hit! Pulled [${outcome.prize.rarity}] ${outcome.prize.nameEn} · Unlocked $${outcome.prize.unlockUsd} (${pts} pts) + ${outcome.prize.starBeans}🪙!`
            : `🕹️ 机械爪暴击出货！抓中【${outcome.prize.rarity}】${outcome.prize.nameZh} · 已从金库提现 $${outcome.prize.unlockUsd}（${pts} 积分）+ ${outcome.prize.starBeans}🪙！`,
        );
      }
    }, 1150);

    timersRef.current.push(t1, t2, t3);
  }

  function handleRouletteSpin(drawsCount: 1 | 5 = 1) {
    if (isSpinning) return;
    const actualDraws = Math.min(drawsCount, state.arcadeTokens);
    if (actualDraws < 1) {
      setBannerMessage(
        isEn
          ? "⚠️ Out of Arcade Tokens! Complete daily quests or Dino easter eggs below to earn tokens."
          : "⚠️ 星轨转盘币不足！完成下方每日任务或小恐龙彩蛋即可免费获取。",
      );
      return;
    }

    setIsSpinning(true);
    setLastWonPrize(null);
    setWheelAngle(prev => prev + 1080 + Math.floor(Math.random() * 360));

    const t = window.setTimeout(() => {
      let latestOutcome: ReturnType<typeof drawArcadePrize> = null;
      let totalUsd = 0;
      for (let i = 0; i < actualDraws; i++) {
        const res = drawArcadePrize("roulette", actorId);
        if (res) {
          latestOutcome = res;
          totalUsd += res.prize.unlockUsd;
        }
      }
      setIsSpinning(false);
      if (latestOutcome) {
        setState(latestOutcome.state);
        setLastWonPrize(latestOutcome.prize);
        const totalPts = totalUsd * POINTS_PER_USD;
        setBannerMessage(
          isEn
            ? `🎡 Starlight Roulette (${actualDraws}x) Complete! Highlight: [${latestOutcome.prize.rarity}] ${latestOutcome.prize.nameEn} · Total Unlocked: $${totalUsd} (${totalPts} pts)!`
            : `🎡 丰收星轨大转盘（${actualDraws} 连抽）出货！最高命中【${latestOutcome.prize.rarity}】${latestOutcome.prize.nameZh} · 累计提现 $${totalUsd}（${totalPts} 积分）！`,
        );
      }
    }, 900);

    timersRef.current.push(t);
  }

  function handleClaimQuest(quest: QuestDefinition) {
    const res = advanceAndClaimQuest(quest.id, actorId);
    if (!res) return;
    setState(res.state);
    if (res.newlyClaimed) {
      const pts = quest.unlockUsd * POINTS_PER_USD;
      setBannerMessage(
        isEn
          ? `✅ Quest Completed: ${quest.titleEn}! Unlocked $${quest.unlockUsd} (${pts} pts) + ${quest.rewardTokens}🎟️ + ${quest.rewardStarBeans}🪙!`
          : `✅ 任务达成：【${quest.titleZh}】！已从金库解锁 $${quest.unlockUsd}（${pts} 积分）+ ${quest.rewardTokens}🎟️ 抓娃娃币 + ${quest.rewardStarBeans}🪙 星豆！`,
      );
    } else {
      setBannerMessage(
        isEn
          ? `ℹ️ Quest [${quest.titleEn}] has already been claimed for this cycle.`
          : `ℹ️ 【${quest.titleZh}】本周期奖励已入账，快去抓娃娃或探索其他隐藏彩蛋吧！`,
      );
    }
  }

  const deepseekPct = Math.min(100, Math.round((state.deepseekUnlockedUsd / state.deepseekTotalUsd) * 100));
  const flagshipPct = Math.min(100, Math.round((state.flagshipUnlockedUsd / state.flagshipTotalUsd) * 100));
  const filteredQuests = QUEST_DEFINITIONS.filter(q => q.category === activeCategory);
  const unlockedSecretCount = Object.keys(state.secretUnlockedAt).length;
  const targetCapsule = findNearestCapsule(clawX, clawZ);

  return (
    <section
      id="ans-quest-arcade-hub"
      aria-label={isEn ? "Compute Vault, 3D Claw Arcade & Gamified Quest Center" : "算力金库、3D 抓娃娃游乐场与游戏化任务中心"}
      className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-slate-100 shadow-2xl sm:p-7"
    >
      {/* Ambient Cyber-Agri Glow */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />

      {/* Top Header & Official Conversion Ratio Badge */}
      <div className="relative flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1.5">
          <div className="inline-flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 px-3 py-0.5 text-xs font-black text-slate-950">
              {isEn ? "🎮 ANS × CAU AGRIHACKATHON ARCADE" : "🎮 ANS × 中国农大农客松 · 算力游乐场"}
            </span>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
              {isEn
                ? `Official Ratio: 1 Point = ¥${CNY_PER_POINT.toFixed(2)} CNY = $${USD_PER_POINT.toFixed(2)} USD APIC Quota (10 Pts = $1)`
                : `官方计费锚定：1 积分 = ¥${CNY_PER_POINT.toFixed(2)} 元 = $${USD_PER_POINT.toFixed(2)} USD APIC 标称额度（10 积分 = $1）`}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            {isEn
              ? "Compute Vault Progressive Unlock · 3D Dino Claw Machine & Quest Center"
              : "算力金库阶梯提现 · 3D 灵龙抓娃娃机 × 反常识彩蛋任务中心"}
          </h2>
          <p className="max-w-3xl text-xs leading-relaxed text-slate-300 sm:text-sm">
            {isEn
              ? "Complete daily/weekly quests, AgriHackathon milestones (M1–M4), or discover the 6 counter-intuitive Dino Agent easter eggs to earn Arcade Tokens and unlock your $1,000 DeepSeek V4.1 Flash + $600 Flagship compute packs."
              : "完成每日打卡、VibeHub 充电、工作流市场上架、农客松 M1–M4 里程碑或触发右下角小恐龙 6 大反常识隐藏彩蛋，即可赚取游乐币，亲手抓出 $1,000 DeepSeek V4.1 Flash 与 $600 农客松顶配旗舰算力包！"}
          </p>
        </div>

        {/* Wallet Counters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/15 px-3.5 py-2 text-center">
            <div className="text-[11px] font-medium text-amber-200">{isEn ? "Arcade Tokens" : "游乐场抓娃娃币"}</div>
            <div className="text-lg font-black text-amber-300" data-testid="arcade-token-count">
              🎟️ {state.arcadeTokens}
            </div>
          </div>
          <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 px-3.5 py-2 text-center">
            <div className="text-[11px] font-medium text-yellow-200">{isEn ? "Star Beans" : "灵龙灵感星豆"}</div>
            <div className="text-lg font-black text-yellow-300">🪙 {starBeans}</div>
          </div>
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-2 text-center">
            <div className="text-[11px] font-medium text-cyan-200">{isEn ? "3D / Market Vouchers" : "3D建模 / 市场券"}</div>
            <div className="text-lg font-black text-cyan-300">
              🧊 {state.tripoFreeVouchers} · 🛠️ {state.marketDiscountVouchers}
            </div>
          </div>
        </div>
      </div>

      {/* Progressive Compute Vault Dual Progress Dashboard */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {/* Vault 1: $1,000 DeepSeek V4.1 Flash (10,000 Points) */}
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {isEn ? "Tier 1 · Universal Onboarding Vault" : "第一梯队 · 全民问卷算力金库"}
              </span>
              <h3 className="text-base font-bold text-white">
                {isEn ? "$1,000 DeepSeek V4.1 Flash (10,000 Pts)" : "$1,000 DeepSeek V4.1 Flash（10,000 专项积分）"}
              </h3>
            </div>
            <span className="rounded-xl bg-emerald-500/20 px-2.5 py-1 text-xs font-black text-emerald-300">
              ${state.deepseekUnlockedUsd} / ${state.deepseekTotalUsd} ({state.deepseekUnlockedUsd * POINTS_PER_USD}{" "}
              {isEn ? "pts" : "积分"})
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-500"
              style={{ width: `${deepseekPct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {isEn
                ? "Initial $50 (500 pts) unlocked · Unlock remaining $950 via Daily Quests & Claw Machine"
                : "首期已到账 $50（500 积分）· 剩余 $950（9,500 积分）通过每日任务与抓娃娃机实时提现"}
            </span>
            <span className="font-bold text-emerald-300">{deepseekPct}%</span>
          </div>
        </div>

        {/* Vault 2: $600 AgriHackathon Flagship Pack (6,000 Points) */}
        <div className="rounded-2xl border border-amber-500/35 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {isEn ? "Tier 2 · CAU AgriHackathon Flagship Vault" : "第二梯队 · 农客松参赛顶配旗舰金库"}
              </span>
              <h3 className="text-base font-bold text-white">
                {isEn
                  ? "$600 Flagship Pack (6,000 Pts: Terra / GPT-6.1 / Opus 5.5)"
                  : "$600 顶配旗舰包（6,000 积分：$300 Terra + $200 GPT-6.1 + $100 Opus 5.5）"}
              </h3>
            </div>
            <span className="rounded-xl bg-amber-500/20 px-2.5 py-1 text-xs font-black text-amber-300">
              ${state.flagshipUnlockedUsd} / ${state.flagshipTotalUsd} ({state.flagshipUnlockedUsd * POINTS_PER_USD}{" "}
              {isEn ? "pts" : "积分"})
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 transition-all duration-500"
              style={{ width: `${flagshipPct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {isEn
                ? "M1 Apply (20% $120) → M2 Code Host (30% $180) → M3 Wall Public (25% $150) → M4 5-Day Streak (25% $150)"
                : "M1 报名(20% $120) → M2 代码托管(30% $180) → M3 作品墙拉Star(25% $150) → M4 5天冲刺(25% $150)"}
            </span>
            <span className="font-bold text-amber-300">{flagshipPct}%</span>
          </div>
        </div>
      </div>

      {/* Live Toast / Status Banner */}
      {bannerMessage && (
        <div
          role="status"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/50 bg-amber-500/15 px-4 py-2.5 text-xs font-semibold text-amber-200 shadow-lg sm:text-sm"
        >
          <span>{bannerMessage}</span>
          <button
            type="button"
            onClick={() => setBannerMessage("")}
            className="shrink-0 rounded-lg bg-white/10 px-2 py-0.5 text-xs text-white hover:bg-white/20"
          >
            {isEn ? "Dismiss" : "收起"}
          </button>
        </div>
      )}

      {/* Main Split Grid: Left = 3D Claw Machine / Starlight Roulette Pod, Right = 4-Tab Gamified Quest Center */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Left Column (5 cols): 3D Claw Machine & Starlight Roulette */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/15 bg-slate-900/90 p-4 lg:col-span-5">
          <div>
            {/* Mode Switcher */}
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex rounded-xl bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setArcadeMode("claw")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    arcadeMode === "claw"
                      ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {isEn ? "🕹️ 3D Dino Claw Machine" : "🕹️ 3D 灵龙太空抓娃娃机"}
                </button>
                <button
                  type="button"
                  onClick={() => setArcadeMode("roulette")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    arcadeMode === "roulette"
                      ? "bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 shadow"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {isEn ? "🎡 Starlight Roulette" : "🎡 丰收星轨大转盘"}
                </button>
              </div>
              <span className="rounded-lg border border-purple-400/30 bg-purple-500/15 px-2 py-1 text-[11px] font-bold text-purple-200">
                {isEn ? `SSR/UR Pity: ${state.pityCounter}/10` : `十连保底 SSR/UR：${state.pityCounter}/10`}
              </span>
            </div>

            {arcadeMode === "claw" ? (
              /* 3D Cyber-Agri Claw Machine Cabinet */
              <div className="mt-3">
                <div
                  className="relative h-64 w-full overflow-hidden rounded-2xl border-2 border-amber-400/40 bg-gradient-to-b from-indigo-950/90 via-slate-900 to-slate-950 shadow-inner"
                  style={{ perspective: "700px" }}
                >
                  {/* Top Neon Header */}
                  <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-3 py-1 text-[10px] font-bold text-amber-300">
                    <span>{isEn ? "TRIPO 3D MULTIVIEW RIG · CYBER CABINET" : "TRIPO 四视图 3D 骨骼 · 灵龙太空舱"}</span>
                    <span>
                      {isEn ? `Target: ${targetCapsule.labelEn}` : `已瞄准：${targetCapsule.labelZh}`}
                    </span>
                  </div>

                  {/* 3D Gantry & Mechanical Claw */}
                  <div
                    className="pointer-events-none absolute top-6 z-20 -translate-x-1/2 transition-all duration-300"
                    style={{ left: `${clawX}%` }}
                  >
                    {/* Gantry Carriage */}
                    <div className="mx-auto h-2.5 w-8 rounded-full bg-amber-400 shadow" />
                    {/* Steel Cable */}
                    <div
                      className="mx-auto w-0.5 bg-gradient-to-b from-amber-300 to-slate-300 transition-all duration-300"
                      style={{
                        height:
                          clawPhase === "dropping" || clawPhase === "grabbing"
                            ? `${Math.round(68 + clawZ * 0.65)}px`
                            : "26px",
                      }}
                    />
                    {/* 3-Prong Cyber Claw */}
                    <div className="relative mx-auto flex h-7 w-9 items-start justify-center">
                      <span
                        className={`inline-block text-xl transition-transform duration-200 ${
                          clawPhase === "grabbing" || clawPhase === "lifting" ? "scale-90 text-amber-300" : "text-slate-200"
                        }`}
                      >
                        🦾
                      </span>
                      {grabbedCapsule && (
                        <span className="absolute -bottom-5 animate-bounce text-xl">{grabbedCapsule.icon}</span>
                      )}
                    </div>
                  </div>

                  {/* Isometric Floor Grid */}
                  <div
                    className="absolute inset-x-3 bottom-3 top-14 rounded-xl border border-cyan-500/20 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.14),transparent_70%)]"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
                      backgroundSize: "24px 24px",
                    }}
                  >
                    {/* Glowing 3D Capsules */}
                    {INITIAL_CAPSULES.map(cap => {
                      const isTargeted = cap.id === targetCapsule.id;
                      return (
                        <button
                          key={cap.id}
                          type="button"
                          onClick={() => {
                            if (clawPhase === "idle") {
                              setClawX(cap.x);
                              setClawZ(cap.z);
                            }
                          }}
                          title={isEn ? `Aim at ${cap.labelEn}` : `点击瞄准：${cap.labelZh}`}
                          style={{ left: `${cap.x}%`, top: `${cap.z}%` }}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br p-2 shadow-lg ring-2 transition-transform ${
                            cap.colorClass
                          } ${isTargeted ? "z-10 scale-125 ring-4 ring-white" : " opacity-90 hover:scale-110"}`}
                        >
                          <span className="block text-base leading-none">{cap.icon}</span>
                        </button>
                      );
                    })}

                    {/* Target Shadow Reticle */}
                    <div
                      className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-amber-300/90 bg-amber-400/15 transition-all duration-300"
                      style={{ left: `${clawX}%`, top: `${clawZ}%` }}
                    />
                  </div>
                </div>

                {/* Joystick & Drop Claw Controls */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveClaw(-12, 0)}
                      className="rounded-xl border border-white/15 bg-slate-800 px-2.5 py-1.5 text-xs font-bold hover:bg-slate-700"
                    >
                      ◀ {isEn ? "Left" : "左移"}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveClaw(12, 0)}
                      className="rounded-xl border border-white/15 bg-slate-800 px-2.5 py-1.5 text-xs font-bold hover:bg-slate-700"
                    >
                      {isEn ? "Right" : "右移"} ▶
                    </button>
                    <button
                      type="button"
                      onClick={() => moveClaw(0, -12)}
                      className="rounded-xl border border-white/15 bg-slate-800 px-2.5 py-1.5 text-xs font-bold hover:bg-slate-700"
                    >
                      ▲ {isEn ? "Back" : "前推"}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveClaw(0, 12)}
                      className="rounded-xl border border-white/15 bg-slate-800 px-2.5 py-1.5 text-xs font-bold hover:bg-slate-700"
                    >
                      ▼ {isEn ? "Front" : "后拉"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleClawDrop}
                    disabled={clawPhase !== "idle"}
                    data-testid="claw-drop-button"
                    className="flex-1 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-2 text-xs font-black text-slate-950 shadow-lg transition hover:brightness-110 disabled:opacity-50"
                  >
                    {clawPhase === "idle"
                      ? isEn
                        ? "🕹️ DROP CLaw (1 Token · 100% Win)"
                        : "🕹️ 投币下爪抓取（耗 1 币 · 100% 必中算力）"
                      : isEn
                        ? "⚙️ Claw Grabbing Capsule..."
                        : "⚙️ 机械爪正在抓起盲盒胶囊..."}
                  </button>
                </div>
              </div>
            ) : (
              /* Starlight Roulette Mode */
              <div className="mt-3">
                <div className="relative flex h-64 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-emerald-400/40 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 p-4">
                  <div
                    className="relative flex h-44 w-44 items-center justify-center rounded-full border-4 border-amber-300/70 bg-gradient-to-tr from-indigo-900 via-emerald-900 to-amber-900 shadow-2xl transition-transform duration-700 ease-out"
                    style={{ transform: `rotate(${wheelAngle}deg)` }}
                  >
                    {ARCADE_PRIZES.map((prize, idx) => {
                      const angle = idx * 90;
                      return (
                        <div
                          key={prize.id}
                          style={{ transform: `rotate(${angle}deg) translateY(-56px)` }}
                          className="absolute flex flex-col items-center text-center"
                        >
                          <span className="text-2xl">{prize.icon}</span>
                          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-black text-amber-200">
                            {prize.rarity} · ${prize.unlockUsd}
                          </span>
                        </div>
                      );
                    })}
                    <div className="z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-slate-950 text-xs font-black text-amber-300 shadow">
                      ANS
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-300">
                    {isEn
                      ? "100% Win Rate · Every spin unlocks Vault Compute + Star Beans!"
                      : "100% 中奖不空军 · 每一转直接从算力金库提取真金白银额度！"}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRouletteSpin(1)}
                    disabled={isSpinning}
                    data-testid="roulette-spin-1"
                    className="rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 px-3 py-2 text-xs font-black text-slate-950 shadow hover:brightness-110 disabled:opacity-50"
                  >
                    {isEn ? "🎡 Spin 1x (1 Token)" : "🎡 单抽星轨转盘（1 币）"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRouletteSpin(5)}
                    disabled={isSpinning}
                    data-testid="roulette-spin-5"
                    className="rounded-xl bg-gradient-to-r from-amber-400 via-fuchsia-500 to-indigo-500 px-3 py-2 text-xs font-black text-white shadow hover:brightness-110 disabled:opacity-50"
                  >
                    {isEn ? "⚡ 5x Burst Spin" : "⚡ 五连暴击转盘（速冲保底）"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Prize Pool & Latest Pull Card */}
          <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
            {lastWonPrize && (
              <div className="rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-500/20 to-fuchsia-500/20 p-2.5 text-xs">
                <div className="font-black text-amber-300">
                  {lastWonPrize.icon} [{lastWonPrize.rarity}] {isEn ? lastWonPrize.nameEn : lastWonPrize.nameZh}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-200">
                  {isEn ? lastWonPrize.descEn : lastWonPrize.descZh}
                </div>
              </div>
            )}
            <div className="text-[11px] font-semibold text-slate-400">
              {isEn
                ? "Capsule Pool: 🐉 UR ($100 Flagship, 3%) · 🔋 SSR ($50 + 3D Voucher, 12%) · 🌾 SR ($40 + Market Voucher, 30%) · 🦖 R ($25 Flash, 55%)"
                : "奖池一览：🐉 UR 紫金龙蛋($100旗舰, 3%) · 🔋 SSR 4090饼干($50+3D建模券, 12%) · 🌾 SR 黄金麦穗($40+市场券, 30%) · 🦖 R 薄荷星龙($25保底, 55%)"}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): 4-Tab Gamified Quest & Counter-Intuitive Easter Egg Center */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/15 bg-slate-900/90 p-4 lg:col-span-7">
          <div>
            {/* Category Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    {
                      id: "daily",
                      labelZh: "📅 每日活跃任务",
                      labelEn: "📅 Daily Quests",
                    },
                    {
                      id: "weekly",
                      labelZh: "🛠️ 每周与市场变现",
                      labelEn: "🛠️ Weekly & Market",
                    },
                    {
                      id: "agri",
                      labelZh: "🌾 农客松 M1-M4 ($600)",
                      labelEn: "🌾 AgriHackathon M1-M4",
                    },
                    {
                      id: "secret",
                      labelZh: `🦖 6大反常识彩蛋 (${unlockedSecretCount}/6)`,
                      labelEn: `🦖 6 Secret Easter Eggs (${unlockedSecretCount}/6)`,
                    },
                  ] as const
                ).map(tabItem => (
                  <button
                    key={tabItem.id}
                    type="button"
                    onClick={() => setActiveCategory(tabItem.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      activeCategory === tabItem.id
                        ? "bg-white text-slate-950 shadow"
                        : "bg-slate-800/90 text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {isEn ? tabItem.labelEn : tabItem.labelZh}
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-semibold text-emerald-300">
                {isEn ? `🔥 Streak: ${state.streakDays} Day(s)` : `🔥 连续备赛打卡：${state.streakDays} 天`}
              </span>
            </div>

            {/* Quest Cards List */}
            <div className="mt-3 space-y-2.5">
              {filteredQuests.map(quest => {
                const claimed = isQuestClaimedToday(state, quest);
                const progress = state.questProgress[quest.id] ?? 0;
                const pts = quest.unlockUsd * POINTS_PER_USD;

                return (
                  <div
                    key={quest.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 transition ${
                      claimed
                        ? "border-emerald-500/40 bg-emerald-950/25"
                        : "border-white/10 bg-slate-950/60 hover:border-amber-400/40"
                    }`}
                  >
                    <div className="min-w-[220px] flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg">{quest.icon}</span>
                        <h4 className="text-sm font-bold text-white">
                          {isEn ? quest.titleEn : quest.titleZh}
                        </h4>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            quest.unlockPool === "flagship"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          +${quest.unlockUsd} ({pts} {isEn ? "pts" : "积分"})
                        </span>
                        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-200">
                          +{quest.rewardTokens}🎟️ +{quest.rewardStarBeans}🪙
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-300">
                        {isEn ? quest.descEn : quest.descZh}
                      </p>
                      {(quest.hintZh || quest.hintEn) && (
                        <p className="text-[11px] font-medium text-amber-300/90">
                          💡 {isEn ? quest.hintEn : quest.hintZh}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {quest.id === "daily_vibehub_read" && !claimed && (
                        <button
                          type="button"
                          onClick={() => setVibeTimerRunning(true)}
                          disabled={vibeTimerRunning}
                          className="rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25"
                        >
                          {vibeTimerRunning
                            ? `⏱️ ${state.vibehubReadSeconds}s / 60s...`
                            : isEn
                              ? "⚡ Start 60s Timer"
                              : "⚡ 启动 60 秒沉浸计时"}
                        </button>
                      )}

                      {quest.href && (
                        <Link
                          href={quest.href}
                          className="rounded-xl border border-white/15 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                        >
                          {isEn ? "Go →" : "前往 →"}
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => handleClaimQuest(quest)}
                        disabled={claimed}
                        data-testid={`claim-quest-${quest.id}`}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                          claimed
                            ? "cursor-default bg-emerald-500/20 text-emerald-300"
                            : "bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 shadow hover:brightness-110"
                        }`}
                      >
                        {claimed
                          ? isEn
                            ? "✓ Unlocked"
                            : "✓ 已解锁入账"
                          : progress > 0 && quest.targetCount > 1
                            ? `${ isEn ? "Claim" : "打卡领奖" } (${Math.min(progress, quest.targetCount)}/${quest.targetCount})`
                            : isEn
                              ? "Unlock & Claim"
                              : "一键打卡提现"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Note: Anti-Abuse & Model Scope Protection */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-[11px] text-slate-400">
            <span>
              {isEn
                ? "🛡️ Anti-Abuse Guard: Unlocked welfare points are strictly scoped to their designated models (DeepSeek V4.1 Flash / Flagship Trio) and cannot be transferred."
                : "🛡️ 防薅风控说明：福利金库解锁的积分严格绑定对应模型（DeepSeek V4.1 Flash / 农客松三大旗舰模型），不可跨池混用或转赠提现。"}
            </span>
            <Link
              href="/competitions/agrihackathon"
              className="font-bold text-amber-300 hover:underline"
            >
              {isEn ? "View CAU AgriHackathon Hub →" : "前往中国农大农客松赛事大厅 →"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
