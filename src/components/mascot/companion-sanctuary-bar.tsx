"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import {
  DINO_SPECIES,
  DINO_WARDROBE_ITEMS,
  SANCTUARY_EVENT_NAME,
  SECRET_QUESTS,
  WARDROBE_SLOT_LABELS,
  calculateStyleEvaluation,
  getAffectionProgress,
  isBeijingNightOwlWindow,
  isContrastMixOutfit,
  loadSanctuaryState,
  saveSanctuaryState,
  unlockSecretQuest,
  type MascotSanctuaryState,
  type SecretQuestDef,
  type WardrobeSlot,
} from "@/domain/mascot/sanctuary";
import { advanceAndClaimQuest } from "@/domain/mascot/quest-arcade";
import { DinoAdoptionPod } from "./dino-adoption-pod";

import {
  BLIND_BOX_FOODS,
  SHOWCASE_MOOD_PRESETS,
  dispatchDinoInteract,
  pickMoodSub,
  pickMoodText,
  spawnFoodScreenFx,
  spawnWhipScreenFx,
  type DinoReactMode,
  type ShowcaseMoodPreset,
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
  const ui = useTranslations("companion");
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
              🏆 {ui("bar.bannerSecretQUESTUNLOCKED")} · {quest.code}
            </span>
            <span className="rounded-full border border-amber-400/50 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-200">
              {quest.icon} {isZh ? quest.badgeZh : quest.badgeEn}
            </span>
          </div>
          <p className="pt-0.5 text-xs font-extrabold text-amber-900 dark:text-amber-100">
            {ui("bar.bannerQuestTitleEn", { title: isZh ? quest.titleZh : quest.titleEn })}{" "}
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
          aria-label={ui("bar.bannerDismissAchievementBanner")}
          className="shrink-0 rounded-full px-1.5 py-0.5 text-xs font-bold text-amber-700 hover:bg-amber-500/20 dark:text-amber-200"
        >
          ×
        </button>
      </div>
    </div>
  );
}

const HOVER_MOOD_IDS = ["hover0", "hover1", "hover2", "hover3", "hover4"] as const;
const CLICK_MOOD_IDS = ["click0", "click1", "click2", "click3", "click4", "click5"] as const;
const WHIP_MOOD_IDS = ["whip0", "whip1", "whip2", "whip3", "whip4", "whip5", "whip6", "whip7"] as const;
const MACRO_MOOD_IDS = ["macro0", "macro1", "macro2", "macro3"] as const;
const IDLE_MOOD_IDS = [
  "happy_smile",
  "starry_excited",
  "curious_tilt",
  "cozy_chill",
  "sleepy_stretch",
  "focused_think",
  "aha_spark",
] as const;

function findMoodPreset(id: string): ShowcaseMoodPreset {
  return SHOWCASE_MOOD_PRESETS[id] ?? SHOWCASE_MOOD_PRESETS.happy_smile;
}

/** 套装名从道具表推导（写死清单会与 catalog 漂移，之前就写出了一个不存在的物品名）。 */
const WARDROBE_NAME_BY_ID = new Map(DINO_WARDROBE_ITEMS.map(entry => [entry.id, entry.name]));
const wardrobeSetLabel = (ids: string[]) => ids.map(id => WARDROBE_NAME_BY_ID.get(id) ?? id).join(" + ");

/** 盲盒奖励区间直接从道具表推导，避免按钮写死一个与真实奖励不符的数字。 */
const BLIND_BOX_COIN_RANGE = {
  min: Math.min(...BLIND_BOX_FOODS.map(item => item.coins)),
  max: Math.max(...BLIND_BOX_FOODS.map(item => item.coins)),
};

