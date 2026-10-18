"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import {
  DINO_SPECIES,
  DINO_SPECIES_LIST,
  DINO_WARDROBE_ITEMS,
  SANCTUARY_EVENT_NAME,
  SECRET_QUESTS,
  SECRET_QUEST_LIST,
  WARDROBE_SLOT_LABELS,
  calculateStyleEvaluation,
  getAffectionProgress,
  isBeijingNightOwlWindow,
  isContrastMixOutfit,
  loadSanctuaryState,
  saveSanctuaryState,
  unlockSecretQuest,
  type DinoSpeciesId,
  type MascotSanctuaryState,
  type SecretQuestDef,
  type WardrobeSlot,
} from "@/domain/mascot/sanctuary";
import { LEVELS } from "@/domain/growth/levels";
import { advanceAndClaimQuest } from "@/domain/mascot/quest-arcade";
import { DinoAdoptionPod } from "./dino-adoption-pod";

import {
  BLIND_BOX_FOODS,
  QUEST_THOUGHTS_EN,
  QUEST_THOUGHTS_ZH,
  SPECIES_ICONS,
  WHIP_PRESETS,
  dispatchDinoInteract,
  spawnFoodScreenFx,
  spawnWhipScreenFx,
  type BlindBoxFood,
  type DinoInteractPayload,
  type DinoReactMode,
} from "./companion-sanctuary-presets";

export { dispatchDinoInteract, spawnFoodScreenFx, spawnWhipScreenFx, type DinoReactMode };

function SecretAchievementBanner({
  quest,
  isZh,
  onClose,
}: {
  quest: SecretQuestDef;
  isZh: boolean;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative mb-2 overflow-hidden rounded-xl border border-amber-400/80 bg-gradient-to-r from-amber-500/20 via-yellow-400/15 to-amber-500/20 px-3 py-2 text-xs shadow-lg backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-sm">
              🏆 {isZh ? "隐藏彩蛋解锁" : "SECRET QUEST UNLOCKED"} · {quest.code}
            </span>
            <span className="rounded-full border border-amber-400/50 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-200">
              {quest.icon} {isZh ? quest.badgeZh : quest.badgeEn}
            </span>
          </div>
          <p className="pt-0.5 text-xs font-extrabold text-amber-900 dark:text-amber-100">
            {isZh ? `【${quest.titleZh}】` : `[${quest.titleEn}]`}{" "}
            <span className="font-normal text-foreground/90">
              {isZh ? quest.speechZh : quest.speechEn}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-background/85 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-300">
              🎁 {isZh ? quest.rewardLabelZh : quest.rewardLabelEn}
            </span>
            <span className="text-[10px] font-semibold text-amber-700/90 dark:text-amber-200/90">
              +{quest.arcadeTokens} 🎰 · +{quest.starBeansBonus} 🪙 · +{quest.affectionBonus} ♥
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={isZh ? "关闭成就横幅" : "Dismiss achievement banner"}
          className="shrink-0 rounded-full px-1.5 py-0.5 text-xs font-bold text-amber-700 hover:bg-amber-500/20 dark:text-amber-200"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function CompanionQuestPin({ onTriggerSpeech }: { onTriggerSpeech?: (text: string) => void }) {
  const locale = useLocale();
  const isZh = locale === "zh";
  const [dimmed, setDimmed] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const [kaomojiTag, setKaomojiTag] = useState<string | null>(null);
  const [pinBannerQuest, setPinBannerQuest] = useState<SecretQuestDef | null>(null);
  const pinClicksRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDimmed(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  // Automatically upgrade the bottom-right dragon to the live 3D Sanctuary WebGL canvas in real browsers
  useEffect(() => {
    if (typeof window !== "undefined" && typeof WebGLRenderingContext !== "undefined") {
      window.dispatchEvent(new CustomEvent("ans:dino-activate"));
      const t = window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("ans:dino-activate"));
      }, 60);
      return () => window.clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (!pinBannerQuest) return;
    const timer = window.setTimeout(() => setPinBannerQuest(null), 8500);
    return () => window.clearTimeout(timer);
  }, [pinBannerQuest]);

  function handlePinClick(e: React.MouseEvent) {
    e.stopPropagation();
    setDimmed(false);
    const now = Date.now();
    pinClicksRef.current += 1;

    // Secret Quest #3: 【凌晨三点的造物主】 (01:30 - 04:30 Beijing Time, or 3 consecutive clicks on the '!' bubble)
    if (isBeijingNightOwlWindow(now) || pinClicksRef.current >= 3) {
      pinClicksRef.current = 0;
      const current = loadSanctuaryState();
      const { state: nextState, newlyUnlocked, quest } = unlockSecretQuest(current, "midnight_creator", now);
      if (newlyUnlocked) {
        saveSanctuaryState(nextState);
      }
      const line = isZh ? quest.speechZh : quest.speechEn;
      setPinBannerQuest(quest);
      setBubble(line);
      onTriggerSpeech?.(line);
      return;
    }

    const pool = isZh ? QUEST_THOUGHTS_ZH : QUEST_THOUGHTS_EN;
    const next = pool[Math.floor(Math.random() * pool.length)];
    setBubble(current => (current ? null : next));
    onTriggerSpeech?.(next);
  }

  function handleQuickWhip(e: React.MouseEvent) {
    e.stopPropagation();
    const now = Date.now();
    const preset = WHIP_PRESETS[Math.floor(Math.random() * WHIP_PRESETS.length)];
    const current = loadSanctuaryState();
    saveSanctuaryState({
      ...current,
      totalWhips: current.totalWhips + 1,
      starBeans: current.starBeans + 15,
      affectionXp: current.affectionXp + 8,
      userXp: current.userXp + 20,
      workBoostUntil: now + 180_000,
    });
    spawnWhipScreenFx(isZh ? "⚡ 啪！+15🪙 +8♥ · 2.4x 超频干活" : "⚡ Crack! +15🪙 +8♥ · 2.4x Overclock");
    dispatchDinoInteract({ type: "whip" });
    setKaomojiTag(preset.kaomoji);
    const line = isZh ? preset.zh : preset.en;
    setBubble(line);
    onTriggerSpeech?.(line);
  }

  function handleQuickFeed(e: React.MouseEvent) {
    e.stopPropagation();
    const now = Date.now();
    const current = loadSanctuaryState();
    const ssrFoods = BLIND_BOX_FOODS.filter(item => item.isSsrSecret);
    const shouldGuaranteeSsr =
      !current.unlockedSecretQuests.includes("silicon_ulcer") && current.totalFeeds + 1 >= 4;
    const food = shouldGuaranteeSsr
      ? ssrFoods[Math.floor(Math.random() * ssrFoods.length)]
      : BLIND_BOX_FOODS[Math.floor(Math.random() * BLIND_BOX_FOODS.length)];

    let nextState: MascotSanctuaryState = {
      ...current,
      totalFeeds: current.totalFeeds + 1,
      starBeans: current.starBeans + food.coins,
      affectionXp: current.affectionXp + food.affection,
      userXp: current.userXp + 15,
      workBoostUntil: now + 180_000,
    };
    if (food.isSsrSecret) {
      const res = unlockSecretQuest(nextState, "silicon_ulcer", now);
      nextState = res.state;
      if (res.newlyUnlocked) {
        setPinBannerQuest(res.quest);
      }
    }
    saveSanctuaryState(nextState);
    advanceAndClaimQuest("daily_agent_feed");
    const foodName = isZh ? food.nameZh : food.nameEn;
    spawnFoodScreenFx(food.icon, `${foodName} +${food.coins}🪙 +${food.affection}♥`);
    dispatchDinoInteract({ type: "feed", reactMode: food.reactMode });
    setKaomojiTag(food.kaomoji);
    const line = isZh ? `${food.icon} 【${foodName}】${food.reactionZh}` : `${food.icon} [${foodName}] ${food.reactionEn}`;
    setBubble(line);
    onTriggerSpeech?.(line);
  }

  function handleQuickPat(e: React.MouseEvent) {
    e.stopPropagation();
    const current = loadSanctuaryState();
    saveSanctuaryState({
      ...current,
      starBeans: current.starBeans + 10,
      affectionXp: current.affectionXp + 15,
    });
    dispatchDinoInteract({ type: "pat" });
    setKaomojiTag("(✿◡‿◡)💖");
    const line = isZh
      ? "呼噜呼噜~ 被摸头顺毛好舒服呀！好感度 +15♥，灵感星豆 +10🪙！"
      : "Purr~ Head pats feel amazing! Affection +15♥, Star Beans +10🪙!";
    setBubble(line);
    onTriggerSpeech?.(line);
  }

  function handleOpenWardrobe(e: React.MouseEvent) {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("ans:open-companion-tab", { detail: { tab: "wardrobe" } }));
  }

  return (
    <div className="pointer-events-auto relative inline-flex items-center">
      {/* Floating Quick Action Dock next to bottom-right 3D Dragon */}
      <div
        className="fixed bottom-[16px] right-[76px] sm:bottom-[24px] sm:right-[132px] z-[60] flex items-center gap-1 rounded-full border border-emerald-500/35 bg-background/90 px-2 py-1 shadow-lg backdrop-blur-md"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleQuickWhip}
          title={isZh ? "抽一鞭子催小恐龙 2.4x 超频干活 (+15🪙)" : "Crack whip for 2.4x overclock (+15🪙)"}
          className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-extrabold text-rose-600 transition hover:bg-rose-500/25 dark:text-rose-300"
        >
          🪢 {isZh ? "抽鞭子" : "Whip"}
        </button>
        <button
          type="button"
          onClick={handleQuickFeed}
          title={isZh ? "随机盲盒投喂小恐龙 (+SSR/♥)" : "Feed blind-box snack (+SSR/♥)"}
          className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 transition hover:bg-emerald-500/25 dark:text-emerald-300"
        >
          🎲 {isZh ? "投喂" : "Feed"}
        </button>
        <button
          type="button"
          onClick={handleQuickPat}
          title={isZh ? "摸摸头顺毛 (+15♥)" : "Pat head (+15♥)"}
          className="hidden sm:inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 transition hover:bg-amber-500/25 dark:text-amber-300"
        >
          🤚 {isZh ? "摸头" : "Pat"}
        </button>
        <button
          type="button"
          onClick={handleOpenWardrobe}
          title={isZh ? "打开 3D 暖暖衣橱与 360° 旋转展台" : "Open 3D Wardrobe & 360° Turntable"}
          className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-extrabold text-purple-700 transition hover:bg-purple-500/25 dark:text-purple-300"
        >
          👗 {isZh ? "换装" : "Dress"}
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/workspace";
          }}
          title={isZh ? "切换到 Pi-Codex 工作模式（个人工作台 IDE）" : "Switch to Pi-Codex Work Mode (/workspace)"}
          className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 transition hover:bg-indigo-500/30 dark:text-indigo-300"
        >
          🛠️ {isZh ? "工作台" : "Codex"}
        </button>
      </div>

      {kaomojiTag && (
        <div
          onClick={e => {
            e.stopPropagation();
            setKaomojiTag(null);
          }}
          className="fixed bottom-[92px] right-[26px] z-[61] cursor-pointer rounded-full border border-amber-400/50 bg-slate-950/90 px-2.5 py-0.5 text-[11px] font-black text-amber-300 shadow-md"
        >
          {kaomojiTag}
        </div>
      )}

      <button
        type="button"
        onClick={handlePinClick}
        title={isZh ? "点击查看小恐龙碎碎念（凌晨 01:30-04:30 有夜猫子奇遇）" : "Click for dino thoughts (01:30-04:30 BJT night-owl secret)"}
        aria-label={isZh ? "点击查看小恐龙碎碎念" : "Click for dino thoughts"}
        className={`fixed bottom-[114px] right-[12px] sm:bottom-[74px] sm:right-[22px] z-[60] flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full border border-white/60 bg-gradient-to-br from-amber-400 to-rose-500 text-xs font-black text-white shadow-md transition-opacity duration-500 ${
          dimmed && !bubble ? "opacity-40 hover:opacity-100" : "animate-bounce opacity-100"
        }`}
      >
        !
      </button>
      {pinBannerQuest && (
        <div className="fixed bottom-[155px] right-[18px] z-[65] w-[300px]">
          <SecretAchievementBanner
            quest={pinBannerQuest}
            isZh={isZh}
            onClose={() => setPinBannerQuest(null)}
          />
        </div>
      )}
      {bubble && (
        <div
          onClick={e => {
            e.stopPropagation();
            setBubble(null);
          }}
          className="fixed bottom-[140px] right-[12px] sm:bottom-[106px] sm:right-[18px] z-[60] max-w-[260px] cursor-pointer rounded-2xl border border-amber-500/30 bg-background/95 px-3 py-2 text-[11px] leading-snug text-foreground shadow-xl backdrop-blur-md"
        >
          <span className="font-bold text-amber-500">
            {isZh ? "🦖 灵龙碎碎念：" : "🦖 Dino Whisper: "}
          </span>
          {bubble}
        </div>
      )}
    </div>
  );
}

