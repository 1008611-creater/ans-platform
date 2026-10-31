"use client";

import { useMemo } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

/** 选字结束后这段时间内的回车也算输入法的（部分输入法和 Safari 会补发一次 Enter）。 */
export const IME_ENTER_GRACE_MS = 500;

type KeyLike = { isComposing?: boolean; keyCode?: number };

/** 纯判断：回车是否属于输入法选字，便于测试。 */
export function isImeEnter(event: KeyLike, composing: boolean, endedAt: number, now: number) {
  return composing || Boolean(event.isComposing) || event.keyCode === 229 || now - endedAt < IME_ENTER_GRACE_MS;
}

// 同一时刻只有一个输入框在组字，所以在 document 上统一记录即可，任何输入框都不用单独绑定。
let composing = false;
let endedAt = Number.NEGATIVE_INFINITY;
if (typeof document !== "undefined") {
  document.addEventListener("compositionstart", () => { composing = true; }, true);
  document.addEventListener("compositionend", () => { composing = false; endedAt = performance.now(); }, true);
}

/**
 * 中文输入法守卫：选字中（isComposing / keyCode 229）以及选字结束后 500ms 内的回车，返回 true。
 * 用法：`if (event.key === "Enter" && !imeBlocks(event)) send();`
 */
export function imeBlocks(event: ReactKeyboardEvent | KeyboardEvent) {
  const native = "nativeEvent" in event ? event.nativeEvent : event;
  return isImeEnter(native, composing, endedAt, performance.now());
}

/** 组件里习惯用 hook 的写法；`bind` 为空对象，保留是为了调用处一致。 */
export function useImeEnterGuard() {
  return useMemo(() => ({ bind: {}, blocks: imeBlocks }), []);
}

/**
 * 表单里的单行输入框：浏览器按回车会隐式提交表单，输入法选字结束后的那次回车也会提交。
 * 把 `imeSubmitGuard` 作为 onKeyDown 即可拦掉选字回车，正常回车照常提交。
 */
export function imeSubmitGuard(event: ReactKeyboardEvent) {
  if (event.key === "Enter" && imeBlocks(event)) event.preventDefault();
}
