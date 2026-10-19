'use client';
/* eslint-disable @next/next/no-img-element */
import {useEffect,useRef,useState} from 'react';
import type {Rive} from '@rive-app/canvas';
const BASE=process.env.NEXT_PUBLIC_BASE_PATH||'';
export default function DinoAvatar({action=0,paused=false}:{action?:number;paused?:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null),runtime=useRef<Rive|null>(null),actionRef=useRef(action);
 const [loaded,setLoaded]=useState(false);
 const pausedRef=useRef(paused);
 useEffect(()=>{pausedRef.current=paused;const r=runtime.current;if(!r)return;if(paused||document.hidden||window.matchMedia('(prefers-reduced-motion: reduce)').matches)r.pause();else r.play();},[paused]);
 useEffect(()=>{actionRef.current=action;const r=runtime.current,p=r?.viewModelInstance?.number('action');if(p)p.value=action;},[action]);
 useEffect(()=>{
  let disposed=false,raf=0;const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let r:Rive|null=null;
  const sync=()=>{if(!r)return;if(document.hidden||motion.matches||pausedRef.current)r.pause();else r.play();};
  const move=(e:PointerEvent)=>{if(motion.matches||document.hidden||pausedRef.current||!r||raf)return;const x=e.clientX,y=e.clientY;raf=requestAnimationFrame(()=>{raf=0;const box=canvas.current?.getBoundingClientRect(),v=r?.viewModelInstance;if(!box||!v)return;const px=v.number('lookX'),py=v.number('lookY');if(px)px.value=Math.max(-4,Math.min(4,(x-box.left-box.width/2)/70));if(py)py.value=-119+Math.max(-3,Math.min(3,(y-box.top-box.height/2)/70));});};
  const reset=()=>{const v=r?.viewModelInstance,px=v?.number('lookX'),py=v?.number('lookY');if(px)px.value=0;if(py)py.value=-119;};
  void import('@rive-app/canvas').then(({Rive,RuntimeLoader})=>{
   if(disposed||!canvas.current)return;
   RuntimeLoader.setWasmUrl(BASE+'/mascot/rive.wasm');
   r=new Rive({src:BASE+'/mascot/vibe-dino.riv?v=19',canvas:canvas.current,stateMachine:'Dino',autoplay:!motion.matches,autoBind:true,
    onLoad:()=>{if(disposed||!r)return;runtime.current=r;r.resizeDrawingSurfaceToCanvas();const p=r.viewModelInstance?.number('action');if(p)p.value=actionRef.current;setLoaded(true);sync();},onLoadError:()=>{if(!disposed)setLoaded(false);}});
  }).catch(()=>{if(!disposed)setLoaded(false);});
  window.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerleave',reset);document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);
  return()=>{disposed=true;cancelAnimationFrame(raf);window.removeEventListener('pointermove',move);document.removeEventListener('pointerleave',reset);document.removeEventListener('visibilitychange',sync);motion.removeEventListener('change',sync);runtime.current=null;r?.cleanup();};
 },[]);
 return <span style={{display:'block',position:'relative',width:96,height:106}} data-dino-renderer={loaded?'rive':'svg'}><img src={BASE+'/mascot/vibe-dino.svg?v=19'} width={96} height={106} alt="" aria-hidden="true" style={{position:'absolute',inset:0,visibility:loaded?'hidden':'visible'}}/><canvas ref={canvas} aria-hidden="true" width={192} height={212} style={{display:'block',width:96,height:106,visibility:loaded?'visible':'hidden'}}/></span>;
}
