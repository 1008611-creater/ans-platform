"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { PanelRightOpen } from "lucide-react";
import { cn } from "@/lib/utils";

/** 左栏超过这个比例就自动收起右栏。 */
export const COLLAPSE_RIGHT_AT = 0.82;
const MIN_LEFT = 0.2;
const KEY_STEP = 0.02;

const MAX_DRAG = 0.95;

/** 松手时的结果：比例限制在 [20%, 95%]，超过 82% 就收起右栏。 */
export function settleRatio(raw: number) {
  const ratio = Math.min(MAX_DRAG, Math.max(MIN_LEFT, raw));
  return { ratio, collapsed: ratio > COLLAPSE_RIGHT_AT };
}

type Props = {
  left: ReactNode;
  right: ReactNode;
  /** 分隔条的无障碍名称 */
  label: string;
  /** 右栏被收起后，重新展开按钮的名称 */
  reopenLabel: string;
  initialRatio?: number;
  className?: string;
};

/**
 * 左右分栏：
 * - 拖动时给右侧预览盖透明遮罩，iframe 不会吞掉指针；
 * - Esc 取消本次拖动，恢复原比例；双击回到 50/50；
 * - 左栏超过 82% 自动收起右栏；
 * - 松手吸附用过阻尼弹簧（--spring-drag），零回弹；
 * - 分隔条可用方向键调整；
 * - 窄屏（< lg）上下堆叠，不出现分隔条。
 */
export function ResizableSplit({ left, right, label, reopenLabel, initialRatio = 0.5, className }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(initialRatio);
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ ratio: number; collapsed: boolean } | null>(null);

  const ratioAt = useCallback((clientX: number) => {
    const box = root.current?.getBoundingClientRect();
    return box && box.width > 0 ? (clientX - box.left) / box.width : ratio;
  }, [ratio]);

  /** 拖动中只更新比例；是否收起等松手再决定，分隔条不能在拖动中消失。 */
  const preview = (raw: number) => setRatio(settleRatio(raw).ratio);
  const commit = (raw: number) => {
    const next = settleRatio(raw);
    if (next.collapsed) { setCollapsed(true); setRatio(start.current?.collapsed === false ? start.current.ratio : 0.5); }
    else { setCollapsed(false); setRatio(next.ratio); }
  };

  const cancel = useCallback(() => {
    if (!start.current) return;
    setRatio(start.current.ratio); setCollapsed(start.current.collapsed);
    start.current = null; setDragging(false);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); cancel(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [dragging, cancel]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button > 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { ratio, collapsed };
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => { if (start.current) preview(ratioAt(event.clientX)); };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    commit(ratioAt(event.clientX));
    start.current = null; setDragging(false);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); commit(ratio - KEY_STEP); }
    if (event.key === "ArrowRight") { event.preventDefault(); commit(ratio + KEY_STEP); }
    if (event.key === "Enter") { event.preventDefault(); setRatio(0.5); setCollapsed(false); }
  };

  const leftPercent = collapsed ? 100 : ratio * 100;
  return <div ref={root} className={cn("relative flex min-h-0 min-w-0 flex-col lg:flex-row", className)} data-dragging={dragging || undefined}
    style={{ ["--split-left" as string]: `${leftPercent}%` }}>
    <div className={cn("flex min-w-0 flex-col lg:shrink-0 lg:grow-0 lg:basis-[var(--split-left)]", !dragging && "ans-spring-drag transition-[flex-basis]")}>{left}</div>
    {!collapsed && <>
      <div role="separator" aria-orientation="vertical" aria-label={label} aria-valuemin={20} aria-valuemax={100} aria-valuenow={Math.round(leftPercent)} tabIndex={0}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={cancel} onKeyDown={onKeyDown}
        onDoubleClick={() => { setRatio(0.5); setCollapsed(false); }}
        className="group relative z-10 hidden w-3 shrink-0 cursor-col-resize touch-none outline-none lg:block">
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--hairline)] transition-colors group-hover:bg-foreground/25 group-focus-visible:bg-foreground/40 group-data-[dragging]:bg-foreground/40" />
      </div>
      <div className={cn("relative flex min-w-0 flex-1 flex-col transition-opacity", dragging && ratio > COLLAPSE_RIGHT_AT && "opacity-40")}>
        {right}
        {/* 拖动期间盖一层透明遮罩，指针不会被预览里的 iframe 吞掉 */}
        {dragging && <div className="absolute inset-0 z-20 cursor-col-resize" aria-hidden="true" data-testid="split-shield" />}
      </div>
    </>}
    {collapsed && <button type="button" onClick={() => { setRatio(0.5); setCollapsed(false); }} aria-label={reopenLabel} title={reopenLabel}
      className="absolute right-2 top-2 z-10 hidden h-9 w-9 place-items-center rounded-lg bg-card text-muted-foreground ans-hairline hover:bg-muted hover:text-foreground lg:grid">
      <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
    </button>}
  </div>;
}
