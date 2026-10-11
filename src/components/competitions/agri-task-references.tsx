"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceLink } from "@/components/providers/workspace-navigation";
import type { AgriReferenceChoices, AgriReferenceRecord, AgriReferenceRecordDetail, AgriTaskReferenceView } from "@/contracts/agri-task-references";
import type { AgriTaskCommand } from "@/contracts/agri-tasks";
const api = "/api/competitions/agrihackathon/tasks/candidates";
export function agriReferenceHref(record: AgriReferenceRecord) {
  const query = new URLSearchParams({ scope: record.scope });
  if (record.issue) query.set("issue", record.issue.id);
  if (record.demoCheck) query.set("demo", record.demoCheck.id);
  return "/competitions/agrihackathon/records/" + encodeURIComponent(record.submissionId) + "?" + query;
}
export function AgriTaskReferences({ actorId, taskId, revision, references, locked, readonly, mutate, invalidate }: {
  actorId: string; taskId: string; revision: number; references: AgriTaskReferenceView[];
  locked: boolean; readonly: boolean; mutate: (command: AgriTaskCommand) => Promise<void>; invalidate: () => void;
}) {
  const t = useTranslations("product.agriTasks"); const field = useId();
  const [open, setOpen] = useState(false), [scope, setScope] = useState<"team" | "staff">("team"), [query, setQuery] = useState("");
  const [choices, setChoices] = useState<AgriReferenceChoices | null>(null), [chosen, setChosen] = useState<AgriReferenceRecordDetail | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState(""); const generation = useRef(0), alive = useRef(true), invalidateRef = useRef(invalidate); invalidateRef.current = invalidate;
  useEffect(() => { alive.current = true; const requests = generation; return () => { alive.current = false; ++requests.current; }; }, []);
  async function read<T>(url: string): Promise<T> {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000), headers: { "x-ans-task-actor": actorId } });
    const body = await response.json();
    if (!response.ok || body.ok !== true) throw new Error(body.error?.code ?? "INTERNAL_ERROR");
    return body.data as T;
  }
  async function load(cursor?: string) {
    const request = ++generation.current; setOpen(true); setLoading(true); setError(""); setChosen(null); if (!cursor) setChoices(null);
    try {
      const page = await read<AgriReferenceChoices>(api + "?" + new URLSearchParams({ scope, q: query.trim(), ...(cursor ? { cursor } : {}) }));
      if (alive.current && request === generation.current) setChoices(old => cursor && old ? { ...page, records: [...old.records, ...page.records] } : page);
    } catch (error) { handle(error, request); }
    finally { if (alive.current && request === generation.current) setLoading(false); }
  }
  function handle(error: unknown, request: number) {
    if (!alive.current || request !== generation.current) return;
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    if (["UNAUTHORIZED", "ACCOUNT_CHANGED", "ACCOUNT_UNAVAILABLE"].includes(code)) invalidateRef.current();
    else setError(t.has("errors." + code) ? t("errors." + code) : t("errors.INTERNAL_ERROR"));
  }
  async function choose(record: AgriReferenceRecord, cursor?: string) {
    const request = ++generation.current; setLoading(true); setError(""); if (!cursor) setChosen(null);
    try {
      const page = await read<AgriReferenceRecordDetail>(api + "/" + encodeURIComponent(record.submissionId) + "?" + new URLSearchParams({ scope: record.scope, ...(cursor ? { cursor } : {}) }));
      if (alive.current && request === generation.current) setChosen(old => cursor && old ? { ...page, issues: [...old.issues, ...page.issues] } : page);
    } catch (error) { handle(error, request); }
    finally { if (alive.current && request === generation.current) setLoading(false); }
  }
  function attach(record: AgriReferenceRecord, issueId: string | null, demoCheckId: string | null = null) {
    void mutate({ action: "attachReference", taskId, expectedRevision: revision, target: { submissionId: record.submissionId, issueId, demoCheckId }, idempotencyKey: crypto.randomUUID() });
  }
  return <section className="min-w-0 space-y-4 rounded-xl border p-4">
    <h2 className="font-semibold">{t("references.title")}</h2><p className="text-sm leading-6 text-muted-foreground">{t("references.privacy")}</p>
    {!references.length && <p className="text-sm">{t("references.empty")}</p>}
    <ul className="space-y-3">{references.map(reference => <li key={reference.id} className="min-w-0 space-y-2 rounded-lg border p-3 text-sm">
      {reference.available ? <><p className="break-words font-medium">{reference.record.teamName} · {t("references.stage." + reference.record.stage)}</p><p>{t("references.version", { sequence: reference.record.sequence, version: reference.record.artifactVersion })}</p>{reference.record.demoCheck && <p>{t("references.demoLabel", { sequence: reference.record.demoCheck.sequence })}</p>}{reference.record.issue && <p className="break-words">{reference.record.issue.title}</p>}<Button asChild variant="outline" disabled={locked}><WorkspaceLink href={agriReferenceHref(reference.record)}>{t("references.open")}</WorkspaceLink></Button></> : <p>{t("references.unavailable")}</p>}
      {!readonly && <Button variant="ghost" disabled={locked} onClick={() => void mutate({ action: "detachReference", taskId, expectedRevision: revision, referenceId: reference.id, idempotencyKey: crypto.randomUUID() })}>{t("references.remove")}</Button>}
    </li>)}</ul>
    {!readonly && <><Button variant="outline" disabled={locked || loading || references.length >= 10} onClick={() => void load()}>{t("references.choose")}</Button>
      {open && <div className="space-y-3 border-t pt-4"><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><label htmlFor={field + "-scope"}>{t("references.scope")}</label><select id={field + "-scope"} className="w-full min-w-0 rounded-md border bg-background p-2 text-sm" disabled={locked || loading} value={scope} onChange={event => { ++generation.current; setScope(event.target.value as "team" | "staff"); setChoices(null); setChosen(null); setError(""); }}><option value="team">{t("references.team")}</option><option value="staff">{t("references.staff")}</option></select></div><div className="space-y-2"><label htmlFor={field + "-search"}>{t("references.searchLabel")}</label><Input id={field + "-search"} maxLength={120} disabled={locked || loading} value={query} onChange={event => { setQuery(event.target.value); setChoices(null); setChosen(null); }} /></div></div>
      <Button disabled={locked || loading} variant="outline" onClick={() => void load()}>{t("references.search")}</Button>
      {error && <p role="alert">{error}</p>}{loading && <p role="status">{t("loading")}</p>}
      {choices && !choices.records.length && <p>{t("references.noChoices")}</p>}
      <ul className="space-y-2">{choices?.records.map(record => <li key={record.submissionId} className="min-w-0 space-y-2 rounded-lg border p-3"><p className="break-words text-sm">{record.teamName} · {t("references.stage." + record.stage)} · {t("references.version", { sequence: record.sequence, version: record.artifactVersion })}</p><div className="flex flex-wrap gap-2"><Button disabled={locked || loading} variant="outline" onClick={() => attach(record, null)}>{t("references.attachSubmission")}</Button><Button disabled={locked || loading} variant="ghost" onClick={() => void choose(record)}>{t("references.chooseDetail")}</Button></div></li>)}</ul>
      {choices?.nextCursor && <Button disabled={locked || loading} variant="outline" onClick={() => void load(choices.nextCursor!)}>{t("more")}</Button>}
      {chosen && <div className="space-y-3 rounded-lg border p-3"><h3 className="break-words font-medium">{chosen.record.teamName} · {t("references.version", { sequence: chosen.record.sequence, version: chosen.record.artifactVersion })}</h3>{!chosen.issues.length && <p>{t("references.noIssues")}</p>}<ul className="space-y-2">{chosen.issues.map(issue => <li key={issue.id} className="flex flex-wrap items-center justify-between gap-2"><span className="break-words text-sm">{issue.title}</span><Button disabled={locked || loading} variant="outline" onClick={() => attach(chosen.record, issue.id)}>{t("references.attachIssue")}</Button></li>)}</ul><ul className="space-y-2">{chosen.demoChecks?.map(check => <li key={check.id} className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm">{t("references.demoLabel", { sequence: check.sequence })}</span><Button disabled={locked || loading} variant="outline" onClick={() => attach(chosen.record, null, check.id)}>{t("references.attachDemo")}</Button></li>)}</ul>{chosen.nextCursor && <Button disabled={locked || loading} variant="outline" onClick={() => void choose(chosen.record, chosen.nextCursor!)}>{t("more")}</Button>}</div>}
      </div>}</>}
  </section>;
}
