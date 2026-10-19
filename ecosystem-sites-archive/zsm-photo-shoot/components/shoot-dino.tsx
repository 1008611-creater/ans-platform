'use client';
/* eslint-disable @next/next/no-img-element */
import {useEffect,useId,useRef,useState} from 'react';
import {ArrowRight,Send,X} from 'lucide-react';
import type {DinoAction,DinoSnapshot} from '@/app/lib/shoot-dino';
import {dinoReply,guideQuestions,type GuideReply} from '@/app/lib/shoot-dino-chat';
import DinoAvatar from './shoot-dino-avatar';
import styles from './shoot-dino.module.css';
const BASE=process.env.NEXT_PUBLIC_BASE_PATH||'';
const ACTIONS=[{id:1,label:'打招呼',text:'在呢！一起拍点好玩的。'},{id:2,label:'想一想',text:'让我想想，这个搭子放在哪最有反差？'},{id:3,label:'拍一张',text:'看镜头，三、二、一，茄子！'},{id:4,label:'好耶',text:'好耶！想发出去的照片才值得留下。'},{id:5,label:'眯一会',text:'我眯一会儿，点我就醒。'}];
type Message={id:number;role:'user'|'dino';text:string;reply?:GuideReply};
export default function ShootDino({task,disabled,onAction,lifted=false}:{task:DinoSnapshot;disabled:boolean;lifted?:boolean;onAction:(action:DinoAction,targetId?:string)=>Promise<void>}){
 const [open,setOpen]=useState(false),[action,setAction]=useState(0),[text,setText]=useState(''),[messages,setMessages]=useState<Message[]>([]);
 const [paused,setPaused]=useState(false);
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),input=useRef<HTMLInputElement>(null),feed=useRef<HTMLDivElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),sequence=useRef(0),panelId=useId();
 const animate=(id:number)=>{if(timer.current)clearTimeout(timer.current);setAction(id);timer.current=setTimeout(()=>setAction(0),2100);};
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 useEffect(()=>{if(!open)return;if(window.matchMedia('(pointer: fine)').matches)input.current?.focus({preventScroll:true});const outside=(e:PointerEvent)=>{if(e.target instanceof Node&&!root.current?.contains(e.target))setOpen(false);};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};},[open]);
 useEffect(()=>{feed.current?.scrollTo({top:feed.current.scrollHeight,behavior:'instant'});},[messages,open]);
 const add=(message:Omit<Message,'id'>)=>setMessages(m=>[...m.slice(-15),{...message,id:++sequence.current}]);
 const send=(value=text)=>{if(!value.trim())return;const reply=dinoReply(value,task);setMessages(m=>[...m.slice(-14),{id:++sequence.current,role:'user',text:value.trim().slice(0,300)},{id:++sequence.current,role:'dino',text:reply.text,reply}]);setText('');animate(reply.animation);input.current?.focus();};
 const act=(a:DinoAction,target?:string)=>{setOpen(false);void onAction(a,target);};
 return <div ref={root} className={styles.guide+(lifted?' '+styles.lifted:'')} data-task-state={task.phase}>
  {open&&<section id={panelId} className={styles.panel} role="region" aria-labelledby={panelId+'-title'}>
   <header className={styles.header}><div><img src={BASE+'/mascot/vibe-dino.svg?v=19'} width={48} height={53} alt=""/><span><b id={panelId+'-title'}>小恐龙</b><small>一起把脑洞拍出来</small></span></div><button type="button" aria-label="收起小恐龙" onClick={()=>{setOpen(false);trigger.current?.focus();}}><X size={18}/></button></header>
   <div className={styles.conversation} ref={feed} role="log" aria-live="polite" aria-relevant="additions">
    <div className={styles.bubble}><b>{task.title}</b><p>{task.message}</p><button type="button" disabled={disabled} onClick={()=>act(task.action,task.targetId)}>{task.actionLabel}<ArrowRight size={14}/></button></div>
    {messages.map(m=><div key={m.id} className={m.role==='user'?styles.userBubble:styles.bubble}><p>{m.text}</p>{m.reply?.action&&<button type="button" disabled={disabled} onClick={()=>act(m.reply!.action!,m.reply!.targetId)}>{m.reply.label}<ArrowRight size={14}/></button>}</div>)}
   </div>
   <div className={styles.chips} aria-label="快捷提问">{guideQuestions(task).map(q=><button type="button" key={q} onClick={()=>send(q)}>{q}</button>)}</div>
   <form className={styles.chatForm} onSubmit={e=>{e.preventDefault();send();}}><label className={styles.srOnly} htmlFor={panelId+'-input'}>问小恐龙</label><input id={panelId+'-input'} name="guide-question" ref={input} value={text} onChange={e=>setText(e.target.value)} maxLength={300} placeholder="问我怎么拍、怎么保存…" autoComplete="off"/><button type="submit" disabled={!text.trim()} aria-label="发送问题"><Send size={17}/></button></form>
   <details className={styles.play}><summary>逗逗它 <span>5 个小动作</span></summary><div>{ACTIONS.map(a=><button type="button" key={a.id} onClick={()=>{setPaused(false);animate(a.id);add({role:'dino',text:a.text});}}>{a.label}</button>)}<button type="button" aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?'继续动起来':'暂停动画'}</button></div></details>
  </section>}
  <button ref={trigger} className={styles.trigger} type="button" aria-controls={open?panelId:undefined} aria-expanded={open} aria-label={open?'收起小恐龙':'和小恐龙聊聊'} onPointerEnter={()=>{if(!open&&!paused)animate(1);}} onFocus={()=>{if(!open&&!paused)animate(1);}} onClick={()=>{setOpen(v=>!v);animate(1);}}><span className={styles.invite} aria-hidden="true">{open?'我在呢':'需要搭把手？'}</span><DinoAvatar action={action} paused={paused}/></button>
 </div>;
}
