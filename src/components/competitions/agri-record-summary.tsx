"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardList, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import type { AgriRecordSummary as Summary } from "@/contracts/agri-record-summary";

const accountErrors = new Set(["UNAUTHORIZED", "ACCOUNT_CHANGED", "ACCOUNT_UNAVAILABLE"]);
type Selection = { includePrivate: boolean; includeInternal: boolean };
const metadata: Selection = { includePrivate: false, includeInternal: false };
export function AgriRecordSummary({ actorId, submissionId, invalidate }: { actorId: string; submissionId: string; invalidate: () => void }) {
  // Keep source/account changes separate even when a caller forgets to key its detail panel.
  return <SummaryPanel key={actorId + ":" + submissionId} actorId={actorId} submissionId={submissionId} invalidate={invalidate} />;
}
function SummaryPanel({ actorId, submissionId, invalidate }: { actorId: string; submissionId: string; invalidate: () => void }) {
  const t = useTranslations("product.agriSummary"), locale = useLocale(), id = useId();
  const [open, setOpen] = useState(false), [selection, setSelection] = useState<Selection>(metadata);
  const [data, setData] = useState<Summary | null>(null), [error, setError] = useState("");
  const [busy, setBusy] = useState<"view" | "exportJSON" | null>(null);
  const alive = useRef(true), generation = useRef(0), controller = useRef<AbortController | null>(null);
  const invalidateRef = useRef(invalidate); invalidateRef.current = invalidate;
  const cancel = useCallback(() => { ++generation.current; controller.current?.abort(); controller.current = null; }, []);
  useEffect(() => { alive.current = true; return () => { alive.current = false; cancel(); }; }, [cancel]);
  function select(next: Selection) { cancel(); setSelection(next); setData(null); setError(""); setBusy(null); }
  async function load(mode: "view" | "exportJSON" = "view") {
    cancel(); const request = generation.current, abort = new AbortController(); controller.current = abort;
    setData(null); setError(""); setBusy(mode);
    const timeout = setTimeout(() => abort.abort(), 15000);
    try {
      const query = new URLSearchParams({ includePrivate: String(selection.includePrivate), includeInternal: String(selection.includeInternal), mode });
      const response = await fetch("/api/competitions/agrihackathon/records/" + encodeURIComponent(submissionId) + "/summary?" + query, { cache: "no-store", signal: abort.signal, headers: { "x-ans-submission-actor": actorId } });
      const body = await response.json();
      if (!alive.current || request !== generation.current) return;
      if (!response.ok || (mode === "view" && body.ok !== true)) {
        const code = typeof body.error?.code === "string" ? body.error.code : "INTERNAL_ERROR";
        if (accountErrors.has(code)) invalidateRef.current();
        setError(code); return;
      }
      const value: Summary = mode === "view" ? body.data : body;
      // Fail closed when an old or misrouted response describes a different source/scope.
      if (value?.source !== "ANS_AGRI_LIVE_RECORD_SUMMARY" || value.submission?.id !== submissionId || value.selection?.includePrivate !== selection.includePrivate || value.selection?.includeInternal !== selection.includeInternal || value.limits?.complete !== true) { setError("INTERNAL_ERROR"); return; }
      if (mode === "exportJSON") {
        if (!(response.headers.get("content-type") ?? "").startsWith("application/json")) { setError("INTERNAL_ERROR"); return; }
        const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + "\n"], { type: "application/json" }));
        const link = document.createElement("a"); link.href = url; link.download = "ans-agri-live-record-summary.json";
        document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setData(value);
    } catch { if (alive.current && request === generation.current) setError("INTERNAL_ERROR"); }
    finally { clearTimeout(timeout); if (alive.current && request === generation.current) { controller.current = null; setBusy(null); } }
  }
  const at = (value: string) => new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const message = (code: string) => t.has("errors." + code) ? t("errors." + code) : t("errors.INTERNAL_ERROR");
  return <section aria-labelledby={id + "-title"} className="min-w-0 rounded-xl border">
    <div className="flex flex-wrap items-center justify-between gap-3 p-5"><div className="min-w-0 space-y-2"><h2 id={id + "-title"} className="flex items-center gap-2 text-lg font-semibold"><ClipboardList className="h-5 w-5 shrink-0" aria-hidden="true" />{t("title")}</h2><p className="max-w-3xl text-sm leading-6 text-muted-foreground">{t("intro")}</p></div><Button variant="outline" aria-expanded={open} aria-controls={id + "-body"} onClick={() => { if (open) { cancel(); setData(null); setSelection(metadata); setError(""); setBusy(null); setOpen(false); } else { setOpen(true); void load(); } }}>{t(open ? "close" : "open")}</Button></div>
    {open && <div id={id + "-body"} className="min-w-0 space-y-5 border-t p-5">
      <div className="space-y-3"><fieldset className="flex flex-wrap gap-x-6 gap-y-3"><legend className="mb-3 text-sm font-medium">{t("scope")}</legend><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selection.includePrivate} onChange={event => select({ ...selection, includePrivate: event.target.checked })} />{t("includePrivate")}</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selection.includeInternal} onChange={event => select({ ...selection, includeInternal: event.target.checked })} />{t("includeInternal")}</label></fieldset><p className="text-xs leading-6 text-muted-foreground">{t("scopeHint")}</p><div className="flex flex-wrap gap-3"><Button variant="outline" disabled={busy !== null} onClick={() => void load()}><RefreshCw className="h-4 w-4" aria-hidden="true" />{t("refresh")}</Button><Button variant="outline" disabled={busy !== null} onClick={() => void load("exportJSON")}><Download className="h-4 w-4" aria-hidden="true" />{t("export")}</Button></div><p className="text-xs leading-6 text-muted-foreground">{t("exportHint")}</p></div>
      {busy && <p role="status">{t(busy === "view" ? "loading" : "exporting")}</p>}{error && <p role="alert" className="rounded-lg border p-3 text-sm">{message(error)}</p>}
      {!busy && !error && !data && <p role="status" className="text-sm text-muted-foreground">{t("changed")}</p>}
      {data && <div className="min-w-0 space-y-5"><div className="flex flex-wrap items-center gap-3"><Badge variant="secondary">{t("live")}</Badge><p className="text-xs text-muted-foreground">{t("generated", { at: at(data.generatedAt) })}</p></div><p className="text-sm leading-6 text-muted-foreground">{t("notArchive")}</p>
        <AgriRecordSummaryContents data={data} />
      </div>}
    </div>}
  </section>;
}

