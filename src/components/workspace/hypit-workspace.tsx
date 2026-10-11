"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { Check, Clapperboard, RefreshCw, Plus, FolderOpen, Save, Play, Download, SlidersHorizontal, ShieldCheck, FileCheck2, ArrowRight, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import styles from "./hypit-workspace.module.css";
import { useWorkspaceNavigation } from "@/components/providers/workspace-navigation";

const BASE = "/workflows/hypit";
const LOGIN = "/login?callbackUrl=%2Fworkflows%2Fhypit";
const formats = [
  { id: "chat", name: "chat", body: "chatBody", ready: true },
  { id: "ranking-football", name: "ranking", body: "rankingBody", ready: false },
  { id: "podcast", name: "podcast", body: "podcastBody", ready: false },
  { id: "interview", name: "interview", body: "interviewBody", ready: false },
] as const;
type Template = typeof formats[number]["id"];
type ProjectSummary = { id: string; title: string; template: Template; updatedAt: string };
type Project = ProjectSummary & {
  brief: string; revision: number; source: string; sourceHash: string;
  canRender: boolean; artifactAvailable: boolean;
  job: { status: "running" | "complete" | "failed"; output?: string } | null;
};
type Draft = { title: string; brief: string; source: string };

export function HypitWorkspace() {
  const t = useTranslations("product.hypit");
  const { data: session, status } = useSession();
  if (status === "loading") return <p role="status" className="text-sm text-muted-foreground">{t("loading")}</p>;
  if (!session?.user?.id) return <section className="ans-detail-block max-w-2xl">
    <h2 className="text-xl font-semibold">{t("loginTitle")}</h2>
    <p className="mt-3 text-sm leading-7 text-muted-foreground">{t("loginBody")}</p>
    <Button asChild className="mt-5"><Link href={LOGIN}>{t("login")}</Link></Button>
  </section>;
  if (session.user.role !== "ADMIN") return <p role="status" className="rounded-lg border p-5 text-sm text-muted-foreground">{t("restricted")}</p>;
  // Remount on identity changes so no old owner's project remains in the UI.
  return <InternalWorkspace key={session.user.id} userId={session.user.id} />;
}

