"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

const key = "vibehub:favorites";
const datesKey = "vibehub:favorite-dates";
const targetType = "VIBEHUB_TERM";
type FavoriteState = { ids: string[]; loading: boolean; busy: string[]; error: string; toggle: (slug: string) => Promise<void> };
const Context = createContext<FavoriteState | null>(null);
function readLocal(): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? Array.from(new Set(value.filter((item): item is string => typeof item === "string"))) : []; }
  catch { return []; }
}
function readDates(): Record<string, number> {
  try { const value: unknown = JSON.parse(localStorage.getItem(datesKey) || "{}"); return value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).filter(([,date]) => typeof date === "number" && Number.isFinite(date))) : {}; }
  catch { return {}; }
}
function writeLocal(ids: string[], dates: Record<string, number>) { try { localStorage.setItem(key, JSON.stringify(ids)); localStorage.setItem(datesKey, JSON.stringify(dates)); } catch { /* In-memory favorites remain available. */ } }

export function VibeFavoritesProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]); const currentIds = useRef<string[]>([]); const dates = useRef<Record<string,number>>({});
  const [loading, setLoading] = useState(true); const remote = useRef(false);
  const changedWhileLoading = useRef(new Map<string, boolean>());
  const [busy, setBusy] = useState<string[]>([]); const pending = useRef(new Set<string>());
  const [error, setError] = useState(""); const t = useTranslations("vibehub");
  const update = useCallback((value: string[]) => { const ordered = [...value].sort((a,b) => (dates.current[a] || 0) - (dates.current[b] || 0)); currentIds.current = ordered; setIds(ordered); writeLocal(ordered, dates.current); }, []);
  useEffect(() => {
    let active = true; const syncing = new Set<string>();
    const controller = new AbortController(); remote.current = false; changedWhileLoading.current.clear(); dates.current = readDates(); update(readLocal());
    // Visitor storage is ready immediately; account availability cannot block local saves.
    queueMicrotask(() => { if (active) setLoading(false); });
    const timeout = setTimeout(() => controller.abort(), 8000);
    void (async () => {
      try {
        const response = await fetch(`/api/favorites?targetType=${targetType}&take=360`, { cache: "no-store", signal: controller.signal });
        if (!response.ok || !active) return;
        const payload = await response.json(); if (!active) return;
        const favorites: { targetType: string; targetId: string; favoritedAt?: string }[] = payload?.data?.favorites || [];
        for (const item of favorites) {
          if (item.targetType !== targetType || !item.favoritedAt) continue;
          const savedAt = Date.parse(item.favoritedAt);
          if (Number.isFinite(savedAt)) dates.current[item.targetId] = Math.max(dates.current[item.targetId] || 0, savedAt);
        }
        // The API is newest first; the local storage contract is oldest first.
        const remoteIds = favorites.filter(item => item.targetType === targetType).map(item => item.targetId).reverse();
        const local = currentIds.current; const missing = local.filter(slug => !remoteIds.includes(slug));
        const removed = remoteIds.filter(slug => changedWhileLoading.current.get(slug) === false);
        // Serialize initial account imports with normal toggle actions for the same term.
        [...missing, ...removed].forEach(slug => { syncing.add(slug); pending.current.add(slug); });
        setBusy([...pending.current]);
        update(Array.from(new Set([...local, ...remoteIds.filter(slug => !removed.includes(slug))]))); remote.current = true;
        for (const slug of removed) {
          const result = await fetch(`/api/favorites?targetType=${targetType}&targetId=${encodeURIComponent(slug)}`, {method: "DELETE", signal: controller.signal});
          if (!result.ok && active) setError(t("saveError"));
        }
        // Bound concurrency when importing visitor favorites into the account.
        let index = 0;
        await Promise.all(Array.from({ length: Math.min(4, missing.length) }, async () => {
          while (index < missing.length && active) {
            const slug = missing[index++];
            const result = await fetch("/api/favorites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetType, targetId: slug }), signal: controller.signal });
            if (!result.ok && active) setError(t("saveError"));
          }
        }));
      } catch { if (active && remote.current) setError(t("saveError")); }
      finally { clearTimeout(timeout); syncing.forEach(slug => pending.current.delete(slug)); if (active) setBusy([...pending.current]); }
    })();
    const synchronize = (event: StorageEvent) => { if (event.key === key || event.key === datesKey || event.key === null) { dates.current = readDates(); currentIds.current = readLocal().sort((a,b) => (dates.current[a] || 0) - (dates.current[b] || 0)); setIds(currentIds.current); } };
    window.addEventListener("storage", synchronize);
    return () => { active = false; clearTimeout(timeout); controller.abort(); window.removeEventListener("storage", synchronize); };
  }, [update, t]);

  const toggle = useCallback(async (slug: string) => {
    if (loading || pending.current.has(slug)) return;
    const next = !currentIds.current.includes(slug);
    if (next) dates.current[slug] = Date.now();
    update(next ? [...currentIds.current, slug] : currentIds.current.filter(item => item !== slug));
    setError(""); changedWhileLoading.current.set(slug, next);
    if (!remote.current) return;
    pending.current.add(slug); setBusy([...pending.current]);
    try {
      const response = next
        ? await fetch("/api/favorites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetType, targetId: slug }), signal: AbortSignal.timeout(8000) })
        : await fetch(`/api/favorites?targetType=${targetType}&targetId=${encodeURIComponent(slug)}`, { method: "DELETE", signal: AbortSignal.timeout(8000) });
      if (response.ok) remote.current = true;
      else if (response.status === 401) remote.current = false;
      else if (remote.current && response.status !== 401) {
        if (!next) update(Array.from(new Set([...currentIds.current, slug])));
        setError(t("saveError"));
      }
    } catch { if (remote.current) { if (!next) update(Array.from(new Set([...currentIds.current, slug]))); setError(t("saveError")); } }
    finally { pending.current.delete(slug); setBusy([...pending.current]); }
  }, [loading, update, t]);

  return <Context.Provider value={{ ids, loading, busy, error, toggle }}>{children}</Context.Provider>;
}
export function useVibeFavorites() { const value = useContext(Context); if (!value) throw new Error("VibeFavoritesProvider is required"); return value; }
export function FavoriteButton({ slug, compact = false, official = false }: { slug: string; compact?: boolean; official?: boolean }) {
  const { ids, loading, busy, error, toggle } = useVibeFavorites(); const t = useTranslations("vibehub"); const saved = ids.includes(slug);
  return <button type="button" onClick={() => void toggle(slug)} disabled={loading || busy.includes(slug)} aria-pressed={saved} aria-label={t(saved ? "remove" : "save")} title={error || t(saved ? "remove" : "save")} className={official ? "favorite-button" : compact ? "vh-icon-button" : "vh-small-button"}>{compact || official ? <Star size={18} fill={saved ? "currentColor" : "none"} /> : t(saved ? "savedTerm" : "save")}</button>;
}