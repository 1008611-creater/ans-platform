"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import terms from "@/data/vibehub/terms.json";

const targetType = "VIBEHUB_TERM";
const validIds = new Set(terms.map(term => term.slug));
type Operation = { saved: boolean; at: number; token: string };
type StoredFavorites = { ids: string[]; dates: Record<string, number>; pending: Record<string, Operation> };
type FavoriteState = { ids: string[]; loading: boolean; busy: string[]; error: string; syncing: boolean; accountId: string | null; retry: () => void; toggle: (slug: string) => Promise<void> };
const Context = createContext<FavoriteState | null>(null);
const storageKey = (accountId: string | null) => `vibehub:favorites:v2:${accountId ? `account:${accountId}` : "guest"}`;
function readStored(accountId: string | null): StoredFavorites {
  const empty: StoredFavorites = { ids: [], dates: {}, pending: {} };
  try {
    const raw = localStorage.getItem(storageKey(accountId));
    if (!raw && accountId === null) {
      const legacy: unknown = JSON.parse(localStorage.getItem("vibehub:favorites") || "[]");
      empty.ids = Array.isArray(legacy) ? [...new Set(legacy.filter((id): id is string => typeof id === "string" && validIds.has(id)))] : [];
      const dates: unknown = JSON.parse(localStorage.getItem("vibehub:favorite-dates") || "{}");
      if (dates && typeof dates === "object") for (const [id, at] of Object.entries(dates)) if (validIds.has(id) && typeof at === "number" && Number.isFinite(at)) empty.dates[id] = at;
      return empty;
    }
    const value: unknown = JSON.parse(raw || "{}");
    if (!value || typeof value !== "object") return empty;
    const data = value as Partial<StoredFavorites>;
    empty.ids = Array.isArray(data.ids) ? [...new Set(data.ids.filter(id => typeof id === "string" && validIds.has(id)))] : [];
    if (data.dates && typeof data.dates === "object") for (const [id, at] of Object.entries(data.dates)) if (validIds.has(id) && typeof at === "number" && Number.isFinite(at)) empty.dates[id] = at;
    if (data.pending && typeof data.pending === "object") for (const [id, op] of Object.entries(data.pending)) if (validIds.has(id) && op && typeof op.saved === "boolean" && typeof op.at === "number" && Number.isFinite(op.at) && typeof op.token === "string") empty.pending[id] = op;
  } catch { /* Storage may be unavailable; current-session favorites still work. */ }
  return empty;
}
function persist(accountId: string | null, value: StoredFavorites) {
  try { localStorage.setItem(storageKey(accountId), JSON.stringify(value)); } catch { /* Keep the current-session copy. */ }
}
function ordered(value: StoredFavorites) {
  value.ids = [...new Set(value.ids)].sort((a, b) => (value.dates[a] || 0) - (value.dates[b] || 0));
  return value;
}
function applyPending(value: StoredFavorites) {
  const ids = new Set(value.ids);
  for (const [id, op] of Object.entries(value.pending)) {
    if (op.saved) { ids.add(id); value.dates[id] = op.at; } else ids.delete(id);
  }
  value.ids = [...ids]; return ordered(value);
}
function FavoriteStore({ children, accountId, sessionLoading }: { children: React.ReactNode; accountId: string | null; sessionLoading: boolean }) {
  const t = useTranslations("vibehub");
  const [state, setState] = useState<StoredFavorites>({ ids: [], dates: {}, pending: {} });
  const current = useRef(state); const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false); const [error, setError] = useState("");
  const synchronize = useRef<() => void>(() => {});
  const update = useCallback((value: StoredFavorites) => { current.current = ordered(value); setState({ ...current.current }); persist(accountId, current.current); }, [accountId]);
  useEffect(() => {
    if (sessionLoading) return;
    let active = true; let running = false; let repeat = false;
    const controller = new AbortController(); const guestImports = new Set<string>();
    update(applyPending(readStored(accountId))); setLoading(false);
    const consumeGuest = (id: string) => {
      const guest = readStored(null); guest.ids = guest.ids.filter(item => item !== id); delete guest.dates[id]; persist(null, guest);
    };
    const request = (url: string, options: RequestInit = {}) => fetch(url, { ...options, cache: "no-store", headers: { "x-vibehub-account-id": accountId || "", ...options.headers }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
    const refresh = async () => {
      if (!accountId || !active) return;
      if (running) { repeat = true; return; }
      running = true; setSyncing(true); setError("");
      try {
        const response = await request(`/api/favorites?targetType=${targetType}&take=360`);
        if (!response.ok) throw new Error("sync");
        const payload = await response.json(); if (!active) return;
        if (!Array.isArray(payload?.data?.favorites)) throw new Error("sync");
        const remoteIds: string[] = []; const dates: Record<string, number> = {};
        for (const item of payload.data.favorites) {
          if (item?.targetType !== targetType || !validIds.has(item.targetId)) continue;
          remoteIds.push(item.targetId); const at = Date.parse(item.favoritedAt);
          if (Number.isFinite(at)) dates[item.targetId] = at;
        }
        // Import only guest choices. Account caches never resurrect server deletions.
        const pending = { ...current.current.pending }; const guest = readStored(null);
        for (const id of guest.ids) {
          if (remoteIds.includes(id)) { consumeGuest(id); continue; }
          if (!pending[id]) pending[id] = { saved: true, at: guest.dates[id] || Date.now(), token: crypto.randomUUID() };
          if (pending[id].saved) guestImports.add(id); else consumeGuest(id);
        }
        update(applyPending({ ids: remoteIds.reverse(), dates, pending }));
        const operations = Object.entries(current.current.pending); let index = 0;
        const outcomes = await Promise.allSettled(Array.from({ length: Math.min(4, operations.length) }, async () => {
          while (index < operations.length && active) {
            const [id, op] = operations[index++];
            const result = op.saved
              ? await request("/api/favorites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetType, targetId: id }) })
              : await request(`/api/favorites?targetType=${targetType}&targetId=${encodeURIComponent(id)}`, { method: "DELETE" });
            if (!active) return;
            if (!result.ok) { setError(t("saveError")); continue; }
            if (current.current.pending[id]?.token === op.token) {
              const next = { ...current.current, pending: { ...current.current.pending } }; delete next.pending[id]; update(next);
            }
            if (op.saved && guestImports.has(id)) { consumeGuest(id); guestImports.delete(id); }
          }
        }));
        if (active && outcomes.some(result => result.status === "rejected")) setError(t("saveError"));
      } catch { if (active) setError(t("saveError")); }
      finally {
        running = false;
        if (active) { setSyncing(false); if (repeat) { repeat = false; void refresh(); } }
      }
    };
    synchronize.current = () => { void refresh(); };
    const storage = (event: StorageEvent) => {
      if (event.key === storageKey(accountId) || event.key === null) { update(applyPending(readStored(accountId))); void refresh(); }
    };
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("storage", storage); window.addEventListener("online", synchronize.current); window.addEventListener("focus", synchronize.current); document.addEventListener("visibilitychange", visible);
    void refresh();
    return () => {
      active = false; controller.abort(); window.removeEventListener("storage", storage); window.removeEventListener("online", synchronize.current); window.removeEventListener("focus", synchronize.current); document.removeEventListener("visibilitychange", visible); synchronize.current = () => {};
    };
  }, [accountId, sessionLoading, update, t]);
  const toggle = useCallback(async (slug: string) => {
    if (loading || !validIds.has(slug)) return;
    const saved = !current.current.ids.includes(slug); const at = Date.now();
    const value = { ids: saved ? [...current.current.ids, slug] : current.current.ids.filter(id => id !== slug), dates: { ...current.current.dates, [slug]: at }, pending: { ...current.current.pending } };
    if (accountId) value.pending[slug] = { saved, at, token: crypto.randomUUID() };
    update(value); if (accountId) synchronize.current();
  }, [accountId, loading, update]);
  return <Context.Provider value={{ ids: state.ids, loading, busy: [], error, syncing, accountId, retry: () => synchronize.current(), toggle }}>{children}</Context.Provider>;
}
export function VibeFavoritesProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession(); const accountId = status === "authenticated" ? session.user?.id || null : null;
  return <FavoriteStore key={status === "loading" ? "loading" : accountId || "guest"} accountId={accountId} sessionLoading={status === "loading"}>{children}</FavoriteStore>;
}
export function useVibeFavorites() { const value = useContext(Context); if (!value) throw new Error("VibeFavoritesProvider is required"); return value; }
export function FavoriteButton({ slug, compact = false, official = false }: { slug: string; compact?: boolean; official?: boolean }) {
  const { ids, loading, busy, error, toggle } = useVibeFavorites(); const t = useTranslations("vibehub"); const saved = ids.includes(slug);
  return <button type="button" onClick={() => void toggle(slug)} disabled={loading || busy.includes(slug)} aria-pressed={saved} aria-label={t(saved ? "remove" : "save")} title={error || t(saved ? "remove" : "save")} className={official ? "favorite-button" : compact ? "vh-icon-button" : "vh-small-button"}>{compact || official ? <Star size={18} fill={saved ? "currentColor" : "none"} /> : t(saved ? "savedTerm" : "save")}</button>;
}