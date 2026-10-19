"use client";
import { useMemo, useState } from 'react';
import type { PromptVersion } from '@/lib/image2-prompt-engine';
import styles from './image2-plan-space.module.css';
type Draft = { caseTitle: string; prompt: string; note: string; updatedAt: string; versions?: PromptVersion[] };
type Collection = { id: string; name: string; caseKeys: string[] };
type RecordItem = { id: string; caseTitle: string; caseKey?: string; caseId: number; prompt?: string; createdAt: string; images: Array<{ dataUrl?: string; path?: string; name: string }> };
type Props = { owner: string | null; snapshot: { favoriteCaseKeys: string[]; collections: Collection[]; notes: Record<string, { note: string }>; promptDrafts: Record<string, Draft> }; records: RecordItem[];
  cases: Array<{ key: string; title: string; source?: string }>; onExport: () => void; onImport: (file: File) => Promise<void>; onOpen: (key: string, version?: PromptVersion) => void; onBrowse: () => void; status: string };
export function Image2PlanSpace(p: Props) {
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('all'); const [collection, setCollection] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setCopyStatus('完整稿已复制'); } catch { setCopyStatus('复制失败，请选中完整稿手动复制'); } };
  const rows = useMemo(() => {
    const lookup = new Map(p.cases.map(x => [x.key, x]));
    const keys = new Set([...p.snapshot.favoriteCaseKeys, ...Object.keys(p.snapshot.promptDrafts), ...Object.keys(p.snapshot.notes), ...p.snapshot.collections.flatMap(x => x.caseKeys), ...p.records.map(x => x.caseKey ?? String(x.caseId))]);
    return [...keys].map(key => { const draft = p.snapshot.promptDrafts[key]; const source = lookup.get(key); return { key, draft, title: draft?.caseTitle ?? source?.title ?? key, note: p.snapshot.notes[key]?.note ?? '', favorite: p.snapshot.favoriteCaseKeys.includes(key), records: p.records.filter(x => (x.caseKey ?? String(x.caseId)) === key), source }; })
      .filter(x => !collection || p.snapshot.collections.find(c => c.id === collection)?.caseKeys.includes(x.key))
      .filter(x => filter === 'all' || (filter === 'versions' && x.draft?.versions?.length) || (filter === 'drafts' && x.draft) || (filter === 'results' && x.records.length) || (filter === 'favorites' && x.favorite))
      .filter(x => [x.title, x.note, x.draft?.note, x.draft?.prompt, ...p.snapshot.collections.filter(c => c.caseKeys.includes(x.key)).map(c => c.name), ...(x.draft?.versions ?? []).map(v => v.name + ' ' + v.note + ' ' + v.prompt), ...x.records.map(r => r.prompt)].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a,b) => (b.draft?.updatedAt ?? '').localeCompare(a.draft?.updatedAt ?? ''));
  }, [p.cases, p.snapshot, p.records, collection, query, filter]);
  return <section className={styles.space} aria-label="个人方案空间">
    <header><div><small>YOUR LIBRARY</small><h2>我的方案</h2><p>让每次改写留下完整版本，让下一次任务接着开始。</p></div><button type="button" onClick={p.onBrowse}>回到案例库 →</button></header>
    <div className={styles.toolbar}>
      <input aria-label="搜索个人方案" placeholder="搜索品牌、项目、版本或完整稿" value={query} onChange={e => setQuery(e.target.value)} />
      <select aria-label="方案类型" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">全部方案</option><option value="drafts">编辑草稿</option><option value="versions">命名版本</option><option value="favorites">我的收藏</option><option value="results">实际生成记录</option></select>
      <select aria-label="项目筛选" value={collection} onChange={e => setCollection(e.target.value)}><option value="">全部项目 / 收藏夹</option>{p.snapshot.collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
    </div>
    <div className={styles.backup}><span>{p.owner ? '当前账号的本机资产' : '匿名资产 · 当前浏览器'} · {rows.length} 套方案</span><button type="button" onClick={p.onExport}>导出完整备份</button><label>恢复备份<input type="file" accept="application/json,.json" aria-label="恢复完整备份" onChange={async e => { const file = e.target.files?.[0]; if (file) await p.onImport(file); e.target.value = ''; }} /></label></div>
    <p role="status">{p.status || copyStatus}</p>
    <p className={styles.hint}>草稿和命名版本不代表已生成。云同步覆盖收藏、项目、备注与提示词版本；生成记录保存在当前浏览器。备份包含全部本机记录，恢复时合并保留冲突副本。</p>
    {rows.length ? rows.map(row => <article className={styles.plan} key={row.key}>
      <div className={styles.meta}><small>{row.favorite ? '已收藏 · ' : ''}{row.source?.source ?? '个人留存'}{!row.source ? ' · 源案例暂不可用，完整稿仍保留' : ''}</small><h3>{row.title}</h3><p>{row.note || row.draft?.note || '可以在备注中留下品牌、项目和下次复用的条件。'}</p>{row.source && <button type="button" onClick={() => p.onOpen(row.key)}>打开并继续编辑</button>}</div>
      <div className={styles.content}>
        {row.draft ? <div className={styles.draft}><strong>当前草稿</strong><span>{row.draft.prompt.length.toLocaleString()} 字符 · {new Date(row.draft.updatedAt).toLocaleString('zh-CN')}</span><pre tabIndex={0}>{row.draft.prompt}</pre><button type="button" onClick={() => void copy(row.draft!.prompt)}>复制草稿完整稿</button></div> : <p>已保存案例引用，还没有个人改写稿。</p>}
        <div className={styles.versions}>{(row.draft?.versions ?? []).map(v => <button type="button" key={v.id} onClick={() => row.source ? p.onOpen(row.key, v) : void copy(v.prompt)}><strong>{v.name}</strong><span>{v.prompt.length} 字符 · {v.note || new Date(v.createdAt).toLocaleDateString('zh-CN')}{!row.source ? ' · 点击复制完整稿' : ''}</span></button>)}</div>
        {row.records.length ? <details><summary>实际生成记录 · {row.records.length}</summary>{row.records.map(r => <div key={r.id}><span>{new Date(r.createdAt).toLocaleString('zh-CN')}</span><p>{r.prompt ?? '历史记录未保存执行稿，不能推定当时参数。'}</p>{r.images.map((img,i) => <a key={i} href={img.dataUrl || img.path} download={img.name}>下载结果 {i + 1}</a>)}</div>)}</details> : <small>暂无实际生成记录；保存方案不会触发生图。</small>}
      </div>
    </article>) : <div className={styles.empty}><h3>从一个值得复用的案例开始</h3><p>收藏案例，保存自己的完整稿和命名版本，都会出现在这里。</p><button type="button" onClick={p.onBrowse}>发现适合任务的案例</button></div>}
  </section>;
}