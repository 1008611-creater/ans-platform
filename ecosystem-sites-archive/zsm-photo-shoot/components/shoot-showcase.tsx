'use client';
/* eslint-disable @next/next/no-img-element */
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,X} from 'lucide-react';
import {SHOWCASE,type ShowcaseWork} from '@/runtime/showcase.mjs';
import {storySettings} from '@/runtime/recipe.mjs';
import type {ShootSettings} from '@/app/lib/shoot-contract';
import {PLACES} from '@/runtime/destinations.mjs';
import {characterName} from '@/runtime/characters.mjs';
import styles from './shoot-showcase.module.css';
const BASE=process.env.NEXT_PUBLIC_BASE_PATH||'';
export default function ShootShowcase({onCreate,busy}:{onCreate:(settings:ShootSettings)=>void;busy:boolean}){
 const [shown,setShown]=useState<ShowcaseWork|null>(null),dialog=useRef<HTMLDialogElement>(null),lastTrigger=useRef<HTMLElement|null>(null);
 useEffect(()=>{if(shown)dialog.current?.showModal();else dialog.current?.close();},[shown]);
 const close=()=>{setShown(null);lastTrigger.current?.focus();};
 const create=(work:ShowcaseWork)=>{close();onCreate(storySettings(work.storyId,{placeId:work.placeId,characterId:work.characterId}));};
 return <section className={styles.wall} aria-labelledby="public-wall-title"><div className={styles.heading}><div><h1 id="public-wall-title">作品墙</h1><p>看中哪张，就让自己当主角。</p></div>{SHOWCASE.length>0&&<span>AI 创作</span>}</div>
  {SHOWCASE.length>0?<div className={styles.grid}>{SHOWCASE.map((w,i)=><article key={w.id} className={styles.card}><button type="button" className={styles.photo} onClick={e=>{lastTrigger.current=e.currentTarget;setShown(w);}} aria-label={'查看'+w.title}><img src={BASE+w.src} alt={w.person+'与'+characterName(w)+'的AI创作合影，非真实事件'} width={w.width} height={w.height} loading={i<3?'eager':'lazy'}/><span>AI 创作</span></button><div className={styles.caption}><div><b>{w.title}</b><span>{w.person} × {characterName(w)} · {PLACES.find(p=>p.id===w.placeId)?.name}</span></div><button type="button" disabled={busy} onClick={()=>create(w)}>拍同款<ArrowUpRight size={15}/></button></div></article>)}</div>:<p className={styles.pending}>首批作品制作中。先挑一个玩法，准备你的照片。</p>}
  <dialog ref={dialog} className={styles.viewer} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}} onClose={()=>{if(shown)close();}} aria-label={shown?.title||'作品原图'}>{shown&&<><header><div><b>{shown.title}</b><p>AI 创作 · 虚构合影</p></div><button type="button" aria-label="关闭作品原图" onClick={close}><X size={20}/></button></header><img src={BASE+shown.src} alt={shown.title+' AI创作原图'} width={shown.width} height={shown.height}/><button className={styles.remix} type="button" disabled={busy} onClick={()=>create(shown)}>我也拍同款<ArrowUpRight size={17}/></button></>}</dialog>
 </section>;
}
