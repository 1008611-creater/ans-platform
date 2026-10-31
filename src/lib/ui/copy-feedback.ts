"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** 复制成功的对勾停留时间，之后自动淡出恢复。 */
export const FEEDBACK_VISIBLE_MS = 2500;
const FADE_MS = 180;

export type CopyFeedbackState = "idle" | "done" | "leaving" | "failed";

/**
 * 复制等瞬时反馈：成功后显示 2.5s，再淡出 180ms 恢复原样。
 * `state === "leaving"` 时给对勾加 `.ans-feedback-leaving` 淡出。
 */
export function useCopyFeedback() {
  const [state, setState] = useState<CopyFeedbackState>("idle");
  const timers = useRef<number[]>([]);
  const clear = () => { timers.current.forEach(window.clearTimeout); timers.current = []; };
  useEffect(() => clear, []);

  const copy = useCallback(async (text: string) => {
    clear();
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
      timers.current.push(window.setTimeout(() => setState("leaving"), FEEDBACK_VISIBLE_MS));
      timers.current.push(window.setTimeout(() => setState("idle"), FEEDBACK_VISIBLE_MS + FADE_MS));
      return true;
    } catch {
      setState("failed");
      timers.current.push(window.setTimeout(() => setState("idle"), FEEDBACK_VISIBLE_MS));
      return false;
    }
  }, []);

  return { state, copied: state === "done" || state === "leaving", copy };
}
