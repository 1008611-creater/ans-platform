'use client';
/* Private originals must not pass through a public image optimizer. */
/* eslint-disable @next/next/no-img-element */
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Download,X,Columns2,Pencil,LoaderCircle,RefreshCw} from 'lucide-react';
import type {PhotoResult,ShootProject,ShotId} from '@/app/lib/shoot-contract';
import {SHOTS} from '@/runtime/recipe.mjs';
import {shotsFor} from '@/runtime/destinations.mjs';
import styles from './shoot-studio.module.css';
const BASE=process.env.NEXT_PUBLIC_BASE_PATH||'';
const source=(p:ShootProject,r:PhotoResult)=>BASE+'/api/shoot/projects/'+p.id+'/assets/'+r.assetId;
function OriginalPhoto({src,alt,width,height}:{src:string;alt:string;width:number;height:number}){
 const [state,setState]=useState<'loading'|'ready'|'error'>('loading'),[retry,setRetry]=useState(0);
 return <div className={styles.originalPhoto}><img src={src+(retry?'?reload='+retry:'')} alt={alt} width={width} height={height} onLoad={()=>setState('ready')} onError={()=>setState('error')}/>{state!=='ready'&&<div className={styles.imageFeedback} role="status">{state==='loading'?<><LoaderCircle size={20} className={styles.spin}/><span>正在载入原图…</span></>:<><span>图片暂时无法载入</span><button onClick={()=>{setState('loading');setRetry(v=>v+1);}}><RefreshCw size={16}/>重新载入</button></>}</div>}</div>;
}
export default function ShootViewer({project,result,revision,onClose,onSelect,onVersion,onEdit}:{project:ShootProject;result:PhotoResult;revision:number;onClose:()=>void;onSelect:(shot:ShotId)=>void;onVersion:(id:string)=>void;onEdit:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),[compare,setCompare]=useState(false);
 const versions=project.results.filter(r=>r.shotId===result.shotId&&r.planRevision===revision);
 const previous=project.results.find(r=>r.id===result.parentResultId)||versions.filter(r=>r.version<result.version).at(-1);
 const settings=project.plans?.[revision]||project.settings,shots=shotsFor(settings,SHOTS);
 const available=shots.filter(s=>project.results.some(r=>r.shotId===s.id&&r.planRevision===revision));
 const index=available.findIndex(s=>s.id===result.shotId),shot=shots.find(s=>s.id===result.shotId)!;
 const move=(delta:number)=>{const next=available[(index+delta+available.length)%available.length];if(next){setCompare(false);onSelect(next.id);}};
 useEffect(()=>{const element=dialog.current;const before=document.activeElement as HTMLElement|null;element?.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{element?.close();document.body.style.overflow=overflow;before?.focus();};},[]);
 return <dialog ref={dialog} className={styles.viewer} aria-labelledby="viewer-title" onClick={e=>{if(e.target!==e.currentTarget)return;const box=e.currentTarget.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)onClose();}} onCancel={e=>{e.preventDefault();onClose();}} onKeyDown={e=>{if((e.target as HTMLElement).matches('input,textarea,select'))return;if(e.key==='ArrowRight'){e.preventDefault();move(1);}if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}}}>
  <header className={styles.viewerHeader}><div><p>THE EDIT / {String(index+1).padStart(2,'0')} / {String(available.length).padStart(2,'0')} · {settings.title}</p><h2 id="viewer-title">{shot.name} <span>第{result.version}版</span></h2></div><button aria-label="关闭大图" onClick={onClose}><X size={22}/></button></header>
  <div className={styles.viewerTools}>{versions.length>1&&<label>查看版本<select value={result.id} onChange={e=>{setCompare(false);onVersion(e.target.value);}}>{versions.map(r=><option key={r.id} value={r.id}>第{r.version}版{r.parentResultId?' · 修改':' · 原片'}</option>)}</select></label>}{previous&&<button aria-pressed={compare&&!!previous} disabled={!previous} onClick={()=>setCompare(v=>!v)}><Columns2 size={17}/>{compare&&previous?'结束对比':'与修改前对比'}</button>}<span>{result.width} × {result.height} · 原始比例</span></div>
  <div className={compare&&previous?styles.compareStage:styles.viewerStage}>
   {compare&&previous&&<figure><div className={styles.viewerImage}><OriginalPhoto key={previous.id} src={source(project,previous)} alt={'修改前，第'+previous.version+'版'} width={previous.width} height={previous.height}/></div><figcaption>修改前 · 第{previous.version}版</figcaption></figure>}
   <figure><div className={styles.viewerImage}><OriginalPhoto key={result.id} src={source(project,result)} alt={shot.name+'，第'+result.version+'版'} width={result.width} height={result.height}/></div><figcaption>{compare&&previous?'修改后':'当前查看'} · 第{result.version}版{result.review?.accepted?' · 已认可':''}</figcaption></figure>
  </div>
  <footer className={styles.viewerFooter}><div><button aria-label="上一张照片" onClick={()=>move(-1)} disabled={available.length<2}><ArrowLeft size={18}/></button><span>{index+1} / {available.length}</span><button aria-label="下一张照片" onClick={()=>move(1)} disabled={available.length<2}><ArrowRight size={18}/></button></div><div><a href={source(project,result)+'?download=1'} download><Download size={17}/><span>保存原图</span></a><button onClick={onEdit}><Pencil size={17}/>评价与修改</button></div></footer>
  <p className={styles.viewerHint}>左右方向键切换照片 · Esc 关闭 · 对比不会覆盖原片</p>
 </dialog>;
}
