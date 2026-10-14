"use client";
import { useEffect,useRef,useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMarketRequest } from "@/components/marketplace/account-boundary";
import type { PublishedWebsiteView } from "@/contracts/visual-generation";
import styles from "./visual-tour-editor.module.css";
interface Domain {id:string;hostname:string;status:string;records:Array<{type:string;name:string;value:string}>;}
export function VisualWebsitePublication({projectId,versions}:{projectId:string;versions:number[]}){
 const t=useTranslations("visualPublication"),request=useMarketRequest();
 const [available,setAvailable]=useState(false),[release,setRelease]=useState<PublishedWebsiteView|null>(null),[version,setVersion]=useState(versions[0]??0),[slug,setSlug]=useState("");
 const [domainsAvailable,setDomainsAvailable]=useState(false),[domains,setDomains]=useState<Domain[]>([]),[hostname,setHostname]=useState("");
 const [ack,setAck]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");const alive=useRef(true),lock=useRef(false);
 useEffect(()=>{alive.current=true;let cancelled=false;
  void (async()=>{try{const cfg=await fetch("/api/visual-websites/publication/config",{cache:"no-store"}).then(r=>r.json());
   const [published,bindings]=await Promise.all([request<PublishedWebsiteView|null>(`/api/projects/${projectId}/visual-website/publication`,"GET",undefined),request<{available:boolean;domains:Domain[]}>(`/api/projects/${projectId}/visual-website/domains`,"GET",undefined)]);
   if(!cancelled){setAvailable(cfg.data.available);setRelease(published);if(published)setSlug(published.slug);setDomainsAvailable(bindings.available);setDomains(bindings.domains);}
  }catch{if(!cancelled)setError(t("failed"));}})();return()=>{cancelled=true;alive.current=false;};
 // Account-bound requests are aborted by the enclosing boundary.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[projectId]);
 async function run(action:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError("");try{await action();}catch(cause){if(alive.current)setError(t(cause instanceof Error&&cause.message.includes("SLUG_TAKEN")?"slugTaken":"failed"));}finally{lock.current=false;if(alive.current)setBusy(false);}}
 async function publish(){const result=await request<PublishedWebsiteView>("/api/visual-websites/publication","POST",{projectId,version,slug,acknowledged:true});if(alive.current){setRelease(result);setAck(false);}}
 async function withdraw(){await request(`/api/projects/${projectId}/visual-website/publication`,"DELETE",undefined);if(alive.current)setRelease(null);}
 async function bind(){const result=await request<Domain>(`/api/projects/${projectId}/visual-website/domains`,"POST",{hostname:hostname.toLowerCase().trim()});if(alive.current){setDomains(current=>[result,...current.filter(d=>d.id!==result.id)]);setHostname("");}}
 async function check(domain:Domain){const result=await request<Domain>(`/api/visual-domains/${domain.id}`,"POST",undefined);if(alive.current)setDomains(current=>current.map(d=>d.id===domain.id?result:d));}
 async function pause(domain:Domain){await request(`/api/visual-domains/${domain.id}`,"DELETE",undefined);if(alive.current)setDomains(current=>current.map(d=>d.id===domain.id?{...d,status:"PAUSED"}:d));}
 return <section className={styles.generation}>
  <h3>{t("title")}</h3><p className={styles.note}>{t("description")}</p>
  {!available?<p className={styles.note}>{t("unavailable")}</p>:<>
   <label className={styles.field}>{t("version")}<select value={version} onChange={e=>{setVersion(Number(e.target.value));setAck(false);}}>{versions.map(v=><option key={v} value={v}>v{v}</option>)}</select></label>
   <label className={styles.field}>{t("slug")}<Input value={slug} maxLength={48} onChange={e=>{setSlug(e.target.value.toLowerCase());setAck(false);}} placeholder="my-portfolio"/></label>
   <label className={styles.check}><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>{t("acknowledge")}</label>
   <Button disabled={busy||!ack||!version||!/^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/.test(slug)} onClick={()=>void run(publish)}>{t("publish")}</Button>
  </>}
  {release&&<><a href={release.url} target="_blank" rel="noopener noreferrer">{t("open",{version:release.version})} ↗</a><Button variant="outline" disabled={busy} onClick={()=>void run(withdraw)}>{t("withdraw")}</Button></>}
  <h3>{t("domainTitle")}</h3>
  {!domainsAvailable?<p className={styles.note}>{t("domainsUnavailable")}</p>:<>
   <label className={styles.field}>{t("hostname")}<Input value={hostname} maxLength={253} onChange={e=>setHostname(e.target.value)} placeholder="portfolio.example.com"/></label>
   <Button variant="outline" disabled={busy||!hostname} onClick={()=>void run(bind)}>{t("bind")}</Button>
   <p className={styles.note}>{t("dnsNote")}</p>
   {domains.map(domain=><article className={styles.generationJob} key={domain.id}>
    <strong>{domain.hostname}</strong><p>{t(`statuses.${domain.status}`)}</p>
    {domain.records.map((record,i)=><label className={styles.field} key={i}>{record.type} · {record.name}<Input readOnly value={record.value} onFocus={e=>e.target.select()}/></label>)}
    <Button variant="outline" disabled={busy} onClick={()=>void run(()=>check(domain))}>{t("verify")}</Button>
    {domain.status!=="PAUSED"&&<Button variant="ghost" disabled={busy} onClick={()=>void run(()=>pause(domain))}>{t("pause")}</Button>}
   </article>)}
  </>}
  {error&&<p role="alert" className={styles.note}>{error}</p>}
 </section>;
}
