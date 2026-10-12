"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useVibeLanguage } from "../use-vibe-language";
import { useVibeFavorites, FavoriteButton } from "../favorite-button";
import terms from "../terms.json";
export default function FavoritesPage() {
  const { ids, loading, error, syncing, accountId, retry } = useVibeFavorites(); const t = useTranslations("vibehub"); const lang = useVibeLanguage();
  const [order, setOrder] = useState("category"); const en = lang === "en";
  const saved = terms.filter(term => ids.includes(term.slug));
  const groups = order === "recent" ? [{ title: t("recentlySaved"), entries: [...saved].sort((a,b) => ids.indexOf(b.slug) - ids.indexOf(a.slug)) }]
    : [...new Set(saved.map(term => en ? term.category : term.zhCategory))].map(title => ({title, entries: saved.filter(term => (en ? term.category : term.zhCategory) === title)}));
  return <main className="vh-page"><header className="vh-feature-heading"><h1>{t("savedTitle")}</h1></header>
    <p role="status" className="mt-4 text-sm">{t(loading ? "loading" : syncing ? "syncingFavorites" : error ? "saveError" : accountId ? "syncedToAccount" : "storedOnDevice")}</p>
    {error && <button type="button" className="vh-text-button" onClick={retry}>{t("retrySync")}</button>}
    {!loading && !accountId && <Link className="vh-text-button" href={`/login?callbackUrl=${encodeURIComponent(`/vibe-hub/favorites?lang=${lang}`)}`}>{t("signInToSync")}</Link>}
    {saved.length === 0 ? <div className="vh-empty mt-8">{t(loading ? "loading" : "savedEmpty")}<br /><Link className="vh-text-button" href={`/vibe-hub?lang=${lang}`}>{t("savedBrowseAction")}</Link></div> : <>
      <div className="vh-saved-controls"><p aria-live="polite">{t("count", {count: saved.length})}</p><label>{t("view")}<select className="vh-field" value={order} onChange={event => setOrder(event.target.value)}><option value="category">{t("byCategory")}</option><option value="recent">{t("recentlySaved")}</option></select></label></div>
      {groups.map(group => <section key={group.title} className="vh-saved-group"><div className="vh-group-heading"><h2>{group.title}</h2><span>{group.entries.length}</span></div><div className="vh-entry-list">{group.entries.map(term => <article key={term.slug} className="vh-entry-row"><Link href={`/vibe-hub/${term.slug}?lang=${lang}`}><h3>{en ? term.name : term.zhName}</h3><p>{en ? term.quote : term.zhQuote}</p></Link><FavoriteButton slug={term.slug} /></article>)}</div></section>)}
    </>}
  </main>;
}
