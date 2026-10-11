"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useVibeLanguage } from "../use-vibe-language";
import { CopyTermButton } from "../copy-term-button";
import source from "@/data/vibehub/anti-ai-details.json";
type Pattern = { id: string; category: string; title: string; name: string; request: string; quote: string; better: string; tagline: string; why: string; examples: string[]; normal: string; avoid: string; prompt: string; related: string[]; preview: string };
export default function AntiAi() {
  const lang = useVibeLanguage(); const [selected, setSelected] = useState(""); const data = source as unknown as { entries: Pattern[]; english: Record<string, Partial<Pattern>>; labels: Record<string, Record<string, string>>; categories: Record<string, Record<string, { title: string; description: string }>> };
  useEffect(() => { const update = () => setSelected(window.location.hash.replace(/^#aif-/, "")); update(); window.addEventListener("hashchange", update); return () => window.removeEventListener("hashchange", update); }, []);
  const labels = data.labels[lang]; const entries = data.entries.filter((item) => lang === "zh" || item.category !== "zh");
  const current = entries.find((item) => item.id === selected);
  const text = current ? { ...current, ...(lang === "en" ? data.english[current.id] : {}), title: lang === "en" ? current.name : current.title } : null;
  return <main className="vh-page">
    {text ? <>
      <div className="vh-detail-toolbar"><a href="#" onClick={() => setSelected("")}>← {labels.back}</a><CopyTermButton text={`# ${text.title}\n\n${text.why}\n\n${text.avoid}\n\n${text.prompt}`} markdown /></div>
      <header className="vh-feature-heading"><h1>{text.title}</h1><p>{text.tagline}</p></header>
      <blockquote className="vh-pattern-request">{labels.quote}：{text.request}</blockquote>
      <div className="vh-pattern-comparison"><section><h2>{labels.before}</h2><blockquote>{text.quote}</blockquote></section><section><h2>{labels.after}</h2><blockquote>{text.better}</blockquote></section></div>
      <div className="vh-pattern-sections"><section><h2>{labels.why}</h2><p>{text.why}</p></section><section><h2>{labels.examples}</h2><ul>{text.examples.map((example) => <li key={example}>{example}</li>)}</ul></section><section><h2>{labels.boundaryTitle}</h2><p>{text.normal}</p></section><section><h2>{labels.avoid}</h2><p>{text.avoid}</p></section><section><h2>{labels.prompt}</h2><p>{text.prompt}</p><CopyTermButton text={text.prompt} /></section><section><h2>{labels.related}</h2><div className="vh-topic-row">{text.related.map((slug) => <Link key={slug} href={`/vibe-hub/${slug}?lang=${lang}`}>{slug}</Link>)}</div></section></div>
      <nav className="vh-detail-nav"><a href={`#aif-${entries[(entries.indexOf(current!)-1+entries.length)%entries.length].id}`}>← {labels.prevEntry}</a><a href={`#aif-${entries[(entries.indexOf(current!)+1)%entries.length].id}`}>{labels.nextEntry} →</a></nav>
    </> : <>
      <header className="vh-feature-heading"><p>{labels.eyebrow}</p><h1>{labels.title}</h1><p>{labels.description}</p><small>{labels.boundary}</small></header>
      {Object.entries(data.categories[lang]).filter(([id]) => lang === "zh" || id !== "zh").map(([category, group]) => <section key={category} className="vh-pattern-group"><div className="vh-group-heading"><h2>{group.title}</h2><span>{entries.filter((item) => item.category === category).length} {labels.items}</span></div><p>{group.description}</p><div className="vh-cards">{entries.filter((item) => item.category === category).map((item) => {const localized = { ...item, ...(lang === "en" ? data.english[item.id] : {}) };return <a key={item.id} href={`#aif-${item.id}`} className="vh-pattern-card"><h3>{lang === "en" ? item.name : item.title}</h3><p>{localized.request}</p><blockquote>{localized.quote}</blockquote></a>;})}</div></section>)}
    </>}
  </main>;
}
