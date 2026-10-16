"use client";

import { useEffect, useState } from "react";
import {
  DINO_SPECIES,
  DINO_WARDROBE_ITEMS,
  SANCTUARY_EVENT_NAME,
  WARDROBE_SLOT_LABELS,
  calculateStyleEvaluation,
  getAffectionProgress,
  loadSanctuaryState,
  saveSanctuaryState,
  type DinoSpeciesId,
  type MascotSanctuaryState,
  type WardrobeSlot,
} from "@/domain/mascot/sanctuary";
import { DinoAdoptionPod } from "./dino-adoption-pod";

const SPECIES_ICONS: Record<DinoSpeciesId, string> = {
  mint_star: "🦖",
  cyber_gold: "🐉",
  sakura_mochi: "🦄",
  aurora_ice: "❄️",
};

const BLIND_BOX_FOODS = [
  { icon: "🌶️", name: "变态辣火鸡面", coins: 30, affection: 18, reaction: "嘶哈嘶哈！！嘴要喷出三昧真火了！不过精神百倍，算力暴涨 200%！" },
  { icon: "🧋", name: "冰镇杨枝甘露", coins: 25, affection: 22, reaction: "吨吨吨~ 满血复活！这杯甘露就是本龙今日的续命神仙水！" },
  { icon: "🔋", name: "4090 满血显卡饼干", coins: 45, affection: 30, reaction: "咔嚓咔嚓！CUDA 核心在肚子里发光，现在让我跑十万条简历都不喘气！" },
  { icon: "🍋", name: "暴打渣男手打柠檬茶", coins: 20, affection: 16, reaction: "酸爽暴击！眼泪从嘴角流出来了，瞬间清醒继续搬砖！" },
  { icon: "🍖", name: "战斧脆皮大鸡腿", coins: 35, affection: 26, reaction: "嗷呜一口吞！肉香四溢，今天谁也别想阻止我帮主人冲榜！" },
];

const WHIP_QUIPS = [
  "嗷呜！！屁股开花啦！别抽了别抽了，本龙这就把 GPU 干冒烟帮你卷简历！😭⚡",
  "啪！！痛痛痛！龙尾都抽麻了，今日 KPI 翻倍还不行嘛！🔥",
  "呜哇！资本家看了都流泪，小恐龙已经在光速敲键盘了！⌨️💨",
];

const QUEST_THOUGHTS = [
  "叮！检测到主人正在浏览页面，要不要抽我一鞭子让我帮你速通当前模块？⚡",
  "肚子咕噜噜叫了… 投喂一个盲盒夜宵，立返灵感星豆 + 好感度！🧋",
  "主人的衣橱里还有 SSR/UR 穿搭待解锁，快点开『暖暖衣橱』帮我换新装！👗",
];

