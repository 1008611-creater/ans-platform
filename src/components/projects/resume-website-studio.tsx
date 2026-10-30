"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Check, Download, Loader2, Monitor, Plus, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { usePublishDinoTask, type DinoTaskPhase, type DinoTaskSnapshot } from "@/components/mascot/dino-task-context";
import { RESUME_WEBSITE_COST_POINTS, resumeWebsiteInputSchema, resumeWebsiteRunSchema, type ResumeWebsiteCopy, type ResumeWebsiteInput, type ResumeWebsiteState } from "@/contracts/resume-website";
import { plainResumeWebsiteCopy, renderResumeWebsite } from "@/domain/projects/resume-website";

const emptyProject = () => ({ name: "", role: "", description: "", url: "" });
function emptyInput(language: "zh" | "en"): ResumeWebsiteInput {
  return { fullName: "", headline: "", about: "", location: "", email: "", contactUrl: "", education: "", skills: [], projects: [emptyProject()], style: "editorial", accent: "emerald", language };
}
type Attempt = { revision: number; idempotencyKey: string };
const attemptSchema = resumeWebsiteRunSchema.pick({ revision: true, idempotencyKey: true });
class RequestError extends Error { constructor(public readonly code: string) { super(code); } }
async function request<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, { method, cache: "no-store", ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new RequestError(payload.error?.code ?? "INTERNAL_ERROR");
  return payload.data as T;
}

export function ResumeWebsiteStudio({ initial }: { initial: ResumeWebsiteState }) {
  return <ResumeWebsiteEditor key={initial.projectId} initial={initial} />;
}

