"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";
import { useVibeLanguage } from "./use-vibe-language";
type Match = { slug: string; name: string; description?: string; category?: string };
export function TermResolver() {
  const [query, setQuery] = useState(""); const [items, setItems] = useState<Match[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [searched, setSearched] = useState(false);
  const request = useRef<AbortController | null>(null); const lang = useVibeLanguage(); const t = useTranslations("vibehub");
  useEffect(() => () => request.current?.abort(), []);
  async function resolve() {
    if (!query.trim()) return; request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(""); setSearched(false);
    try {
      const response = await fetch(`/api/vibe-hub/resolve?q=${encodeURIComponent(query)}&locale=${lang}`, { signal: controller.signal });
      if (!response.ok) throw new Error("Request failed"); const payload = await response.json(); if (controller.signal.aborted) return; setItems(payload.items || []); setSearched(true);
    } catch (failure) { if (!(failure instanceof DOMException && failure.name === "AbortError")) setError(t("resolveError")); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  return <section className="vh-resolver"><h2>{t("resolveHeading")}</h2><form onSubmit={(event) => { event.preventDefault(); void resolve(); }}><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t("resolveHeading")} placeholder={t("resolvePlaceholder")} maxLength={500} /><button type="submit" className="vh-primary" disabled={loading || !query.trim()}>{t(loading ? "resolving" : "resolve")}</button></form>
    <div aria-live="polite">{error && <p role="alert">{error}</p>}{searched && !items.length && <p>{t("resolveEmpty")}</p>}{items.map((item) => <Link key={item.slug} href={`/vibe-hub/${item.slug}?lang=${lang}`} className="vh-result"><strong>{item.name}</strong><p>{item.description}</p></Link>)}</div>
  </section>;
}
