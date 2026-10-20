"use client";

/**
 * ANS 2D 像素桌宠 / Agent（吉祥物双形态中的「2D 像素形态」）。
 *
 * - 精灵图集：public/mascot/pixel/dino-atlas.png（8 列 × 8 行，每格 128px）
 * - 与 3D 形态共用形态开关：localStorage + CustomEvent（见 @/lib/mascot/client-store）
 * - 组件内不硬编码任何用户可见文案：全部由 labels 传入（调用方用 next-intl 提供）
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import {
  ATLAS_CELL,
  CLICK_REACTIONS,
  DINO_STATES,
  IDLE_VARIANTS,
  SAY_EVENT,
  STATE_EVENT,
  otherForm,
  spriteGeometry,
  type DinoState,
  type MascotForm,
} from "@/lib/mascot/atlas";
import {
  getFormSnapshot,
  getPositionSnapshot,
  parsePosition,
  subscribeMascotStore,
  writeForm,
  writePosition,
} from "@/lib/mascot/client-store";

export interface PixelDinoLabels {
  /** 桌宠的无障碍标签 */
  aria: string;
  /** 切到 3D 形态的按钮文案 */
  to3d: string;
  /** 切到 2D 形态的按钮文案 */
  to2d: string;
  /** 气泡关闭按钮文案 */
  dismiss: string;
}

interface PixelDinoAgentProps {
  labels: PixelDinoLabels;
  /** 无本地记录时使用的初始形态 */
  defaultForm?: MascotForm;
  /** 每格显示像素（默认 128） */
  cell?: number;
  /** 初始动作状态 */
  initialState?: DinoState;
}

interface Bubble {
  text: string;
  createdAt: number;
}

const FALLBACK_CELL = ATLAS_CELL;
const BUBBLE_TTL_MS = 4200;
const REACTION_MS = 1600;

export function PixelDinoAgent({
  labels,
  defaultForm = "2d",
  cell = FALLBACK_CELL,
  initialState = "idle",
}: PixelDinoAgentProps) {
  const form = useSyncExternalStore(
    subscribeMascotStore,
    getFormSnapshot,
    useCallback(() => defaultForm, [defaultForm]),
  );
  const positionRaw = useSyncExternalStore(subscribeMascotStore, getPositionSnapshot, () => null);
  const position = useMemo(() => parsePosition(positionRaw), [positionRaw]);

  const [state, setState] = useState<DinoState>(initialState);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const dragRef = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);

  // 外部驱动：说话 / 切动作
  useEffect(() => {
    const onSay = (event: Event) => {
      const text = (event as CustomEvent<{ text?: unknown }>).detail?.text;
      if (typeof text === "string" && text.trim()) setBubble({ text, createdAt: Date.now() });
    };
    const onState = (event: Event) => {
      const next = (event as CustomEvent<{ state?: unknown }>).detail?.state;
      if (typeof next === "string" && next in DINO_STATES) setState(next as DinoState);
    };
    window.addEventListener(SAY_EVENT, onSay);
    window.addEventListener(STATE_EVENT, onState);
    return () => {
      window.removeEventListener(SAY_EVENT, onSay);
      window.removeEventListener(STATE_EVENT, onState);
    };
  }, []);

  // 气泡自动消失
  useEffect(() => {
    if (!bubble) return;
    const timer = window.setTimeout(() => setBubble(null), BUBBLE_TTL_MS);
    return () => window.clearTimeout(timer);
  }, [bubble]);

  // 像活的：空闲时偶尔换动作，走路时横向移动一点
  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          if (cancelled) return;
          const next = IDLE_VARIANTS[Math.floor(Math.random() * IDLE_VARIANTS.length)];
          setState(next);
          if (next === "walk" && position) {
            const maxX = Math.max(24, window.innerWidth - cell - 24);
            const step = Math.random() < 0.5 ? -60 : 60;
            writePosition({ x: Math.min(maxX, Math.max(8, position.x + step)), y: position.y });
          }
          schedule();
        },
        9000 + Math.random() * 12000,
      );
    };
    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cell, position]);

  const geometry = useMemo(() => spriteGeometry(state, cell), [state, cell]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      dragRef.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top, moved: false };
      writePosition({ x: rect.left, y: rect.top });

      const onMove = (move: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        drag.moved = true;
        writePosition({ x: move.clientX - drag.dx, y: move.clientY - drag.dy });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        const drag = dragRef.current;
        dragRef.current = null;
        if (!drag) return;
        if (!drag.moved) {
          const reaction = CLICK_REACTIONS[Math.floor(Math.random() * CLICK_REACTIONS.length)];
          setState(reaction);
          window.setTimeout(() => setState("idle"), REACTION_MS);
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [],
  );

  const toggleForm = useCallback(() => {
    writeForm(otherForm(form));
  }, [form]);

  if (form === "3d") return null; // 交给 3D 形态渲染

  const rootStyle: CSSProperties = position
    ? { position: "fixed", left: position.x, top: position.y, zIndex: 40 }
    : { position: "fixed", right: 20, bottom: 20, zIndex: 40 };

  const spriteStyle: CSSProperties = {
    width: cell,
    height: cell,
    backgroundImage: "url(/mascot/pixel/dino-atlas.png)",
    backgroundSize: geometry.backgroundSize,
    backgroundPositionY: geometry.offsetY,
    backgroundRepeat: "no-repeat",
    imageRendering: "pixelated",
    animation: "ans-dino-steps " + geometry.durationMs + "ms steps(" + geometry.frames + ") infinite",
  };

  const keyframes =
    "@keyframes ans-dino-steps{from{background-position-x:0}to{background-position-x:" +
    geometry.travelX +
    "px}}@media (prefers-reduced-motion: reduce){.ans-dino-sprite{animation:none}}";

  return (
    <div style={rootStyle}>
      <style>{keyframes}</style>
      {bubble ? (
        <div role="status" className="mb-1 max-w-56 rounded-[var(--radius)] border bg-background px-3 py-2 text-xs shadow-sm">
          <span>{bubble.text}</span>
          <button
            type="button"
            aria-label={labels.dismiss}
            className="ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => setBubble(null)}
          >
            ×
          </button>
        </div>
      ) : null}
      <div className="flex items-end gap-1">
        <div
          className="ans-dino-sprite cursor-grab active:cursor-grabbing"
          style={spriteStyle}
          role="img"
          aria-label={labels.aria}
          tabIndex={0}
          onPointerDown={handlePointerDown}
        />
        <button
          type="button"
          onClick={toggleForm}
          className="mb-1 rounded-[var(--radius)] border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          {form === "2d" ? labels.to3d : labels.to2d}
        </button>
      </div>
    </div>
  );
}
