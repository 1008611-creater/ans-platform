"use client";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useVibeLanguage } from "./use-vibe-language";
import { CatalogPreview, TechnologyIcon } from "./official/catalog-preview";
import { FavoriteButton, useVibeFavorites } from "./favorite-button";
import { searchTerms } from "./official/search";
import { AnsPracticeLinks } from "./ans-practice-links";
import { TermResolver } from "./term-resolver";

type EntryText = { name: string; quote: string; category: string; preview: string };
type Entry = { slug: string; macroCategory: string; en: EntryText; zh: EntryText };
type TopicText = { title: string; groups: { title: string; slugs: string[] }[] };
export type CatalogData = { topics: { slug: string; en: TopicText; zh: TopicText }[]; entries: Entry[] };

export function Catalog({ data, initialTopic = "frontend", initialQuery = "" }: { data: CatalogData; initialTopic?: string; initialQuery?: string }) {
  const lang = useVibeLanguage(); const t = useTranslations("vibehub");
  const [query, setQuery] = useState(initialQuery);
  const topic = data.topics.find((item) => item.slug === initialTopic) || data.topics[0];
  const groups = useMemo(() => {
    if (!query.trim()) return topic[lang].groups;
    const available = new Set(data.entries.map(entry => entry.slug));
    const matches = searchTerms({ query }).filter(hit => available.has(hit.entry.id));
    return [{ title: t("search"), slugs: matches.map(hit => hit.entry.id) }];
  }, [data, topic, query, lang, t]);
  const bySlug = useMemo(() => new Map(data.entries.map((entry) => [entry.slug, entry])), [data]);
  const [activeGroup, setActiveGroup] = useState<number | null>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => { frame = 0; let active: number | null = null; groups.forEach((_,index) => { const top = document.getElementById(`group-${index}`)?.getBoundingClientRect().top; if (top !== undefined && top <= 160) active = index; }); setActiveGroup(active); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    schedule(); window.addEventListener("scroll",schedule,{passive:true}); window.addEventListener("resize",schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll",schedule); window.removeEventListener("resize",schedule); };
  }, [groups]);
  const count = groups.reduce((sum, group) => sum + group.slugs.length, 0);
  const router = useRouter(); const { ids } = useVibeFavorites();
  return <main className="catalog-page catalog-directory-page"><div className="catalog-layout catalog-directory-layout">
    <section className="catalog-finder" aria-label={t("topics")}><div className="catalog-finder-row"><div className="catalog-filter-list">
      {data.topics.map(item => <button key={item.slug} type="button" className="catalog-filter-chip" aria-pressed={topic.slug === item.slug && !query} onClick={() => router.push(`/vibe-hub/topics/${item.slug}?lang=${lang}`)}>{t(item.slug)}<span>{item[lang].groups.reduce((sum,group) => sum + group.slugs.length,0)}</span></button>)}
      <button type="button" className="catalog-filter-chip" onClick={() => router.push(`/vibe-hub/favorites?lang=${lang}`)}>{t("saved")}<span>{ids.length}</span></button>
    </div></div></section>
    <aside className="catalog-sidebar"><nav className="cat-chips" aria-label={t("topics")}>{groups.map((group,index) => <button type="button" className="catalog-filter-chip" key={group.title} aria-pressed={activeGroup === index} aria-current={activeGroup === index ? "location" : undefined} onClick={() => document.getElementById(`group-${index}`)?.scrollIntoView({behavior:"smooth",block:"start"})}>{group.title}</button>)}<Link className="catalog-filter-chip" href={`/vibe-hub/journeys?lang=${lang}`}>{t("journeys")} ↗</Link></nav></aside>
    <div className="grid-wrap">
      <header className="catalog-heading"><h1>{query ? `${t("search")} · ${t("count", {count})}` : topic[lang].title}</h1></header>
      {query && <div className="mb-6 flex gap-3"><input className="vh-field" aria-label={t("search")} value={query} onChange={event => setQuery(event.target.value)} /><button type="button" className="vh-text-button" onClick={() => setQuery("")}>{t("reset")}</button></div>}
      {query.trim() && <AnsPracticeLinks query={query} />}
      {groups.map((group,index) => <section className="cat-section" id={`group-${index}`} key={group.title}>
        <h2 className="cat-title">{group.title}<span>{t("count", {count:group.slugs.length})}</span></h2>
        <div className={`grid${group.title === "官网区块" || group.title === "Website Sections" ? " grid-site-sections" : group.title === "设计风格" || group.title === "Design Styles" ? " grid-style" : ""}`}>{group.slugs.map(slug => {
          const entry = bySlug.get(slug); if (!entry) return null; const text = entry[lang];
          return <article className="card vh-official-card" data-id={slug} key={slug}>
            <div className="card-head"><Link className="card-title-group card-title-link" href={`/vibe-hub/${slug}?lang=${lang}`} aria-label={text.name}><TechnologyIcon entry={{id:slug}} /><h3>{text.name}{lang === "zh" && text.name !== entry.en.name && <span>{entry.en.name}</span>}</h3></Link><FavoriteButton slug={slug} official /></div>
            <div className="card-tagline card-quote">{text.quote}</div>
            <CatalogPreview entry={{id:slug,cat:entry.zh.category}} html={text.preview} />
            <Link className="vh-official-card-overlay" href={`/vibe-hub/${slug}?lang=${lang}`} aria-hidden="true" tabIndex={-1} />
          </article>;
        })}</div>
      </section>)}
      {count === 0 && <p className="vh-empty">{t("empty")}</p>}
      <TermResolver />
    </div>
  </div></main>;
}
