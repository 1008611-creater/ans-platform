/**
 * 吉祥物兔兔龙「像素风格 (2d) ⇄ 真 3D (3d)」双形态客户端状态存储。
 */

export type MascotForm = "2d" | "3d";

export const FORM_STORAGE_KEY = "ans.mascot.form";
export const FORM_EVENT = "ans:mascot-form";

export function isMascotForm(value: unknown): value is MascotForm {
  return value === "2d" || value === "3d";
}

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeMascotStore(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window === "undefined") return () => listeners.delete(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === FORM_STORAGE_KEY) emit();
  };
  window.addEventListener(FORM_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener(FORM_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getFormSnapshot(): MascotForm {
  if (typeof window === "undefined") return "3d";
  try {
    const raw = window.localStorage.getItem(FORM_STORAGE_KEY);
    return isMascotForm(raw) ? raw : "3d";
  } catch {
    return "3d";
  }
}

export function writeForm(form: MascotForm): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FORM_STORAGE_KEY, form);
  } catch {
    /* Ignore storage errors in private mode */
  }
  window.dispatchEvent(new CustomEvent(FORM_EVENT, { detail: { form } }));
  emit();
}
