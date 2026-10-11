"use client";

import { useSyncExternalStore } from "react";

export type SitePreferences = { voice: boolean; volume: number; motion: "auto" | "calm"; suggestions: boolean };
export const PREFERENCES_KEY = "ans.site-preferences.v2";
const defaults: SitePreferences = Object.freeze({ voice: false, volume: 65, motion: "auto", suggestions: true });
let snapshot: SitePreferences = defaults;
let initialized = false;
const listeners = new Set<() => void>();
function normalize(value: unknown): SitePreferences {
  const p = value && typeof value === "object" ? value as Partial<SitePreferences> : {};
  return { voice: p.voice === true, volume: typeof p.volume === "number" && Number.isFinite(p.volume) ? Math.max(0, Math.min(100, Math.round(p.volume))) : 65, motion: p.motion === "calm" ? "calm" : "auto", suggestions: p.suggestions !== false };
}
function notify() { for (const listener of listeners) listener(); }
function load() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try { snapshot = normalize(JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "null")); } catch { snapshot = defaults; }
  window.addEventListener("storage", event => {
    if (event.key !== PREFERENCES_KEY && event.key !== null) return;
    try { snapshot = normalize(event.newValue ? JSON.parse(event.newValue) : null); } catch { snapshot = defaults; }
    notify();
  });
}
function subscribe(listener: () => void) { load(); listeners.add(listener); return () => { listeners.delete(listener); }; }
function getSnapshot() { load(); return snapshot; }
export function useSitePreferences() { return useSyncExternalStore(subscribe, getSnapshot, () => defaults); }
export function updateSitePreferences(patch: Partial<SitePreferences>) {
  load(); snapshot = normalize({ ...snapshot, ...patch });
  try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(snapshot)); } catch { /* Keep preferences in memory when storage is unavailable. */ }
  notify();
}
export function resetSitePreferences() { updateSitePreferences(defaults); }
export function openSiteSettings() { window.dispatchEvent(new CustomEvent("ans:open-settings")); }
