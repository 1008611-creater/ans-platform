export type PromptVersion = {
  id: string; name: string; prompt: string; note: string; createdAt: string;
  basePrompt?: string; variables?: Record<string, string>; fields?: Record<string, string>;
};
export type PromptVariable = { token: string; label: string; fallback: string };
export function findPromptVariables(prompt: string): PromptVariable[] {
  return [...prompt.matchAll(/\{argument\s+name="([^"]+)"\s+default="([^"]*)"\}|\{\{?([A-Za-z\u3400-\u9fff][A-Za-z0-9 _\-\u3400-\u9fff]{0,48})\}?\}/g)]
    .map(m => ({ token: m[0], label: m[1] || m[3], fallback: m[2] ?? m[0] }))
    .filter((v, i, all) => all.findIndex(x => x.token === v.token) === i);
}
export function renderPrompt(base: string, variables: Record<string, string>): string {
  let structured = false;
  try { JSON.parse(base); structured = true; } catch { /* Retain plain text. */ }
  return base.replace(/\{argument\s+name="([^"]+)"\s+default="([^"]*)"\}|\{\{?([A-Za-z\u3400-\u9fff][A-Za-z0-9 _\-\u3400-\u9fff]{0,48})\}?\}/g,
    token => Object.hasOwn(variables, token) ? (structured ? JSON.stringify(variables[token]).slice(1, -1) : variables[token]) : token);
}
export type JsonLeaf = { path: string; start: number; end: number; value: string; kind: 'string' | 'number' | 'boolean' | 'null' };
// Parse only validated JSON. Token spans allow changing one value without reformatting any other byte.
export function jsonLeaves(text: string): JsonLeaf[] {
  try { JSON.parse(text); } catch { return []; }
  const leaves: JsonLeaf[] = []; let pos = 0;
  const whitespace = () => { while (/\s/.test(text[pos] ?? '') && pos < text.length) pos++; };
  const stringEnd = () => { pos++; while (pos < text.length) { if (text[pos++] === '\\') { pos++; continue; } if (text[pos - 1] === '"') break; } };
  const parse = (path: string) => {
    whitespace(); const start = pos;
    if (text[pos] === '{') { pos++; whitespace(); while (text[pos] !== '}') { const keyStart = pos; stringEnd(); const key = JSON.parse(text.slice(keyStart, pos)); whitespace(); pos++; parse(path + '/' + String(key).replace(/~/g, '~0').replace(/\//g, '~1')); whitespace(); if (text[pos] !== ',') break; pos++; whitespace(); } pos++; return; }
    if (text[pos] === '[') { pos++; whitespace(); let i = 0; while (text[pos] !== ']') { parse(path + '/' + i++); whitespace(); if (text[pos] !== ',') break; pos++; } pos++; return; }
    if (text[pos] === '"') stringEnd(); else while (pos < text.length && !/[\s,\]}]/.test(text[pos])) pos++;
    const value = JSON.parse(text.slice(start, pos));
    leaves.push({ path: path || '/', start, end: pos, value: value === null ? 'null' : String(value), kind: value === null ? 'null' : typeof value as JsonLeaf['kind'] });
  };
  parse(''); return leaves;
}
export function editJsonLeaf(text: string, path: string, value: string): string {
  const leaf = jsonLeaves(text).find(x => x.path === path);
  if (!leaf) return text;
  if (leaf.kind !== 'string') {
    try { const parsed = JSON.parse(value); if ((leaf.kind === 'null' && parsed !== null) || (leaf.kind !== 'null' && typeof parsed !== leaf.kind)) return text; } catch { return text; }
  }
  const replacement = leaf.kind === 'string' ? JSON.stringify(value) : value;
  const next = text.slice(0, leaf.start) + replacement + text.slice(leaf.end);
  try { JSON.parse(next); return next; } catch { return text; }
}
export function promptFingerprint(text: string) { let hash = 2166136261; for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619); return (hash >>> 0).toString(16); }
function stringRecord(value: unknown): Record<string, string> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')) : undefined;
}
export function mergePromptVersions(a: PromptVersion[] = [], b: PromptVersion[] = []): PromptVersion[] {
  const records = new Map<string, PromptVersion>();
  for (const row of [...a, ...b]) {
    if (!row || typeof row.id !== 'string' || typeof row.prompt !== 'string' || typeof row.name !== 'string') continue;
    const prior = records.get(row.id);
    if (prior && JSON.stringify([prior.prompt, prior.note, prior.basePrompt, prior.variables, prior.fields]) !== JSON.stringify([row.prompt, row.note, row.basePrompt, row.variables, row.fields])) records.set(row.id + '-conflict-' + promptFingerprint(JSON.stringify([row.prompt, row.note, row.variables, row.fields])), { ...row, id: row.id + '-conflict-' + promptFingerprint(JSON.stringify([row.prompt, row.note, row.variables, row.fields])), name: row.name + '（冲突副本）' });
    else records.set(row.id, row);
  }
  return [...records.values()].sort((x, y) => y.createdAt.localeCompare(x.createdAt));
}
export function normalizePromptVersions(value: unknown): PromptVersion[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is PromptVersion => Boolean(x && typeof x.id === 'string' && typeof x.name === 'string' && typeof x.prompt === 'string' && typeof x.createdAt === 'string'))
    .map(x => ({ id: x.id.slice(0, 180), name: x.name.slice(0, 240), prompt: x.prompt.slice(0, 100000), note: typeof x.note === 'string' ? x.note.slice(0, 6000) : '', createdAt: x.createdAt,
      basePrompt: typeof x.basePrompt === 'string' ? x.basePrompt.slice(0, 100000) : undefined,
      variables: stringRecord(x.variables),
      fields: stringRecord(x.fields) }));
}
export function promptChanges(before: string, after: string) {
  let start = 0; while (start < Math.min(before.length, after.length) && before[start] === after[start]) start++;
  let end = 0; while (end < Math.min(before.length, after.length) - start && before[before.length - 1 - end] === after[after.length - 1 - end]) end++;
  return { prefix: before.slice(0, start), removed: before.slice(start, before.length - end), added: after.slice(start, after.length - end), suffix: end ? before.slice(-end) : '' };
}
export function promptConstraints(prompt: string) {
  return prompt.split(/\n|(?<=[.!。；;])\s+/).filter(line => /preserv|must|do not|unchanged|consistent|reference|aspect|ratio|\d+:\d+|\d+\s*mm|保留|保持|禁止|一致|参考|画幅|镜头|不得/i.test(line)).map(s => s.trim()).filter(Boolean);
}