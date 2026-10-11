"use client";
import { useCallback,useEffect,useId,useRef,useState,type ReactNode } from "react";
import { useLocale,useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceNavigation } from "@/components/providers/workspace-navigation";
import { AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction } from "@/components/ui/alert-dialog";
import { agriIssueCommandSchema,agriIssueResultSchema,type AgriIssueCommand,type AgriIssueFields,type AgriIssueList,type AgriIssueDetail,type AgriIssueItem,type AgriIssueResult } from "@/contracts/agri-issues";
const api="/api/competitions/agrihackathon/issues",selectClass="w-full min-w-0 rounded-md border bg-background p-2 text-sm";
const accountErrors=new Set(["UNAUTHORIZED","ACCOUNT_CHANGED","ACCOUNT_UNAVAILABLE"]);
interface Draft {fields:AgriIssueFields;basis:"METADATA"|"PRIVATE_MATERIALS";issueId:string|null;revision:number;comment:string;commentVisibility:"TEAM"|"INTERNAL";commentBasis:"METADATA"|"PRIVATE_MATERIALS";commentReviewed:boolean}
interface Recovery {draft:Draft;pending:AgriIssueCommand|null;baseline:string}
const fresh=():Draft=>({fields:{title:"",body:"",status:"OPEN",severity:"MEDIUM",type:"OTHER",visibility:"TEAM",assigneeId:null,dueState:"UNKNOWN",dueAt:null,processingSummary:null,reviewedForTeam:false},basis:"METADATA",issueId:null,revision:0,comment:"",commentVisibility:"TEAM",commentBasis:"METADATA",commentReviewed:false});
function issueDraft(item:AgriIssueItem):Draft {return {...fresh(),issueId:item.id,revision:item.revision??0,basis:item.basis,fields:{title:item.title,body:item.body,status:item.status,severity:item.severity,type:item.type,visibility:item.visibility,assigneeId:item.assigneeId??null,dueState:item.dueState,dueAt:item.dueAt,processingSummary:item.processingSummary,reviewedForTeam:false},commentVisibility:item.visibility,commentBasis:item.basis};}
const recoveries=new Map<string,Recovery>();let activeActor:string|null=null;
function updateActor(actor:string|null){if(activeActor!==actor){recoveries.clear();activeActor=actor;}}
/** Mount with the existing session boundaries to clear tab-only draft/command memory on sign-out or account switch. */
export function AgriIssueSessionBoundary(){const {data,status}=useSession();useEffect(()=>{if(status!=="loading")updateActor(status==="authenticated"?data?.user?.id??null:null);},[status,data?.user?.id]);return null;}
class IssueError extends Error {constructor(public code:string,public uncertain=false){super(code);}}
async function request<T>(path:string,actorId:string,command?:AgriIssueCommand):Promise<T>{
 let response:Response;try{response=await fetch(path,{cache:"no-store",signal:AbortSignal.timeout(15000),headers:{"x-ans-submission-actor":actorId,...(command?{"content-type":"application/json"}:{})},...(command?{method:"POST",body:JSON.stringify(command)}:{})});}catch{throw new IssueError("INTERNAL_ERROR",!!command);}
 let body;try{body=await response.json();}catch{throw new IssueError("INTERNAL_ERROR",!!command);}
 if(!response.ok||body.ok!==true)throw new IssueError(body.error?.code??"INTERNAL_ERROR",!!command&&response.status>=500);
 if(command&&!agriIssueResultSchema.safeParse(body.data).success)throw new IssueError("INTERNAL_ERROR",true);return body.data as T;
}
function Field({label,children}:{label:string;children:(id:string)=>ReactNode}){const id=useId();return <div className="min-w-0 space-y-2"><label htmlFor={id} className="text-sm font-medium">{label}</label>{children(id)}</div>;}
export function AgriIssues({actorId,submissionId,scope,invalidate,initialIssueId}:{actorId:string;submissionId:string;scope:"team"|"staff";invalidate:()=>void;initialIssueId?:string}){
 const t=useTranslations("product.agriIssues"),{data,status}=useSession();const [open,setOpen]=useState(!!initialIssueId);
 useEffect(()=>{if(status!=="loading")updateActor(status==="authenticated"?data?.user?.id??null:null);},[status,data?.user?.id]);
 if(status!=="authenticated"||data?.user?.id!==actorId)return null;
 return <section className="min-w-0 space-y-4 rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{t(scope==="staff"?"title":"teamTitle")}</h3>{!open&&<Button variant="outline" onClick={()=>setOpen(true)}>{t("open")}</Button>}</div>{open&&<IssueWorkspace key={actorId+":"+submissionId+":"+scope} actorId={actorId} submissionId={submissionId} scope={scope} invalidate={invalidate} initialIssueId={initialIssueId}/>}</section>;
}
function IssueWorkspace({actorId,submissionId,scope,invalidate,initialIssueId}:{actorId:string;submissionId:string;scope:"team"|"staff";invalidate:()=>void;initialIssueId?:string}){
 const t=useTranslations("product.agriIssues"),locale=useLocale(),navigation=useWorkspaceNavigation(),key=actorId+":"+submissionId;
 const recovered=useRef(scope==="staff"?recoveries.get(key):null);
 const [draft,setDraft]=useState<Draft>(()=>recovered.current?.draft??fresh()),[pending,setPending]=useState<AgriIssueCommand|null>(()=>recovered.current?.pending??null);
 const [view,setView]=useState<AgriIssueList|null>(null),[detail,setDetail]=useState<AgriIssueDetail|null>(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState(false),[leaveOpen,setLeaveOpen]=useState(false);
 const alive=useRef(true),generation=useRef(0),flight=useRef(false),draftRef=useRef(draft),pendingRef=useRef(pending),invalidateRef=useRef(invalidate),leaveAction=useRef<(()=>void)|null>(null),leaveCancel=useRef<(()=>void)|null>(null);draftRef.current=draft;invalidateRef.current=invalidate;
 const baseline=useRef(recovered.current?.baseline??JSON.stringify(fresh()));const dirty=JSON.stringify(draft)!==baseline.current,dirtyRef=useRef(dirty);dirtyRef.current=dirty;
 const persist=useCallback((next:Draft,command:AgriIssueCommand|null)=>{if(scope==="staff"&&activeActor===actorId)recoveries.set(key,{draft:next,pending:command,baseline:baseline.current});},[scope,actorId,key]);
 const load=useCallback(async(issueId?:string,cursor?:string)=>{
  const gen=++generation.current;setLoading(true);setError("");setView(null);setDetail(null);
  try{const query="?"+new URLSearchParams({scope,...(cursor?{cursor}:{})});
   const restrictDraft=(value:{canUseInternalNotes:boolean;canReadPrivateMaterials:boolean})=>{
    if(scope!=="staff")return;
    const privateDraft=draftRef.current.basis==="PRIVATE_MATERIALS"||draftRef.current.commentBasis==="PRIVATE_MATERIALS",internalDraft=draftRef.current.fields.visibility==="INTERNAL"||draftRef.current.commentVisibility==="INTERNAL";
    if((!value.canReadPrivateMaterials&&privateDraft)||(!value.canUseInternalNotes&&internalDraft)){const next=fresh();baseline.current=JSON.stringify(next);setDraft(next);draftRef.current=next;persist(next,pendingRef.current);}
   };
   if(issueId){const value=await request<AgriIssueDetail>(api+"/item/"+encodeURIComponent(issueId)+query,actorId);if(!alive.current||gen!==generation.current)return;setDetail(value);restrictDraft(value);if(value.canWrite&&value.issue.revision&&!dirtyRef.current&&!pendingRef.current&&draftRef.current.issueId===null){const next=issueDraft(value.issue);baseline.current=JSON.stringify(next);setDraft(next);draftRef.current=next;persist(next,null);}}
   else{const value=await request<AgriIssueList>(api+"/"+encodeURIComponent(submissionId)+query,actorId);if(!alive.current||gen!==generation.current)return;setView(value);restrictDraft(value);}  }catch(e){if(!alive.current||gen!==generation.current)return;const code=e instanceof IssueError?e.code:"INTERNAL_ERROR";setError(code);if(accountErrors.has(code))invalidateRef.current();}
  finally{if(alive.current&&gen===generation.current)setLoading(false);}
 },[actorId,submissionId,scope,persist]);
 useEffect(()=>{const requests=generation;alive.current=true;void load(initialIssueId);return()=>{alive.current=false;++requests.current;};},[load,initialIssueId]);
 useEffect(()=>{if(scope!=="staff")return;return navigation.register((action,cancel)=>{if(!dirtyRef.current&&!pendingRef.current){action();return;}leaveAction.current=action;leaveCancel.current=cancel;setLeaveOpen(true);});},[navigation,scope]);
 useEffect(()=>{const before=(event:BeforeUnloadEvent)=>{if(dirtyRef.current||pendingRef.current){event.preventDefault();event.returnValue="";}};window.addEventListener("beforeunload",before);return()=>window.removeEventListener("beforeunload",before);},[]);
 function edit(next:Draft){setDraft(next);draftRef.current=next;persist(next,pendingRef.current);setSaved(false);}
 function choose(item:AgriIssueItem){if(scope==="staff"&&item.revision){const next=issueDraft(item);baseline.current=JSON.stringify(next);edit(next);}void load(item.id);}
 function changeFields(part:Partial<AgriIssueFields>){const fields={...draft.fields,...part,reviewedForTeam:false};if(draft.fields.visibility==="INTERNAL"&&part.visibility==="TEAM"){fields.title="";fields.body="";fields.processingSummary=null;}if(part.dueState==="UNKNOWN")fields.dueAt=null;if(part.status&&!["RESOLVED","CLOSED"].includes(part.status))fields.processingSummary=null;edit({...draft,fields});}
 async function mutate(raw:AgriIssueCommand){if(flight.current)return;const parsed=agriIssueCommandSchema.safeParse(pendingRef.current??raw);if(!parsed.success){setError("INVALID_INPUT");return;}const wasPending=!!pendingRef.current,command=parsed.data;flight.current=true;pendingRef.current=command;setPending(command);persist(draftRef.current,command);setBusy(true);setError("");setSaved(false);
  try{const result=await request<AgriIssueResult>(api,actorId,command);if(!alive.current)return;pendingRef.current=null;setPending(null);let next:Draft;
   if(command.action==="appendEvent"){const previous=JSON.parse(baseline.current) as Draft;baseline.current=JSON.stringify({...previous,revision:result.appliedRevision,comment:"",commentReviewed:false});next={...draftRef.current,revision:result.appliedRevision,comment:"",commentReviewed:false};}
   else{next=fresh();baseline.current=JSON.stringify(next);}setDraft(next);draftRef.current=next;persist(next,null);setSaved(true);await load(command.action==="appendEvent"?command.issueId:undefined);}
  catch(e){if(!alive.current)return;const code=e instanceof IssueError?e.code:"INTERNAL_ERROR";if(accountErrors.has(code))invalidateRef.current();
   if((e instanceof IssueError&&!e.uncertain&&!wasPending)||["AGRI_ISSUE_REVISION_CONFLICT","AGRI_IDEMPOTENCY_CONFLICT","INVALID_INPUT"].includes(code)){pendingRef.current=null;setPending(null);persist(draftRef.current,null);}setError(code);
  }finally{flight.current=false;if(alive.current)setBusy(false);}
 }
 const permission=detail??view,locked=busy||loading||!!pending,canEdit=scope==="staff"&&!!permission?.canWrite;
 const at=(value:string)=>new Intl.DateTimeFormat(locale==="zh"?"zh-CN":"en-GB",{timeZone:"Asia/Shanghai",dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
 const dueInput=draft.fields.dueAt?new Date(new Date(draft.fields.dueAt).getTime()+8*3600000).toISOString().slice(0,16):"";
 const message=(code:string)=>t.has("errors."+code)?t("errors."+code):t("errors.INTERNAL_ERROR");
 const enumSelect=(label:string,value:string,values:string[],onChange:(value:string)=>void)=><Field label={t(label)}>{id=><select id={id} className={selectClass} disabled={locked} value={value} onChange={e=>onChange(e.target.value)}>{values.map(item=><option key={item} value={item}>{t(label+"Options."+item)}</option>)}</select>}</Field>;
 return <div className="space-y-5">
  <AlertDialog open={leaveOpen} onOpenChange={open=>{setLeaveOpen(open);if(!open&&leaveAction.current){leaveAction.current=null;const cancel=leaveCancel.current;leaveCancel.current=null;cancel?.();}}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("leaveTitle")}</AlertDialogTitle><AlertDialogDescription>{t("leaveText")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("stay")}</AlertDialogCancel><AlertDialogAction onClick={()=>{const action=leaveAction.current;leaveAction.current=null;leaveCancel.current=null;action?.();}}>{t("leave")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  <p className="break-all text-xs text-muted-foreground">{t("submissionId",{id:submissionId})}</p><p className="text-sm leading-6 text-muted-foreground">{t(scope==="staff"?"hint":"teamHint")}</p>
  {error&&<p role="alert">{message(error)}</p>}{saved&&<p role="status">{t("saved")}</p>}{loading&&<p role="status">{t("loading")}</p>}
  {pending&&<div className="space-y-3 rounded-xl border p-3"><p role="alert">{t("pending")}</p><Button disabled={busy} onClick={()=>void mutate(pending)}>{t("retry")}</Button></div>}
  <Button variant="outline" disabled={busy||loading} onClick={()=>void load()}>{t("refresh")}</Button>
  {view&&<><p className="break-all text-xs text-muted-foreground">{t("version",{number:view.submissionSequence,id:view.artifactVersionId})}</p>{!view.issues.length&&<p>{t("empty")}</p>}{view.issues.map(item=><article key={item.id} className="min-w-0 space-y-3 rounded-xl border p-4"><h4 className="break-words font-semibold">{item.title}</h4><div className="flex flex-wrap gap-2"><Badge variant="secondary">{t("statusOptions."+item.status)}</Badge><Badge variant="outline">{t("severityOptions."+item.severity)}</Badge><span className="text-sm">{t("typeOptions."+item.type)}</span><span className="text-sm">{t("visibilityOptions."+item.visibility)}</span></div><p className="whitespace-pre-wrap break-words text-sm">{item.body}</p><p className="text-sm">{t("dueStateOptions."+item.dueState)}{item.dueAt&&" · "+at(item.dueAt)}</p>{item.processingSummary&&<p className="whitespace-pre-wrap break-words text-sm">{item.processingSummary}</p>}<Button variant="outline" disabled={locked} onClick={()=>navigation.run(()=>choose(item))}>{t(view.canWrite?"edit":"history")}</Button></article>)}{view.nextCursor&&<Button variant="outline" disabled={locked} onClick={()=>navigation.run(()=>void load(undefined,view.nextCursor!))}>{t("more")}</Button>}</>}
  {detail&&<section className="min-w-0 space-y-3 rounded-xl border p-4"><h4 className="break-words font-semibold">{t("historyTitle",{title:detail.issue.title})}</h4>{detail.events.map(event=><article key={event.id} className="space-y-2 border-t pt-3 text-sm"><div className="flex flex-wrap gap-2"><span>{t("eventKind."+event.kind)}</span><span>{t("visibilityOptions."+event.visibility)}</span><span>{at(event.createdAt)}</span></div><p className="whitespace-pre-wrap break-words">{event.body}</p></article>)}{detail.nextCursor&&<Button variant="outline" disabled={locked} onClick={()=>void load(detail.issue.id,detail.nextCursor!)}>{t("moreEvents")}</Button>}</section>}
  {canEdit&&<form className="min-w-0 space-y-4 rounded-xl border p-4" onSubmit={e=>{e.preventDefault();void mutate(draft.issueId?{action:"updateIssue",idempotencyKey:crypto.randomUUID(),issueId:draft.issueId,expectedRevision:draft.revision,...draft.fields}:{action:"createIssue",idempotencyKey:crypto.randomUUID(),submissionId,basis:draft.basis,...draft.fields});}}>
   <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="font-semibold">{t(draft.issueId?"editIssue":"newIssue")}</h4>{draft.issueId&&<Button type="button" variant="outline" disabled={locked} onClick={()=>navigation.run(()=>{baseline.current=JSON.stringify(fresh());edit(fresh());})}>{t("newIssue")}</Button>}</div>
   {enumSelect("visibility",draft.fields.visibility,permission.canUseInternalNotes?["TEAM","INTERNAL"]:["TEAM"],value=>changeFields({visibility:value as AgriIssueFields["visibility"]}))}
   <Field label={t("issueTitle")}>{id=><Input id={id} value={draft.fields.title} maxLength={180} required disabled={locked} onChange={e=>changeFields({title:e.target.value})}/>}</Field>
   <Field label={t("body")}>{id=><Textarea id={id} value={draft.fields.body} maxLength={4000} required disabled={locked} onChange={e=>changeFields({body:e.target.value})}/>}</Field>
   <div className="grid gap-4 sm:grid-cols-2">{enumSelect("status",draft.fields.status,["OPEN","IN_PROGRESS","BLOCKED","RESOLVED","CLOSED"],value=>changeFields({status:value as AgriIssueFields["status"]}))}{enumSelect("severity",draft.fields.severity,["LOW","MEDIUM","HIGH","CRITICAL"],value=>changeFields({severity:value as AgriIssueFields["severity"]}))}{enumSelect("type",draft.fields.type,["BUG","ENVIRONMENT","DATA","ACCESS","OTHER"],value=>changeFields({type:value as AgriIssueFields["type"]}))}{!draft.issueId&&enumSelect("basis",draft.basis,permission.canReadPrivateMaterials?["METADATA","PRIVATE_MATERIALS"]:["METADATA"],value=>edit({...draft,basis:value as Draft["basis"],fields:{...draft.fields,title:"",body:"",processingSummary:null,reviewedForTeam:false}}))}</div>
   <Field label={t("assignee")}>{id=><Input id={id} disabled={locked} value={draft.fields.assigneeId??""} maxLength={80} onChange={e=>changeFields({assigneeId:e.target.value.trim()||null})}/>}</Field><p className="text-xs text-muted-foreground">{t("assigneeHint")}</p>
   {enumSelect("dueState",draft.fields.dueState,["UNKNOWN","TENTATIVE","CONFIRMED"],value=>changeFields({dueState:value as AgriIssueFields["dueState"]}))}
   {draft.fields.dueState!=="UNKNOWN"&&<Field label={t("dueAt")}>{id=><Input id={id} type="datetime-local" disabled={locked} required value={dueInput} onChange={e=>changeFields({dueAt:e.target.value?new Date(e.target.value+"+08:00").toISOString():null})}/>}</Field>}
   {["RESOLVED","CLOSED"].includes(draft.fields.status)&&<Field label={t("processingSummary")}>{id=><Textarea id={id} disabled={locked} required maxLength={4000} value={draft.fields.processingSummary??""} onChange={e=>changeFields({processingSummary:e.target.value||null})}/>}</Field>}
   {draft.fields.visibility==="TEAM"&&<label className="flex items-start gap-2 text-sm"><input type="checkbox" disabled={locked} checked={draft.fields.reviewedForTeam} onChange={e=>edit({...draft,fields:{...draft.fields,reviewedForTeam:e.target.checked}})}/><span>{t("teamReview")}</span></label>}
   <Button type="submit" disabled={locked||draft.fields.visibility==="TEAM"&&!draft.fields.reviewedForTeam}>{t("save")}</Button>
  </form>}
  {canEdit&&detail&&draft.issueId===detail.issue.id&&<form className="min-w-0 space-y-4 rounded-xl border p-4" onSubmit={e=>{e.preventDefault();void mutate({action:"appendEvent",idempotencyKey:crypto.randomUUID(),issueId:draft.issueId!,expectedRevision:draft.revision,visibility:draft.commentVisibility,basis:draft.commentBasis,body:draft.comment,reviewedForTeam:draft.commentReviewed});}}><h4 className="font-semibold">{t("newEvent")}</h4>
   {enumSelect("eventVisibility",draft.commentVisibility,detail.issue.visibility==="INTERNAL"?["INTERNAL"]:permission.canUseInternalNotes?["TEAM","INTERNAL"]:["TEAM"],value=>edit({...draft,commentVisibility:value as Draft["commentVisibility"],comment:"",commentReviewed:false}))}
   {draft.basis==="METADATA"&&enumSelect("eventBasis",draft.commentBasis,permission.canReadPrivateMaterials?["METADATA","PRIVATE_MATERIALS"]:["METADATA"],value=>edit({...draft,commentBasis:value as Draft["commentBasis"],comment:"",commentReviewed:false}))}
   <Field label={t("eventBody")}>{id=><Textarea id={id} disabled={locked} required maxLength={4000} value={draft.comment} onChange={e=>edit({...draft,comment:e.target.value,commentReviewed:false})}/>}</Field>
   {draft.commentVisibility==="TEAM"&&<label className="flex items-start gap-2 text-sm"><input type="checkbox" disabled={locked} checked={draft.commentReviewed} onChange={e=>edit({...draft,commentReviewed:e.target.checked})}/><span>{t("eventReview")}</span></label>}<Button type="submit" disabled={locked||draft.commentVisibility==="TEAM"&&!draft.commentReviewed}>{t("append")}</Button>
  </form>}
 </div>;
}