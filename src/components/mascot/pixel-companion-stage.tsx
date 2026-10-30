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
  DINO_BASE_X,
  DINO_BASE_Y,
  DINO_U,
  FIXED_STEP,
  GROK_EXPRESSIONS,
  GROK_SHAPE_META,
  GROK_SHAPE_RINGS,
  HEAD_C,
  STATE_RECIPES,
  VIEWBOX_MIN,
  VIEWBOX_SPAN,
  arcContourPts,
  buildV46StandingDinoRing,
  clamp,
  createSpring,
  getSpeciesPalette,
  lerpRing,
  openOutline,
  projectEyeOnSphere,
  ringOutline,
  stepSpring,
  type GrokExpressionId,
  type GrokMorphEffect,
  type GrokShapeId,
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

const INITIAL_BODY_PATH = ringOutline(GROK_SHAPE_RINGS.tutulong);
const INITIAL_LEFT_EYE_PATH = projectEyeOnSphere({
  ring: GROK_EXPRESSIONS.neutral[0],
  shapeRing: GROK_SHAPE_RINGS.tutulong,
  turnAngle: 0,
  gazeX: 0,
  gazeY: 0,
  eyeOpen: 1,
  eyeScale: 1,
  pulse: 1,
});
const INITIAL_RIGHT_EYE_PATH = projectEyeOnSphere({
  ring: GROK_EXPRESSIONS.neutral[1],
  shapeRing: GROK_SHAPE_RINGS.tutulong,
  turnAngle: 0,
  gazeX: 0,
  gazeY: 0,
  eyeOpen: 1,
  eyeScale: 1,
  pulse: 1,
});

// V4.6 头顶 3 个无缝圆润背棘凸起参数（严格对应 ans_chars.js lines 297-308）
const V46_HEAD_BUMPS: readonly {
  bx: number;
  by: number;
  brx: number;
  bry: number;
  brot: number;
}[] = [
  { bx: 2.38, by: -9.58, brx: 0.66, bry: 0.74, brot: 0.42 },
  { bx: 1.26, by: -10.22, brx: 0.92, bry: 1.02, brot: 0.2 },
  { bx: -0.08, by: -10.55, brx: 1.22, bry: 1.3, brot: 0.02 },
];

const INITIAL_BUMP_ARCS = V46_HEAD_BUMPS.map((b) =>
  openOutline(
    arcContourPts(
      DINO_BASE_X + b.bx * DINO_U,
      DINO_BASE_Y + b.by * DINO_U,
      b.brx * DINO_U,
      b.bry * DINO_U,
      -Math.PI * 0.94,
      -Math.PI * 0.06,
      12,
      b.brot,
    ),
  ),
);

// V4.6 小胖手开放描边路径（局部坐标下，肩部根部无描边，外侧+内侧贴肚弧线完整描边，还原 ans-mascot.png）
const PAW_ARC_PATH = openOutline(
  arcContourPts(
    0,
    0.92 * DINO_U,
    0.72 * DINO_U,
    1.08 * DINO_U,
    -Math.PI * 0.22,
    Math.PI * 1.18,
    16,
    0,
  ),
);

function buildTailPath(turnSin: number, wagPx: number): string {
  const tailDir = 1;
  const tBaseX = DINO_BASE_X + tailDir * 3.52 * DINO_U - turnSin * 12;
  const pts: [number, number][] = [
    [tBaseX, DINO_BASE_Y - 2.45 * DINO_U],
    [tBaseX + tailDir * 1.25 * DINO_U, DINO_BASE_Y - 2.52 * DINO_U + wagPx * 0.35],
    [tBaseX + tailDir * 1.82 * DINO_U, DINO_BASE_Y - 2.05 * DINO_U + wagPx * 0.7],
    [tBaseX + tailDir * 1.56 * DINO_U, DINO_BASE_Y - 1.28 * DINO_U + wagPx * 0.45],
    [tBaseX + tailDir * 0.78 * DINO_U, DINO_BASE_Y - 1.12 * DINO_U + wagPx * 0.2],
    [tBaseX - tailDir * 0.2 * DINO_U, DINO_BASE_Y - 1.38 * DINO_U],
  ];
  return ringOutline(pts);
}

