"use client";
import { useEffect, type RefObject } from "react";

type Box = { top: number; bottom: number; left: number; right: number };

/** 圆章和按钮之间留的空隙。 */
export const DODGE_GAP_PX = 8;
/** 往上让超过这个距离就不挪了，直接隐去，免得圆章跑到屏幕中间。 */
export const DODGE_MAX_PX = 96;
/** 能被圆章挡住的页面控件；链接只算按钮大小的（整张卡片是链接时不让）。 */
const CONTROL = "button, [role=button], input:not([type=hidden]), textarea, select, a[href]";
const LINK_BUTTON_MAX_H = 56;

/** 圆章原位（未上移时）压住了某个控件：上移到控件上方，挪太远就隐去。 */
export function dodgeFor(badge: Box, control: Box): number | "hide" {
  const overlaps = badge.left < control.right && badge.right > control.left && badge.top < control.bottom && badge.bottom > control.top;
  if (!overlaps) return 0;
  const lift = Math.ceil(badge.bottom - control.top + DODGE_GAP_PX);
  return lift > DODGE_MAX_PX ? "hide" : lift;
}

/** 在圆章原位的中心和四角下面找页面控件，跳过兔兔龙自己。 */
export function controlUnder(badge: Box, owner: Element): Element | null {
  const inset = 4;
  const points = [
    [(badge.left + badge.right) / 2, (badge.top + badge.bottom) / 2],
    [badge.left + inset, badge.top + inset], [badge.right - inset, badge.top + inset],
    [badge.left + inset, badge.bottom - inset], [badge.right - inset, badge.bottom - inset],
  ];
  for (const [x, y] of points) {
    for (const hit of document.elementsFromPoint(x, y)) {
      if (owner.contains(hit)) continue;
      const control = hit.closest(CONTROL);
      if (!control || owner.contains(control)) continue;
      if (control.tagName === "A" && control.getBoundingClientRect().height > LINK_BUTTON_MAX_H) continue;
      return control;
    }
  }
  return null;
}

/**
 * 手机上收起的圆章在滚动时如果压住页面按钮，就往上让开（PRD v1.1 4.5 第 1 条，优先让主按钮）。
 * 位移写在根节点的 --ans-dino-dodge 上，挪不开时打 data-dodge="hide"。
 */
export function useBadgeDodge(root: RefObject<HTMLElement | null>, enabled: boolean, pathname: string) {
  useEffect(() => {
    const node = root.current;
    if (!enabled || !node || typeof document.elementsFromPoint !== "function") return;
    let frame = 0, lift = 0;
    const apply = (next: number | "hide") => {
      lift = next === "hide" ? 0 : next;
      node.style.setProperty("--ans-dino-dodge", `${lift}px`);
      if (next === "hide") node.dataset.dodge = "hide"; else delete node.dataset.dodge;
    };
    const measure = () => {
      frame = 0;
      const trigger = node.querySelector(".ans-dino-trigger");
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      if (!rect.width) return;
      const home = { top: rect.top + lift, bottom: rect.bottom + lift, left: rect.left, right: rect.right };
      const control = controlUnder(home, node);
      apply(control ? dodgeFor(home, control.getBoundingClientRect()) : 0);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    // 新页面的按钮可能晚一点才渲染出来。
    const late = window.setTimeout(schedule, 400);
    schedule();
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(late);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      node.style.removeProperty("--ans-dino-dodge");
      delete node.dataset.dodge;
    };
  }, [root, enabled, pathname]);
}
