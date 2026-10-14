"use client";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { useMarketActorId, useMarketRequest } from "@/components/marketplace/account-boundary";
import { DEFAULT_TRIPO_OPTIONS, IMAGE_LIMIT, TRIPO_MODELS, tripoOptionsSchema, tripoFaceLimit, generationPrice, type GenerationConfig, type TripoOptions, type ModelAssetRef, type ModelJobView } from "@/contracts/visual-generation";
import { FourViewPreparation } from "./four-view-preparation";
import { VisualModelPreview } from "./visual-model-preview";
import styles from "./visual-tour-editor.module.css";
const active=(job:ModelJobView)=>["QUEUED","RUNNING"].includes(job.status);
export function VisualModelGeneration({projectId,onApply}:{projectId?:string;onApply:(asset:ModelAssetRef)=>void}){
 const t=useTranslations("visualGeneration"),actor=useMarketActorId(),request=useMarketRequest();
 const [config,setConfig]=useState<GenerationConfig|null>(null),[files,setFiles]=useState<Array<File|null>>([null,null,null,null]),[urls,setUrls]=useState<string[]>([]),[prompt,setPrompt]=useState("");
 const [options,setOptions]=useState<TripoOptions>(DEFAULT_TRIPO_OPTIONS),[ack,setAck]=useState(false),[jobs,setJobs]=useState<ModelJobView[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[connectionFailed,setConnectionFailed]=useState(false);
 const [downloading,setDownloading]=useState<string|null>(null);
 const acknowledgedCost=useRef<number|null>(null);
 const [previewAsset,setPreviewAsset]=useState<ModelAssetRef|null>(null);
 const manifestKey=useRef(crypto.randomUUID()),alive=useRef(true),controller=useRef<AbortController|null>(null),lock=useRef(false),epoch=useRef(0);
 const model=TRIPO_MODELS.find(item=>item.id===options.model)!;
 const faceLimit=tripoFaceLimit(options);
 const cost=config?generationPrice(config,options):null;
 const validInput=options.source==="text"?!!prompt.trim():options.source==="multiview"?!!files[0]&&files.filter(Boolean).length>=2:!!files[0];
 const canGenerate=!!actor&&!!config?.available&&cost!==null&&validInput&&ack&&acknowledgedCost.current===cost&&tripoOptionsSchema.safeParse(options).success&&jobs.filter(job=>active(job)||job.status==="NEEDS_REVIEW").length<3;
 useEffect(()=>{alive.current=true;const currentEpoch=++epoch.current;let cancelled=false;let timer:ReturnType<typeof setTimeout>|undefined;
  setJobs([]);setConfig(null);setAck(false);setError("");setPreviewAsset(null);setBusy(false);setDownloading(null);
  const load=async()=>{try{const response=await fetch("/api/visual-model-jobs/config",{cache:"no-store"});const cfg=await response.json();if(!response.ok||!cfg.ok)throw new Error();if(!cancelled)setConfig(cfg.data);
   if(actor){const list=await request<ModelJobView[]>("/api/visual-model-jobs","GET",undefined);if(!cancelled)setJobs(list);}
   if(!cancelled)setConnectionFailed(false);
  }catch{if(!cancelled)setConnectionFailed(true);}finally{if(!cancelled&&actor)timer=setTimeout(load,5000);}};void load();
  return()=>{cancelled=true;if(epoch.current===currentEpoch)alive.current=false;clearTimeout(timer);controller.current?.abort();};
 // Account-bound private requests are cancelled by the enclosing boundary.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[actor]);
 useEffect(()=>{const next=files.map(file=>file?URL.createObjectURL(file):"");setUrls(next);return()=>next.forEach(url=>{if(url)URL.revokeObjectURL(url);});},[files]);
 function invalidate(){setAck(false);manifestKey.current=crypto.randomUUID();}
 function revise(next:TripoOptions){setOptions(next);invalidate();}
 function chooseModel(id:TripoOptions["model"]){const next=TRIPO_MODELS.find(item=>item.id===id)!;const selection={...options,model:id,quad:false,geometryQuality:next.family==="detail"&&id!=="v2.5-20250123"?options.geometryQuality:"standard" as const,textureResolution:id==="v2.5-20250123"?"2K" as const:options.textureResolution,generateParts:false};revise({...selection,faceCount:Math.max(next.minFaces,Math.min(options.faceCount,tripoFaceLimit(selection)))});}
 function upload(event:ChangeEvent<HTMLInputElement>,index:number){const file=event.target.files?.[0]??null;const valid=!file||(file.size>0&&file.size<=IMAGE_LIMIT&&["image/png","image/jpeg","image/webp"].includes(file.type));setFiles(previous=>previous.map((value,i)=>i===index&&valid?file:i===index?null:value));setError(valid?"":t("imageLimit"));event.target.value="";invalidate();}
 async function generate(){if(lock.current||!canGenerate||!actor||cost===null)return;
  lock.current=true;setBusy(true);setError("");controller.current=new AbortController();const currentEpoch=epoch.current;
  const body=new FormData();if(options.source==="image")body.set("image",files[0]!);if(options.source==="multiview")files.forEach((file,index)=>{if(file)body.set(`image${index}`,file);});
  body.set("manifest",JSON.stringify({idempotencyKey:manifestKey.current,...(projectId?{projectId}:{}),acknowledged:true,acceptedPoints:cost,options,...(options.source==="text"?{prompt:prompt.trim()}:{})}));
  try{const response=await fetch("/api/visual-model-jobs",{method:"POST",body,credentials:"same-origin",headers:{"x-ans-actor":actor},signal:controller.current.signal});const envelope=await response.json();
   if(!response.ok||!envelope.ok)throw new Error(envelope.error?.code||"REQUEST_FAILED");if(!alive.current||currentEpoch!==epoch.current)return;
   setJobs(current=>[envelope.data,...current.filter(job=>job.id!==envelope.data.id)]);invalidate();
  }catch(cause){if(alive.current&&currentEpoch===epoch.current)setError(t(cause instanceof Error&&cause.message==="INSUFFICIENT_QUOTA"?"insufficient":cause instanceof Error&&cause.message==="PRICE_CHANGED"?"priceChanged":"requestFailed"));}
  finally{lock.current=false;if(alive.current&&currentEpoch===epoch.current)setBusy(false);}
 }
 async function cancel(id:string){const currentEpoch=epoch.current;try{const job=await request<ModelJobView>(`/api/visual-model-jobs/${id}`,"DELETE",undefined);if(alive.current&&epoch.current===currentEpoch)setJobs(current=>current.map(value=>value.id===id?job:value));}catch{if(alive.current&&epoch.current===currentEpoch)setError(t("requestFailed"));}}
 async function download(asset:ModelAssetRef){if(downloading)return;const currentEpoch=epoch.current;setDownloading(asset.id);setError("");
  try{const access=await request<{url:string}>(`/api/visual-model-assets/${asset.id}`,"GET",undefined);const url=new URL(access.url,window.location.origin);if(url.origin!==window.location.origin)throw new Error();
   const response=await fetch(url,{cache:"no-store"});if(!response.ok)throw new Error();const bytes=await response.arrayBuffer();const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),value=>value.toString(16).padStart(2,"0")).join("");
   if(bytes.byteLength!==asset.size||hash!==asset.sha256||!alive.current||epoch.current!==currentEpoch)throw new Error();
   const objectUrl=URL.createObjectURL(new Blob([bytes],{type:"model/gltf-binary"}));const anchor=document.createElement("a");anchor.href=objectUrl;anchor.download=`ans-model-${asset.id}.glb`;anchor.click();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
  }catch{if(alive.current&&epoch.current===currentEpoch)setError(t("downloadFailed"));}finally{if(alive.current&&epoch.current===currentEpoch)setDownloading(null);}
 }
 return <div className={styles.generation}>
  <h3>{t("title")}</h3><p className={styles.note}>{t("description")}</p>
  {!actor?<WorkspaceLink href="/login?callbackUrl=%2Fmarket%2Fresume-website">{t("login")}</WorkspaceLink>:<fieldset disabled={busy} className={styles.generationFields}>
   <div className={styles.generationModes} role="group" aria-label={t("source")}>
    {(["image","text","multiview"] as const).map(source=><Button key={source} variant="outline" size="sm" aria-pressed={options.source===source} onClick={()=>revise({...options,source,autoFix:source==="image"&&options.autoFix})}>{t(`sources.${source}`)}</Button>)}
   </div>
   {options.source==="text"?<label className={styles.field}>{t("prompt")}<Textarea maxLength={1000} rows={5} value={prompt} onChange={event=>{setPrompt(event.target.value);invalidate();}}/><small>{prompt.length} / 1000</small></label>:<>
    {options.source==="multiview"&&<p className={styles.note}>{t("multiviewNote")}</p>}
    <div className={options.source==="multiview"?styles.generationViews:undefined}>{(options.source==="multiview"?[0,1,2,3]:[0]).map(index=><div key={index}>
     <label className={styles.field}>{options.source==="image"?t("image"):t(`views.${index}`)}<Input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>upload(event,index)}/></label>
     {urls[index]&&<><Image unoptimized width={240} height={170} className={styles.generationImage} src={urls[index]} alt={options.source==="image"?t("selectedImage"):t(`views.${index}`)}/><Button variant="ghost" size="sm" onClick={()=>{setFiles(previous=>previous.map((file,i)=>i===index?null:file));invalidate();}}>{t("removeImage")}</Button></>}
    </div>)}</div>
   </>}
   {options.source==="image"&&<FourViewPreparation file={files[0]} onApply={values=>{setFiles(values);revise({...options,source:"multiview",autoFix:false});}}/>}
   <label className={styles.field}>{t("model")}<select value={options.model} onChange={event=>chooseModel(event.target.value as TripoOptions["model"])}>{TRIPO_MODELS.map(item=><option key={item.id} value={item.id}>{t(`models.${item.id.replaceAll(".","_")}`)}</option>)}</select></label>
   <label className={styles.field}>{t("faces")}<Input aria-label={t("faces")} type="number" min={model.minFaces} max={faceLimit} step={1} value={options.faceCount} onChange={event=>revise({...options,faceCount:Number(event.target.value)})}/><small>{t("faceRange",{min:model.minFaces,max:faceLimit})}</small></label>
   {model.quadMax>0&&<><label className={styles.check}><input type="checkbox" disabled checked={false}/>{t("quad")}</label><p className={styles.note}>{t("quadUnavailable")}</p></>}
   {model.family==="detail"&&options.model!=="v2.5-20250123"&&<label className={styles.check}><input type="checkbox" checked={options.geometryQuality==="detailed"} onChange={event=>revise({...options,geometryQuality:event.target.checked?"detailed":"standard",faceCount:Math.min(options.faceCount,event.target.checked?model.maxFaces:model.standardMaxFaces)})}/>{t("geometry")}</label>}
   {options.source==="image"&&<label className={styles.check}><input type="checkbox" checked={options.autoFix} onChange={event=>revise({...options,autoFix:event.target.checked})}/>{t("autoFix")}</label>}
   <label className={styles.check}><input type="checkbox" checked={options.texture} onChange={event=>revise({...options,texture:event.target.checked,generateParts:event.target.checked?false:options.generateParts})}/>{t("texture")}</label>
   {options.texture&&<label className={styles.field}>{t("resolution")}<select value={options.textureResolution} onChange={event=>revise({...options,textureResolution:event.target.value as TripoOptions["textureResolution"]})}>{(options.model==="v2.5-20250123"?["2K"]:["2K","4K","8K"]).map(value=><option key={value}>{value}</option>)}</select></label>}
   <label className={styles.check}><input type="checkbox" disabled={!options.texture} checked={options.texture&&options.pbr} onChange={event=>revise({...options,pbr:event.target.checked,generateParts:event.target.checked?false:options.generateParts})}/>{t("pbr")}</label>
   {model.family==="detail"&&options.model!=="v2.5-20250123"&&<><label className={styles.check}><input type="checkbox" checked={options.generateParts} onChange={event=>revise({...options,generateParts:event.target.checked,...(event.target.checked?{texture:false,pbr:false,quad:false}:{})})}/>{t("parts")}</label><p className={styles.note}>{t("partsNote")}</p></>}
   {config?.available?(cost!==null?<><p>{t("price",{points:cost})}</p><label className={styles.check}><input type="checkbox" checked={ack&&acknowledgedCost.current===cost} onChange={event=>{acknowledgedCost.current=cost;setAck(event.target.checked);}}/>{t("acknowledge")}</label></>:<p role="status" className={styles.note}>{t("priceUnavailable")}</p>):<p className={styles.note}>{t("unavailable")}</p>}
   <Button onClick={()=>void generate()} disabled={busy||!canGenerate}>{t(busy?"submitting":"generate")}</Button><p className={styles.note}>{t("cancelNote")}</p>
  </fieldset>}
  {error&&<p role="alert" className={styles.fieldError}>{error}</p>}
  {connectionFailed&&<p role="status" className={styles.note}>{t("connectionFailed")}</p>}
  <h3>{t("history")}</h3>{!jobs.length&&<p className={styles.note}>{t("emptyHistory")}</p>}
  {previewAsset&&<VisualModelPreview key={previewAsset.id} asset={previewAsset} onClose={()=>setPreviewAsset(null)}/>}
  {jobs.map(job=><article className={styles.generationJob} key={job.id}>
   <strong>{t(`statuses.${job.status}`)}</strong><small>{new Date(job.createdAt).toLocaleString()}</small>
   {job.options&&<small>{job.options.model} · {t(`sources.${job.options.source??"image"}`)} · {job.options.faceCount.toLocaleString()}</small>}
   <progress value={job.progress} max={100} aria-label={t("progress")}/>
   {active(job)&&<p>{t(`stages.${job.stage}`)}</p>}{job.status==="NEEDS_REVIEW"&&<p>{t(job.errorCode==="MODEL_UNSUPPORTED"?"unsupportedModel":"reviewNote")}</p>}
   {job.errorCode&&job.status!=="NEEDS_REVIEW"&&<p>{t("failedNote")}</p>}{job.refunded&&<p>{t("refunded")}</p>}
   {job.asset&&<><Button variant="outline" size="sm" onClick={()=>setPreviewAsset(job.asset)}>{t("preview")}</Button><Button variant="outline" size="sm" onClick={()=>onApply(job.asset!)}>{t("apply")}</Button><Button variant="ghost" size="sm" disabled={downloading!==null} onClick={()=>void download(job.asset!)}>{t(downloading===job.asset.id?"downloading":"download")}</Button></>}
   {active(job)&&!job.cancelRequested&&<Button variant="ghost" size="sm" onClick={()=>void cancel(job.id)}>{t("cancel")}</Button>}{job.cancelRequested&&<p>{t("cancelRequested")}</p>}
  </article>)}
 </div>;
}
