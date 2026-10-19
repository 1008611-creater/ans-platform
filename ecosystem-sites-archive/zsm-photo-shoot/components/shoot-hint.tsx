'use client';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import styles from './shoot-hint.module.css';
export default function ShootHint({label,children}:{label:string;children:ReactNode}){
 const [open,setOpen]=useState(false),id=useId(),trigger=useRef<HTMLButtonElement>(null),content=useRef<HTMLSpanElement>(null),root=useRef<HTMLSpanElement>(null),[position,setPosition]=useState({left:12,top:12});
 useLayoutEffect(()=>{if(!open||!trigger.current)return;const anchor=trigger.current.getBoundingClientRect(),width=Math.min(280,window.innerWidth-24),height=content.current?.getBoundingClientRect().height||120;setPosition({left:Math.max(12,Math.min(anchor.left,window.innerWidth-width-12)),top:Math.max(12,anchor.bottom+height+8<window.innerHeight?anchor.bottom+5:anchor.top-height-5)});},[open]);
 useEffect(()=>{if(!open)return;const close=()=>setOpen(false);const outside=(e:PointerEvent)=>{if(e.target instanceof Node&&!root.current?.contains(e.target))close();};document.addEventListener('pointerdown',outside);window.addEventListener('resize',close);window.addEventListener('scroll',close,true);return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',close);window.removeEventListener('scroll',close,true);};},[open]);
 return <span ref={root} className={styles.hint} onPointerEnter={e=>{if(e.pointerType==='mouse')setOpen(true);}} onPointerLeave={e=>{if(e.pointerType==='mouse')setOpen(false);}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus();e.stopPropagation();}}}>
  <button ref={trigger} type="button" aria-label={label} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(v=>!v)}><Info size={15} aria-hidden="true"/></button>
  {open&&<span ref={content} id={id} style={position} className={styles.content} role="region" aria-label={label}>{children}</span>}
 </span>;
}
