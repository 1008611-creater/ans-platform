"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useMarketRequest } from "@/components/marketplace/account-boundary";
import { DEFAULT_APPEARANCE } from "@/contracts/visual-website";
import type { ResumeWebsiteInput } from "@/contracts/resume-website";
import type { ModelAssetRef } from "@/contracts/visual-generation";
import { RESUME_WEBSITE_EXAMPLE } from "@/domain/projects/resume-website";
import { createVisualTour } from "@/lib/projects/visual-tour";
import { renderVisualWebsite } from "@/lib/projects/visual-website";
import styles from "./visual-tour-editor.module.css";
/** An isolated model viewer; previewing never replaces the user's edited model. */
export function VisualModelPreview({asset,onClose}:{asset:ModelAssetRef;onClose:()=>void}){
 const t=useTranslations("visualGeneration"),request=useMarketRequest(),locale=useLocale();
 const frame=useRef<HTMLIFrameElement>(null);
 const [html,setHtml]=useState<string|null>(null),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{let cancelled=false;setHtml(null);setError(false);
  void (async()=>{try{
   const access=await request<{url:string}>(`/api/visual-model-assets/${asset.id}`,"GET",undefined);
   const url=new URL(access.url,window.location.origin);if(url.origin!==window.location.origin)throw new Error();
   const profile:ResumeWebsiteInput={...RESUME_WEBSITE_EXAMPLE,language:locale==="zh"?"zh":"en",fullName:"",headline:"",about:"",email:"",contactUrl:""};
   const tour=createVisualTour(profile);tour.modelAsset=asset;tour.fitModel=true;tour.loading.title=t("loadingPreview");tour.loading.subtitle="";
   const document=renderVisualWebsite(profile,{...DEFAULT_APPEARANCE,tour},0,undefined,url.href);
   const preview=document.replace("</style>",".page{min-height:0!important;height:100vh!important}.stories,.portfolioSections,header,footer,nav,.tip,.vignette{display:none!important}</style>");
   if(!cancelled)setHtml(preview);
  }catch{if(!cancelled)setError(true);}})();
  return()=>{cancelled=true;};
 // Enclosing account boundary cancels private reads on unmount.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[asset.id,revision,locale]);
 useEffect(()=>{
  if(!html)return;
  const timeout=setTimeout(()=>setError(true),45000);
  const receive=(event:MessageEvent)=>{
   if(event.source!==frame.current?.contentWindow||event.data?.channel!=="ans-visual-scene")return;
   if(event.data.type==="ready"){
    clearTimeout(timeout);
    frame.current?.contentWindow?.postMessage({channel:"ans-visual-scene",type:"editor",active:true,showContent:false},"*");
   }
   if(event.data.type==="failed"){clearTimeout(timeout);setError(true);}
  };
  window.addEventListener("message",receive);
  return()=>{clearTimeout(timeout);window.removeEventListener("message",receive);};
 },[html]);
 return <section className={styles.modelPreview} aria-label={t("preview")}>
  <div className={styles.generationModes}><strong>{t("preview")}</strong><Button variant="ghost" size="sm" onClick={onClose}>{t("closePreview")}</Button></div>
  {html&&!error?<iframe ref={frame} title={t("preview")} sandbox="allow-scripts" srcDoc={html} onLoad={event=>event.currentTarget.contentWindow?.postMessage({channel:"ans-visual-scene",type:"editor",active:true,showContent:false},"*")}/>:<p role="status">{t(error?"previewFailed":"loadingPreview")}</p>}
  <p className={styles.note}>{t("previewHint")}</p><Button variant="ghost" size="sm" onClick={()=>setRevision(value=>value+1)}>{t("refreshPreview")}</Button>
 </section>;
}
