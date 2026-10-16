"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Search, Download, ArrowUpRight, ClipboardList } from "lucide-react";
import { useWorkspaceNavigation, WorkspaceLink } from "@/components/providers/workspace-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { AgriStageDetail, AgriStageList, AgriStageListRow, AgriSubmissionHistoryItem } from "@/contracts/agri-submissions";
import { AgriReviews } from "./agri-reviews";
import { AgriPublications } from "./agri-publications";
import { AgriDemoChecks } from "./agri-demo-checks";
import { AgriIssues } from "./agri-issues";
import { AgriOnsiteStaffLink } from "./agri-onsite";
import { AgriRecordSummary } from "./agri-record-summary";
import { AgriEvidence } from "./agri-evidence";
import { AgriRecordArchives } from "./agri-record-archives";
const api = "/api/competitions/agrihackathon/submissions";
type Filters = { q: string; stage: "ALL" | "PRELIMINARY" | "FINAL"; status: "ANY" | "SUBMITTED" | "NOT_SUBMITTED" };
const initialFilters: Filters = { q: "", stage: "ALL", status: "ANY" };
const accountErrors = new Set(["UNAUTHORIZED", "ACCOUNT_CHANGED", "ACCOUNT_UNAVAILABLE"]);
class WorksError extends Error { constructor(public code: string) { super(code); } }
async function fetchWorks(url: string, actorId: string) {
  const response = await fetch(url, { cache: "no-store", headers: { "x-ans-submission-actor": actorId } });
  if (!response.ok) { let code = "INTERNAL_ERROR"; try { code = (await response.json()).error?.code ?? code; } catch { /* Error body is not trusted. */ } throw new WorksError(code); }
  return response;
}
async function readWorks<T>(url: string, actorId: string): Promise<T> {
  const body = await (await fetchWorks(url, actorId)).json();
  if (body.ok !== true) throw new WorksError(body.error?.code ?? "INTERNAL_ERROR");
  return body.data as T;
}
function params(filters: Filters) {
  const value = new URLSearchParams({ q: filters.q.trim(), status: filters.status });
  if (filters.stage !== "ALL") value.set("stage", filters.stage);
  return value;
}
function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId(); return <div className="min-w-0 space-y-2"><label className="text-sm font-medium" htmlFor={id}>{label}</label>{children(id)}</div>;
}
const selectClass = "min-w-0 w-full rounded-md border bg-background p-2 text-sm";
function time(value: string, locale: string) { return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }

