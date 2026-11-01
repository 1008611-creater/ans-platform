"use client";

import { useEffect, type RefObject } from "react";

/**
 * 浮在页面上的小菜单：按 Esc 或点外面就关掉。
 * Esc 关闭后焦点回到触发按钮；点外面关闭时不抢焦点，让用户点到的东西照常响应。
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
    const onPointerDown = (event: PointerEvent) => {
      if (!inside(event.target)) onClose();
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