/** Shared read-only projection; frozen archives supply their own version and scope labels. */
export function AgriRecordSummaryContents({ data }: { data: Summary }) {
  const t = useTranslations("product.agriSummary"), locale = useLocale();
  const at = (value: string) => new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  return <div className="min-w-0 space-y-5">
        <div className="space-y-2 rounded-lg border p-4"><h3 className="text-sm font-medium">{t("selectedSubmission")}</h3><p className="text-sm">{t("submission", { stage: t("stage." + data.submission.stage), sequence: data.submission.sequence, version: data.submission.artifactVersion })}</p><p className="text-xs text-muted-foreground">{t("rule", { version: data.rule.version, at: at(data.rule.confirmedAt) })}</p>{!data.submission.isCurrent && <p className="text-xs text-muted-foreground">{t("historical")}</p>}</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{([["history", data.stageHistory.length], ["technical", data.technicalChecks.length], ["demo", data.demoChecks.length], ["issues", data.issues.length]] as const).map(([name, count]) => <div key={name} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{t(name)}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{count}</p></div>)}</div>
        <div className="space-y-3"><h3 className="font-medium">{t("history")}</h3><ul className="space-y-2">{data.stageHistory.map(row => <li key={row.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0 space-y-1"><p className="text-sm">{t("submission", { stage: t("stage." + row.stage), sequence: row.sequence, version: row.artifactVersion })}</p><p className="text-xs text-muted-foreground">{at(row.acceptedAt)}</p>{row.correction && <div className="space-y-1"><p className="whitespace-pre-wrap break-words text-sm">{t("correctedFrom", { id: row.correction.previousSubmissionId, reason: row.correction.reason })}</p><p className="break-all text-xs text-muted-foreground">{t("correctionAuthority", { id: row.correction.authorizedById, at: at(row.correction.authorizedAt), permit: row.correction.permitId })}</p></div>}<div className="flex flex-wrap gap-2">{row.isCurrent && <Badge variant="outline">{t("current")}</Badge>}{row.isFrozen && <Badge variant="outline">{t("frozen")}</Badge>}</div></div><Button asChild variant="ghost" size="sm"><WorkspaceLink href={"/competitions/agrihackathon/records/" + encodeURIComponent(row.id) + "?scope=staff"}>{t("openSource")}</WorkspaceLink></Button></li>)}</ul></div>
        {data.content && <div className="space-y-2 rounded-lg border p-4"><h3 className="font-medium">{t("submissionContent")}</h3><p className="whitespace-pre-wrap break-words text-sm">{data.content.summary}</p><p className="text-xs text-muted-foreground">{t("materialCount", { count: data.content.materials.items.length })}</p></div>}
        {([['technical', data.technicalChecks], ['demo', data.demoChecks]] as const).map(([name, checks]) => <div key={name} className="space-y-3"><h3 className="font-medium">{t(name)}</h3>{!checks.length && <p className="text-sm text-muted-foreground">{t("empty")}</p>}<ul className="space-y-2">{checks.map(check => <li key={check.id} className="space-y-2 rounded-lg border p-3"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{t("result." + check.result)}</Badge><Badge variant="secondary">{t("basis." + check.basis)}</Badge><span className="text-xs text-muted-foreground">{at(check.checkedAt)}</span><Badge variant="secondary">{t(check.feedback ? "published" : "unpublished")}</Badge></div>{check.checkedById && <p className="break-all text-xs text-muted-foreground">{t("checkedBy", { id: check.checkedById })}</p>}{check.feedback?.body && <p className="whitespace-pre-wrap break-words text-sm">{check.feedback.body}</p>}{check.internalNote && <div className="space-y-1"><p className="text-xs text-muted-foreground">{t("internalNote")}</p><p className="whitespace-pre-wrap break-words text-sm">{check.internalNote}</p></div>}</li>)}</ul></div>)}
        <div className="space-y-3"><h3 className="font-medium">{t("issues")}</h3>{!data.issues.length && <p className="text-sm text-muted-foreground">{t("empty")}</p>}<ul className="space-y-2">{data.issues.map(issue => <li key={issue.id} className="min-w-0 space-y-2 rounded-lg border p-3"><p className="break-words text-sm font-medium">{issue.title ?? t("issueMetadata", { revision: issue.revision })}</p><p className="text-xs text-muted-foreground">{t("issueStatus." + issue.status)} · {at(issue.updatedAt)}</p>{issue.assigneeId && <p className="break-all text-xs text-muted-foreground">{t("assignedTo", { id: issue.assigneeId })}</p>}{issue.completedById && <p className="break-all text-xs text-muted-foreground">{t("completedBy", { id: issue.completedById })}</p>}{issue.body && <p className="whitespace-pre-wrap break-words text-sm">{issue.body}</p>}{issue.processingSummary && <p className="whitespace-pre-wrap break-words text-sm">{issue.processingSummary}</p>}</li>)}</ul><p className="text-xs text-muted-foreground">{t("eventCount", { count: data.issueEvents.length })}</p><ul className="space-y-2">{data.issueEvents.map(event => <li key={event.id} className="space-y-2 rounded-lg border p-3"><p className="break-all text-xs text-muted-foreground">{at(event.createdAt)}{event.actorId ? " · " + t("eventActor", { id: event.actorId }) : ""}</p>{event.body && <p className="whitespace-pre-wrap break-words text-sm">{event.body}</p>}</li>)}</ul></div>
        <p className="text-xs leading-6 text-muted-foreground">{t("limit", { count: data.limits.maxPerCollection })}</p>
  </div>;
}
