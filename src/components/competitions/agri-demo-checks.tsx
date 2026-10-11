"use client";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { MonitorPlay, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useWorkspaceNavigation } from "@/components/providers/workspace-navigation";
import { agriDemoCommandSchema, agriDemoResultSchema, type AgriDemoCommand, type AgriDemoList, type AgriDemoSnapshot } from "@/contracts/agri-demo";
import { freshAgriDemoDraft, readAgriDemoRecovery, writeAgriDemoRecovery, type AgriDemoDraft } from "./agri-demo-recovery";
const api = "/api/competitions/agrihackathon/demo";
const conditions = ["device", "compatibility", "network", "audio", "backup"] as const;
const statuses = ["NOT_TESTED", "PASS", "NEEDS_ACTION", "UNREACHABLE", "NOT_APPLICABLE"] as const;
const selectClass = "w-full min-w-0 rounded-md border bg-background p-2 text-sm";
const accountErrors = new Set(["UNAUTHORIZED", "ACCOUNT_CHANGED", "ACCOUNT_UNAVAILABLE"]);
const definitiveErrors = new Set(["AGRI_DEMO_REVISION_CONFLICT", "AGRI_DEMO_LATEST_CONFLICT", "AGRI_DEMO_FEEDBACK_REVISION_CONFLICT", "AGRI_IDEMPOTENCY_CONFLICT", "AGRI_DEMO_FEEDBACK_NOT_PUBLISHED", "INVALID_INPUT"]);
class DemoError extends Error { constructor(public code: string, public uncertain = false) { super(code); } }
async function request<T>(path: string, actorId: string, command?: AgriDemoCommand): Promise<T> {
  let response: Response;
  try { response = await fetch(path, { cache: "no-store", signal: AbortSignal.timeout(15000), headers: { "x-ans-submission-actor": actorId, ...(command ? { "content-type": "application/json" } : {}) }, ...(command ? { method: "POST", body: JSON.stringify(command) } : {}) }); }
  catch { throw new DemoError("INTERNAL_ERROR", !!command); }
  let body; try { body = await response.json(); } catch { throw new DemoError("INTERNAL_ERROR", !!command); }
  if (!response.ok || body.ok !== true) throw new DemoError(body.error?.code ?? "INTERNAL_ERROR", !!command && response.status >= 500);
  if (command && !agriDemoResultSchema.safeParse(body.data).success) throw new DemoError("INTERNAL_ERROR", true);
  return body.data as T;
}
function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId(); return <div className="min-w-0 space-y-2"><label htmlFor={id} className="text-sm font-medium">{label}</label>{children(id)}</div>;
}
export function AgriDemoChecks({ actorId, submissionId, scope, invalidate }: { actorId: string; submissionId: string; scope: "team" | "staff"; invalidate: () => void }) {
  const t = useTranslations("product.agriDemo"); const { data, status } = useSession(); const [open, setOpen] = useState(false);
  if (status !== "authenticated" || data?.user?.id !== actorId) return null;
  return <section className="min-w-0 space-y-4 rounded-xl border p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-semibold"><MonitorPlay className="h-5 w-5" aria-hidden="true" />{t(scope === "staff" ? "title" : "teamTitle")}</h3>{!open && <Button variant="outline" onClick={() => setOpen(true)}>{t("open")}</Button>}</div>
    <p className="text-sm leading-6 text-muted-foreground">{t(scope === "staff" ? "intro" : "teamIntro")}</p>
    {open && <DemoWorkspace key={actorId + ":" + submissionId + ":" + scope} actorId={actorId} submissionId={submissionId} scope={scope} invalidate={invalidate} />}
  </section>;
}
function DemoWorkspace({ actorId, submissionId, scope, invalidate }: { actorId: string; submissionId: string; scope: "team" | "staff"; invalidate: () => void }) {
  const t = useTranslations("product.agriDemo"), locale = useLocale(), navigation = useWorkspaceNavigation();
  const recovered = useRef(scope === "staff" ? readAgriDemoRecovery(actorId, submissionId) : undefined);
  const [draft, setDraft] = useState<AgriDemoDraft>(() => recovered.current?.draft ?? freshAgriDemoDraft());
  const [pending, setPending] = useState<AgriDemoCommand | null>(() => recovered.current?.pending ?? null);
  const [view, setView] = useState<AgriDemoList | null>(null), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [note, setNote] = useState("");
  const [staleConsent, setStaleConsent] = useState(false), [publishConsents, setPublishConsents] = useState<Record<string, boolean>>({});
  const [leaveOpen, setLeaveOpen] = useState(false), [withdraw, setWithdraw] = useState<{ id: string; sequence: number } | null>(null);
  const alive = useRef(true), generation = useRef(0), flight = useRef(false), draftRef = useRef(draft), pendingRef = useRef(pending), invalidateRef = useRef(invalidate);
  const leaveAction = useRef<(() => void) | null>(null), cancelLeave = useRef<(() => void) | null>(null);
  invalidateRef.current = invalidate; draftRef.current = draft;
  const changed = JSON.stringify(draft) !== JSON.stringify(freshAgriDemoDraft()); const dirtyRef = useRef(changed); dirtyRef.current = changed;
  const persist = useCallback((value: AgriDemoDraft, command: AgriDemoCommand | null) => { if (scope === "staff") writeAgriDemoRecovery(actorId, submissionId, { draft: value, pending: command }); }, [actorId, submissionId, scope]);
  const load = useCallback(async (cursor?: string) => {
    const id = ++generation.current; setLoading(true); setError(""); setView(null); setStaleConsent(false);
    try {
      const value = await request<AgriDemoList>(api + "/" + encodeURIComponent(submissionId) + "?" + new URLSearchParams({ scope, ...(cursor ? { cursor } : {}) }), actorId);
      if (!alive.current || id !== generation.current) return;
      setView(value);
      if (scope === "staff") {
        const next = !value.canReadPrivateMaterials && draftRef.current.basis === "PRIVATE_MATERIALS" ? freshAgriDemoDraft() : { ...draftRef.current, ...(!value.canUseInternalNotes ? { internalNote: "" } : {}) };
        setDraft(next); draftRef.current = next; persist(next, pendingRef.current);
      }
    } catch (cause) {
      if (!alive.current || id !== generation.current) return;
      const code = cause instanceof DemoError ? cause.code : "INTERNAL_ERROR"; setError(code); if (accountErrors.has(code)) invalidateRef.current();
    } finally { if (alive.current && id === generation.current) setLoading(false); }
  }, [actorId, submissionId, scope, persist]);
  useEffect(() => { const requests = generation; alive.current = true; void load(); return () => { alive.current = false; ++requests.current; }; }, [load]);
  useEffect(() => {
    if (scope !== "staff") return;
    return navigation.register((action, cancel) => { if (!dirtyRef.current && !pendingRef.current) { action(); return; } leaveAction.current = action; cancelLeave.current = cancel; setLeaveOpen(true); });
  }, [navigation, scope]);
  useEffect(() => { const before = (event: BeforeUnloadEvent) => { if (dirtyRef.current || pendingRef.current) { event.preventDefault(); event.returnValue = ""; } }; window.addEventListener("beforeunload", before); return () => window.removeEventListener("beforeunload", before); }, []);
  function edit(value: AgriDemoDraft) { setDraft(value); draftRef.current = value; persist(value, pendingRef.current); setNote(""); }
  async function mutate(raw: AgriDemoCommand) {
    if (flight.current) return;
    const parsed = agriDemoCommandSchema.safeParse(pendingRef.current ?? raw);
    if (!parsed.success) { setError("INVALID_INPUT"); return; }
    const wasPending = !!pendingRef.current, command = parsed.data;
    flight.current = true; pendingRef.current = command; setPending(command); persist(draftRef.current, command); setBusy(true); setError(""); setNote("");
    try {
      await request(api, actorId, command);
      if (!alive.current) return;
      pendingRef.current = null; setPending(null);
      let next = command.action === "recordDemoCheck" ? freshAgriDemoDraft() : draftRef.current;
      if (command.action === "publishDemoFeedback") {
        const feedback = { ...next.feedback };
        delete feedback[command.checkId];
        next = { ...next, feedback };
      }
      edit(next); persist(next, null); setPublishConsents({}); setNote(t("saved")); await load();
    } catch (cause) {
      if (!alive.current) return;
      const code = cause instanceof DemoError ? cause.code : "INTERNAL_ERROR";
      if (accountErrors.has(code)) invalidateRef.current();
      if (cause instanceof DemoError && !cause.uncertain && !wasPending || definitiveErrors.has(code)) { pendingRef.current = null; setPending(null); persist(draftRef.current, null); }
      setError(code);
    } finally { flight.current = false; if (alive.current) setBusy(false); }
  }
  function record() {
    if (!view) return;
    const date = draft.demo.recheckDue.state === "UNKNOWN" ? null : draft.dueAtLocal ? new Date(draft.dueAtLocal + ":00+08:00") : null;
    if (draft.demo.recheckDue.state !== "UNKNOWN" && (!date || !Number.isFinite(date.getTime()))) { setError("AGRI_DEMO_DATE_STATE_INVALID"); return; }
    void mutate({ action: "recordDemoCheck", idempotencyKey: crypto.randomUUID(), submissionId, expectedLatestCheckId: view.latestCheckId, acknowledgeStaleSubmission: staleConsent, basis: draft.basis, demo: { ...draft.demo, recheckDue: { state: draft.demo.recheckDue.state, at: date?.toISOString() ?? null } }, internalNote: draft.internalNote.trim() || null });
  }
  function condition(key: typeof conditions[number], patch: Partial<AgriDemoSnapshot["device"]>) { edit({ ...draft, demo: { ...draft.demo, [key]: { ...draft.demo[key], ...patch } } }); }
  const locked = busy || !!pending || loading, canRecord = view?.canRecordCheck && (!view.latestCheckId || view.canRecheckLatest) && (view.isCurrentSubmission || staleConsent);
  const at = (value: string) => new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const message = (code: string) => t.has("errors." + code) ? t("errors." + code) : t("errors.INTERNAL_ERROR");
  return <div className="space-y-5">
    <AlertDialog open={leaveOpen} onOpenChange={open => { setLeaveOpen(open); if (!open && leaveAction.current) { leaveAction.current = null; cancelLeave.current?.(); cancelLeave.current = null; } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("leaveTitle")}</AlertDialogTitle><AlertDialogDescription>{t(pending ? "leavePending" : "leaveText")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("stay")}</AlertDialogCancel><AlertDialogAction onClick={() => { const action = leaveAction.current; leaveAction.current = null; action?.(); }}>{t("leave")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={!!withdraw} onOpenChange={open => { if (!open) setWithdraw(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("withdrawTitle")}</AlertDialogTitle><AlertDialogDescription>{t("withdrawText")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => { const chosen = withdraw; setWithdraw(null); if (chosen) void mutate({ action: "withdrawDemoFeedback", idempotencyKey: crypto.randomUUID(), checkId: chosen.id, expectedSequence: chosen.sequence }); }}>{t("withdraw")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    {error && <p role="alert" className="rounded-lg border p-3 text-sm">{message(error)}</p>}{note && <p role="status">{note}</p>}{loading && <p role="status">{t("loading")}</p>}
    {pending && <div className="space-y-3 rounded-xl border p-3"><p role="alert">{t("pending")}</p><Button disabled={busy} onClick={() => void mutate(pending)}>{t("retry")}</Button></div>}
    <Button variant="outline" disabled={busy || loading} onClick={() => void load()}><RotateCcw className="h-4 w-4" aria-hidden="true" />{t("refresh")}</Button>
    {view && <>
      <div className="space-y-2 rounded-lg bg-muted/30 p-3"><p className="break-all text-sm">{t("version", { sequence: view.submissionSequence, id: view.artifactVersionId })}</p><p className="text-xs leading-6 text-muted-foreground">{t("versionHint")}</p>{!view.isCurrentSubmission && <p role="status" className="text-sm">{t("oldSubmission")}</p>}</div>
      {!view.checks.length && <p className="text-sm text-muted-foreground">{t(scope === "team" ? "teamEmpty" : "empty")}</p>}
      {view.checks.map(check => <article key={check.id} className="min-w-0 space-y-4 rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-3"><Badge variant="secondary">{t("result." + check.result)}</Badge><span className="text-sm">{at(check.checkedAt)}</span>{scope === "staff" && <span className="text-xs text-muted-foreground">{t("basis." + check.basis)}</span>}</div>
        {check.recheckOfId && scope === "staff" && <p className="break-all text-xs text-muted-foreground">{t("rechecks", { id: check.recheckOfId })}</p>}
        {check.demo && <><p className="text-sm">{t("mode." + check.demo.mode)} · {check.demo.description}</p><dl className="grid gap-3 sm:grid-cols-2">{conditions.map(key => <div key={key} className="min-w-0 rounded-lg bg-muted/30 p-3 text-sm"><dt className="font-medium">{t("condition." + key)} · {t("status." + check.demo![key].status)}</dt>{check.demo![key].note && <dd className="mt-1 whitespace-pre-wrap break-words">{check.demo![key].note}</dd>}</div>)}</dl>{check.demo.backup.url && <a href={check.demo.backup.url} target="_blank" rel="noreferrer" className="block break-all text-sm underline">{t("backupLink")}</a>}{check.demo.backup.artifactVersionId && <p className="break-all text-xs">{t("backupVersion", { id: check.demo.backup.artifactVersionId })}</p>}{check.demo.recheckDue.at && <p className="text-sm">{t("recheckAt", { state: t("due." + check.demo.recheckDue.state), at: at(check.demo.recheckDue.at) })}</p>}</>}
        {check.internalNote && <div className="space-y-1 rounded-lg bg-muted/40 p-3 text-sm"><p className="font-medium">{t("internalNote")}</p><p className="whitespace-pre-wrap break-words">{check.internalNote}</p></div>}
        <div className="space-y-2 text-sm"><p className="font-medium">{t("feedback")}</p>{check.feedback ? <><p className="whitespace-pre-wrap break-words">{check.feedback.body}</p><p className="text-xs text-muted-foreground">{at(check.feedback.publishedAt)}</p></> : <p className="text-muted-foreground">{t("noFeedback")}</p>}</div>
        {scope === "staff" && view.canRecordCheck && <div className="space-y-3 border-t pt-3"><Field label={t("feedbackDraft")}>{id => <Textarea id={id} disabled={locked} maxLength={4000} value={draft.feedback[check.id] ?? ""} onChange={event => edit({ ...draft, feedback: { ...draft.feedback, [check.id]: event.target.value } })} />}</Field><label className="flex items-start gap-2 text-sm"><input type="checkbox" disabled={locked} checked={!!publishConsents[check.id]} onChange={event => setPublishConsents(old => ({ ...old, [check.id]: event.target.checked }))} /><span>{t("publishConfirm")}</span></label><div className="flex flex-wrap gap-3"><Button disabled={locked || !publishConsents[check.id] || !draft.feedback[check.id]?.trim()} onClick={() => void mutate({ action: "publishDemoFeedback", idempotencyKey: crypto.randomUUID(), checkId: check.id, expectedSequence: check.feedbackSequence ?? 0, body: draft.feedback[check.id] })}>{t("publish")}</Button>{check.feedback && <Button variant="outline" disabled={locked} onClick={() => setWithdraw({ id: check.id, sequence: check.feedbackSequence ?? 0 })}>{t("withdraw")}</Button>}</div></div>}
      </article>)}
      {view.nextCursor && <Button variant="outline" disabled={locked} onClick={() => navigation.run(() => void load(view.nextCursor!))}>{t("more")}</Button>}
      {scope === "staff" && view.recheckBlockedCode && <p role="status" className="text-sm">{message(view.recheckBlockedCode)}</p>}
      {scope === "staff" && view.canRecordCheck && <form className="space-y-5 rounded-xl border bg-muted/20 p-4 sm:p-5" onSubmit={event => { event.preventDefault(); record(); }}>
        <h4 className="font-semibold">{t(view.latestCheckId ? "newRecheck" : "newCheck")}</h4><p className="text-sm leading-6 text-muted-foreground">{t("manual")}</p>
        <div className="grid gap-4 sm:grid-cols-2"><Field label={t("modeLabel")}>{id => <select id={id} className={selectClass} disabled={locked} value={draft.demo.mode} onChange={event => edit({ ...draft, demo: { ...draft.demo, mode: event.target.value as AgriDemoSnapshot["mode"] } })}>{["LIVE", "VIDEO", "HYBRID", "OTHER"].map(mode => <option key={mode} value={mode}>{t("mode." + mode)}</option>)}</select>}</Field><Field label={t("basisLabel")}>{id => <select id={id} className={selectClass} disabled={locked} value={draft.basis} onChange={event => edit(event.target.value === "METADATA" && draft.basis === "PRIVATE_MATERIALS" ? freshAgriDemoDraft() : { ...draft, basis: event.target.value as AgriDemoDraft["basis"] })}><option value="METADATA">{t("basis.METADATA")}</option>{view.canReadPrivateMaterials && <option value="PRIVATE_MATERIALS">{t("basis.PRIVATE_MATERIALS")}</option>}</select>}</Field></div>
        <Field label={t("description")}>{id => <Textarea id={id} disabled={locked} maxLength={2000} value={draft.demo.description} onChange={event => edit({ ...draft, demo: { ...draft.demo, description: event.target.value } })} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">{conditions.map(key => <fieldset key={key} className="min-w-0 space-y-3 rounded-lg border bg-background/70 p-3"><legend className="px-1 text-sm font-medium">{t("condition." + key)}</legend><Field label={t("itemStatus", { item: t("condition." + key) })}>{id => <select id={id} className={selectClass} disabled={locked} value={draft.demo[key].status} onChange={event => condition(key, { status: event.target.value as AgriDemoSnapshot["device"]["status"] })}>{statuses.map(value => <option key={value} value={value}>{t("status." + value)}</option>)}</select>}</Field><Field label={t("itemNote", { item: t("condition." + key) })}>{id => <Textarea id={id} disabled={locked} maxLength={2000} value={draft.demo[key].note} onChange={event => condition(key, { note: event.target.value })} />}</Field></fieldset>)}</div>
        {draft.basis === "PRIVATE_MATERIALS" && view.canReadPrivateMaterials && <div className="grid gap-4 sm:grid-cols-2"><Field label={t("backupUrl")}>{id => <Input id={id} type="url" disabled={locked} value={draft.demo.backup.url ?? ""} onChange={event => edit({ ...draft, demo: { ...draft.demo, backup: { ...draft.demo.backup, url: event.target.value || null } } })} />}</Field><Field label={t("backupArtifact")}>{id => <Input id={id} disabled={locked} maxLength={80} value={draft.demo.backup.artifactVersionId ?? ""} onChange={event => edit({ ...draft, demo: { ...draft.demo, backup: { ...draft.demo.backup, artifactVersionId: event.target.value || null } } })} />}</Field></div>}
        <div className="grid gap-4 sm:grid-cols-2"><Field label={t("overall")}>{id => <select id={id} className={selectClass} disabled={locked} value={draft.demo.conclusion} onChange={event => edit({ ...draft, demo: { ...draft.demo, conclusion: event.target.value as AgriDemoSnapshot["conclusion"], ...(event.target.value === "PASS" ? { recheckDue: { state: "UNKNOWN", at: null } } : {}) }, ...(event.target.value === "PASS" ? { dueAtLocal: "" } : {}) })}>{["NEEDS_ACTION", "PASS", "UNREACHABLE"].map(value => <option key={value} value={value}>{t("result." + value)}</option>)}</select>}</Field><Field label={t("dueState")}>{id => <select id={id} className={selectClass} disabled={locked || draft.demo.conclusion === "PASS"} value={draft.demo.recheckDue.state} onChange={event => edit({ ...draft, demo: { ...draft.demo, recheckDue: { state: event.target.value as AgriDemoSnapshot["recheckDue"]["state"], at: null } }, dueAtLocal: "" })}>{["UNKNOWN", "TENTATIVE", "CONFIRMED"].map(value => <option key={value} value={value}>{t("due." + value)}</option>)}</select>}</Field></div>
        {draft.demo.recheckDue.state !== "UNKNOWN" && <Field label={t("dueTime")}>{id => <Input id={id} type="datetime-local" step="60" disabled={locked} value={draft.dueAtLocal} onChange={event => edit({ ...draft, dueAtLocal: event.target.value })} />}</Field>}
        {view.canUseInternalNotes && <Field label={t("internalNote")}>{id => <Textarea id={id} disabled={locked} maxLength={4000} value={draft.internalNote} onChange={event => edit({ ...draft, internalNote: event.target.value })} />}</Field>}
        {!view.isCurrentSubmission && <label className="flex items-start gap-2 text-sm"><input type="checkbox" disabled={locked} checked={staleConsent} onChange={event => setStaleConsent(event.target.checked)} /><span>{t("staleConfirm")}</span></label>}
        <div className="space-y-2"><Button type="submit" disabled={locked || !canRecord}>{t(view.latestCheckId ? "recordRecheck" : "record")}</Button><p className="text-xs leading-6 text-muted-foreground">{t("saveHint")}</p></div>
      </form>}
    </>}
  </div>;
}
