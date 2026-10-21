/**
 * 吉祥物桌宠的客户端外部存储（localStorage + 事件）。
 *
 * 用 useSyncExternalStore 订阅，避免「在 effect 里同步 setState」造成的级联渲染，
 * 并保证 SSR / 水合一致性（服务端快照固定）。
 */

import {
  FORM_EVENT,
  FORM_STORAGE_KEY,
  POSITION_STORAGE_KEY,
  isMascotForm,
  type MascotForm,
} from "@/lib/mascot/atlas";

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window === "undefined") return () => listeners.delete(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === FORM_STORAGE_KEY || event.key === POSITION_STORAGE_KEY) emit();
  };
  window.addEventListener(FORM_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener(FORM_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export const subscribeMascotStore = subscribe;

/** 形态快照：localStorage 里的原始字符串（基础类型，天然稳定） */
export function getFormSnapshot(): MascotForm {
  if (typeof window === "undefined") return "3d";
  try {
    const raw = window.localStorage.getItem(FORM_STORAGE_KEY);
    return isMascotForm(raw) ? raw : "3d";
  } catch {
    return "3d";
  }
}

export function getPositionSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(POSITION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeForm(form: MascotForm): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FORM_STORAGE_KEY, form);
  } catch {
    /* 隐私模式下忽略 */
  }
  window.dispatchEvent(new CustomEvent(FORM_EVENT, { detail: { form } }));
  emit();
}

export function writePosition(position: { x: number; y: number }): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
  } catch {
    /* 忽略 */
  }
  emit();
}

/** 解析位置快照；返回值在快照不变时保持引用稳定 */
export function parsePosition(raw: string | null): { x: number; y: number } | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const candidate = parsed as { x?: unknown; y?: unknown };
    if (typeof candidate.x !== "number" || typeof candidate.y !== "number") return null;
    return { x: candidate.x, y: candidate.y };
  } catch {
    return null;
  }
}
