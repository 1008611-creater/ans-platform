'use client';
import { useId, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { ArrowUpRight, Copy, MapPin, Sparkles } from 'lucide-react';
import type { ShootSettings, StorySettings } from '@/app/lib/shoot-contract';
import { STORIES, ENERGIES, CAMERAS, RELATIONSHIPS, storyFor, storyOptions, personaFor, storyLink, QUICK_EDITS } from '@/runtime/stories.mjs';
import { storySettings, SHOTS } from '@/runtime/recipe.mjs';
import { PLACES, shotsFor, hasCompanion } from '@/runtime/destinations.mjs';
import { characterFor, characterName } from '@/runtime/characters.mjs';
import ShootHint from './shoot-hint';
import styles from './shoot-stories.module.css';
const BASE=process.env.NEXT_PUBLIC_BASE_PATH||'';
export function StoryDeck({onCreate,busy,chosen,onChange,imported=false}:{onCreate:(settings:ShootSettings)=>void;busy:boolean;chosen:ShootSettings;onChange:(settings:ShootSettings)=>void;imported?:boolean}){
 const story=storyFor(chosen)!,place=PLACES.find(p=>p.id===chosen.placeId)!,character=characterFor(chosen)!;
 return <section className={styles.deck} aria-label="选一个剧情开拍">
  {imported&&<p className={styles.remixNotice}><Copy size={15}/>同款玩法已带入：{character.name} × {place.name}。创建的是你的独立拍摄，不包含分享者的照片。</p>}
  <div className={styles.deckHeading}><span>{STORIES.length} 个拍摄提案</span><small><ShootHint label="拍摄提案图片说明">下方以真实地点资料照和内置角色原图展示组合，尚非生成合影。点击玩法后上传本人照片。每套提案有独立镜头编排。</ShootHint></small></div>
  {imported&&<div className={styles.storyPreview}><div className={styles.previewHeading}><div><span>同款玩法</span><h2>{story.short}<small>{character.name} × {place.name}</small></h2></div><button className={styles.primary} disabled={busy} onClick={()=>onCreate(chosen)}>拍这个玩法<ArrowUpRight size={19}/></button></div></div>}
  <div className={styles.cards}>{STORIES.toSorted((a,b)=>Number(!!PLACES.find(p=>p.id===b.placeId)?.photo)-Number(!!PLACES.find(p=>p.id===a.placeId)?.photo)).map((item,i)=>{const c=characterFor({characterId:item.characterId})!,p=PLACES.find(x=>x.id===item.placeId)!;return <button type="button" key={item.id} className={styles.card} aria-label={'拍这个玩法：'+item.title} disabled={busy} style={{'--story-color':item.color} as CSSProperties} onClick={()=>{const settings=storySettings(item.id);onChange(settings);onCreate(settings);}}>
   <span className={styles.sceneArt}>{p.photo?<Image className={styles.scenePhoto} unoptimized src={BASE+'/places/'+p.photo} alt={p.name+'资料照'} width={p.width||1280} height={p.height||960} loading={i<3?'eager':'lazy'}/>:<span className={styles.sceneFallback}>{p.city}<small>{p.name}</small></span>}<span className={styles.proposal}>玩法提案</span>{c.artwork&&<span className={styles.characterSticker}><Image unoptimized src={BASE+c.artwork.src} alt={c.name+'内置角色参考图'} width={c.artwork.width} height={c.artwork.height} loading={i<3?'eager':'lazy'}/><b>{c.name}</b></span>}<span className={styles.sceneLocation}><MapPin size={12}/>{p.city} · {p.name}</span></span>
   <span className={styles.cardText}><strong>{item.title}</strong><span className={styles.cardDescription}>{item.line}</span><b>拍这个玩法<ArrowUpRight size={15}/></b></span>
  </button>;})}</div>

 </section>;
}
export function StoryControls({value,onChange,disabled}:{value:ShootSettings;onChange:(s:ShootSettings)=>void;disabled:boolean}){
 const story=storyFor(value),id=useId(),choices=STORIES.filter(s=>s.places.includes(value.placeId||''));
 const change=<K extends keyof StorySettings>(key:K,v:StorySettings[K])=>{if(value.story)onChange({...value,story:{...value.story,[key]:v}});};
 const setStory=(next:string)=>{const target=STORIES.find(s=>s.id===next);const autoTitle=STORIES.some(s=>s.title===value.title);onChange({...value,story:target?{...(value.story||storyOptions(target.id)),id:target.id}:undefined,title:autoTitle?(target?.title||('带'+characterName(value)+'去旅行')):value.title});};
 return <section className={styles.controls} aria-labelledby={id}><div className={styles.controlsTitle}><Sparkles size={17}/><h3 id={id}>这一集，怎么演？</h3><ShootHint label="模板与镜头">模板包含镜头动作。选好默认玩法即可继续，下面的调整均为选填。</ShootHint></div><label className={styles.storySelect}>剧情<select value={story?.id||''} disabled={disabled} onChange={e=>setStory(e.target.value)}><option value="">自由合影 · 自己安排</option>{choices.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>{story&&<details className={styles.tuning}><summary>调整互动、摄影与关系 <span>选填</span></summary>
  <fieldset><legend>好玩程度</legend><div className={styles.options}>{ENERGIES.map(o=><button key={o.id} type="button" disabled={disabled} aria-pressed={value.story?.energy===o.id} onClick={()=>change('energy',o.id)}><b>{o.label}</b><span className={styles.optionHint}>{o.hint}</span></button>)}</div></fieldset>
  <fieldset><legend>照片气质</legend><div className={styles.options}>{CAMERAS.map(o=><button key={o.id} type="button" disabled={disabled||(value.placeId==='paris'&&o.id==='flash')} aria-pressed={value.story?.camera===o.id} onClick={()=>change('camera',o.id)}><b>{o.label}</b><span>{value.placeId==='paris'&&o.id==='flash'?'此机位只拍日间':o.hint}</span></button>)}</div></fieldset>
  <fieldset><legend>你们的关系</legend><div className={styles.relationship}>{RELATIONSHIPS.map(o=><button type="button" key={o.id} disabled={disabled} aria-pressed={value.story?.relationship===o.id} onClick={()=>change('relationship',o.id)}>{o.label}</button>)}</div></fieldset>
  <div className={styles.persona}><b>{characterName(value)} / {personaFor(value).label}</b><p>{personaFor(value).reaction}；{personaFor(value).gesture}。</p><small>本片编排设定 · 角色外形以拍摄参考为准</small></div>
  <details className={styles.previewDetails}><summary>看看六个镜头会发生什么</summary><ol>{shotsFor(value,SHOTS).map(s=><li key={s.id}><b>{s.name}</b><p>{s.description}</p></li>)}</ol></details>
 </details>}</section>;
}
export function StoryShare({settings}:{settings:ShootSettings}){
 const [link,setLink]=useState(''),[message,setMessage]=useState('');
 if(!settings.story||settings.characterId==='custom')return null;
 const copy=async()=>{const url=storyLink(settings,window.location.href);setLink(url);try{await navigator.clipboard.writeText(url);setMessage('同款链接已复制。只含玩法选项，不含你的照片或私有工程。');}catch{setMessage('可选中下方链接手动复制；不会公开你的照片。');}};
 return <section className={styles.share}><div><b>这个脑洞，朋友也能拍。</b><ShootHint label="同款分享范围">只分享剧情、搭子和地点选项。本人照片、成片及私有文字不会带过去。</ShootHint></div><button type="button" onClick={()=>void copy()}><Copy size={15}/>复制同款玩法</button>{message&&<div className={styles.shareMessage} role="status">{message}<label>同款链接<input readOnly value={link} onFocus={e=>e.target.select()}/></label>{link.startsWith('http://localhost:')&&<small>当前是本机预览链接，外部设备暂时打不开。</small>}</div>}</section>;
}
export function QuickEdits({onPick,disabled}:{onPick:(note:string)=>void;disabled:boolean}){
 return <div className={styles.quickEdits} aria-label="快捷修改">{QUICK_EDITS.map(({label,note})=><button type="button" key={label} disabled={disabled} onClick={()=>onPick(note)}>{label}</button>)}</div>;
}

export function StorySequel({settings,onCreate,disabled}:{settings:ShootSettings;onCreate:(placeId:string)=>void;disabled:boolean}){
 const [selectedPlace,setPlaceId]=useState(()=>PLACES.find(p=>p.id!==settings.placeId)?.id||'bund');
 const placeId=selectedPlace!==settings.placeId?selectedPlace:PLACES.find(p=>p.id!==settings.placeId)!.id;
 return <section className={styles.share}><div><b>{hasCompanion(settings)?'这个搭子，下一站还带上。':'下一站，继续做主角。'}</b><ShootHint label="下一站如何复用">新建独立拍摄，沿用本人、角色参考及服装。原作品保留，新地点参考另补。</ShootHint></div><label className={styles.nextPlace}>下一站<select value={placeId} disabled={disabled} onChange={e=>setPlaceId(e.target.value)}>{PLACES.filter(p=>p.id!==settings.placeId).map(p=><option key={p.id} value={p.id}>{p.city} · {p.name}</option>)}</select></label><button type="button" disabled={disabled} onClick={()=>onCreate(placeId)}>沿用参考，创建下一集<ArrowUpRight size={15}/></button></section>;
}

export function StoryPlanSummary({settings}:{settings:ShootSettings}){
 const story=storyFor(settings);if(!story)return null;
 return <div className={styles.planChips} aria-label="当前剧情设置"><b>{story.title}</b><span>{ENERGIES.find(x=>x.id===settings.story?.energy)?.label}</span><span>{CAMERAS.find(x=>x.id===settings.story?.camera)?.label}</span><span>{RELATIONSHIPS.find(x=>x.id===settings.story?.relationship)?.label}</span></div>;
}
