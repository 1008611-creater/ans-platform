"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceNavigation, WorkspaceLink } from "@/components/providers/workspace-navigation";
import { agriPublicationQueueSchema } from "@/contracts/agri-publications";
import type { z } from "zod";
import { AgriPublications, publicationApi, readPublicationResponse, PublicationError } from "./agri-publications";
import { isAgriPublicationActor } from "./agri-publications-recovery";
export function AgriPublicationReviewQueue(){
  const t=useTranslations("product.agriPublications"),{data,status}=useSession();const[invalidActor,setInvalidActor]=useState<string|null>(null);
  const invalidate=useCallback(()=>setInvalidActor(data?.user?.id??null),[data?.user?.id]);
  if(status==="loading")return <p role="status">{t("loading")}</p>;
  if(status!=="authenticated"||!data?.user?.id)return <Button asChild><WorkspaceLink href="/login?callbackUrl=%2Fcompetitions%2Fagrihackathon%2Fpublication-review">{t("login")}</WorkspaceLink></Button>;
  if(invalidActor===data.user.id)return <p role="alert">{t("errors.ACCOUNT_CHANGED")}</p>;
  return <ReviewQueue key={data.user.id} actorId={data.user.id} invalidate={invalidate}/>;
}
function ReviewQueue({actorId,invalidate}:{actorId:string;invalidate:()=>void}){
  const t=useTranslations("product.agriPublications"),navigation=useWorkspaceNavigation();
  const[view,setView]=useState<z.infer<typeof agriPublicationQueueSchema>|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(false),[selected,setSelected]=useState<string|null>(null);
  const alive=useRef(true),generation=useRef(0),focus=useRef<HTMLHeadingElement>(null);
  const load=useCallback(async(cursor?:string)=>{
    const gen=++generation.current;setView(null);setLoading(true);setError("");
    try{const parsed=agriPublicationQueueSchema.safeParse(await readPublicationResponse(publicationApi+"/queue"+(cursor?"?"+new URLSearchParams({cursor}):""),actorId));if(!parsed.success)throw new PublicationError("INTERNAL_ERROR");if(alive.current&&gen===generation.current&&isAgriPublicationActor(actorId))setView(parsed.data);}
    catch(e){if(!alive.current||gen!==generation.current||!isAgriPublicationActor(actorId))return;const code=e instanceof PublicationError?e.code:"INTERNAL_ERROR";setError(code);if(["UNAUTHORIZED","ACCOUNT_CHANGED","ACCOUNT_UNAVAILABLE"].includes(code))invalidate();}
    finally{if(alive.current&&gen===generation.current&&isAgriPublicationActor(actorId))setLoading(false);}
  },[actorId,invalidate]);
  useEffect(()=>{const requests=generation;alive.current=true;void load();return()=>{alive.current=false;++requests.current;};},[load]);
  useEffect(()=>{if(selected)focus.current?.focus();},[selected]);
  return <div className="space-y-6">
    <p className="max-w-prose text-sm leading-7 text-muted-foreground">{t("queueHint")}</p>
    <Button variant="outline" disabled={loading} onClick={()=>navigation.run(()=>{setSelected(null);void load();})}>{t("refresh")}</Button>
    {loading&&<div role="status" className="space-y-3"><span className="sr-only">{t("loading")}</span><Skeleton className="h-5 w-2/3"/><Skeleton className="h-4 w-1/2"/></div>}
    {error&&<p role="alert">{error==="AGRI_SCOPE_REQUIRED"?t("scopeUnavailable"):["AGRI_EDITION_NOT_CONFIGURED","AGRI_WORKSPACE_NOT_CONFIGURED","AGRI_NOT_CONFIGURED"].includes(error)?t("notConfigured"):t("errors.INTERNAL_ERROR")}</p>}
    {view&&!view.items.length&&<p className="py-6 text-sm text-muted-foreground">{t("queueEmpty")}</p>}
    {view&&<ul className="divide-y">{view.items.map(row=>{const request=row.publication?.events.find(event=>event.action==="REQUEST");return <li key={row.entryStageId} className="flex min-w-0 flex-wrap items-center justify-between gap-4 py-5"><div className="min-w-0 space-y-2"><h2 className="break-words font-semibold">{request?.content?.title??t("unavailable")}</h2><p className="break-words text-sm text-muted-foreground">{request?.content?.teamName}</p><Badge variant="secondary">{t("state."+(row.publication?.state??"NONE"))}</Badge></div><Button variant="outline" onClick={()=>navigation.run(()=>setSelected(row.entryStageId))}>{t("queueOpen")}</Button></li>;})}</ul>}
    {view?.nextCursor&&<Button variant="outline" disabled={loading} onClick={()=>navigation.run(()=>{setSelected(null);void load(view.nextCursor!);})}>{t("nextPage")}</Button>}
    {selected&&<div className="space-y-4"><h2 className="sr-only" tabIndex={-1} ref={focus}>{t("reviewTitle")}</h2><AgriPublications key={selected} actorId={actorId} entryStageId={selected} scope="staff" invalidate={invalidate} initialOpen/></div>}
  </div>;
}
