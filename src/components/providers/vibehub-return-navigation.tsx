"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const originKey = "ans:vibehub:entry:v1";
const restoreKey = "ans:vibehub:return:v1";
const changeEvent = "ans-vibehub-entry-change";
const memory = new Map<string, string>();
type Entry = { href: string; x: number; y: number };

function isVibeHub(path: string) { return path === "/vibe-hub" || path.startsWith("/vibe-hub/"); }
function read(key: string) {
  const cached = memory.get(key);
  if (cached !== undefined) return cached;
  try { return sessionStorage.getItem(key) ?? ""; } catch { return ""; }
}
function write(key: string, value: string) {
  memory.set(key, value);
  try { if (value) sessionStorage.setItem(key, value); else sessionStorage.removeItem(key); } catch { /* Retain this tab's in-memory destination. */ }
}
function parse(raw: string): Entry | null {
  try {
    const entry: unknown = JSON.parse(raw);
    if (!entry || typeof entry !== "object") return null;
    const value = entry as Partial<Entry>;
    if (typeof value.href !== "string" || !value.href.startsWith("/") || value.href.startsWith("//")) return null;
    const url = new URL(value.href, window.location.origin);
    if (url.origin !== window.location.origin || isVibeHub(url.pathname) || url.pathname === "/api" || url.pathname.startsWith("/api/")) return null;
    if (typeof value.x !== "number" || typeof value.y !== "number" || !Number.isFinite(value.x) || !Number.isFinite(value.y) || value.x < 0 || value.y < 0) return null;
    return { href: url.pathname + url.search + url.hash, x: value.x, y: value.y };
  } catch { return null; }
}
function remember(entry: Entry) {
  write(originKey, JSON.stringify(entry));
  window.dispatchEvent(new Event(changeEvent));
}
function subscribe(listener: () => void) {
  window.addEventListener(changeEvent, listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener(changeEvent, listener); window.removeEventListener("storage", listener); };
}
function snapshot() { return read(originKey); }
const serverSnapshot = () => "";

export function useVibeHubReturn() {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const entry = raw ? parse(raw) : null;
  return {
    href: entry?.href ?? "/",
    remembered: Boolean(entry),
    prepare: () => write(restoreKey, entry ? JSON.stringify(entry) : ""),
  };
}

/** Keep a tab-local ANS origin while users browse any number of VibeHub pages. */
export function VibeHubReturnNavigation() {
  const pathname = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    if (isVibeHub(pathname)) {
      if (!parse(read(originKey)) && document.referrer) {
        try {
          const referrer = new URL(document.referrer);
          if (referrer.origin === location.origin && !isVibeHub(referrer.pathname)) {
            const entry = parse(JSON.stringify({ href: referrer.pathname + referrer.search + referrer.hash, x: 0, y: 0 }));
            if (entry) remember(entry);
          }
        } catch { /* A direct visit has a predictable homepage fallback. */ }
      }
      return;
    }

    const route = location.pathname + location.search;
    const href = route + location.hash;
    const pending = parse(read(restoreKey));
    let restoring = pending?.href === href;
    if (!restoring) write(restoreKey, "");
    let frame = 0;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      if (!restoring && !isVibeHub(location.pathname) && location.pathname + location.search === route) {
        remember({ href: route + location.hash, x: window.scrollX, y: window.scrollY });
      }
    };
    const cancelRestore = () => {
      restoring = false;
      write(restoreKey, "");
      cancelAnimationFrame(frame);
      save();
    };
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) cancelRestore();
    };
    const onScroll = () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 120);
    };
    // Capture the exact position before Link/router navigation changes the URL.
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!link || event.button !== 0) return;
      try {
        const target = new URL(link.getAttribute("href") ?? "", location.href);
        if (target.origin === location.origin && isVibeHub(target.pathname)) save();
      } catch { /* Ignore malformed link URLs without interrupting other navigation. */ }
    };
    if (restoring && pending) {
      const deadline = performance.now() + 4000;
      let stable = 0;
      const restore = () => {
        if (!restoring) return;
        window.scrollTo({ left: pending.x, top: pending.y, behavior: "instant" });
        stable = Math.abs(window.scrollY - pending.y) < 2 && Math.abs(window.scrollX - pending.x) < 2 ? stable + 1 : 0;
        if (stable >= 3 || performance.now() >= deadline) {
          restoring = false;
          write(restoreKey, "");
          save();
          return;
        }
        frame = requestAnimationFrame(restore);
      };
      frame = requestAnimationFrame(restore);
    } else save();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    window.addEventListener("pointerdown", cancelRestore, { passive: true });
    window.addEventListener("wheel", cancelRestore, { passive: true });
    window.addEventListener("touchstart", cancelRestore, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", save);
    document.addEventListener("click", onClick, true);
    return () => {
      cancelAnimationFrame(frame);
      if (saveTimer) clearTimeout(saveTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
      window.removeEventListener("pointerdown", cancelRestore);
      window.removeEventListener("wheel", cancelRestore);
      window.removeEventListener("touchstart", cancelRestore);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", save);
      document.removeEventListener("click", onClick, true);
    };
  }, [pathname, params]);
  return null;
}
