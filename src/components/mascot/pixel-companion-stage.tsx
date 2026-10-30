"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  DINO_STATES,
  IDLE_VARIANTS,
  atlasCellPositionPercent,
  atlasRowOffsetPercent,
  isDinoState,
  type DinoState,
} from "@/lib/mascot/atlas";
import {
  GROK_COMMAND_EVENT,
  getGrokShapeSnapshot,
  getPixelStateSnapshot,
  getRenderStyle2dSnapshot,
  subscribeMascotStore,
  writeGrokShape,
  writePixelState,
  type GrokBotCommand,
} from "@/lib/mascot/client-store";
import {
  FIXED_STEP,
  HEAD_C,
  STATE_RECIPES,
  TUTULONG_FOOT_ORIGIN,
  VIEWBOX_MIN,
  VIEWBOX_SPAN,
  clamp,
  createSpring,
  getSpeciesPalette,
  resolveGrokAtlasCell,
  stepSpring,
  type GrokMorphEffect,
} from "@/lib/mascot/grokbot-dino-2d";
import {
  SANCTUARY_EVENT_NAME,
  loadSanctuaryState,
} from "@/domain/mascot/sanctuary";
import { SOUL_PLUGINS_EVENT_NAME } from "@/domain/mascot/soul-plugins";
import { getSoulPluginsSnapshot } from "@/lib/mascot/soul-store";

interface PixelCompanionStageProps {
  phase: string;
  open: boolean;
}

type BounceKind = "none" | "hop" | "squash" | "shake" | "spin";

function phaseToPixelState(phase: string): DinoState | null {
  switch (phase) {
    case "working":
    case "submitting":
    case "saving":
    case "queued":
      return "work";
    case "confirm":
    case "input":
    case "editing":
      return "react";
    case "attention":
    case "failed":
    case "recovering":
      return "meme";
    case "review":
    case "ready":
      return "action";
    default:
      return null;
  }
}

/**
 * 权威正版「兔兔龙」2D 伴侣舞台（`public/mascot/pixel/dino-atlas.png` 8×8 64格官方表情包精灵）
 * -----------------------------------------------------------------------------------------
 * 严格遵循 `tutuDragon.js` 铁律：
 * - 角色本体 100% 只从权威 `dino-atlas.png`（64格官方表情包）整格裁切渲染，绝不画任何山寨 SVG 恐龙线条！
 * - 在「Grok 灵动引擎」模式下，以 120Hz 阻尼弹簧求解器（`stepSpring`）驱动正版 64 格表情包精灵：
 *   1. 脚底锚定 (`50% 91.4%`) 的 120Hz 呼吸起伏与等积挤压拉伸 (`scaleX = 1 - squash, scaleY = 1 + squash`)
 *   2. 鼠标视线追光与 3D 透视偏转 (`perspective(520px) rotateY(...) rotateZ(...)`) + 随光标自动切换歪头 `[0,2]` / 招手 `[0,4]`
 *   3. 智能 64 格微表情编排（平时稳立在 `[0,0]`，自然眨眼切 `[0,1]`，告别旧版把第 0 行 8 个不同动作当成连续帧狂闪的问题）
 *   4. 环绕在正版精灵四周的 GrokBot 状态粒子特效层（思考波浪点 `dots` / 行星环绕 `orbit` / 雷达扫描 `radar` / 闪耀星芒 `sparkle`）
 */
