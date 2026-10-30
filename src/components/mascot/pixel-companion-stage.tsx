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
  GROK_EXPRESSIONS,
  GROK_SHAPE_RINGS,
  HEAD_C,
  STATE_RECIPES,
  VIEWBOX_MIN,
  VIEWBOX_SPAN,
  clamp,
  createSpring,
  getSpeciesPalette,
  lerpRing,
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

const INITIAL_HEAD_PATH = ringOutline(GROK_SHAPE_RINGS.tutulong);
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

  // GrokBot 2D SVG DOM refs for 60/120Hz zero-re-render spring updates
  const svgRef = useRef<SVGSVGElement | null>(null);
  const transformGroupRef = useRef<SVGGElement | null>(null);
  const headPathRef = useRef<SVGPathElement | null>(null);
  const rimPathRef = useRef<SVGPathElement | null>(null);
  const clipPathRef = useRef<SVGPathElement | null>(null);
  const bellyEllipseRef = useRef<SVGEllipseElement | null>(null);
  const tailPathRef = useRef<SVGPathElement | null>(null);
  const earsGroupRef = useRef<SVGGElement | null>(null);
  const leftCheekRef = useRef<SVGEllipseElement | null>(null);
  const rightCheekRef = useRef<SVGEllipseElement | null>(null);
  const mouthPathRef = useRef<SVGPathElement | null>(null);
  const leftEyeGroupRef = useRef<SVGGElement | null>(null);
  const rightEyeGroupRef = useRef<SVGGElement | null>(null);
  const leftEyePathRef = useRef<SVGPathElement | null>(null);
  const rightEyePathRef = useRef<SVGPathElement | null>(null);
  const leftHighlightRef = useRef<SVGCircleElement | null>(null);
  const rightHighlightRef = useRef<SVGCircleElement | null>(null);
  const dotsGroupRef = useRef<SVGGElement | null>(null);
  const orbitGroupRef = useRef<SVGGElement | null>(null);
  const radarGroupRef = useRef<SVGGElement | null>(null);
  const sparkleGroupRef = useRef<SVGGElement | null>(null);

  // Mutable physics state for the 120Hz fixed-step spring solver
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
    earBounce: createSpring(0),
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
      p.headY.v -= 88;
      p.scaleY.v -= 0.42;
      p.scaleX.v += 0.34;
      p.earBounce.v -= 95;
      p.rotation.v += (Math.random() < 0.5 ? -1 : 1) * 0.85;
      p.blinkStartedAt = now;
    } else if (kind === "wink") {
      p.winkEye = Math.random() < 0.5 ? 0 : 1;
      p.winkStartedAt = now;
      p.rotation.target = p.winkEye === 0 ? -0.14 : 0.14;
      p.headY.v -= 48;
      p.earBounce.v -= 55;
    } else if (kind === "spin") {
      const dir = Math.random() < 0.5 ? 1 : -1;
      p.spin.target += Math.PI * 2 * dir;
      p.headY.v -= 65;
      p.scaleY.v += 0.22;
      p.earBounce.v -= 70;
    } else if (kind === "hop") {
      p.headY.v -= 72;
      p.scaleY.v += 0.25;
      p.scaleX.v -= 0.18;
      p.earBounce.v -= 64;
    } else if (kind === "shake") {
      p.headX.v += (Math.random() < 0.5 ? -1 : 1) * 110;
      p.rotation.v += (Math.random() < 0.5 ? -1 : 1) * 1.25;
      p.turn.target = (Math.random() < 0.5 ? -1 : 1) * 0.45;
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

  // Sync expression & shape transitions into the 120Hz spring engine when state/shape changes
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
      p.spin.target += Math.PI * 2;
      p.headY.v -= 55;
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

  // GrokBot 120Hz Damped Spring & Spherical Eye Animation Loop
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

      // 1. Autonomous expression cycling inside current state's expression pool
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
        p.nextExprAt = now + 2400 + Math.random() * 2400;
      }

      // 2. Autonomous gaze saccades when pointer is not actively moving nearby
      if (now >= p.nextGazeAt) {
        p.aimX.target = (Math.random() * 2 - 1) * 9.5;
        p.aimY.target = (Math.random() * 2 - 1) * 5.8;
        p.nextGazeAt = now + 1500 + Math.random() * 2200;
      }

      // 3. Autonomous natural blink (42% closing, 58% opening over 320ms)
      if (p.blinkStartedAt < 0 && now >= p.nextBlinkAt) {
        p.blinkStartedAt = now;
        p.nextBlinkAt = now + 2600 + Math.random() * 3400;
      }
      let blinkScale = 1;
      if (p.blinkStartedAt >= 0) {
        const elapsed = now - p.blinkStartedAt;
        if (elapsed >= 320) {
          p.blinkStartedAt = -1;
          blinkScale = 1;
        } else {
          const phaseNorm = elapsed / 320;
          blinkScale = Math.max(
            phaseNorm < 0.42 ? 1 - phaseNorm / 0.42 : (phaseNorm - 0.42) / 0.58,
            0.04,
          );
        }
      }
      p.eyeOpen.target = blinkScale;

      // 4. State rhythm targets (breathing, walking bob, head turn, tilt)
      p.headY.target = Math.sin(tSec * recipe.bobFreq) * recipe.bobAmpY;
      p.headX.target = Math.cos(tSec * recipe.swayFreq) * recipe.swayAmpX;

      // Pointer-driven head turn & tilt + state rhythm
      let pointerTurn = 0;
      let pointerTilt = 0;
      if (p.pointerActive && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dxNorm = clamp((p.pointerClientX - cx) / Math.max(rect.width * 3.2, 180), -1, 1);
        const dyNorm = clamp((p.pointerClientY - cy) / Math.max(rect.height * 3.2, 180), -1, 1);
        p.pointerTargetX = dxNorm * 19;
        p.pointerTargetY = dyNorm * 12.5;
        pointerTurn = dxNorm * 0.36;
        pointerTilt = dxNorm * 0.085;
      } else {
        p.pointerTargetX = 0;
        p.pointerTargetY = 0;
      }

      p.turn.target =
        Math.sin(tSec * recipe.turnFreq) * recipe.turnAmpRad + pointerTurn;
      p.rotation.target =
        Math.sin(tSec * recipe.tiltFreq) * recipe.tiltAmpRad + pointerTilt;
      p.scaleY.target = 1 + 0.025 * Math.sin(tSec * recipe.bobFreq + Math.PI / 2);
      p.scaleX.target = 1 - 0.018 * Math.sin(tSec * recipe.bobFreq + Math.PI / 2);
      p.earBounce.target = clamp(-p.headY.v * 0.14, -12, 12);
      p.morphSpring.target = activeMorph !== "none" ? 1 : 0;

      // 5. Step all springs at 120Hz fixed sub-steps
      stepSpring(p.headX, 4.2, 0.88, dt);
      stepSpring(p.headY, 4.6, 0.85, dt);
      stepSpring(p.rotation, 5.4, 0.86, dt);
      stepSpring(p.scaleX, 10.5, 0.76, dt);
      stepSpring(p.scaleY, 10.5, 0.76, dt);
      stepSpring(p.turn, 12.0, 0.92, dt);
      stepSpring(p.spin, 6.2, 0.94, dt);
      stepSpring(p.eyeOpen, 26.0, 1.0, dt);
      stepSpring(p.eyeScale, 9.0, 0.85, dt);
      stepSpring(p.aimX, 11.0, 0.95, dt);
      stepSpring(p.aimY, 11.0, 0.95, dt);
      stepSpring(p.earBounce, 11.5, 0.65, dt);
      stepSpring(p.exprSpring, 8.5, 0.96, dt);
      stepSpring(p.shapeSpring, 9.5, 0.9, dt);
      stepSpring(p.morphSpring, 12.0, 0.92, dt);

      // 6. Interpolate 96-point body silhouette
      const shapeBlend = clamp(p.shapeSpring.x, 0, 1);
      const fromShapeRing = GROK_SHAPE_RINGS[p.fromShape] ?? GROK_SHAPE_RINGS.tutulong;
      const toShapeRing = GROK_SHAPE_RINGS[p.toShape] ?? GROK_SHAPE_RINGS.tutulong;
      const currentShapeRing =
        shapeBlend >= 0.999
          ? toShapeRing
          : lerpRing(fromShapeRing, toShapeRing, shapeBlend);
      const headD = ringOutline(currentShapeRing);
      headPathRef.current?.setAttribute("d", headD);
      rimPathRef.current?.setAttribute("d", headD);
      clipPathRef.current?.setAttribute("d", headD);

      // 7. Compute total spherical turn angle & transform group
      const turnAngle = p.turn.x + p.spin.x;
      const rotDeg = (p.rotation.x * 180) / Math.PI;
      transformGroupRef.current?.setAttribute(
        "transform",
        `translate(${(HEAD_C + p.headX.x).toFixed(2)} ${(HEAD_C + p.headY.x).toFixed(2)}) rotate(${rotDeg.toFixed(2)}) scale(${p.scaleX.x.toFixed(4)} ${p.scaleY.x.toFixed(4)}) translate(${-HEAD_C} ${-HEAD_C})`,
      );

      // 8. Spherical parallax for TutuLong's ears, crest, belly, tail, and cheeks
      const sinTurn = Math.sin(turnAngle);
      const cosTurn = Math.cos(turnAngle);
      const earShiftX = sinTurn * 16;
      const earShiftY = p.earBounce.x * 0.45;
      earsGroupRef.current?.setAttribute(
        "transform",
        `translate(${earShiftX.toFixed(2)} ${earShiftY.toFixed(2)}) scale(${(0.88 + 0.12 * Math.abs(cosTurn)).toFixed(3)} 1)`,
      );

      const bellyX = HEAD_C + sinTurn * 26;
      bellyEllipseRef.current?.setAttribute("cx", bellyX.toFixed(2));
      bellyEllipseRef.current?.setAttribute(
        "rx",
        (54 * Math.max(0.25, Math.abs(cosTurn))).toFixed(2),
      );

      // Tail peeks out on the side opposite to the head turn and wags with spring velocity
      const tailSide = sinTurn >= 0 ? -1 : 1;
      const tailWag = Math.sin(tSec * 5.2) * 5 + p.headY.v * 0.08;
      const tailBaseX = HEAD_C + tailSide * 68 - sinTurn * 18;
      const tailTipX = tailBaseX + tailSide * 32;
      const tailD = `M ${tailBaseX.toFixed(1)} 162 Q ${(tailBaseX + tailSide * 22).toFixed(1)} ${(156 + tailWag).toFixed(1)} ${tailTipX.toFixed(1)} ${(142 + tailWag).toFixed(1)} Q ${(tailBaseX + tailSide * 18).toFixed(1)} ${(182 + tailWag * 0.5).toFixed(1)} ${tailBaseX.toFixed(1)} 180 Z`;
      tailPathRef.current?.setAttribute("d", tailD);

      // 9. Interpolate 48-point eye contours & project onto sphere
      const exprAmount = clamp(p.exprSpring.x, 0, 1);
      const fromPair = GROK_EXPRESSIONS[p.fromExpr] ?? GROK_EXPRESSIONS.neutral;
      const toPair = GROK_EXPRESSIONS[p.toExpr] ?? GROK_EXPRESSIONS.neutral;
      const eyeRings = [
        exprAmount >= 0.999 ? toPair[0] : lerpRing(fromPair[0], toPair[0], exprAmount),
        exprAmount >= 0.999 ? toPair[1] : lerpRing(fromPair[1], toPair[1], exprAmount),
      ];

      const smoothing = 1 - Math.exp(60 * Math.log(0.91) * dt);
      const pulse = 1 + 0.06 * Math.sin(exprAmount * Math.PI);
      const eyeRefs = [
        {
          group: leftEyeGroupRef.current,
          path: leftEyePathRef.current,
          hl: leftHighlightRef.current,
        },
        {
          group: rightEyeGroupRef.current,
          path: rightEyePathRef.current,
          hl: rightHighlightRef.current,
        },
      ];

      const projectedCenters: [number, number][] = [
        [HEAD_C - 24, 96],
        [HEAD_C + 24, 96],
      ];

      for (let idx = 0; idx < 2; idx += 1) {
        // GrokBot per-eye exponential smoothing creates subtle organic lag between eyes
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
              0.04,
            );
          }
        }

        const autoWeight = p.pointerActive ? 0.22 : 1.0;
        const driftX =
          1.2 * Math.sin(0.00045 * now + idx) +
          p.pointerX +
          p.aimX.x * autoWeight;
        const driftY =
          0.8 * Math.sin(0.0006 * now + idx) +
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
        if (ref.group && ref.path && ref.hl) {
          ref.group.style.display = proj.visible ? "" : "none";
          ref.path.setAttribute("d", proj.d);
          ref.path.setAttribute(
            "transform",
            `translate(${proj.finalX.toFixed(2)} ${proj.finalY.toFixed(2)}) scale(${proj.scaleX.toFixed(4)} ${proj.scaleY.toFixed(4)}) translate(${(-proj.centerX).toFixed(2)} ${(-proj.centerY).toFixed(2)})`,
          );
          ref.hl.setAttribute("cx", proj.highlightX.toFixed(2));
          ref.hl.setAttribute("cy", proj.highlightY.toFixed(2));
          ref.hl.setAttribute("r", proj.highlightR.toFixed(2));
          ref.hl.style.display = proj.scaleY > 0.28 && proj.visible ? "" : "none";
        }
      }

      // 10. Cheek blush & cute dino mouth between projected eyes
      const midEyeX = (projectedCenters[0][0] + projectedCenters[1][0]) / 2;
      const midEyeY = (projectedCenters[0][1] + projectedCenters[1][1]) / 2;

      if (leftCheekRef.current && rightCheekRef.current) {
        const lCheekX = projectedCenters[0][0] - 18 * Math.max(0.3, cosTurn);
        const rCheekX = projectedCenters[1][0] + 14 * Math.max(0.3, cosTurn);
        const cheekY = midEyeY + 22;
        leftCheekRef.current.setAttribute("cx", lCheekX.toFixed(2));
        leftCheekRef.current.setAttribute("cy", cheekY.toFixed(2));
        leftCheekRef.current.style.opacity =
          cosTurn > -0.15 ? String(recipe.blushOpacity) : "0";
        rightCheekRef.current.setAttribute("cx", rCheekX.toFixed(2));
        rightCheekRef.current.setAttribute("cy", (cheekY - 2).toFixed(2));
        rightCheekRef.current.style.opacity =
          cosTurn > -0.15 ? String(recipe.blushOpacity) : "0";
      }

      if (mouthPathRef.current) {
        const mx = midEyeX + sinTurn * 4;
        const my = midEyeY + 20;
        const mScale = clamp(Math.abs(cosTurn), 0.2, 1);
        const w = 10 * mScale;
        let mouthD = "";
        if (displayState === "action" || displayState === "emote") {
          // 开心张嘴笑弧
          mouthD = `M ${(mx - w).toFixed(1)} ${my.toFixed(1)} Q ${mx.toFixed(1)} ${(my + 11).toFixed(1)} ${(mx + w).toFixed(1)} ${my.toFixed(1)} Z`;
        } else if (displayState === "react") {
          // 好奇小圆嘴
          mouthD = `M ${(mx - 4 * mScale).toFixed(1)} ${(my + 2).toFixed(1)} A ${(4 * mScale).toFixed(1)} 4.5 0 1 0 ${(mx + 4 * mScale).toFixed(1)} ${(my + 2).toFixed(1)} A ${(4 * mScale).toFixed(1)} 4.5 0 1 0 ${(mx - 4 * mScale).toFixed(1)} ${(my + 2).toFixed(1)} Z`;
        } else {
          // 兔兔龙经典 ω 猫咪小恐龙微笑线
          mouthD = `M ${(mx - w).toFixed(1)} ${my.toFixed(1)} Q ${(mx - w * 0.5).toFixed(1)} ${(my + 5.5).toFixed(1)} ${mx.toFixed(1)} ${(my + 1.2).toFixed(1)} Q ${(mx + w * 0.5).toFixed(1)} ${(my + 5.5).toFixed(1)} ${(mx + w).toFixed(1)} ${my.toFixed(1)}`;
        }
        mouthPathRef.current.setAttribute("d", mouthD);
        mouthPathRef.current.style.opacity = cosTurn > 0.05 ? "0.86" : "0";
      }

      // 11. Agent Morph Overlay animation (dots / orbit / radar / sparkle)
      const morphVal = clamp(p.morphSpring.x, 0, 1);
      if (dotsGroupRef.current) {
        dotsGroupRef.current.style.opacity =
          activeMorph === "dots" ? morphVal.toFixed(3) : "0";
        if (activeMorph === "dots") {
          const circles = dotsGroupRef.current.querySelectorAll("circle");
          circles.forEach((c, i) => {
            const wave = Math.sin(tSec * 6.5 - i * 0.9) * 6.5;
            c.setAttribute("cy", (34 + wave).toFixed(2));
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
            const ox = HEAD_C + Math.cos(angle) * 106;
            const oy = HEAD_C + Math.sin(angle) * 38;
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
            r.setAttribute("r", (82 + prog * 38).toFixed(2));
            r.setAttribute("stroke-opacity", ((1 - prog) * 0.78).toFixed(2));
          });
        }
      }
      if (sparkleGroupRef.current) {
        sparkleGroupRef.current.style.opacity =
          activeMorph === "sparkle" ? morphVal.toFixed(3) : "0";
        if (activeMorph === "sparkle") {
          const stars = sparkleGroupRef.current.querySelectorAll("g");
          stars.forEach((g, i) => {
            const pulseS = 0.72 + 0.36 * Math.sin(tSec * 5.2 + i * 1.4);
            const floatY = Math.cos(tSec * 3.6 + i) * 5;
            g.setAttribute(
              "transform",
              `translate(0 ${floatY.toFixed(2)}) scale(${pulseS.toFixed(3)})`,
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
  const rimGradId = `ans-grok-dino-rim-${speciesId}`;
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
              <radialGradient id={gradId} cx="34%" cy="26%" r="74%">
                <stop offset="0%" stopColor={palette.bodyStart} />
                <stop offset="56%" stopColor={palette.bodyMid} />
                <stop offset="100%" stopColor={palette.bodyEnd} />
              </radialGradient>
              <linearGradient id={rimGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={palette.rimLight} stopOpacity="0.9" />
                <stop offset="50%" stopColor={palette.accentGlow} stopOpacity="0.35" />
                <stop offset="100%" stopColor={palette.bodyEnd} stopOpacity="0.85" />
              </linearGradient>
              <clipPath id={clipId}>
                <path ref={clipPathRef} d={INITIAL_HEAD_PATH} />
              </clipPath>
            </defs>

            {/* Agent Morph Layer: Radar Concentric Scan Rings */}
            <g ref={radarGroupRef} style={{ opacity: activeMorph === "radar" ? 1 : 0 }}>
              <circle
                cx={HEAD_C}
                cy={HEAD_C}
                r={92}
                fill="none"
                stroke={palette.accentGlow}
                strokeWidth="3.5"
                strokeDasharray="10 8"
              />
              <circle
                cx={HEAD_C}
                cy={HEAD_C}
                r={108}
                fill="none"
                stroke={palette.badgeColor}
                strokeWidth="2.5"
              />
            </g>

            {/* Main 120Hz Spring Transform Group */}
            <g ref={transformGroupRef}>
              {/* 1. Wagging Chubby Dino Tail */}
              <path
                ref={tailPathRef}
                d={`M ${HEAD_C - 68} 162 Q ${HEAD_C - 90} 156 ${HEAD_C - 100} 142 Q ${HEAD_C - 86} 182 ${HEAD_C - 68} 180 Z`}
                fill={palette.bodyEnd}
                stroke={palette.rimLight}
                strokeWidth="3"
                strokeLinejoin="round"
              />

              {/* 2. TutuLong Bunny-Dino Ears & Top 3-Bump Dorsal Crest */}
              <g ref={earsGroupRef}>
                {/* Left Bunny-Dino Ear */}
                <g transform={`translate(${HEAD_C - 52} 28) rotate(-22)`}>
                  <ellipse
                    cx="0"
                    cy="0"
                    rx="16"
                    ry="30"
                    fill={`url(#${gradId})`}
                    stroke={palette.rimLight}
                    strokeWidth="3"
                  />
                  <ellipse cx="1" cy="2" rx="8.5" ry="18" fill={palette.earInner} opacity="0.82" />
                </g>
                {/* Right Bunny-Dino Ear */}
                <g transform={`translate(${HEAD_C + 52} 28) rotate(22)`}>
                  <ellipse
                    cx="0"
                    cy="0"
                    rx="16"
                    ry="30"
                    fill={`url(#${gradId})`}
                    stroke={palette.rimLight}
                    strokeWidth="3"
                  />
                  <ellipse cx="-1" cy="2" rx="8.5" ry="18" fill={palette.earInner} opacity="0.82" />
                </g>
                {/* 3 Seamless Dino Crown Bumps */}
                <circle cx={HEAD_C - 18} cy="24" r="9.5" fill={palette.crestFill} />
                <circle cx={HEAD_C} cy="19" r="12" fill={palette.badgeColor} />
                <circle cx={HEAD_C + 18} cy="24" r="9.5" fill={palette.crestFill} />
              </g>

              {/* 3. GrokBot 96-Point Smooth Bezier Body Silhouette */}
              <path
                ref={headPathRef}
                d={INITIAL_HEAD_PATH}
                fill={`url(#${gradId})`}
              />

              {/* 4. Clipped Inner Features (Creamy Belly Patch, Cheek Blush, Spherical Eyes, Mouth) */}
              <g clipPath={`url(#${clipId})`}>
                {/* Creamy Belly / Lower Cheek Patch */}
                <ellipse
                  ref={bellyEllipseRef}
                  cx={HEAD_C}
                  cy="188"
                  rx="54"
                  ry="42"
                  fill={palette.bellyFill}
                  opacity="0.88"
                />

                {/* Soft Specular Top Dome Gloss */}
                <ellipse
                  cx={HEAD_C - 22}
                  cy="54"
                  rx="38"
                  ry="18"
                  transform={`rotate(-14 ${HEAD_C - 22} 54)`}
                  fill="#ffffff"
                  opacity="0.34"
                />

                {/* Cheek Blush Pads */}
                <ellipse
                  ref={leftCheekRef}
                  cx={HEAD_C - 44}
                  cy="122"
                  rx="14"
                  ry="8.5"
                  fill={palette.cheekColor}
                  opacity="0.62"
                />
                <ellipse
                  ref={rightCheekRef}
                  cx={HEAD_C + 48}
                  cy="120"
                  rx="14"
                  ry="8.5"
                  fill={palette.cheekColor}
                  opacity="0.62"
                />

                {/* Cute TutuLong Mouth / Snout Arc */}
                <path
                  ref={mouthPathRef}
                  d={`M ${HEAD_C - 10} 118 Q ${HEAD_C - 5} 123.5 ${HEAD_C} 119.2 Q ${HEAD_C + 5} 123.5 ${HEAD_C + 10} 118`}
                  fill={
                    displayState === "action" || displayState === "emote" || displayState === "react"
                      ? palette.earInner
                      : "none"
                  }
                  stroke={palette.eyeColor}
                  strokeWidth="4.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Left Spherical 48-Point Eye */}
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
                </g>

                {/* Right Spherical 48-Point Eye */}
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
                </g>
              </g>

              {/* 5. GrokBot Rim-Light Counter-Stroke */}
              <path
                ref={rimPathRef}
                d={INITIAL_HEAD_PATH}
                fill="none"
                stroke={`url(#${rimGradId})`}
                strokeWidth="4.5"
              />
            </g>

            {/* Agent Morph Layer: Thinking 3-Dot Wave */}
            <g ref={dotsGroupRef} style={{ opacity: activeMorph === "dots" ? 1 : 0 }}>
              <circle
                cx="176"
                cy="34"
                r="7.5"
                fill={palette.badgeColor}
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              <circle
                cx="196"
                cy="34"
                r="8.5"
                fill={palette.accentGlow}
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              <circle
                cx="216"
                cy="34"
                r="7.5"
                fill={palette.cheekColor}
                stroke="#ffffff"
                strokeWidth="2.5"
              />
            </g>

            {/* Agent Morph Layer: Orbit Ring + Satellite */}
            <g
              ref={orbitGroupRef}
              transform={`rotate(-16 ${HEAD_C} ${HEAD_C})`}
              style={{ opacity: activeMorph === "orbit" ? 1 : 0 }}
            >
              <ellipse
                cx={HEAD_C}
                cy={HEAD_C}
                rx="106"
                ry="38"
                fill="none"
                stroke={palette.accentGlow}
                strokeWidth="3"
                strokeDasharray="8 6"
              />
              <circle
                cx={HEAD_C + 106}
                cy={HEAD_C}
                r="9"
                fill={palette.badgeColor}
                stroke="#ffffff"
                strokeWidth="2.5"
              />
            </g>

            {/* Agent Morph Layer: Celebratory Sparkle Burst */}
            <g ref={sparkleGroupRef} style={{ opacity: activeMorph === "sparkle" ? 1 : 0 }}>
              <g transform="translate(26 42)">
                <path
                  d="M 0 -11 L 3 -3 L 11 0 L 3 3 L 0 11 L -3 3 L -11 0 L -3 -3 Z"
                  fill={palette.badgeColor}
                />
              </g>
              <g transform="translate(204 48)">
                <path
                  d="M 0 -10 L 2.8 -2.8 L 10 0 L 2.8 2.8 L 0 10 L -2.8 2.8 L -10 0 L -2.8 -2.8 Z"
                  fill={palette.cheekColor}
                />
              </g>
              <g transform="translate(30 182)">
                <path
                  d="M 0 -8 L 2.2 -2.2 L 8 0 L 2.2 2.2 L 0 8 L -2.2 2.2 L -8 0 L -2.2 -2.2 Z"
                  fill={palette.accentGlow}
                />
              </g>
            </g>
          </svg>
        )}
      </span>
    </span>
  );
}