function ResumeWebsiteEditor({ initial }: { initial: ResumeWebsiteState }) {
  const t = useTranslations("product.website");
  const locale = useLocale();
  const [state, setState] = useState(initial);
  const [input, setInput] = useState<ResumeWebsiteInput>(() => initial.input ?? emptyInput(locale.startsWith("zh") ? "zh" : "en"));
  const [skills, setSkills] = useState(() => initial.input?.skills.join(", ") ?? "");
  const [pending, setPending] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pollError, setPollError] = useState(false);
  const [ack, setAck] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [versionId, setVersionId] = useState(initial.versions[0]?.id ?? "");
  const [copy, setCopy] = useState<ResumeWebsiteCopy | null>(null);
  const [editingBase, setEditingBase] = useState<{ id: string; expectedVersion: number } | null>(null);
  const [acceptedRun, setAcceptedRun] = useState<Pick<ResumeWebsiteState["runs"][number], "id" | "status"> | null>(null);
  const attemptRef = useRef<Attempt | null>(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(false);
  const readSequenceRef = useRef(0);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const latestVersionRef = useRef(initial.versions[0]?.id ?? "");
  const storageKey = `ans-website-attempt/${initial.projectId}`;
  const baseUrl = `/api/projects/${encodeURIComponent(initial.projectId)}/website`;
  const candidate = { ...input, skills: skills.split(/[,，\n]/u).map((value) => value.trim()).filter(Boolean) };
  const valid = resumeWebsiteInputSchema.safeParse(candidate);
  const dirty = !valid.success || JSON.stringify(valid.data) !== JSON.stringify(state.input);
  const unsavedInput = state.input ? dirty : JSON.stringify(candidate) !== JSON.stringify(emptyInput(locale.startsWith("zh") ? "zh" : "en"));
  const active = acceptedRun && ["QUEUED", "RUNNING"].includes(acceptedRun.status) ? acceptedRun : state.runs.find((run) => run.status === "QUEUED" || run.status === "RUNNING");
  const activeRunId = active?.id;
  const latestRun = acceptedRun ?? state.runs[0];
  const version = state.versions.find((item) => item.id === versionId) ?? state.versions[0];
  const guide = active ? "working" : latestRun && ["FAILED", "CANCELLED"].includes(latestRun.status) ? "failed" : version ? "review" : "ready";
  let html = "";
  try {
    if (version) html = renderResumeWebsite(version.snapshot.input, copy ?? version.snapshot.copy);
    else if (valid.success) html = renderResumeWebsite(valid.data, plainResumeWebsiteCopy(valid.data));
  } catch { /* The form remains editable while incomplete. */ }

  function errorText(cause: unknown) {
    const code = cause instanceof RequestError ? cause.code : "INTERNAL_ERROR";
    return t(t.has(`errors.${code}`) ? `errors.${code}` : "errors.INTERNAL_ERROR");
  }
  const refresh = useCallback(async (isCurrent: () => boolean = () => true) => {
    const sequence = ++readSequenceRef.current;
    try {
      const current = await request<ResumeWebsiteState>(baseUrl);
      if (mountedRef.current && isCurrent() && sequence === readSequenceRef.current) {
        setState(current); setPollError(false);
        setAcceptedRun((accepted) => accepted && !current.runs.some((run) => run.id === accepted.id) ? accepted : null);
      }
      return current;
    } catch (cause) {
      if (mountedRef.current && isCurrent() && sequence === readSequenceRef.current) setPollError(true);
      throw cause;
    }
  }, [baseUrl]);
  async function refreshAfterWrite() {
    try { await refresh(); }
    catch { /* A confirmed write stays successful even when its follow-up read fails. */ }
  }
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = attemptSchema.safeParse(JSON.parse(saved));
        if (parsed.success) attemptRef.current = parsed.data;
        else sessionStorage.removeItem(storageKey);
      }
    } catch { /* Storage is an optimization, not required for server idempotency. */ }
  }, [storageKey]);
  useEffect(() => {
    const attempt = attemptRef.current;
    if (attempt && state.runs.some((run) => run.requestKey === attempt.idempotencyKey && !["QUEUED", "RUNNING"].includes(run.status))) {
      attemptRef.current = null;
      try { sessionStorage.removeItem(storageKey); } catch { /* Optional storage. */ }
    }
  }, [state.runs, storageKey]);
  useEffect(() => {
    if (!activeRunId) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      if (!inFlightRef.current) {
        try { await refresh(() => alive); }
        catch { /* refresh retains the last known state and displays the retry hint. */ }
      }
      if (alive) timer = setTimeout(() => void tick(), 2000);
    }
    timer = setTimeout(() => void tick(), 1000);
    return () => { alive = false; clearTimeout(timer); };
  }, [activeRunId, refresh]);

  useEffect(() => {
    const newest = state.versions[0]?.id ?? "";
    if (newest !== latestVersionRef.current && !copy) setVersionId(newest);
    latestVersionRef.current = newest;
  }, [state.versions, copy]);
  useEffect(() => {
    if (!unsavedInput && !copy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsavedInput, copy]);

  async function operation(kind: string, run: () => Promise<void>) {
    if (inFlightRef.current || !mountedRef.current) return;
    inFlightRef.current = true;
    readSequenceRef.current++;
    setPending(kind); setError(""); setNotice("");
    try { await run(); }
    catch (cause) {
      if (!mountedRef.current) return;
      setError(errorText(cause));
      if (cause instanceof RequestError && ["REVISION_CONFLICT", "VERSION_CONFLICT"].includes(cause.code)) {
        await refreshAfterWrite();
      }
    }
    finally { inFlightRef.current = false; if (mountedRef.current) setPending(""); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!valid.success) { setError(t("errors.INVALID_INPUT")); return; }
    await operation("save", async () => {
      const saved = await request<{ revision: number; input: ResumeWebsiteInput }>(baseUrl, "PATCH", { expectedRevision: state.revision, input: valid.data });
      if (!mountedRef.current) return;
      readSequenceRef.current++;
      setState((current) => ({ ...current, revision: saved.revision, input: saved.input }));
      setInput(saved.input); setSkills(saved.input.skills.join(", ")); setAck(false);
      setNotice(t("saved", { revision: saved.revision }));
    });
  }
  async function generate() {
    if (dirty || active || !ack || !state.revision) return;
    await operation("generate", async () => {
      if (!attemptRef.current || attemptRef.current.revision !== state.revision) {
        attemptRef.current = { revision: state.revision, idempotencyKey: crypto.randomUUID() };
        try { sessionStorage.setItem(storageKey, JSON.stringify(attemptRef.current)); } catch { /* Optional storage. */ }
      }
      const accepted = await request<Pick<ResumeWebsiteState["runs"][number], "id" | "status">>(baseUrl + "/runs", "POST", { ...attemptRef.current, acknowledged: true });
      if (!mountedRef.current) return;
      readSequenceRef.current++;
      setAcceptedRun({ id: accepted.id, status: accepted.status }); setAck(false);
      setNotice(t("accepted")); await refreshAfterWrite();
    });
  }
  async function saveCopy() {
    if (!copy || !editingBase) return;
    await operation("copy", async () => {
      const saved = await request<ResumeWebsiteState["versions"][number]>(baseUrl + "/copy", "POST", { baseVersionId: editingBase.id, expectedVersion: editingBase.expectedVersion, copy });
      if (!mountedRef.current) return;
      readSequenceRef.current++;
      setState((current) => ({ ...current, versions: [saved, ...current.versions.filter((item) => item.id !== saved.id)].sort((a, b) => b.version - a.version).slice(0, 20) }));
      setVersionId(saved.id); setCopy(null); setEditingBase(null);
      setNotice(t("delivered")); await refreshAfterWrite();
    });
  }
  async function download() {
    if (!version) return;
    await operation("download", async () => {
      const response = await fetch(baseUrl + `/versions/${encodeURIComponent(version.id)}/download`, { cache: "no-store" });
      if (!response.ok || !response.headers.get("content-type")?.startsWith("text/html")) {
        const payload = await response.json(); throw new RequestError(payload.error?.code ?? "INTERNAL_ERROR");
      }
      const blob = await response.blob();
      if (!mountedRef.current) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `portfolio-v${version.version}.html`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  const locked = Boolean(pending) || state.archived;
  function update<K extends keyof ResumeWebsiteInput>(key: K, value: ResumeWebsiteInput[K]) { setInput((current) => ({ ...current, [key]: value })); setAck(false); }
  function projectChange(index: number, key: keyof ResumeWebsiteInput["projects"][number], value: string) {
    update("projects", input.projects.map((project, i) => i === index ? { ...project, [key]: value } : project));
  }
  const taskId = useId();
  let taskPhase: DinoTaskPhase;
  if (state.archived) taskPhase = "archived";
  else if (pending === "save" || pending === "copy") taskPhase = "saving";
  else if (pending === "generate") taskPhase = "submitting";
  else if (pending === "refresh" || pending === "cancel" || pollError) taskPhase = "recovering";
  else if (error) taskPhase = "attention";
  else if (active) taskPhase = active.status === "QUEUED" ? "queued" : "working";
  else if (copy) taskPhase = "editing";
  else if (unsavedInput) taskPhase = "input";
  else if (latestRun?.status === "FAILED") taskPhase = "failed";
  else if (latestRun?.status === "CANCELLED") taskPhase = "cancelled";
  else if (version) taskPhase = "review";
  else if (dirty || !state.revision) taskPhase = "input";
  else taskPhase = ack ? "ready" : "confirm";
  const taskStep = copy || ["review", "editing", "archived"].includes(taskPhase) ? 3 : ["input", "saving"].includes(taskPhase) ? 1 : 2;
  const task = useMemo<DinoTaskSnapshot>(() => {
    const target = taskPhase === "input" ? "input" : taskPhase === "confirm" ? "confirm" : taskPhase === "ready" ? "generate" : taskPhase === "review" || taskPhase === "editing" || taskPhase === "archived" ? "preview" : ["recovering", "attention", "failed", "cancelled"].includes(taskPhase) ? "status" : null;
    return { phase: taskPhase, step: taskStep, costPoints: RESUME_WEBSITE_COST_POINTS, ...(target ? { targetId: `${taskId}-${target}` } : {}) };
  }, [taskPhase, taskStep, taskId]);
  usePublishDinoTask(`/projects/${encodeURIComponent(initial.projectId)}/website`, task);
  const personalFields = ["fullName", "headline", "location", "email", "contactUrl"] as const;
  return <div className="ans-product-shell"><div className="ans-product-container space-y-8 py-8 sm:py-12">
    <Link href={`/projects/${initial.projectId}`} onClick={(event) => { if ((unsavedInput || copy) && !window.confirm(t("leaveWarning"))) event.preventDefault(); }} className="ans-text-link w-fit"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("back")}</Link>
    <header className="max-w-3xl"><p className="ans-eyebrow">{initial.title}</p><h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{t("title")}</h1><p className="mt-5 leading-8 text-muted-foreground">{t("body")}</p><p className="mt-3 text-xs text-muted-foreground">{t("private")}</p></header>
    {state.archived && <p role="status" className="rounded-2xl border bg-muted p-4 text-sm">{t("archived")}</p>}
    <div id={`${taskId}-status`} tabIndex={-1} className="flex flex-wrap items-center gap-4 rounded-3xl border bg-card p-4 sm:p-5" data-task-state={guide}>
      <Image src="/mascot/ans-mascot.png" alt="" width={64} height={64} unoptimized className={active ? "shrink-0 [image-rendering:pixelated] motion-safe:animate-pulse motion-reduce:animate-none" : "shrink-0 [image-rendering:pixelated]"} />
      <div className="min-w-0 flex-1"><p className="text-sm leading-6">{t(`guide.${guide}`)}</p>{latestRun && <p role="status" className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">{active ? <Loader2 className="h-3 w-3 motion-safe:animate-spin" aria-hidden="true" /> : latestRun.status === "SUCCEEDED" ? <Check className="h-3 w-3" aria-hidden="true" /> : null}{t(`status.${latestRun.status}`)}</p>}</div>
      {active && <Button type="button" variant="outline" size="sm" className="ms-auto shrink-0" disabled={Boolean(pending)} onClick={() => void operation("cancel", async () => { await request(baseUrl + "/runs", "DELETE", { runId: active.id }); if (!mountedRef.current) return; setNotice(t("cancelled")); await refreshAfterWrite(); })}>{t("cancel")}</Button>}
    </div>
    <div aria-live="polite">{notice && <p role="status" className="text-sm text-primary">{notice}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{pollError && <p role="status" className="text-sm text-muted-foreground">{t("refreshHint")}</p>}</div>
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <div className="min-w-0 space-y-6">
        <form id={`${taskId}-input`} tabIndex={-1} onSubmit={save} className="space-y-6 rounded-3xl border bg-card p-5 sm:p-7">
          <h2 className="text-lg font-semibold">{t("step1")}</h2>
          <fieldset disabled={locked} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">{personalFields.map((key) => <label key={key} className={key === "headline" ? "block space-y-2 sm:col-span-2" : "block space-y-2"}><span className="text-sm font-medium">{t(key)}</span><Input name={key} type={key === "email" ? "email" : key === "contactUrl" ? "url" : "text"} autoComplete={key === "email" ? "email" : key === "fullName" ? "name" : "off"} value={input[key]} onChange={(event) => update(key, event.target.value)} required={key === "fullName" || key === "headline"} maxLength={key === "contactUrl" ? 500 : key === "email" ? 254 : key === "fullName" ? 80 : key === "headline" ? 120 : 100} /></label>)}</div>
            <label className="block space-y-2"><span className="text-sm font-medium">{t("about")}</span><Textarea name="about" value={input.about} onChange={(event) => update("about", event.target.value)} required maxLength={3000} rows={4} /></label>
            <label className="block space-y-2"><span className="text-sm font-medium">{t("education")}</span><Textarea name="education" value={input.education} onChange={(event) => update("education", event.target.value)} maxLength={1500} rows={2} /></label>
            <label className="block space-y-2"><span className="text-sm font-medium">{t("skills")}</span><Input name="skills" value={skills} onChange={(event) => { setSkills(event.target.value); setAck(false); }} maxLength={1600} /></label>
            <h3 className="pt-3 text-sm font-semibold">{t("projects")}</h3>
            {input.projects.map((project, index) => <div key={index} className="space-y-3 rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">{t("projectNumber", { number: index + 1 })}</p>{input.projects.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label={t("removeProject", { number: index + 1 })} onClick={() => update("projects", input.projects.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>}</div>
              {(["name", "role", "url"] as const).map((key) => <label key={key} className="block space-y-2"><span className="text-sm">{t(key === "name" ? "projectName" : key)}</span><Input name={`project-${index}-${key}`} type={key === "url" ? "url" : "text"} required={key === "name"} maxLength={key === "url" ? 500 : 100} value={project[key]} onChange={(event) => projectChange(index, key, event.target.value)} /></label>)}
              <label className="block space-y-2"><span className="text-sm">{t("description")}</span><Textarea name={`project-${index}-description`} required value={project.description} maxLength={2000} rows={3} onChange={(event) => projectChange(index, "description", event.target.value)} /></label>
            </div>)}
            <Button type="button" variant="outline" disabled={input.projects.length >= 6} onClick={() => update("projects", [...input.projects, emptyProject()])}><Plus className="me-2 h-4 w-4" aria-hidden="true" />{t("addProject")}</Button>
            <h2 className="pt-4 text-lg font-semibold">{t("step2")}</h2>
            <div className="grid gap-4 sm:grid-cols-3">{(["style", "accent", "language"] as const).map((key) => <label key={key} className="block min-w-0 space-y-2"><span className="text-sm font-medium">{t(`${key}Label`)}</span><select name={key} value={input[key]} onChange={(event) => update(key, event.target.value as ResumeWebsiteInput[typeof key])} className="h-10 w-full rounded-md border bg-background px-2 text-sm">{(key === "style" ? ["editorial", "minimal"] : key === "accent" ? ["emerald", "violet", "orange"] : ["zh", "en"]).map((value) => <option key={value} value={value}>{t(`${key}.${value}`)}</option>)}</select></label>)}</div>
            <p className="text-xs leading-6 text-muted-foreground">{t("decision")}</p>
            <div className="flex flex-wrap items-center gap-3"><Button type="submit">{t(pending === "save" ? "saving" : "save")}</Button><span className="text-xs text-muted-foreground">{state.revision ? t("revision", { revision: state.revision }) : null}</span></div>
          </fieldset>
        </form>
        <section className="space-y-4 rounded-3xl border bg-card p-5 sm:p-7" aria-label={t("generate")}>
          <p className="text-sm font-medium">{t("budget", { points: RESUME_WEBSITE_COST_POINTS })}</p><p className="text-xs text-muted-foreground">{t("costNote")}</p>
          <label className="flex items-start gap-3 text-sm leading-6"><input id={`${taskId}-confirm`} type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={ack} onChange={(event) => setAck(event.target.checked)} disabled={locked || dirty || Boolean(active)} />{t("ack")}</label>
          {dirty && <p className="text-xs text-muted-foreground">{t("dirty")}</p>}
          <div className="flex flex-wrap gap-3"><Button id={`${taskId}-generate`} disabled={locked || dirty || !ack || Boolean(active)} onClick={() => void generate()}>{t(pending === "generate" ? "busy" : "generate")}</Button><Button variant="ghost" disabled={Boolean(pending)} onClick={() => void operation("refresh", async () => { await refresh(); })}>{t("refresh")}</Button></div>
        </section>
      </div>
      <section id={`${taskId}-preview`} tabIndex={-1} className="min-w-0 space-y-5 xl:sticky xl:top-24" aria-label={t("preview")}>
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t("step3")}</h2><div className="flex gap-1"><Button variant={mobile ? "ghost" : "outline"} size="sm" aria-pressed={!mobile} onClick={() => setMobile(false)}><Monitor className="me-2 h-4 w-4" aria-hidden="true" />{t("desktop")}</Button><Button variant={mobile ? "outline" : "ghost"} size="sm" aria-pressed={mobile} onClick={() => setMobile(true)}><Smartphone className="me-2 h-4 w-4" aria-hidden="true" />{t("mobile")}</Button></div></div>
        <p className="text-xs text-muted-foreground">{version ? t("savedPreview", { version: version.version }) : t("livePreview")}</p>
        <div className="overflow-hidden rounded-3xl border bg-muted/40 p-2 sm:p-3">{html ? <iframe title={t("previewTitle")} sandbox="" srcDoc={html} className={`mx-auto h-[620px] w-full rounded-2xl bg-white ${mobile ? "max-w-[375px]" : ""}`} /> : <div className="flex min-h-80 items-center justify-center px-8 text-center text-sm leading-7 text-muted-foreground">{t("previewHint")}</div>}</div>
        {version ? <div className="space-y-4 rounded-3xl border bg-card p-5">
          <label className="block space-y-2"><span className="text-sm font-medium">{t("versions")}</span><select name="version" className="h-10 w-full rounded-md border bg-background px-3 text-sm" disabled={Boolean(pending) || Boolean(copy)} value={version.id} onChange={(event) => { setVersionId(event.target.value); setCopy(null); setEditingBase(null); }}>{state.versions.map((item) => <option key={item.id} value={item.id}>v{item.version} · {new Date(item.createdAt).toLocaleString(locale)}</option>)}</select></label>
          <p className="text-xs leading-6 text-muted-foreground">{t("review")}</p>
          {copy ? <div className="space-y-4"><label className="block space-y-2"><span className="text-sm">{t("summary")}</span><Textarea name="copy-summary" value={copy.summary} maxLength={3000} rows={4} disabled={locked} onChange={(event) => setCopy({ ...copy, summary: event.target.value })} /></label>{copy.projects.map((project, index) => <label key={index} className="block space-y-2"><span className="text-sm">{version.snapshot.input.projects[index].name}</span><Textarea name={`copy-project-${index}`} value={project.description} maxLength={2000} rows={3} disabled={locked} onChange={(event) => setCopy({ ...copy, projects: copy.projects.map((item, i) => i === index ? { description: event.target.value } : item) })} /></label>)}<div className="flex flex-wrap gap-2"><Button disabled={locked} onClick={() => void saveCopy()}>{t("saveCopy")}</Button>{editingBase && editingBase.expectedVersion !== state.versions[0]?.version && <Button variant="outline" disabled={locked} onClick={() => setEditingBase({ ...editingBase, expectedVersion: state.versions[0].version })}>{t("rebaseEdit")}</Button>}<Button variant="ghost" disabled={Boolean(pending)} onClick={() => { setCopy(null); setEditingBase(null); }}>{t("discardEdit")}</Button></div></div> : <Button variant="outline" disabled={locked} onClick={() => { setCopy(structuredClone(version.snapshot.copy)); setEditingBase({ id: version.id, expectedVersion: state.versions[0].version }); }}>{t("edit")}</Button>}
          <Button variant="outline" disabled={Boolean(pending) || Boolean(copy)} onClick={() => void download()}><Download className="me-2 h-4 w-4" aria-hidden="true" />{t("download")}</Button><p className="text-xs leading-6 text-muted-foreground">{t("downloadHelp")}</p>
        </div> : <p className="text-sm text-muted-foreground">{t("noVersions")}</p>}
      </section>
    </div>
  </div></div>;
}