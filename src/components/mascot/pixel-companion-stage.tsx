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
  getPixelStateSnapshot,
  subscribeMascotStore,
  writePixelState,
} from "@/lib/mascot/client-store";
import {
  SANCTUARY_EVENT_NAME,
  loadSanctuaryState,
} from "@/domain/mascot/sanctuary";

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

export function PixelCompanionStage({ phase, open }: PixelCompanionStageProps) {
  const storeState = useSyncExternalStore(
    subscribeMascotStore,
    getPixelStateSnapshot,
    () => "idle" as const,
  );
  const [overrideState, setOverrideState] = useState<DinoState | null>(null);
  const [pinnedCell, setPinnedCell] = useState< readonly [number, number] | null>(null);
  const [bounce, setBounce] = useState<BounceKind>("none");
  const [speciesId, setSpeciesId] = useState<string>("mint_star");
  const [auraId, setAuraId] = useState<string>("aura_mint");
  const [gazeTilt, setGazeTilt] = useState<{ x: number; deg: number }>({ x: 0, deg: 0 });
  const revertTimerRef = useRef<number | null>(null);
  const bounceTimerRef = useRef<number | null>(null);

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

  // Greet when companion panel opens
  useEffect(() => {
    if (open) {
      triggerTransient("action", 2600, "hop");
    }
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Listen to global mascot interaction events (pat, feed, whip, click, hover, pose)
  useEffect(() => {
    const onInteract = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail ?? {};
      const action = String(detail.action ?? detail.kind ?? "pat");
      if (action === "whip") {
        // Row 3 col 7 (被Bug追跑) or Row 7 col 5 (怒火冒烟)
        const cells: readonly (readonly [number, number])[] = [
          [3, 7],
          [7, 5],
          [5, 3],
          [3, 1],
        ];
        const chosen = cells[Math.floor(Math.random() * cells.length)];
        triggerTransient("work", 3600, "shake", chosen);
      } else if (action === "feed") {
        // Row 5 col 7 (吃爆米花) or Row 3 col 5 (喝水) or Row 7 col 6 (圣光发光)
        const cells: readonly (readonly [number, number])[] = [
          [5, 7],
          [3, 5],
          [7, 6],
          [4, 2],
        ];
        const chosen = cells[Math.floor(Math.random() * cells.length)];
        triggerTransient("react", 3800, "hop", chosen);
      } else if (action === "pat") {
        // Row 4 col 7 (双手捧心冒爱心) or Row 6 col 2 (害羞比心)
        const cells: readonly (readonly [number, number])[] = [
          [4, 7],
          [6, 2],
          [7, 6],
        ];
        const chosen = cells[Math.floor(Math.random() * cells.length)];
        triggerTransient("emote", 3000, "squash", chosen);
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
      }
    };

    const onStageClick = () => {
      const cells: readonly (readonly [number, number])[] = [
        [6, 0], // 跳起
        [7, 0], // 金币眼暴富
        [4, 7], // 捧心
        [7, 6], // 圣光发光
        [6, 3], // 欢呼
      ];
      const chosen = cells[Math.floor(Math.random() * cells.length)];
      triggerTransient("action", 2600, "hop", chosen);
    };

    window.addEventListener("ans:dino-interact", onInteract);
    window.addEventListener("ans:dino-stage-hover", onStageHover);
    window.addEventListener("ans:dino-stage-click", onStageClick);
    return () => {
      window.removeEventListener("ans:dino-interact", onInteract);
      window.removeEventListener("ans:dino-stage-hover", onStageHover);
      window.removeEventListener("ans:dino-stage-click", onStageClick);
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

  // Subtle pointer gaze lean
  useEffect(() => {
    let last = 0;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || performance.now() - last < 90) return;
      last = performance.now();
      const nx = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      setGazeTilt({
        x: Number((nx * 2.5).toFixed(2)),
        deg: Number((nx * 3.8).toFixed(2)),
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const phaseState = phaseToPixelState(phase);
  const displayState: DinoState =
    overrideState ?? phaseState ?? (isDinoState(storeState) ? storeState : "idle");
  const spec = DINO_STATES[displayState] ?? DINO_STATES.idle;
  const rowOffsetY = atlasRowOffsetPercent(displayState);

  const spriteInlineStyle: React.CSSProperties = pinnedCell
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
      className="ans-dino-pixel-stage"
      data-species={speciesId}
      data-aura={auraId}
      data-bounce={bounce}
    >
      <span className="ans-dino-pixel-aura" aria-hidden="true" />
      <span className="ans-dino-pixel-shadow" aria-hidden="true" />
      <span
        className="ans-dino-pixel"
        data-testid="mascot-pixel-avatar"
        data-pixel-state={displayState}
        data-pinned={pinnedCell ? `${pinnedCell[0]},${pinnedCell[1]}` : undefined}
        style={spriteInlineStyle}
      />
    </span>
  );
}
