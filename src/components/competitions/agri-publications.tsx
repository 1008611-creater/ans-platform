"use client";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useWorkspaceNavigation, WorkspaceLink } from "@/components/providers/workspace-navigation";
import { agriPublicationCommandSchema, agriPublicationManagementSchema, type AgriPublicationCommand, type AgriPublicationManagement } from "@/contracts/agri-publications";
import { freshPublicationDraft, readAgriPublicationRecovery, writeAgriPublicationRecovery, isAgriPublicationActor, type AgriPublicationDraft } from "./agri-publications-recovery";
export const publicationApi = "/api/competitions/agrihackathon/publications";
const receiptSchema=z.object({publicationId:z.string().min(1),eventId:z.string().min(1),appliedRevision:z.number().int().min(1),duplicate:z.boolean()}).strict();
const accountErrors=new Set(["UNAUTHORIZED","ACCOUNT_CHANGED","ACCOUNT_UNAVAILABLE"]);
const receiptRejections=new Set(["AGRI_REVISION_CONFLICT","AGRI_WORKSPACE_DISABLED","AGRI_PUBLICATION_SOURCE_STALE","AGRI_PUBLICATION_LINK_NOT_SUBMITTED","AGRI_PUBLICATION_CONSENT_STALE","AGRI_PUBLICATION_INDEPENDENT_REVIEW_REQUIRED","AGRI_PUBLICATION_CONSENT_INVALID","AGRI_PUBLICATION_ALREADY_WITHDRAWN","AGRI_PUBLICATION_NOT_FOUND"]);
export class PublicationError extends Error { constructor(public code:string,public uncertain=false){super(code);} }
export async function readPublicationResponse(path:string,actorId?:string,command?:AgriPublicationCommand):Promise<unknown>{
  let response:Response;
  try {response=await fetch(path,{cache:"no-store",signal:AbortSignal.timeout(15000),headers:{...(actorId?{"x-ans-submission-actor":actorId}:{}),...(command?{"content-type":"application/json"}:{})},...(command?{method:"POST",body:JSON.stringify(command)}:{})});}
  catch{throw new PublicationError("INTERNAL_ERROR",!!command);}
  let body;try{body=await response.json();}catch{throw new PublicationError("INTERNAL_ERROR",!!command);}
  if(!response.ok||body.ok!==true)throw new PublicationError(body.error?.code??"INTERNAL_ERROR",!!command&&response.status>=500);
  if(command&&!receiptSchema.safeParse(body.data).success)throw new PublicationError("INTERNAL_ERROR",true);
  return body.data;
}
function Field({label,children}:{label:string;children:(id:string)=>ReactNode}){const id=useId();return <div className="min-w-0 space-y-2"><label className="text-sm font-medium" htmlFor={id}>{label}</label>{children(id)}</div>;}
interface Props{actorId:string;entryStageId:string;scope:"team"|"staff";invalidate:()=>void;initialOpen?:boolean}
export function AgriPublications({actorId,entryStageId,scope,invalidate,initialOpen=false}:Props){
  const t=useTranslations("product.agriPublications"),{data,status}=useSession();const[open,setOpen]=useState(initialOpen);
  if(status!=="authenticated"||data?.user?.id!==actorId)return null;
  return <section className="min-w-0 space-y-4 rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{t(scope==="team"?"title":"reviewTitle")}</h3>{!open&&<Button variant="outline" onClick={()=>setOpen(true)}>{t("open")}</Button>}</div>
    {open&&<PublicationEditor key={actorId+":"+entryStageId+":"+scope} actorId={actorId} entryStageId={entryStageId} scope={scope} invalidate={invalidate}/>}</section>;
}
function PublicationEditor({actorId,entryStageId,scope,invalidate}:Props){
  const t=useTranslations("product.agriPublications"),locale=useLocale(),navigation=useWorkspaceNavigation();
  const recovered=useRef(readAgriPublicationRecovery(actorId,entryStageId,scope));
  const[draft,setDraft]=useState<AgriPublicationDraft>(()=>recovered.current?.draft??freshPublicationDraft());
  const[pending,setPending]=useState<AgriPublicationCommand|null>(()=>recovered.current?.pending??null);
  const[view,setView]=useState<AgriPublicationManagement|null>(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[note,setNote]=useState(""),[consent,setConsent]=useState(false);
  const[withdrawConfirm,setWithdrawConfirm]=useState(false),[leaveOpen,setLeaveOpen]=useState(false);
  const alive=useRef(true),generation=useRef(0),flight=useRef(false),pendingRef=useRef(pending),draftRef=useRef(draft),invalidateRef=useRef(invalidate);
  draftRef.current=draft;invalidateRef.current=invalidate;
  const viewRef=useRef(view);viewRef.current=view;
  const leaveAction=useRef<(()=>void)|null>(null),cancelLeave=useRef<(()=>void)|null>(null);
  const dirty=!!(draft.title||draft.summary||draft.teamName||draft.reason||draft.includeRepository||draft.includeDemo||draft.track!=="");const dirtyRef=useRef(dirty);dirtyRef.current=dirty;
  const current=()=>alive.current&&isAgriPublicationActor(actorId);
  const persist=useCallback((value:AgriPublicationDraft,command:AgriPublicationCommand|null)=>writeAgriPublicationRecovery(actorId,entryStageId,scope,{draft:value,pending:command}),[actorId,entryStageId,scope]);
  const load=useCallback(async(beforeRevision?:number)=>{
    const previous=viewRef.current;const gen=++generation.current;setLoading(true);setError("");setView(null);setConsent(false);
    try{
      const raw=await readPublicationResponse(publicationApi+"?"+new URLSearchParams({entryStageId,scope,...(beforeRevision?{beforeRevision:String(beforeRevision)}:{})}),actorId);
      const parsed=agriPublicationManagementSchema.safeParse(raw);if(!parsed.success||parsed.data.entryStageId!==entryStageId)throw new PublicationError("INTERNAL_ERROR");
      if(!alive.current||gen!==generation.current||!isAgriPublicationActor(actorId))return;
      if(beforeRevision&&previous?.publication&&parsed.data.publication){
        if(previous.publication.revision!==parsed.data.publication.revision){setError("AGRI_REVISION_CONFLICT");return;}
        setView({...parsed.data,publication:{...parsed.data.publication,events:[...previous.publication.events,...parsed.data.publication.events].filter((event,index,all)=>all.findIndex(other=>other.id===event.id)===index)}});
      }else setView(parsed.data);
      if((scope==="team"&&!parsed.data.canRequest)||(scope==="staff"&&!parsed.data.canReview&&!parsed.data.canWithdraw)){
        // Hide and erase editable data after loss of scope. Retain only the exact unknown receipt for recovery.
        const safe=freshPublicationDraft();setDraft(safe);draftRef.current=safe;persist(safe,pendingRef.current);
      }
    }catch(e){if(!alive.current||gen!==generation.current||!isAgriPublicationActor(actorId))return;const code=e instanceof PublicationError?e.code:"INTERNAL_ERROR";setError(code);if(accountErrors.has(code))invalidateRef.current();}
    finally{if(alive.current&&gen===generation.current&&isAgriPublicationActor(actorId))setLoading(false);}
  },[actorId,entryStageId,scope,persist]);
  useEffect(()=>{const requests=generation;alive.current=true;void load();return()=>{alive.current=false;++requests.current;};},[load]);
  useEffect(()=>navigation.register((action,cancel)=>{if(!dirtyRef.current&&!pendingRef.current){action();return;}leaveAction.current=action;cancelLeave.current=cancel;setLeaveOpen(true);}),[navigation]);
  useEffect(()=>{const guard=(e:BeforeUnloadEvent)=>{if(dirtyRef.current||pendingRef.current){e.preventDefault();e.returnValue="";}};window.addEventListener("beforeunload",guard);return()=>window.removeEventListener("beforeunload",guard);},[]);
  function edit(next:AgriPublicationDraft){const value=next;setDraft(value);draftRef.current=value;setConsent(false);setNote("");persist(value,pendingRef.current);}
  async function mutate(raw:AgriPublicationCommand){
    if(flight.current||!current())return;const parsed=agriPublicationCommandSchema.safeParse(pendingRef.current??raw);if(!parsed.success){setError("INVALID_INPUT");return;}
    const retry=!!pendingRef.current,command=parsed.data;flight.current=true;pendingRef.current=command;setPending(command);persist(draftRef.current,command);setBusy(true);setError("");setNote("");
    try{await readPublicationResponse(publicationApi,actorId,command);if(!current())return;pendingRef.current=null;setPending(null);const fresh=freshPublicationDraft();setDraft(fresh);draftRef.current=fresh;persist(fresh,null);setConsent(false);setNote(t("saved"));await load();}
    catch(e){if(!current())return;const code=e instanceof PublicationError?e.code:"INTERNAL_ERROR";
      // A retry rejected before receipt lookup cannot disprove the original write. Preserve its command/key.
      if(e instanceof PublicationError&&!e.uncertain&&(!retry||receiptRejections.has(code))){pendingRef.current=null;setPending(null);persist(draftRef.current,null);}
      setError(code);if(accountErrors.has(code))invalidateRef.current();
    }finally{flight.current=false;if(current())setBusy(false);}
  }
  const locked=loading||busy||!!pending;
  const selectedVersion=view?.context.allowedVersions.find(version=>version.submissionId===draft.basis?.submissionId&&version.artifactVersionId===draft.basis.artifactVersionId);
  const changedVersion=!!draft.basis&&!!view&&!selectedVersion;
  const latestRequest=view?.publication?.events.find(event=>event.action==="REQUEST");
  const revision=view?.publication?.revision??0;
  const at=(value:string)=>new Intl.DateTimeFormat(locale,{timeZone:"Asia/Shanghai",dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
  function requestPublication(){if(!draft.track||!view||!selectedVersion||!consent||changedVersion)return;void mutate({action:"requestPublication",entryStageId,expectedRevision:revision,idempotencyKey:crypto.randomUUID(),submissionId:selectedVersion.submissionId,artifactVersionId:selectedVersion.artifactVersionId,consentConfirmed:true,content:{title:draft.title,summary:draft.summary,teamName:draft.teamName,track:draft.track,repositoryUrl:draft.includeRepository?selectedVersion.repositoryUrl:null,demoUrl:draft.includeDemo?selectedVersion.demoUrl:null}});}
  return <div className="space-y-5">
    <AlertDialog open={leaveOpen} onOpenChange={open=>{setLeaveOpen(open);if(!open&&leaveAction.current){leaveAction.current=null;cancelLeave.current?.();cancelLeave.current=null;}}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("leaveTitle")}</AlertDialogTitle><AlertDialogDescription>{t("leaveText")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("stay")}</AlertDialogCancel><AlertDialogAction onClick={()=>{const action=leaveAction.current;leaveAction.current=null;action?.();}}>{t("leave")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <p className="max-w-prose text-sm leading-6 text-muted-foreground">{t(scope==="team"?"hint":"reviewHint")}</p>
    {error&&<p role="alert">{t.has("errors."+error)?t("errors."+error):t("errors.INTERNAL_ERROR")}</p>}{note&&<p role="status">{note}</p>}
    <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={loading||busy} onClick={()=>void load()}>{t("refresh")}</Button><Button asChild variant="ghost"><WorkspaceLink href="/competitions/agrihackathon/showcase">{t("showcaseTitle")}</WorkspaceLink></Button></div>
    {loading&&<div role="status" className="space-y-2"><span className="sr-only">{t("loading")}</span><Skeleton className="h-4 w-2/3"/><Skeleton className="h-4 w-1/2"/></div>}
    {pending&&<div className="space-y-3 rounded-lg border p-3"><p role="alert">{t("pending")}</p><Button disabled={busy||loading} onClick={()=>void mutate(pending)}>{t("retry")}</Button></div>}
    {view&&<>
      <div className="space-y-2 text-sm"><Badge variant="secondary">{t("state."+(view.publication?.state??"NONE"))}</Badge><p className="break-all text-xs text-muted-foreground">{t("exactVersion",{submission:view.context.submissionId??t("unsubmitted"),version:view.context.artifactVersionId??t("unsubmitted")})}</p>{!view.workspaceEnabled&&<p>{t("disabled")}</p>}</div>
      {scope==="team"&&view.canRequest&&view.workspaceEnabled&&view.context.submissionId&&view.context.artifactVersionId&&<form className="space-y-4 border-t pt-5" onSubmit={event=>{event.preventDefault();requestPublication();}}>
        <h4 className="font-semibold">{t("prepare")}</h4>
        <Field label={t("versionLabel")}>{id=><select id={id} className="w-full rounded-md border bg-background p-2 text-sm" disabled={locked} value={selectedVersion?.submissionId??""} onChange={event=>{const version=view.context.allowedVersions.find(value=>value.submissionId===event.target.value);edit({...draft,basis:version?{submissionId:version.submissionId,artifactVersionId:version.artifactVersionId}:null,includeRepository:false,includeDemo:false});}}><option value="">{t("selectVersion")}</option>{view.context.allowedVersions.map(version=><option key={version.submissionId} value={version.submissionId}>{t(version.basis==="FROZEN"&&!version.correctionPreviousSubmissionId&&view.context.stage==="PRELIMINARY"?"versionPreliminaryFrozen":version.basis==="FROZEN"?"versionFrozen":"versionCurrent")+(version.correctionPreviousSubmissionId?" · "+t("versionCorrection"):"")} · {version.sequence} · {version.artifactVersionId}</option>)}</select>}</Field>
        {selectedVersion&&<p className="break-all text-xs text-muted-foreground">{t("selectedVersion",{submission:selectedVersion.submissionId,version:selectedVersion.artifactVersionId})} · {at(selectedVersion.acceptedAt)}</p>}
        {changedVersion&&<div className="space-y-3"><p role="alert">{t("versionChanged")}</p><Button type="button" variant="outline" disabled={locked} onClick={()=>{const fresh=freshPublicationDraft();setDraft(fresh);draftRef.current=fresh;persist(fresh,null);setConsent(false);}}>{t("resetVersion")}</Button></div>}
        <div className="grid gap-4 sm:grid-cols-2"><Field label={t("titleField")}>{id=><Input id={id} maxLength={160} disabled={locked||changedVersion||!selectedVersion} value={draft.title} onChange={e=>edit({...draft,title:e.target.value})}/>}</Field><Field label={t("teamName")}>{id=><Input id={id} maxLength={120} disabled={locked||changedVersion||!selectedVersion} value={draft.teamName} onChange={e=>edit({...draft,teamName:e.target.value})}/>}</Field></div>
        <Field label={t("summary")}>{id=><Textarea id={id} maxLength={2000} disabled={locked||changedVersion||!selectedVersion} value={draft.summary} onChange={e=>edit({...draft,summary:e.target.value})}/>}</Field>
        <Field label={t("trackLabel")}>{id=><select id={id} className="w-full rounded-md border bg-background p-2 text-sm" disabled={locked||changedVersion||!selectedVersion} value={draft.track} onChange={e=>edit({...draft,track:e.target.value as AgriPublicationDraft["track"]})}><option value="">{t("selectTrack")}</option>{["PEOPLE","DISCOVERY","ACTION"].map(track=><option key={track} value={track}>{t("track."+track)}</option>)}</select>}</Field>
        <fieldset className="space-y-3"><legend className="mb-2 text-sm font-medium">{t("linksTitle")}</legend><p className="text-sm text-muted-foreground">{t("linksHint")}</p>{(["Repository","Demo"] as const).map(kind=>{const url=kind==="Repository"?selectedVersion?.repositoryUrl:selectedVersion?.demoUrl;const checked=kind==="Repository"?draft.includeRepository:draft.includeDemo;return url?<label key={kind} className="flex items-start gap-2 text-sm"><input type="checkbox" disabled={locked||changedVersion||!selectedVersion} checked={checked} onChange={e=>edit({...draft,...(kind==="Repository"?{includeRepository:e.target.checked}:{includeDemo:e.target.checked})})}/><span className="min-w-0">{t("include"+kind)}<span className="mt-1 block break-all text-xs text-muted-foreground">{url}</span></span></label>:<p key={kind} className="text-xs text-muted-foreground">{t("no"+kind)}</p>;})}</fieldset>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" disabled={locked||changedVersion||!selectedVersion} checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>{t("consent")}</span></label>
        <Button type="submit" disabled={locked||changedVersion||!consent||!draft.title.trim()||!draft.summary.trim()||!draft.teamName.trim()||!draft.track||!selectedVersion}>{t("request")}</Button>
      </form>}
      {scope==="team"&&!view.canRequest&&<p className="text-sm text-muted-foreground">{t("requestUnavailable")}</p>}
      {view.canReview&&view.workspaceEnabled&&view.publication?.state==="PENDING"&&latestRequest?.content&&<div className="space-y-4 border-t pt-5"><h4 className="font-semibold">{t("reviewTitle")}</h4><PublicContent content={latestRequest.content}/><p className="break-all text-xs text-muted-foreground">{t("consentVersion",{id:latestRequest.id,version:latestRequest.artifactVersionId})}</p><Field label={t("reason")}>{id=><Textarea id={id} maxLength={2000} disabled={locked} value={draft.reason} onChange={e=>edit({...draft,reason:e.target.value})}/>}</Field><div className="flex flex-wrap gap-3">{(["APPROVE","REJECT"] as const).map(decision=><Button key={decision} variant={decision==="APPROVE"?"default":"outline"} disabled={locked||!draft.reason.trim()} onClick={()=>void mutate({action:"reviewPublication",entryStageId,expectedRevision:revision,idempotencyKey:crypto.randomUUID(),consentEventId:latestRequest.id,decision,reason:draft.reason})}>{t(decision==="APPROVE"?"approve":"reject")}</Button>)}</div></div>}
      {view.canWithdraw&&view.publication&&view.publication.state!=="WITHDRAWN"&&<div className="space-y-3 border-t pt-5"><Field label={t("withdrawReason")}>{id=><Textarea id={id} maxLength={2000} disabled={locked} value={draft.reason} onChange={e=>edit({...draft,reason:e.target.value})}/>}</Field><Button variant="outline" disabled={locked||!draft.reason.trim()} onClick={()=>setWithdrawConfirm(true)}>{t("withdraw")}</Button>{withdrawConfirm&&<div className="space-y-3 rounded-lg bg-muted/40 p-3"><p className="text-sm">{t("withdrawText")}</p><div className="flex gap-3"><Button variant="outline" disabled={locked} onClick={()=>setWithdrawConfirm(false)}>{t("cancel")}</Button><Button disabled={locked} onClick={()=>{setWithdrawConfirm(false);void mutate({action:"withdrawPublication",entryStageId,expectedRevision:revision,idempotencyKey:crypto.randomUUID(),reason:draft.reason});}}>{t("confirmWithdraw")}</Button></div></div>}</div>}
      {view.publication&&<details className="border-t pt-4"><summary className="cursor-pointer text-sm font-medium">{t("history")}</summary><ol className="mt-4 space-y-4">{view.publication.events.map(event=><li key={event.id} className="space-y-2 border-b pb-4"><p className="text-sm font-medium">{t("event."+event.action)} · {at(event.createdAt)}</p><p className="break-all text-xs text-muted-foreground">{t("historyVersion",{revision:event.revision,version:event.artifactVersionId})}</p>{event.reason&&<p className="whitespace-pre-wrap break-words text-sm">{event.reason}</p>}{event.content&&<PublicContent content={event.content}/>}</li>)}</ol>{view.publication.nextBeforeRevision&&<Button className="mt-4" variant="outline" disabled={locked} onClick={()=>void load(view.publication!.nextBeforeRevision!)}>{t("olderHistory")}</Button>}</details>}
    </>}
  </div>;
}
export function PublicContent({content,headingLevel="h4"}:{headingLevel?:"h2"|"h4";content:{title:string;summary:string;teamName:string;track:string;repositoryUrl:string|null;demoUrl:string|null}}){const t=useTranslations("product.agriPublications"),Heading=headingLevel;return <div className="min-w-0 space-y-3"><Heading className="break-words font-semibold">{content.title}</Heading><p className="break-words text-sm text-muted-foreground">{content.teamName} · {t("track."+content.track)}</p><p className="max-w-prose whitespace-pre-wrap break-words text-sm leading-7">{content.summary}</p><div className="flex flex-wrap gap-4 text-sm">{content.repositoryUrl&&<a className="underline" href={content.repositoryUrl} target="_blank" rel="nofollow noopener noreferrer">{t("repository")}</a>}{content.demoUrl&&<a className="underline" href={content.demoUrl} target="_blank" rel="nofollow noopener noreferrer">{t("demo")}</a>}</div>{(content.repositoryUrl||content.demoUrl)&&<p className="text-xs text-muted-foreground">{t("externalHint")}</p>}</div>;}

import { agriPublicRankingsSchema as publicRankingSchema,type AgriPublicRankings as PublicRankings } from "@/contracts/agri-rankings";
/** Public-safe live projection of organizer-confirmed immutable result snapshots. */
export function AgriRankingBoards(){
 const t=useTranslations("product.agriRankings");const [view,setView]=useState<PublicRankings|null>(null),[error,setError]=useState(false);const generation=useRef(0);
 useEffect(()=>{const requests=generation;let alive=true;const load=async()=>{const gen=++generation.current;setView(null);setError(false);try{const response=await fetch("/api/competitions/agrihackathon/rankings/public",{cache:"no-store",signal:AbortSignal.timeout(15000)});const body=await response.json();if(!response.ok||body.ok!==true)throw new Error();const parsed=publicRankingSchema.parse(body.data);if(alive&&gen===generation.current)setView(parsed);}catch{if(alive&&gen===generation.current)setError(true);}};void load();const restore=()=>{if(document.visibilityState!=="hidden")void load();else{++generation.current;setView(null);}};window.addEventListener("focus",restore);document.addEventListener("visibilitychange",restore);return()=>{alive=false;++requests.current;window.removeEventListener("focus",restore);document.removeEventListener("visibilitychange",restore);};},[]);
 if(error)return <p role="status" className="text-sm text-muted-foreground">{t("publicUnavailable")}</p>;
 if(!view?.boards.length)return null;
 return <div className="space-y-8">{view.boards.map(board=><section key={board.id} className="space-y-4 rounded-xl border p-5"><h2 className="text-xl font-semibold">{t(board.stage==="PRELIMINARY"?"finalistsTitle":"finalTitle")}</h2><p className="text-sm text-muted-foreground">{t(board.stage==="PRELIMINARY"?"preliminaryFormula":"finalFormula")}</p>{!board.items.length&&<p className="text-sm">{t("noPublicWorks")}</p>}<ol className="divide-y">{board.items.map(item=><li key={item.detailHref} className="space-y-3 py-5"><div className="flex flex-wrap items-baseline gap-3"><span className="text-lg font-semibold tabular-nums">{item.rank}</span><WorkspaceLink className="font-medium underline underline-offset-4" href={item.detailHref}>{item.content.title}</WorkspaceLink><span className="text-sm text-muted-foreground">{item.content.teamName}</span></div><div className="flex flex-wrap gap-2">{item.awards.map(award=><Badge variant="secondary" key={award}>{t("award."+award)}</Badge>)}{item.prizeMinor>0&&<span className="text-sm">¥{(item.prizeMinor/100).toLocaleString()}</span>}</div><p className="text-sm tabular-nums">{t("scoreLine",{professional:item.professionalScore.toFixed(2),total:item.totalScore.toFixed(2),votes:item.validStars})}</p><div className="flex flex-wrap gap-4 text-sm">{item.content.demoUrl&&<a href={item.content.demoUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">{t("demo")}</a>}{item.content.repositoryUrl&&<a href={item.content.repositoryUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">{t("repository")}</a>}{item.wallHref&&<WorkspaceLink href={item.wallHref} className="underline">{t("wall")}</WorkspaceLink>}</div></li>)}</ol>{board.popularityAwards.length>0&&<section className="space-y-3 border-t pt-4"><h3 className="font-semibold">{t("award.POPULARITY")}</h3><ul className="space-y-3">{board.popularityAwards.map(winner=><li key={winner.detailHref} className="flex flex-wrap gap-3 text-sm"><WorkspaceLink className="underline" href={winner.detailHref}>{winner.title}</WorkspaceLink><span>{winner.teamName}</span><span>{t("popularityVotes",{votes:winner.validStars})}</span></li>)}</ul></section>}</section>)}</div>;
}