export function CompanionQuestPin({ onTriggerSpeech }: { onTriggerSpeech?: (text: string) => void }) {
  const [dimmed, setDimmed] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDimmed(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  function handlePinClick(e: React.MouseEvent) {
    e.stopPropagation();
    setDimmed(false);
    const next = QUEST_THOUGHTS[Math.floor(Math.random() * QUEST_THOUGHTS.length)];
    setBubble(current => (current ? null : next));
    onTriggerSpeech?.(next);
  }

  return (
    <div className="pointer-events-auto relative inline-flex items-center">
      <button
        type="button"
        onClick={handlePinClick}
        title="点击查看小恐龙碎碎念"
        aria-label="点击查看小恐龙碎碎念"
        className={`fixed bottom-[114px] right-[12px] sm:bottom-[74px] sm:right-[22px] z-[60] flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full border border-white/60 bg-gradient-to-br from-amber-400 to-rose-500 text-xs font-black text-white shadow-md transition-opacity duration-500 ${
          dimmed && !bubble ? "opacity-40 hover:opacity-100" : "animate-bounce opacity-100"
        }`}
      >
        !
      </button>
      {bubble && (
        <div
          onClick={e => {
            e.stopPropagation();
            setBubble(null);
          }}
          className="fixed bottom-[140px] right-[12px] sm:bottom-[106px] sm:right-[18px] z-[60] max-w-[230px] cursor-pointer rounded-2xl border border-amber-500/30 bg-background/95 px-3 py-2 text-[11px] leading-snug text-foreground shadow-xl backdrop-blur-md"
        >
          <span className="font-bold text-amber-500">🦖 灵龙碎碎念：</span>
          {bubble}
        </div>
      )}
    </div>
  );
}

export function CompanionSanctuaryBar({
  onSpeak,
  onInjectPrompt,
}: {
  onSpeak?: (text: string) => void;
  onInjectPrompt?: (prompt: string) => void;
}) {
  const [state, setState] = useState<MascotSanctuaryState>(() => loadSanctuaryState());
  const [tab, setTab] = useState<"none" | "pet" | "wardrobe" | "adopt">("none");
  const [slot, setSlot] = useState<WardrobeSlot>("headwear");
  const [statusNote, setStatusNote] = useState<string>("");

  useEffect(() => {
    setState(loadSanctuaryState());
    const onUpdate = () => setState(loadSanctuaryState());
    window.addEventListener(SANCTUARY_EVENT_NAME, onUpdate);
    window.addEventListener("ans:sanctuary-updated", onUpdate);
    window.addEventListener("ans-sanctuary-sync", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener(SANCTUARY_EVENT_NAME, onUpdate);
      window.removeEventListener("ans:sanctuary-updated", onUpdate);
      window.removeEventListener("ans-sanctuary-sync", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  function commit(updater: (prev: MascotSanctuaryState) => MascotSanctuaryState) {
    setState(prev => {
      const next = updater(prev);
      saveSanctuaryState(next);
      return next;
    });
  }

  const sp = DINO_SPECIES[state.speciesId] || DINO_SPECIES.mint_star;
  const spIcon = SPECIES_ICONS[sp.id] ?? "🦖";
  const styleEval = calculateStyleEvaluation(state);
  const aff = getAffectionProgress(state.affectionXp);
  const uLv = styleEval.userLevel;
  const isOverclocked = state.workBoostUntil > 0;

  function handleWhip() {
    const quip = WHIP_QUIPS[Math.floor(Math.random() * WHIP_QUIPS.length)];
    commit(prev => ({
      ...prev,
      totalWhips: prev.totalWhips + 1,
      starBeans: prev.starBeans + 15,
      affectionXp: prev.affectionXp + 8,
      userXp: prev.userXp + 20,
      workBoostUntil: Date.now() + 180_000,
    }));
    setStatusNote(`🪢 啪！+15🪙 +8♥ · 已激活 3 分钟【超频干活 Buff】· ${quip}`);
    onSpeak?.(quip);
  }

  function handleFeed() {
    const food = BLIND_BOX_FOODS[Math.floor(Math.random() * BLIND_BOX_FOODS.length)];
    commit(prev => ({
      ...prev,
      totalFeeds: prev.totalFeeds + 1,
      starBeans: prev.starBeans + food.coins,
      affectionXp: prev.affectionXp + food.affection,
      userXp: prev.userXp + 15,
      workBoostUntil: Date.now() + 180_000,
    }));
    setStatusNote(`${food.icon} 投喂【${food.name}】+${food.coins}🪙 +${food.affection}♥ · ${food.reaction}`);
    onSpeak?.(food.reaction);
  }

  function handleEquipOrBuy(itemId: string) {
    const item = DINO_WARDROBE_ITEMS.find(entry => entry.id === itemId);
    if (!item) return;
    const owned = state.unlockedItems.includes(item.id);
    if (owned) {
      commit(prev => ({
        ...prev,
        equipped: { ...prev.equipped, [item.slot]: item.id },
      }));
      setStatusNote(`✨ 已穿戴【${item.name}】· ${item.specialQuote}`);
      return;
    }
    if (uLv.level.index < item.minUserLevel) {
      setStatusNote(`🔒 需达到 Lv.${item.minUserLevel} 才可解锁【${item.name}】（右侧可切换等级预览）`);
      return;
    }
    if (aff.level < item.minAffectionLevel) {
      setStatusNote(`🔒 需好感达到 ♥Lv.${item.minAffectionLevel} 才可解锁【${item.name}】`);
      return;
    }
    if (state.starBeans < item.priceBeans) {
      setStatusNote(`🪙 灵感星豆不足（需 ${item.priceBeans}🪙，多投喂或抽屁股可赚取）`);
      return;
    }
    commit(prev => ({
      ...prev,
      starBeans: prev.starBeans - item.priceBeans,
      unlockedItems: [...prev.unlockedItems, item.id],
      equipped: { ...prev.equipped, [item.slot]: item.id },
    }));
    setStatusNote(`🎉 解锁并换上【${item.name}】！穿搭评定提升！`);
  }

  const slotItems = DINO_WARDROBE_ITEMS.filter(item => item.slot === slot);

  return (
    <div className="border-b border-border/60 bg-muted/30 px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{spIcon}</span>
          <span className="font-bold text-foreground">{state.customName || sp.name}</span>
          <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
            Lv.{uLv.level.index} {uLv.level.nameZh}
          </span>
          <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-500">
            ♥ Lv.{aff.level}
          </span>
          <span className="rounded-full bg-yellow-500/15 px-1.5 py-0.5 text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
            🪙 {state.starBeans}
          </span>
          <span className="rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-bold text-purple-500">
            {styleEval.grade.split(" ")[0]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab(current => (current === "pet" ? "none" : "pet"))}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
              tab === "pet" ? "bg-foreground text-background" : "bg-background/80 text-muted-foreground hover:text-foreground"
            }`}
          >
            🐾 互动投喂
          </button>
          <button
            type="button"
            onClick={() => setTab(current => (current === "wardrobe" ? "none" : "wardrobe"))}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
              tab === "wardrobe" ? "bg-foreground text-background" : "bg-background/80 text-muted-foreground hover:text-foreground"
            }`}
          >
            👗 暖暖衣橱
          </button>
          <button
            type="button"
            onClick={() => setTab(current => (current === "adopt" ? "none" : "adopt"))}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
              tab === "adopt" ? "bg-foreground text-background" : "bg-background/80 text-muted-foreground hover:text-foreground"
            }`}
          >
            🥚 灵龙契约
          </button>
        </div>
      </div>

      {statusNote && (
        <p className="mt-1.5 rounded-lg bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground">
          {statusNote}
        </p>
      )}

      {tab === "pet" && (
        <div className="mt-2 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={handleWhip}
              className="flex items-center justify-between rounded-xl border border-rose-500/25 bg-rose-500/10 px-2.5 py-1.5 text-left text-[11px] font-semibold text-rose-600 hover:bg-rose-500/15 dark:text-rose-300"
            >
              <span>🪢 抽屁股催干活</span>
              <span className="text-[10px] opacity-80">+15🪙</span>
            </button>
            <button
              type="button"
              onClick={handleFeed}
              className="flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-left text-[11px] font-semibold text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-300"
            >
              <span>🎲 随机盲盒投喂</span>
              <span className="text-[10px] opacity-80">+好感</span>
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
              setStatusNote(`📋 已注入并复制【#${styleEval.dominantTag}·${sp.name}】专属 Agent 咒语 (+10🪙)！`);
              onSpeak?.(promptText);
            }}
            className="flex w-full items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-left text-[11px] font-semibold text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
          >
            <span>⚡ 一键生成【#{styleEval.dominantTag}穿搭×{sp.name}】专属 Agent 咒语</span>
            <span className="text-[10px] opacity-85">{isOverclocked ? "🔥超频中 · 复制+10🪙" : "复制+10🪙"}</span>
          </button>
        </div>
      )}

      {tab === "wardrobe" && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between gap-1">
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
              title="模拟提升个人荣誉等级与星豆"
            >
              升级 Lv.{uLv.level.index}↻
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {slotItems.map(item => {
              const owned = state.unlockedItems.includes(item.id);
              const equipped = state.equipped[item.slot] === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleEquipOrBuy(item.id)}
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
                    {equipped ? "穿戴中" : owned ? "可换装" : `Lv.${item.minUserLevel}·${item.priceBeans}🪙`}
                  </span>
                </button>
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
