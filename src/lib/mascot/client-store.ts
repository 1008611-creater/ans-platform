"use client";

import {
  FORM_EVENT,
  FORM_STORAGE_KEY,
  STATE_EVENT,
  isDinoState,
  isMascotForm,
  type DinoState,
  type MascotForm,
} from "./atlas";

export type { DinoState, MascotForm };
export { FORM_EVENT, FORM_STORAGE_KEY, STATE_EVENT, isDinoState, isMascotForm };

let activePixelState: DinoState = "idle";

export function getFormSnapshot(): MascotForm {
  if (typeof window === "undefined") return "3d";
  try {
    const raw = window.localStorage.getItem(FORM_STORAGE_KEY);
    return isMascotForm(raw) ? raw : "3d";
  } catch {
    return "3d";
  }
}

export function getPixelStateSnapshot(): DinoState {
  return activePixelState;
}

export function writeForm(form: MascotForm): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FORM_STORAGE_KEY, form);
  } catch {
    /* Ignore storage errors in private mode. */
  }
  window.dispatchEvent(new CustomEvent(FORM_EVENT, { detail: { form } }));
}

export function writePixelState(state: DinoState): void {
  activePixelState = state;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STATE_EVENT, { detail: { state } }));
}

export function subscribeMascotStore(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === FORM_STORAGE_KEY) onStoreChange();
  };
  const onState = (event: Event) => {
    const next = (event as CustomEvent<{ state?: unknown }>).detail?.state;
    if (isDinoState(next) && next !== activePixelState) {
      activePixelState = next;
    }
    onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(FORM_EVENT, onStoreChange);
  window.addEventListener(STATE_EVENT, onState);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(FORM_EVENT, onStoreChange);
    window.removeEventListener(STATE_EVENT, onState);
  };
}
