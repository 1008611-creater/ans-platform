import type { CatalogProject } from "@/domain/catalog/projects";
import type { AgentInput } from "@/contracts/companion-agent";

const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase();
export function publicProjectSummary(entry: CatalogProject, locale: AgentInput["locale"]) {
  const text = locale === "en" ? entry.content?.en ?? entry.content?.zh : entry.content?.zh;
  if (!text) return null;
  return { slug: entry.slug, title: text.title, summary: text.summary.slice(0, 420),
    input: text.inputs.slice(0, 400), output: text.output.slice(0, 400), decisions: text.decisions.slice(0, 300),
    source: entry.source, sourceUrl: entry.sourceUrl ?? null,
    executable: Boolean(entry.workflowId), href: entry.memberHref ?? `/explore/${entry.slug}` };
}

/** Keyword relevance, not semantic inference. Exact/all-term matches precede partial matches. */
export function searchPublicProjects(entries: readonly CatalogProject[], query: string, locale: AgentInput["locale"]) {
  const terms = [...new Set(normalize(query).split(/[\s,，;；/|]+/u).filter(Boolean))].slice(0, 12);
  return entries.flatMap((entry, index) => {
    const item = publicProjectSummary(entry, locale);
    if (!item) return [];
    const text = locale === "en" ? entry.content?.en ?? entry.content?.zh : entry.content?.zh;
    const title = normalize(item.title);
    const summary = normalize(text?.summary ?? "");
    const search = normalize([entry.slug, entry.category, entry.subcategory, title, summary, text?.inputs, text?.output].join(" "));
    const matchedTerms = terms.filter(term => search.includes(term));
    if (terms.length && !matchedTerms.length) return [];
    const score = matchedTerms.reduce((total, term) => total + (title.includes(term) ? 4 : summary.includes(term) ? 2 : 1), 0);
    return [{ item: { ...item, matchedTerms, match: matchedTerms.length === terms.length ? "all_terms" : "partial" }, score, index }];
  }).sort((a, b) => Number(b.item.match === "all_terms") - Number(a.item.match === "all_terms") ||
    b.item.matchedTerms.length - a.item.matchedTerms.length || b.score - a.score || a.index - b.index)
    .slice(0, 5).map(result => result.item);
}