export function PixelCompanionStage({ phase, open }: PixelCompanionStageProps) {
  const storeState = useSyncExternalStore(
    subscribeMascotStore,
    getPixelStateSnapshot,
    () => "idle" as const,
  );
  const grokShape = useSyncExternalStore(
    subscribeMascotStore,
    getGrokShapeSnapshot,
    () => "tutulong" as const,
  );
  const renderStyle = useSyncExternalStore(
    subscribeMascotStore,
    getRenderStyle2dSnapshot,
    () => "grok" as const,
  );

  const [overrideState, setOverrideState] = useState<DinoState | null>(null);
  const [pinnedCell, setPinnedCell] = useState<readonly [number, number] | null>(null);
  const [bounce, setBounce] = useState<BounceKind>("none");
  const [speciesId, setSpeciesId] = useState<string>("mint_star");
  const [auraId, setAuraId] = useState<string>("aura_mint");
  const [gazeTilt, setGazeTilt] = useState<{ x: number; deg: number }>({ x: 0, deg: 0 });
  const [customMorph, setCustomMorph] = useState<GrokMorphEffect | null>(null);

  const revertTimerRef = useRef<number | null>(null);
  const bounceTimerRef = useRef<number | null>(null);
  const morphTimerRef = useRef<number | null>(null);

  // 正版 dino-atlas.png 精灵 DOM 与状态特效层 refs
  const stageSpanRef = useRef<HTMLSpanElement | null>(null);
  const pixelSpanRef = useRef<HTMLSpanElement | null>(null);
  const shadowSpanRef = useRef<HTMLSpanElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dotsGroupRef = useRef<SVGGElement | null>(null);
  const orbitGroupRef = useRef<SVGGElement | null>(null);
  const radarGroupRef = useRef<SVGGElement | null>(null);
  const sparkleGroupRef = useRef<SVGGElement | null>(null);

  // 120Hz 固定步长阻尼弹簧状态
  const physicsRef = useRef({
    headX: createSpring(0),
    headY: createSpring(0),
    rotation: createSpring(0),
    squash: createSpring(0),
    turnY: createSpring(0),
    spinZ: createSpring(0),
    morphSpring: createSpring(0),
    pointerActive: false,
    pointerClientX: 0,
    pointerClientY: 0,
    pointerNormX: 0,
    pointerNormY: 0,
    blinkStartedAt: -1,
    nextBlinkAt: 2400,
    winkStartedAt: -1,
    choreoIndex: 0,
    nextChoreoAt: 3200,
    lastBgPos: "0% 0%",
  });

  const clearTimers = () => {
    if (revertTimerRef.current !== null) {
      window.clearTimeout(revertTimerRef.current);
      revertTimerRef.current = null;
    }
    if (bounceTimerRef.current !== null) {
      window.clearTimeout(bounceTimerRef.current);
      bounceTimerRef.current = null;
    }
  };

  const triggerSpringImpulse = (kind: "poke" | "wink" | "spin" | "hop" | "shake") => {
    const p = physicsRef.current;
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    if (kind === "poke") {
      p.headY.v -= 92;
      p.squash.v += 2.6;
      p.rotation.v += (Math.random() < 0.5 ? -1 : 1) * 0.85;
      p.blinkStartedAt = now;
    } else if (kind === "wink") {
      p.winkStartedAt = now;
      p.rotation.target = 0.12;
      p.headY.v -= 52;
      p.squash.v += 1.4;
    } else if (kind === "spin") {
      const dir = Math.random() < 0.5 ? 1 : -1;
      p.spinZ.target += Math.PI * 2 * dir;
      p.headY.v -= 74;
      p.squash.v -= 1.6;
    } else if (kind === "hop") {
      p.headY.v -= 84;
      p.squash.v -= 1.8;
    } else if (kind === "shake") {
      p.headX.v += (Math.random() < 0.5 ? -1 : 1) * 96;
      p.rotation.v += (Math.random() < 0.5 ? -1 : 1) * 1.15;
      p.turnY.target = (Math.random() < 0.5 ? -1 : 1) * 0.35;
    }
  };

  const triggerTransient = (
    nextState: DinoState,
    durationMs: number,
    nextBounce: BounceKind = "hop",
    cell: readonly [number, number] | null = null,
  ) => {
    clearTimers();
    setOverrideState(nextState);
    setPinnedCell(cell);
    setBounce(nextBounce);
    if (nextBounce === "spin") {
      triggerSpringImpulse("spin");
    } else if (nextBounce === "squash") {
      triggerSpringImpulse("poke");
    } else if (nextBounce === "shake") {
      triggerSpringImpulse("shake");
    } else {
      triggerSpringImpulse("hop");
    }
    bounceTimerRef.current = window.setTimeout(() => {
      setBounce("none");
    }, 680);
    revertTimerRef.current = window.setTimeout(() => {
      setOverrideState(null);
      setPinnedCell(null);
    }, durationMs);
  };

  // Sync Sanctuary appearance (species tint & aura ring)
  useEffect(() => {
    const syncSanctuary = () => {
      try {
        const st = loadSanctuaryState();
        setSpeciesId(st.speciesId || "mint_star");
        setAuraId(st.equipped?.aura || "aura_mint");
      } catch {
        /* Ignore storage errors */
      }
    };
    syncSanctuary();
    window.addEventListener(SANCTUARY_EVENT_NAME, syncSanctuary);
    window.addEventListener("ans:sanctuary-updated", syncSanctuary);
    window.addEventListener("storage", syncSanctuary);
    return () => {
      window.removeEventListener(SANCTUARY_EVENT_NAME, syncSanctuary);
      window.removeEventListener("ans:sanctuary-updated", syncSanctuary);
      window.removeEventListener("storage", syncSanctuary);
    };
  }, []);

  // Connect DSH Soul Mood (dsh-feiyu-mood) changes to GrokBot 2D impulses
  useEffect(() => {
    const onSoulUpdate = () => {
      try {
        const soul = getSoulPluginsSnapshot();
        if (!soul.enabled["dsh-feiyu-mood"]) return;
        const score = soul.feiyuMood.mood;
        if (score >= 82) {
          triggerSpringImpulse("hop");
        } else if (score >= 68) {
          triggerSpringImpulse("wink");
        }
      } catch {
        /* Ignore */
      }
    };
    window.addEventListener(SOUL_PLUGINS_EVENT_NAME, onSoulUpdate);
    return () => window.removeEventListener(SOUL_PLUGINS_EVENT_NAME, onSoulUpdate);
  }, []);

  // Greet when companion panel opens
  useEffect(() => {
    if (open) {
      triggerTransient("action", 2600, "hop", [0, 4]);
    }
    return () => {
      clearTimers();
      if (morphTimerRef.current !== null) {
        window.clearTimeout(morphTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Listen to global mascot interaction events & GrokBot commands
  useEffect(() => {
    const onInteract = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail ?? {};
      const action = String(detail.action ?? detail.kind ?? "pat");
      if (action === "whip") {
        const cells: readonly (readonly [number, number])[] = [
          [3, 2],
          [3, 1],
          [7, 5],
          [5, 4],
        ];
        const chosen = cells[Math.floor(Math.random() * cells.length)];
        triggerTransient("work", 3600, "shake", chosen);
      } else if (action === "feed") {
        const cells: readonly (readonly [number, number])[] = [
          [5, 7],
          [3, 5],
          [6, 4],
          [4, 7],
        ];
        const chosen = cells[Math.floor(Math.random() * cells.length)];
        triggerTransient("react", 3800, "hop", chosen);
      } else if (action === "pat") {
        const cells: readonly (readonly [number, number])[] = [
          [4, 7],
          [6, 2],
          [4, 5],
          [0, 1],
        ];
        const chosen = cells[Math.floor(Math.random() * cells.length)];
        triggerTransient("emote", 3000, "squash", chosen);
        triggerSpringImpulse("wink");
      } else if (action === "turntable") {
        triggerSpringImpulse("spin");
      } else if (action === "click" || action === "pose") {
        const states: readonly DinoState[] = ["action", "emote", "meme", "run"];
        const chosenState = states[Math.floor(Math.random() * states.length)];
        writePixelState(chosenState);
        triggerTransient(chosenState, 3200, "hop", null);
      } else if (action === "hover") {
        if (detail.active !== false) {
          triggerTransient("action", 2200, "hop", [0, 4]);
        }
      }
    };

    const onStageHover = (event: Event) => {
      const hover = Boolean((event as CustomEvent<{ hover?: boolean }>).detail?.hover);
      if (hover) {
        triggerTransient("action", 2000, "hop", [0, 4]);
        triggerSpringImpulse("wink");
      }
    };

    const onStageClick = () => {
      const cells: readonly (readonly [number, number])[] = [
        [6, 0],
        [6, 3],
        [4, 7],
        [7, 6],
        [7, 0],
      ];
      const chosen = cells[Math.floor(Math.random() * cells.length)];
      triggerTransient("action", 2600, "hop", chosen);
      triggerSpringImpulse("poke");
    };

    const onGrokCommand = (event: Event) => {
      const cmd = (event as CustomEvent<GrokBotCommand>).detail;
      if (!cmd) return;
      if (cmd.kind === "poke") {
        const pokeCells: readonly (readonly [number, number])[] = [
          [6, 0],
          [4, 2],
          [4, 7],
          [6, 3],
          [7, 6],
        ];
        const chosen = pokeCells[Math.floor(Math.random() * pokeCells.length)];
        triggerTransient("action", 2200, "squash", chosen);
      } else if (cmd.kind === "wink") {
        triggerTransient("emote", 1800, "hop", [0, 1]);
        triggerSpringImpulse("wink");
      } else if (cmd.kind === "spin") {
        triggerTransient("meme", 2200, "spin", [7, 6]);
      } else if (cmd.kind === "morph") {
        setCustomMorph(cmd.effect === "none" ? null : cmd.effect);
        if (morphTimerRef.current !== null) window.clearTimeout(morphTimerRef.current);
        if (cmd.effect !== "none") {
          morphTimerRef.current = window.setTimeout(() => {
            setCustomMorph(null);
          }, 4200);
        }
      } else if (cmd.kind === "shape") {
        writeGrokShape(cmd.shape);
        physicsRef.current.choreoIndex = 0;
        triggerSpringImpulse("poke");
      }
    };

    window.addEventListener("ans:dino-interact", onInteract);
    window.addEventListener("ans:dino-stage-hover", onStageHover);
    window.addEventListener("ans:dino-stage-click", onStageClick);
    window.addEventListener(GROK_COMMAND_EVENT, onGrokCommand);
    return () => {
      window.removeEventListener("ans:dino-interact", onInteract);
      window.removeEventListener("ans:dino-stage-hover", onStageHover);
      window.removeEventListener("ans:dino-stage-click", onStageClick);
      window.removeEventListener(GROK_COMMAND_EVENT, onGrokCommand);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subtle autonomous life loop when idle
  useEffect(() => {
    if (storeState !== "idle" || overrideState !== null) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const pick = IDLE_VARIANTS[Math.floor(Math.random() * IDLE_VARIANTS.length)];
      if (pick !== "idle") {
        triggerTransient(pick, 3200, pick === "walk" ? "none" : "hop", null);
      }
    }, 11_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeState, overrideState]);

  // Pointer gaze tracking
  useEffect(() => {
    let last = 0;
    const onMove = (event: PointerEvent) => {
      const p = physicsRef.current;
      p.pointerClientX = event.clientX;
      p.pointerClientY = event.clientY;
      p.pointerActive = true;
      if (event.pointerType !== "mouse" || performance.now() - last < 70) return;
      last = performance.now();
      const nx = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      setGazeTilt({
        x: Number((nx * 2.5).toFixed(2)),
        deg: Number((nx * 3.8).toFixed(2)),
      });
    };
    const onLeave = () => {
      physicsRef.current.pointerActive = false;
      physicsRef.current.pointerNormX = 0;
      physicsRef.current.pointerNormY = 0;
    };
    const onDown = (event: PointerEvent) => {
      if (!stageSpanRef.current) return;
      const rect = stageSpanRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(event.clientX - cx, event.clientY - cy);
      if (dist <= Math.max(rect.width, rect.height) * 0.72) {
        triggerSpringImpulse(Math.random() < 0.7 ? "poke" : "wink");
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const phaseState = phaseToPixelState(phase);
  const displayState: DinoState =
    overrideState ?? phaseState ?? (isDinoState(storeState) ? storeState : "idle");
  const recipe = STATE_RECIPES[displayState] ?? STATE_RECIPES.idle;
  const activeMorph: GrokMorphEffect = customMorph ?? recipe.morphEffect;

  // GrokBot 120Hz 阻尼弹簧引擎：直接驱动正版 64 格 `dino-atlas.png` 表情包精灵
  useEffect(() => {
    if (renderStyle !== "grok") return;
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      return;
    }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced) return;

    let frameId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = clamp((now - lastTime) / 1000, FIXED_STEP, 0.08);
      lastTime = now;
      const tSec = now / 1000;
      const p = physicsRef.current;

      // 1. 状态池内的自主表情帧流转（非狂闪，每 2.8~4.6 秒自然切换一次同状态精选表情包帧）
      if (now >= p.nextChoreoAt) {
        p.choreoIndex = (p.choreoIndex + 1) % 24;
        p.nextChoreoAt = now + 2800 + Math.random() * 1800;
        p.squash.v += 0.45;
      }

      // 2. 自然眨眼 (180ms 切换到 [0, 1] 眨眼/Wink 精灵帧，带轻微 Q 弹呼吸)
      if (p.blinkStartedAt < 0 && now >= p.nextBlinkAt) {
        p.blinkStartedAt = now;
        p.nextBlinkAt = now + 2800 + Math.random() * 3400;
        p.squash.v += 0.35;
      }
      let isBlinking = false;
      if (p.blinkStartedAt >= 0) {
        if (now - p.blinkStartedAt >= 200) {
          p.blinkStartedAt = -1;
        } else {
          isBlinking = true;
        }
      }

      let isWinking = false;
      if (p.winkStartedAt >= 0) {
        if (now - p.winkStartedAt >= 480) {
          p.winkStartedAt = -1;
        } else {
          isWinking = true;
        }
      }

      // 3. 指针追光与 3D 球面感偏转目标计算
      if (p.pointerActive && stageSpanRef.current) {
        const rect = stageSpanRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        p.pointerNormX = clamp((p.pointerClientX - cx) / Math.max(rect.width * 3.5, 200), -1, 1);
        p.pointerNormY = clamp((p.pointerClientY - cy) / Math.max(rect.height * 3.5, 200), -1, 1);
      } else {
        p.pointerNormX = 0;
        p.pointerNormY = 0;
      }

      // 4. 120Hz 呼吸起伏、等积挤压拉伸 (Squash & Stretch) 与歪头目标
      p.headY.target =
        Math.sin(tSec * recipe.bobFreq) * (recipe.bobAmpY * 0.55) +
        p.pointerNormY * 1.6;
      p.headX.target =
        Math.cos(tSec * recipe.swayFreq) * (recipe.swayAmpX * 0.55) +
        p.pointerNormX * 3.2;
      p.squash.target = 0.028 * Math.sin(tSec * recipe.bobFreq + Math.PI / 2);
      p.rotation.target =
        Math.sin(tSec * recipe.tiltFreq) * recipe.tiltAmpRad +
        p.pointerNormX * 0.075;
      p.turnY.target =
        Math.sin(tSec * recipe.turnFreq) * (recipe.turnAmpRad * 0.5) +
        p.pointerNormX * 0.24;
      p.morphSpring.target = activeMorph !== "none" ? 1 : 0;

      // 5. 推进 120Hz 半隐式欧拉阻尼弹簧
      stepSpring(p.headX, 4.5, 0.86, dt);
      stepSpring(p.headY, 5.0, 0.82, dt);
      stepSpring(p.rotation, 5.6, 0.84, dt);
      stepSpring(p.squash, 11.0, 0.72, dt);
      stepSpring(p.turnY, 9.5, 0.88, dt);
      stepSpring(p.spinZ, 6.2, 0.92, dt);
      stepSpring(p.morphSpring, 12.0, 0.92, dt);

      // 6. 解析当前应展示的正版 64 格 `dino-atlas.png` 单元格 [row, col]
      const cell = resolveGrokAtlasCell({
        state: displayState,
        shape: grokShape,
        pinnedCell,
        isBlinking,
        isWinking,
        pointerNormX: p.pointerNormX,
        pointerActive: p.pointerActive,
        tSec,
        choreoIndex: p.choreoIndex,
      });
      const bgPos = atlasCellPositionPercent(cell[0], cell[1]);
      if (pixelSpanRef.current && bgPos !== p.lastBgPos) {
        pixelSpanRef.current.style.backgroundPosition = bgPos;
        p.lastBgPos = bgPos;
      }

      // 7. 应用 120Hz 弹簧变换矩阵（脚底锚定 50% 91.4%，等积缩放 sx = 1 - squash, sy = 1 + squash）
      const sq = clamp(p.squash.x, -0.26, 0.28);
      const sx = 1 - sq;
      const sy = 1 + sq;
      const rotZDeg = ((p.rotation.x + p.spinZ.x) * 180) / Math.PI;
      const rotYDeg = (p.turnY.x * 180) / Math.PI;

      if (pixelSpanRef.current) {
        pixelSpanRef.current.style.transformOrigin = TUTULONG_FOOT_ORIGIN;
        pixelSpanRef.current.style.transform = `perspective(520px) translate3d(${p.headX.x.toFixed(2)}px, ${p.headY.x.toFixed(2)}px, 0) rotateY(${rotYDeg.toFixed(2)}deg) rotateZ(${rotZDeg.toFixed(2)}deg) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
      }

      if (shadowSpanRef.current) {
        const shadowScale = clamp(1 - p.headY.x * 0.025 + sq * 0.45, 0.65, 1.28);
        shadowSpanRef.current.style.transform = `translate3d(${(p.headX.x * 0.45).toFixed(2)}px, 0, 0) scaleX(${shadowScale.toFixed(3)})`;
      }

      // 8. 环绕正版精灵四周的 GrokBot 状态特效层 (dots / orbit / radar / sparkle)
      const morphVal = clamp(p.morphSpring.x, 0, 1);
      if (dotsGroupRef.current) {
        dotsGroupRef.current.style.opacity =
          activeMorph === "dots" ? morphVal.toFixed(3) : "0";
        if (activeMorph === "dots") {
          const circles = dotsGroupRef.current.querySelectorAll("circle");
          circles.forEach((c, i) => {
            const wave = Math.sin(tSec * 6.5 - i * 0.9) * 5.5;
            c.setAttribute("cy", (20 + wave).toFixed(2));
          });
        }
      }
      if (orbitGroupRef.current) {
        orbitGroupRef.current.style.opacity =
          activeMorph === "orbit" ? morphVal.toFixed(3) : "0";
        if (activeMorph === "orbit") {
          const sat = orbitGroupRef.current.querySelector("circle");
          if (sat) {
            const angle = tSec * 3.8;
            const ox = HEAD_C + Math.cos(angle) * 102;
            const oy = 132 + Math.sin(angle) * 32;
            sat.setAttribute("cx", ox.toFixed(2));
            sat.setAttribute("cy", oy.toFixed(2));
          }
        }
      }
      if (radarGroupRef.current) {
        radarGroupRef.current.style.opacity =
          activeMorph === "radar" ? morphVal.toFixed(3) : "0";
        if (activeMorph === "radar") {
          const rings = radarGroupRef.current.querySelectorAll("circle");
          rings.forEach((r, i) => {
            const prog = (tSec * 0.85 + i * 0.5) % 1;
            r.setAttribute("r", (78 + prog * 34).toFixed(2));
            r.setAttribute("stroke-opacity", ((1 - prog) * 0.72).toFixed(2));
          });
        }
      }
      if (sparkleGroupRef.current) {
        sparkleGroupRef.current.style.opacity =
          activeMorph === "sparkle" ? morphVal.toFixed(3) : "0";
        if (activeMorph === "sparkle") {
          const stars = sparkleGroupRef.current.querySelectorAll("g");
          stars.forEach((g, i) => {
            const pulseS = 0.75 + 0.32 * Math.sin(tSec * 5.2 + i * 1.4);
            const floatY = Math.cos(tSec * 3.6 + i) * 4;
            const basePos =
              i === 0 ? "22 38" : i === 1 ? "214 42" : "24 172";
            g.setAttribute(
              "transform",
              `translate(${basePos}) translate(0 ${floatY.toFixed(2)}) scale(${pulseS.toFixed(3)})`,
            );
          });
        }
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [renderStyle, recipe, displayState, grokShape, pinnedCell, activeMorph]);

  const spec = DINO_STATES[displayState] ?? DINO_STATES.idle;
  const rowOffsetY = atlasRowOffsetPercent(displayState);
  const palette = getSpeciesPalette(speciesId);

  const initialGrokCell = resolveGrokAtlasCell({
    state: displayState,
    shape: grokShape,
    pinnedCell,
    isBlinking: false,
    isWinking: false,
    pointerNormX: 0,
    pointerActive: false,
    tSec: 0,
    choreoIndex: 0,
  });

  const spriteInlineStyle: React.CSSProperties =
    renderStyle === "grok"
      ? {
          backgroundPosition: atlasCellPositionPercent(
            initialGrokCell[0],
            initialGrokCell[1],
          ),
          animation: "none",
          transformOrigin: TUTULONG_FOOT_ORIGIN,
        }
      : pinnedCell
        ? {
            backgroundPosition: atlasCellPositionPercent(pinnedCell[0], pinnedCell[1]),
            animation: "none",
            transform: `translate3d(${gazeTilt.x}px, 0, 0) rotate(${gazeTilt.deg}deg)`,
          }
        : {
            backgroundPositionY: rowOffsetY,
            animationDuration: `${spec.durationMs}ms`,
            transform: `translate3d(${gazeTilt.x}px, 0, 0) rotate(${gazeTilt.deg}deg)`,
          };

  return (
    <span
      ref={stageSpanRef}
      className="ans-dino-pixel-stage"
      data-species={speciesId}
      data-aura={auraId}
      data-bounce={bounce}
      data-render-style={renderStyle}
    >
      <span className="ans-dino-pixel-aura" aria-hidden="true" />
      <span ref={shadowSpanRef} className="ans-dino-pixel-shadow" aria-hidden="true" />
      <span
        ref={pixelSpanRef}
        className={`ans-dino-pixel ${renderStyle === "grok" ? "ans-dino-grok" : ""}`}
        data-testid="mascot-pixel-avatar"
        data-pixel-state={displayState}
        data-grok-shape={grokShape}
        data-grok-morph={activeMorph}
        data-render-style={renderStyle}
        data-pinned={pinnedCell ? `${pinnedCell[0]},${pinnedCell[1]}` : undefined}
        style={spriteInlineStyle}
      >
        {renderStyle === "grok" && (
          <svg
            ref={svgRef}
            className="ans-dino-grok-svg"
            viewBox={`${VIEWBOX_MIN} ${VIEWBOX_MIN} ${VIEWBOX_SPAN} ${VIEWBOX_SPAN}`}
            aria-hidden="true"
          >
            {/* Agent Morph Layer: Radar Concentric Scan Rings */}
            <g ref={radarGroupRef} style={{ opacity: activeMorph === "radar" ? 1 : 0 }}>
              <circle
                cx={HEAD_C}
                cy="124"
                r={86}
                fill="none"
                stroke={palette.accentGlow}
                strokeWidth="3"
                strokeDasharray="9 7"
              />
              <circle
                cx={HEAD_C}
                cy="124"
                r={102}
                fill="none"
                stroke={palette.badgeColor}
                strokeWidth="2.2"
              />
            </g>

            {/* Agent Morph Layer: Thinking 3-Dot Wave */}
            <g ref={dotsGroupRef} style={{ opacity: activeMorph === "dots" ? 1 : 0 }}>
              <circle
                cx="176"
                cy="20"
                r="7"
                fill={palette.badgeColor}
                stroke={palette.inkColor}
                strokeWidth="2.5"
              />
              <circle
                cx="196"
                cy="20"
                r="8"
                fill={palette.accentGlow}
                stroke={palette.inkColor}
                strokeWidth="2.5"
              />
              <circle
                cx="216"
                cy="20"
                r="7"
                fill={palette.cheekColor}
                stroke={palette.inkColor}
                strokeWidth="2.5"
              />
            </g>

            {/* Agent Morph Layer: Orbit Ring + Satellite */}
            <g
              ref={orbitGroupRef}
              transform={`rotate(-14 ${HEAD_C} 132)`}
              style={{ opacity: activeMorph === "orbit" ? 1 : 0 }}
            >
              <ellipse
                cx={HEAD_C}
                cy="132"
                rx="102"
                ry="32"
                fill="none"
                stroke={palette.accentGlow}
                strokeWidth="3"
                strokeDasharray="8 6"
              />
              <circle
                cx={HEAD_C + 102}
                cy="132"
                r="8.5"
                fill={palette.badgeColor}
                stroke={palette.inkColor}
                strokeWidth="2.4"
              />
            </g>

            {/* Agent Morph Layer: Celebratory Sparkle Burst */}
            <g ref={sparkleGroupRef} style={{ opacity: activeMorph === "sparkle" ? 1 : 0 }}>
              <g transform="translate(22 38)">
                <path
                  d="M 0 -11 L 3 -3 L 11 0 L 3 3 L 0 11 L -3 3 L -11 0 L -3 -3 Z"
                  fill={palette.badgeColor}
                  stroke={palette.inkColor}
                  strokeWidth="1.5"
                />
              </g>
              <g transform="translate(214 42)">
                <path
                  d="M 0 -10 L 2.8 -2.8 L 10 0 L 2.8 2.8 L 0 10 L -2.8 2.8 L -10 0 L -2.8 -2.8 Z"
                  fill={palette.cheekColor}
                  stroke={palette.inkColor}
                  strokeWidth="1.5"
                />
              </g>
              <g transform="translate(24 172)">
                <path
                  d="M 0 -8 L 2.2 -2.2 L 8 0 L 2.2 2.2 L 0 8 L -2.2 2.2 L -8 0 L -2.2 -2.2 Z"
                  fill={palette.accentGlow}
                  stroke={palette.inkColor}
                  strokeWidth="1.5"
                />
              </g>
            </g>
          </svg>
        )}
      </span>
    </span>
  );
}
