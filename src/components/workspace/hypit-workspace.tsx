"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { Check, Clapperboard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    const result = await request<{ projects: ProjectSummary[] }>("/projects");
    if (mounted.current) setProjects(result.projects);
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
    await closeStudio(); receive(current);
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
  const video = project?.artifactAvailable && !dirty && renderingId !== project.id;

  return <div className="space-y-9">
    <p role={notice.error ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm leading-6 ${notice.error ? "border-destructive/40 text-destructive" : "bg-muted/40 text-muted-foreground"}`}>{notice.text}</p>
    <section aria-labelledby="hypit-formats">
      <h2 id="hypit-formats" className="text-xl font-semibold">{t("formats")}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {formats.map(format => <button key={format.id} type="button" disabled={busy} aria-pressed={template === format.id} onClick={() => setTemplate(format.id)} className={`rounded-xl border p-5 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${template === format.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
          <span className="flex items-center justify-between gap-3 font-semibold"><span>{t(`templates.${format.name}`)}</span>{template === format.id && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}</span>
          <span className="mt-2 block text-sm leading-6 text-muted-foreground">{t(`templates.${format.body}`)}</span>
          <span className="mt-3 block text-xs text-muted-foreground">{t(format.ready ? "ready" : "needsAssets")}</span>
        </button>)}
      </div>
    </section>
    <section className="grid gap-6 border-t pt-8 lg:grid-cols-[1fr_1.5fr]" aria-labelledby="hypit-create">
      <div><h2 id="hypit-create" className="text-xl font-semibold">{t("newProject")}</h2><p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">{t("intro")}</p><p className="mt-3 text-sm font-medium text-primary">{t(`templates.${formats.find(format => format.id === template)!.name}`)}</p></div>
      <form className="space-y-4" onSubmit={create}>
        <div className="space-y-2"><Label htmlFor="hypit-new-name">{t("name")}</Label><Input id="hypit-new-name" value={name} onChange={event => setName(event.target.value)} maxLength={100} placeholder={t("namePlaceholder")} required disabled={busy} /></div>
        <div className="space-y-2"><Label htmlFor="hypit-new-brief">{t("brief")}</Label><Textarea id="hypit-new-brief" value={brief} onChange={event => setBrief(event.target.value)} maxLength={12000} rows={3} placeholder={t("briefPlaceholder")} disabled={busy} /></div>
        <Button type="submit" disabled={busy || !name.trim()}>{busy ? t("busy") : t("create")}</Button>
      </form>
    </section>
    <section aria-labelledby="hypit-projects" className="border-t pt-8">
      <div className="mb-5 flex items-center justify-between gap-4"><h2 id="hypit-projects" className="text-xl font-semibold">{t("projects")}</h2><Button variant="outline" size="sm" disabled={busy} onClick={() => void run(refresh)}><RefreshCw className="me-2 h-4 w-4" aria-hidden="true" />{t("refresh")}</Button></div>
      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-2">{!projects.length && <p className="text-sm leading-7 text-muted-foreground">{t("empty")}</p>}{projects.map(item => <button key={item.id} type="button" disabled={busy} onClick={() => void run(() => openProject(item.id))} aria-pressed={project?.id === item.id} className={`block w-full rounded-lg p-3 text-start transition-colors ${project?.id === item.id ? "bg-primary/10" : "hover:bg-muted"}`}><span className="block break-words text-sm font-medium">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{new Date(item.updatedAt).toLocaleDateString(locale)}</span></button>)}</aside>
        <div className="min-w-0 rounded-xl border p-5 sm:p-6">
          {!project ? <div className="flex gap-3 py-6 text-sm text-muted-foreground"><Clapperboard className="h-5 w-5 shrink-0" aria-hidden="true" />{t("choose")}</div> : <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="break-words text-lg font-semibold">{project.title}</h3><span className="text-xs text-muted-foreground">{t("revision", { revision: project.revision })}</span></div>
            <div className="space-y-2"><Label htmlFor="hypit-edit-title">{t("name")}</Label><Input id="hypit-edit-title" value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} maxLength={100} disabled={busy} /></div>
            <div className="space-y-2"><Label htmlFor="hypit-edit-brief">{t("brief")}</Label><Textarea id="hypit-edit-brief" value={draft.brief} onChange={event => setDraft({ ...draft, brief: event.target.value })} maxLength={12000} rows={3} disabled={busy} /></div>
            <p className="text-xs text-muted-foreground">{t(project.canRender ? "codeModel" : "channelsNote")}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy || !draft.title.trim()} onClick={() => void run(async () => { await save(); })}>{t("save")}</Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(() => inspect("check"))}>{t("check")}</Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(() => inspect("plan"))}>{t("plan")}</Button>
              <Button variant="outline" size="sm" disabled={busy || !project.canRender} onClick={() => void run(openStudio)}>{t("studio")}</Button>
              <Button variant="outline" size="sm" disabled={busy || !!renderingId || !project.canRender} onClick={() => void run(async () => { const current = await save(); await request("/projects/" + current.id + "/render", "POST", {}); setRenderingId(current.id); setNotice({ text: t("rendering"), error: false }); })}>{renderingId === project.id ? t("busy") : t("render")}</Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(async () => { const current = await save(); window.location.assign(BASE + "/api/projects/" + current.id + "/export"); })}>{t("export")}</Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run(() => openProject(project.id))}>{t("reload")}</Button>
            </div>
            {!project.canRender && <p className="text-sm leading-7 text-muted-foreground">{t("channelPending")}</p>}
            <details><summary className="cursor-pointer py-3 text-sm font-medium">{t("source")}</summary><Textarea aria-label={t("sourceLabel")} value={draft.source} onChange={event => setDraft({ ...draft, source: event.target.value })} maxLength={150000} spellCheck={false} disabled={busy} className="min-h-80 font-mono text-xs" /></details>
            {log && <details><summary className="cursor-pointer py-2 text-sm font-medium">{t("log")}</summary><pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-4 text-xs leading-6">{log}</pre></details>}
            {video && <div className="space-y-3 border-t pt-5"><video key={`${project.id}-${videoVersion}`} controls preload="metadata" className="max-h-[520px] max-w-full rounded-lg" src={`${BASE}/api/projects/${project.id}/video?v=${videoVersion}`} /><Button asChild variant="outline" size="sm"><a href={`${BASE}/api/projects/${project.id}/video?download=1`}>{t("download")}</a></Button></div>}
          </div>}
        </div>
      </div>
    </section>
    {studio && <section ref={studioPanel} className="scroll-mt-20" aria-labelledby="hypit-studio-heading"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground">POWERED BY HYPIT.AI</p><h2 id="hypit-studio-heading" className="mt-2 text-xl font-semibold">{t("studioTitle")}</h2></div><Button variant="outline" size="sm" disabled={busy} onClick={() => void run(async () => { if (window.confirm(t("studioLeave"))) await closeStudio(); })}>{t("closeStudio")}</Button></div><iframe src={studio.url} title={t("studioTitle")} className="h-[760px] w-full rounded-xl border bg-background" sandbox="allow-scripts allow-same-origin allow-forms allow-downloads" referrerPolicy="same-origin" /><p className="mt-3 text-xs leading-6 text-muted-foreground">{t("studioHint")}</p></section>}
  </div>;
}