function InternalWorkspace({ userId }: { userId: string }) {
  const t = useTranslations("product.hypit");
  const locale = useLocale();
  const { register } = useWorkspaceNavigation();
  const [template, setTemplate] = useState<Template>("chat");
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [showCreate, setShowCreate] = useState(true);
  const [listStatus, setListStatus] = useState<"loading" | "ready" | "error">("loading");
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [draft, setDraft] = useState<Draft>({ title: "", brief: "", source: "" });
  const [notice, setNotice] = useState({ text: t("connected"), error: false });
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("");
  const [studio, setStudio] = useState<{ id: string; url: string } | null>(null);
  const [renderingId, setRenderingId] = useState<string | null>(null);
  const [videoVersion, setVideoVersion] = useState(0);
  const mounted = useRef(true);
  const operation = useRef(false);
  const controllers = useRef(new Set<AbortController>());
  const studioPanel = useRef<HTMLElement>(null);
  const dirty = !!project && (draft.title !== project.title || draft.brief !== project.brief || draft.source !== project.source);

  const request = useCallback(async <T,>(path: string, method = "GET", data?: unknown): Promise<T> => {
    const controller = new AbortController();
    controllers.current.add(controller);
    try {
      const response = await fetch(BASE + "/api" + path, {
        method, signal: controller.signal, cache: "no-store",
        headers: { "X-ANS-Owner": userId, ...(data !== undefined ? { "Content-Type": "application/json" } : {}) },
        body: data !== undefined ? JSON.stringify(data) : undefined,
      });
      const value = await response.json();
      if (!mounted.current) throw new Error(t("stale"));
      if (!response.ok) throw new Error(value.error || t("requestFailed"));
      return value as T;
    } finally { controllers.current.delete(controller); }
  }, [t, userId]);

  const refresh = useCallback(async () => {
    setListStatus("loading");
    try {
      const result = await request<{ projects: ProjectSummary[] }>("/projects");
      if (mounted.current) { setProjects(result.projects); setListStatus("ready"); }
    } catch (error) { if (mounted.current) setListStatus("error"); throw error; }
  }, [request]);

  useEffect(() => {
    mounted.current = true;
    void refresh().catch(error => {
      if (mounted.current) setNotice({ text: error instanceof Error ? error.message : t("requestFailed"), error: true });
    });
    const pending = controllers.current;
    return () => { mounted.current = false; pending.forEach(controller => controller.abort()); pending.clear(); };
  }, [refresh, t]);

  useEffect(() => {
    if (!dirty && !studio) return;
    const confirmLeave = () => window.confirm(t(dirty ? "discard" : "studioLeave"));
    const unregister = register((proceed, cancel) => { if (confirmLeave()) proceed(); else cancel(); });
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);
    return () => { unregister(); window.removeEventListener("beforeunload", beforeUnload); };
  }, [dirty, studio, register, t]);

  useEffect(() => {
    if (!renderingId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const current = await request<Project>("/projects/" + renderingId);
        if (!active) return;
        if (current.job?.status === "running") { timer = setTimeout(poll, 4000); return; }
        setRenderingId(null);
        const complete = current.job?.status === "complete";
        setNotice({ text: t(complete ? "renderDone" : "renderFail"), error: !complete });
        setLog(current.job?.output || "");
        setProject(previous => previous?.id === current.id ? { ...previous, artifactAvailable: current.artifactAvailable, job: current.job } : previous);
        setVideoVersion(Date.now());
      } catch (error) {
        if (active && mounted.current) { setRenderingId(null); setNotice({ text: error instanceof Error ? error.message : t("requestFailed"), error: true }); }
      }
    };
    timer = setTimeout(poll, 2000);
    return () => { active = false; clearTimeout(timer); };
  }, [renderingId, request, t]);

  async function run(action: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true; setBusy(true);
    try { await action(); }
    catch (error) { if (mounted.current) setNotice({ text: error instanceof Error ? error.message : t("requestFailed"), error: true }); }
    finally { operation.current = false; if (mounted.current) setBusy(false); }
  }
  function receive(current: Project) {
    setShowCreate(false);
    setProject(current); setDraft({ title: current.title, brief: current.brief, source: current.source });
    setLog(current.job?.output || "");
    if (current.job?.status === "running") setRenderingId(current.id);
  }
  async function save(): Promise<Project> {
    if (!project) throw new Error(t("choose"));
    const current = await request<Project>("/projects/" + project.id, "PUT", {
      ...draft, revision: project.revision, expectedSourceHash: project.sourceHash,
    });
    setProject(current); setNotice({ text: t("saved"), error: false }); await refresh();
    return current;
  }
  async function closeStudio() {
    if (!studio) return;
    await request("/projects/" + studio.id + "/studio", "DELETE", {}); setStudio(null);
  }
  async function openProject(id: string) {
    if ((dirty || studio) && !window.confirm(t(dirty ? "discard" : "studioLeave"))) return;
    const current = await request<Project>("/projects/" + id);
    await closeStudio(); receive(current); setNotice({ text: t("workspace.projectOpened", { title: current.title }), error: false });
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      if ((dirty || studio) && !window.confirm(t(dirty ? "discard" : "studioLeave"))) return;
      const current = await request<Project>("/projects", "POST", { title: name, brief, template });
      await closeStudio(); receive(current); await refresh(); setNotice({ text: t("created"), error: false });
    });
  }
  async function inspect(action: "check" | "plan") {
    const current = await save();
    const result = await request<{ ok: boolean; output: string }>("/projects/" + current.id + "/" + action, "POST", {});
    setLog(result.output); setNotice({ text: t(action === "check" ? (result.ok ? "checkOk" : "checkFail") : (result.ok ? "planOk" : "planFail")), error: !result.ok });
  }
  async function openStudio() {
    const current = await save();
    if (studio && studio.id !== current.id) await closeStudio();
    const result = await request<{ url: string }>("/projects/" + current.id + "/studio", "POST", {});
    if (!result.url.startsWith(BASE + "/studio/" + current.id + "/")) throw new Error(t("requestFailed"));
    setStudio({ id: current.id, url: result.url }); setNotice({ text: t("studioOpened"), error: false });
  }
  useEffect(() => { if (studio) studioPanel.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }); }, [studio]);
  useEffect(() => { editorHeading.current?.focus({ preventScroll: true }); }, [project?.id]);
  const video = project?.artifactAvailable && !dirty && renderingId !== project.id;

  return <div className={styles.workspace}>
    <header className={styles.header}>
      <div><p className="ans-eyebrow">{t("workspace.eyebrow")}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{t("workspace.title")}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{t("workspace.subtitle")}</p></div>
      <Button variant={showCreate ? "secondary" : "outline"} disabled={busy} aria-expanded={showCreate} aria-controls="hypit-new-project" onClick={() => setShowCreate(value => !value)}><Plus aria-hidden="true" />{t("newProject")}</Button>
    </header>
    <p role={notice.error && !busy ? "alert" : "status"} aria-atomic="true" className={`${styles.notice} ${notice.error && !busy ? styles.error : ""}`}>
      {notice.error && !busy ? <CircleAlert aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}<span>{busy ? t("busy") : notice.text}</span>
    </p>
    <section id="hypit-new-project" hidden={!showCreate} className={styles.createPanel} aria-labelledby="hypit-create">
      <div className={styles.sectionHeading}><span className={styles.step}>01</span><div><h3 id="hypit-create" className="font-semibold">{t("newProject")}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{t("intro")}</p></div></div>
      <div className={styles.createGrid}>
        <fieldset className="min-w-0"><legend className="mb-3 text-sm font-medium">{t("formats")}</legend><div className={styles.formats}>
          {formats.map(format => <button key={format.id} type="button" disabled={busy} aria-pressed={template === format.id} onClick={() => setTemplate(format.id)} className={styles.format}>
            <span className="flex items-center justify-between gap-2 font-medium"><span>{t(`templates.${format.name}`)}</span>{template === format.id && <Check className="size-4 text-primary" aria-hidden="true" />}</span>
            <span className="mt-2 block text-xs leading-5 text-muted-foreground">{t(`templates.${format.body}`)}</span>
            <span className={styles.formatState}>{t(format.ready ? "ready" : "needsAssets")}</span>
          </button>)}
        </div></fieldset>
        <form className="min-w-0 space-y-4" onSubmit={create} aria-busy={busy}>
          <div className="space-y-2"><Label htmlFor="hypit-new-name">{t("name")}</Label><Input id="hypit-new-name" value={name} onChange={event => setName(event.target.value)} maxLength={100} placeholder={t("namePlaceholder")} required disabled={busy} /></div>
          <div className="space-y-2"><Label htmlFor="hypit-new-brief">{t("brief")}</Label><Textarea id="hypit-new-brief" value={brief} onChange={event => setBrief(event.target.value)} maxLength={12000} rows={4} placeholder={t("briefPlaceholder")} disabled={busy} /></div>
          <Button type="submit" disabled={busy || !name.trim()}>{busy ? t("busy") : t("create")}<ArrowRight aria-hidden="true" /></Button>
        </form>
      </div>
    </section>
    <div className={styles.workbench}>
      <aside className={styles.sidebar} aria-labelledby="hypit-projects" aria-busy={listStatus === "loading"}>
        <div className={styles.listHeading}><h3 id="hypit-projects" className="text-sm font-semibold">{t("projects")}</h3><Button variant="ghost" size="icon" disabled={busy} aria-label={t("refresh")} onClick={() => void run(refresh)}><RefreshCw aria-hidden="true" /></Button></div>
        {listStatus === "loading" && <p className={styles.listMessage}>{t("workspace.loadingProjects")}</p>}
        {listStatus === "error" && <p className={styles.listMessage}>{t("workspace.listError")}</p>}
        {listStatus === "ready" && !projects.length && <p className={styles.listMessage}>{t("empty")}</p>}
        <div className={styles.projectList}>{projects.map(item => <button key={item.id} type="button" disabled={busy} onClick={() => void run(() => openProject(item.id))} aria-pressed={project?.id === item.id} className={styles.projectItem}>
          <span className="flex items-start gap-2"><FolderOpen className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span className="min-w-0 break-words text-sm font-medium">{item.title}</span></span>
          <span className="mt-2 block text-xs text-muted-foreground">{t(`templates.${formats.find(format => format.id === item.template)?.name || "chat"}`)} · {new Date(item.updatedAt).toLocaleDateString(locale)}</span>
        </button>)}</div>
      </aside>
      <section className={styles.editor} aria-labelledby={project ? "hypit-editor-title" : "hypit-empty-title"} aria-busy={busy}>
        {!project ? <div className={styles.empty}>
          <Clapperboard className="size-8 text-primary" aria-hidden="true" /><h3 id="hypit-empty-title" className="text-lg font-semibold">{t("workspace.emptyTitle")}</h3><p className="max-w-sm text-sm leading-7 text-muted-foreground">{t("choose")}</p>
          {!showCreate && <Button variant="outline" onClick={() => setShowCreate(true)}><Plus aria-hidden="true" />{t("newProject")}</Button>}
        </div> : <>
          <div className={styles.editorHeader}>
            <div className="min-w-0"><p className="mb-2 text-xs text-muted-foreground">{t(`templates.${formats.find(format => format.id === project.template)?.name || "chat"}`)}</p><h3 ref={editorHeading} tabIndex={-1} id="hypit-editor-title" className="break-words text-lg font-semibold outline-none">{project.title}</h3></div>
            <div className={styles.metadata}><span>{t("revision", { revision: project.revision })}</span><span className={dirty ? "font-medium text-primary" : "text-muted-foreground"}>{dirty ? t("workspace.unsaved") : t("workspace.synced")}</span></div>
          </div>
          <div className={styles.editorGrid}>
            <div className={styles.editing}>
              <div className={styles.sectionHeading}><span className={styles.step}>02</span><h4 className="text-sm font-semibold">{t("workspace.editTitle")}</h4></div>
              <div className="space-y-2"><Label htmlFor="hypit-edit-title">{t("name")}</Label><Input id="hypit-edit-title" value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} maxLength={100} disabled={busy} /></div>
              <div className="space-y-2"><Label htmlFor="hypit-edit-brief">{t("brief")}</Label><Textarea id="hypit-edit-brief" aria-describedby="hypit-brief-help" value={draft.brief} onChange={event => setDraft({ ...draft, brief: event.target.value })} maxLength={12000} rows={6} disabled={busy} /><p id="hypit-brief-help" className="text-xs leading-6 text-muted-foreground">{t("workspace.briefHelp")}</p></div>
              <div className={styles.actions}>
                <Button disabled={busy || !draft.title.trim()} onClick={() => void run(async () => { await save(); })}><Save aria-hidden="true" />{t("save")}</Button>
                <Button variant="outline" disabled={busy || !draft.title.trim()} onClick={() => void run(() => inspect("check"))}><FileCheck2 aria-hidden="true" />{t("check")}</Button>
              </div>
              <details className={styles.disclosure}><summary><SlidersHorizontal className="size-4" aria-hidden="true" />{t("workspace.advanced")}</summary><div className="space-y-4 pb-4">
                <p className="text-xs leading-6 text-muted-foreground">{t("workspace.advancedHelp")}</p>
                <div className={styles.actions}><Button variant="outline" disabled={busy || !draft.title.trim()} onClick={() => void run(() => inspect("plan"))}>{t("plan")}</Button><Button variant="outline" disabled={busy || !draft.title.trim()} onClick={() => void run(async () => { const current = await save(); window.location.assign(BASE + "/api/projects/" + current.id + "/export"); })}><Download aria-hidden="true" />{t("export")}</Button><Button variant="ghost" disabled={busy} onClick={() => void run(() => openProject(project.id))}>{t("reload")}</Button></div>
                <Label htmlFor="hypit-source">{t("source")}</Label><Textarea id="hypit-source" aria-label={t("sourceLabel")} value={draft.source} onChange={event => setDraft({ ...draft, source: event.target.value })} maxLength={150000} spellCheck={false} disabled={busy} className="min-h-80 font-mono text-xs" />
              </div></details>
              {log && <details className={styles.disclosure} open><summary>{t("log")}</summary><pre className="mb-4 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-4 text-xs leading-6">{log}</pre></details>}
            </div>
            <aside className={styles.preview} aria-labelledby="hypit-preview-title">
              <div className={styles.sectionHeading}><span className={styles.step}>03</span><h4 id="hypit-preview-title" className="text-sm font-semibold">{t("workspace.previewTitle")}</h4></div>
              <div className={styles.screen}>
                {video ? <video key={`${project.id}-${videoVersion}`} aria-label={t("workspace.videoLabel")} controls preload="metadata" src={`${BASE}/api/projects/${project.id}/video?v=${videoVersion}`} /> : <div className={styles.screenEmpty}><Clapperboard className="size-7" aria-hidden="true" /><p className="text-sm font-medium">{t(renderingId === project.id ? "workspace.renderTitle" : dirty ? "workspace.draftTitle" : "workspace.previewEmpty")}</p><p className="text-xs leading-6">{t(renderingId === project.id ? "workspace.renderHelp" : dirty ? "workspace.draftHelp" : "workspace.previewHelp")}</p></div>}
              </div>
              <p id="hypit-render-help" className="text-xs leading-6 text-muted-foreground">{t(project.canRender ? "codeModel" : "channelPending")}</p>
              <div className={styles.previewActions}>
                <Button variant="outline" disabled={busy || !project.canRender || !draft.title.trim()} aria-describedby="hypit-render-help" onClick={() => void run(openStudio)}><Clapperboard aria-hidden="true" />{t("studio")}</Button>
                <Button disabled={busy || !!renderingId || !project.canRender || !draft.title.trim()} aria-describedby="hypit-render-help" onClick={() => void run(async () => { const current = await save(); await request("/projects/" + current.id + "/render", "POST", {}); setRenderingId(current.id); setNotice({ text: t("rendering"), error: false }); })}><Play aria-hidden="true" />{renderingId === project.id ? t("busy") : t("render")}</Button>
                {video && <Button asChild variant="outline"><a href={`${BASE}/api/projects/${project.id}/video?download=1`}><Download aria-hidden="true" />{t("download")}</a></Button>}
              </div>
              <p className="text-xs leading-6 text-muted-foreground">{t("workspace.autoSaveHelp")}</p>
            </aside>
          </div>
        </>}
      </section>
    </div>
    {studio && <section ref={studioPanel} className="scroll-mt-20" aria-labelledby="hypit-studio-heading"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground">POWERED BY HYPIT.AI</p><h2 id="hypit-studio-heading" className="mt-2 text-xl font-semibold">{t("studioTitle")}</h2></div><Button variant="outline" size="sm" disabled={busy} onClick={() => void run(async () => { if (window.confirm(t("studioLeave"))) await closeStudio(); })}>{t("closeStudio")}</Button></div><iframe src={studio.url} title={t("studioTitle")} className="h-[760px] w-full rounded-xl border bg-background" sandbox="allow-scripts allow-same-origin allow-forms allow-downloads" referrerPolicy="same-origin" /><p className="mt-3 text-xs leading-6 text-muted-foreground">{t("studioHint")}</p></section>}
  </div>;
}