const INITIAL_TAIL_PATH = buildTailPath(0, 0);

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

  // V4.6 兔兔龙 × GrokBot 120Hz SVG DOM refs
  const svgRef = useRef<SVGSVGElement | null>(null);
  const transformGroupRef = useRef<SVGGElement | null>(null);
  const bodyFillPathRef = useRef<SVGPathElement | null>(null);
  const bodyInkPathRef = useRef<SVGPathElement | null>(null);
  const clipPathRef = useRef<SVGPathElement | null>(null);
  const bellyGroupRef = useRef<SVGGElement | null>(null);
  const muzzleGroupRef = useRef<SVGGElement | null>(null);
  const tailPathRef = useRef<SVGPathElement | null>(null);
  const bumpsGroupRef = useRef<SVGGElement | null>(null);
  const leftArmGroupRef = useRef<SVGGElement | null>(null);
  const rightArmGroupRef = useRef<SVGGElement | null>(null);
  const leftCheekRef = useRef<SVGEllipseElement | null>(null);
  const rightCheekRef = useRef<SVGEllipseElement | null>(null);
  const mouthPathRef = useRef<SVGPathElement | null>(null);
  const leftEyeGroupRef = useRef<SVGGElement | null>(null);
  const rightEyeGroupRef = useRef<SVGGElement | null>(null);
  const leftEyePathRef = useRef<SVGPathElement | null>(null);
  const rightEyePathRef = useRef<SVGPathElement | null>(null);
  const leftHighlightRef = useRef<SVGCircleElement | null>(null);
  const rightHighlightRef = useRef<SVGCircleElement | null>(null);
  const leftSubHighlightRef = useRef<SVGCircleElement | null>(null);
  const rightSubHighlightRef = useRef<SVGCircleElement | null>(null);
  const dotsGroupRef = useRef<SVGGElement | null>(null);
  const orbitGroupRef = useRef<SVGGElement | null>(null);
  const radarGroupRef = useRef<SVGGElement | null>(null);
  const sparkleGroupRef = useRef<SVGGElement | null>(null);

  // 120Hz 固定步长阻尼弹簧状态
  const physicsRef = useRef({
    headX: createSpring(0),
    headY: createSpring(0),
    rotation: createSpring(0),
    scaleX: createSpring(1),
    scaleY: createSpring(1),
    turn: createSpring(0),
    spin: createSpring(0),
    eyeOpen: createSpring(1),
    eyeScale: createSpring(1),
    aimX: createSpring(0),
    aimY: createSpring(0),
    armLiftL: createSpring(0.12),
    armLiftR: createSpring(0.12),
    exprSpring: createSpring(1),
    shapeSpring: createSpring(1),
    morphSpring: createSpring(0),
    fromExpr: "neutral" as GrokExpressionId,
    toExpr: "neutral" as GrokExpressionId,
    fromShape: "tutulong" as GrokShapeId,
    toShape: "tutulong" as GrokShapeId,
    pointerX: 0,
    pointerY: 0,
    pointerTargetX: 0,
    pointerTargetY: 0,
    pointerActive: false,
    pointerClientX: 0,
    pointerClientY: 0,
    blinkStartedAt: -1,
    nextBlinkAt: 2400,
    winkEye: -1 as -1 | 0 | 1,
    winkStartedAt: -1,
    nextExprAt: 3200,
    nextGazeAt: 1800,
    exprPoolIndex: 0,
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
      p.headY.v -= 86;
      p.scaleY.v -= 0.44;
      p.scaleX.v += 0.36;
      p.armLiftL.v += 8.5;
      p.armLiftR.v += 8.5;
      p.rotation.v += (Math.random() < 0.5 ? -1 : 1) * 0.72;
      p.blinkStartedAt = now;
    } else if (kind === "wink") {
      p.winkEye = 1;
      p.winkStartedAt = now;
      p.rotation.target = 0.11;
      p.headY.v -= 45;
      p.armLiftR.v += 6.2;
    } else if (kind === "spin") {
      const dir = Math.random() < 0.5 ? 1 : -1;
      p.spin.target += Math.PI * 2 * dir;
      p.headY.v -= 62;
      p.scaleY.v += 0.2;
      p.armLiftL.v += 7.0;
      p.armLiftR.v += 7.0;
    } else if (kind === "hop") {
      p.headY.v -= 74;
      p.scaleY.v += 0.24;
      p.scaleX.v -= 0.16;
      p.armLiftL.v += 6.5;
      p.armLiftR.v += 6.5;
    } else if (kind === "shake") {
      p.headX.v += (Math.random() < 0.5 ? -1 : 1) * 95;
      p.rotation.v += (Math.random() < 0.5 ? -1 : 1) * 1.05;
      p.turn.target = (Math.random() < 0.5 ? -1 : 1) * 0.35;
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

  // Connect DSH Soul Mood (dsh-feiyu-mood) changes to GrokBot 2D expressions & impulses
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
      triggerTransient("action", 2600, "hop");
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
          [3, 7],
          [7, 5],
          [5, 3],
          [3, 1],
        ];
        const chosen = cells[Math.floor(Math.random() * cells.length)];
        triggerTransient("work", 3600, "shake", chosen);
      } else if (action === "feed") {
        const cells: readonly (readonly [number, number])[] = [
          [5, 7],
          [3, 5],
          [7, 6],
          [4, 2],
        ];
        const chosen = cells[Math.floor(Math.random() * cells.length)];
        triggerTransient("react", 3800, "hop", chosen);
      } else if (action === "pat") {
        const cells: readonly (readonly [number, number])[] = [
          [4, 7],
          [6, 2],
          [7, 6],
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
          triggerTransient("action", 2200, "hop", [6, 1]);
        }
      }
    };

    const onStageHover = (event: Event) => {
      const hover = Boolean((event as CustomEvent<{ hover?: boolean }>).detail?.hover);
      if (hover) {
        triggerTransient("action", 2000, "hop", [6, 1]);
        triggerSpringImpulse("wink");
      }
    };

    const onStageClick = () => {
      const cells: readonly (readonly [number, number])[] = [
        [6, 0],
        [7, 0],
        [4, 7],
        [7, 6],
        [6, 3],
      ];
      const chosen = cells[Math.floor(Math.random() * cells.length)];
      triggerTransient("action", 2600, "hop", chosen);
      triggerSpringImpulse("poke");
    };

    const onGrokCommand = (event: Event) => {
      const cmd = (event as CustomEvent<GrokBotCommand>).detail;
      if (!cmd) return;
      if (cmd.kind === "poke") {
        triggerSpringImpulse("poke");
      } else if (cmd.kind === "wink") {
        if (cmd.eye === 0 || cmd.eye === 1) {
          physicsRef.current.winkEye = cmd.eye;
          physicsRef.current.winkStartedAt = performance.now();
          physicsRef.current.headY.v -= 42;
        } else {
          triggerSpringImpulse("wink");
        }
      } else if (cmd.kind === "spin") {
        triggerSpringImpulse("spin");
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

  // Pointer gaze tracking (feeds both classic tilt and GrokBot spherical eye tracker)
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
    };
    const onDown = (event: PointerEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
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

  // Sync expression & posture transitions into the 120Hz spring engine
  useEffect(() => {
    const p = physicsRef.current;
    const nextExpr = recipe.expressions[0] ?? "neutral";
    if (nextExpr !== p.toExpr) {
      p.fromExpr = p.toExpr;
      p.toExpr = nextExpr;
      p.exprSpring.x = 0;
      p.exprSpring.v = 0;
      p.exprSpring.target = 1;
    }
    p.eyeScale.target = recipe.eyeScaleTarget;
    if (displayState === "action") {
      p.headY.v -= 58;
      p.armLiftL.v += 6.5;
      p.armLiftR.v += 6.5;
    }
  }, [displayState, recipe]);

  useEffect(() => {
    const p = physicsRef.current;
    if (grokShape !== p.toShape) {
      p.fromShape = p.toShape;
      p.toShape = grokShape;
      p.shapeSpring.x = 0;
      p.shapeSpring.v = 0;
      p.shapeSpring.target = 1;
    }
  }, [grokShape]);

  // GrokBot × V4.6 兔兔龙 120Hz 阻尼弹簧与球面眼渲染主循环
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

      // 1. 状态池内的自主微表情流转
      if (now >= p.nextExprAt && recipe.expressions.length > 1) {
        p.exprPoolIndex = (p.exprPoolIndex + 1) % recipe.expressions.length;
        const candidate = recipe.expressions[p.exprPoolIndex];
        if (candidate && candidate !== p.toExpr) {
          p.fromExpr = p.toExpr;
          p.toExpr = candidate;
          p.exprSpring.x = 0;
          p.exprSpring.v = 0;
          p.exprSpring.target = 1;
        }
        p.nextExprAt = now + 2600 + Math.random() * 2400;
      }

      // 2. 闲置时的自然视线微扫视 (Saccades)
      if (now >= p.nextGazeAt) {
        p.aimX.target = (Math.random() * 2 - 1) * 7.5;
        p.aimY.target = (Math.random() * 2 - 1) * 4.5;
        p.nextGazeAt = now + 1600 + Math.random() * 2200;
      }

      // 3. 自然非对称眨眼 (42% 闭合 / 58% 睁开)
      if (p.blinkStartedAt < 0 && now >= p.nextBlinkAt) {
        p.blinkStartedAt = now;
        p.nextBlinkAt = now + 2800 + Math.random() * 3400;
      }
      let blinkScale = 1;
      if (p.blinkStartedAt >= 0) {
        const elapsed = now - p.blinkStartedAt;
        if (elapsed >= 300) {
          p.blinkStartedAt = -1;
          blinkScale = 1;
        } else {
          const phaseNorm = elapsed / 300;
          blinkScale = Math.max(
            phaseNorm < 0.42 ? 1 - phaseNorm / 0.42 : (phaseNorm - 0.42) / 0.58,
            0.05,
          );
        }
      }
      p.eyeOpen.target = blinkScale;

      // 4. 呼吸起伏、歪头与指针追光目标计算
      p.headY.target = Math.sin(tSec * recipe.bobFreq) * recipe.bobAmpY;
      p.headX.target = Math.cos(tSec * recipe.swayFreq) * recipe.swayAmpX;

      let pointerTurn = 0;
      let pointerTilt = 0;
      if (p.pointerActive && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dxNorm = clamp((p.pointerClientX - cx) / Math.max(rect.width * 3.2, 180), -1, 1);
        const dyNorm = clamp((p.pointerClientY - cy) / Math.max(rect.height * 3.2, 180), -1, 1);
        p.pointerTargetX = dxNorm * 13;
        p.pointerTargetY = dyNorm * 8.5;
        pointerTurn = dxNorm * 0.28;
        pointerTilt = dxNorm * 0.065;
      } else {
        p.pointerTargetX = 0;
        p.pointerTargetY = 0;
      }

      p.turn.target =
        Math.sin(tSec * recipe.turnFreq) * recipe.turnAmpRad + pointerTurn;
      p.rotation.target =
        Math.sin(tSec * recipe.tiltFreq) * recipe.tiltAmpRad + pointerTilt;
      p.scaleY.target = 1 + 0.022 * Math.sin(tSec * recipe.bobFreq + Math.PI / 2);
      p.scaleX.target = 1 - 0.016 * Math.sin(tSec * recipe.bobFreq + Math.PI / 2);

      // 小胖手挥动弹簧目标
      const shapeMeta =
        GROK_SHAPE_META.find((m) => m.id === p.toShape) ?? GROK_SHAPE_META[0];
      p.armLiftL.target =
        shapeMeta.armLiftL +
        Math.sin(tSec * (recipe.bobFreq * 1.3)) * recipe.armWaveAmp -
        clamp(p.headY.v * 0.008, -0.4, 0.4);
      p.armLiftR.target =
        shapeMeta.armLiftR +
        Math.cos(tSec * (recipe.bobFreq * 1.3)) * recipe.armWaveAmp -
        clamp(p.headY.v * 0.008, -0.4, 0.4);
      p.morphSpring.target = activeMorph !== "none" ? 1 : 0;

      // 5. 推进 120Hz 阻尼弹簧
      stepSpring(p.headX, 4.2, 0.88, dt);
      stepSpring(p.headY, 4.6, 0.84, dt);
      stepSpring(p.rotation, 5.4, 0.86, dt);
      stepSpring(p.scaleX, 10.5, 0.75, dt);
      stepSpring(p.scaleY, 10.5, 0.75, dt);
      stepSpring(p.turn, 11.5, 0.92, dt);
      stepSpring(p.spin, 6.0, 0.94, dt);
      stepSpring(p.eyeOpen, 26.0, 1.0, dt);
      stepSpring(p.eyeScale, 9.0, 0.85, dt);
      stepSpring(p.aimX, 11.0, 0.95, dt);
      stepSpring(p.aimY, 11.0, 0.95, dt);
      stepSpring(p.armLiftL, 8.5, 0.72, dt);
      stepSpring(p.armLiftR, 8.5, 0.72, dt);
      stepSpring(p.exprSpring, 8.5, 0.96, dt);
      stepSpring(p.shapeSpring, 9.0, 0.88, dt);
      stepSpring(p.morphSpring, 12.0, 0.92, dt);

      // 6. V4.6 兔兔龙身体 + 小短腿轮廓实时生成
      const shapeBlend = clamp(p.shapeSpring.x, 0, 1);
      const fromShapeRing = GROK_SHAPE_RINGS[p.fromShape] ?? GROK_SHAPE_RINGS.tutulong;
      const toShapeRing =
        recipe.walkSpeed > 0
          ? buildV46StandingDinoRing({ walkPhase: tSec * recipe.walkSpeed })
          : (GROK_SHAPE_RINGS[p.toShape] ?? GROK_SHAPE_RINGS.tutulong);
      const currentShapeRing =
        shapeBlend >= 0.999 && recipe.walkSpeed === 0
          ? toShapeRing
          : lerpRing(fromShapeRing, toShapeRing, shapeBlend);
      const bodyD = ringOutline(currentShapeRing);
      bodyFillPathRef.current?.setAttribute("d", bodyD);
      bodyInkPathRef.current?.setAttribute("d", bodyD);
      clipPathRef.current?.setAttribute("d", bodyD);

      // 7. 整身体阻尼弹簧变换（锚定在脚底略上方，蹲跳自然Q弹）
      const turnAngle = p.turn.x + p.spin.x;
      const rotDeg = (p.rotation.x * 180) / Math.PI;
      transformGroupRef.current?.setAttribute(
        "transform",
        `translate(${(HEAD_C + p.headX.x).toFixed(2)} ${(156 + p.headY.x).toFixed(2)}) rotate(${rotDeg.toFixed(2)}) scale(${p.scaleX.x.toFixed(4)} ${p.scaleY.x.toFixed(4)}) translate(${-HEAD_C} -156)`,
      );

      // 8. 球面视差驱动：头顶 3 个无缝圆凸起、双奶白贴片、小胖手与小尾巴
      const sinTurn = Math.sin(turnAngle);
      const cosTurn = Math.cos(turnAngle);

      // 头顶 3 个无缝背棘随转头水平微移
      bumpsGroupRef.current?.setAttribute(
        "transform",
        `translate(${(sinTurn * 10).toFixed(2)} 0)`,
      );

      // 奶白下脸颊贴片 & 圆肚皮贴片随球面转头移动与透视缩放
      const faceScaleX = clamp(0.35 + 0.65 * Math.abs(cosTurn), 0.35, 1);
      const muzzleShiftX = sinTurn * 18;
      muzzleGroupRef.current?.setAttribute(
        "transform",
        `translate(${(DINO_BASE_X + muzzleShiftX).toFixed(2)} ${(DINO_BASE_Y - 6.32 * DINO_U).toFixed(2)}) scale(${faceScaleX.toFixed(3)} 1) translate(${-DINO_BASE_X} ${-(DINO_BASE_Y - 6.32 * DINO_U)})`,
      );
      muzzleGroupRef.current?.setAttribute("opacity", cosTurn > -0.15 ? "1" : "0");

      const bellyShiftX = sinTurn * 15;
      bellyGroupRef.current?.setAttribute(
        "transform",
        `translate(${(DINO_BASE_X + bellyShiftX).toFixed(2)} ${(DINO_BASE_Y - 3.05 * DINO_U).toFixed(2)}) scale(${faceScaleX.toFixed(3)} 1) translate(${-DINO_BASE_X} ${-(DINO_BASE_Y - 3.05 * DINO_U)})`,
      );
      bellyGroupRef.current?.setAttribute("opacity", cosTurn > -0.2 ? "1" : "0");

      // 左右无缝小胖手旋转：待机时贴合胖肚皮两侧自然下垂 (还原 ans-mascot.png)，欢呼/互动时向外上方高举
      // SVG 中 +Y 向下，rotate(+) 为顺时针（向左外侧抬起），rotate(-) 为逆时针（向右外侧抬起）
      const swingLDeg = 10 + p.armLiftL.x * 105;
      const swingRDeg = -10 - p.armLiftR.x * 105;
      leftArmGroupRef.current?.setAttribute(
        "transform",
        `translate(${(DINO_BASE_X - 4.32 * DINO_U + sinTurn * 4).toFixed(2)} ${(DINO_BASE_Y - 4.55 * DINO_U).toFixed(2)}) rotate(${swingLDeg.toFixed(2)})`,
      );
      rightArmGroupRef.current?.setAttribute(
        "transform",
        `translate(${(DINO_BASE_X + 4.32 * DINO_U + sinTurn * 4).toFixed(2)} ${(DINO_BASE_Y - 4.55 * DINO_U).toFixed(2)}) rotate(${swingRDeg.toFixed(2)})`,
      );

      // 低位胯部上翘小尾巴摇摆
      const wagPx = Math.sin(tSec * 6.8) * 0.22 * DINO_U + p.headY.v * 0.05;
      tailPathRef.current?.setAttribute("d", buildTailPath(sinTurn, wagPx));

      // 9. 48 点 Q 萌大眼睛轮廓插值与球面投影
      const exprAmount = clamp(p.exprSpring.x, 0, 1);
      const fromPair = GROK_EXPRESSIONS[p.fromExpr] ?? GROK_EXPRESSIONS.neutral;
      const toPair = GROK_EXPRESSIONS[p.toExpr] ?? GROK_EXPRESSIONS.neutral;
      const eyeRings = [
        exprAmount >= 0.999 ? toPair[0] : lerpRing(fromPair[0], toPair[0], exprAmount),
        exprAmount >= 0.999 ? toPair[1] : lerpRing(fromPair[1], toPair[1], exprAmount),
      ];

      const smoothing = 1 - Math.exp(60 * Math.log(0.91) * dt);
      const pulse = 1 + 0.04 * Math.sin(exprAmount * Math.PI);
      const isCurvedSmileEye =
        p.toExpr === "happy" ||
        p.toExpr === "proud" ||
        p.toExpr === "shy" ||
        p.toExpr === "sleepy";

      const eyeRefs = [
        {
          group: leftEyeGroupRef.current,
          path: leftEyePathRef.current,
          hl: leftHighlightRef.current,
          subHl: leftSubHighlightRef.current,
        },
        {
          group: rightEyeGroupRef.current,
          path: rightEyePathRef.current,
          hl: rightHighlightRef.current,
          subHl: rightSubHighlightRef.current,
        },
      ];

      const projectedCenters: [number, number][] = [
        [DINO_BASE_X - 1.88 * DINO_U, DINO_BASE_Y - 7.35 * DINO_U],
        [DINO_BASE_X + 1.88 * DINO_U, DINO_BASE_Y - 7.35 * DINO_U],
      ];

      for (let idx = 0; idx < 2; idx += 1) {
        p.pointerX += (p.pointerTargetX - p.pointerX) * smoothing;
        p.pointerY += (p.pointerTargetY - p.pointerY) * smoothing;

        let winkFactor = 1;
        if (p.winkEye === idx && p.winkStartedAt >= 0) {
          const wElapsed = now - p.winkStartedAt;
          if (wElapsed >= 340) {
            p.winkEye = -1;
            p.winkStartedAt = -1;
          } else {
            const wPhase = wElapsed / 340;
            winkFactor = Math.max(
              wPhase < 0.42 ? 1 - wPhase / 0.42 : (wPhase - 0.42) / 0.58,
              0.05,
            );
          }
        }

        const autoWeight = p.pointerActive ? 0.22 : 1.0;
        const driftX =
          0.9 * Math.sin(0.00045 * now + idx) +
          p.pointerX +
          p.aimX.x * autoWeight;
        const driftY =
          0.6 * Math.sin(0.0006 * now + idx) +
          p.pointerY +
          p.aimY.x * autoWeight;

        const proj = projectEyeOnSphere({
          ring: eyeRings[idx],
          shapeRing: currentShapeRing,
          turnAngle,
          gazeX: driftX,
          gazeY: driftY,
          eyeOpen: p.eyeOpen.x * winkFactor,
          eyeScale: p.eyeScale.x,
          pulse,
        });

        projectedCenters[idx] = [proj.finalX, proj.finalY];

        const ref = eyeRefs[idx];
        const isPlayfulRightEye = p.toExpr === "playful" && idx === 1;
        const showHighlights =
          proj.visible &&
          proj.scaleY > 0.42 &&
          !isCurvedSmileEye &&
          !isPlayfulRightEye;

        if (ref.group && ref.path && ref.hl && ref.subHl) {
          ref.group.style.display = proj.visible ? "" : "none";
          ref.path.setAttribute("d", proj.d);
          ref.path.setAttribute(
            "transform",
            `translate(${proj.finalX.toFixed(2)} ${proj.finalY.toFixed(2)}) scale(${proj.scaleX.toFixed(4)} ${proj.scaleY.toFixed(4)}) translate(${(-proj.centerX).toFixed(2)} ${(-proj.centerY).toFixed(2)})`,
          );
          ref.hl.setAttribute("cx", proj.highlightX.toFixed(2));
          ref.hl.setAttribute("cy", proj.highlightY.toFixed(2));
          ref.hl.setAttribute("r", proj.highlightR.toFixed(2));
          ref.hl.style.display = showHighlights ? "" : "none";

          ref.subHl.setAttribute("cx", proj.subHighlightX.toFixed(2));
          ref.subHl.setAttribute("cy", proj.subHighlightY.toFixed(2));
          ref.subHl.setAttribute("r", proj.subHighlightR.toFixed(2));
          ref.subHl.style.display = showHighlights ? "" : "none";
        }
      }

      // 10. 粉嫩腮红与奶白下脸颊正中的 ω 猫咪微笑嘴
      const midEyeX = (projectedCenters[0][0] + projectedCenters[1][0]) / 2;
      const midEyeY = (projectedCenters[0][1] + projectedCenters[1][1]) / 2;

      if (leftCheekRef.current && rightCheekRef.current) {
        const lCheekX = projectedCenters[0][0] - 13.5 * Math.max(0.35, cosTurn);
        const rCheekX = projectedCenters[1][0] + 13.5 * Math.max(0.35, cosTurn);
        const cheekY = midEyeY + 12.8;
        leftCheekRef.current.setAttribute("cx", lCheekX.toFixed(2));
        leftCheekRef.current.setAttribute("cy", cheekY.toFixed(2));
        leftCheekRef.current.style.opacity =
          cosTurn > -0.15 ? String(recipe.blushOpacity) : "0";
        rightCheekRef.current.setAttribute("cx", rCheekX.toFixed(2));
        rightCheekRef.current.setAttribute("cy", cheekY.toFixed(2));
        rightCheekRef.current.style.opacity =
          cosTurn > -0.15 ? String(recipe.blushOpacity) : "0";
      }

      if (mouthPathRef.current) {
        const mx = midEyeX + sinTurn * 2.5;
        const my = midEyeY + 13.0;
        const mScale = clamp(Math.abs(cosTurn), 0.25, 1);
        const w = 7.6 * mScale;
        let mouthD = "";
        if (displayState === "action" || displayState === "emote") {
          // 开心张嘴笑弧 (还原 dino-atlas.png 欢呼笑嘴)
          mouthD = `M ${(mx - w).toFixed(1)} ${(my - 1).toFixed(1)} Q ${mx.toFixed(1)} ${(my + 10.5).toFixed(1)} ${(mx + w).toFixed(1)} ${(my - 1).toFixed(1)} Z`;
        } else if (displayState === "react") {
          // 好奇小圆嘴 "o"
          mouthD = `M ${(mx - 3.6 * mScale).toFixed(1)} ${(my + 2).toFixed(1)} A ${(3.6 * mScale).toFixed(1)} 4.0 0 1 0 ${(mx + 3.6 * mScale).toFixed(1)} ${(my + 2).toFixed(1)} A ${(3.6 * mScale).toFixed(1)} 4.0 0 1 0 ${(mx - 3.6 * mScale).toFixed(1)} ${(my + 2).toFixed(1)} Z`;
        } else {
          // 兔兔龙标志性鼻尖竖点 + ω 猫咪小恐龙微笑线 (100% 还原 ans-mascot.png)
          mouthD = `M ${mx.toFixed(1)} ${(my - 2.0).toFixed(1)} L ${mx.toFixed(1)} ${(my + 0.6).toFixed(1)} M ${(mx - w).toFixed(1)} ${(my + 1.4).toFixed(1)} Q ${(mx - w * 0.5).toFixed(1)} ${(my + 6.0).toFixed(1)} ${mx.toFixed(1)} ${(my + 0.4).toFixed(1)} Q ${(mx + w * 0.5).toFixed(1)} ${(my + 6.0).toFixed(1)} ${(mx + w).toFixed(1)} ${(my + 1.4).toFixed(1)}`;
        }
        mouthPathRef.current.setAttribute("d", mouthD);
        mouthPathRef.current.style.opacity = cosTurn > 0.05 ? "0.95" : "0";
      }

      // 11. Agent 状态动效叠加层 (dots / orbit / radar / sparkle)
      const morphVal = clamp(p.morphSpring.x, 0, 1);
      if (dotsGroupRef.current) {
        dotsGroupRef.current.style.opacity =
          activeMorph === "dots" ? morphVal.toFixed(3) : "0";
        if (activeMorph === "dots") {
          const circles = dotsGroupRef.current.querySelectorAll("circle");
          circles.forEach((c, i) => {
            const wave = Math.sin(tSec * 6.5 - i * 0.9) * 5.5;
            c.setAttribute("cy", (22 + wave).toFixed(2));
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
            const ox = HEAD_C + Math.cos(angle) * 98;
            const oy = 128 + Math.sin(angle) * 34;
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
            r.setAttribute("r", (76 + prog * 34).toFixed(2));
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
              i === 0 ? "26 42" : i === 1 ? "210 46" : "28 168";
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
  }, [renderStyle, recipe, displayState, activeMorph]);

  const spec = DINO_STATES[displayState] ?? DINO_STATES.idle;
  const rowOffsetY = atlasRowOffsetPercent(displayState);
  const palette = getSpeciesPalette(speciesId);

  const spriteInlineStyle: React.CSSProperties =
    renderStyle === "grok"
      ? {
          backgroundImage: "none",
          animation: "none",
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

  const gradId = `ans-grok-dino-grad-${speciesId}`;
  const shadeGradId = `ans-grok-dino-shade-${speciesId}`;
  const clipId = `ans-grok-dino-clip-${speciesId}`;

  return (
    <span
      className="ans-dino-pixel-stage"
      data-species={speciesId}
      data-aura={auraId}
      data-bounce={bounce}
      data-render-style={renderStyle}
    >
      <span className="ans-dino-pixel-aura" aria-hidden="true" />
      <span className="ans-dino-pixel-shadow" aria-hidden="true" />
      <span
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
            <defs>
              <radialGradient
                id={gradId}
                gradientUnits="userSpaceOnUse"
                cx="90"
                cy="78"
                r="26"
              >
                <stop offset="0%" stopColor={palette.rimLight} stopOpacity="0.52" />
                <stop offset="100%" stopColor={palette.bodyMid} stopOpacity="0" />
              </radialGradient>
              <radialGradient
                id={shadeGradId}
                gradientUnits="userSpaceOnUse"
                cx="166"
                cy="182"
                r="34"
              >
                <stop offset="0%" stopColor={palette.bodyEnd} stopOpacity="0.28" />
                <stop offset="100%" stopColor={palette.bodyMid} stopOpacity="0" />
              </radialGradient>
              <clipPath id={clipId}>
                <path ref={clipPathRef} d={INITIAL_BODY_PATH} />
              </clipPath>
            </defs>

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

            {/* Main 120Hz Spring Transform Group (V4.6 Standing Baby-Dino Rig) */}
            <g ref={transformGroupRef}>
              {/* 1. 低位胯部上翘小恐龙尾巴 (ans_chars.js lines 191-207) */}
              <path
                ref={tailPathRef}
                d={INITIAL_TAIL_PATH}
                fill={palette.bodyMid}
                stroke={palette.inkColor}
                strokeWidth="4.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* 2. V4.6 宽胖圆滚站立身体底色 (`curvyStandingDinoPts`)：使用纯正 bodyMid 底色确保与背棘/小手 100% 零色差无缝融合 */}
              <path
                ref={bodyFillPathRef}
                d={INITIAL_BODY_PATH}
                fill={palette.bodyMid}
              />

              {/* 3. 身体内部裁剪层：水彩高光/暗部 + 双奶白贴片 + 腮红 + 球面追光眼 + ω微笑嘴 */}
              <g clipPath={`url(#${clipId})`}>
                {/* 额头柔和水彩高光 (径向羽化至0，绝不产生交界色差) */}
                <circle
                  cx="90"
                  cy="78"
                  r="26"
                  fill={`url(#${gradId})`}
                />
                {/* 右下腹柔和立体暗部 (径向羽化至0，无硬边) */}
                <circle
                  cx="166"
                  cy="182"
                  r="34"
                  fill={`url(#${shadeGradId})`}
                />

                {/* 标志性雪人/葫芦相连双奶白分区（下圆肚皮贴片 + 上拱心形下脸颊贴片，100% 还原 ans-mascot.png） */}
                <g ref={bellyGroupRef}>
                  <ellipse
                    cx={DINO_BASE_X}
                    cy={DINO_BASE_Y - 2.88 * DINO_U}
                    rx={3.05 * DINO_U}
                    ry={1.92 * DINO_U}
                    fill={palette.bellyFill}
                  />
                  <ellipse
                    cx={DINO_BASE_X}
                    cy={DINO_BASE_Y - 1.18 * DINO_U}
                    rx={2.28 * DINO_U}
                    ry={0.32 * DINO_U}
                    fill={palette.bellyShadow}
                    opacity="0.65"
                  />
                </g>

                <g ref={muzzleGroupRef}>
                  {/* 宽横奶白下脸颊主体 */}
                  <ellipse
                    cx={DINO_BASE_X}
                    cy={DINO_BASE_Y - 6.08 * DINO_U}
                    rx={3.76 * DINO_U}
                    ry={1.48 * DINO_U}
                    fill={palette.bellyFill}
                  />
                  {/* 双眼之间向上微拱的奶白山峰（还原 ans-mascot.png 双眼内侧的奶白上拱弧度） */}
                  <ellipse
                    cx={DINO_BASE_X}
                    cy={DINO_BASE_Y - 6.52 * DINO_U}
                    rx={2.36 * DINO_U}
                    ry={1.26 * DINO_U}
                    fill={palette.bellyFill}
                  />
                  {/* 上下奶白贴片交界处的柔和暖色颈窝折痕 */}
                  <ellipse
                    cx={DINO_BASE_X}
                    cy={DINO_BASE_Y - 4.68 * DINO_U}
                    rx={2.25 * DINO_U}
                    ry={0.2 * DINO_U}
                    fill={palette.bellyShadow}
                    opacity="0.58"
                  />
                </g>

                {/* 粉嫩椭圆形腮红 (ans_chars.js lines 261-268: ±2.82u, -6.55u, rx=0.76u, ry=0.38u) */}
                <ellipse
                  ref={leftCheekRef}
                  cx={DINO_BASE_X - 2.82 * DINO_U}
                  cy={DINO_BASE_Y - 6.55 * DINO_U}
                  rx={0.76 * DINO_U}
                  ry={0.38 * DINO_U}
                  fill={palette.cheekColor}
                  opacity="0.76"
                />
                <ellipse
                  ref={rightCheekRef}
                  cx={DINO_BASE_X + 2.82 * DINO_U}
                  cy={DINO_BASE_Y - 6.55 * DINO_U}
                  rx={0.76 * DINO_U}
                  ry={0.38 * DINO_U}
                  fill={palette.cheekColor}
                  opacity="0.76"
                />

                {/* 兔兔龙标志性鼻尖竖点 + ω 猫咪微笑嘴 / 开心欢呼嘴 (坐落在奶白下脸颊贴片正中) */}
                <path
                  ref={mouthPathRef}
                  d={`M ${DINO_BASE_X} 105.4 L ${DINO_BASE_X} 108.0 M ${DINO_BASE_X - 7.6} 108.8 Q ${DINO_BASE_X - 3.8} 113.4 ${DINO_BASE_X} 107.8 Q ${DINO_BASE_X + 3.8} 113.4 ${DINO_BASE_X + 7.6} 108.8`}
                  fill={
                    displayState === "action" || displayState === "emote" || displayState === "react"
                      ? palette.earInner
                      : "none"
                  }
                  stroke={palette.inkColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 左眼：48点球面投影 + 双高光点 (ans_chars.js lines 398-405) */}
                <g ref={leftEyeGroupRef}>
                  <path
                    ref={leftEyePathRef}
                    d={INITIAL_LEFT_EYE_PATH.d}
                    fill={palette.eyeColor}
                    transform={`translate(${INITIAL_LEFT_EYE_PATH.finalX.toFixed(2)} ${INITIAL_LEFT_EYE_PATH.finalY.toFixed(2)}) scale(${INITIAL_LEFT_EYE_PATH.scaleX.toFixed(4)} ${INITIAL_LEFT_EYE_PATH.scaleY.toFixed(4)}) translate(${(-INITIAL_LEFT_EYE_PATH.centerX).toFixed(2)} ${(-INITIAL_LEFT_EYE_PATH.centerY).toFixed(2)})`}
                  />
                  <circle
                    ref={leftHighlightRef}
                    cx={INITIAL_LEFT_EYE_PATH.highlightX}
                    cy={INITIAL_LEFT_EYE_PATH.highlightY}
                    r={INITIAL_LEFT_EYE_PATH.highlightR}
                    fill={palette.eyeHighlight}
                  />
                  <circle
                    ref={leftSubHighlightRef}
                    cx={INITIAL_LEFT_EYE_PATH.subHighlightX}
                    cy={INITIAL_LEFT_EYE_PATH.subHighlightY}
                    r={INITIAL_LEFT_EYE_PATH.subHighlightR}
                    fill={palette.eyeHighlight}
                    opacity="0.92"
                  />
                </g>

                {/* 右眼：48点球面投影 + 双高光点 */}
                <g ref={rightEyeGroupRef}>
                  <path
                    ref={rightEyePathRef}
                    d={INITIAL_RIGHT_EYE_PATH.d}
                    fill={palette.eyeColor}
                    transform={`translate(${INITIAL_RIGHT_EYE_PATH.finalX.toFixed(2)} ${INITIAL_RIGHT_EYE_PATH.finalY.toFixed(2)}) scale(${INITIAL_RIGHT_EYE_PATH.scaleX.toFixed(4)} ${INITIAL_RIGHT_EYE_PATH.scaleY.toFixed(4)}) translate(${(-INITIAL_RIGHT_EYE_PATH.centerX).toFixed(2)} ${(-INITIAL_RIGHT_EYE_PATH.centerY).toFixed(2)})`}
                  />
                  <circle
                    ref={rightHighlightRef}
                    cx={INITIAL_RIGHT_EYE_PATH.highlightX}
                    cy={INITIAL_RIGHT_EYE_PATH.highlightY}
                    r={INITIAL_RIGHT_EYE_PATH.highlightR}
                    fill={palette.eyeHighlight}
                  />
                  <circle
                    ref={rightSubHighlightRef}
                    cx={INITIAL_RIGHT_EYE_PATH.subHighlightX}
                    cy={INITIAL_RIGHT_EYE_PATH.subHighlightY}
                    r={INITIAL_RIGHT_EYE_PATH.subHighlightR}
                    fill={palette.eyeHighlight}
                    opacity="0.92"
                  />
                </g>
              </g>

              {/* 4. 连续手绘感深色墨线描边 (ans_chars.js line 292: body_ink) */}
              <path
                ref={bodyInkPathRef}
                d={INITIAL_BODY_PATH}
                fill="none"
                stroke={palette.inkColor}
                strokeWidth="4.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* 右小胖腿根部立体折线 (还原 ans-mascot.png 右腿内侧圆润折痕) */}
              <path
                d={`M ${(DINO_BASE_X + 0.88 * DINO_U).toFixed(1)} ${(DINO_BASE_Y - 1.38 * DINO_U).toFixed(1)} Q ${(DINO_BASE_X + 1.05 * DINO_U).toFixed(1)} ${(DINO_BASE_Y - 0.82 * DINO_U).toFixed(1)} ${(DINO_BASE_X + 0.92 * DINO_U).toFixed(1)} ${(DINO_BASE_Y - 0.35 * DINO_U).toFixed(1)}`}
                fill="none"
                stroke={palette.inkColor}
                strokeWidth="3.8"
                strokeLinecap="round"
              />

              {/* 5. 头顶 3 个无缝圆润背棘凸起 (与身体共享纯正 bodyMid 底色实现 100% 零色差无缝融合 + 仅顶部开放圆弧描边) */}
              <g ref={bumpsGroupRef}>
                {V46_HEAD_BUMPS.map((b, idx) => {
                  const cx = DINO_BASE_X + b.bx * DINO_U;
                  const cy = DINO_BASE_Y + b.by * DINO_U;
                  const rx = b.brx * DINO_U;
                  const ry = b.bry * DINO_U;
                  const rotDeg = (b.brot * 180) / Math.PI;
                  return (
                    <g key={`bump-${idx}`}>
                      <ellipse
                        cx={cx}
                        cy={cy}
                        rx={rx}
                        ry={ry}
                        transform={`rotate(${rotDeg.toFixed(2)} ${cx.toFixed(2)} ${cy.toFixed(2)})`}
                        fill={palette.bodyMid}
                      />
                      <path
                        d={INITIAL_BUMP_ARCS[idx]}
                        fill="none"
                        stroke={palette.inkColor}
                        strokeWidth="4.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  );
                })}
              </g>

              {/* 6. 左右无缝圆润小胖手 (ans_chars.js lines 311-359：肩部无描边融合 + 外侧与贴肚内侧圆弧描边) */}
              <g
                ref={leftArmGroupRef}
                transform={`translate(${(DINO_BASE_X - 4.32 * DINO_U).toFixed(2)} ${(DINO_BASE_Y - 4.55 * DINO_U).toFixed(2)}) rotate(14)`}
              >
                <ellipse
                  cx="0"
                  cy={0.08 * DINO_U}
                  rx={0.84 * DINO_U}
                  ry={0.78 * DINO_U}
                  fill={palette.bodyMid}
                />
                <ellipse
                  cx="0"
                  cy={0.92 * DINO_U}
                  rx={0.72 * DINO_U}
                  ry={1.08 * DINO_U}
                  fill={palette.bodyMid}
                />
                <path
                  d={PAW_ARC_PATH}
                  fill="none"
                  stroke={palette.inkColor}
                  strokeWidth="4.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>

              <g
                ref={rightArmGroupRef}
                transform={`translate(${(DINO_BASE_X + 4.32 * DINO_U).toFixed(2)} ${(DINO_BASE_Y - 4.55 * DINO_U).toFixed(2)}) rotate(-14)`}
              >
                <ellipse
                  cx="0"
                  cy={0.08 * DINO_U}
                  rx={0.84 * DINO_U}
                  ry={0.78 * DINO_U}
                  fill={palette.bodyMid}
                />
                <ellipse
                  cx="0"
                  cy={0.92 * DINO_U}
                  rx={0.72 * DINO_U}
                  ry={1.08 * DINO_U}
                  fill={palette.bodyMid}
                />
                <path
                  d={PAW_ARC_PATH}
                  fill="none"
                  stroke={palette.inkColor}
                  strokeWidth="4.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </g>

            {/* Agent Morph Layer: Thinking 3-Dot Wave */}
            <g ref={dotsGroupRef} style={{ opacity: activeMorph === "dots" ? 1 : 0 }}>
              <circle
                cx="176"
                cy="22"
                r="7"
                fill={palette.badgeColor}
                stroke={palette.inkColor}
                strokeWidth="2.5"
              />
              <circle
                cx="196"
                cy="22"
                r="8"
                fill={palette.accentGlow}
                stroke={palette.inkColor}
                strokeWidth="2.5"
              />
              <circle
                cx="216"
                cy="22"
                r="7"
                fill={palette.cheekColor}
                stroke={palette.inkColor}
                strokeWidth="2.5"
              />
            </g>

            {/* Agent Morph Layer: Orbit Ring + Satellite */}
            <g
              ref={orbitGroupRef}
              transform={`rotate(-14 ${HEAD_C} 128)`}
              style={{ opacity: activeMorph === "orbit" ? 1 : 0 }}
            >
              <ellipse
                cx={HEAD_C}
                cy="128"
                rx="98"
                ry="34"
                fill="none"
                stroke={palette.accentGlow}
                strokeWidth="3"
                strokeDasharray="8 6"
              />
              <circle
                cx={HEAD_C + 98}
                cy="128"
                r="8.5"
                fill={palette.badgeColor}
                stroke={palette.inkColor}
                strokeWidth="2.4"
              />
            </g>

            {/* Agent Morph Layer: Celebratory Sparkle Burst */}
            <g ref={sparkleGroupRef} style={{ opacity: activeMorph === "sparkle" ? 1 : 0 }}>
              <g transform="translate(26 42)">
                <path
                  d="M 0 -11 L 3 -3 L 11 0 L 3 3 L 0 11 L -3 3 L -11 0 L -3 -3 Z"
                  fill={palette.badgeColor}
                  stroke={palette.inkColor}
                  strokeWidth="1.5"
                />
              </g>
              <g transform="translate(210 46)">
                <path
                  d="M 0 -10 L 2.8 -2.8 L 10 0 L 2.8 2.8 L 0 10 L -2.8 2.8 L -10 0 L -2.8 -2.8 Z"
                  fill={palette.cheekColor}
                  stroke={palette.inkColor}
                  strokeWidth="1.5"
                />
              </g>
              <g transform="translate(28 168)">
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
