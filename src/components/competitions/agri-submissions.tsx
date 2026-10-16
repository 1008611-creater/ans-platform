"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useWorkspaceNavigation } from "@/components/providers/workspace-navigation";
import { agriStageSubmissionCommandSchema, type AgriStageDraft, type AgriStageDetail, type AgriSubmissionEntries,
  type AgriSubmissionVersionChoice, type AgriStageSubmissionCommand } from "@/contracts/agri-submissions";
import { getAgriSubmissionMaterialIssues } from "@/domain/competitions/agri-submissions";
import { clearSubmissionRecoveries, readSubmissionRecovery, writeSubmissionRecovery } from "./agri-submission-recovery";
import { AgriCredits } from "./agri-credits";
import { AgriEvidence } from "./agri-evidence";
import { AgriReviews } from "./agri-reviews";
import { AgriPublications } from "./agri-publications";
import { AgriDemoChecks } from "./agri-demo-checks";
import { AgriIssues } from "./agri-issues";
const api = "/api/competitions/agrihackathon/submissions";
class SubmissionError extends Error {
  constructor(public code: string, public uncertain = false) { super(code); }
}
async function request<T>(url: string, actorId: string, command?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(url, { cache: "no-store", headers: { "x-ans-submission-actor": actorId, ...(command ? { "Content-Type": "application/json" } : {}) }, ...(command ? { method: "POST", body: JSON.stringify(command) } : {}) }); }
  catch { throw new SubmissionError("INTERNAL_ERROR", !!command); }
  let body;
  try { body = await response.json(); } catch { throw new SubmissionError("INTERNAL_ERROR", !!command); }
  if (!response.ok || body.ok !== true) throw new SubmissionError(body.error?.code ?? "INTERNAL_ERROR", !!command && response.status >= 500);
  return body.data as T;
}
const accountErrors = new Set(["ACCOUNT_CHANGED", "ACCOUNT_UNAVAILABLE", "UNAUTHORIZED"]);
// On retries only a rejection after receipt lookup establishes that the original write did not commit.
const receiptRejections = new Set(["AGRI_WALL_REQUIRED", "AGRI_WALL_PUBLIC_PROJECT_REQUIRED", "AGRI_WALL_PROJECT_MISMATCH", "AGRI_WALL_VERSION_CONFLICT", "AGRI_ROSTER_REQUIRED", "AGRI_LEGACY_ROSTER_REQUIRED", "AGRI_ROSTER_MEMBER_UNAVAILABLE", "AGRI_ROSTER_MEMBER_CONFLICT", "AGRI_ROSTER_ACTOR_REQUIRED", "AGRI_ROSTER_CHANGE_FORBIDDEN", "AGRI_ROSTER_PROJECT_MISMATCH", "AGRI_PRELIMINARY_BASELINE_REQUIRED", "AGRI_FINAL_PROJECT_MISMATCH", "AGRI_FINAL_BASELINE_CHANGE_FORBIDDEN", "AGRI_REVISION_CONFLICT", "AGRI_IDEMPOTENCY_CONFLICT", "AGRI_WORKSPACE_DISABLED", "AGRI_PROJECT_UNAVAILABLE", "AGRI_ARTIFACT_UNAVAILABLE", "AGRI_FROZEN", "AGRI_RULES_UNPUBLISHED", "AGRI_RULE_VERSION_CONFLICT", "AGRI_RULES_PENDING", "AGRI_NOT_OPEN", "AGRI_CLOSED", "AGRI_FINAL_ELIGIBILITY_REQUIRED", "AGRI_MATERIAL_REQUIRED", "AGRI_MATERIAL_KIND_MISMATCH", "AGRI_UNRECOGNIZED_MATERIAL", "AGRI_INVALID", "AGRI_REPOSITORY_REQUIRED", "AGRI_REPOSITORY_REF_REQUIRED", "AGRI_DEMO_REQUIRED", "AGRI_PERMIT_MISMATCH", "AGRI_PERMIT_NOT_FOUND", "AGRI_PERMIT_INACTIVE", "AGRI_FIELD_NOT_ALLOWED", "AGRI_PROJECT_CHANGE_FORBIDDEN", "AGRI_NO_CHANGE"]);
const selectClass = "w-full min-w-0 rounded-md border bg-background p-2 text-sm";
function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId(); return <div className="min-w-0 space-y-2"><label className="text-sm font-medium" htmlFor={id}>{label}</label>{children(id)}</div>;
}
function time(value: string, locale: string) { return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value)); }
function emptyDraft(): AgriStageDraft { return { projectId: "", artifactVersionId: null, repository: null, demoUrl: null, summary: "", materials: { schemaVersion: 1, items: [] } }; }
export function AgriSubmissions({ initialSelection }: { initialSelection?: { teamCompetitionId: string; stage: "PRELIMINARY" | "FINAL" } } = {}) {
  const t = useTranslations("product.agriSubmissions"); const { data, status, update } = useSession();
  const [invalid, setInvalid] = useState(false);
  const invalidate = useCallback(() => { clearSubmissionRecoveries(); setInvalid(true); }, []);
  useEffect(() => { if (status === "unauthenticated") clearSubmissionRecoveries(); }, [status]);
  if (status === "loading") return <p role="status">{t("loading")}</p>;
  if (!data?.user?.id) return <Button asChild><Link href="/login?callbackUrl=%2Fcompetitions%2Fagrihackathon%2Fsubmissions">{t("login")}</Link></Button>;
  if (invalid) return <div className="space-y-3"><p role="alert">{t("errors.ACCOUNT_CHANGED")}</p><Button onClick={() => void update().then(() => setInvalid(false)).catch(() => setInvalid(true))}>{t("refresh")}</Button></div>;
  return <TeamStages key={`${data.user.id}:${initialSelection?.teamCompetitionId ?? ""}:${initialSelection?.stage ?? ""}`} actorId={data.user.id} invalidate={invalidate} initialSelection={initialSelection} />;
}
function TeamStages({ actorId, invalidate, initialSelection }: { actorId: string; invalidate: () => void; initialSelection?: { teamCompetitionId: string; stage: "PRELIMINARY" | "FINAL" } }) {
  const t = useTranslations("product.agriSubmissions");
  const [data, setData] = useState<AgriSubmissionEntries | null>(null); const [entryId, setEntryId] = useState("");
  const [stage, setStage] = useState<"PRELIMINARY" | "FINAL">(initialSelection?.stage ?? "PRELIMINARY");
  const requestedEntryId = initialSelection?.teamCompetitionId;
  const [detail, setDetail] = useState<AgriStageDetail | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const alive = useRef(true); const flight = useRef(false);
  const load = useCallback(async () => {
    setError(""); setBusy(true);
    try { const result = await request<AgriSubmissionEntries>(api + "/entries", actorId); if (alive.current) { setData(result); setEntryId(old => result.entries.some(e => e.id === old) ? old : requestedEntryId ? result.entries.find(e => e.id === requestedEntryId)?.id ?? "" : result.entries[0]?.id ?? ""); } }
    catch (e) { if (alive.current) { if (e instanceof SubmissionError && accountErrors.has(e.code)) invalidate(); else setError(e instanceof SubmissionError ? e.code : "INTERNAL_ERROR"); } }
    finally { if (alive.current) setBusy(false); }
  }, [actorId, invalidate, requestedEntryId]);
  useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; }; }, [load]);
  async function open() {
    if (!entryId || flight.current) return; flight.current = true; setBusy(true); setError("");
    try {
      const chosenEntry = data?.entries.find(row => row.id === entryId); let stageId: string | null = null;
      // Viewing existing stages is read-only, including after the workspace is paused.
      let cursor: string | null = null;
      do {
        const page: { stages: Array<{ id: string; teamCompetitionId: string }>; nextCursor: string | null } = await request(api + "?stage=" + stage + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""), actorId);
        stageId = page.stages.find(row => row.teamCompetitionId === entryId)?.id ?? null; cursor = page.nextCursor;
      } while (!stageId && cursor && alive.current);
      if (!alive.current) return;
      if (!stageId && ["OWNER", "ADMIN"].includes(chosenEntry?.role ?? "") && data?.workspaceEnabled) {
        const prepared = await request<{ entryStageId: string }>(api, actorId, { action: "prepareStage", teamCompetitionId: entryId, stage }); stageId = prepared.entryStageId;
      }
      if (!stageId) throw new SubmissionError("AGRI_STAGE_NOT_PREPARED");
      const result = await request<AgriStageDetail>(api + "/" + encodeURIComponent(stageId), actorId); if (alive.current) setDetail(result);
    } catch (e) { if (alive.current) { if (e instanceof SubmissionError && accountErrors.has(e.code)) invalidate(); else setError(e instanceof SubmissionError ? e.code : "INTERNAL_ERROR"); } }
    finally { flight.current = false; if (alive.current) setBusy(false); }
  }
  const entry = data?.entries.find(row => row.id === entryId);
  if (detail) return <SubmissionEditor key={detail.id} actorId={actorId} initial={detail} manager={["OWNER", "ADMIN"].includes(entry?.role ?? "")} invalidate={invalidate} onBack={() => setDetail(null)} />;
  return <Card><CardHeader><CardTitle>{t("chooseTeam")}</CardTitle></CardHeader><CardContent className="space-y-5">
    <p className="text-sm leading-6 text-muted-foreground">{t("privacy")}</p>
    {error && <p role="alert">{t.has("errors." + error) ? t("errors." + error) : t("errors.INTERNAL_ERROR")}</p>}
    {busy && <p role="status">{t("loading")}</p>}
    {data && !data.workspaceEnabled && <p role="status">{t("disabled")}</p>}{data && !data.entries.length && <p>{t("noTeam")}</p>}
    {data && data.entries.length > 0 && <><div className="grid gap-4 sm:grid-cols-2"><Field label={t("team")}>{id => <select id={id} className={selectClass} disabled={busy} value={entryId} onChange={e => setEntryId(e.target.value)}><option value="">{t("chooseTeam")}</option>{data.entries.map(row => <option key={row.id} value={row.id}>{row.teamName}</option>)}</select>}</Field>
    <Field label={t("stageField")}>{id => <select id={id} className={selectClass} disabled={busy} value={stage} onChange={e => setStage(e.target.value as typeof stage)}>{(["PRELIMINARY", "FINAL"] as const).map(value => <option key={value} value={value}>{t("stage." + value)}</option>)}</select>}</Field></div>
    {entry && <AgriCredits key={actorId + ":" + entry.id} actorId={actorId} teamCompetitionId={entry.id} onAccountChanged={invalidate} />}
    {entry && !["OWNER", "ADMIN"].includes(entry.role) && <p>{t("managerOnly")}</p>}
    <Button disabled={busy || !entry} onClick={() => void open()}>{t("open")}</Button></>}
    <Button variant="ghost" disabled={busy} onClick={() => void load()}>{t("refresh")}</Button>
  </CardContent></Card>;
}
function SubmissionEditor({ actorId, initial, manager, invalidate, onBack }: { actorId: string; initial: AgriStageDetail; manager: boolean; invalidate: () => void; onBack: () => void }) {
  const t = useTranslations("product.agriSubmissions"); const wall = useTranslations("agriWall"); const locale = useLocale();
  const saved = readSubmissionRecovery(actorId, initial.id);
  const [detail, setDetail] = useState(saved?.detail ?? initial);
  const [draft, setDraft] = useState<AgriStageDraft>(saved?.draft ?? initial.draft ?? initial.current?.content ?? (initial.wall ? { ...emptyDraft(), projectId: initial.wall.projectId, artifactVersionId: initial.wall.artifactVersionId } : emptyDraft()));
  const [officialMemberIds, setOfficialMemberIds] = useState<string[]>(saved?.officialMemberIds ?? initial.officialRoster?.members.map(row => row.userId) ?? (initial.officialMemberChoices?.some(row => row.userId === actorId) ? [actorId] : []));
  const [syncToAgriWall, setSyncToAgriWall] = useState(saved?.syncToAgriWall ?? true);
  const [baseline, setBaseline] = useState(saved?.baseline ?? JSON.stringify({ draft, officialMemberIds, syncToAgriWall }));
  const [pending, setPending] = useState<AgriStageSubmissionCommand | null>(saved?.pending ?? null);
  const pendingRef = useRef(pending); const flight = useRef(false); const alive = useRef(true);
  const [preparedEvidenceIds, setPreparedEvidenceIds] = useState<string[]>([]);
  const [permitId, setPermitId] = useState("");
  const permit = detail.correctionPermits?.find(row => row.id === permitId);
  const correcting = !!permit;
  const [conflict, setConflict] = useState(saved?.conflict ?? false); const [ack, setAck] = useState(false);
  const [confirmed, setConfirmed] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [note, setNote] = useState("");
  const [stale, setStale] = useState(false); const [choices, setChoices] = useState<AgriSubmissionVersionChoice[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [choiceError, setChoiceError] = useState(false); const [versionsLoading, setVersionsLoading] = useState(true);
  const navigation = useWorkspaceNavigation();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const leaveAction = useRef<(() => void) | null>(null);
  const cancelLeave = useRef<(() => void) | null>(null);
  const leaveFocus = useRef<HTMLElement | null>(null);
  const dirty = JSON.stringify({ draft, officialMemberIds }) !== baseline;
  useEffect(() => {
    if (!dirty && !pending) return;
    return navigation.register((action, cancel) => {
      leaveAction.current = action;
      cancelLeave.current = cancel;
      leaveFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setLeaveOpen(true);
    });
  }, [navigation, dirty, pending]);
  const locked = busy || !!pending || conflict || stale || !manager || !detail.workspaceEnabled || (!!detail.frozenSubmissionId && !correcting);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { writeSubmissionRecovery(actorId, initial.id, dirty || pending || conflict || stale ? { detail, draft, baseline, pending, officialMemberIds, syncToAgriWall, conflict: conflict || stale } : null); }, [actorId, initial.id, detail, draft, baseline, pending, conflict, dirty, stale, officialMemberIds, syncToAgriWall]);
  useEffect(() => { if (!dirty && !pending) return; const guard = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; }; window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard); }, [dirty, pending]);
  const handleError = useCallback((e: unknown) => { if (!alive.current) return; if (e instanceof SubmissionError && accountErrors.has(e.code)) { invalidate(); return; } setError(e instanceof SubmissionError ? e.code : "INTERNAL_ERROR"); }, [invalidate]);
  const versions = useCallback(async (page?: string) => {
    if (!manager) { setVersionsLoading(false); return; } setChoiceError(false); setVersionsLoading(true);
    try { const result = await request<{ versions: AgriSubmissionVersionChoice[]; nextCursor: string | null }>(api + "/" + encodeURIComponent(initial.id) + "/versions" + (page ? "?cursor=" + encodeURIComponent(page) : ""), actorId);
      if (alive.current) { setChoices(old => page ? [...old, ...result.versions].filter((item, i, all) => all.findIndex(row => row.id === item.id) === i) : result.versions); setCursor(result.nextCursor); }
    } catch (e) { if (alive.current) { setChoiceError(true); handleError(e); } } finally { if (alive.current) setVersionsLoading(false); }
  }, [actorId, initial.id, manager, handleError]);
  useEffect(() => { void versions(); }, [versions]);
  async function reload(preserve: boolean, before?: number) {
    setBusy(true); setError("");
    try { const result = await request<AgriStageDetail>(api + "/" + encodeURIComponent(initial.id) + (before ? "?beforeSequence=" + before : ""), actorId);
      if (!alive.current) return;
      if (before) { setDetail(old => ({ ...old, history: [...old.history, ...result.history].filter((item, i, all) => all.findIndex(row => row.id === item.id) === i), nextBeforeSequence: result.nextBeforeSequence })); }
      else { setDetail(result); setStale(false); if (!preserve) { const next = result.draft ?? result.current?.content ?? emptyDraft(); setDraft(next); setBaseline(JSON.stringify({ draft: next, officialMemberIds, syncToAgriWall })); } setConflict(false); setAck(false); setConfirmed(false); }
    } catch (e) { handleError(e); } finally { if (alive.current) setBusy(false); }
  }
  function edit(next: AgriStageDraft) { if (next.artifactVersionId !== draft.artifactVersionId) setPreparedEvidenceIds([]); setDraft(next); setConfirmed(false); setNote(""); }
  async function mutate(action: "saveDraft" | "submit" | "correctSubmission") {
    if (flight.current || (!pendingRef.current && locked)) return;
    const retry = !!pendingRef.current;
    const parsed = agriStageSubmissionCommandSchema.safeParse(pendingRef.current ?? { action, idempotencyKey: crypto.randomUUID(), entryStageId: detail.id, expectedRevision: detail.revision,
      ...(action === "saveDraft" ? { draft } : { content: draft, syncToAgriWall, ...(preparedEvidenceIds.length ? { evidenceIntentIds: preparedEvidenceIds } : {}), ...(action === "submit" && !detail.officialRoster ? { officialMemberIds } : {}), expectedRuleVersionId: action === "correctSubmission" ? permit?.ruleVersionId : detail.publishedRule?.id, ...(action === "correctSubmission" ? { previousSubmissionId: detail.current?.id, correctionPermitId: permit?.id } : {}) }) });
    if (!parsed.success) { setError("INVALID_INPUT"); return; }
    const command = parsed.data; flight.current = true; pendingRef.current = command; setPending(command); setBusy(true); setError("");
    // Save the exact command before awaiting the network, including navigation away during a write.
    writeSubmissionRecovery(actorId, initial.id, { detail, draft, baseline, pending: command, conflict, officialMemberIds, syncToAgriWall });
    try { const result = await request<{ appliedRevision: number; wallSync?: { state: string } }>(api, actorId, command); if (!alive.current) return;
      pendingRef.current = null; setPending(null); setDetail(old => ({ ...old, revision: result.appliedRevision })); setBaseline(JSON.stringify({ draft, officialMemberIds })); setConfirmed(false); setStale(true); setNote(t(command.action === "saveDraft" ? "saved" : result.wallSync?.state === "BINDING_CLOSED" ? "submittedWallClosed" : result.wallSync?.state === "SYNCED" ? "submittedAndSynced" : "submitted"));
      try { const next = await request<AgriStageDetail>(api + "/" + encodeURIComponent(initial.id), actorId); if (alive.current) { setDetail(next); setStale(false); } } catch (e) { handleError(e); }
    } catch (e) { if (!alive.current) return; if (e instanceof SubmissionError && !e.uncertain && (!retry || receiptRejections.has(e.code))) { pendingRef.current = null; setPending(null); if (["AGRI_REVISION_CONFLICT", "AGRI_RULE_VERSION_CONFLICT"].includes(e.code)) setConflict(true); } handleError(e); }
    finally { flight.current = false; if (alive.current) setBusy(false); }
  }
  const rule = correcting ? detail.correctionRule : detail.publishedRule; const requirements = rule?.requirements;
  const issues = requirements ? getAgriSubmissionMaterialIssues(requirements, draft) : [];
  const rosterReady = !!detail.officialRoster || (officialMemberIds.length >= 1 && officialMemberIds.length <= 5 && officialMemberIds.includes(actorId));
  const baselineReady = detail.stage !== "FINAL" || (!!detail.preliminaryBaseline && detail.preliminaryBaseline.projectId === draft.projectId);
  const projectReady = !detail.officialRoster || detail.officialRoster.projectId === draft.projectId;
  const wallCompatible = !syncToAgriWall || !detail.wall || (detail.wall.isOwner && detail.wall.projectId === draft.projectId);
  const canSubmit = wallCompatible && rosterReady && projectReady && baselineReady && !detail.legacyRosterRequired && !locked && (correcting || (detail.windowState === "OPEN" && (detail.stage !== "FINAL" || detail.finalEligibility?.state === "ELIGIBLE"))) && !!rule && confirmed && !!draft.artifactVersionId && !!draft.summary.trim() && !issues.length;
  const ruleWindow = rule?.window;
  const message = (code: string) => t.has("errors." + code) ? t("errors." + code) : t("errors.INTERNAL_ERROR");
  function material(key: string, kind: "TEXT" | "LINK" | "ARTIFACT", value: string) {
    const items = draft.materials.items.filter(item => item.key !== key);
    if (value.trim()) items.push(kind === "TEXT" ? { key, kind, text: value } : kind === "LINK" ? { key, kind, url: value } : { key, kind, artifactVersionId: value });
    edit({ ...draft, materials: { schemaVersion: 1, items } });
  }
  const versionOptions = choices.filter(row => (!detail.officialRoster || row.projectId === detail.officialRoster.projectId)).map(value => <option key={value.id} value={value.id}>{value.projectTitle} · {value.artifactTitle} · v{value.version}</option>);
  return <div className="space-y-5">
    <AlertDialog open={leaveOpen} onOpenChange={open => { setLeaveOpen(open); if (!open && leaveAction.current) { leaveAction.current = null; cancelLeave.current?.(); cancelLeave.current = null; } }}>
      <AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); if (leaveFocus.current?.isConnected) leaveFocus.current.focus(); }}>
        <AlertDialogHeader><AlertDialogTitle>{t("leaveTitle")}</AlertDialogTitle><AlertDialogDescription>{t(pending ? "leavePending" : "leaveUnsaved")}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>{t("leaveStay")}</AlertDialogCancel><AlertDialogAction onClick={() => {
          const action = leaveAction.current; leaveAction.current = null;
          writeSubmissionRecovery(actorId, initial.id, { detail, draft, baseline, pending: pendingRef.current, conflict: conflict || stale });
          action?.();
        }}>{t("leaveContinue")}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" disabled={busy} onClick={() => navigation.run(onBack)}>{t("chooseTeam")}</Button><Badge variant="secondary">{t("stage." + detail.stage)}</Badge></div>
    <ol className="grid gap-2 text-sm sm:grid-cols-3">{["chooseVersion", "fillMaterials", "reviewSubmit"].map((key, i) => <li key={key} className="rounded-xl border bg-muted/30 p-3"><span className="mr-2 font-semibold">{i + 1}</span>{t(key)}</li>)}</ol>
    <Card className="border-primary/25"><CardHeader><CardTitle>{wall("submissionWallTitle")}</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-7">
      <label className="flex items-start gap-2"><input type="checkbox" checked={syncToAgriWall} disabled={locked} onChange={event => { setSyncToAgriWall(event.target.checked); setConfirmed(false); }} /><span>{t("syncToWall")}</span></label>
      <p className="text-muted-foreground">{t("syncToWallHint")}</p>
      {syncToAgriWall && detail.wall && !detail.wall.isOwner && <p role="status">{wall("submissionOwnerHint")}</p>}
      {detail.wall?.published && <Button asChild variant="ghost"><Link href={detail.wall.href}>{wall("viewProject")}</Link></Button>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>{t("rules")}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm leading-6">
      <p>{t("window." + (detail.windowState === "INVALID" ? "RULES_PENDING" : detail.windowState))}</p>{ruleWindow?.state === "CONFIRMED" && <><p>{t("dates", { opens: time(ruleWindow.opensAt, locale), closes: time(ruleWindow.closesAt, locale) })}</p><p>{t(ruleWindow.includesDeadline ? "inclusive" : "exclusive")}</p></>}
      {rule?.guidanceMarkdown && <p className="whitespace-pre-wrap break-words">{rule.guidanceMarkdown}</p>}
      {rule && <p className="break-all text-muted-foreground">{t("ruleVersion", { id: rule.id })}</p>}
      {detail.stage === "FINAL" && detail.finalEligibility?.state !== "ELIGIBLE" && <p>{t("finalPending")}</p>}{detail.frozenSubmissionId && <p>{t("frozen")}</p>}<p>{t("serverTime")}</p>
    </CardContent></Card>
    {error && <p role="alert">{message(error)}</p>}{note && <p role="status">{note}</p>}
    {pending && <div className="space-y-3 rounded-xl border p-4"><p role="alert">{t("pending")}</p><Button disabled={busy} onClick={() => void mutate(pending.action)}>{t("retry")}</Button></div>}
    {stale && !pending && <div className="space-y-3 rounded-xl border p-4"><p role="status">{t("stale")}</p><Button disabled={busy} onClick={() => void reload(true)}>{t("refresh")}</Button></div>}
    {conflict && !pending && <div className="space-y-3 rounded-xl border p-4"><p role="alert">{t("conflict")}</p><label className="flex items-start gap-2"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} /><span>{t("adoptRevision")}</span></label><Button disabled={busy || !ack} onClick={() => void reload(true)}>{t("reloadPreserve")}</Button></div>}
    {manager && !!detail.correctionPermits?.length && <Card><CardHeader><CardTitle>{t("correctionTitle")}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm leading-6 text-muted-foreground">{t("correctionHelp")}</p><Field label={t("correctionPermit")}>{id => <select id={id} className={selectClass} disabled={busy || !!pending || conflict || stale} value={permitId} onChange={e => { setPermitId(e.target.value); setConfirmed(false); }}><option value="">{t("normalSubmission")}</option>{(detail.correctionPermits ?? []).map(row => <option key={row.id} value={row.id}>{row.reason} · {time(row.expiresAt, locale)}</option>)}</select>}</Field>{permit && <p className="text-sm">{t("allowedFields")}: {permit.allowedFields.map(field => t("correctable." + field)).join(" · ")}</p>}</CardContent></Card>}
    <Card><CardHeader><CardTitle>{t("officialRosterTitle")}</CardTitle></CardHeader><CardContent className="space-y-3">
      <p className="text-sm text-muted-foreground">{t(detail.officialRoster ? "officialRosterLocked" : "officialRosterHelp")}</p>
      {detail.legacyRosterRequired && <p role="alert">{t("errors.AGRI_LEGACY_ROSTER_REQUIRED")}</p>}
      {detail.officialRoster ? <ul className="space-y-2">{detail.officialRoster.members.map(member => <li key={member.userId} className="text-sm">{member.name ?? member.username} <span className="text-muted-foreground">@{member.username}</span></li>)}</ul>
        : manager && <fieldset disabled={locked || !!detail.legacyRosterRequired || detail.stage === "FINAL"} className="space-y-2"><legend className="sr-only">{t("officialRosterTitle")}</legend>{(detail.officialMemberChoices ?? []).map(member => <label key={member.userId} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!officialMemberIds.includes(member.userId) && officialMemberIds.length >= 5} checked={officialMemberIds.includes(member.userId)} onChange={e => { setOfficialMemberIds(old => e.target.checked ? [...old, member.userId] : old.filter(id => id !== member.userId)); setConfirmed(false); }} />{member.name ?? member.username} <span className="text-muted-foreground">@{member.username}</span></label>)}</fieldset>}
      {detail.stage === "FINAL" && <p className="break-all text-sm">{detail.preliminaryBaseline ? t("preliminaryBaseline", { id: detail.preliminaryBaseline.submissionId }) : t("errors.AGRI_PRELIMINARY_BASELINE_REQUIRED")}</p>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>{t("materials")}</CardTitle></CardHeader><CardContent className="space-y-5">
      <p className="text-sm text-muted-foreground">{t(manager ? "ownVersions" : "readOnlyMaterials")}</p>{choiceError && <Button variant="outline" disabled={busy} onClick={() => void versions()}>{t("retryVersions")}</Button>}
      <Field label={t("version")}>{id => <select id={id} value={draft.artifactVersionId ?? ""} disabled={locked} className={selectClass} onChange={e => { const choice = choices.find(row => row.id === e.target.value && (!detail.officialRoster || row.projectId === detail.officialRoster.projectId)); if (choice) edit({ ...draft, projectId: choice.projectId, artifactVersionId: choice.id }); }}><option value="">{t("selectVersion")}</option>{draft.artifactVersionId && !choices.some(row => row.id === draft.artifactVersionId) && <option value={draft.artifactVersionId}>{t(manager ? "existingVersion" : "recordedVersion")}</option>}{versionOptions}</select>}</Field>
      {cursor && <Button variant="outline" disabled={busy || versionsLoading} onClick={() => void versions(cursor)}>{t("moreVersions")}</Button>}
      {versionsLoading && <p role="status">{t("loading")}</p>}
      {manager && !versionsLoading && !choices.length && !choiceError && <p className="text-sm">{t("noVersions")}</p>}
      <Field label={t("summary")}>{id => <Textarea id={id} maxLength={4000} disabled={locked} value={draft.summary} onChange={e => edit({ ...draft, summary: e.target.value })} />}</Field>
      <Field label={t(requirements?.repositoryRequired ? "repositoryRequired" : "repository")}>{id => <Input id={id} type="url" disabled={locked} value={draft.repository?.url ?? ""} onChange={e => edit({ ...draft, repository: e.target.value ? { url: e.target.value, ref: draft.repository?.ref ?? null } : null })} />}</Field>
      {draft.repository && <div className="grid gap-4 sm:grid-cols-2"><Field label={t("refKind")}>{id => <select id={id} className={selectClass} disabled={locked} value={draft.repository?.ref?.kind ?? ""} onChange={e => edit({ ...draft, repository: { url: draft.repository!.url, ref: e.target.value ? { kind: e.target.value as "TAG" | "COMMIT_SHA", value: "" } : null } })}><option value="">{t("noRef")}</option><option value="COMMIT_SHA">{t("sha")}</option><option value="TAG">{t("tag")}</option></select>}</Field><Field label={t(requirements?.repositoryRefRequired ? "refRequired" : "refValue")}>{id => <Input id={id} disabled={locked || !draft.repository?.ref} value={draft.repository?.ref?.value ?? ""} onChange={e => edit({ ...draft, repository: { url: draft.repository!.url, ref: { kind: draft.repository!.ref!.kind, value: e.target.value } } })} />}</Field></div>}
      <Field label={t(requirements?.demoRequired ? "demoRequired" : "demo")}>{id => <Input id={id} type="url" disabled={locked} value={draft.demoUrl ?? ""} onChange={e => edit({ ...draft, demoUrl: e.target.value || null })} />}</Field>
      <p className="text-sm text-muted-foreground">{t("urlHint")}</p>
      {requirements?.materials.map(requirement => { const item = draft.materials.items.find(row => row.key === requirement.key); const value = item ? item.kind === "TEXT" ? item.text : item.kind === "LINK" ? item.url : item.artifactVersionId : "";
        return <Field key={requirement.key} label={t(requirement.required ? "requiredItem" : "optionalItem", { key: requirement.key })}>{id => requirement.kind === "TEXT" ? <Textarea id={id} maxLength={4000} disabled={locked} value={value} onChange={e => material(requirement.key, requirement.kind, e.target.value)} /> : requirement.kind === "LINK" ? <Input id={id} type="url" disabled={locked} value={value} onChange={e => material(requirement.key, requirement.kind, e.target.value)} /> : <select id={id} className={selectClass} disabled={locked} value={value} onChange={e => material(requirement.key, requirement.kind, e.target.value)}><option value="">{t("selectVersion")}</option>{value && !choices.some(row => row.id === value) && <option value={value}>{t(manager ? "existingVersion" : "recordedVersion")}</option>}{versionOptions}</select>}</Field>;
      })}
      {requirements && draft.materials.items.filter(item => !requirements.materials.some(requirement => requirement.key === item.key && requirement.kind === item.kind)).map(item => <div key={item.key} className="space-y-2 rounded-xl border p-3"><p className="break-words text-sm">{t("obsoleteMaterial", { key: item.key })}</p><Button variant="outline" disabled={locked} onClick={() => edit({ ...draft, materials: { schemaVersion: 1, items: draft.materials.items.filter(row => row.key !== item.key) } })}>{t("removeMaterial", { key: item.key })}</Button></div>)}
      {manager && draft.projectId && draft.artifactVersionId && !locked && <AgriEvidence actorId={actorId} entryStageId={detail.id} projectId={draft.projectId} artifactVersionId={draft.artifactVersionId} repository={draft.repository} invalidate={invalidate} onPrepared={setPreparedEvidenceIds} />}
      {!!issues.length && <p role="status">{t("missingMaterials")}</p>}
      <div className="space-y-3 rounded-xl border bg-muted/30 p-4"><label className="flex items-start gap-2"><input type="checkbox" disabled={locked} checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span className="text-sm leading-6">{t("confirm")}</span></label><div className="flex flex-wrap gap-3"><Button variant="outline" disabled={locked || correcting || !draft.projectId} onClick={() => void mutate("saveDraft")}>{t("save")}</Button><Button disabled={!canSubmit} onClick={() => void mutate(correcting ? "correctSubmission" : "submit")}>{t(correcting ? "correctSubmit" : "submit")}</Button></div><p className="text-sm text-muted-foreground">{t(correcting ? "correctionSaveHint" : "draftHint")}</p></div>
    </CardContent></Card>
    {detail.current && <><AgriEvidence actorId={actorId} submissionId={detail.current.id} invalidate={invalidate} /><AgriPublications actorId={actorId} entryStageId={detail.id} scope="team" invalidate={invalidate} /><AgriReviews actorId={actorId} submissionId={detail.current.id} scope="team" invalidate={invalidate} /><AgriIssues actorId={actorId} submissionId={detail.current.id} scope="team" invalidate={invalidate} /><AgriDemoChecks actorId={actorId} submissionId={detail.current.id} scope="team" invalidate={invalidate} /></>}
    <Card><CardHeader><CardTitle>{t("history")}</CardTitle></CardHeader><CardContent className="space-y-4">
      {!detail.history.length && <p>{t("noHistory")}</p>}{detail.history.map(row => <div key={row.id} className="space-y-2 rounded-xl border p-4 text-sm">{row.correction && <p className="whitespace-pre-wrap break-words">{t("correctedFrom", { id: row.correction.previousSubmissionId, reason: row.correction.reason })}</p>}<p className="font-medium">{t("submissionNumber", { number: row.sequence })} · {time(row.acceptedAt, locale)}</p><p className="break-all text-muted-foreground">{t("ruleVersion", { id: row.ruleVersionId })}</p>{row.content && <><p className="whitespace-pre-wrap break-words">{row.content.summary}</p><p className="break-all">{t("versionId", { id: row.content.artifactVersionId })}</p>{row.content.repository && <p className="break-all">{t("repository")}: {row.content.repository.url} {row.content.repository.ref?.value}</p>}{row.content.demoUrl && <p className="break-all">{t("demo")}: {row.content.demoUrl}</p>}</>}</div>)}
      {detail.nextBeforeSequence && <Button variant="outline" disabled={busy} onClick={() => void reload(true, detail.nextBeforeSequence!)}>{t("moreHistory")}</Button>}
    </CardContent></Card>
  </div>;
}
