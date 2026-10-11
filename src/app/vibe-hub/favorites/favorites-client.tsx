"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useVibeLanguage } from "../use-vibe-language";
import { useVibeFavorites, FavoriteButton } from "../favorite-button";
import terms from "../terms.json";
export default function FavoritesPage() {
  const { ids, loading, error } = useVibeFavorites(); const t = useTranslations("vibehub"); const lang = useVibeLanguage();
  const saved = terms.filter((term) => ids.includes(term.slug));
  return <main className="vh-page"><header className="vh-feature-heading"><p>{t("yourLibrary")}</p><h1>{t("savedTitle")}</h1><p>{t("savedBody")}</p></header>
    {error && <p role="alert">{error}</p>}{saved.length === 0 ? <div className="vh-empty mt-8">{t(loading ? "loading" : "savedEmpty")}<br /><Link className="vh-text-button" href={`/vibe-hub?lang=${lang}`}>{t("back")}</Link></div> : <div className="vh-entry-list">{saved.map((term) => <article key={term.slug} className="vh-entry-row"><Link href={`/vibe-hub/${term.slug}?lang=${lang}`}><h2>{lang === "zh" ? term.zhName : term.name}</h2><p>{lang === "zh" ? term.zhQuote : term.quote}</p></Link><FavoriteButton slug={term.slug} /></article>)}</div>}
  </main>;
}
