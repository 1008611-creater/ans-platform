"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

const key = "vibehub:favorites";
const targetType = "VIBEHUB_TERM";
type FavoriteState = { ids: string[]; loading: boolean; busy: string[]; error: string; toggle: (slug: string) => Promise<void> };
const Context = createContext<FavoriteState | null>(null);
function readLocal(): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? Array.from(new Set(value.filter((item): item is string => typeof item === "string"))) : []; }
  catch { return []; }
}
function writeLocal(ids: string[]) { try { localStorage.setItem(key, JSON.stringify(ids)); } catch { /* In-memory favorites remain available. */ } }

export function VibeFavoritesProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]); const currentIds = useRef<string[]>([]);
  const [loading, setLoading] = useState(true); const remote = useRef(false);
  const [busy, setBusy] = useState<string[]>([]); const pending = useRef(new Set<string>());
  const [error, setError] = useState(""); const t = useTranslations("vibehub");
  const update = useCallback((value: string[]) => { currentIds.current = value; setIds(value); writeLocal(value); }, []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController(); update(readLocal());
    void (async () => {
      try {
        const response = await fetch(`/api/favorites?targetType=${targetType}&take=360`, { cache: "no-store", signal: controller.signal });
        if (!response.ok || !active) return;
        const payload = await response.json(); if (!active) return;
        const favorites: { targetType: string; targetId: string }[] = payload?.data?.favorites || [];
        const remoteIds = favorites.filter(item => item.targetType === targetType).map(item => item.targetId);
        const local = currentIds.current; const missing = local.filter(slug => !remoteIds.includes(slug));
        update(Array.from(new Set([...local, ...remoteIds]))); remote.current = true;
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
      finally { if (active) setLoading(false); }
    })();
    const synchronize = (event: StorageEvent) => { if (event.key === key) { currentIds.current = readLocal(); setIds(currentIds.current); } };
    window.addEventListener("storage", synchronize);
    return () => { active = false; controller.abort(); window.removeEventListener("storage", synchronize); };
  }, [update, t]);

  const toggle = useCallback(async (slug: string) => {
    if (loading || pending.current.has(slug)) return;
    const next = !currentIds.current.includes(slug);
    update(next ? [...currentIds.current, slug] : currentIds.current.filter(item => item !== slug));
    setError(""); pending.current.add(slug); setBusy([...pending.current]);
    try {
      const response = next
        ? await fetch("/api/favorites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetType, targetId: slug }) })
        : await fetch(`/api/favorites?targetType=${targetType}&targetId=${encodeURIComponent(slug)}`, { method: "DELETE" });
      if (response.ok) remote.current = true;
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
export function FavoriteButton({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const { ids, loading, busy, error, toggle } = useVibeFavorites(); const t = useTranslations("vibehub"); const saved = ids.includes(slug);
  return <button type="button" onClick={() => void toggle(slug)} disabled={loading || busy.includes(slug)} aria-pressed={saved} aria-label={t(saved ? "remove" : "save")} title={error || t(saved ? "remove" : "save")} className={compact ? "vh-icon-button" : "vh-small-button"}>{compact ? <Star size={18} fill={saved ? "currentColor" : "none"} /> : t(saved ? "savedTerm" : "save")}</button>;
}