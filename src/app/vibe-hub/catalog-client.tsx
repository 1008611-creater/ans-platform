"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useVibeLanguage } from "./use-vibe-language";
import { FavoriteButton } from "./favorite-button";
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
    const hay = query.trim().toLowerCase();
    const matches = data.entries.filter((entry) => `${entry.en.name} ${entry.zh.name} ${entry.en.quote} ${entry.zh.quote}`.toLowerCase().includes(hay));
    return [{ title: t("search"), slugs: matches.map((entry) => entry.slug) }];
  }, [data, topic, query, lang, t]);
  const bySlug = useMemo(() => new Map(data.entries.map((entry) => [entry.slug, entry])), [data]);
  const count = groups.reduce((sum, group) => sum + group.slugs.length, 0);
  return <main className="vh-catalog">
    <nav className="vh-topic-row" aria-label={t("topics")}>
      {data.topics.map((item) => <Link key={item.slug} href={`/vibe-hub/topics/${item.slug}?lang=${lang}`} className={topic.slug === item.slug && !query ? "active" : ""}>{t(item.slug)}<small>{item[lang].groups.reduce((sum, group) => sum + group.slugs.length, 0)}</small></Link>)}
      <Link href={`/vibe-hub/favorites?lang=${lang}`}>{t("saved")}</Link>
    </nav>
    <div className="vh-catalog-layout">
      <nav className="vh-category-nav" aria-label={t("topics")}>{groups.map((group, index) => <a key={group.title} href={`#group-${index}`}>{group.title}</a>)}<Link href={`/vibe-hub/journeys?lang=${lang}`}>{t("journeys")} ↗</Link></nav>
      <div>
        <h1>{query ? `${t("search")} · ${t("count", { count })}` : topic[lang].title}</h1>
        {query && <div className="mb-6 flex gap-3"><input className="vh-field" aria-label={t("search")} value={query} onChange={(event) => setQuery(event.target.value)} /><button type="button" className="vh-text-button" onClick={() => setQuery("")}>{t("reset")}</button></div>}
        {groups.map((group, index) => <section className="vh-catalog-group" id={`group-${index}`} key={group.title}>
          <div className="vh-group-heading"><h2>{group.title}</h2><span>{t("count", { count: group.slugs.length })}</span></div>
          <div className="vh-cards">{group.slugs.map((slug) => {
            const entry = bySlug.get(slug); if (!entry) return null; const text = entry[lang];
            return <article className="vh-term-card" key={slug}>
              <div className="vh-card-title"><h3>{text.name}</h3>{lang === "zh" && text.name !== entry.en.name && <small>{entry.en.name}</small>}</div>
              <p className="vh-card-quote">{text.quote}</p>
              <div dangerouslySetInnerHTML={{ __html: text.preview }} />
              <Link className="vh-card-overlay" href={`/vibe-hub/${slug}?lang=${lang}`} aria-label={text.name} />
              <span className="vh-card-star"><FavoriteButton slug={slug} compact /></span>
            </article>;
          })}</div>
        </section>)}
        {count === 0 && <p className="vh-empty">{t("empty")}</p>}
        <TermResolver />
      </div>
    </div>
  </main>;
}
