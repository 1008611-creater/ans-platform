"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import { agriPublicPublicationSchema, type AgriPublicPublication } from "@/contracts/agri-publications";
import { PublicationError, publicationApi, readPublicationResponse, PublicContent } from "./agri-publications";
const listSchema=z.object({competitionId:z.string().min(1),items:z.array(agriPublicPublicationSchema),nextCursor:z.string().nullable()}).strict();
export function AgriPublicationsShowcase({publicationId}:{publicationId?:string}){
  const t=useTranslations("product.agriPublications"),locale=useLocale();
  const[list,setList]=useState<z.infer<typeof listSchema>|null>(null),[item,setItem]=useState<AgriPublicPublication|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState("");
  const alive=useRef(true),generation=useRef(0);
  const clear=useCallback(()=>{++generation.current;setList(null);setItem(null);setError("");},[]);
  const load=useCallback(async(cursor?:string)=>{
    const gen=++generation.current;setList(null);setItem(null);setLoading(true);setError("");
    try{
      const raw=await readPublicationResponse(publicationApi+"/public"+(publicationId?"/"+encodeURIComponent(publicationId):cursor?"?"+new URLSearchParams({cursor}):""));
      const parsed=publicationId?agriPublicPublicationSchema.safeParse(raw):listSchema.safeParse(raw);
      if(!parsed.success)throw new PublicationError("INTERNAL_ERROR");
      if(!alive.current||gen!==generation.current)return;
      if(publicationId){const next=parsed.data as AgriPublicPublication;if(next.id!==publicationId)throw new PublicationError("INTERNAL_ERROR");setItem(next);}else setList(parsed.data as z.infer<typeof listSchema>);
    }catch(e){if(alive.current&&gen===generation.current)setError(e instanceof PublicationError?e.code:"INTERNAL_ERROR");}
    finally{if(alive.current&&gen===generation.current)setLoading(false);}
  },[publicationId]);
  useEffect(()=>{
    const requests=generation;alive.current=true;void load();
    const restore=()=>{if(document.visibilityState!=="hidden")void load();};
    const visibility=()=>{if(document.visibilityState==="hidden")clear();else restore();};
    window.addEventListener("focus",restore);window.addEventListener("pageshow",restore);window.addEventListener("pagehide",clear);document.addEventListener("visibilitychange",visibility);
    return()=>{alive.current=false;++requests.current;window.removeEventListener("focus",restore);window.removeEventListener("pageshow",restore);window.removeEventListener("pagehide",clear);document.removeEventListener("visibilitychange",visibility);};
  },[load,clear]);
  const at=(value:string)=>new Intl.DateTimeFormat(locale,{timeZone:"Asia/Shanghai",dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
  const errorText=["AGRI_NOT_CONFIGURED","AGRI_WORKSPACE_NOT_CONFIGURED","AGRI_EDITION_NOT_CONFIGURED"].includes(error)?t("notConfigured"):error==="AGRI_PUBLICATION_NOT_FOUND"||error==="NOT_FOUND"?t("unavailable"):t("errors.INTERNAL_ERROR");
  return <section className="min-w-0 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-prose text-sm leading-6 text-muted-foreground">{t("showcaseHint")}</p><Button variant="outline" disabled={loading} onClick={()=>void load()}>{t("refresh")}</Button></div>
    {loading&&<div role="status" className="space-y-3"><span className="sr-only">{t("loading")}</span><Skeleton className="h-5 w-2/3"/><Skeleton className="h-4 w-1/2"/></div>}
    {error&&<div className="space-y-3 py-6"><p role="alert" className="text-sm">{errorText}</p>{["AGRI_NOT_CONFIGURED","AGRI_WORKSPACE_NOT_CONFIGURED","AGRI_EDITION_NOT_CONFIGURED"].includes(error)&&<div className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><WorkspaceLink href="/explore?category=competition&subcategory=agri-wall">{t("browseWall")}</WorkspaceLink></Button><Button asChild variant="ghost" size="sm"><WorkspaceLink href="/competitions/agrihackathon/submissions">{t("goToSubmissions")}</WorkspaceLink></Button></div>}</div>}
    {list&&<>{!list.items.length&&<div className="space-y-3 rounded-2xl border bg-muted/20 p-6"><h2 className="font-semibold">{t("empty")}</h2><p className="max-w-prose text-sm leading-6 text-muted-foreground">{t("emptyHint")}</p><div className="flex flex-wrap gap-2 pt-1"><Button asChild variant="outline" size="sm"><WorkspaceLink href="/explore?category=competition&subcategory=agri-wall">{t("browseWall")}</WorkspaceLink></Button><Button asChild variant="ghost" size="sm"><WorkspaceLink href="/competitions/agrihackathon/submissions">{t("goToSubmissions")}</WorkspaceLink></Button></div></div>}<ul className="divide-y">{list.items.map(row=><li key={row.id} className="space-y-4 py-6"><p className="text-xs text-muted-foreground">{t(row.basis==="FROZEN"&&!row.correctionPreviousSubmissionId&&row.stage==="PRELIMINARY"?"versionPreliminaryFrozen":row.basis==="FROZEN"?"versionFrozen":"versionCurrent")}{row.correctionPreviousSubmissionId?" · "+t("versionCorrection"):""} · {t("stage."+row.stage)}</p><PublicContent content={row.content} headingLevel="h2"/><div className="flex flex-wrap items-center gap-4"><span className="text-xs text-muted-foreground">{t("publishedAt",{at:at(row.publishedAt)})}</span><Button asChild variant="outline"><WorkspaceLink prefetch={false} href={"/competitions/agrihackathon/showcase/"+encodeURIComponent(row.id)}>{t("viewProject")}</WorkspaceLink></Button></div></li>)}</ul>{list.nextCursor&&<Button variant="outline" disabled={loading} onClick={()=>void load(list.nextCursor!)}>{t("nextPage")}</Button>}</>}
    {item&&<article className="space-y-5"><p className="text-sm text-muted-foreground">{t(item.basis==="FROZEN"&&!item.correctionPreviousSubmissionId&&item.stage==="PRELIMINARY"?"versionPreliminaryFrozen":item.basis==="FROZEN"?"versionFrozen":"versionCurrent")}{item.correctionPreviousSubmissionId?" · "+t("versionCorrection"):""} · {t("stage."+item.stage)}</p><PublicContent content={item.content} headingLevel="h2"/><dl className="space-y-2 border-t pt-4 text-xs text-muted-foreground"><div><dt>{t("submissionVersion")}</dt><dd className="break-all">{item.artifactVersionId}</dd></div><div><dt>{t("acceptedAt")}</dt><dd>{at(item.acceptedAt)}</dd></div><div><dt>{t("publishedLabel")}</dt><dd>{at(item.publishedAt)}</dd></div></dl></article>}
  </section>;
}
