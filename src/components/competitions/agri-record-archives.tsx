"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Archive, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { canonicalAgriArchiveJSON, agriArchiveOnsiteSchema, type AgriRecordArchiveDescriptor, type AgriRecordArchiveList, type AgriRecordArchiveDetail, type AgriRecordArchiveSelection, type AgriRecordArchiveResult } from "@/contracts/agri-record-archive";
import { AgriRecordSummaryContents } from "./agri-record-summary";
import { readAgriArchivePending, writeAgriArchivePending, type AgriArchiveCommand } from "./agri-record-archive-recovery";
const accountErrors = new Set(["UNAUTHORIZED", "ACCOUNT_CHANGED", "ACCOUNT_UNAVAILABLE"]);
const unknownOutcome = new Set(["INTERNAL_ERROR", "RATE_LIMITED"]);
const metadata: AgriRecordArchiveSelection = { includePrivate: false, includeInternal: false };
export function AgriRecordArchives(props: { actorId: string; submissionId: string; invalidate: () => void }) { return <ArchivePanel key={JSON.stringify([props.actorId, props.submissionId])} {...props} />; }
function ArchivePanel({ actorId, submissionId, invalidate }: { actorId: string; submissionId: string; invalidate: () => void }) {
  const t = useTranslations("product.agriArchives"), locale = useLocale(), id = useId();
  const [open, setOpen] = useState(false), [list, setList] = useState<AgriRecordArchiveList | null>(null), [detail, setDetail] = useState<AgriRecordArchiveDetail | null>(null);
  const [selection, setSelection] = useState<AgriRecordArchiveSelection>(metadata), [confirm, setConfirm] = useState(false), [pending, setPending] = useState<AgriArchiveCommand | null>(() => readAgriArchivePending(actorId, submissionId));
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState<number | null>(null);
  const alive = useRef(true), generation = useRef(0), controller = useRef<AbortController | null>(null), writing = useRef(false);
  const invalidateRef = useRef(invalidate); invalidateRef.current = invalidate;
  const cancel = useCallback(() => { ++generation.current; controller.current?.abort(); controller.current = null; }, []);
  useEffect(() => { alive.current = true; return () => { alive.current = false; cancel(); }; }, [cancel]);
  const remember = (command: AgriArchiveCommand | null) => { setPending(command); writeAgriArchivePending(actorId, submissionId, command); };
  const message = (code: string) => t.has("errors." + code) ? t("errors." + code) : t("errors.INTERNAL_ERROR");
  const at = (value: string) => new Intl.DateTimeFormat(locale === "zh" · "zh-CN" : "en-GB", { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  async function request(url: string, init: RequestInit = {}) {
    cancel(); const epoch = generation.current, abort = new AbortController(); controller.current = abort; setBusy(true); setError("");
    const timer = setTimeout(() => abort.abort(), 15000);
    try {
      const response = await fetch(url, { ...init, cache: "no-store", signal: abort.signal, headers: { ...init.headers, "x-ans-submission-actor": actorId } });
      const text = await response.text();
      if (!alive.current || epoch !== generation.current) return null;
      const body = JSON.parse(text);
      if (!response.ok || (init.method === "POST" && body.ok !== true)) {
        const code = typeof body.error?.code === "string" ? body.error.code : "INTERNAL_ERROR";
        if (accountErrors.has(code)) { writeAgriArchivePending(actorId, submissionId, null); invalidateRef.current(); }
        setError(code); return { failed: code };
      }
      return { body, response, text };
    } catch { if (alive.current && epoch === generation.current) { setError("INTERNAL_ERROR"); return { failed: "INTERNAL_ERROR" }; } return null; }
    finally { clearTimeout(timer); if (alive.current && epoch === generation.current) { controller.current = null; setBusy(false); } }
  }
  async function load(cursor?: string) {
    setDetail(null);
    if (!cursor) setList(null);
    const result = await request("/api/competitions/agrihackathon/records/" + encodeURIComponent(submissionId) + "/archives" + (cursor ? "?" + new URLSearchParams({ cursor }) : ""));
    if (!result || "failed" in result) return;
    const value = result.body.data as AgriRecordArchiveList;
    if (result.body.ok !== true || value?.submissionId !== submissionId || !Array.isArray(value.items) || value.items.some(row => row.submissionId !== submissionId)) { setList(null); setError("INTERNAL_ERROR"); return; }
    setList(previous => ({ ...value, items: cursor && previous ? [...previous.items, ...value.items.filter(row => !previous.items.some(old => old.id === row.id))] : value.items }));
  }
  async function read(expected: AgriRecordArchiveDescriptor, mode: "view" | "exportJSON" = "view") {
    const archiveId = expected.id;
    setDetail(null); setSaved(null);
    const result = await request("/api/competitions/agrihackathon/archives/" + encodeURIComponent(archiveId) + "?" + new URLSearchParams({ mode }));
    if (!result || "failed" in result) return;
    const epoch = generation.current;
    try {
      const value = (mode === "view" ? result.body.data : result.body) as AgriRecordArchiveDetail;
      if (mode === "view" && result.body.ok !== true) throw new Error("invalid envelope");
      const a = value.archive, s = value.snapshot;
      if (a?.id !== archiveId || a.submissionId !== submissionId || s?.archiveId !== archiveId || s.source !== "ANS_AGRI_SAVED_RECORD_ARCHIVE" || ![1, 2].includes(s.schemaVersion) || s.includesOnsite !== (s.schemaVersion === 2) || a.includesOnsite !== s.includesOnsite || s.sequence !== a.sequence || s.record?.submission.id !== submissionId || s.record.selection.includePrivate !== a.selection.includePrivate || s.record.selection.includeInternal !== a.selection.includeInternal || s.record.limits.complete !== true) throw new Error("invalid source");
      const r = s.record;
      if (canonicalAgriArchiveJSON(a) !== canonicalAgriArchiveJSON(expected) || a.snapshotSchemaVersion !== s.schemaVersion || a.competitionId !== r.competitionId || a.entryStageId !== r.submission.entryStageId || a.artifactVersionId !== r.submission.artifactVersionId || a.ruleVersionId !== r.submission.ruleVersionId || a.ruleVersionId !== r.rule.id || a.previousArchiveId !== s.previousArchiveId || a.createdById !== s.createdById || a.collectedAt !== s.collectedAt || r.generatedAt !== s.collectedAt || r.schemaVersion !== 1 || r.source !== "ANS_AGRI_LIVE_RECORD_SUMMARY" || r.limits.maxPerCollection !== 100 || [r.stageHistory, r.technicalChecks, r.demoChecks, r.issues, r.issueEvents].some(rows => !Array.isArray(rows) || rows.length > 100)) { setError("AGRI_ARCHIVE_INTEGRITY_FAILED"); return; }
      if (s.schemaVersion === 2) agriArchiveOnsiteSchema.parse(s.onsite);
      const bytes = new TextEncoder().encode(canonicalAgriArchiveJSON(s));
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), byte => byte.toString(16).padStart(2, "0")).join("");
      if (!alive.current || epoch !== generation.current) return;
      if (digest !== a.sha256 || bytes.byteLength !== a.byteLength) { setError("AGRI_ARCHIVE_INTEGRITY_FAILED"); return; }
      if (mode === "exportJSON") {
        if (!(result.response.headers.get("content-type") ?? "").startsWith("application/json")) throw new Error("invalid export");
        const url = URL.createObjectURL(new Blob([result.text], { type: "application/json" }));
        const link = document.createElement("a"); link.href = url; link.download = "ans-agri-archive-v" + a.sequence + ".json";
        document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setDetail(value);
    } catch { if (alive.current && epoch === generation.current) setError("INTERNAL_ERROR"); }
  }
  async function create(command?: AgriArchiveCommand) {
    if (writing.current) return;
    writing.current = true; setDetail(null); setList(null); setSaved(null); setConfirm(false);
    const next = command ?? { action: "createArchive", submissionId, selection: { ...selection }, idempotencyKey: crypto.randomUUID() };
    remember(next);
    try {
      const result = await request("/api/competitions/agrihackathon/records/" + encodeURIComponent(submissionId) + "/archives", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      if (!result) return;
      if ("failed" in result) { if (!unknownOutcome.has(result.failed) && !command) remember(null); return; }
      const value = result.body.data as AgriRecordArchiveResult;
      if (result.body.ok !== true || typeof value?.archiveId !== "string" || !Number.isInteger(value.sequence) || !/^[a-f0-9]{64}$/.test(value.sha256)) { setError("INTERNAL_ERROR"); return; }
      remember(null); setSaved(value.sequence); await load();
    } finally { writing.current = false; }
  }
  return <section aria-labelledby={id + "-title"} className="min-w-0 rounded-xl border">
    <div className="flex flex-wrap items-center justify-between gap-3 p-5"><div className="min-w-0 space-y-2"><h2 id={id + "-title"} className="flex items-center gap-2 text-lg font-semibold"><Archive className="h-5 w-5 shrink-0" aria-hidden="true" />{t("title")}</h2><p className="max-w-3xl text-sm leading-6 text-muted-foreground">{t("intro")}</p></div><Button variant="outline" disabled={busy} aria-expanded={open} aria-controls={id + "-body"} onClick={() => { cancel(); setDetail(null); setList(null); setError(""); setSaved(null); setSelection(metadata); setConfirm(false); setOpen(!open); if (!open) void load(); }}>{t(open ? "close" : "open")}</Button></div>
    {open && <div id={id + "-body"} className="min-w-0 space-y-5 border-t p-5">
      <p className="text-sm leading-6 text-muted-foreground">{t("fixedHint")}</p><p className="text-sm leading-6 text-muted-foreground">{t("onsiteHint")}</p>
      {pending && <div className="space-y-3 rounded-lg border border-primary/40 p-4"><p role="status" className="text-sm leading-6">{t("pending")}</p><p className="text-xs text-muted-foreground">{t("pendingScope", { private: t(pending.selection.includePrivate ? "included" : "excluded"), internal: t(pending.selection.includeInternal ? "included" : "excluded") })}</p><Button disabled={busy} onClick={() => void create(pending)}>{t("retry")}</Button></div>}
      {list?.canCreate && !pending && <div className="space-y-3 rounded-lg bg-muted/30 p-4"><fieldset disabled={busy} className="flex flex-wrap gap-x-6 gap-y-3"><legend className="mb-3 text-sm font-medium">{t("scope")}</legend>{(["includePrivate", "includeInternal"] as const).map(name => <label key={name} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selection[name]} onChange={event => { cancel(); setDetail(null); setError(""); setConfirm(false); setSelection({ ...selection, [name]: event.target.checked }); }} />{t(name)}</label>)}</fieldset><p className="text-xs leading-6 text-muted-foreground">{t("scopeHint")}</p>{!confirm ? <Button disabled={busy} onClick={() => setConfirm(true)}>{t("save")}</Button> : <div className="space-y-3"><p className="text-sm">{t("confirm")}</p><div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => void create()}>{t("confirmSave")}</Button><Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>{t("cancel")}</Button></div></div>}</div>}
      <Button variant="outline" disabled={busy} onClick={() => { setConfirm(false); void load(); }}><RefreshCw className="h-4 w-4" aria-hidden="true" />{t("refresh")}</Button>
      {busy && <p role="status">{t("loading")}</p>}{error && <p role="alert" className="rounded-lg border p-3 text-sm">{message(error)}</p>}{saved !== null && <p role="status">{t("saved", { version: saved })}</p>}
      {list && <div className="space-y-3"><h3 className="font-medium">{t("history")}</h3>{!list.items.length && <p className="text-sm text-muted-foreground">{t("empty")}</p>}<ol className="space-y-3">{list.items.map(row => <li key={row.id} className="min-w-0 space-y-3 rounded-lg border p-4"><div className="flex flex-wrap items-center gap-3"><Badge variant="secondary">{t("version", { version: row.sequence })}</Badge><span className="text-xs text-muted-foreground">{at(row.collectedAt)}</span></div><p className="text-xs leading-6 text-muted-foreground">{t("pendingScope", { private: t(row.selection.includePrivate ? "included" : "excluded"), internal: t(row.selection.includeInternal ? "included" : "excluded") })}</p><p className="break-all font-mono text-xs text-muted-foreground">SHA-256 {row.sha256}</p><div className="flex flex-wrap gap-3"><Button variant="outline" size="sm" disabled={busy} onClick={() => void read(row)}>{t("view", { version: row.sequence })}</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => void read(row, "exportJSON")}><Download className="h-4 w-4" aria-hidden="true" />{t("export", { version: row.sequence })}</Button></div></li>)}</ol>{list.nextCursor && <Button variant="outline" disabled={busy} onClick={() => void load(list.nextCursor!)}>{t("more")}</Button>}</div>}
      {detail && <div className="min-w-0 space-y-4 border-t pt-5"><h3 className="text-lg font-semibold">{t("version", { version: detail.archive.sequence })}</h3><p className="text-xs leading-6 text-muted-foreground">{t("verified", { bytes: detail.archive.byteLength })}</p><AgriRecordSummaryContents data={detail.snapshot.record} />{detail.snapshot.schemaVersion === 2 && <section className="space-y-3"><h4 className="font-medium">{t("onsiteRecords")}</h4>{detail.snapshot.onsite.items.map(item => <article key={item.id} className="space-y-2 rounded-lg border p-4"><p className="break-words font-medium">{item.fields.title}</p><p className="break-all text-xs text-muted-foreground">{t("responsible", { id: item.createdById, at: at(item.updatedAt) })}</p><p className="whitespace-pre-wrap break-words text-sm">{item.fields.operations.device}</p><p className="whitespace-pre-wrap break-words text-sm">{item.fields.operations.conditions}</p>{item.fields.operations.result && <p className="whitespace-pre-wrap break-words text-sm">{item.fields.operations.result}</p>}</article>)}<h4 className="font-medium">{t("onsiteHistory")}</h4>{detail.snapshot.onsite.events.map(event => <details key={event.id} className="rounded-lg border p-3"><summary className="break-all text-sm">{t("responsible", { id: event.actorId, at: at(event.createdAt) })} · {t("version", { version: event.revision })}</summary><div className="mt-3 space-y-2"><p className="text-sm">{event.fields.title}</p><p className="whitespace-pre-wrap break-words text-sm">{event.fields.operations.conditions}</p>{event.fields.operations.result && <p className="whitespace-pre-wrap break-words text-sm">{event.fields.operations.result}</p>}</div></details>)}</section>}</div>}
    </div>}
  </section>;
}