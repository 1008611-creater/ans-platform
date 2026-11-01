"use client";

import { useRef, type TouchEvent } from "react";

type Side = "left" | "right";

/**
 * 侧边抽屉跟手关闭：手指拖动时抽屉跟着走，松手时拖过三分之一或甩得够快就滑走关掉，否则弹回原位。
 * 用在 Radix Sheet 的内容上：关闭时自己把抽屉滑出屏幕，再通知外层关，避免 Sheet 的退场动画从原位重播一遍。
 * `edgeOnly` 时只认从屏幕边缘起手的拖动（整屏面板里有可滚动内容，不能随便抢手势）。
 */
export function useSwipeDismiss(side: Side, onClose: () => void, options: { edgeOnly?: boolean } = {}) {
  const drag = useRef<{ x: number; y: number; t: number; dx: number; locked: boolean | null } | null>(null);
  const dir = side === "left" ? -1 : 1;

  function reset(el: HTMLElement) {
    el.style.transition = "";
    el.style.transform = "";
  }

  return {
    onTouchStart(event: TouchEvent<HTMLElement>) {
      const t = event.touches[0];
      if (!t) return;
      if (options.edgeOnly && (side === "right" ? t.clientX > 28 : t.clientX < window.innerWidth - 28)) return;
      drag.current = { x: t.clientX, y: t.clientY, t: performance.now(), dx: 0, locked: null };
    },
    onTouchMove(event: TouchEvent<HTMLElement>) {
      const d = drag.current;
      const t = event.touches[0];
      if (!d || !t) return;
      const dx = t.clientX - d.x;
      const dy = t.clientY - d.y;
      // 先判断是横着拖还是在竖着滚，竖着滚就不接管
      if (d.locked === null && Math.abs(dx) + Math.abs(dy) > 8) d.locked = Math.abs(dx) > Math.abs(dy) * 1.2;
      if (!d.locked) return;
      // 只能朝关闭方向拖，反方向给一点阻尼
      const toward = dx * dir;
      d.dx = toward > 0 ? dx : dx * 0.15;
      const el = event.currentTarget;
      el.style.transition = "none";
      el.style.animation = "none";
      el.style.transform = `translate3d(${d.dx}px,0,0)`;
    },
    onTouchEnd(event: TouchEvent<HTMLElement>) {
      const d = drag.current;
      drag.current = null;
      if (!d || !d.locked) return;
      const el = event.currentTarget;
      const width = el.getBoundingClientRect().width || window.innerWidth;
      const velocity = (d.dx * dir) / Math.max(1, performance.now() - d.t);
      if (d.dx * dir > width / 3 || velocity > 0.6) {
        el.style.transition = "transform 220ms cubic-bezier(.23,1,.32,1)";
        el.style.transform = `translate3d(${dir * width}px,0,0)`;
        window.setTimeout(onClose, 200);
        return;
      }
      // 没拖够：过阻尼弹回，不回弹过头
      el.style.transition = "transform 280ms cubic-bezier(.23,1,.32,1)";
      el.style.transform = "translate3d(0,0,0)";
      window.setTimeout(() => reset(el), 300);
    },
  };
}
