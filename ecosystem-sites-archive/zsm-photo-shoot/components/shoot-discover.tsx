'use client';
/* eslint-disable @next/next/no-img-element */
import { useState, type RefObject } from 'react';
import { ArrowUpRight, Utensils, ArrowRight, MapPin, Search } from 'lucide-react';
import { PLACES, PLAYBOOKS, type Place } from '@/runtime/destinations.mjs';
import type { ShootSettings } from '@/app/lib/shoot-contract';
import { storySettings } from '@/runtime/recipe.mjs';
import { adaptStory } from '@/runtime/stories.mjs';
import { StoryDeck } from './shoot-stories';
import CharacterLibrary from './shoot-characters';
import { characterName } from '@/runtime/characters.mjs';
import ShootHint from './shoot-hint';
import styles from './shoot-discover.module.css';
const BASE=process.env.NEXT_PUBLIC_BASE_PATH||'';
type Play='companion'|'solo';
export function PlaceSource({place}:{place:Place}) {return <ShootHint label={place.name+'地点与图片来源'}><p>{place.address}</p><a href={place.source} target="_blank" rel="noreferrer">地点资料 ↗</a>{place.photo&&<p><a href={place.photoSource!} target="_blank" rel="noreferrer">{place.credit}</a> · <a href={place.license!} target="_blank" rel="noreferrer">许可</a><br/>{place.photoNote}。资料图仅供选址，不是生成成片；不会自动发送给模型。</p>}{!place.photo&&<p>{place.photoNote}</p>}<p>地点名称不代表场地方合作。</p></ShootHint>;}
export default function ShootDiscover({onCreate,onStoryCreate,remix,busy,heading}:{onStoryCreate:(settings:ShootSettings)=>void;remix?:ShootSettings;onCreate:(place:string,play:Play,characterId:string)=>void;busy:boolean;heading:RefObject<HTMLHeadingElement|null>}){
 const [query,setQuery]=useState('');
 const [play,setPlay]=useState<Play>(remix?.play==='solo'?'solo':'companion'),[filter,setFilter]=useState('all'),[chosen,setChosen]=useState<ShootSettings>(()=>remix||storySettings('scene-stealer'));
 const characterId=chosen.characterId||'naiwa';
 const createPlace=(placeId:string)=>{const story=adaptStory(chosen,placeId,play);if(story)onStoryCreate(storySettings(story.id,{placeId,characterId,story}));else onCreate(placeId,play,characterId);};
 const places=PLACES.filter(p=>(filter==='all'||(filter==='restaurant'?p.kind==='restaurant':p.region===filter))&&(!query.trim()||[p.name,p.city,p.country,p.english].join(' ').toLowerCase().includes(query.trim().toLowerCase())));
 return <div className={styles.discover}>
  <section className={styles.topline}><div><h2 ref={heading} tabIndex={-1}>挑个玩法，<em>主角是你。</em></h2></div><span className={styles.simpleStep}>选玩法 → 放照片 → 看计划</span></section>
  <StoryDeck onCreate={onStoryCreate} busy={busy} chosen={chosen} imported={!!remix} onChange={s=>{setChosen(s);setPlay('companion');}}/>
  <details className={styles.customize}><summary>自己搭配角色与地点 <span>{PLACES.length} 个地点 · 换个玩法</span></summary>
  <CharacterLibrary value={characterId} onChange={id=>{setChosen(s=>({...s,characterId:id}));setPlay('companion');}} disabled={busy}/>
  <section className={styles.explore} aria-labelledby="explore-heading"><div className={styles.sectionHeading}><div><p className={styles.kicker}>PICK YOUR NEXT SCENE</p><h2 id="explore-heading">下一张，在哪整活？</h2></div><span>{PLACES.length} 个真实地点</span></div>
   <div className={styles.playbooks} aria-label="选择拍法">{PLAYBOOKS.map(p=><button key={p.id} aria-pressed={play===p.id} onClick={()=>setPlay(p.id)}><span>{p.id==='companion'?'01':'02'}</span><div><b>{p.name}</b></div><span>{play===p.id?'已选':'选择'}<ArrowUpRight size={16}/></span></button>)}</div>
   <label className={styles.search}><Search size={16}/><input aria-label="搜索真实地点" placeholder="搜城市、地标或餐厅" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className={styles.filters} aria-label="筛选地点">{[['all','全部地点'],['domestic','国内出片'],['overseas','海外打卡'],['restaurant','今晚吃点好的']].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}<span aria-live="polite">{places.length} 个地点</span></div>
   <div className={styles.places}>{!places.length&&<p role="status">没找到这个地点，试试城市名。</p>}{places.map(p=><article key={p.id} className={styles.card}><button className={styles.cardAction} disabled={busy} onClick={()=>createPlace(p.id)} aria-label={'选择'+p.name+'，'+(play==='companion'?'带'+characterName({characterId})+'出门':'我就是主角')}><div className={styles.cardImage}>{p.photo?<img src={BASE+'/places/'+p.photo} alt={p.name+'地标资料照，非生成样片'} width={p.width||1280} height={p.height||960} loading="lazy"/>:<div className={styles.restaurant}>{p.kind==='restaurant'?<Utensils size={26} strokeWidth={1}/>:<MapPin size={26} strokeWidth={1}/>} <span>{p.city} / {p.country}</span><strong>{p.english}</strong><small>{p.kind==='restaurant'?'需餐厅实景参考':'可选址 · 实景图待补'}</small></div>}<span className={styles.cardTag}>{p.country} · {p.city}</span>{p.photo&&<span className={styles.cardPhotoNote}>地标资料照</span>}</div><div className={styles.cardCopy}><p>{p.name}<ArrowUpRight size={18}/></p><span>在这里拍<ArrowRight size={15}/></span></div></button><div className={styles.cardSource}><PlaceSource place={p}/></div></article>)}</div>
  </section>
  </details>
 </div>;
}
