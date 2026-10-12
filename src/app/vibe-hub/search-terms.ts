import { searchTerms, type SearchHit } from "./official/search";
// Small, inspectable intent rules augment the retained lexical search.
// These are local matches, not a remote model or an asserted semantic service.
const intents: { pattern: RegExp; ids: string[] }[] = [
  { pattern: /(?:鼠标|悬停|移上).*(?:提示|说明|一句|气泡)|(?:hover|mouse over).*(?:hint|tooltip|text|explanation)/iu, ids: ["tooltip"] },
  { pattern: /从(?:右|左|侧|底).*(?:滑|弹|展开)|侧滑面板|slide[- ]?out panel|sliding (?:panel|drawer)|bottom sheet/iu, ids: ["drawer"] },
  { pattern: /滚动.*(?:固定|停在|吸顶|保持)|scroll.*(?:sticky|stay|fixed)|sticky on scroll/iu, ids: ["sticky"] },
  { pattern: /文字.*(?:太长|超出).*(?:省略|截断|三个点)|(?:long|overflowing) text.*(?:ellipsis|truncat)/iu, ids: ["text-truncate"] },
];
let byId: Map<string, SearchHit["entry"]> | undefined;
export function searchKnowledgeTerms(query: string, limit = Infinity): SearchHit[] {
  const value = query.trim().slice(0, 500);
  const matches = searchTerms({ query: value, minScore: 20 });
  if (!value) return matches.slice(0, limit);
  const ids = new Set(intents.filter(intent => intent.pattern.test(value)).flatMap(intent => intent.ids));
  if (!ids.size) return matches.slice(0, limit);
  byId ??= new Map(searchTerms().map(hit => [hit.entry.id, hit.entry]));
  const boosted = [...ids].flatMap(id => { const entry = byId?.get(id); return entry ? [{ entry, score: 600, matchedFields: ["ansIntent"] }] : []; });
  return [...boosted, ...matches.filter(hit => !ids.has(hit.entry.id))].slice(0, limit);
}
