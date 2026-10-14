"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { useMarketActorId, useMarketRequest } from "@/components/marketplace/account-boundary";
import { DEFAULT_TRIPO_OPTIONS, IMAGE_LIMIT, type TripoOptions, type ModelAssetRef, type ModelJobView } from "@/contracts/visual-generation";
import styles from "./visual-tour-editor.module.css";
interface GenerationConfig { available:boolean; costPoints:number|null; }
const active=(job:ModelJobView)=>["QUEUED","RUNNING"].includes(job.status);
export function VisualModelGeneration({projectId,onApply}:{projectId?:string;onApply:(asset:ModelAssetRef)=>void}){
 const t=useTranslations("visualGeneration"),actor=useMarketActorId(),request=useMarketRequest();
 const [config,setConfig]=useState<GenerationConfig|null>(null),[file,setFile]=useState<File|null>(null),[imageUrl,setImageUrl]=useState("");
 const [options,setOptions]=useState<TripoOptions>(DEFAULT_TRIPO_OPTIONS),[ack,setAck]=useState(false),[jobs,setJobs]=useState<ModelJobView[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[connectionFailed,setConnectionFailed]=useState(false);
 const manifestKey=useRef(crypto.randomUUID()),alive=useRef(true),controller=useRef<AbortController|null>(null),lock=useRef(false);
 useEffect(()=>{alive.current=true;let cancelled=false;let timer:ReturnType<typeof setTimeout>|undefined;
  const load=async()=>{try{const cfg=await fetch("/api/visual-model-jobs/config",{cache:"no-store"}).then(r=>r.json());if(!cancelled)setConfig(cfg.data);
   if(actor){const list=await request<ModelJobView[]>("/api/visual-model-jobs","GET",undefined);if(!cancelled)setJobs(list);}
   if(!cancelled)setConnectionFailed(false);
  }catch{if(!cancelled)setConnectionFailed(true);}finally{if(!cancelled&&actor)timer=setTimeout(load,5000);}};void load();
  return()=>{cancelled=true;alive.current=false;clearTimeout(timer);controller.current?.abort();};
 // The actor boundary aborts private requests on account switch/unmount.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[actor]);
 useEffect(()=>{if(!file){setImageUrl("");return;}const url=URL.createObjectURL(file);setImageUrl(url);return()=>URL.revokeObjectURL(url);},[file]);
 function revise(next:TripoOptions){setOptions(next);setAck(false);manifestKey.current=crypto.randomUUID();}
 async function generate(){if(lock.current||!actor||!file||!ack||!config?.available||config.costPoints===null)return;
  lock.current=true;setBusy(true);setError("");controller.current=new AbortController();
  const body=new FormData();body.set("image",file);body.set("manifest",JSON.stringify({idempotencyKey:manifestKey.current,...(projectId?{projectId}:{}),acknowledged:true,acceptedPoints:config.costPoints,options}));
  try{const response=await fetch("/api/visual-model-jobs",{method:"POST",body,credentials:"same-origin",headers:{"x-ans-actor":actor},signal:controller.current.signal});const envelope=await response.json();
   if(!response.ok||!envelope.ok)throw new Error(envelope.error?.code||"REQUEST_FAILED");if(!alive.current)return;
   setJobs(current=>[envelope.data,...current.filter(job=>job.id!==envelope.data.id)]);setAck(false);manifestKey.current=crypto.randomUUID();
  }catch(cause){if(alive.current)setError(t(cause instanceof Error&&cause.message==="INSUFFICIENT_QUOTA"?"insufficient":cause instanceof Error&&cause.message==="PRICE_CHANGED"?"priceChanged":"requestFailed"));}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 async function cancel(id:string){try{const job=await request<ModelJobView>(`/api/visual-model-jobs/${id}`,"DELETE",undefined);if(alive.current)setJobs(current=>current.map(value=>value.id===id?job:value));}catch{if(alive.current)setError(t("requestFailed"));}}
 return <div className={styles.generation}>
  <h3>{t("title")}</h3><p className={styles.note}>{t("description")}</p>
  {!actor?<WorkspaceLink href="/login?callbackUrl=%2Fmarket%2Fresume-website">{t("login")}</WorkspaceLink>:<>
   <label className={styles.field}>{t("image")}<Input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>{const next=event.target.files?.[0];if(next&&next.size<=IMAGE_LIMIT){setFile(next);setError("");}else{setFile(null);setError(t("imageLimit"));event.target.value="";}setAck(false);manifestKey.current=crypto.randomUUID();}}/></label>
   {imageUrl&&<Image unoptimized width={240} height={170} className={styles.generationImage} src={imageUrl} alt={t("selectedImage")}/>}
   <p className={styles.note}>P2.0 · Preview</p>
   <label className={styles.field}>{t("faces")}<Input type="number" min={500} max={25000} step={100} value={options.faceCount} onChange={e=>revise({...options,faceCount:Number(e.target.value)})}/></label>
   <label className={styles.check}><input type="checkbox" checked={options.texture} onChange={e=>revise({...options,texture:e.target.checked})}/>{t("texture")}</label>
   {options.texture&&<><label className={styles.field}>{t("resolution")}<select value={options.textureResolution} onChange={e=>revise({...options,textureResolution:e.target.value as "2K"|"4K"})}><option>2K</option><option>4K</option></select></label><label className={styles.check}><input type="checkbox" checked={options.pbr} onChange={e=>revise({...options,pbr:e.target.checked})}/>{t("pbr")}</label></>}
   {config?.available?<><p>{t("price",{points:config.costPoints??0})}</p><label className={styles.check}><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>{t("acknowledge")}</label></>:<p className={styles.note}>{t("unavailable")}</p>}
   <Button onClick={()=>void generate()} disabled={busy||!ack||!file||!config?.available||jobs.filter(job=>active(job)||job.status==="NEEDS_REVIEW").length>=3||!Number.isInteger(options.faceCount)||options.faceCount<500||options.faceCount>25000}>{t(busy?"submitting":"generate")}</Button>
   <p className={styles.note}>{t("cancelNote")}</p>
  </>}
  {error&&<p role="alert" className={styles.note}>{error}</p>}
  {connectionFailed&&<p role="status" className={styles.note}>{t("connectionFailed")}</p>}
  {jobs.map(job=><article className={styles.generationJob} key={job.id}>
   <strong>{t(`statuses.${job.status}`)}</strong><small>{new Date(job.createdAt).toLocaleString()}</small>
   <progress value={job.progress} max={100} aria-label={t("progress")}/>
   {active(job)&&<p>{t(`stages.${job.stage}`)}</p>}{job.status==="NEEDS_REVIEW"&&<p>{t("reviewNote")}</p>}
   {job.errorCode&&job.status!=="NEEDS_REVIEW"&&<p>{t("failedNote")}</p>}{job.refunded&&<p>{t("refunded")}</p>}
   {job.asset&&<Button variant="outline" size="sm" onClick={()=>onApply(job.asset!)}>{t("apply")}</Button>}
   {active(job)&&!job.cancelRequested&&<Button variant="ghost" size="sm" onClick={()=>void cancel(job.id)}>{t("cancel")}</Button>}{job.cancelRequested&&<p>{t("cancelRequested")}</p>}
  </article>)}
 </div>;
}
