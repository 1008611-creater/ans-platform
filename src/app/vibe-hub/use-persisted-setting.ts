"use client";
import { useCallback, useSyncExternalStore } from "react";
const memory = new Map<string, string>();
const failedWrites = new Set<string>();
function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea !== localStorage) return;
    if (event.key === null) { memory.clear(); failedWrites.clear(); }
    else { memory.delete(event.key); failedWrites.delete(event.key); }
    listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("vibehub:settings", listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("vibehub:settings", listener);
  };
}
export function usePersistedSetting(key: string, fallback: string): [string, (value: string) => void, boolean] {
  const snapshot = useCallback(() => {
    if (failedWrites.has(key)) return memory.get(key) ?? fallback;
    try { return localStorage.getItem(key) ?? memory.get(key) ?? fallback; }
    catch { return memory.get(key) ?? fallback; }
  }, [key, fallback]);
  const persistenceSnapshot = useCallback(() => !failedWrites.has(key), [key]);
  const value = useSyncExternalStore(subscribe, snapshot, () => fallback);
  const persisted = useSyncExternalStore(subscribe, persistenceSnapshot, () => true);
  const setValue = (next: string) => {
    memory.set(key, next);
    try { localStorage.setItem(key, next); failedWrites.delete(key); }
    catch { failedWrites.add(key); }
    window.dispatchEvent(new Event("vibehub:settings"));
  };
  return [value, setValue, persisted];
}
