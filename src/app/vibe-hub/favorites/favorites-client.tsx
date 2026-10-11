"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useVibeLanguage } from "../use-vibe-language";
import { useVibeFavorites, FavoriteButton } from "../favorite-button";
import terms from "../terms.json";
export default function FavoritesPage() {
  const { ids, loading, error } = useVibeFavorites(); const t = useTranslations("vibehub"); const lang = useVibeLanguage();
  const [order, setOrder] = useState("category"); const en = lang === "en";
  const saved = terms.filter(term => ids.includes(term.slug));
  const groups = order === "recent" ? [{ title: t("recentlySaved"), entries: [...saved].sort((a,b) => ids.indexOf(b.slug) - ids.indexOf(a.slug)) }]
    : [...new Set(saved.map(term => en ? term.category : term.zhCategory))].map(title => ({title, entries: saved.filter(term => (en ? term.category : term.zhCategory) === title)}));
  return <main className="vh-page"><header className="vh-feature-heading"><p>{t("yourLibrary")}</p><h1>{t("savedTitle")}</h1><p>{t("savedBody")}</p></header>
    {error && <p role="alert">{error}</p>}
    {saved.length === 0 ? <div className="vh-empty mt-8">{t(loading ? "loading" : "savedEmpty")}<br /><Link className="vh-text-button" href={`/vibe-hub?lang=${lang}`}>{t("back")}</Link></div> : <>
      <div className="vh-saved-controls"><p aria-live="polite">{t("count", {count: saved.length})}</p><label>{t("view")}<select className="vh-field" value={order} onChange={event => setOrder(event.target.value)}><option value="category">{t("byCategory")}</option><option value="recent">{t("recentlySaved")}</option></select></label></div>
      {groups.map(group => <section key={group.title} className="vh-saved-group"><div className="vh-group-heading"><h2>{group.title}</h2><span>{group.entries.length}</span></div><div className="vh-entry-list">{group.entries.map(term => <article key={term.slug} className="vh-entry-row"><Link href={`/vibe-hub/${term.slug}?lang=${lang}`}><h3>{en ? term.name : term.zhName}</h3><p>{en ? term.quote : term.zhQuote}</p></Link><FavoriteButton slug={term.slug} /></article>)}</div></section>)}
    </>}
  </main>;
}
