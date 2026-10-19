'use client';
import { useId, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { Search, Check, ArrowUpRight, ImageOff, Plus } from 'lucide-react';
import { CHARACTERS, CUSTOM_CHARACTER, DISCOVERY_PROJECT, characterFor, searchCharacters, type Character } from '@/runtime/characters.mjs';
import ShootHint from './shoot-hint';
import styles from './shoot-characters.module.css';
const BASE=process.env.NEXT_PUBLIC_BASE_PATH||'';
function CharacterPortrait({character}:{character:Character}){
 const [failed,setFailed]=useState(false);
 if(!character.artwork||failed)return <span className={styles.unavailable}><ImageOff size={24}/><span>{failed?'图片暂时没加载出来':'等待确认形象'}</span></span>;
 return <Image unoptimized src={BASE+character.artwork.src} alt={character.name+'角色展示图'} width={character.artwork.width} height={character.artwork.height} loading="lazy" onError={()=>setFailed(true)}/>;
}
export default function CharacterLibrary({value,onChange,disabled=false,compact=false}:{value:string;onChange:(id:string)=>void;disabled?:boolean;compact?:boolean}){
 const [query,setQuery]=useState(''),[category,setCategory]=useState('all'),[expanded,setExpanded]=useState(!compact);
 const id=useId(),selected=characterFor({characterId:value})||CUSTOM_CHARACTER,items=searchCharacters(query,category);
 const pictured=items.filter(c=>c.artwork),pending=items.filter(c=>!c.artwork);
 return <section className={styles.library} data-compact={compact} aria-labelledby={id}>
  <div className={styles.heading}><div><span>THE PLUS-ONE CLUB / 搭子库</span><h2 id={id}>{compact?'今天带谁？':'选个搭子'}</h2></div>{compact?<button type="button" disabled={disabled} aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'收起角色库':'换个搭子'}</button>:<b>{CHARACTERS.filter(c=>c.artwork).length} 位搭子</b>}</div>
  {expanded&&<><div className={styles.tools}><label className={styles.search}><Search size={17}/><input aria-label="搜索搭子" placeholder="搜名字或外号，比如：肥嘟嘟、乌拉呀哈" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" onClick={()=>setQuery('')} aria-label="清空角色搜索">×</button>}</label><div className={styles.filters} aria-label="角色分类">{[['all','全部搭子'],['meme','抽象整活'],['animation','动画角色'],['cute','可爱贴贴'],['brand','品牌搭子']].map(([key,label])=><button type="button" key={key} aria-pressed={category===key} onClick={()=>setCategory(key)}>{label}</button>)}</div></div>
  <div className={styles.grid}>{pictured.map((c,i)=><button type="button" className={styles.card} key={c.id} aria-label={'选择搭子'+c.name} aria-pressed={value===c.id} disabled={disabled} onClick={()=>onChange(c.id)} style={{'--card-color':c.color} as CSSProperties}><span className={styles.portrait}><CharacterPortrait character={c}/><span className={styles.number} aria-hidden="true">{String(i+1).padStart(2,'0')}</span>{value===c.id&&<span className={styles.check} aria-hidden="true"><Check size={16}/></span>}</span><span className={styles.cardCopy}><span className={styles.cardTitle}><strong>{c.name}</strong><span className={styles.tag}>{c.tag}</span></span><span className={styles.line}>{c.line}</span><span className={styles.cardBottom}>{value===c.id?'已加入你的拍摄':'就带它出门'}<ArrowUpRight size={15}/></span></span></button>)}</div>
  {items.length===0&&<p className={styles.empty} role="status">这位还没收录。试试别名，或选「我的搭子」上传私藏角色。</p>}
  {pending.length>0&&<details className={styles.pending} open={query.trim()?true:undefined}><summary>{pending.length} 位搭子待补形象</summary><div>{pending.map(c=><button key={c.id} type="button" disabled={disabled} aria-pressed={value===c.id} onClick={()=>onChange(c.id)}><Plus size={15}/>{c.name}<small>{c.verification==='pending'?'版本待确认':'展示图待补齐'}</small></button>)}</div></details>}
  <button type="button" className={styles.custom} aria-pressed={value==='custom'} disabled={disabled} onClick={()=>onChange('custom')}><span><Plus size={18}/> 我的搭子</span><span>自带单个非真人角色参考 {value==='custom'?'✓':'↗'}</span></button></>}
  <div className={styles.selection} aria-live="polite">{selected.artwork&&<span className={styles.selectedPortrait}><CharacterPortrait key={selected.id} character={selected}/></span>}<div><b>已选：{selected.name}</b><span>可选内置图，或上传自己的版本。<ShootHint label="角色参考用途">角色参考只管搭子的外形。内置图需要你明确选用；不会因浏览或选择角色而发往生成渠道。</ShootHint></span></div></div>
  <details className={styles.sources}><summary>角色图片与资料来源</summary><p>{selected.note}</p>{selected.artwork&&<p><a href={selected.artwork.source} target="_blank" rel="noreferrer">{selected.artwork.credit} ↗</a> · 原图展示，保留原有文字与署名，仅用于辨认角色，不自动作为生成参考。</p>}{selected.source&&<a href={selected.source} target="_blank" rel="noreferrer">{selected.sourceLabel} ↗</a>}<p>资料收录不表示品牌合作。当前图片用于本地视觉审查，网页再发布许可待确认；合影效果尚待验证。</p><p>收集于 {selected.checkedAt}，按编辑选题排列，不是实时热度榜。发现线索：<a href={DISCOVERY_PROJECT.url} target="_blank" rel="noreferrer">{DISCOVERY_PROJECT.name} ↗</a></p></details>
 </section>;
}
