"use client";

import { useEffect, type RefObject } from "react";

/**
 * 浮在页面上的小菜单：按 Esc 或点外面就关掉。
 * Esc 关闭后焦点回到触发按钮；点外面只负责关菜单，这一下点击不会穿透到下面的东西。
 */
export function useDismiss(
  open: boolean,
  onClose: () => void,
  refs: RefObject<HTMLElement | null>[],
  trigger?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const inside = (target: EventTarget | null) =>
      target instanceof Node && refs.some(ref => ref.current?.contains(target));
    // 点外面只关菜单，吞掉这一下点击，免得顺手点中下面的模板卡、链接
    const swallowClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (inside(event.target) || trigger?.current?.contains(event.target as Node)) return;
      onClose();
      document.addEventListener("click", swallowClick, { capture: true, once: true });
      window.setTimeout(() => document.removeEventListener("click", swallowClick, true), 600);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
      trigger?.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
    // refs 是稳定的 ref 对象，onClose 每次渲染都会变，这里只跟 open 走
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

/**
 * 小菜单的键盘操作：打开后焦点进第一项，↑↓ 在菜单项间移动（首尾循环），Home/End 跳首尾，
 * Tab 关菜单并让焦点照常往后走。菜单项需要 role="menuitem"。
 */
export function useMenuKeyboard(open: boolean, onClose: () => void, menu: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const items = () => Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
    const frame = requestAnimationFrame(() => items()[0]?.focus({ preventScroll: true }));
    const onKeyDown = (event: KeyboardEvent) => {
      const list = items();
      if (list.length === 0) return;
      const idx = list.indexOf(document.activeElement as HTMLElement);
      let next = -1;
      if (event.key === "ArrowDown") next = (idx + 1) % list.length;
      else if (event.key === "ArrowUp") next = idx <= 0 ? list.length - 1 : idx - 1;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = list.length - 1;
      else if (event.key === "Tab") {
        onClose();
        return;
      }
      if (next < 0) return;
      event.preventDefault();
      list[next].focus({ preventScroll: true });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