export function AgriWorks() {
  const t = useTranslations("product.agriWorks"); const { status, data, update } = useSession();
  const [invalidActor, setInvalidActor] = useState<string | null>(null);
  const actorId = status === "authenticated" ? data?.user?.id : null;
  if (status === "loading") return <p role="status">{t("loading")}</p>;
  if (!actorId) return <Button asChild><WorkspaceLink href="/login?callbackUrl=%2Fcompetitions%2Fagrihackathon%2Fworks">{t("login")}</WorkspaceLink></Button>;
  if (invalidActor === actorId) return <div className="space-y-3"><p role="alert">{t("errors.ACCOUNT_CHANGED")}</p><Button onClick={() => void update().then(() => setInvalidActor(null)).catch(() => {})}>{t("refresh")}</Button></div>;
  return <WorksWorkspace key={actorId} actorId={actorId} invalidate={() => setInvalidActor(actorId)} />;
}
function WorksWorkspace({ actorId, invalidate }: { actorId: string; invalidate: () => void }) {
  const t = useTranslations("product.agriWorks"); const navigation = useWorkspaceNavigation();
  const [filters, setFilters] = useState(initialFilters); const [applied, setApplied] = useState(initialFilters);
  const [hostingFilter, setHostingFilter] = useState<"ALL" | "HOSTED" | "UNHOSTED" | "FAILED">("ALL");
  const [list, setList] = useState<AgriStageList | null>(null); const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false); const [error, setError] = useState(""); const [selected, setSelected] = useState<AgriStageListRow | null>(null);
  const alive = useRef(true); const generation = useRef(0); const exportFlight = useRef(false);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const handleError = useCallback((error: unknown) => {
    if (!alive.current) return;
    const code = error instanceof WorksError ? error.code : "INTERNAL_ERROR";
    if (accountErrors.has(code)) invalidate(); else setError(code);
  }, [invalidate]);
  const load = useCallback(async (next: Filters, cursor?: string) => {
    const requestId = ++generation.current; setLoading(true); setError(""); setSelected(null);
    if (!cursor) { setList(null); setApplied(next); }
    const query = params(next); query.set("scope", "staff"); if (cursor) query.set("cursor", cursor);
    try {
      const page = await readWorks<AgriStageList>(api + "?" + query, actorId);
      if (alive.current && requestId === generation.current) setList(old => cursor && old ? { ...page, stages: [...old.stages, ...page.stages].filter((row, index, all) => all.findIndex(item => item.id === row.id) === index) } : page);
    } catch (error) { if (alive.current && requestId === generation.current) { setList(null); handleError(error); } }
    finally { if (alive.current && requestId === generation.current) setLoading(false); }
  }, [actorId, handleError]);
  useEffect(() => { const requests = generation; alive.current = true; void load(initialFilters); return () => { alive.current = false; ++requests.current; }; }, [load]);
  async function download(mode: "metadata" | "materials") {
    if (exportFlight.current) return; exportFlight.current = true; setExporting(true); setError("");
    try {
      const query = params(applied); query.set("mode", mode);
      const response = await fetchWorks(api + "/export?" + query, actorId); const blob = await response.blob();
      if (!alive.current) return;
      if (!(response.headers.get("content-type") ?? "").startsWith("text/csv")) throw new WorksError("INTERNAL_ERROR");
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "ans-agri-works-" + mode + ".csv";
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { handleError(error); }
    finally { exportFlight.current = false; if (alive.current) setExporting(false); }
  }
  async function downloadCode(objectId: string, filename: string) {
    try {
      const response = await fetchWorks("/api/competitions/agrihackathon/evidence/objects/" + encodeURIComponent(objectId), actorId);
      const blob = await response.blob();
      if (!alive.current) return;
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename;
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { handleError(error); }
  }
  const message = (code: string) => t.has("errors." + code) ? t("errors." + code) : t("errors.INTERNAL_ERROR");
  const isHosted = (row: AgriStageListRow) => Boolean(row.latestRepositoryObject) || (row.evidenceSummary?.stored ?? 0) > 0;
  const isFailed = (row: AgriStageListRow) => (row.evidenceSummary?.failed ?? 0) > 0;
  const isUnhosted = (row: AgriStageListRow) => Boolean(row.currentSubmissionId) && !isHosted(row);
  const visibleStages = list ? list.stages.filter(row => hostingFilter === "ALL" ? true : hostingFilter === "HOSTED" ? isHosted(row) : hostingFilter === "FAILED" ? isFailed(row) : isUnhosted(row)) : [];
  return <div className="space-y-6">
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" aria-hidden="true" />{t("filterTitle")}</CardTitle></CardHeader><CardContent className="space-y-4">
      <form onSubmit={event => { event.preventDefault(); navigation.run(() => void load(filters)); }} className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_12rem_12rem_auto]">
        <Field label={t("searchLabel")}>{id => <Input id={id} maxLength={120} value={filters.q} placeholder={t("searchPlaceholder")} onChange={event => setFilters(old => ({ ...old, q: event.target.value }))} />}</Field>
        <Field label={t("stageLabel")}>{id => <select id={id} className={selectClass} value={filters.stage} onChange={event => setFilters(old => ({ ...old, stage: event.target.value as Filters["stage"] }))}>{(["ALL", "PRELIMINARY", "FINAL"] as const).map(value => <option key={value} value={value}>{t("stage." + value)}</option>)}</select>}</Field>
        <Field label={t("statusLabel")}>{id => <select id={id} className={selectClass} value={filters.status} onChange={event => setFilters(old => ({ ...old, status: event.target.value as Filters["status"] }))}>{(["ANY", "SUBMITTED", "NOT_SUBMITTED"] as const).map(value => <option key={value} value={value}>{t("status." + value)}</option>)}</select>}</Field>
        <Button type="submit"><Search className="h-4 w-4" aria-hidden="true" />{t("search")}</Button>
      </form>
      <p className="text-sm leading-6 text-muted-foreground">{t("privacy")}</p>
      {list && <div className="space-y-3 border-t pt-4"><p className="break-all text-sm text-muted-foreground">{t("edition", { id: list.competitionId })}</p><p className="text-sm">{t("applied", { query: applied.q || t("allTeams"), stage: t("stage." + applied.stage), status: t("status." + applied.status) })}</p>
        <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={!list.canExport || exporting || loading} onClick={() => void download("metadata")}><Download className="h-4 w-4" aria-hidden="true" />{t("exportMetadata")}</Button><Button variant="outline" disabled={!list.canExport || !list.hasPrivateMaterials || exporting || loading} onClick={() => void download("materials")}><Download className="h-4 w-4" aria-hidden="true" />{t("exportMaterials")}</Button><Button variant="ghost" disabled={loading} onClick={() => navigation.run(() => void load(applied))}>{t("refresh")}</Button></div>
        <p className="text-xs leading-6 text-muted-foreground">{t("exportHint")}</p></div>}
    </CardContent></Card>
    {error && <p role="alert" className="rounded-xl border p-4">{message(error)}</p>}
    {loading && <p role="status">{t("loading")}</p>}{exporting && <p role="status">{t("exporting")}</p>}
    {list && <section aria-labelledby="agri-works-results" className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="agri-works-results" className="text-xl font-semibold">{t("results")}</h2><span className="text-sm text-muted-foreground">{t("loaded", { count: list.stages.length })}</span></div>
      {list.hasPrivateMaterials && list.stages.length > 0 && <div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-medium text-muted-foreground">{t("hostingFilterLabel")}：</span>{(["ALL", "HOSTED", "UNHOSTED", "FAILED"] as const).map(mode => {
        const count = mode === "ALL" ? list.stages.length : mode === "HOSTED" ? list.stages.filter(isHosted).length : mode === "FAILED" ? list.stages.filter(isFailed).length : list.stages.filter(isUnhosted).length;
        return <Button key={mode} type="button" size="sm" variant={hostingFilter === mode ? "default" : "outline"} onClick={() => setHostingFilter(mode)}>{t("hostingFilter." + mode, { count })}</Button>;
      })}</div>}
      {!visibleStages.length && <Card><CardContent className="py-8 text-sm text-muted-foreground">{t("empty")}</CardContent></Card>}
      <ul className="space-y-3">{visibleStages.map(row => <li key={row.id}><Card><CardContent className="grid min-w-0 gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center"><div className="min-w-0 space-y-3"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-semibold">{row.teamName}</h3><Badge variant="secondary">{t("stage." + row.stage)}</Badge><Badge variant="outline">{t("status." + (row.currentSubmissionId ? "SUBMITTED" : "NOT_SUBMITTED"))}</Badge>{row.latestTechnicalCheck && <Badge variant="secondary">{t("technicalResult." + row.latestTechnicalCheck.result)}</Badge>}</div><p className="text-xs text-muted-foreground">{t("revision", { revision: row.revision })}{row.frozenSubmissionId ? " · " + t("recordedFrozen") : ""}</p>{row.evidenceSummary && <div className="space-y-1 text-xs leading-6 text-muted-foreground"><p>{Object.values(row.evidenceSummary).some(value => value > 0) ? t("evidenceSummary", row.evidenceSummary) : t("evidenceReferenceOnly")}</p>{row.evidenceSummary.late > 0 && <p>{t("evidenceLate", { count: row.evidenceSummary.late })}</p>}</div>}</div><div className="flex flex-wrap items-center gap-2">{row.latestRepositoryObject && <Button type="button" variant="secondary" size="sm" onClick={() => void downloadCode(row.latestRepositoryObject!.id, row.latestRepositoryObject!.fileName)}><Download className="h-4 w-4" aria-hidden="true" />{t("downloadLatestCode", { name: row.latestRepositoryObject.fileName })}</Button>}<Button variant="outline" aria-label={t("openTeam", { team: row.teamName, stage: t("stage." + row.stage) })} onClick={event => { detailTrigger.current = event.currentTarget; navigation.run(() => setSelected(row)); }}>{t("open")}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Button></div></CardContent></Card></li>)}</ul>
      {list.nextCursor && <Button variant="outline" disabled={loading} onClick={() => void load(applied, list.nextCursor!)}>{t("more")}</Button>}
    </section>}
    {selected && <WorksDetail key={selected.id} actorId={actorId} row={selected} invalidate={invalidate} close={() => navigation.run(() => { setSelected(null); detailTrigger.current?.focus(); })} />}
  </div>;
}
function WorksDetail({ actorId, row, invalidate, close }: { actorId: string; row: AgriStageListRow; invalidate: () => void; close: () => void }) {
  const t = useTranslations("product.agriWorks"); const locale = useLocale(); const navigation = useWorkspaceNavigation();
  const [detail, setDetail] = useState<AgriStageDetail | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const alive = useRef(true); const generation = useRef(0);
  const load = useCallback(async (before?: number) => {
    const requestId = ++generation.current; setLoading(true); setError(""); if (!before) setDetail(null);
    try {
      const next = await readWorks<AgriStageDetail>(api + "/" + encodeURIComponent(row.id) + (before ? "?beforeSequence=" + before : ""), actorId);
      if (alive.current && requestId === generation.current) setDetail(old => before && old ? { ...next, history: [...(next.hasPrivateMaterials ? old.history : old.history.map(item => ({ id: item.id, entryStageId: item.entryStageId, sequence: item.sequence, ruleVersionId: item.ruleVersionId, acceptedAt: item.acceptedAt }))), ...next.history].filter((item, index, all) => all.findIndex(other => other.id === item.id) === index) } : next);
    } catch (error) {
      if (!alive.current || requestId !== generation.current) return; setDetail(null);
      const code = error instanceof WorksError ? error.code : "INTERNAL_ERROR"; if (accountErrors.has(code)) invalidate(); else setError(code);
    } finally { if (alive.current && requestId === generation.current) setLoading(false); }
  }, [actorId, row.id, invalidate]);
  useEffect(() => { const requests = generation; alive.current = true; void load(); return () => { alive.current = false; ++requests.current; }; }, [load]);
  const [reviewedSubmissionId, setReviewedSubmissionId] = useState<string | null>(null);
  const focusRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { focusRef.current?.focus(); }, []);
  function snapshot(item: AgriSubmissionHistoryItem) {
    return <article key={item.id} className="min-w-0 space-y-3 rounded-xl border p-4 text-sm">
      <h4 className="font-semibold">{t("submission", { sequence: item.sequence, at: time(item.acceptedAt, locale) })}</h4>
      {item.correction && <p className="whitespace-pre-wrap break-words">{t("correctedFrom", { id: item.correction.previousSubmissionId, reason: item.correction.reason })}</p>}<p className="break-all text-xs text-muted-foreground">{t("submissionId", { id: item.id })}</p><p className="break-all text-xs text-muted-foreground">{t("ruleId", { id: item.ruleVersionId })}</p>
      <Button variant="outline" onClick={() => navigation.run(() => setReviewedSubmissionId(item.id))}>{t("reviewVersion", { number: item.sequence })}</Button>
      {item.content && <><p className="whitespace-pre-wrap break-words">{item.content.summary}</p><p className="break-all">{t("versionId", { id: item.content.artifactVersionId })}</p>
        {item.content.repository && <div className="space-y-2"><p>{t("repository")}: <a className="break-all underline" href={item.content.repository.url} target="_blank" rel="noreferrer">{item.content.repository.url}</a></p>{item.content.repository.ref && <p className="break-all">{item.content.repository.ref.kind}: {item.content.repository.ref.value}</p>}</div>}
        {item.content.demoUrl && <p>{t("demo")}: <a className="break-all underline" href={item.content.demoUrl} target="_blank" rel="noreferrer">{item.content.demoUrl}</a></p>}
        {item.content.materials.items.length > 0 && <dl className="space-y-3">{item.content.materials.items.map(material => <div key={material.key} className="min-w-0 rounded-lg bg-muted/40 p-3"><dt className="break-words font-medium">{material.key}</dt><dd className="whitespace-pre-wrap break-words">{material.kind === "TEXT" ? material.text : material.kind === "LINK" ? <a className="break-all underline" href={material.url} target="_blank" rel="noreferrer">{material.url}</a> : t("versionId", { id: material.artifactVersionId })}</dd></div>)}</dl>}
      </>}
    </article>;
  }
  return <Card><CardHeader className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle><h2 ref={focusRef} tabIndex={-1} className="break-words">{t("detailTitle", { team: row.teamName, stage: t("stage." + row.stage) })}</h2></CardTitle><div className="flex gap-2"><Button variant="outline" disabled={loading} onClick={() => navigation.run(() => void load())}>{t("refreshDetail")}</Button><Button variant="ghost" onClick={close}>{t("close")}</Button></div></div></CardHeader><CardContent className="space-y-4">
    {loading && <p role="status">{t("loading")}</p>}{error && <p role="alert">{t.has("errors." + error) ? t("errors." + error) : t("errors.INTERNAL_ERROR")}</p>}
    {detail && <><p className="break-all text-xs text-muted-foreground">{t("entryId", { id: detail.teamCompetitionId })}</p><p className="break-all text-xs text-muted-foreground">{t("stageId", { id: detail.id })}</p><p className="text-sm leading-6 text-muted-foreground">{t(detail.hasPrivateMaterials ? "privateVisible" : "metadataOnly")}</p><p className="text-sm">{t("window." + detail.windowState)}{detail.frozenSubmissionId ? " · " + t("recordedFrozen") : ""}</p><p className="text-xs text-muted-foreground">{t("serverNow", { at: time(detail.serverNow, locale) })}</p>
      <Button asChild variant="outline"><WorkspaceLink href={"/competitions/agrihackathon/manage?" + new URLSearchParams({ teamCompetitionId: detail.teamCompetitionId, entryStageId: detail.id }) + "#agri-decisions"}>{t("manageDecisions")}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></WorkspaceLink></Button>
      {detail.current && <Button variant="outline" onClick={() => navigation.run(() => setReviewedSubmissionId(detail.current!.id))}>{t("reviewCurrent")}</Button>}
      <AgriPublications actorId={actorId} entryStageId={detail.id} scope="staff" invalidate={invalidate} /><h3 className="font-semibold">{t("current")}</h3>{detail.current ? snapshot(detail.current) : <p className="text-sm text-muted-foreground">{t("noCurrent")}</p>}
      {reviewedSubmissionId && <><AgriOnsiteStaffLink submissionId={reviewedSubmissionId} /><AgriRecordSummary actorId={actorId} submissionId={reviewedSubmissionId} invalidate={invalidate} /><AgriEvidence actorId={actorId} submissionId={reviewedSubmissionId} invalidate={invalidate} /><AgriRecordArchives actorId={actorId} submissionId={reviewedSubmissionId} invalidate={invalidate} /><AgriReviews actorId={actorId} submissionId={reviewedSubmissionId} scope="staff" invalidate={invalidate} /><AgriIssues actorId={actorId} submissionId={reviewedSubmissionId} scope="staff" invalidate={invalidate} /><AgriDemoChecks actorId={actorId} submissionId={reviewedSubmissionId} scope="staff" invalidate={invalidate} /></>}
      <h3 className="font-semibold">{t("history")}</h3>{!detail.history.length && <p className="text-sm text-muted-foreground">{t("noHistory")}</p>}{detail.history.map(snapshot)}
      {detail.nextBeforeSequence && <Button variant="outline" disabled={loading} onClick={() => navigation.run(() => void load(detail.nextBeforeSequence!))}>{t("moreHistory")}</Button>}
    </>}
  </CardContent></Card>;
}