export function CompanionQuestPin({
  dialogOpen = false,
  onTriggerSpeech,
}: {
  dialogOpen?: boolean;
  onTriggerSpeech?: (text: string) => void;
}) {
  const locale = useLocale();
  const ui = useTranslations("companion");
  const isZh = locale === "zh";
  const [state, setState] = useState<MascotSanctuaryState>(() => loadSanctuaryState());
  const wardrobeDialogRef = useRef<HTMLDivElement | null>(null);
  const adoptDialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [alertMode, setAlertMode] = useState(true);
  const [alertDimmed, setAlertDimmed] = useState(false);
  const [activeMood, setActiveMood] = useState<ShowcaseMoodPreset>(() => SHOWCASE_MOOD_PRESETS.happy_smile);
  const [customSubText, setCustomSubText] = useState<string | null>(null);
  const [macroActive, setMacroActive] = useState(false);
  const [sanctuaryModal, setSanctuaryModal] = useState<"none" | "wardrobe" | "adopt">("none");
  const [wardrobeSlot, setWardrobeSlot] = useState<WardrobeSlot>("headwear");
  const [wardrobeNote, setWardrobeNote] = useState<string>("");
  const [pinBannerQuest, setPinBannerQuest] = useState<SecretQuestDef | null>(null);
  const [nowTs, setNowTs] = useState(0);
  const [bubblePos, setBubblePos] = useState<{ left: string; bottom: string }>({
    left: "calc(100vw - 82px)",
    bottom: "136px",
  });

  const clickCountRef = useRef(0);
  const hoverIdxRef = useRef(0);
  const clickIdxRef = useRef(0);
  const whipIdxRef = useRef(0);
  const moodIdxRef = useRef(0);
  const lastUserInteractRef = useRef(0);
  // 「Agent / 工作模式」两个入口放进小恐龙面板内部（面板里预留了 .ans-companion-dock-slot）。
  // 面板是 Radix Popover，挂载时机晚于本组件，所以这里轮询几次找槽位，避免时序问题。
  const [dockSlot, setDockSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!dialogOpen) { setDockSlot(null); return; }
    let cancelled = false;
    let tries = 0;
    const find = () => {
      if (cancelled) return;
      const slot = document.querySelector<HTMLElement>("#ans-companion-panel .ans-companion-dock-slot");
      if (slot) { setDockSlot(slot); return; }
      if (++tries <= 20) window.setTimeout(find, 50);
    };
    find();
    return () => { cancelled = true; };
  }, [dialogOpen]);

  const whipTimestampsRef = useRef<number[]>([]);

  // Sync sanctuary state across tabs & components
  useEffect(() => {
    const sync = () => {
      setNowTs(Date.now());
      setState(loadSanctuaryState());
    };
    window.addEventListener(SANCTUARY_EVENT_NAME, sync);
    window.addEventListener("ans:sanctuary-updated", sync);
    window.addEventListener("ans-sanctuary-sync", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SANCTUARY_EVENT_NAME, sync);
      window.removeEventListener("ans:sanctuary-updated", sync);
      window.removeEventListener("ans-sanctuary-sync", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function commitSanctuary(updater: (prev: MascotSanctuaryState) => MascotSanctuaryState) {
    setNowTs(Date.now());
    setState(prev => {
      const next = updater(prev);
      saveSanctuaryState(next);
      return next;
    });
  }

  // Dim the '!' alert pin after 3 seconds of no interaction (matching showcase.js)
  useEffect(() => {
    if (!alertMode) return;
    const timer = window.setTimeout(() => setAlertDimmed(true), 3000);
    return () => window.clearTimeout(timer);
  }, [alertMode]);

  // 只在用户真的和小恐龙互动（悬停/点击/聚焦/打开面板）时才加载 3D 场景（约 9MB）。
  // 此前是挂载即 dispatch，等于每个页面首屏都预下载整套 WebGL 资源。
  useEffect(() => {
    if (typeof window === "undefined" || typeof WebGLRenderingContext === "undefined") return;
    const root = document.querySelector(".ans-dino-guide");
    if (!root) return;
    let activated = false;
    const activate = () => {
      if (activated) return;
      activated = true;
      window.dispatchEvent(new CustomEvent("ans:dino-activate"));
      cleanup();
    };
    const cleanup = () => {
      root.removeEventListener("pointerenter", activate);
      root.removeEventListener("pointerdown", activate);
      root.removeEventListener("focusin", activate);
    };
    root.addEventListener("pointerenter", activate);
    root.addEventListener("pointerdown", activate);
    root.addEventListener("focusin", activate);
    return cleanup;
  }, []);

  // 抽屉的焦点管理：打开时把焦点移进 dialog，关闭时还给触发它的元素。
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (sanctuaryModal === "none") {
      lastFocusedRef.current?.focus?.();
      return;
    }
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target = sanctuaryModal === "wardrobe" ? wardrobeDialogRef.current : adoptDialogRef.current;
    target?.focus();
  }, [sanctuaryModal]);

  // 抽屉打开时把 Tab 限制在 dialog 内：此前键盘用户 Tab 几下就会走到背景页面。
  useEffect(() => {
    if (sanctuaryModal === "none") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const dialog = sanctuaryModal === "wardrobe" ? wardrobeDialogRef.current : adoptDialogRef.current;
      if (!dialog) return;
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      ).filter(element => !element.hasAttribute("disabled"));
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [sanctuaryModal]);

  // Keep body classes synchronized with macroActive and sanctuaryModal
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("ans-dino-interactive-mode", macroActive);
    document.body.classList.toggle("ans-sanctuary-open", sanctuaryModal !== "none");
    return () => {
      document.body.classList.remove("ans-dino-interactive-mode", "ans-sanctuary-open");
    };
  }, [macroActive, sanctuaryModal]);

  // Dynamically position #ans-dino-live-bubble right above .ans-dino-trigger (matching showcase.js syncBubblePos)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updatePosition = () => {
      const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
      const vh = window.innerHeight || document.documentElement.clientHeight || 800;
      if (macroActive && sanctuaryModal === "none") {
        const dinoBottom = 184;
        const dinoHeight = Math.min(290, Math.round(vh * 0.36));
        const topY = Math.max(240, Math.min(vh - 76, dinoBottom + dinoHeight + 6));
        setBubblePos({
          left: `${Math.round(vw * 0.5)}px`,
          bottom: `${Math.round(topY)}px`,
        });
        return;
      }
      const host = document.querySelector<HTMLElement>(".ans-dino-guide .ans-dino-trigger");
      if (host) {
        const rect = host.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          let cx = rect.left + rect.width * 0.5;
          let topY = vh - rect.top - 6;
          if (!alertMode) {
            const halfW = 180;
            cx = Math.max(halfW + 14, Math.min(vw - halfW - 14, cx));
            topY = Math.max(80, Math.min(vh - 96, topY));
          } else {
            cx = Math.max(28, Math.min(vw - 28, cx));
            topY = Math.max(60, Math.min(vh - 48, topY));
          }
          setBubblePos({
            left: `${Math.round(cx)}px`,
            bottom: `${Math.round(topY)}px`,
          });
        }
      }
    };
    updatePosition();
    // 事件驱动替代 90ms 永久轮询：此前每秒约 11 次 setState + 重排整个面板子树（全站常驻组件）。
    const host = document.querySelector<HTMLElement>(".ans-dino-guide .ans-dino-trigger");
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    if (host && observer) observer.observe(host);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const frame = window.requestAnimationFrame(updatePosition);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.cancelAnimationFrame(frame);
    };
  }, [alertMode, macroActive, sanctuaryModal]);

  // Autonomous Mood & Rambling Cycle (every 4.2s, matching showcase.js)
  useEffect(() => {
    if (alertMode) return;
    const timer = window.setInterval(() => {
      setNowTs(Date.now());
      if (performance.now() - lastUserInteractRef.current < 3600) return;
      moodIdxRef.current += 1;
      if (macroActive) {
        const id = MACRO_MOOD_IDS[moodIdxRef.current % MACRO_MOOD_IDS.length];
        const preset = findMoodPreset(id);
        const cur = loadSanctuaryState();
        const sp = DINO_SPECIES[cur.speciesId] || DINO_SPECIES.mint_star;
        const eqCount = Object.values(cur.equipped || {}).filter(Boolean).length;
        setActiveMood(preset);
        setCustomSubText(
          ui("bar.hudSpNameEqCountEquipped", { name: sp.name, eqCount: eqCount }),
        );
        dispatchDinoInteract({ action: "mood", mood: preset });
      } else {
        const id = IDLE_MOOD_IDS[moodIdxRef.current % IDLE_MOOD_IDS.length];
        const preset = findMoodPreset(id);
        setActiveMood(preset);
        setCustomSubText(null);
        dispatchDinoInteract({ action: "mood", mood: preset });
      }
    }, 4200);
    return () => window.clearInterval(timer);
  }, [alertMode, macroActive, isZh, ui]);

  useEffect(() => {
    if (!pinBannerQuest) return;
    const timer = window.setTimeout(() => setPinBannerQuest(null), 8500);
    return () => window.clearTimeout(timer);
  }, [pinBannerQuest]);

  const triggerHoverReaction = (hovering: boolean) => {
    if (!hovering) {
      dispatchDinoInteract({ action: "hover", hover: false });
      return;
    }
    lastUserInteractRef.current = performance.now();
    setAlertMode(false);
    setAlertDimmed(false);
    const id = HOVER_MOOD_IDS[hoverIdxRef.current % HOVER_MOOD_IDS.length];
    hoverIdxRef.current += 1;
    const preset = findMoodPreset(id);
    setActiveMood(preset);
    setCustomSubText(null);
    dispatchDinoInteract({ action: "hover", hover: true, mood: preset });
  };

  const enterMacroMode = () => {
    lastUserInteractRef.current = performance.now();
    clickCountRef.current = 3;
    setAlertMode(false);
    setAlertDimmed(false);
    setMacroActive(true);
    const preset = findMoodPreset("macro0");
    setActiveMood(preset);
    setCustomSubText(null);
    dispatchDinoInteract({ action: "macro", active: true, mood: preset });
    onTriggerSpeech?.(preset.text);
  };

  const exitMacroMode = () => {
    lastUserInteractRef.current = performance.now();
    clickCountRef.current = 0;
    setSanctuaryModal("none");
    setMacroActive(false);
    const preset = findMoodPreset("happy_smile");
    setActiveMood(preset);
    setCustomSubText(null);
    dispatchDinoInteract({
      action: "macro",
      active: false,
      mood: preset,
    });
    dispatchDinoInteract({ type: "turntable", spin: false });
  };

  function navigateToWorkMode() {
    exitMacroMode();
    if (typeof window !== "undefined" && window.location.pathname === "/workspace") {
      const el = document.querySelector('[data-testid="pi-codex-workbench"]');
      if (el && "scrollIntoView" in el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => document.getElementById("codex-composer-input")?.focus(), 80);
      return;
    }
    window.location.href = "/workspace";
  }

  const triggerStageClick = () => {
    const now = Date.now();
    lastUserInteractRef.current = performance.now();
    setAlertMode(false);
    setAlertDimmed(false);

    // Night-Owl Secret Quest check (01:30 - 04:30 Beijing Time)
    if (isBeijingNightOwlWindow(now)) {
      const current = loadSanctuaryState();
      if (!current.unlockedSecretQuests.includes("midnight_creator")) {
        const { state: nextState, newlyUnlocked, quest } = unlockSecretQuest(current, "midnight_creator", now);
        if (newlyUnlocked) {
          saveSanctuaryState(nextState);
          setState(nextState);
          setPinBannerQuest(quest);
        }
      }
    }

    if (!macroActive) {
      clickCountRef.current += 1;
      if (clickCountRef.current >= 3) {
        enterMacroMode();
        return;
      }
      const id = CLICK_MOOD_IDS[clickIdxRef.current % CLICK_MOOD_IDS.length];
      clickIdxRef.current += 1;
      const preset = findMoodPreset(id);
      setActiveMood(preset);
      setCustomSubText(null);
      dispatchDinoInteract({ action: "click", mood: preset });
      onTriggerSpeech?.(preset.text);
      return;
    }

    // Already in macro mode: playful click reaction + bonus Star Beans
    const id = CLICK_MOOD_IDS[clickIdxRef.current % CLICK_MOOD_IDS.length];
    clickIdxRef.current += 1;
    const preset = findMoodPreset(id);
    commitSanctuary(prev => ({
      ...prev,
      starBeans: prev.starBeans + 5,
      affectionXp: prev.affectionXp + 4,
    }));
    setActiveMood(preset);
    setCustomSubText(null);
    dispatchDinoInteract({ action: "click", mood: preset });
    onTriggerSpeech?.(preset.text);
  };

  // Listen for hover, click, macro-stage & Escape key events dispatched from .ans-dino-trigger or AI chat popover
  useEffect(() => {
    const onStageHover = (event: Event) => {
      const custom = event as CustomEvent<{ hover?: boolean }>;
      triggerHoverReaction(Boolean(custom.detail?.hover));
    };
    const onStageClick = () => {
      triggerStageClick();
    };
    const onEnterMacro = (event: Event) => {
      const custom = event as CustomEvent<{ drawer?: "wardrobe" | "adopt" }>;
      enterMacroMode();
      if (custom.detail?.drawer) {
        setSanctuaryModal(custom.detail.drawer);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (sanctuaryModal !== "none") {
          setSanctuaryModal("none");
        } else if (macroActive) {
          exitMacroMode();
        }
      }
    };
    window.addEventListener("ans:dino-stage-hover", onStageHover);
    window.addEventListener("ans:dino-stage-click", onStageClick);
    window.addEventListener("ans:enter-dino-macro", onEnterMacro);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("ans:dino-stage-hover", onStageHover);
      window.removeEventListener("ans:dino-stage-click", onStageClick);
      window.removeEventListener("ans:enter-dino-macro", onEnterMacro);
      window.removeEventListener("keydown", onKeyDown);
    };
  });

  function handleWhipAction(e?: React.MouseEvent) {
    e?.stopPropagation();
    const now = Date.now();
    lastUserInteractRef.current = performance.now();
    setAlertMode(false);
    setAlertDimmed(false);

    // Check 7-whip Cyber Dino Labor Law strike
    const recent = whipTimestampsRef.current.filter(ts => now - ts <= 10_000);
    recent.push(now);
    whipTimestampsRef.current = recent;

    if (recent.length >= 7) {
      whipTimestampsRef.current = [];
      const strikeEnd = now + 30_000;
      commitSanctuary(prev => ({
        ...prev,
        totalWhips: prev.totalWhips + 1,
        strikeUntil: strikeEnd,
        workBoostUntil: 0,
      }));
      const protestMood: ShowcaseMoodPreset = {
        id: "strike",
        kaomoji: "(╬▔皿▔)╯🕶️",
        text: ui("bar.hudStopWhippingByThe"),
        sub: ui("bar.hudOnStrikeClickRandom"),
        gesture: "whip",
        blush: 0.9,
        happy: 0.2,
        star: 1.0,
        mouth: 1.0,
      };
      setActiveMood(protestMood);
      setCustomSubText(protestMood.sub);
      dispatchDinoInteract({ type: "whip", mood: protestMood });
      onTriggerSpeech?.(protestMood.text);
      return;
    }

    const id = WHIP_MOOD_IDS[whipIdxRef.current % WHIP_MOOD_IDS.length];
    whipIdxRef.current += 1;
    const preset = findMoodPreset(id);
    commitSanctuary(prev => ({
      ...prev,
      totalWhips: prev.totalWhips + 1,
      starBeans: prev.starBeans + 25,
      affectionXp: prev.affectionXp + 8,
      userXp: prev.userXp + 20,
      workBoostUntil: now + 180_000,
    }));
    spawnWhipScreenFx(preset.sub.replace(/^\(|\)$/g, ""));
    setActiveMood(preset);
    setCustomSubText(null);
    dispatchDinoInteract({ type: "whip", mood: preset });
    onTriggerSpeech?.(preset.text);
  }

  function handleFeedAction(e?: React.MouseEvent) {
    e?.stopPropagation();
    const now = Date.now();
    lastUserInteractRef.current = performance.now();
    setAlertMode(false);
    setAlertDimmed(false);

    const current = loadSanctuaryState();
    // If on strike, feeding pacifies the strike and unlocks Secret Quest #2!
    if (current.strikeUntil > now) {
      const pacified: MascotSanctuaryState = {
        ...current,
        strikeUntil: 0,
        totalFeeds: current.totalFeeds + 1,
        starBeans: current.starBeans + 35,
        affectionXp: current.affectionXp + 25,
        userXp: current.userXp + 25,
        workBoostUntil: now + 180_000,
      };
      const res = unlockSecretQuest(pacified, "donkey_strike", now);
      saveSanctuaryState(res.state);
      setState(res.state);
      setPinBannerQuest(res.quest);
      const feedMood = findMoodPreset("feed0");
      spawnFoodScreenFx("🧋", ui("bar.hudStrikePacified3525"));
      setActiveMood(feedMood);
      setCustomSubText(ui("bar.hudStrikePacifiedResQuest", { title: isZh ? res.quest.titleZh : res.quest.titleEn }));
      dispatchDinoInteract({ type: "feed", reactMode: "happy", mood: feedMood });
      onTriggerSpeech?.(isZh ? res.quest.speechZh : res.quest.speechEn);
      return;
    }

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
    setState(nextState);
    advanceAndClaimQuest("daily_agent_feed");

    const foodName = isZh ? food.nameZh : food.nameEn;
    const foodTag = isZh ? food.tagZh : food.tagEn;
    spawnFoodScreenFx(food.icon, ui("bar.hudBlindBoxDrewFood", { foodName, coins: food.coins, affection: food.affection }));

    const customFeedMood: ShowcaseMoodPreset = {
      id: `feed_${food.id}`,
      kaomoji: food.kaomoji,
      text: ui("bar.hudBlindBoxFedFood", { icon: food.icon, foodName: foodName, reaction: isZh ? food.reactionZh : food.reactionEn }),
      sub: ui("bar.hudFoodtagAffectionFoodAffection", { foodTag: foodTag, affection: food.affection, coins: food.coins }),
      gesture: food.reactMode,
      blush: 0.85,
      happy: 0.95,
      star: 0.9,
      mouth: 0.9,
    };
    setActiveMood(customFeedMood);
    setCustomSubText(null);
    dispatchDinoInteract({ type: "feed", reactMode: food.reactMode, mood: customFeedMood });
    onTriggerSpeech?.(customFeedMood.text);
  }

  function handlePatAction(e?: React.MouseEvent) {
    e?.stopPropagation();
    lastUserInteractRef.current = performance.now();
    setAlertMode(false);
    setAlertDimmed(false);
    commitSanctuary(prev => ({
      ...prev,
      starBeans: prev.starBeans + 10,
      affectionXp: prev.affectionXp + 15,
    }));
    const patMood: ShowcaseMoodPreset = {
      id: "pat",
      kaomoji: "(✿◡‿◡)💖",
      text: ui("bar.hudPurrHeadPatsFeel"),
      sub: ui("bar.hudHeadPatAffection15"),
      gesture: "shy",
      blush: 1.0,
      happy: 1.0,
      star: 0.85,
      mouth: 0.75,
    };
    setActiveMood(patMood);
    setCustomSubText(null);
    dispatchDinoInteract({ type: "pat", mood: patMood });
    onTriggerSpeech?.(patMood.text);
  }

  function handleOpenWardrobeDrawer(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!macroActive) {
      enterMacroMode();
    }
    setSanctuaryModal("wardrobe");
    dispatchDinoInteract({ type: "pose" });
  }

  function handleOpenAdoptDrawer(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!macroActive) {
      enterMacroMode();
    }
    setSanctuaryModal("adopt");
    dispatchDinoInteract({ type: "pose" });
  }

  function handleWardrobeTurntable(deltaYaw?: number, toggleSpin?: boolean) {
    if (toggleSpin) {
      const nextSpin = !state.turntableSpin;
      commitSanctuary(prev => ({ ...prev, turntableSpin: nextSpin }));
      dispatchDinoInteract({ type: "turntable", spin: nextSpin });
      setWardrobeNote(ui(nextSpin ? "bar.wardrobeTurntableEnabled" : "bar.wardrobeTurntablePaused"));
      return;
    }
    const delta = deltaYaw ?? Math.PI / 4;
    commitSanctuary(prev => ({
      ...prev,
      turntableSpin: false,
      turntableYaw: (prev.turntableYaw || 0) + delta,
    }));
    dispatchDinoInteract({ type: "turntable", deltaYaw: delta, spin: false });
  }

  function handleWardrobeEquipTripo() {
    const now = Date.now();
    const allIds = DINO_WARDROBE_ITEMS.map(i => i.id);
    commitSanctuary(prev => {
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
      return unlockSecretQuest(updated, "fashion_mudslide", now).state;
    });
    dispatchDinoInteract({ type: "turntable", spin: true });
    dispatchDinoInteract({ type: "pose" });
    setWardrobeNote(
      ui("bar.hudEquippedTripo3DBoba", { items: wardrobeSetLabel(["boba_jetpack", "beret_cloud", "gold_glasses", "magic_wand", "aura_sakura"]) }),
    );
  }

  function handleWardrobeEquipUr() {
    const now = Date.now();
    const allIds = DINO_WARDROBE_ITEMS.map(i => i.id);
    commitSanctuary(prev => {
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
      return unlockSecretQuest(updated, "fashion_mudslide", now).state;
    });
    dispatchDinoInteract({ type: "turntable", spin: true });
    dispatchDinoInteract({ type: "pose" });
    setWardrobeNote(
      ui("bar.hudEquippedURStarGod", { items: wardrobeSetLabel(["crown_aurora", "star_monocle", "pioneer_cape", "floating_grimoire", "aura_aurora"]) }),
    );
  }

  function handleWardrobeItemClick(itemId: string) {
    const item = DINO_WARDROBE_ITEMS.find(entry => entry.id === itemId);
    if (!item) return;
    const owned = state.unlockedItems.includes(item.id);
    const equippedNow = state.equipped[item.slot] === item.id;
    const styleNow = calculateStyleEvaluation(state);
    const affNow = getAffectionProgress(state.affectionXp);

    if (equippedNow) {
      commitSanctuary(prev => ({
        ...prev,
        equipped: { ...prev.equipped, [item.slot]: null },
      }));
      dispatchDinoInteract({ type: "pose" });
      setWardrobeNote(ui("bar.hudUnequippedItemName", { name: item.name }));
      return;
    }

    if (!owned) {
      if (styleNow.userLevel.level.index < item.minUserLevel) {
        setWardrobeNote(
          ui("bar.hudRequiresLvItemMinUserLevel", { minUserLevel: item.minUserLevel, name: item.name }),
        );
        return;
      }
      if (affNow.level < item.minAffectionLevel) {
        setWardrobeNote(ui("bar.wardrobeRequiresAffection", { level: item.minAffectionLevel, name: item.name }));
        return;
      }
      if (state.starBeans < item.priceBeans) {
        setWardrobeNote(
          ui("bar.hudNeedsItemPriceBeansStar", { priceBeans: item.priceBeans }),
        );
        return;
      }
    }

    commitSanctuary(prev => {
      const nextEq = { ...prev.equipped, [item.slot]: item.id };
      const updated: MascotSanctuaryState = {
        ...prev,
        starBeans: owned ? prev.starBeans : prev.starBeans - item.priceBeans,
        unlockedItems: owned ? prev.unlockedItems : [...prev.unlockedItems, item.id],
        equipped: nextEq,
      };
      if (isContrastMixOutfit(nextEq, prev.speciesId)) {
        return unlockSecretQuest(updated, "fashion_mudslide", nowTs).state;
      }
      return updated;
    });
    dispatchDinoInteract({ type: "pose" });
    setWardrobeNote(ui("bar.wardrobeEquippedItem", { icon: item.icon, name: item.name, quote: item.specialQuote }));
    if (item.specialQuote) {
      onTriggerSpeech?.(item.specialQuote);
    }
  }

  const sp = DINO_SPECIES[state.speciesId] || DINO_SPECIES.mint_star;
  const styleEval = calculateStyleEvaluation(state);
  const aff = getAffectionProgress(state.affectionXp);
  const isOverclocked = state.workBoostUntil > nowTs;
  const isOnStrike = state.strikeUntil > nowTs;
  const workDrivePct = isOnStrike
    ? 0
    : Math.min(100, 68 + (state.totalWhips % 4) * 8 + (isOverclocked ? 16 : 0));
  const wardrobeItemsForSlot = DINO_WARDROBE_ITEMS.filter(i => i.slot === wardrobeSlot);

  return (
    <>
      {/* Subtle Macro Stage Backdrop (clicking outside exits Close-Up Macro Stage) */}
      <div
        id="ans-dino-macro-backdrop"
        className={macroActive ? "is-active" : ""}
        onClick={() => exitMacroMode()}
      />

      {/* Secret Quest Banner Toast */}
      {pinBannerQuest && (
        <div className="fixed bottom-[175px] right-[18px] z-[100025] w-[320px]">
          <SecretAchievementBanner
            quest={pinBannerQuest}
            isZh={isZh}
            onClose={() => setPinBannerQuest(null)}
          />
        </div>
      )}

      {/* 1:1 Resume Website Speech & Alert Bubble (#ans-dino-live-bubble) */}
      {!dialogOpen && sanctuaryModal === "none" && (
        <button
          type="button"
          id="ans-dino-live-bubble"
          style={{ left: bubblePos.left, bottom: bubblePos.bottom }}
          data-bubble-state={alertMode ? "alert" : "expanded"}
          data-idle-dim={alertDimmed ? "true" : "false"}
          className={`is-visible border-0 bg-transparent p-0 text-start ${alertMode ? "is-alert" : ""} ${alertMode && alertDimmed ? "is-alert-dimmed" : ""}`}
          aria-label={ui("bar.hudHoverToInteractClick")}
          onPointerEnter={() => triggerHoverReaction(true)}
          onPointerLeave={() => triggerHoverReaction(false)}
          onClick={e => {
            e.stopPropagation();
            triggerStageClick();
          }}
        >
          {alertMode ? (
            <div className="dino-alert-pin" title={ui("bar.hudHoverToInteractClick")}>
              <span className="dino-alert-bang">!</span>
              <span className="dino-alert-ring" />
              <span className="dino-alert-ring2" />
            </div>
          ) : (
            <div className="dino-speech-card">
              <span className="dino-b-kao">{activeMood.kaomoji}</span>
              <div className="dino-b-body">
                <span className="dino-b-txt">{pickMoodText(isZh, activeMood)}</span>
                <span className="dino-b-sub">
                  {customSubText ?? pickMoodSub(isZh, activeMood)}
                </span>
              </div>
            </div>
          )}
        </button>
      )}

      {/* 「Agent / 工作模式」两个入口：点开小恐龙后渲染进面板内部的槽位（不再浮在页面角落） */}
      {dialogOpen && dockSlot
        ? createPortal(
            <div className="ans-companion-dock ans-companion-dock--inline" data-testid="ans-companion-dock" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent("ans:open-companion-chat"));
                }}
                title={ui("bar.dockOpenAgentChat1")}
                className="rounded-full bg-emerald-700 px-2.5 py-0.5 text-[11px] font-bold text-white transition hover:bg-emerald-800 dark:bg-emerald-400 dark:text-slate-950"
              >
                {ui("bar.dockAgent")}
              </button>
              <button
                type="button"
                onClick={navigateToWorkMode}
                title={ui("bar.dockOpenWorkMode")}
                className="inline-flex rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold text-white transition hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-950"
              >
                {ui("bar.dockWorkMode")}
              </button>
            </div>,
            dockSlot,
          )
        : null}

      {/* 1:1 Resume Website Close-Up Macro Interactive Stage HUD (#ans-dino-interact-hud) */}
      <div
        id="ans-dino-interact-hud"
        className={macroActive && sanctuaryModal === "none" ? "is-active is-visible" : ""}
        aria-hidden={!(macroActive && sanctuaryModal === "none")}
        inert={!(macroActive && sanctuaryModal === "none") ? true : undefined}
        onClick={e => e.stopPropagation()}
      >
        <div className="hud-top-row">
          <span className="hud-title">
            🦖 {ui("bar.hudStateCustomNameSpName", { name: state.customName || sp.name })}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="hud-kpi-val">
              {workDrivePct}% {isOverclocked ? (ui("bar.hudBoost")) : ""} · 🪙 {state.starBeans}
            </span>
            <button
              type="button"
              className="hud-exit-btn"
              onClick={() => exitMacroMode()}
            >
              ✕ {ui("bar.hudClose")}
            </button>
          </div>
        </div>
        <div className="hud-kpi-track">
          <div className="hud-kpi-fill" style={{ width: `${workDrivePct}%` }} />
        </div>
        <div className="hud-btn-row">
          <button
            type="button"
            className="hud-act-btn is-whip"
            title={ui("bar.hudOverclockBoost258")}
            onClick={handleWhipAction}
          >
            🪢 {ui("bar.hudCrackWhip")}
          </button>
          <button
            type="button"
            className="hud-act-btn is-feed"
            title={ui("bar.hudBlindBoxSnackAffection", { min: BLIND_BOX_COIN_RANGE.min, max: BLIND_BOX_COIN_RANGE.max })}
            onClick={handleFeedAction}
          >
            🎲 {ui("bar.hudBlindBoxFeed")}
          </button>
          <button
            type="button"
            className="hud-act-btn is-wardrobe"
            title={ui("bar.hud3dWardrobeAccessories")}
            onClick={handleOpenWardrobeDrawer}
          >
            👗 {ui("bar.hudWardrobe")}
          </button>
          <button
            type="button"
            className="hud-act-btn is-adopt"
            title={ui("bar.hudSwitchDinoForm")}
            onClick={handleOpenAdoptDrawer}
          >
            🥚 {ui("bar.hudLineage")}
          </button>
        </div>
        <div className="hud-btn-row" style={{ marginTop: "2px" }}>
          <button
            type="button"
            className="hud-act-btn"
            title={ui("bar.hudAffection15Beans10")}
            onClick={handlePatAction}
          >
            🤚 {ui("bar.hudPatHead")}
          </button>
          <button
            type="button"
            className="hud-act-btn"
            onClick={() => {
              exitMacroMode();
              window.dispatchEvent(new CustomEvent("ans:open-companion-chat"));
            }}
          >
            🤖 {ui("bar.hudAgentChat")}
          </button>
          <button
            type="button"
            className="hud-act-btn"
            onClick={navigateToWorkMode}
          >
            🛠️ {ui("bar.hudWorkMode")}
          </button>
        </div>
      </div>

      {/* 1:1 Right-Aligned 3D Nikki Wardrobe Drawer (#ans-sanctuary-wardrobe-modal) with Left-Center 3D Podium */}
      <div
        id="ans-sanctuary-wardrobe-modal"
        hidden={sanctuaryModal !== "wardrobe"}
        className={`ans-sanctuary-backdrop ${sanctuaryModal === "wardrobe" ? "is-open" : ""}`}
        onClick={e => {
          if (e.target === e.currentTarget) {
            setSanctuaryModal("none");
          }
        }}
      >
        {sanctuaryModal === "wardrobe" && (
          <div
            ref={wardrobeDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ans-wardrobe-title"
            tabIndex={-1}
            className="ans-sanctuary-dialog"
            onClick={e => e.stopPropagation()}
          >
            <div className="ans-sanctuary-header">
              <div>
                <h2 id="ans-wardrobe-title" style={{ margin: 0, fontSize: "19px", fontWeight: 900 }}>
                  👗 {ui("bar.wardrobeDino3DHauteCouture")} · {state.customName || sp.name}
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "12px", opacity: 0.78 }}>
                  🪙 <strong>{state.starBeans}</strong> {ui("bar.wardrobeStarBeans")} · ♥ Lv.{aff.level} ({state.affectionXp} XP) · Lv.{styleEval.userLevel.level.index} {isZh ? styleEval.userLevel.level.nameZh : styleEval.userLevel.level.nameEn}
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setSanctuaryModal("adopt")}
                  style={{
                    borderRadius: "999px",
                    padding: "6px 12px",
                    border: "1px solid rgba(56,189,248,0.45)",
                    background: "rgba(56,189,248,0.14)",
                    color: "#7dd3fc",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  🥚 {ui("bar.wardrobeSwitchLineage")}
                </button>
                <button
                  type="button"
                  onClick={() => setSanctuaryModal("none")}
                  style={{
                    borderRadius: "999px",
                    padding: "6px 14px",
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  ✕ {ui("bar.wardrobeBack")}
                </button>
              </div>
            </div>

            {/* Left 3D Podium Turntable Controls & 1-Click Presets */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "8px",
                marginBottom: "12px",
                padding: "8px 12px",
                borderRadius: "14px",
                background: "rgba(15,23,42,0.55)",
                border: "1px solid rgba(56,189,248,0.28)",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => handleWardrobeTurntable(-Math.PI / 4, false)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "999px",
                    border: "1px solid rgba(56,189,248,0.45)",
                    background: "rgba(56,189,248,0.14)",
                    color: "#7dd3fc",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ◀ {ui("bar.wardrobeLeft45")}
                </button>
                <button
                  type="button"
                  onClick={() => handleWardrobeTurntable(0, true)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "999px",
                    border: "1px solid rgba(244,114,182,0.55)",
                    background: state.turntableSpin ? "rgba(244,114,182,0.32)" : "rgba(244,114,182,0.14)",
                    color: "#f472b6",
                    fontSize: "11px",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  🔄 {state.turntableSpin ? (ui("bar.wardrobeStopSpin")) : (ui("bar.wardrobe360AutoSpin"))}
                </button>
                <button
                  type="button"
                  onClick={() => handleWardrobeTurntable(Math.PI / 4, false)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "999px",
                    border: "1px solid rgba(56,189,248,0.45)",
                    background: "rgba(56,189,248,0.14)",
                    color: "#7dd3fc",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ▶ {ui("bar.wardrobeRight45")}
                </button>
                <button
                  type="button"
                  onClick={handleWardrobeEquipTripo}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "999px",
                    border: "1px solid rgba(245,158,11,0.5)",
                    background: "rgba(245,158,11,0.16)",
                    color: "#fbbf24",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  🧋 {ui("bar.wardrobeTripoBobaSet")}
                </button>
                <button
                  type="button"
                  onClick={handleWardrobeEquipUr}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "999px",
                    border: "1px solid rgba(192,132,252,0.55)",
                    background: "rgba(192,132,252,0.18)",
                    color: "#e9d5ff",
                    fontSize: "11px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  👑 {ui("bar.wardrobeUrGodSet")}
                </button>
              </div>
            </div>

            {wardrobeNote && (
              <div
                style={{
                  marginBottom: "10px",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  background: "rgba(16,185,129,0.14)",
                  border: "1px solid rgba(16,185,129,0.35)",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#a7f3d0",
                }}
              >
                {wardrobeNote}
              </div>
            )}

            {/* Style Evaluation Summary */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, rgba(168,85,247,0.14), rgba(59,130,246,0.12))",
                border: "1px solid rgba(168,85,247,0.3)",
                marginBottom: "14px",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#c084fc" }}>
                  ✨ {ui("bar.wardrobeStyleEvaluation")}：{styleEval.grade}
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, marginTop: "2px" }}>
                  {ui("bar.wardrobeTotalScore")} <strong>{styleEval.totalScore}</strong> · {ui("bar.wardrobeDominantStyle")} <strong>#{styleEval.dominantTag}</strong>
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {styleEval.equippedItems.length > 0 ? (
                  styleEval.equippedItems.map(eq => (
                    <span
                      key={eq.id}
                      style={{
                        fontSize: "11px",
                        padding: "3px 9px",
                        borderRadius: "999px",
                        background: "rgba(255,255,255,0.1)",
                        fontWeight: 700,
                      }}
                    >
                      {eq.icon} {eq.name}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: "11px", opacity: 0.7 }}>{ui("bar.wardrobeStarterLook")}</span>
                )}
              </div>
            </div>

            {/* 5 Wardrobe Slot Tabs */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
              {(Object.keys(WARDROBE_SLOT_LABELS) as WardrobeSlot[]).map(key => {
                const info = WARDROBE_SLOT_LABELS[key];
                const active = wardrobeSlot === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setWardrobeSlot(key)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: 800,
                      cursor: "pointer",
                      border: active ? "1px solid #f59e0b" : "1px solid rgba(148,163,184,0.28)",
                      background: active ? "rgba(245,158,11,0.18)" : "transparent",
                      color: active ? "#fbbf24" : "inherit",
                    }}
                  >
                    {info.icon} {info.label}
                  </button>
                );
              })}
            </div>

            {/* Slot Items Grid */}
            <div className="ans-wardrobe-grid">
              {wardrobeItemsForSlot.map(item => {
                const unlocked = state.unlockedItems.includes(item.id);
                const equipped = state.equipped[item.slot] === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.description}
                    onClick={() => handleWardrobeItemClick(item.id)}
                    className={`ans-wardrobe-card group text-start ${equipped ? "is-equipped" : ""}`}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "24px" }}>{item.icon}</span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 900,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: "rgba(245,158,11,0.18)",
                          color: "#fbbf24",
                        }}
                      >
                        {ui("bar.wardrobeRarityPower", { rarity: item.rarity, power: item.stylePower })}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                      <div style={{ fontWeight: 800, fontSize: "13px" }}>{item.name}</div>
                      <span
                        style={{
                          fontSize: "10px",
                          padding: "1px 6px",
                          borderRadius: "6px",
                          background: "rgba(148,163,184,0.16)",
                        }}
                      >
                        #{item.styleTag}
                      </span>
                    </div>
                    <div className="hidden group-hover:block group-focus-visible:block" style={{ fontSize: "11px", opacity: 0.72, lineHeight: 1.35 }}>
                      {item.description}
                    </div>
                    <div style={{ marginTop: "auto", paddingTop: "4px", fontSize: "11px", fontWeight: 800 }}>
                      {equipped ? (
                        <span style={{ color: "#10b981" }}>✓ {ui("bar.wardrobeEquipped")}</span>
                      ) : unlocked ? (
                        <span style={{ color: "#38bdf8" }}>{ui("bar.wardrobeEquip")}</span>
                      ) : (
                        <span style={{ color: "#f59e0b" }}>
                          🪙 {item.priceBeans} · Lv.{item.minUserLevel}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 1:1 Right-Aligned 3D Dragon Adoption Pod Drawer (#ans-sanctuary-adopt-modal) */}
      <div
        id="ans-sanctuary-adopt-modal"
        hidden={sanctuaryModal !== "adopt"}
        className={`ans-sanctuary-backdrop ${sanctuaryModal === "adopt" ? "is-open" : ""}`}
        onClick={e => {
          if (e.target === e.currentTarget) {
            setSanctuaryModal("none");
          }
        }}
      >
        {sanctuaryModal === "adopt" && (
          <div
            ref={adoptDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ans-adopt-title"
            tabIndex={-1}
            className="ans-sanctuary-dialog"
            onClick={e => e.stopPropagation()}
          >
            <div className="ans-sanctuary-header">
              <div>
                <h2 id="ans-adopt-title" style={{ margin: 0, fontSize: "19px", fontWeight: 900 }}>
                  🥚 {ui("bar.adopt3dDinoFormSwitcher")}
                </h2>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setSanctuaryModal("wardrobe")}
                  style={{
                    borderRadius: "999px",
                    padding: "6px 12px",
                    border: "1px solid rgba(192,132,252,0.45)",
                    background: "rgba(192,132,252,0.16)",
                    color: "#e9d5ff",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  👗 {ui("bar.adoptOpenWardrobe")}
                </button>
                <button
                  type="button"
                  onClick={() => setSanctuaryModal("none")}
                  style={{
                    borderRadius: "999px",
                    padding: "6px 14px",
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  ✕ {ui("bar.adoptBack")}
                </button>
              </div>
            </div>
            <DinoAdoptionPod />
          </div>
        )}
      </div>
    </>
  );
}


export function CompanionSanctuaryBar({
  requestedTab,
  currentDraft = "",
  onRequestedTabHandled,
  onSpeak,
  onSwitchToWorkMode,
}: {
  requestedTab?: "none" | "pi" | "pet" | "wardrobe" | "secrets" | "adopt" | null;
  currentDraft?: string;
  onRequestedTabHandled?: () => void;
  onSpeak?: (text: string) => void;
  onSwitchToWorkMode?: (prompt?: string) => void;
}) {
  const locale = useLocale();
  const ui = useTranslations("companion");
  const isZh = locale === "zh";
  const [state, setState] = useState<MascotSanctuaryState>(() => loadSanctuaryState());
  const [tab, setTab] = useState<"none" | "pi">("none");
  const [statusNote, setStatusNote] = useState<string>("");
  const [activeBannerQuest, setActiveBannerQuest] = useState<SecretQuestDef | null>(null);
  const [strikeRemainingSec, setStrikeRemainingSec] = useState<number>(0);
  const [piBusy, setPiBusy] = useState(false);
  const [piPrompt, setPiPrompt] = useState("");
  /** 服务端要求先确认的扣费金额（用户点确认前服务端不会扣费）。 */
  const resultRef = useRef<HTMLDivElement | null>(null);
  const [piConfirm, setPiConfirm] = useState<{
    intent: "checkin" | "claw" | "market" | "scaffold" | "redeem" | "auto";
    prompt: string;
    pricePoints: number;
  } | null>(null);
  const [piResult, setPiResult] = useState<{
    ok: boolean;
    toolUsed?: string;
    trace?: string[];
    traceEn?: string[];
    replyZh: string;
    replyEn: string;
    balancePoints?: number | null;
    links?: { href: string; title: string; detail: string; titleEn?: string; detailEn?: string }[];
  } | null>(null);
  // 执行步骤按当前语言选：英文缺失时回落到中文（服务端会逐条补，不会出现半截英文）。
  const traceSteps = piResult ? (isZh ? piResult.trace : piResult.traceEn ?? piResult.trace) : undefined;

  async function runPiAction(
    intent: "checkin" | "claw" | "market" | "scaffold" | "redeem" | "auto",
    customPrompt?: string,
    confirmedPoints?: number,
  ) {
    if (piBusy) return;
    setPiBusy(true);
    const resolvedPrompt = (customPrompt ?? (piPrompt || currentDraft || "")).trim();
    try {
      const res = await fetch("/api/mascot/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pi_action",
          intent,
          prompt: resolvedPrompt,
          ...(typeof confirmedPoints === "number" ? { confirmedPoints } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      // 服务端报价：先展示"Is X 积分、尚未扣费"，用户点确认后再用同一金额重发；
      // 服务端会再次校验金额，界面被绕过也扣不到钱。
      // 服务端只要重新报价就刷新确认条（即使这次请求本来就带着 confirmedPoints——价格变了就得重新确认）。
      const confirmRequest = (data?.data ?? {}) as { requiresConfirmation?: boolean; pricePoints?: number };
      if (
        confirmRequest.requiresConfirmation &&
        typeof confirmRequest.pricePoints === "number" &&
        confirmRequest.pricePoints > 0
      ) {
        setPiConfirm({ intent, prompt: resolvedPrompt, pricePoints: confirmRequest.pricePoints });
        setPiResult({
          ok: false,
          toolUsed: data?.toolUsed,
          trace: Array.isArray(data?.trace) ? data.trace : undefined,
        traceEn: Array.isArray(data?.traceEn) ? data.traceEn : undefined,
          replyZh: data?.replyZh ?? "",
          replyEn: data?.replyEn ?? "",
          balancePoints: data?.balancePoints ?? null,
          links: [],
        });
        return;
      }
      if (res.status === 401 || !res.ok || (!data?.replyZh && !data?.replyEn)) {
        const fallback = res.status === 401 ? ui("bar.podSignInForQuickAction") : ui("bar.podActionUnavailable");
        const fallbackZh = data?.replyZh || fallback;
        const fallbackEn = data?.replyEn || fallback;
        setPiResult({
          ok: false,
          toolUsed: res.status === 401 ? "auth_required" : undefined,
          trace: Array.isArray(data?.trace) ? data.trace : undefined,
        traceEn: Array.isArray(data?.traceEn) ? data.traceEn : undefined,
          replyZh: fallbackZh,
          replyEn: fallbackEn,
          links:
            res.status === 401
              ? [
                  {
                    href: "/login",
                    title: ui("bar.quickbarSignIn"),
                    detail: ui("bar.quickbarSignInToUnlock"),
                  },
                ]
              : [],
        });
        return;
      }
      setPiConfirm(null);
      setPiResult(data);
      // 确认按钮点完就卸载了，把焦点交给结果区，别让它掉回 body。
      if (typeof confirmedPoints === "number") window.requestAnimationFrame(() => resultRef.current?.focus());
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
        replyZh: ui("bar.podNetworkError"),
        replyEn: ui("bar.podNetworkError"),
        links: [],
      });
    } finally {
      setPiBusy(false);
    }
  }

  useEffect(() => {
    if (requestedTab) {
      setTab(requestedTab === "pi" ? "pi" : "none");
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

  const isOnStrike = strikeRemainingSec > 0;

  function handleFeed() {
    const now = Date.now();
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
      spawnFoodScreenFx("🧋", ui("bar.quickbarStrikePacified3525"));
      dispatchDinoInteract({ type: "feed", reactMode: "happy" });
      celebrateSecretQuest(quest);
      setStatusNote(
        ui("bar.quickbarStrikePacifiedQuestTitleEn", { title: isZh ? quest.titleZh : quest.titleEn, speech: isZh ? quest.speechZh : quest.speechEn }),
      );
      return;
    }

    const ssrFoods = BLIND_BOX_FOODS.filter(item => item.isSsrSecret);
    const shouldGuaranteeSsr =
      !state.unlockedSecretQuests.includes("silicon_ulcer") && state.totalFeeds + 1 >= 4;
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

    spawnFoodScreenFx(food.icon, `${foodName} +${food.coins}🪙 +${food.affection}♥`);
    dispatchDinoInteract({ type: "feed", reactMode: food.reactMode });
    advanceAndClaimQuest("daily_agent_feed");

    if (food.isSsrSecret) {
      const quest = newlyTriggeredSilicon ?? SECRET_QUESTS.silicon_ulcer;
      celebrateSecretQuest(quest);
      setStatusNote(
        ui("bar.quickbarFoodIconSSRBonus", { icon: food.icon, foodName: foodName, speech: isZh ? quest.speechZh : quest.speechEn }),
      );
      return;
    }

    setStatusNote(
      ui("bar.quickbarFoodIconFedFoodName", { icon: food.icon, foodName: foodName, foodTag: foodTag, coins: food.coins, affection: food.affection }),
    );
    onSpeak?.(foodReaction);
  }

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
            {ui("bar.quickbarStrikeStrikeRemainingSecSFeed", { strikeRemainingSec: strikeRemainingSec })}
          </span>
          <button
            type="button"
            onClick={handleFeed}
            className="shrink-0 rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm hover:bg-emerald-500"
          >
            {ui("bar.quickbarFeed")}
          </button>
        </div>
      )}

      {/* Single Compact High-Value Utility Bar inside Agent Chat Popover */}
      <div
        data-testid="pi-agent-quickbar"
        className="flex flex-wrap items-center justify-between gap-1.5"
      >
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            disabled={piBusy}
            title={ui("bar.quickbarDailyCheckIn5")}
            data-testid="pi-agent-action-checkin"
            onClick={() => void runPiAction("checkin")}
            className="rounded-full border border-emerald-500/40 bg-background/90 px-2 py-0.5 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-500/15 disabled:opacity-50 dark:text-emerald-300"
          >
            📅 {ui("bar.quickbarCheckIn")}
          </button>
          <button
            type="button"
            disabled={piBusy}
            title={ui("bar.quickbarCreateProjectREADMEDraft")}
            data-testid="pi-agent-action-scaffold"
            onClick={() =>
              void runPiAction(
                "scaffold",
                (piPrompt || currentDraft).trim(),
              )
            }
            className="rounded-full border border-purple-500/40 bg-background/90 px-2 py-0.5 text-[10px] font-bold text-purple-700 transition hover:bg-purple-500/15 disabled:opacity-50 dark:text-purple-300"
          >
            📝 {ui("bar.quickbarNewProject")}
          </button>
          <button
            type="button"
            disabled={piBusy}
            title={ui("bar.quickbarFindMarketTools")}
            data-testid="pi-agent-action-market"
            onClick={() => void runPiAction("market", (piPrompt || currentDraft).trim())}
            className="rounded-full border border-sky-500/40 bg-background/90 px-2 py-0.5 text-[10px] font-bold text-sky-700 transition hover:bg-sky-500/15 disabled:opacity-50 dark:text-sky-300"
          >
            🛒 {ui("bar.quickbarTools")}
          </button>
          <button
            type="button"
            disabled={piBusy}
            title={ui("bar.quickbar5ptInstantRedeem")}
            data-testid="pi-agent-action-redeem"
            onClick={() => void runPiAction("redeem", (piPrompt || currentDraft).trim())}
            className="rounded-full border border-rose-500/40 bg-background/90 px-2 py-0.5 text-[10px] font-bold text-rose-700 transition hover:bg-rose-500/15 disabled:opacity-50 dark:text-rose-300"
          >
            🎁 {ui("bar.quickbarRedeem")}
          </button>
          <button
            type="button"
            disabled={piBusy}
            title={ui("bar.quickbarPlay3DClawMachine")}
            data-testid="pi-agent-action-claw"
            onClick={() => void runPiAction("claw")}
            className="rounded-full border border-amber-500/40 bg-background/90 px-2 py-0.5 text-[10px] font-bold text-amber-700 transition hover:bg-amber-500/15 disabled:opacity-50 dark:text-amber-300"
          >
            🕹️ {ui("bar.quickbarClaw")}
          </button>
        </div>

        <div className="flex items-center gap-1">
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
            ⚡ {ui("bar.quickbarCommand")}
          </button>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("ans:enter-dino-macro", { detail: { drawer: "wardrobe" } }));
            }}
            title={ui("bar.quickbarOpen3DCloseUp")}
            className="rounded-full border border-purple-500/35 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-700 transition hover:bg-purple-500/20 dark:text-purple-300"
          >
            🎥 {ui("bar.quickbar3dStage")}
          </button>
        </div>
      </div>

      {piConfirm && (
        <div
          data-testid="pi-agent-confirm"
          role="status"
          aria-live="polite"
          className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/60 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-800 dark:text-amber-200"
        >
          <span>
            {ui("bar.quickbarSpendsPiConfirmPricePointsPts", { pricePoints: piConfirm.pricePoints })}
          </span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              disabled={piBusy}
              onClick={() => {
                const pending = piConfirm;
                setPiConfirm(null);
                void runPiAction(pending.intent, pending.prompt, pending.pricePoints);
              }}
              className="rounded-md bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white transition hover:bg-amber-500 disabled:opacity-50"
            >
              {ui("bar.quickbarConfirmPiConfirmPricePointsPts", { pricePoints: piConfirm.pricePoints })}
            </button>
            <button
              type="button"
              onClick={() => setPiConfirm(null)}
              className="rounded-md border border-amber-500/50 px-2 py-0.5 text-[10px] font-bold transition hover:bg-amber-500/15"
            >
              {ui("bar.quickbarCancel")}
            </button>
          </span>
        </div>
      )}

      {statusNote && (
        <p className="mt-1.5 rounded-lg bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground">
          {statusNote}
        </p>
      )}

      {(tab === "pi" || piResult !== null) && (
        <div
          data-testid="pi-agent-pod"
          className="mt-2 space-y-2 rounded-xl border border-emerald-500/40 bg-background/95 p-2 shadow-sm"
        >
          {tab === "pi" && (
            <div className="flex items-center gap-1.5">
              <input
                type="search"
                value={piPrompt}
                onChange={e => setPiPrompt(e.target.value)}
                onKeyDown={e => {
                  // 中文/日文输入法选词也会发 Enter：放过 IME 组词，否则半句话就被当指令执行（可能触发扣分动作）。
                  if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                    e.preventDefault();
                    void runPiAction("auto", piPrompt);
                  }
                }}
                placeholder={ui("bar.podQuickCommandPlaceholder")}
                aria-label={ui("bar.podAgentCommandInput")}
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
                {piBusy ? (ui("bar.podRunning")) : ui("bar.podRun")}
              </button>
            </div>
          )}

          {piResult && (
            <div
              ref={resultRef}
              tabIndex={-1}
              data-testid="pi-agent-result"
              className="space-y-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-2 text-[11px]"
            >
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      piResult.ok
                        ? "bg-emerald-600/15 text-emerald-800 dark:text-emerald-200"
                        : "bg-amber-500/20 text-amber-800 dark:text-amber-200"
                    }`}
                  >
                    {piResult.ok
                      ? `✓ ${ui("bar.podAgentExecuted")}`
                      : piConfirm
                        ? `⏸ ${ui("bar.podNotExecutedAwaitingConfirmation")}`
                        : `✕ ${ui("bar.podNotExecuted")}`}
                  </span>
                  {typeof piResult.balancePoints === "number" && (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-300">
                      {ui("bar.podBalancePts", { points: piResult.balancePoints.toFixed(1) })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {onSwitchToWorkMode && (
                    <button
                      type="button"
                      onClick={() => onSwitchToWorkMode((piPrompt || currentDraft).trim())}
                      className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300"
                    >
                      {ui("bar.podWorkMode")}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={ui("bar.podDismissResult")}
                    onClick={() => setPiResult(null)}
                    className="rounded px-1 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {traceSteps && traceSteps.length > 0 && (
                <details className="rounded-md border border-border/60 bg-background/70 px-2 py-1 font-mono text-[10px] text-muted-foreground">
                  <summary className="cursor-pointer font-sans font-semibold text-emerald-700 dark:text-emerald-300">
                    ⚡ {ui("bar.podExecutionTracePiResultTrace", { length: traceSteps.length })}
                  </summary>
                  <ol className="mt-1 space-y-0.5 pl-1">
                    {traceSteps.map((step, idx) => (
                      <li key={idx}>› {step}</li>
                    ))}
                  </ol>
                </details>
              )}

              <p className="whitespace-pre-line leading-relaxed text-foreground">
                {((isZh ? piResult.replyZh : piResult.replyEn) || "").replace(/\*\*/g, "")}
              </p>
              {piResult.links && piResult.links.length > 0 && (
                <div className="grid grid-cols-1 gap-1 pt-1">
                  {piResult.links.map(link => (
                    <a
                      key={link.href}
                      href={link.href}
                      title={isZh ? link.detail : link.detailEn ?? link.detail}
                      className="group flex items-center justify-between rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:border-emerald-500/50 hover:bg-emerald-500/10"
                    >
                      <div className="truncate">
                        <span className="font-bold text-emerald-700 dark:text-emerald-300">{isZh ? link.title : link.titleEn ?? link.title}</span>
                        <span className="ml-1.5 hidden text-[10px] text-muted-foreground group-hover:inline">
                          {isZh ? link.detail : link.detailEn ?? link.detail}
                        </span>
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
    </div>
  );
}
