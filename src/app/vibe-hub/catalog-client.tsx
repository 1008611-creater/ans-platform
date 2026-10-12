"use client";
import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useVibeLanguage } from "./use-vibe-language";
import { CatalogPreview, TechnologyIcon } from "./official/catalog-preview";
import { FavoriteButton, useVibeFavorites } from "./favorite-button";
import { searchKnowledgeTerms } from "./search-terms";
import { AnsPracticeLinks } from "./ans-practice-links";
type EntryText = { name: string; quote: string; category: string; preview: string };
type Entry = { slug: string; macroCategory: string; en: EntryText; zh: EntryText };
type TopicText = { title: string; groups: { title: string; slugs: string[] }[] };
export type CatalogData = { topics: { slug: string; en: TopicText; zh: TopicText }[]; entries: Entry[] };
const examples = [
  { query: "鼠标提示", label: "searchExampleTooltip" },
  { query: "侧滑面板", label: "searchExampleDrawer" },
  { query: "滚动吸顶", label: "searchExampleSticky" },
] as const;
export function Catalog({ data, initialTopic, initialQuery = "" }: { data: CatalogData; initialTopic?: string; initialQuery?: string }) {
  const lang = useVibeLanguage(); const t = useTranslations("vibehub");
  const query = initialQuery.trim();
  const topic = data.topics.find(item => item.slug === initialTopic) || data.topics[0];
  const searchHref = (area?: string, value = query) => `/vibe-hub${area ? `/topics/${area}` : ""}?${new URLSearchParams({ lang, ...(value ? { q: value } : {}) })}`;
  const groups = useMemo(() => {
    const value = initialQuery.trim();
    if (!value) return topic[lang].groups;
    const available = new Set((initialTopic ? topic[lang].groups.flatMap(group => group.slugs) : data.entries.map(entry => entry.slug)));
    const matches = searchKnowledgeTerms(value).filter(hit => available.has(hit.entry.id));
    return [{ title: t("terms"), slugs: matches.map(hit => hit.entry.id) }];
  }, [data, topic, initialQuery, lang, initialTopic, t]);
  const bySlug = useMemo(() => new Map(data.entries.map(entry => [entry.slug, entry])), [data]);
  const [activeGroup, setActiveGroup] = useState<number | null>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => { frame = 0; let active: number | null = null; groups.forEach((_, index) => { const top = document.getElementById(`group-${index}`)?.getBoundingClientRect().top; if (top !== undefined && top <= 160) active = index; }); setActiveGroup(active); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    schedule(); window.addEventListener("scroll", schedule, { passive: true }); window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [groups]);
  const count = groups.reduce((sum, group) => sum + group.slugs.length, 0);
  const { ids } = useVibeFavorites();
  return <main className="catalog-page catalog-directory-page"><div className="catalog-layout catalog-directory-layout">
    <section className="catalog-finder" aria-label={t("topics")}><div className="catalog-finder-row"><nav className="catalog-filter-list" aria-label={t("topics")}>
      {query && <Link className="catalog-filter-chip" href={searchHref()} aria-current={!initialTopic ? "page" : undefined}>{t("searchAll")}</Link>}
      {data.topics.map(item => <Link key={item.slug} className="catalog-filter-chip" aria-current={topic.slug === item.slug && (!query || initialTopic) ? "page" : undefined} href={searchHref(item.slug)}>{t(item.slug)}{!query && <span>{item[lang].groups.reduce((sum, group) => sum + group.slugs.length, 0)}</span>}</Link>)}
      <Link className="catalog-filter-chip" href={`/vibe-hub/favorites?lang=${lang}`}>{t("saved")}<span>{ids.length}</span></Link>
    </nav></div></section>
    <aside className="catalog-sidebar"><nav className="cat-chips" aria-label={t("onThisPage")}>{!query && groups.map((group, index) => <button type="button" className="catalog-filter-chip" key={group.title} aria-pressed={activeGroup === index} aria-current={activeGroup === index ? "location" : undefined} onClick={() => { const target = document.getElementById(`group-${index}`); target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }); target?.focus({ preventScroll: true }); }}>{group.title}</button>)}</nav></aside>
    <div className="grid-wrap">
      <header className="catalog-heading"><h1>{query ? t("searchResults") : t("terms")}</h1>{!query && <p className="ans-atlas-current">{t(topic.slug)}<span>{t("count", { count })}</span></p>}{query && <div className="ans-search-summary"><p role="status">{t("searchCount", { count, query })}</p><Link className="vh-text-button" href={searchHref(initialTopic, "")}>{t("reset")}</Link></div>}</header>
      {query && <AnsPracticeLinks query={query} />}
      {groups.filter(group => group.slugs.length > 0).map((group, index) => <section className="cat-section" id={`group-${index}`} tabIndex={-1} key={group.title}>
        {!query && <h2 className="cat-title">{group.title}<span>{t("count", { count: group.slugs.length })}</span></h2>}
        <div className={`grid${group.title === "官网区块" || group.title === "Website Sections" ? " grid-site-sections" : group.title === "设计风格" || group.title === "Design Styles" ? " grid-style" : ""}`}>{group.slugs.map(slug => {
          const entry = bySlug.get(slug); if (!entry) return null; const text = entry[lang];
          return <article className="card vh-official-card" data-id={slug} key={slug}>
            <div className="card-head"><Link className="card-title-group card-title-link" href={`/vibe-hub/${slug}?lang=${lang}`} aria-label={text.name}><TechnologyIcon entry={{ id: slug }} /><h3>{text.name}{lang === "zh" && text.name !== entry.en.name && <span>{entry.en.name}</span>}</h3></Link><FavoriteButton slug={slug} official /></div>
            <div className="card-tagline card-quote">{text.quote}</div>
            <CatalogPreview entry={{ id: slug, cat: entry.zh.category }} html={text.preview} />
            <Link className="vh-official-card-overlay" href={`/vibe-hub/${slug}?lang=${lang}`} aria-hidden="true" tabIndex={-1} />
          </article>;
        })}</div>
      </section>)}
      {count === 0 && <section className="ans-search-empty"><p>{t(initialTopic ? "searchNoMatchInArea" : "searchNoMatch")}</p>{initialTopic && <Link className="ans-editorial-link" href={searchHref()}>{t("searchAll")} ↗</Link>}<nav aria-label={t("searchExamples")}>{examples.map(item => <Link className="catalog-filter-chip" key={item.label} href={searchHref(undefined, lang === "zh" ? item.query : t(item.label))}>{t(item.label)}</Link>)}</nav><Link className="ans-editorial-link" href={`/vibe-hub/vibehub-skill?scenario=custom&lang=${lang}`}>{t("briefAction")} ↗</Link></section>}
    </div>
  </div></main>;
}
