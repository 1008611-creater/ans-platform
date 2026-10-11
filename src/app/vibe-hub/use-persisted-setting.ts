"use client";
import { useCallback, useSyncExternalStore } from "react";
const memory = new Map<string,string>();
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener); window.addEventListener("vibehub:settings",listener);
  return () => { window.removeEventListener("storage",listener); window.removeEventListener("vibehub:settings",listener); };
}
export function usePersistedSetting(key: string, fallback: string): [string, (value: string) => void] {
  const snapshot = useCallback(() => {try{return localStorage.getItem(key) || memory.get(key) || fallback;}catch{return memory.get(key) || fallback;}},[key,fallback]);
  const value = useSyncExternalStore(subscribe,snapshot,()=>fallback);
  const setValue = (next: string) => {memory.set(key,next);try{localStorage.setItem(key,next);}catch{}window.dispatchEvent(new Event("vibehub:settings"));};
  return [value,setValue];
}
