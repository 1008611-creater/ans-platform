"use client";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceNavigation } from "@/components/providers/workspace-navigation";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { agriReviewCommandSchema, agriReviewResultSchema, type AgriReviewCommand, type AgriReviewList, type AgriReviewResult } from "@/contracts/agri-reviews";
import { readAgriReviewRecovery, writeAgriReviewRecovery, type AgriReviewDraft } from "./agri-review-recovery";
const api = "/api/competitions/agrihackathon/reviews";
const selectClass = "w-full min-w-0 rounded-md border bg-background p-2 text-sm";
const fresh = (): AgriReviewDraft => ({ result: "NEEDS_ACTION", basis: "METADATA", items: ["materials","repository","demo"].map(key=>({key,result:"NOT_APPLICABLE",note:""})),internalNote:"",feedback:{} });
const accountErrors = new Set(["UNAUTHORIZED","ACCOUNT_CHANGED","ACCOUNT_UNAVAILABLE"]);
class ReviewError extends Error { constructor(public code: string, public uncertain = false) { super(code); } }
async function request<T>(path: string, actorId: string, command?: AgriReviewCommand): Promise<T> {
  let response: Response;
  try { response = await fetch(path,{cache:"no-store",signal:AbortSignal.timeout(15000),headers:{"x-ans-submission-actor":actorId,...(command?{"content-type":"application/json"}:{})},...(command?{method:"POST",body:JSON.stringify(command)}:{})}); }
  catch { throw new ReviewError("INTERNAL_ERROR",!!command); }
  let body; try { body = await response.json(); } catch { throw new ReviewError("INTERNAL_ERROR",!!command); }
  if(!response.ok || body.ok !== true) throw new ReviewError(body.error?.code ?? "INTERNAL_ERROR",!!command && response.status>=500);
  if(command && !agriReviewResultSchema.safeParse(body.data).success) throw new ReviewError("INTERNAL_ERROR",true);
  return body.data as T;
}
function Field({label,children}:{label:string;children:(id:string)=>ReactNode}) { const id=useId(); return <div className="min-w-0 space-y-2"><label htmlFor={id} className="text-sm font-medium">{label}</label>{children(id)}</div>; }
export function AgriReviews({actorId,submissionId,scope,invalidate}:{actorId:string;submissionId:string;scope:"team"|"staff";invalidate:()=>void}) {
  const t=useTranslations("product.agriReviews"); const {data,status}=useSession(); const [open,setOpen]=useState(false);
  if(status !== "authenticated" || data?.user?.id !== actorId) return null;
  return <section className="min-w-0 space-y-4 rounded-xl border p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{t(scope === "staff" ? "title" : "teamTitle")}</h3>{!open && <Button variant="outline" onClick={()=>setOpen(true)}>{t("open")}</Button>}</div>
    {open && <ReviewWorkspace key={actorId+":"+submissionId+":"+scope} actorId={actorId} submissionId={submissionId} scope={scope} invalidate={invalidate}/>}
  </section>;
}
function ReviewWorkspace({actorId,submissionId,scope,invalidate}:{actorId:string;submissionId:string;scope:"team"|"staff";invalidate:()=>void}) {
  const t=useTranslations("product.agriReviews"),locale=useLocale(), navigation=useWorkspaceNavigation();
  const [view,setView]=useState<AgriReviewList|null>(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[note,setNote]=useState("");
  const recovered=useRef(readAgriReviewRecovery(actorId,submissionId));
  const [draft,setDraft]=useState<AgriReviewDraft>(()=>recovered.current?.draft ?? fresh());
  const [pending,setPending]=useState<AgriReviewCommand|null>(()=>recovered.current?.pending ?? null);
  const [consents,setConsents]=useState<Record<string,boolean>>({});
  const alive=useRef(true),generation=useRef(0),flight=useRef(false),pendingRef=useRef(pending),draftRef=useRef(draft),invalidateRef=useRef(invalidate);
  invalidateRef.current=invalidate; draftRef.current=draft;
  const [leaveOpen,setLeaveOpen]=useState(false); const leaveAction=useRef<(()=>void)|null>(null); const cancelLeave=useRef<(()=>void)|null>(null);
  const [withdraw,setWithdraw]=useState<{id:string;sequence:number}|null>(null);
  const {feedback:feedbackDrafts,...checkDraft}=draft; const emptyCheck={result:fresh().result,basis:fresh().basis,items:fresh().items,internalNote:""};
  const changed=JSON.stringify(checkDraft)!==JSON.stringify(emptyCheck) || Object.values(feedbackDrafts).some(value=>value.length>0); const dirtyRef=useRef(changed);dirtyRef.current=changed;
  const persist=useCallback((value:AgriReviewDraft,command:AgriReviewCommand|null)=>writeAgriReviewRecovery(actorId,submissionId,{draft:value,pending:command}),[actorId,submissionId]);
  const load=useCallback(async(cursor?:string)=>{
    const gen=++generation.current;setLoading(true);setError("");setView(null);
    try {
      const value=await request<AgriReviewList>(api+"/"+encodeURIComponent(submissionId)+"?"+new URLSearchParams({scope,...(cursor?{cursor}:{})}),actorId);
      if(!alive.current || gen!==generation.current)return;
      setView(value);
      if(scope === "staff" && (!value.canReadPrivateMaterials || !value.canUseInternalNotes)) {
        const safe={...draftRef.current,...(!value.canUseInternalNotes || !value.canReadPrivateMaterials && draftRef.current.basis === "PRIVATE_MATERIALS"?{internalNote:""}:{}),...(!value.canReadPrivateMaterials && draftRef.current.basis === "PRIVATE_MATERIALS"?{basis:"METADATA" as const,items:fresh().items}: {})};
        setDraft(safe);draftRef.current=safe;
        // Keep the original unknown command in memory for receipt recovery, but never render its private text.
        persist(safe,pendingRef.current);
      }
    } catch(e) {if(!alive.current || gen!==generation.current)return;const code=e instanceof ReviewError?e.code:"INTERNAL_ERROR";setError(code);if(accountErrors.has(code))invalidateRef.current();}
    finally {if(alive.current && gen===generation.current)setLoading(false);}
  },[actorId,submissionId,scope,persist]);
  useEffect(()=>{const requests=generation;alive.current=true;void load();return()=>{alive.current=false;++requests.current;};},[load]);
  useEffect(()=>{if(scope !== "staff")return;return navigation.register((action,cancel)=>{if(!dirtyRef.current && !pendingRef.current){action();return;}leaveAction.current=action;cancelLeave.current=cancel;setLeaveOpen(true);});},[navigation,scope]);
  useEffect(()=>{const before=(event:BeforeUnloadEvent)=>{if(dirtyRef.current || pendingRef.current){event.preventDefault();event.returnValue="";}};window.addEventListener("beforeunload",before);return()=>window.removeEventListener("beforeunload",before);},[]);
  function edit(value:AgriReviewDraft){setDraft(value);draftRef.current=value;persist(value,pendingRef.current);setNote("");}
  async function mutate(raw:AgriReviewCommand) {
    if(flight.current)return;
    const parsed=agriReviewCommandSchema.safeParse(pendingRef.current ?? raw);
    if(!parsed.success){setError("INVALID_INPUT");return;}
    const wasPending=!!pendingRef.current; const command=parsed.data;flight.current=true;pendingRef.current=command;setPending(command);persist(draftRef.current,command);setBusy(true);setError("");setNote("");
    try {
      await request<AgriReviewResult>(api,actorId,command);
      if(!alive.current)return;
      pendingRef.current=null;setPending(null);
      const next=command.action === "recordCheck"?{...fresh(),feedback:draftRef.current.feedback}:command.action === "publishFeedback"?{...draftRef.current,feedback:{...draftRef.current.feedback,[command.checkId]:""}}:draftRef.current;
      setDraft(next);draftRef.current=next;persist(next,null);setConsents({});setNote(t("saved"));await load();
    } catch(e) {
      if(!alive.current)return;
      const code=e instanceof ReviewError?e.code:"INTERNAL_ERROR";
      if(accountErrors.has(code))invalidateRef.current();
      // A rejected retry before receipt lookup (including lost scope/429) does not prove the first request failed.
      if((e instanceof ReviewError && !e.uncertain && !wasPending) || ["AGRI_FEEDBACK_REVISION_CONFLICT","AGRI_IDEMPOTENCY_CONFLICT","AGRI_FEEDBACK_NOT_PUBLISHED","INVALID_INPUT"].includes(code)) {pendingRef.current=null;setPending(null);persist(draftRef.current,null);}
      setError(code);
    } finally {flight.current=false;if(alive.current)setBusy(false);}
  }
  const at=(value:string)=>new Intl.DateTimeFormat(locale === "zh"?"zh-CN":"en-GB",{timeZone:"Asia/Shanghai",dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
  const locked=busy || !!pending || loading;
  const message=(code:string)=>t.has("errors."+code)?t("errors."+code):t("errors.INTERNAL_ERROR");
  return <div className="space-y-5">
    <AlertDialog open={leaveOpen} onOpenChange={open=>{setLeaveOpen(open);if(!open&&leaveAction.current){leaveAction.current=null;cancelLeave.current?.();cancelLeave.current=null;}}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("leaveTitle")}</AlertDialogTitle><AlertDialogDescription>{t("leaveText")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("stay")}</AlertDialogCancel><AlertDialogAction onClick={()=>{const action=leaveAction.current;leaveAction.current=null;action?.();}}>{t("leave")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={!!withdraw} onOpenChange={open=>{if(!open)setWithdraw(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("withdrawTitle")}</AlertDialogTitle><AlertDialogDescription>{t("withdrawText")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("cancel")}</AlertDialogCancel><AlertDialogAction onClick={()=>{const choice=withdraw;setWithdraw(null);if(choice)void mutate({action:"withdrawFeedback",idempotencyKey:crypto.randomUUID(),checkId:choice.id,expectedSequence:choice.sequence});}}>{t("withdraw")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <p className="break-all text-xs text-muted-foreground">{t("submissionId",{id:submissionId})}</p><p className="text-sm leading-6 text-muted-foreground">{t(scope === "staff"?"hint":"teamHint")}</p>
    {error && <p role="alert">{message(error)}</p>}{note && <p role="status">{note}</p>}{loading && <p role="status">{t("loading")}</p>}
    {pending && <div className="space-y-3 rounded-xl border p-3"><p role="alert">{t("pending")}</p><Button disabled={busy} onClick={()=>void mutate(pending)}>{t("retry")}</Button></div>}
    <Button variant="outline" disabled={busy||loading} onClick={()=>void load()}>{t("refresh")}</Button>
    {view && <><p className="break-all text-xs text-muted-foreground">{t("version",{number:view.submissionSequence,id:view.artifactVersionId})}</p>
      {!view.checks.length && <p className="text-sm">{t("empty")}</p>}
      {view.checks.map(check=><article key={check.id} className="min-w-0 space-y-3 rounded-xl border p-4">
        <div className="flex flex-wrap gap-3"><Badge variant="secondary">{t("result."+check.result)}</Badge><span className="text-sm">{at(check.checkedAt)}</span><span className="text-xs text-muted-foreground">{t("basis."+check.basis)}</span></div>
        {check.checklist && <dl className="space-y-2">{check.checklist.items.map(item=><div key={item.key} className="text-sm"><dt className="font-medium">{t.has("item."+item.key)?t("item."+item.key):item.key} · {t("result."+item.result)}</dt>{item.note && <dd className="whitespace-pre-wrap break-words">{item.note}</dd>}</div>)}</dl>}
        {check.internalNote && <div className="rounded-lg bg-muted/40 p-3 text-sm"><p className="font-medium">{t("internalNote")}</p><p className="whitespace-pre-wrap break-words">{check.internalNote}</p></div>}
        <div className="space-y-2 text-sm"><p className="font-medium">{t("feedback")}</p>{check.feedback?<><p className="whitespace-pre-wrap break-words">{check.feedback.body}</p><p className="text-xs text-muted-foreground">{at(check.feedback.publishedAt)}</p></>:<p className="text-muted-foreground">{t("noFeedback")}</p>}</div>
        {view.canRecordCheck && <div className="space-y-3 border-t pt-3"><Field label={t("feedbackDraft")}>{id=><Textarea id={id} disabled={locked} maxLength={4000} value={draft.feedback[check.id]??""} onChange={event=>edit({...draft,feedback:{...draft.feedback,[check.id]:event.target.value}})}/>}</Field>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" disabled={locked} checked={!!consents[check.id]} onChange={event=>setConsents(old=>({...old,[check.id]:event.target.checked}))}/><span>{t("publishConfirm")}</span></label>
          <div className="flex flex-wrap gap-3"><Button disabled={locked||!consents[check.id]||!draft.feedback[check.id]?.trim()} onClick={()=>void mutate({action:"publishFeedback",idempotencyKey:crypto.randomUUID(),checkId:check.id,expectedSequence:check.feedbackSequence??0,body:draft.feedback[check.id]})}>{t("publish")}</Button>{check.feedback && <Button variant="outline" disabled={locked} onClick={()=>setWithdraw({id:check.id,sequence:check.feedbackSequence??0})}>{t("withdraw")}</Button>}</div>
        </div>}
      </article>)}
      {view.nextCursor && <Button variant="outline" disabled={locked} onClick={()=>navigation.run(()=>void load(view.nextCursor!))}>{t("more")}</Button>}
      {view.canRecordCheck && <form className="space-y-4 rounded-xl border bg-muted/20 p-4" onSubmit={event=>{event.preventDefault();void mutate({action:"recordCheck",idempotencyKey:crypto.randomUUID(),submissionId,result:draft.result,basis:draft.basis,checklist:{schemaVersion:1,items:draft.items},internalNote:draft.internalNote.trim()||null});}}>
        <h4 className="font-semibold">{t("newCheck")}</h4><p className="text-sm text-muted-foreground">{t("manual")}</p>
        <div className="grid gap-4 sm:grid-cols-2"><Field label={t("overall")}>{id=><select id={id} className={selectClass} disabled={locked} value={draft.result} onChange={event=>edit({...draft,result:event.target.value as AgriReviewDraft["result"]})}>{["PASS","NEEDS_ACTION","UNREACHABLE"].map(value=><option key={value} value={value}>{t("result."+value)}</option>)}</select>}</Field>
          <Field label={t("basisLabel")}>{id=><select id={id} className={selectClass} disabled={locked} value={draft.basis} onChange={event=>edit({...draft,basis:event.target.value as AgriReviewDraft["basis"],...(draft.basis === "PRIVATE_MATERIALS" && event.target.value === "METADATA" ? {items:fresh().items,internalNote:""} : {})})}><option value="METADATA">{t("basis.METADATA")}</option>{view.canReadPrivateMaterials && <option value="PRIVATE_MATERIALS">{t("basis.PRIVATE_MATERIALS")}</option>}</select>}</Field></div>
        {draft.items.map((item,index)=><fieldset key={item.key} className="space-y-3 rounded-lg border p-3"><legend className="px-1 text-sm font-medium">{t("item."+item.key)}</legend><Field label={t("itemResult",{item:t("item."+item.key)})}>{id=><select id={id} className={selectClass} disabled={locked} value={item.result} onChange={event=>edit({...draft,items:draft.items.map((row,i)=>i === index?{...row,result:event.target.value as typeof item.result}:row)})}>{["PASS","NEEDS_ACTION","UNREACHABLE","NOT_APPLICABLE"].map(value=><option key={value} value={value}>{t("result."+value)}</option>)}</select>}</Field><Field label={t("itemNote",{item:t("item."+item.key)})}>{id=><Textarea id={id} disabled={locked} maxLength={2000} value={item.note} onChange={event=>edit({...draft,items:draft.items.map((row,i)=>i === index?{...row,note:event.target.value}:row)})}/>}</Field></fieldset>)}
        {view.canUseInternalNotes && <Field label={t("internalNote")}>{id=><Textarea id={id} disabled={locked} maxLength={4000} value={draft.internalNote} onChange={event=>edit({...draft,internalNote:event.target.value})}/>}</Field>}
        <Button type="submit" disabled={locked}>{t("record")}</Button>
      </form>}
    </>}
  </div>;
}
