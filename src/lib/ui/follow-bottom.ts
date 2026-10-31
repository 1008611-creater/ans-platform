"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** 离底部这么近才算「在底部」，新消息自动跟随。 */
export const FOLLOW_THRESHOLD_PX = 40;
/** 离底部超过这个距离才出现「跳至最新」。 */
export const JUMP_THRESHOLD_PX = 120;

export function distanceFromBottom(node: { scrollHeight: number; scrollTop: number; clientHeight: number }) {
  return Math.max(0, node.scrollHeight - node.scrollTop - node.clientHeight);
}

const USER_SCROLL_KEYS = new Set(["ArrowUp", "PageUp", "Home", "ArrowDown", "PageDown", "End", " "]);

/**
 * 消息列表的跟随规则：
 * - 在底部 40px 内时，内容变高就自动滚到底；
 * - 用户一滚动（滚轮、触摸、键盘、拖滚动条）立刻停止跟随，回到 40px 内才恢复；
 * - 离底部超过 120px 时 `showJump` 为 true。
 * 返回的 `follow` 是可写的 ref，发送消息时可以强制恢复跟随。
 */
export function useFollowBottom(ref: RefObject<HTMLElement | null>) {
  const follow = useRef(true);
  const userIntentAt = useRef(0);
  const [showJump, setShowJump] = useState(false);

  const measure = useCallback(() => {
    const node = ref.current; if (!node) return;
    const distance = distanceFromBottom(node);
    if (distance <= FOLLOW_THRESHOLD_PX) follow.current = true;
    else if (performance.now() - userIntentAt.current < 400) follow.current = false;
    setShowJump(distance > JUMP_THRESHOLD_PX);
  }, [ref]);

  const stick = useCallback(() => {
    const node = ref.current; if (!node || !follow.current) return;
    node.scrollTop = node.scrollHeight;
    setShowJump(false);
  }, [ref]);

  useEffect(() => {
    const node = ref.current; if (!node) return;
    const markIntent = () => { userIntentAt.current = performance.now(); };
    const onWheel = (event: WheelEvent) => { markIntent(); if (event.deltaY < 0) follow.current = false; };
    const onTouch = () => { markIntent(); follow.current = false; };
    const onKey = (event: KeyboardEvent) => { if (USER_SCROLL_KEYS.has(event.key)) markIntent(); };
    node.addEventListener("wheel", onWheel, { passive: true });
    node.addEventListener("touchmove", onTouch, { passive: true });
    node.addEventListener("pointerdown", markIntent, { passive: true });
    node.addEventListener("keydown", onKey);
    node.addEventListener("scroll", measure, { passive: true });
    // 内容变高（新消息、图片加载、回复展开）时，只有跟随状态才贴底。
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => { stick(); measure(); });
    for (const child of Array.from(node.children)) observer?.observe(child);
    return () => {
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("touchmove", onTouch);
      node.removeEventListener("pointerdown", markIntent);
      node.removeEventListener("keydown", onKey);
      node.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, [ref, measure, stick]);

  const jumpToLatest = useCallback(() => {
    const node = ref.current; if (!node) return;
    follow.current = true;
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollTo({ top: node.scrollHeight, behavior: reduce ? "auto" : "smooth" });
    setShowJump(false);
  }, [ref]);

  return { follow, showJump, stick, measure, jumpToLatest };
}
