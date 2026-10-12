import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { briefScenarioForGuide } from "@/domain/vibehub/brief-scenarios";
import { getAnsPractice } from "@/domain/vibehub/ans-practices";
import { languageParam } from "../../source-data";
import labels from "../../labels.json";
import { CopyTermButton } from "../../copy-term-button";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> };
export async function generateMetadata({ params, searchParams }: Props) {
  const item = getAnsPractice((await params).slug); if (!item) notFound(); const lang = languageParam((await searchParams).lang, await getLocale());
  return { title: item?.title[lang] || labels[lang].ansPractice, description: item?.summary[lang], alternates: { canonical: `/vibe-hub/ans/${item.slug}?lang=${lang}`, languages: { en: `/vibe-hub/ans/${item.slug}?lang=en`, "zh-CN": `/vibe-hub/ans/${item.slug}?lang=zh` } } };
}
export default async function AnsPracticePage({ params, searchParams }: Props) {
  const item = getAnsPractice((await params).slug); if (!item) notFound();
  const lang = languageParam((await searchParams).lang, await getLocale()); const t = labels[lang];
  const scenario = briefScenarioForGuide(item.slug);
  const destination = (href: string) => href.startsWith("/vibe-hub/") ? `${href}?lang=${lang}` : href;
  return <main className="ans-knowledge-container ans-practice-detail">
    <nav className="ans-knowledge-breadcrumb" aria-label={t.breadcrumb}><Link href={`/vibe-hub?lang=${lang}`}>{t.knowledgeHome}</Link><span aria-hidden="true">/</span><Link href={`/vibe-hub/ans?lang=${lang}`}>{t.ansPractice}</Link><span aria-hidden="true">/</span><span>{item.number}</span></nav>
    <header className="ans-knowledge-page-heading"><h1>{item.title[lang]}</h1><p>{item.outcome[lang]}</p></header>
    <div className="ans-practice-detail-layout"><aside className="ans-practice-outline"><nav aria-label={t.onThisPage}>{item.sections.map((section, index) => <Link key={index} href={`#step-${index + 1}`}><span>0{index + 1}</span>{section.title[lang]}</Link>)}<Link href="#request">{t.copyableBrief}</Link></nav></aside>
    <article className="ans-practice-article">{item.sections.map((section, index) => <section id={`step-${index + 1}`} key={index}><p className="ans-knowledge-eyebrow">0{index + 1}</p><h2>{section.title[lang]}</h2><p>{section.body[lang]}</p><ul>{section.items[lang].map(line => <li key={line}>{line}</li>)}</ul></section>)}
      <section className="ans-practice-request" id="request"><div><h2>{t.copyableBrief}</h2><CopyTermButton text={item.prompt[lang]} /></div><p>{item.prompt[lang]}</p><Link className="ans-editorial-link" href={`/vibe-hub/vibehub-skill?scenario=${scenario?.id || "custom"}&lang=${lang}`}>{t.briefCustomize}<ArrowUpRight size={16} aria-hidden="true" /></Link></section>
      <section className="ans-practice-related"><h2>{t.relatedKnowledge}</h2><nav aria-label={t.relatedKnowledge}>{item.terms.map(term => <Link key={term.slug} href={`/vibe-hub/${term.slug}?lang=${lang}`}>{term.name[lang]}<ArrowUpRight size={15} aria-hidden="true" /></Link>)}</nav></section>
      <section className="ans-practice-next"><h2>{t.continueInAns}</h2><div>{item.destinations.map((link, index) => <Button key={link.href} asChild variant={index ? "outline" : "default"} data-variant={index ? "outline" : "default"} className="ans-knowledge-button"><Link href={destination(link.href)}>{link.label[lang]}<ArrowUpRight size={16} aria-hidden="true" /></Link></Button>)}</div></section>
    </article></div>
  </main>;
}
