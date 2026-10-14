"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useMarketActorId, useMarketRequest } from "@/components/marketplace/account-boundary";
import { FOUR_VIEW_PRICE, FOUR_VIEW_ORDER, FOUR_VIEW_SIZES, type FourViewInput, type FourViewJob } from "@/contracts/four-view";
import styles from "./visual-tour-editor.module.css";
type Ratio=FourViewInput["aspectRatio"];
interface Config {available:boolean;costPoints:number;model:string;channel:string;}
function FourViewResult({job,onApply}:{job:FourViewJob;onApply:(files:File[])=>void}){
 const t=useTranslations("fourView"),actor=useMarketActorId();
 const [files,setFiles]=useState<File[]>([]),[urls,setUrls]=useState<string[]>([]),[confirmed,setConfirmed]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{const controller=new AbortController();let currentUrls:string[]=[];
  void Promise.all(FOUR_VIEW_ORDER.map(async name=>{
   const response=await fetch(`/api/visual-four-view-jobs/${job.id}/views/${name}`,{cache:"no-store",credentials:"same-origin",headers:{"x-ans-actor":actor??""},signal:controller.signal});
   if(!response.ok)throw new Error();const blob=await response.blob();if(blob.type!=="image/png"||blob.size===0||blob.size>20_000_000)throw new Error();return new File([blob],`${name}.png`,{type:"image/png"});
  })).then(values=>{if(controller.signal.aborted)return;currentUrls=values.map(file=>URL.createObjectURL(file));setFiles(values);setUrls(currentUrls);}).catch(()=>{if(!controller.signal.aborted)setFailed(true);});
  return()=>{controller.abort();currentUrls.forEach(url=>URL.revokeObjectURL(url));};
 },[actor,job.id]);
 return <div>
  {failed?<p role="alert">{t("loadFailed")}</p>:files.length!==4?<p role="status">{t("loading")}</p>:<>
   <div className={styles.generationViews}>{FOUR_VIEW_ORDER.map((name,index)=><figure key={name}><Image src={urls[index]} unoptimized width={240} height={170} className={styles.generationImage} alt={t(`views.${name}`)}/><figcaption>{t(`views.${name}`)}</figcaption></figure>)}</div>
   <p className={styles.note}>{t("reviewHint")}</p>
   <label className={styles.check}><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>{t("confirmViews")}</label>
   <Button variant="outline" disabled={!confirmed} onClick={()=>onApply([files[0],files[2],files[1],files[3]])}>{t("apply")}</Button>
  </>}
 </div>;
}
export function FourViewPreparation({file,onApply}:{file:File|null;onApply:(files:File[])=>void}){
 const t=useTranslations("fourView"),actor=useMarketActorId(),request=useMarketRequest();
 const [config,setConfig]=useState<Config|null>(null),[ratio,setRatio]=useState<Ratio>("1:1"),[ack,setAck]=useState<{file:File;ratio:Ratio}|null>(null),[jobs,setJobs]=useState<FourViewJob[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[selected,setSelected]=useState<string|null>(null);
 const identity=useRef<{file:File;ratio:Ratio;key:string}|null>(null);
 const acknowledged=!!file&&ack?.file===file&&ack.ratio===ratio;
 const alive=useRef(false),lock=useRef(false),controller=useRef<AbortController|null>(null);
 useEffect(()=>{alive.current=true;let stopped=false;let timer:ReturnType<typeof setTimeout>|undefined;
  const load=async()=>{try{
   const response=await fetch("/api/visual-four-view-jobs/config",{cache:"no-store"});const envelope=await response.json();if(!response.ok||!envelope.ok)throw new Error();if(!stopped)setConfig(envelope.data);
   if(actor){const list=await request<FourViewJob[]>("/api/visual-four-view-jobs","GET",undefined);if(!stopped)setJobs(list);}
  }catch{if(!stopped)setError(t("loadFailed"));}finally{if(!stopped&&actor)timer=setTimeout(load,5000);}};void load();
  return()=>{stopped=true;alive.current=false;clearTimeout(timer);controller.current?.abort();};
 // The enclosing account boundary remounts this component when the actor changes.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[actor]);
 async function generate(){if(lock.current||!actor||!file||!acknowledged||!config?.available)return;
  lock.current=true;setBusy(true);setError("");controller.current=new AbortController();if(identity.current?.file!==file||identity.current.ratio!==ratio)identity.current={file,ratio,key:crypto.randomUUID()};const body=new FormData();body.set("image",file);body.set("manifest",JSON.stringify({idempotencyKey:identity.current.key,aspectRatio:ratio,acknowledged:true,acceptedPoints:FOUR_VIEW_PRICE}));
  try{const response=await fetch("/api/visual-four-view-jobs",{method:"POST",credentials:"same-origin",headers:{"x-ans-actor":actor},body,signal:controller.current.signal});const envelope=await response.json();if(!response.ok||!envelope.ok)throw new Error(envelope.error?.code);if(!alive.current)return;
   setJobs(current=>[envelope.data,...current.filter(job=>job.id!==envelope.data.id)]);setAck(null);
   // Keep the same key until the input or ratio changes, including a lost acknowledgement.
  }catch(cause){if(alive.current)setError(t(cause instanceof Error&&cause.message==="INSUFFICIENT_QUOTA"?"insufficient":"requestFailed"));}finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 async function discard(id:string){if(lock.current)return;lock.current=true;setBusy(true);try{await request(`/api/visual-four-view-jobs/${id}`,"DELETE",undefined);if(alive.current){setJobs(current=>current.filter(job=>job.id!==id));if(selected===id)setSelected(null);}}catch{if(alive.current)setError(t("requestFailed"));}finally{lock.current=false;if(alive.current)setBusy(false);}}
 const [width,height]=FOUR_VIEW_SIZES[ratio],pending=jobs.filter(job=>["UPLOADING","QUEUED","RUNNING","NEEDS_REVIEW"].includes(job.status)).length;
 return <section aria-label={t("title")}>
  <h4>{t("title")}</h4><p className={styles.note}>{t("description")}</p>
  <fieldset disabled={busy} className={styles.generationFields}>
   <label className={styles.field}>{t("ratio")}<select value={ratio} onChange={event=>setRatio(event.target.value as Ratio)}>{(Object.keys(FOUR_VIEW_SIZES) as Ratio[]).map(value=><option key={value} value={value}>{value} · {FOUR_VIEW_SIZES[value].join(" × ")}</option>)}</select></label>
   <small>{t("dimensions",{width,height})}</small>
   {config?.available?<><label className={styles.check}><input type="checkbox" checked={acknowledged} onChange={event=>setAck(event.target.checked&&file?{file,ratio}:null)}/>{t("acknowledge",{points:FOUR_VIEW_PRICE})}</label><Button disabled={!file||!actor||!acknowledged||pending>=3} onClick={()=>void generate()}>{t(busy?"submitting":"generate")}</Button></>:<p role="status" className={styles.note}>{t("unavailable")}</p>}
  </fieldset>
  {error&&<p role="alert" className={styles.fieldError}>{error}</p>}
  {jobs.map(job=><article key={job.id} className={styles.generationJob}>
   <strong>{t(`statuses.${job.status}`)}</strong><small>{job.aspectRatio} · {new Date(job.createdAt).toLocaleString()}</small>
   {job.refunded&&<p>{t("refunded")}</p>}{job.status==="NEEDS_REVIEW"&&<p>{t(job.errorCode==="GRID_DIMENSIONS_INVALID"?"dimensionMismatch":"reviewNote")}</p>}
   {job.status==="SUCCEEDED"&&<><Button variant="ghost" size="sm" onClick={()=>setSelected(selected===job.id?null:job.id)}>{t(selected===job.id?"close":"preview")}</Button>{selected===job.id&&<FourViewResult job={job} onApply={onApply}/>}</>}
   {["QUEUED","SUCCEEDED","FAILED","CANCELLED"].includes(job.status)&&<Button variant="ghost" size="sm" disabled={busy} onClick={()=>void discard(job.id)}>{t("discard")}</Button>}
  </article>)}
 </section>;
}