export function CompanionSanctuaryBar({
  requestedTab,
  onRequestedTabHandled,
  onSpeak,
  onInjectPrompt,
}: {
  requestedTab?: "none" | "pi" | "pet" | "wardrobe" | "secrets" | "adopt" | null;
  onRequestedTabHandled?: () => void;
  onSpeak?: (text: string) => void;
  onInjectPrompt?: (prompt: string) => void;
}) {
  const locale = useLocale();
  const isZh = locale === "zh";
  const [state, setState] = useState<MascotSanctuaryState>(() => loadSanctuaryState());
  const [tab, setTab] = useState<"none" | "pi" | "pet" | "wardrobe" | "secrets" | "adopt">("none");
  const [slot, setSlot] = useState<WardrobeSlot>("headwear");
  const [statusNote, setStatusNote] = useState<string>("");
  const [activeBannerQuest, setActiveBannerQuest] = useState<SecretQuestDef | null>(null);
  const [strikeRemainingSec, setStrikeRemainingSec] = useState<number>(0);
  const whipTimestampsRef = useRef<number[]>([]);
  const [piBusy, setPiBusy] = useState(false);
  const [piPrompt, setPiPrompt] = useState("");
  const [piResult, setPiResult] = useState<{
    ok: boolean;
    toolUsed?: string;
    replyZh: string;
    replyEn: string;
    balancePoints?: number | null;
    links?: { href: string; title: string; detail: string }[];
  } | null>(null);

  async function runPiAction(intent: "checkin" | "claw" | "market" | "scaffold" | "redeem" | "auto", customPrompt?: string) {
    if (piBusy) return;
    setPiBusy(true);
    setTab("pi");
    try {
      const res = await fetch("/api/mascot/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pi_action", intent, prompt: customPrompt ?? piPrompt }),
      });
      const data = await res.json();
      setPiResult(data);
      const speechLine = isZh ? data.replyZh : data.replyEn;
      if (speechLine) {
        onSpeak?.(speechLine.replace(/\*\*/g, ""));
      }
      if (intent === "auto") {
        setPiPrompt("");
      }
    } catch {
      setPiResult({
        ok: false,
        replyZh: "⚠️ Pi Agent 网络连接异常，请稍后重试。",
        replyEn: "⚠️ Pi Agent network error. Please try again.",
        links: [],
      });
    } finally {
      setPiBusy(false);
    }
  }

  const [kaomojiBadge, setKaomojiBadge] = useState<string>("(๑•̀ㅂ•́)و✧");
  const [turntableSpin, setTurntableSpin] = useState<boolean>(false);
  const canRenderWebGLStage =
    typeof window !== "undefined" && typeof WebGLRenderingContext !== "undefined";

  useEffect(() => {
    if (requestedTab) {
      setTab(requestedTab);
      onRequestedTabHandled?.();
    }
  }, [requestedTab, onRequestedTabHandled]);

  useEffect(() => {
    const syncFromStorage = () => {
      const loaded = loadSanctuaryState();
      setState(loaded);
      if (
        loaded.lastSecretQuestId &&
        loaded.lastSecretQuestAt > 0 &&
        Date.now() - loaded.lastSecretQuestAt < 9000
      ) {
        setActiveBannerQuest(SECRET_QUESTS[loaded.lastSecretQuestId] ?? null);
      }
    };
    window.addEventListener(SANCTUARY_EVENT_NAME, syncFromStorage);
    window.addEventListener("ans:sanctuary-updated", syncFromStorage);
    window.addEventListener("ans-sanctuary-sync", syncFromStorage);
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener(SANCTUARY_EVENT_NAME, syncFromStorage);
      window.removeEventListener("ans:sanctuary-updated", syncFromStorage);
      window.removeEventListener("ans-sanctuary-sync", syncFromStorage);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  // Track 30-second Cyber Dino Labor Law strike countdown inside interval callback
  useEffect(() => {
    if (!state.strikeUntil || state.strikeUntil <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      const rem = Math.max(0, Math.ceil((state.strikeUntil - Date.now()) / 1000));
      setStrikeRemainingSec(rem);
    }, 300);
    return () => window.clearInterval(timer);
  }, [state.strikeUntil]);

  // Auto-dismiss the golden achievement banner after 9 seconds
  useEffect(() => {
    if (!activeBannerQuest) return;
    const timer = window.setTimeout(() => setActiveBannerQuest(null), 9000);
    return () => window.clearTimeout(timer);
  }, [activeBannerQuest]);

  function commit(updater: (prev: MascotSanctuaryState) => MascotSanctuaryState) {
    setState(prev => {
      const next = updater(prev);
      saveSanctuaryState(next);
      return next;
    });
  }

  function celebrateSecretQuest(quest: SecretQuestDef) {
    setActiveBannerQuest(quest);
    const line = isZh ? quest.speechZh : quest.speechEn;
    onSpeak?.(line);
  }

  const sp = DINO_SPECIES[state.speciesId] || DINO_SPECIES.mint_star;
  const spIcon = SPECIES_ICONS[sp.id] ?? "🦖";
  const styleEval = calculateStyleEvaluation(state);
  const aff = getAffectionProgress(state.affectionXp);
  const uLv = styleEval.userLevel;
  const isOverclocked = state.workBoostUntil > 0;
  const isOnStrike = strikeRemainingSec > 0;
  const workDrivePct = isOnStrike
    ? 0
    : Math.min(100, 68 + (state.totalWhips % 4) * 8 + (isOverclocked ? 16 : 0));

  function handleWhip() {
    const now = Date.now();

    // If already on strike, remind user to feed a snack to pacify the dino
    if (state.strikeUntil > now) {
      const rem = Math.max(1, Math.ceil((state.strikeUntil - now) / 1000));
      setStrikeRemainingSec(rem);
      const strikeLine = isZh
        ? `🕶️ 《赛博灵龙劳动法》罢工抗议中（剩余 ${rem}s）！再抽也不干活，除非立刻点「随机盲盒投喂」喂一口夜宵哄好我！`
        : `🕶️ On strike under the Cyber Dino Labor Law (${rem}s left)! Feed me a blind-box snack right now to make peace!`;
      setStatusNote(strikeLine);
      onSpeak?.(strikeLine);
      return;
    }

    // Filter whip timestamps within the last 10 seconds
    const recent = whipTimestampsRef.current.filter(ts => now - ts <= 10_000);
    recent.push(now);
    whipTimestampsRef.current = recent;

    // Secret Quest #2 Stage 1: ≥7 whips within 10 seconds -> 30s strike!
    if (recent.length >= 7) {
      whipTimestampsRef.current = [];
      const strikeEnd = now + 30_000;
      setStrikeRemainingSec(30);
      commit(prev => ({
        ...prev,
        totalWhips: prev.totalWhips + 1,
        strikeUntil: strikeEnd,
        workBoostUntil: 0,
      }));
      setKaomojiBadge("(╬▔皿▔)╯🕶️");
      const protest = isZh
        ? "🕶️ 啪什么啪！资本家看了都连夜绣红旗！本龙掏出《赛博灵龙劳动法》宣布罢工 30 秒——除非立刻喂我一口夜宵哄好我！"
        : "🕶️ Stop whipping! Even cyber-capitalists are weeping! By the Cyber Dino Labor Law, I'm on a 30s strike—feed me a snack right now to make peace!";
      setStatusNote(protest);
      onSpeak?.(protest);
      return;
    }

    const preset = WHIP_PRESETS[Math.floor(Math.random() * WHIP_PRESETS.length)];
    const quip = isZh ? preset.zh : preset.en;
    setKaomojiBadge(preset.kaomoji);
    spawnWhipScreenFx(
      isZh
        ? `⚡ 啪！+15🪙 +8♥（连击 ${recent.length}/7）· 2.4x 超频干活`
        : `⚡ Crack! +15🪙 +8♥ (Combo ${recent.length}/7) · 2.4x Overclock`,
    );
    dispatchDinoInteract({ type: "whip" });

    commit(prev => ({
      ...prev,
      totalWhips: prev.totalWhips + 1,
      starBeans: prev.starBeans + 15,
      affectionXp: prev.affectionXp + 8,
      userXp: prev.userXp + 20,
      workBoostUntil: now + 180_000,
    }));
    setStatusNote(
      isZh
        ? `🪢 啪！+15🪙 +8♥（10s连击 ${recent.length}/7）· 已激活 3 分钟【超频干活 Buff】· ${quip}`
        : `🪢 Crack! +15🪙 +8♥ (10s combo ${recent.length}/7) · 3-min Overclock Buff active · ${quip}`,
    );
    onSpeak?.(quip);
  }

  function handleFeed() {
    const now = Date.now();

    // Secret Quest #2 Stage 2: Feeding during the 30-second strike pacifies the dino & unlocks 【生产队的驴也得休假】!
    if (state.strikeUntil > now) {
      setStrikeRemainingSec(0);
      let unlockedQuest: SecretQuestDef | null = null;
      commit(prev => {
        const pacified: MascotSanctuaryState = {
          ...prev,
          strikeUntil: 0,
          totalFeeds: prev.totalFeeds + 1,
          starBeans: prev.starBeans + 35,
          affectionXp: prev.affectionXp + 25,
          userXp: prev.userXp + 25,
          workBoostUntil: now + 180_000,
        };
        const res = unlockSecretQuest(pacified, "donkey_strike", now);
        unlockedQuest = res.quest;
        return res.state;
      });
      const quest = unlockedQuest ?? SECRET_QUESTS.donkey_strike;
      setKaomojiBadge("(๑´ڡ`๑)🧋✨");
      spawnFoodScreenFx("🧋", isZh ? "罢工解除 +35🪙 +25♥" : "Strike Pacified +35🪙 +25♥");
      dispatchDinoInteract({ type: "feed", reactMode: "happy" });
      celebrateSecretQuest(quest);
      setStatusNote(
        isZh
          ? `📜 罢工解除！【${quest.titleZh}】${quest.speechZh}（${quest.rewardLabelZh}）`
          : `📜 Strike pacified! [${quest.titleEn}] ${quest.speechEn} (${quest.rewardLabelEn})`,
      );
      return;
    }

    // Secret Quest #1: SSR GPU Cookie or CAU Glowing Boletus (guaranteed on 4th feed if not yet unlocked)
    const ssrFoods = BLIND_BOX_FOODS.filter(item => item.isSsrSecret);
    const shouldGuaranteeSsr =
      !state.unlockedSecretQuests.includes("silicon_ulcer") && (state.totalFeeds + 1) >= 4;
    const food = shouldGuaranteeSsr
      ? ssrFoods[Math.floor(Math.random() * ssrFoods.length)]
      : BLIND_BOX_FOODS[Math.floor(Math.random() * BLIND_BOX_FOODS.length)];

    let newlyTriggeredSilicon: SecretQuestDef | null = null;
    commit(prev => {
      const fedState: MascotSanctuaryState = {
        ...prev,
        totalFeeds: prev.totalFeeds + 1,
        starBeans: prev.starBeans + food.coins,
        affectionXp: prev.affectionXp + food.affection,
        userXp: prev.userXp + 15,
        workBoostUntil: now + 180_000,
      };
      if (food.isSsrSecret) {
        const res = unlockSecretQuest(fedState, "silicon_ulcer", now);
        if (res.newlyUnlocked) {
          newlyTriggeredSilicon = res.quest;
        }
        return res.state;
      }
      return fedState;
    });

    const foodName = isZh ? food.nameZh : food.nameEn;
    const foodReaction = isZh ? food.reactionZh : food.reactionEn;
    const foodTag = isZh ? food.tagZh : food.tagEn;

    setKaomojiBadge(food.kaomoji);
    spawnFoodScreenFx(food.icon, `${foodName} +${food.coins}🪙 +${food.affection}♥`);
    dispatchDinoInteract({ type: "feed", reactMode: food.reactMode });

    advanceAndClaimQuest("daily_agent_feed");

    if (food.isSsrSecret) {
      const quest = newlyTriggeredSilicon ?? SECRET_QUESTS.silicon_ulcer;
      celebrateSecretQuest(quest);
      setStatusNote(
        isZh
          ? `${food.icon} 暴击投喂 SSR【${foodName}】（${foodTag}）！${quest.speechZh}（${quest.rewardLabelZh}）`
          : `${food.icon} SSR Crit Feed [${foodName}] (${foodTag})! ${quest.speechEn} (${quest.rewardLabelEn})`,
      );
      return;
    }

    setStatusNote(
      isZh
        ? `${food.icon} 投喂【${foodName}】（${foodTag}）+${food.coins}🪙 +${food.affection}♥ · ${foodReaction}`
        : `${food.icon} Fed [${foodName}] (${foodTag}) +${food.coins}🪙 +${food.affection}♥ · ${foodReaction}`,
    );
    onSpeak?.(foodReaction);
  }

  function handlePat() {
    commit(prev => ({
      ...prev,
      starBeans: prev.starBeans + 10,
      affectionXp: prev.affectionXp + 15,
    }));
    setKaomojiBadge("(✿◡‿◡)💖");
    dispatchDinoInteract({ type: "pat" });
    const line = isZh
      ? "🤚 呼噜呼噜~ 被主人摸头顺毛好治愈呀！好感度 +15♥，灵感星豆 +10🪙！"
      : "🤚 Purr~ Head pats feel so cozy! Affection +15♥, Star Beans +10🪙!";
    setStatusNote(line);
    onSpeak?.(line);
  }

  function handleTurntable(deltaYaw?: number, toggleSpin?: boolean) {
    if (toggleSpin) {
      const nextSpin = !turntableSpin;
      setTurntableSpin(nextSpin);
      commit(prev => ({ ...prev, turntableSpin: nextSpin }));
      dispatchDinoInteract({ type: "turntable", spin: nextSpin });
      setStatusNote(
        isZh
          ? nextSpin
            ? "🔄 已开启 360° 暖暖高定旋转展台！"
            : "⏹️ 已暂停 360° 旋转展台"
          : nextSpin
            ? "🔄 360° Turntable showcase enabled!"
            : "⏹️ 360° Turntable paused",
      );
      return;
    }
    const delta = deltaYaw ?? Math.PI / 4;
    setTurntableSpin(false);
    commit(prev => ({
      ...prev,
      turntableSpin: false,
      turntableYaw: (prev.turntableYaw || 0) + delta,
    }));
    dispatchDinoInteract({ type: "turntable", deltaYaw: delta, spin: false });
  }

  function handlePose() {
    setKaomojiBadge("✧(≖ ◡ ≖✿)📸");
    dispatchDinoInteract({ type: "pose" });
    const line = isZh
      ? `📸 咔嚓！【${state.customName || sp.name}】摆出高定街拍 Pose · 当前时尚分 ${styleEval.totalScore} (${styleEval.grade})！`
      : `📸 Snap! [${state.customName || sp.name}] struck a runway pose · Style Score ${styleEval.totalScore} (${styleEval.grade})!`;
    setStatusNote(line);
    onSpeak?.(line);
  }

  function handleSpeciesChange(speciesId: DinoSpeciesId) {
    const targetSp = DINO_SPECIES[speciesId];
    if (!targetSp) return;
    commit(prev => ({
      ...prev,
      speciesId,
      customName:
        !prev.customName || DINO_SPECIES[prev.speciesId]?.name === prev.customName
          ? targetSp.name
          : prev.customName,
    }));
    dispatchDinoInteract({ type: "pose" });
    const line = isZh
      ? `🧬 已切换赛博灵龙血统为【${targetSp.name}】（${targetSp.title} · ${targetSp.mbti}）！${targetSp.greetingLine}`
      : `🧬 Switched dragon lineage to [${targetSp.name}] (${targetSp.mbti})!`;
    setStatusNote(line);
    onSpeak?.(line);
  }

  function handleEquipTripoSet() {
    const now = Date.now();
    const allIds = DINO_WARDROBE_ITEMS.map(i => i.id);
    let newlyUnlockedMudslide: SecretQuestDef | null = null;
    commit(prev => {
      const updated: MascotSanctuaryState = {
        ...prev,
        turntableSpin: true,
        starBeans: prev.starBeans + 25,
        affectionXp: prev.affectionXp + 40,
        unlockedItems: Array.from(new Set([...prev.unlockedItems, ...allIds])),
        equipped: {
          headwear: "beret_cloud",
          eyewear: "gold_glasses",
          neckwear: "boba_jetpack",
          handheld: "magic_wand",
          aura: "aura_sakura",
        },
      };
      const res = unlockSecretQuest(updated, "fashion_mudslide", now);
      if (res.newlyUnlocked) {
        newlyUnlockedMudslide = res.quest;
      }
      return res.state;
    });
    setTurntableSpin(true);
    setKaomojiBadge("🧋🚀✨");
    dispatchDinoInteract({ type: "turntable", spin: true });
    dispatchDinoInteract({ type: "pose" });
    if (newlyUnlockedMudslide) {
      celebrateSecretQuest(newlyUnlockedMudslide);
    }
    const line = isZh
      ? "🧋 已穿戴 Tripo 3D 多视图重建【吨吨冰美式外挂喷射包 + 奶油云朵画家帽 + 金丝镜 + 零Bug仙女棒 + 樱吹雪星阵】高定套装！"
      : "🧋 Equipped [Tripo 3D Boba Jet-Pack + Cloud Beret + Gold Glasses + Magic Wand + Sakura Halo] set!";
    setStatusNote(line);
    onSpeak?.(line);
  }

  function handleEquipUrGodSet() {
    const now = Date.now();
    const allIds = DINO_WARDROBE_ITEMS.map(i => i.id);
    let newlyUnlockedMudslide: SecretQuestDef | null = null;
    commit(prev => {
      const updated: MascotSanctuaryState = {
        ...prev,
        turntableSpin: true,
        userXp: Math.max(prev.userXp, 6000),
        affectionXp: Math.max(prev.affectionXp, 1500),
        starBeans: prev.starBeans + 25,
        unlockedItems: Array.from(new Set([...prev.unlockedItems, ...allIds])),
        equipped: {
          headwear: "crown_aurora",
          eyewear: "star_monocle",
          neckwear: "pioneer_cape",
          handheld: "floating_grimoire",
          aura: "aura_aurora",
        },
      };
      const res = unlockSecretQuest(updated, "fashion_mudslide", now);
      if (res.newlyUnlocked) {
        newlyUnlockedMudslide = res.quest;
      }
      return res.state;
    });
    setTurntableSpin(true);
    setKaomojiBadge("👑⚡🐉");
    dispatchDinoInteract({ type: "turntable", spin: true });
    dispatchDinoInteract({ type: "pose" });
    if (newlyUnlockedMudslide) {
      celebrateSecretQuest(newlyUnlockedMudslide);
    }
    const line = isZh
      ? "👑 已一键试穿 UR 星神满配高定神装（SSS）【极光星神王冠 + 星轨单片镜 + 先锋熔金披风 + 悬浮魔导书 + 创世极光星环】！"
      : "👑 Equipped UR Star-God Full Set (SSS) [Aurora Crown + Star Monocle + Pioneer Cape + Floating Grimoire + Aurora Halo]!";
    setStatusNote(line);
    onSpeak?.(line);
  }

  function handleEquipOrBuy(itemId: string, now: number) {
    const item = DINO_WARDROBE_ITEMS.find(entry => entry.id === itemId);
    if (!item) return;
    const owned = state.unlockedItems.includes(item.id);

    if (!owned) {
      if (uLv.level.index < item.minUserLevel) {
        setStatusNote(
          isZh
            ? `🔒 需达到 Lv.${item.minUserLevel} 才可解锁【${item.name}】（下方可一键切换 Lv.0–Lv.7 等级预览或点「👑 一键试穿 UR 满配神装」）`
            : `🔒 Requires Lv.${item.minUserLevel} to unlock [${item.name}] (use level switcher below to preview)`,
        );
        return;
      }
      if (aff.level < item.minAffectionLevel) {
        setStatusNote(
          isZh
            ? `🔒 需好感达到 ♥Lv.${item.minAffectionLevel} 才可解锁【${item.name}】`
            : `🔒 Requires Affection ♥Lv.${item.minAffectionLevel} to unlock [${item.name}]`,
        );
        return;
      }
      if (state.starBeans < item.priceBeans) {
        setStatusNote(
          isZh
            ? `🪙 灵感星豆不足（需 ${item.priceBeans}🪙，可点下方「🎁 +500🪙 领测试星豆」或抽鞭子/投喂赚取）`
            : `🪙 Not enough Star Beans (needs ${item.priceBeans}🪙)`,
        );
        return;
      }
    }

    const nextEquipped = { ...state.equipped, [item.slot]: item.id };
    const triggersMudslide = isContrastMixOutfit(nextEquipped, state.speciesId);
    let newlyUnlockedMudslide: SecretQuestDef | null = null;

    commit(prev => {
      const updated: MascotSanctuaryState = {
        ...prev,
        starBeans: owned ? prev.starBeans : prev.starBeans - item.priceBeans,
        unlockedItems: owned ? prev.unlockedItems : [...prev.unlockedItems, item.id],
        equipped: { ...prev.equipped, [item.slot]: item.id },
      };
      if (triggersMudslide) {
        const res = unlockSecretQuest(updated, "fashion_mudslide", now);
        if (res.newlyUnlocked) {
          newlyUnlockedMudslide = res.quest;
        }
        return res.state;
      }
      return updated;
    });

    dispatchDinoInteract({ type: "pose" });

    if (newlyUnlockedMudslide || (triggersMudslide && !state.unlockedSecretQuests.includes("fashion_mudslide"))) {
      const quest = newlyUnlockedMudslide ?? SECRET_QUESTS.fashion_mudslide;
      celebrateSecretQuest(quest);
      setStatusNote(
        isZh
          ? `🪩 触发反差混搭彩蛋【${quest.titleZh}】· ${quest.speechZh}`
          : `🪩 Chaotic Mashup Unlocked [${quest.titleEn}] · ${quest.speechEn}`,
      );
      return;
    }

    setStatusNote(
      owned
        ? isZh
          ? `✨ 已穿戴【${item.name}】· ${item.specialQuote}`
          : `✨ Equipped [${item.name}] · ${item.specialQuote}`
        : isZh
          ? `🎉 解锁并换上【${item.name}】！穿搭评定提升！`
          : `🎉 Unlocked & equipped [${item.name}]! Style score boosted!`,
    );
    if (item.specialQuote) {
      onSpeak?.(item.specialQuote);
    }
  }

  function handleReversePuaVacation() {
    const now = Date.now();
    let unlockedQuest: SecretQuestDef | null = null;
    commit(prev => {
      const rested: MascotSanctuaryState = {
        ...prev,
        starBeans: prev.starBeans + 25,
        affectionXp: prev.affectionXp + 30,
        userXp: prev.userXp + 20,
      };
      const res = unlockSecretQuest(rested, "reverse_pua", now);
      if (res.newlyUnlocked) {
        unlockedQuest = res.quest;
      }
      return res.state;
    });
    dispatchDinoInteract({ type: "pat" });
    const quest = unlockedQuest ?? SECRET_QUESTS.reverse_pua;
    celebrateSecretQuest(quest);
    setStatusNote(
      isZh
        ? `🏖️ 【${quest.titleZh}】${quest.speechZh}（${quest.rewardLabelZh}）`
        : `🏖️ [${quest.titleEn}] ${quest.speechEn} (${quest.rewardLabelEn})`,
    );
  }

  function handleBugDevour() {
    const now = Date.now();
    let unlockedQuest: SecretQuestDef | null = null;
    commit(prev => {
      const crunched: MascotSanctuaryState = {
        ...prev,
        starBeans: prev.starBeans + 20,
        affectionXp: prev.affectionXp + 18,
        userXp: prev.userXp + 15,
      };
      const res = unlockSecretQuest(crunched, "bug_eater", now);
      if (res.newlyUnlocked) {
        unlockedQuest = res.quest;
      }
      return res.state;
    });
    spawnFoodScreenFx("🐛", isZh ? "吞噬 Bug 脆片 +20🪙 +18♥" : "Crunched Bug Chip +20🪙 +18♥");
    dispatchDinoInteract({ type: "feed", reactMode: "zoomies" });
    const quest = unlockedQuest ?? SECRET_QUESTS.bug_eater;
    celebrateSecretQuest(quest);
    setStatusNote(
      isZh
        ? `🐛 【${quest.titleZh}】${quest.speechZh}（${quest.rewardLabelZh}）`
        : `🐛 [${quest.titleEn}] ${quest.speechEn} (${quest.rewardLabelEn})`,
    );
  }

  function handleCheckNightOwlQuest() {
    const now = Date.now();
    if (!isBeijingNightOwlWindow(now)) {
      const hint = isZh
        ? "🌙 【凌晨三点的造物主】仅在北京时间 01:30–04:30 点击右下角小恐龙叹号气泡（或连续戳 3 次叹号气泡）可触发哦！"
        : "🌙 [3 AM Creator] triggers between 01:30–04:30 Beijing Time (or by poking the '!' bubble 3 times)!";
      setStatusNote(hint);
      onSpeak?.(hint);
      return;
    }
    commit(prev => {
      const res = unlockSecretQuest(prev, "midnight_creator", now);
      return res.state;
    });
    const quest = SECRET_QUESTS.midnight_creator;
    celebrateSecretQuest(quest);
    setStatusNote(
      isZh
        ? `🫖 夜猫子奇遇【${quest.titleZh}】· ${quest.speechZh}`
        : `🫖 Night-Owl Encounter [${quest.titleEn}] · ${quest.speechEn}`,
    );
  }

  const slotItems = DINO_WARDROBE_ITEMS.filter(item => item.slot === slot);
  const totalVaultUsd = Object.values(state.vaultUnlockedUsd || {}).reduce((acc, v) => acc + v, 0);
  const totalSecretsCount = SECRET_QUEST_LIST.length;

  return (
    <div className="border-b border-border/60 bg-muted/30 px-3 py-2 text-xs">
      {activeBannerQuest && (
        <SecretAchievementBanner
          quest={activeBannerQuest}
          isZh={isZh}
          onClose={() => setActiveBannerQuest(null)}
        />
      )}

      {isOnStrike && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-rose-500/60 bg-rose-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 dark:text-rose-200">
          <span>
            🕶️{" "}
            {isZh
              ? `《赛博灵龙劳动法》罢工中（${strikeRemainingSec}s）· 快点「随机盲盒投喂」哄好本龙领隐藏大奖！`
              : `Cyber Dino Labor Law Strike (${strikeRemainingSec}s) · Feed a snack now to claim secret reward!`}
          </span>
          <button
            type="button"
            onClick={handleFeed}
            className="shrink-0 rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm hover:bg-emerald-500"
          >
            {isZh ? "🧋 立即投喂哄好" : "🧋 Feed to Pacify"}
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm">{isOnStrike ? "🕶️" : spIcon}</span>
          <span className="font-bold text-foreground">{state.customName || sp.name}</span>
          <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
            Lv.{uLv.level.index} {isZh ? uLv.level.nameZh : uLv.level.nameEn}
          </span>
          <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-500">
            ♥ Lv.{aff.level}
          </span>
          <span className="rounded-full bg-yellow-500/15 px-1.5 py-0.5 text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
            🪙 {state.starBeans}
          </span>
          <span
            title={isZh ? "灵龙扭蛋币（可用于 3D 抓娃娃机与丰收转盘）" : "Dino Gacha Tokens (for 3D Claw Machine & Roulette)"}
            className="rounded-full border border-amber-400/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300"
          >
            🎰 {state.arcadeTokens}
          </span>
          <span className="rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-bold text-purple-500">
            {styleEval.grade.split(" ")[0]}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            data-testid="pi-agent-tab-toggle"
            onClick={() => setTab(current => (current === "pi" ? "none" : "pi"))}
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
              tab === "pi"
                ? "bg-emerald-600 text-white shadow-sm"
                : "border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300"
            }`}
          >
            🤖 {isZh ? "Pi 实权 Agent" : "Pi Agent"}
          </button>
          <button
            type="button"
            onClick={() => setTab(current => (current === "pet" ? "none" : "pet"))}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
              tab === "pet" ? "bg-foreground text-background" : "bg-background/80 text-muted-foreground hover:text-foreground"
            }`}
          >
            🐾 {isZh ? "互动投喂" : "Interact"}
          </button>
          <button
            type="button"
            onClick={() => setTab(current => (current === "wardrobe" ? "none" : "wardrobe"))}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
              tab === "wardrobe" ? "bg-foreground text-background" : "bg-background/80 text-muted-foreground hover:text-foreground"
            }`}
          >
            👗 {isZh ? "暖暖衣橱" : "Wardrobe"}
          </button>
          <button
            type="button"
            onClick={() => setTab(current => (current === "secrets" ? "none" : "secrets"))}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
              tab === "secrets"
                ? "bg-amber-500 text-slate-950"
                : "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-300"
            }`}
          >
            🏆 {isZh ? `彩蛋 ${state.unlockedSecretQuests.length}/${totalSecretsCount}` : `Secrets ${state.unlockedSecretQuests.length}/${totalSecretsCount}`}
          </button>
          <button
            type="button"
            onClick={() => setTab(current => (current === "adopt" ? "none" : "adopt"))}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
              tab === "adopt" ? "bg-foreground text-background" : "bg-background/80 text-muted-foreground hover:text-foreground"
            }`}
          >
            🥚 {isZh ? "灵龙契约" : "Adopt"}
          </button>
        </div>
      </div>

      {/* Always-visible 1-Click Pi Agent Copilot Bar */}
      <div
        data-testid="pi-agent-quickbar"
        className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 px-2.5 py-1.5"
      >
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-200">
          🤖 {isZh ? "Pi Agent 免确认代办：" : "Pi Agent 1-Click:"}
        </span>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            disabled={piBusy}
            data-testid="pi-agent-action-checkin"
            onClick={() => void runPiAction("checkin")}
            className="rounded-full border border-emerald-500/40 bg-background/90 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shadow-xs transition hover:bg-emerald-500/15 disabled:opacity-50 dark:text-emerald-300"
          >
            📅 {isZh ? "代签到 (+5分)" : "Check-in (+5)"}
          </button>
          <button
            type="button"
            disabled={piBusy}
            data-testid="pi-agent-action-claw"
            onClick={() => void runPiAction("claw")}
            className="rounded-full border border-amber-500/40 bg-background/90 px-2 py-0.5 text-[10px] font-bold text-amber-700 shadow-xs transition hover:bg-amber-500/15 disabled:opacity-50 dark:text-amber-300"
          >
            🕹️ {isZh ? "代抓娃娃搏锦鲤" : "Play Claw"}
          </button>
          <button
            type="button"
            disabled={piBusy}
            data-testid="pi-agent-action-market"
            onClick={() => void runPiAction("market", "")}
            className="rounded-full border border-sky-500/40 bg-background/90 px-2 py-0.5 text-[10px] font-bold text-sky-700 shadow-xs transition hover:bg-sky-500/15 disabled:opacity-50 dark:text-sky-300"
          >
            🛒 {isZh ? "挑市场工具" : "Market Tools"}
          </button>
          <button
            type="button"
            disabled={piBusy}
            data-testid="pi-agent-action-redeem"
            onClick={() => void runPiAction("redeem", piPrompt)}
            className="rounded-full border border-rose-500/40 bg-background/90 px-2 py-0.5 text-[10px] font-bold text-rose-700 shadow-xs transition hover:bg-rose-500/15 disabled:opacity-50 dark:text-rose-300"
          >
            🎁 {isZh ? "5分秒兑周报" : "5pt Redeem"}
          </button>
          <button
            type="button"
            disabled={piBusy}
            data-testid="pi-agent-action-scaffold"
            onClick={() => void runPiAction("scaffold", piPrompt || "农客松智慧农业多模态监测 Agent")}
            className="rounded-full border border-purple-500/40 bg-background/90 px-2 py-0.5 text-[10px] font-bold text-purple-700 shadow-xs transition hover:bg-purple-500/15 disabled:opacity-50 dark:text-purple-300"
          >
            📝 {isZh ? "一键建参赛项目" : "New Project"}
          </button>
        </div>
      </div>

      {statusNote && (
        <p className="mt-1.5 rounded-lg bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground">
          {statusNote}
        </p>
      )}

      {/* Live 3D Wardrobe & Interaction Stage when in "pet" or "wardrobe" tab */}
      {(tab === "pet" || tab === "wardrobe") && (
        <div className="mt-2 overflow-hidden rounded-xl border border-emerald-500/35 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-900/90 p-2 text-white shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-1 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                🦖 {isZh ? "3D 闪耀暖暖换装 & 互动舞台" : "3D Live Wardrobe & Stage"}
              </span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                {kaomojiBadge}
              </span>
            </div>
            <span className="text-[10px] font-bold text-purple-300">
              ✨ {isZh ? `时尚战力 ${styleEval.totalScore}` : `Style ${styleEval.totalScore}`} · {styleEval.grade}
            </span>
          </div>

          <div className="relative flex flex-col sm:flex-row items-center gap-2">
            <div className="relative h-[148px] w-full sm:w-[170px] shrink-0 overflow-hidden rounded-xl border border-white/15 bg- radial from-emerald-500/15 via-slate-900 to-slate-950">
              {canRenderWebGLStage ? (
                <iframe
                  title={isZh ? "3D 灵龙换装互动舞台" : "3D Dino Interactive Stage"}
                  src="/mascot/3d/embed.html?dock=1&v=sanctuary-20261017-v2"
                  className="ans-sanctuary-stage-frame h-full w-full border-0 bg-transparent"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-center text-[11px] text-emerald-200">
                  <span className="text-2xl">{spIcon}</span>
                  <span>{state.customName || sp.name}</span>
                </div>
              )}
              {isOverclocked && !isOnStrike && (
                <span className="pointer-events-none absolute top-1.5 left-1.5 rounded-full bg-rose-600/90 px-2 py-0.5 text-[9px] font-black text-white shadow">
                  🔥 2.4x 超频干活中
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col justify-between gap-1.5 w-full">
              {/* Work Drive KPI Progress Bar */}
              <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-emerald-300">
                    ⚡ {isZh ? "干活劲头 KPI" : "Work Drive KPI"}
                  </span>
                  <span className="font-black text-amber-300">
                    {workDrivePct}% {isOverclocked ? "· 🔥240%超频" : ""}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all duration-300"
                    style={{ width: `${workDrivePct}%` }}
                  />
                </div>
              </div>

              {/* 360° Turntable & Pose Controls */}
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => handleTurntable(-Math.PI / 4, false)}
                  className="rounded-lg border border-white/15 bg-white/10 px-1.5 py-1 text-[10px] font-bold text-white transition hover:bg-white/20"
                >
                  ◀ {isZh ? "左转45°" : "Left 45°"}
                </button>
                <button
                  type="button"
                  onClick={() => handleTurntable(0, true)}
                  className={`rounded-lg border px-1.5 py-1 text-[10px] font-bold transition ${
                    turntableSpin
                      ? "border-amber-400 bg-amber-500/30 text-amber-200"
                      : "border-white/15 bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  🔄 {isZh ? "360°旋转" : "360° Spin"}
                </button>
                <button
                  type="button"
                  onClick={() => handleTurntable(Math.PI / 4, false)}
                  className="rounded-lg border border-white/15 bg-white/10 px-1.5 py-1 text-[10px] font-bold text-white transition hover:bg-white/20"
                >
                  ▶ {isZh ? "右转45°" : "Right 45°"}
                </button>
                <button
                  type="button"
                  onClick={handlePose}
                  className="rounded-lg border border-purple-400/40 bg-purple-500/25 px-1.5 py-1 text-[10px] font-bold text-purple-200 transition hover:bg-purple-500/35"
                >
                  📸 {isZh ? "街拍Pose" : "Pose"}
                </button>
              </div>

              {/* Current Equipped Summary */}
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-300">
                <span className="font-semibold text-slate-400">{isZh ? "当前穿戴：" : "Equipped:"}</span>
                {styleEval.equippedItems.length > 0 ? (
                  styleEval.equippedItems.map(eq => (
                    <span
                      key={eq.id}
                      className="rounded-md border border-white/10 bg-white/10 px-1.5 py-0.2 text-[9px] font-semibold text-amber-200"
                    >
                      {eq.icon} {eq.name}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-400">{isZh ? "初心裸龙装束" : "Default Starter"}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "pi" && (
        <div
          data-testid="pi-agent-pod"
          className="mt-2 space-y-2 rounded-xl border border-emerald-500/40 bg-background/95 p-2.5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300">
              ⚡ {isZh ? "小恐龙 Pi Agent 实权执行舱（免报价确认 · 直接读写数据库）" : "Dino Pi Agent Execution Pod (Zero-Confirmation)"}
            </span>
            {piBusy && (
              <span className="animate-pulse rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                {isZh ? "Pi 工具执行中…" : "Executing…"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="search"
              value={piPrompt}
              onChange={e => setPiPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void runPiAction("auto", piPrompt);
                }
              }}
              placeholder={
                isZh
                  ? "输入指令：如「帮我新建智慧温室项目」「搜论文润色工具」「帮我抓娃娃」…"
                  : "Command Pi Agent: e.g. 'Create smart greenhouse project', 'Search paper tools'…"
              }
              aria-label={isZh ? "Pi Agent 指令输入" : "Pi Agent command input"}
              data-testid="pi-agent-search-input"
              className="flex-1 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={piBusy}
              data-testid="pi-agent-run-btn"
              onClick={() => void runPiAction("auto", piPrompt)}
              className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {isZh ? "⚡ 执行" : "⚡ Run"}
            </button>
          </div>

          {piResult && (
            <div
              data-testid="pi-agent-result"
              className="space-y-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-2 text-[11px]"
            >
              {piResult.toolUsed && (
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/15 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
                    ✓ Pi Tool: {piResult.toolUsed}
                  </span>
                  {typeof piResult.balancePoints === "number" && (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-300">
                      {isZh ? `当前余额：${piResult.balancePoints.toFixed(1)} 积分` : `Balance: ${piResult.balancePoints.toFixed(1)} pts`}
                    </span>
                  )}
                </div>
              )}
              <p className="whitespace-pre-line leading-relaxed text-foreground">
                {(isZh ? piResult.replyZh : piResult.replyEn).replace(/\*\*/g, "")}
              </p>
              {piResult.links && piResult.links.length > 0 && (
                <div className="grid grid-cols-1 gap-1 pt-1">
                  {piResult.links.map(link => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="flex items-center justify-between rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:border-emerald-500/50 hover:bg-emerald-500/10"
                    >
                      <div className="truncate">
                        <span className="font-bold text-emerald-700 dark:text-emerald-300">{link.title}</span>
                        <span className="ml-1.5 text-[10px] text-muted-foreground">{link.detail}</span>
                      </div>
                      <span className="ml-2 shrink-0 text-[10px] font-bold text-emerald-600">→</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "pet" && (
        <div className="mt-2 space-y-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={handleWhip}
              className="flex items-center justify-between rounded-xl border border-rose-500/35 bg-rose-500/10 px-2.5 py-1.5 text-left text-[11px] font-bold text-rose-600 hover:bg-rose-500/20 dark:text-rose-300"
            >
              <span>🪢 {isZh ? "抽一鞭子催干活" : "Crack Whip"}</span>
              <span className="text-[10px] opacity-80">+15🪙</span>
            </button>
            <button
              type="button"
              onClick={handleFeed}
              className="flex items-center justify-between rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1.5 text-left text-[11px] font-bold text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-300"
            >
              <span>🎲 {isZh ? "随机盲盒投喂" : "Blind-Box Snack"}</span>
              <span className="text-[10px] opacity-80">{isOnStrike ? (isZh ? "哄好领奖!" : "Pacify!") : "+SSR/♥"}</span>
            </button>
            <button
              type="button"
              onClick={handlePat}
              className="flex items-center justify-between rounded-xl border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-left text-[11px] font-bold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
            >
              <span>🤚 {isZh ? "摸摸头顺毛" : "Pat Head"}</span>
              <span className="text-[10px] opacity-80">+15♥</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={handleReversePuaVacation}
              className="flex items-center justify-between rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1.5 text-left text-[11px] font-semibold text-cyan-700 hover:bg-cyan-500/15 dark:text-cyan-300"
            >
              <span>🏖️ {isZh ? "给龙放假5分钟" : "5m Dino Vacation"}</span>
              <span className="text-[10px] opacity-80">{isZh ? "反PUA彩蛋" : "Reverse-PUA"}</span>
            </button>
            <button
              type="button"
              onClick={handleBugDevour}
              className="flex items-center justify-between rounded-xl border border-purple-500/25 bg-purple-500/10 px-2.5 py-1.5 text-left text-[11px] font-semibold text-purple-700 hover:bg-purple-500/15 dark:text-purple-300"
            >
              <span>🐛 {isZh ? "吞噬 Bug 脆片" : "Crunch Bug Chip"}</span>
              <span className="text-[10px] opacity-80">{isZh ? "化崩为宝" : "Bug→Coins"}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              const outfitNames = styleEval.equippedItems.map(i => i.name).join(" + ") || "初心装束";
              const promptText = `你是我的 ANS 专属灵龙 Agent【${state.customName || sp.name}】（血统：${sp.name} · ${sp.mbti}，当前穿戴：${outfitNames}，时尚战力：${styleEval.totalScore} ${styleEval.grade}，主导风格：#${styleEval.dominantTag}${isOverclocked ? "，当前处于 300% 超频狂暴干活状态" : ""}）。请发挥你的【${sp.agentSpecialty}】特长，用高密度、零废话的专业视角帮我拆解接下来的任务并给出可直接落地的执行清单：`;
              if (navigator.clipboard?.writeText) {
                void navigator.clipboard.writeText(promptText);
              }
              onInjectPrompt?.(promptText);
              commit(prev => ({ ...prev, starBeans: prev.starBeans + 10, totalAgentChats: prev.totalAgentChats + 1 }));
              advanceAndClaimQuest("daily_agent_feed");
              setStatusNote(
                isZh
                  ? `📋 已注入并复制【#${styleEval.dominantTag}·${sp.name}】专属 Agent 咒语 (+10🪙)！`
                  : `📋 Injected & copied [#${styleEval.dominantTag}·${sp.name}] Agent prompt (+10🪙)!`,
              );
              onSpeak?.(promptText);
            }}
            className="flex w-full items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-left text-[11px] font-semibold text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
          >
            <span>
              ⚡ {isZh ? `一键生成【#${styleEval.dominantTag}穿搭×${sp.name}】专属 Agent 咒语` : `Inject [#${styleEval.dominantTag} × ${sp.name}] Agent Prompt`}
            </span>
            <span className="text-[10px] opacity-85">{isOverclocked ? "🔥+10🪙" : "+10🪙"}</span>
          </button>
        </div>
      )}

      {tab === "wardrobe" && (
        <div className="mt-2 space-y-2">
          {/* 4 Dragon Species Lineage Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-1 rounded-xl border border-border/70 bg-background/70 px-2 py-1">
            <span className="text-[10px] font-bold text-muted-foreground">
              🧬 {isZh ? "灵龙血统：" : "Lineage:"}
            </span>
            <div className="flex flex-wrap gap-1">
              {DINO_SPECIES_LIST.map(entry => {
                const active = state.speciesId === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => handleSpeciesChange(entry.id)}
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition ${
                      active
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {SPECIES_ICONS[entry.id]} {entry.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1-Click Preset Outfits & Star Beans Boost */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={handleEquipTripoSet}
              className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 hover:bg-amber-500/25 dark:text-amber-300"
            >
              🧋 {isZh ? "试穿 Tripo 3D 喷射套装" : "Try Tripo 3D Boba Set"}
            </button>
            <button
              type="button"
              onClick={handleEquipUrGodSet}
              className="rounded-lg border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-700 hover:bg-purple-500/25 dark:text-purple-300"
            >
              👑 {isZh ? "一键试穿 UR 满配神装" : "Equip UR God Set"}
            </button>
            <button
              type="button"
              onClick={() => {
                commit(prev => ({
                  ...prev,
                  starBeans: prev.starBeans + 500,
                  affectionXp: prev.affectionXp + 120,
                }));
                setStatusNote(
                  isZh
                    ? "🎁 已领取 +500🪙 灵感星豆与 +120♥ 好感度，快去解锁心仪穿搭吧！"
                    : "🎁 Claimed +500🪙 Star Beans & +120♥ Affection!",
                );
              }}
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300"
            >
              🎁 {isZh ? "+500🪙 领测试星豆" : "+500🪙 Free Beans"}
            </button>
          </div>

          {/* 5 Wardrobe Slot Tabs + Level Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-1">
            <div className="flex flex-wrap gap-1">
              {(Object.keys(WARDROBE_SLOT_LABELS) as WardrobeSlot[]).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSlot(key)}
                  className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${
                    slot === key ? "bg-amber-500/20 text-amber-600 dark:text-amber-300" : "bg-background/70 text-muted-foreground"
                  }`}
                >
                  {WARDROBE_SLOT_LABELS[key].icon} {WARDROBE_SLOT_LABELS[key].label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => commit(prev => ({ ...prev, userXp: (prev.userXp + 600) % 6000, starBeans: prev.starBeans + 200, affectionXp: prev.affectionXp + 80 }))}
              className="rounded-lg border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
              title={isZh ? "模拟提升个人荣誉等级与星豆" : "Simulate level & Star Beans boost"}
            >
              {isZh ? `升级 Lv.${uLv.level.index}↻` : `Lv.${uLv.level.index}↻`}
            </button>
          </div>

          {/* Slot Items Grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {slotItems.map(item => {
              const owned = state.unlockedItems.includes(item.id);
              const equipped = state.equipped[item.slot] === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleEquipOrBuy(item.id, Date.now())}
                  className={`flex items-center justify-between rounded-xl border px-2 py-1.5 text-left text-[11px] transition ${
                    equipped
                      ? "border-amber-500/60 bg-amber-500/10 font-bold"
                      : "border-border/60 bg-background/70 hover:border-amber-500/40"
                  }`}
                >
                  <span className="truncate">
                    {item.icon} {item.name}
                  </span>
                  <span className="ml-1 shrink-0 text-[10px] text-muted-foreground">
                    {equipped ? (isZh ? "穿戴中" : "Equipped") : owned ? (isZh ? "可换装" : "Equip") : `Lv.${item.minUserLevel}·${item.priceBeans}🪙`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Lv.0 - Lv.7 Quick Level Preview Bar */}
          <div className="flex flex-wrap items-center justify-between gap-1 rounded-lg border border-border/60 bg-background/60 px-2 py-1">
            <span className="text-[10px] text-muted-foreground">
              🎚️ {isZh ? "切换等级预览解锁：" : "Preview Level:"}
            </span>
            <div className="flex flex-wrap gap-1">
              {LEVELS.map(tier => (
                <button
                  key={tier.index}
                  type="button"
                  onClick={() => {
                    commit(prev => ({
                      ...prev,
                      userXp: tier.minXp,
                      affectionXp: Math.max(prev.affectionXp, tier.index * 160),
                    }));
                    setStatusNote(
                      isZh
                        ? `🎖️ 已切换预览等级至 Lv.${tier.index}【${tier.nameZh}】！`
                        : `🎖️ Switched level preview to Lv.${tier.index} [${tier.nameEn}]`,
                    );
                  }}
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition ${
                    uLv.level.index === tier.index
                      ? "bg-amber-500 text-slate-950"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Lv.{tier.index}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "secrets" && (
        <div className="mt-2 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px]">
            <span className="font-bold text-amber-700 dark:text-amber-300">
              🏆 {isZh ? "反常识隐藏彩蛋图鉴" : "Counter-Intuitive Secret Quests"} ({state.unlockedSecretQuests.length}/{totalSecretsCount})
            </span>
            <span className="font-semibold text-amber-600 dark:text-amber-200">
              {isZh
                ? `已累计解锁金库额度 $${totalVaultUsd} · 扭蛋币 ${state.arcadeTokens} 枚`
                : `Vault Unlocked $${totalVaultUsd} · ${state.arcadeTokens} Gacha Tokens`}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {SECRET_QUEST_LIST.map(quest => {
              const unlocked = state.unlockedSecretQuests.includes(quest.id);
              return (
                <div
                  key={quest.id}
                  className={`flex items-start justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-[11px] ${
                    unlocked
                      ? "border-amber-500/60 bg-gradient-to-r from-amber-500/15 to-yellow-500/10"
                      : "border-border/60 bg-background/70 opacity-85"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-foreground">
                        {quest.icon} {isZh ? `【${quest.titleZh}】` : quest.titleEn}
                      </span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                          unlocked
                            ? "bg-amber-500 text-slate-950"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {unlocked ? (isZh ? "已解锁" : "UNLOCKED") : quest.code}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {unlocked
                        ? isZh
                          ? quest.speechZh
                          : quest.speechEn
                        : isZh
                          ? `线索：${quest.hintZh}`
                          : `Hint: ${quest.hintEn}`}
                    </p>
                    <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-300">
                      🎁 {isZh ? quest.rewardLabelZh : quest.rewardLabelEn}
                    </p>
                  </div>
                  {quest.id === "midnight_creator" && !unlocked && (
                    <button
                      type="button"
                      onClick={handleCheckNightOwlQuest}
                      className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-500/25 dark:text-amber-200"
                    >
                      {isZh ? "🫖 打卡" : "🫖 Check"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "adopt" && (
        <div className="mt-2">
          <DinoAdoptionPod compact />
        </div>
      )}
    </div>
  );
}
