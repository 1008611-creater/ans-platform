"use client";

import { useEffect, useRef, useState } from "react";
import {
  DINO_SPECIES,
  DINO_SPECIES_LIST,
  DINO_WARDROBE_ITEMS,
  SANCTUARY_EVENT_NAME,
  loadSanctuaryState,
  saveSanctuaryState,
  type DinoSpeciesId,
  type MascotSanctuaryState,
} from "@/domain/mascot/sanctuary";

const TRENDY_NAMES = [
  "薄荷小星龙",
  "满绩小恐龙",
  "4090吞金兽",
  "早八怨种龙",
  "芝士小泡芙",
  "顶会收割机",
  "不改需求龙",
  "量子小冰龙",
];

const SPECIES_ICONS: Record<DinoSpeciesId, string> = {
  mint_star: "🦖",
  cyber_gold: "🐉",
  sakura_mochi: "🦄",
  aurora_ice: "❄️",
};

export interface DinoAdoptionPodProps {
  trainerNicknameHint?: string;
  compact?: boolean;
  onAdoptedChange?: (state: MascotSanctuaryState) => void;
}

export function DinoAdoptionPod({
  trainerNicknameHint,
  compact = false,
  onAdoptedChange,
}: DinoAdoptionPodProps) {
  const [sanctuary, setSanctuary] = useState<MascotSanctuaryState>(() => loadSanctuaryState());
  const [crackStep, setCrackStep] = useState<number>(3);
  const [isCracking, setIsCracking] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(!compact);
  const [frameReady, setFrameReady] = useState<boolean>(false);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setSanctuary(loadSanctuaryState());
    const sync = () => setSanctuary(loadSanctuaryState());
    window.addEventListener(SANCTUARY_EVENT_NAME, sync);
    window.addEventListener("ans-sanctuary-sync", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SANCTUARY_EVENT_NAME, sync);
      window.removeEventListener("ans-sanctuary-sync", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== previewFrameRef.current?.contentWindow) return;
      if (event.data?.type === "ans-dino-ready") {
        setFrameReady(true);
        previewFrameRef.current?.contentWindow?.postMessage(
          { type: "ans-dino", event: "sanctuary", state: loadSanctuaryState() },
          window.location.origin,
        );
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    previewFrameRef.current?.contentWindow?.postMessage(
      { type: "ans-dino", event: "sanctuary", state: sanctuary },
      window.location.origin,
    );
  }, [sanctuary]);

  const currentSpecies = DINO_SPECIES[sanctuary.speciesId] ?? DINO_SPECIES.mint_star;
  const currentIcon = SPECIES_ICONS[currentSpecies.id] ?? "🦖";

  function updateSanctuary(patch: Partial<MascotSanctuaryState>) {
    const next: MascotSanctuaryState = {
      ...sanctuary,
      ...patch,
    };
    setSanctuary(next);
    saveSanctuaryState(next);
    onAdoptedChange?.(next);
  }

  function handleSelectSpecies(speciesId: DinoSpeciesId) {
    const sp = DINO_SPECIES[speciesId];
    if (!sp) return;
    const nextUnlocked = Array.from(
      new Set([
        ...sanctuary.unlockedItems,
        sp.starterEquipped.headwear,
        sp.starterEquipped.eyewear,
        sp.starterEquipped.neckwear,
        sp.starterEquipped.handheld,
        sp.starterEquipped.aura,
      ]),
    );
    updateSanctuary({
      adopted: true,
      adoptedAt: sanctuary.adoptedAt || new Date().toISOString(),
      speciesId: sp.id,
      customName: sp.defaultNickname,
      unlockedItems: nextUnlocked,
      equipped: { ...sp.starterEquipped },
    });
    setCrackStep(3);
  }

  function handleTapEgg() {
    setIsCracking(true);
    window.setTimeout(() => setIsCracking(false), 320);
    const nextStep = crackStep >= 3 ? 1 : crackStep + 1;
    setCrackStep(nextStep);
    if (nextStep === 3) {
      updateSanctuary({
        adopted: true,
        adoptedAt: sanctuary.adoptedAt || new Date().toISOString(),
        starBeans: sanctuary.starBeans + 30,
        affectionXp: sanctuary.affectionXp + 15,
      });
    }
  }

  function handleRandomDinoName() {
    const candidates = TRENDY_NAMES.filter(n => n !== sanctuary.customName);
    const pick = candidates[Math.floor(Math.random() * candidates.length)] ?? "薄荷小星龙";
    updateSanctuary({ customName: pick });
  }

  const starterItems = Object.entries(currentSpecies.starterEquipped)
    .filter(([, itemId]) => itemId !== "none" && itemId !== "none_head")
    .map(([slot, itemId]) =>
      DINO_WARDROBE_ITEMS.find(it => it.slot === slot && it.id === itemId),
    )
    .filter(Boolean);

  return (
    <section
      aria-label="注册领养专属小恐龙吉祥物"
      style={{
        borderRadius: "20px",
        padding: "16px",
        background:
          "linear-gradient(145deg, rgba(13, 25, 32, 0.94), rgba(20, 36, 44, 0.92))",
        border: `1.5px solid ${currentSpecies.palette.skinHex}66`,
        boxShadow: "0 14px 36px rgba(0, 0, 0, 0.22)",
        color: "#f2fbf8",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        marginTop: "8px",
        marginBottom: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "20px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "34px",
              height: "34px",
              borderRadius: "11px",
              background: `${currentSpecies.palette.skinHex}26`,
              border: `1px solid ${currentSpecies.palette.skinHex}`,
            }}
          >
            {currentIcon}
          </span>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff" }}>
              🥚 挑选你的专属小恐龙伴侣
            </div>
          </div>
        </div>
        {compact ? (
          <button
            type="button"
            onClick={() => setExpanded(prev => !prev)}
            style={{
              borderRadius: "999px",
              padding: "4px 11px",
              fontSize: "11.5px",
              fontWeight: 700,
              border: "1px solid rgba(255,255,255,0.22)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {expanded ? "收起孵化舱 ▲" : "挑选小恐龙 ▼"}
          </button>
        ) : null}
      </div>

      {expanded ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "112px 1fr",
              gap: "12px",
              alignItems: "center",
              padding: "12px",
              borderRadius: "16px",
              background: "rgba(0, 0, 0, 0.28)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <button
              type="button"
              onClick={handleTapEgg}
              title="敲击恐龙蛋破壳"
              style={{
                appearance: "none",
                border: `1.5px dashed ${currentSpecies.palette.eyeGlowHex}`,
                borderRadius: "16px",
                padding: "8px 6px",
                background: `radial-gradient(circle at 35% 30%, ${currentSpecies.palette.skinHex}44, ${currentSpecies.palette.crestHex}22, rgba(8,14,20,0.85))`,
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                position: "relative",
                overflow: "hidden",
                transform: isCracking ? "scale(0.92) rotate(-5deg)" : "scale(1)",
                transition: "transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              {crackStep >= 3 ? (
                <span
                  style={{
                    position: "relative",
                    width: "88px",
                    height: "72px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "28px",
                      lineHeight: 1.1,
                      opacity: frameReady ? 0.18 : 1,
                      transition: "opacity 0.25s ease",
                    }}
                  >
                    {currentIcon}
                  </span>
                  <iframe
                    ref={previewFrameRef}
                    src="/mascot/3d/embed.html"
                    title="3D 小恐龙实时预览"
                    tabIndex={-1}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      border: 0,
                      pointerEvents: "none",
                      background: "transparent",
                    }}
                  />
                </span>
              ) : (
                <span style={{ fontSize: "34px", lineHeight: 1.2, padding: "12px 0" }}>🥚</span>
              )}
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 800,
                  color: currentSpecies.palette.skinHex,
                }}
              >
                {crackStep >= 3 ? "✨ 已破壳唤醒" : `🔨 敲击破壳 (${crackStep}/3)`}
              </span>
            </button>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "6px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 800,
                    color: currentSpecies.palette.skinHex,
                  }}
                >
                  {currentSpecies.name} · {currentSpecies.title}
                </span>
                <span
                  style={{
                    fontSize: "10.5px",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.12)",
                    color: currentSpecies.palette.eyeGlowHex,
                    fontWeight: 700,
                  }}
                >
                  {currentSpecies.mbti}
                </span>
              </div>
              <div style={{ fontSize: "11.5px", color: "rgba(240,252,248,0.88)" }}>
                {currentSpecies.tagline}
              </div>
              <div style={{ fontSize: "11px", color: "#ffe082" }}>
                🎁 初始穿搭：
                {starterItems.map(it => `${it?.icon}${it?.name}`).join(" + ") || "初心灵感套装"}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "4px",
                  fontSize: "10.5px",
                  color: "rgba(255,255,255,0.8)",
                  marginTop: "2px",
                }}
              >
                <span>💡创意 {currentSpecies.stats.creativity}</span>
                <span>⚡手速 {currentSpecies.stats.codingSpeed}</span>
                <span>💖共情 {currentSpecies.stats.empathy}</span>
                <span>🧠逻辑 {currentSpecies.stats.logic}</span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "8px",
            }}
          >
            {DINO_SPECIES_LIST.map(sp => {
              const selected = sp.id === sanctuary.speciesId;
              const icon = SPECIES_ICONS[sp.id] ?? "🦖";
              return (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => handleSelectSpecies(sp.id)}
                  aria-pressed={selected}
                  style={{
                    textAlign: "left",
                    padding: "9px 11px",
                    borderRadius: "13px",
                    border: selected
                      ? `1.5px solid ${sp.palette.skinHex}`
                      : "1px solid rgba(255,255,255,0.14)",
                    background: selected
                      ? `linear-gradient(135deg, ${sp.palette.skinHex}28, ${sp.palette.crestHex}1f)`
                      : "rgba(255,255,255,0.04)",
                    color: "#ffffff",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "3px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12.5px",
                      fontWeight: 800,
                    }}
                  >
                    <span style={{ color: sp.palette.skinHex }}>
                      {icon} {sp.name}
                    </span>
                    {selected ? (
                      <span style={{ fontSize: "10px", color: "#84fab0" }}>✓ 已选</span>
                    ) : null}
                  </div>
                  <div
                    style={{
                      fontSize: "10.5px",
                      color: "rgba(235,250,245,0.75)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {sp.title} · {sp.mbti}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              flexWrap: "wrap",
              padding: "9px 11px",
              borderRadius: "13px",
              background: "rgba(255, 224, 130, 0.1)",
              border: "1px solid rgba(255, 224, 130, 0.35)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
              <span style={{ fontSize: "11.5px", fontWeight: 700, whiteSpace: "nowrap" }}>
                🏷️ 爱宠赐名：
              </span>
              <input
                type="text"
                aria-label="小恐龙专属昵称"
                value={sanctuary.customName}
                maxLength={14}
                onChange={e => updateSanctuary({ customName: e.target.value })}
                style={{
                  flex: 1,
                  minWidth: "90px",
                  padding: "4px 8px",
                  borderRadius: "8px",
                  border: "1px solid rgba(132,250,176,0.5)",
                  background: "rgba(0,0,0,0.35)",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              />
              <button
                type="button"
                onClick={handleRandomDinoName}
                style={{
                  padding: "4px 8px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                🎲 随机靓名
              </button>
            </div>
            <div style={{ fontSize: "11px", color: "#ffe082" }}>
              🪪 契约训龙师：{trainerNicknameHint?.trim() || "准 ANS 创作者"} · 注册后自动入驻右下角
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
