"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
export const COMPANION_SIZE_KEY = "ans.companion-size.v1";
export type CompanionSize = { width: number; height: number };
type Edge = "width" | "height" | "both";
function viewport() {
  const visual = window.visualViewport;
  const width = visual?.width ?? window.innerWidth, height = visual?.height ?? window.innerHeight;
  const keyboard = window.innerWidth < 900 && window.innerHeight - height > 120;
  return { width, height, left: visual?.offsetLeft ?? 0, top: visual?.offsetTop ?? 0, keyboard };
}
/**
 * 站点头部高度（h-12 = 48px）加呼吸位。面板锚在右下角向上生长，只约束 bottom
 * 会让它在移动端压掉 sticky 头部实测 25px，所以这里同时约束顶部。
 */
const TOP_INSET = 56;

export function companionBounds(width: number, height: number, keyboard = false) {
  const desktop = width >= 900;
  const right = desktop ? 150 : 12, bottom = desktop ? 24 : keyboard ? 12 : width <= 640 ? 214 : 246;
  const available = Math.max(0, height - bottom - TOP_INSET);
  return { right, bottom, top: TOP_INSET, minWidth: Math.min(360, width - right - 12), maxWidth: Math.max(0, width - right - 12), minHeight: Math.min(340, available), maxHeight: available };
}
export function clampCompanionSize(size: CompanionSize, width: number, height: number, keyboard = false): CompanionSize {
  const b = companionBounds(width, height, keyboard);
  return { width: Math.round(Math.max(b.minWidth, Math.min(b.maxWidth, size.width))), height: Math.round(Math.max(b.minHeight, Math.min(b.maxHeight, size.height))) };
}
export function defaultCompanionSize(width: number, height: number) {
  return clampCompanionSize({ width: width >= 900 ? Math.min(1040, Math.max(540, width * 0.56)) : width - 24, height: Math.min(900, height * 0.84) }, width, height);
}
export function useCompanionSize() {
  const [size, setSize] = useState<CompanionSize | undefined>();
  const [keyboard, setKeyboard] = useState(false);
  const chosen = useRef<CompanionSize | null>(null);
  const drag = useRef<{ id: number; x: number; y: number; start: CompanionSize; edge: Edge } | null>(null);
  const anchor = useRef({ getBoundingClientRect: () => {
    const view = viewport(), b = companionBounds(view.width, view.height, view.keyboard);
    return new DOMRect(view.left + view.width - b.right, view.top + view.height - b.bottom, 0, 0);
  } });
  const fit = useCallback((value: CompanionSize) => { const view = viewport(); return clampCompanionSize(value, view.width, view.height, view.keyboard); }, []);
  const preferred = useCallback(() => {
    const view = viewport();
    if (view.width < 900) return fit({ width: view.width - 24, height: view.height });
    return chosen.current ? fit(chosen.current) : defaultCompanionSize(view.width, view.height);
  }, [fit]);
  function save(value: CompanionSize) { chosen.current = value; try { localStorage.setItem(COMPANION_SIZE_KEY, JSON.stringify(value)); } catch { /* Keep sizing usable without browser storage. */ } }
  function prepare() {
    if (!chosen.current) try {
      const value = JSON.parse(localStorage.getItem(COMPANION_SIZE_KEY) || "null");
      if (value && Number.isFinite(value.width) && Number.isFinite(value.height) && value.width > 0 && value.height > 0) chosen.current = value;
    } catch { /* Ignore malformed saved dimensions. */ }
    setKeyboard(viewport().keyboard); setSize(preferred());
  }
  useEffect(() => {
    let frame: number | undefined;
    const resize = () => {
      drag.current = null; if (frame !== undefined) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { frame = undefined; setKeyboard(viewport().keyboard); setSize(preferred()); });
    };
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("scroll", resize);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("scroll", resize);
    };
  }, [preferred]);
  function reset() {
    chosen.current = null;
    try { localStorage.removeItem(COMPANION_SIZE_KEY); } catch { /* Session reset still works. */ }
    setSize(preferred());
  }
  function handle(edge: Edge) {
    return {
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        if (event.button !== 0) return;
        const panel = event.currentTarget.closest("#ans-companion-panel")?.getBoundingClientRect();
        if (!panel) return;
        event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, start: { width: panel.width, height: panel.height }, edge };
      },
      onPointerMove(event: PointerEvent<HTMLButtonElement>) {
        const d = drag.current; if (!d || d.id !== event.pointerId) return;
        setSize(fit({ width: d.start.width + (d.edge === "height" ? 0 : d.x - event.clientX), height: d.start.height + (d.edge === "width" ? 0 : d.y - event.clientY) }));
      },
      onPointerUp(event: PointerEvent<HTMLButtonElement>) {
        const d = drag.current; if (!d || d.id !== event.pointerId) return;
        const next = fit({ width: d.start.width + (d.edge === "height" ? 0 : d.x - event.clientX), height: d.start.height + (d.edge === "width" ? 0 : d.y - event.clientY) });
        drag.current = null; save(next); setSize(next);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      },
      onPointerCancel() { const d = drag.current; drag.current = null; if (d) setSize(fit(d.start)); },
      onLostPointerCapture() { drag.current = null; },
      onDoubleClick: reset,
      onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (event.key === "Home") { event.preventDefault(); reset(); return; }
        const horizontal = edge !== "height" && ["ArrowLeft", "ArrowRight"].includes(event.key);
        const vertical = edge !== "width" && ["ArrowUp", "ArrowDown"].includes(event.key);
        if (!horizontal && !vertical) return;
        event.preventDefault(); const current = size ?? defaultCompanionSize(window.innerWidth, window.innerHeight), step = event.shiftKey ? 64 : 24;
        const next = fit({ width: current.width + (horizontal ? (event.key === "ArrowLeft" ? step : -step) : 0), height: current.height + (vertical ? (event.key === "ArrowUp" ? step : -step) : 0) });
        save(next); setSize(next);
      },
    };
  }
  const style: CSSProperties = size ? { width: size.width, height: size.height } : {};
  return { style, anchor, prepare, reset, handle, keyboard };
}
