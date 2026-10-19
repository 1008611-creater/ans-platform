'use client';
/* Private original bytes bypass public image optimizers. */
/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { Copy, Download, Images } from 'lucide-react';
import type { ShootProject, PhotoResult } from '@/app/lib/shoot-contract';
import { placeFor } from '@/runtime/destinations.mjs';
import ShootHint from './shoot-hint';
import styles from './shoot-wall.module.css';
const BASE=process.env.NEXT_PUBLIC_BASE_PATH||'';
export default function ShootWall({projects,onOpen,onRemix,busy,compact=false}:{projects:ShootProject[];onOpen:(p:ShootProject,r:PhotoResult)=>void;onRemix:(p:ShootProject,r:PhotoResult)=>void;busy:boolean;compact?:boolean}){
 const [allVersions,setAllVersions]=useState(false);
 const photos=projects.flatMap(p=>p.results.filter(r=>allVersions||p.results.filter(x=>x.planRevision===r.planRevision&&x.shotId===r.shotId).at(-1)?.id===r.id).map(r=>({p,r}))).sort((a,b)=>b.r.createdAt-a.r.createdAt);
 const visible=compact?photos.slice(0,8):photos;
 return <section className={styles.wall} aria-label="我的私有作品墙"><div className={styles.heading}><div><h2>作品墙 <ShootHint label="作品墙与复刻说明">这里只展示当前浏览器的真实作品，不公开给其他用户。复刻会复制这张照片对应的拍摄计划和参考，新建独立项目；不复制成片、不自动生成。</ShootHint></h2></div>{!compact&&photos.length>0&&<button type="button" aria-pressed={allVersions} onClick={()=>setAllVersions(v=>!v)}>{allVersions?'收起历史版本':'查看所有版本'}</button>}</div>
 {!photos.length?<div className={styles.empty}><Images size={22} strokeWidth={1.4}/><div><b>你的第一张成片，会出现在这里。</b><span>先选下面的玩法，放入本人照片。</span></div></div>:<div className={styles.grid}>{visible.map(({p,r})=>{const settings=p.plans?.[r.planRevision]||p.settings;return <article key={r.id} className={styles.card}><button type="button" className={styles.photo} onClick={()=>onOpen(p,r)} aria-label={'查看'+settings.title+'第'+r.version+'版原图'}><img src={BASE+'/api/shoot/projects/'+p.id+'/assets/'+r.assetId} alt={settings.title+'真实生成作品'} width={r.width} height={r.height} loading="lazy"/><span className={styles.badge}>{r.shotId==='cover'?'封面':'成片'} · v{r.version}</span></button><div className={styles.caption}><b>{settings.title}</b><span>{placeFor(settings)?.name||'私人拍摄'}</span><div><button type="button" disabled={busy} onClick={()=>onRemix(p,r)}><Copy size={14}/>一键复刻</button><a href={BASE+'/api/shoot/projects/'+p.id+'/assets/'+r.assetId+'?download=1'} download aria-label={'下载'+settings.title+'第'+r.version+'版'}><Download size={15}/></a></div></div></article>;})}</div>}
 </section>;
}
