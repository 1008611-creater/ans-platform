"use client";
import { useEffect, useId, useRef, useState } from 'react';
import { editJsonLeaf, findPromptVariables, jsonLeaves, promptChanges, promptConstraints, type PromptVersion, type JsonLeaf } from '@/lib/image2-prompt-engine';
import styles from './image2-prompt-editor.module.css';
type Props = {
  original: string; base: string; rendered: string; variables: Record<string, string>; note: string; versions: PromptVersion[];
  onBase: (value: string) => void; onVariable: (key: string, value: string) => void; onNote: (value: string) => void;
  onSave: (name: string) => void; onRestore: (version: PromptVersion) => void; onReset: () => void; onCopy: () => void; onEnter: () => void;
  copied: boolean; status: string;
};
function JsonField({ leaf, base, onChange }: { leaf: JsonLeaf; base: string; onChange: (text: string) => void }) {
  const [value, setValue] = useState(leaf.value); const [error, setError] = useState('');
  useEffect(() => { setValue(leaf.value); setError(''); }, [leaf.value]);
  const commit = () => {
    const next = editJsonLeaf(base, leaf.path, value);
    if (next === base && value !== leaf.value) { setError('值无效，请保持原字段类型：' + leaf.kind); return; }
    setError(''); onChange(next);
  };
  return <label><span>{leaf.path} · {leaf.kind}</span><textarea aria-label={'JSON ' + leaf.path} aria-invalid={Boolean(error)} rows={2} value={value} onChange={e => { setValue(e.target.value); if (leaf.kind === 'string') onChange(editJsonLeaf(base, leaf.path, e.target.value)); }} onBlur={leaf.kind === 'string' ? undefined : commit} /><small role={error ? 'alert' : undefined}>{error || (leaf.kind === 'string' ? '' : '离开字段时保存，保持原数值类型')}</small></label>;
}
export function Image2PromptEditor(p: Props) {
  const [name, setName] = useState(''); const [compare, setCompare] = useState('');
  const [tab, setTab] = useState<'edit' | 'diff' | 'versions'>('edit');
  type State = { base: string; variables: Record<string, string>; note: string };
  const [undo, setUndo] = useState<State[]>([]); const [redo, setRedo] = useState<State[]>([]);
  const groupTime = useRef(0); const groupField = useRef(''); const tabsId = useId();
  const current = (): State => ({ base: p.base, variables: { ...p.variables }, note: p.note });
  const remember = (field: string, grouped = true) => {
    const now = Date.now();
    if (!grouped || groupField.current !== field || now - groupTime.current > 700) setUndo(rows => [...rows.slice(-99), current()]);
    groupField.current = field; groupTime.current = now; setRedo([]);
  };
  const change = (value: string) => { if (value === p.base) return; remember('base'); p.onBase(value); };
  const apply = (state: State) => p.onRestore({ id: 'undo', name: '', prompt: state.base, basePrompt: state.base, variables: state.variables, note: state.note, createdAt: '' });
  const step = (back: boolean) => { const stack = back ? undo : redo; if (!stack.length) return;
    (back ? setRedo : setUndo)(rows => [...rows, current()]);
    (back ? setUndo : setRedo)(stack.slice(0, -1)); apply(stack[stack.length - 1]); groupTime.current = 0; };
  const leaves = jsonLeaves(p.base); const variables = findPromptVariables(p.base);
  const baseline = p.versions.find(x => x.id === compare)?.prompt ?? p.original;
  const delta = promptChanges(baseline, p.rendered); const constraints = promptConstraints(p.original);
  return <section className={styles.editor} aria-label="保真提示词编辑器" onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); step(!e.shiftKey); } }}>
    <header className={styles.head}><div><small>YOUR PRODUCTION PLAN</small><h3>把灵感改成你的方案</h3></div><span role="status">{p.status || '本机草稿自动保存'}</span></header>
    <p className={styles.explain}>每次修改作用于完整原文。结构化字段只替换对应值，其余格式与内容保留。</p>
    <div className={styles.tabs} role="tablist" aria-label="编辑视图">
      {([['edit','编辑方案'],['diff','修改差异'],['versions','命名版本']] as const).map(([id,label]) => <button key={id} role="tab" id={tabsId + id} aria-controls={tabsId + "panel"} tabIndex={tab === id ? 0 : -1} aria-selected={tab === id} onKeyDown={e => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return; e.preventDefault(); const ids = ["edit", "diff", "versions"] as const; const next = e.key === "Home" ? 0 : e.key === "End" ? 2 : (ids.indexOf(tab) + (e.key === "ArrowRight" ? 1 : 2)) % 3; setTab(ids[next]); document.getElementById(tabsId + ids[next])?.focus(); }} onClick={() => setTab(id)} type="button">{label}{id === 'versions' ? ` · ${p.versions.length}` : ''}</button>)}
    </div>
    {tab === 'edit' && <div role="tabpanel" id={tabsId + "panel"} aria-labelledby={tabsId + tab} aria-label="编辑方案">
      {variables.length > 0 && <div className={styles.variables}>{variables.map(v => <label key={v.token}><span>{v.label} · 原文变量</span><input aria-label={v.label + '变量'} placeholder={v.fallback} value={p.variables[v.token] ?? ''} onChange={e => { remember('variable:' + v.token); p.onVariable(v.token, e.target.value); }} /></label>)}</div>}
      {leaves.length > 0 && <details className={styles.structured}><summary>按 JSON 字段编辑 · {leaves.length} 个值</summary><div className={styles.variables}>{leaves.map(leaf => <JsonField key={leaf.path} leaf={leaf} base={p.base} onChange={change} />)}</div></details>}
      {constraints.length > 0 && <details className={styles.constraints}><summary>原文中的约束线索 · {constraints.length} 处</summary><p>按原文关键词定位，供核对；不是生成效果保证。</p>{constraints.map((s,i) => <blockquote key={i}>{s}</blockquote>)}</details>}
      {variables.length > 0 && <p className={styles.explain}>下方保留完整模板和占位符，变量值单独保存。展开「完整执行稿」查看替换后的文本；复制和带入工作台均使用执行稿。</p>}
      <label className={styles.full}><span>{variables.length ? "完整提示词模板编辑" : "完整提示词自由编辑"} <small>{p.base.length.toLocaleString()} 字符 · {leaves.length ? '有效 JSON' : '文本 / 模板'}</small></span><textarea spellCheck={false} aria-label="完整提示词自由编辑" rows={16} value={p.base} onChange={e => change(e.target.value)} /></label>
      <div className={styles.tools}><button type="button" disabled={!undo.length} onClick={() => step(true)}>撤销</button><button type="button" disabled={!redo.length} onClick={() => step(false)}>重做</button><button type="button" disabled={!p.original.trim()} onClick={() => { remember('reset', false); p.onReset(); }}>恢复原文</button></div>
      <label className={styles.full}><span>方案备注</span><textarea aria-label="提示词工作台备注" rows={2} placeholder="品牌、项目、准备的输入素材或下次复用的说明" value={p.note} onChange={e => { remember('note'); p.onNote(e.target.value); }} /></label>
    </div>}
    {tab === 'diff' && <div role="tabpanel" id={tabsId + "panel"} aria-labelledby={tabsId + tab} aria-label="修改差异"><label className={styles.full}><span>与哪个版本比较</span><select aria-label="比较版本" value={compare} onChange={e => setCompare(e.target.value)}><option value="">上游完整原文</option>{p.versions.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label><p>红色为删除，绿色为新增。连续修改范围之间的未变内容也会显示在范围内。</p><pre className={styles.diff}>{delta.prefix}<del>{delta.removed}</del><ins>{delta.added}</ins>{delta.suffix}</pre>{baseline === p.rendered && <p>内容一致，尚未修改。</p>}</div>}
    {tab === 'versions' && <div role="tabpanel" id={tabsId + "panel"} aria-labelledby={tabsId + tab} aria-label="命名版本">{p.versions.length ? p.versions.map(v => <article key={v.id} className={styles.version}><div><strong>{v.name}</strong><small>{new Date(v.createdAt).toLocaleString('zh-CN')} · {v.prompt.length} 字符</small><p>{v.note}</p></div><button type="button" onClick={() => { remember('restore', false); p.onRestore(v); setTab('edit'); }}>恢复版本</button><button type="button" onClick={() => { setCompare(v.id); setTab('diff'); }}>比较</button></article>) : <p>给当前方案命名并保存。每次保存创建独立版本，恢复原文不会删除它们。</p>}</div>}
    <div className={styles.save}><input aria-label="版本名称" placeholder="命名版本，例如：秋季新品 / 暖色方案" value={name} onChange={e => setName(e.target.value)} /><button type="button" disabled={!p.rendered.trim()} onClick={() => { p.onSave(name.trim() || `方案 ${p.versions.length + 1}`); setName(''); }}>保存命名版本</button></div>
    <details className={styles.final}><summary>完整执行稿 · {p.rendered.length.toLocaleString()} 字符</summary><pre>{p.rendered}</pre></details>
    <footer className={styles.actions}><button type="button" disabled={!p.rendered.trim()} onClick={p.onCopy}>{p.copied ? '已复制完整稿' : '复制完整稿'}</button><button type="button" disabled={!p.rendered.trim()} onClick={p.onEnter}>带入工作台 →</button></footer>
  </section>;
}