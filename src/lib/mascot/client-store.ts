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
import type {
  GrokMorphEffect,
  GrokRenderStyle,
  GrokShapeId,
} from "./grokbot-dino-2d";

export type { DinoState, MascotForm, GrokShapeId, GrokRenderStyle, GrokMorphEffect };
export { FORM_EVENT, FORM_STORAGE_KEY, STATE_EVENT, isDinoState, isMascotForm };

export const GROK_SHAPE_EVENT = "ans:grok-shape";
export const GROK_STYLE_EVENT = "ans:grok-style";
export const GROK_COMMAND_EVENT = "ans:grokbot-command";

export type GrokBotCommand =
  | { kind: "poke" }
  | { kind: "wink"; eye?: 0 | 1 }
  | { kind: "spin"; turns?: number }
  | { kind: "morph"; effect: GrokMorphEffect }
  | { kind: "shape"; shape: GrokShapeId };

let activePixelState: DinoState = "idle";
let activeGrokShape: GrokShapeId = "tutulong";
let activeRenderStyle2d: GrokRenderStyle = "grok";

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

export function getGrokShapeSnapshot(): GrokShapeId {
  return activeGrokShape;
}

export function getRenderStyle2dSnapshot(): GrokRenderStyle {
  return activeRenderStyle2d;
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

export function writeGrokShape(shape: GrokShapeId): void {
  activeGrokShape = shape;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(GROK_SHAPE_EVENT, { detail: { shape } }));
}

export function writeRenderStyle2d(style: GrokRenderStyle): void {
  activeRenderStyle2d = style;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(GROK_STYLE_EVENT, { detail: { style } }));
}

export function dispatchGrokBotCommand(command: GrokBotCommand): void {
  if (typeof window === "undefined") return;
  if (command.kind === "shape") {
    writeGrokShape(command.shape);
  }
  window.dispatchEvent(new CustomEvent(GROK_COMMAND_EVENT, { detail: command }));
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
  window.addEventListener(GROK_SHAPE_EVENT, onStoreChange);
  window.addEventListener(GROK_STYLE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(FORM_EVENT, onStoreChange);
    window.removeEventListener(STATE_EVENT, onState);
    window.removeEventListener(GROK_SHAPE_EVENT, onStoreChange);
    window.removeEventListener(GROK_STYLE_EVENT, onStoreChange);
  };
}
