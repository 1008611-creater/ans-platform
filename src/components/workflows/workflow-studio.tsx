"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, Check, CheckCircle2, Clipboard, Download, FileOutput, Maximize2, Minimize2, Settings2, Workflow, XCircle } from "lucide-react";
import type { WorkflowDefinition } from "@/contracts/workflow";
import { workflowExperience } from "@/domain/workflows/experience";
import { extractInputVariables } from "@/domain/workflows/variables";
import { WorkflowRunForm, type WorkflowRunSnapshot } from "./workflow-run-form";
import { Button } from "@/components/ui/button";
import styles from "./workflow-studio.module.css";

export type WorkflowStudioProps = {
  slug: string;
  title: string;
  version: number;
  definition: WorkflowDefinition;
  estimatedCost: number | null;
  authenticated: boolean;
  credentials?: { id: string; label: string; keyMasked: string }[];
};
const initialSnapshot: WorkflowRunSnapshot = { busy: false, status: "IDLE", error: "", output: null, nodeRuns: [], runId: null };

/** Shared runtime shell. The existing execution form owns requests and billing. */
export function WorkflowStudio(props: WorkflowStudioProps) {
  const t = useTranslations("workflowStudio");
  const experience = workflowExperience(props.definition);
  const variables = extractInputVariables(props.definition);
  const [snapshot, setSnapshot] = useState<WorkflowRunSnapshot>(initialSnapshot);
  const [view, setView] = useState<"result" | "process">("result");
  const [rendered, setRendered] = useState(true);
  const [width, setWidth] = useState<"desktop" | "mobile">("desktop");
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState("");
  const shell = useRef<HTMLElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completed = snapshot.nodeRuns.filter(node => node.status === "SUCCEEDED").length;
  const stageState = (nodeIds: string[]) => {
    const runs = nodeIds.map(id => snapshot.nodeRuns.find(node => node.nodeId === id));
    if (runs.some(node => node?.status === "FAILED" || node?.status === "CANCELLED")) return "failed";
    if (runs.every(node => node?.status === "SUCCEEDED")) return "succeeded";
    if (runs.some(node => node?.status === "RUNNING")) return "running";
    return "pending";
  };
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
  useEffect(() => {
    const change = () => setExpanded(document.fullscreenElement === shell.current);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  async function toggleExpanded() {
    setActionError("");
    try {
      if (document.fullscreenElement === shell.current) await document.exitFullscreen();
      else if (shell.current?.requestFullscreen) await shell.current.requestFullscreen();
      else shell.current?.scrollIntoView({ behavior: "auto", block: "start" });
    } catch { setActionError(t("expandFailed")); }
  }
  async function copy() {
    if (snapshot.output === null) return;
    try {
      await navigator.clipboard.writeText(snapshot.output);
      setCopied(true); setActionError("");
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1800);
    } catch { setActionError(t("copyFailed")); }
  }
  function download() {
    if (snapshot.output === null) return;
    const format = experience.output.format;
    const extension = format === "markdown" ? "md" : format === "json" ? "json" : "txt";
    const mime = format === "json" ? "application/json" : "text/plain";
    let content = snapshot.output;
    if (format === "json") {
      try { content = JSON.stringify(JSON.parse(content), null, 2); }
      catch { setActionError(t("invalidJsonExport")); return; }
    }
    const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
    const link = document.createElement("a");
    link.href = url; link.download = `${props.slug}-v${props.version}.${extension}`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setActionError("");
  }
  const statusKey = snapshot.busy && snapshot.status === "IDLE" ? "PREPARING" : snapshot.status;
  const hasOutput = snapshot.output !== null;
  return <section id="workflow-studio" ref={shell} className={`${styles.studio} ${expanded ? styles.expanded : ""}`} aria-label={t("title")}>
    <header className={styles.toolbar}>
      <div className={styles.identity}><Workflow size={18} aria-hidden="true" /><div><strong>{props.title}</strong><span>v{props.version} · {t("title")}</span></div></div>
      <div className={styles.toolbarActions}>
        <span className={styles.status} role="status"><span data-busy={snapshot.busy || undefined} className={styles.statusDot} />{t(`runStates.${statusKey}`)}</span>
        <Button size="sm" variant="ghost" onClick={toggleExpanded} aria-label={t(expanded ? "collapse" : "expand")} title={t(expanded ? "collapse" : "expand")}>{expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</Button>
      </div>
    </header>
    <div className={styles.body}>
      <aside className={styles.inputs}>
        <div className={styles.panelHeading}><span className={styles.index}>01</span><h2><Settings2 size={15} aria-hidden="true" />{t("prepare")}</h2></div>
        {props.authenticated ? <WorkflowRunForm slug={props.slug} variables={variables} estimatedCost={props.estimatedCost} credentials={props.credentials} embedded onStateChange={setSnapshot} /> : <>
          <p className={styles.hint}>{t("guestPreparation")}</p>
          {variables.length ? <dl className={styles.guestInputs}>{variables.map(variable => <div key={variable.key}><dt>{variable.label}<span>{t(variable.required ? "required" : "optional")}</span></dt><dd>{variable.hint ?? t("inputHint")}</dd></div>)}</dl> : <p className={styles.hint}>{t("noInputs")}</p>}
          <Button asChild className="w-full"><Link href={`/login?callbackUrl=${encodeURIComponent(`/workflows/mine/${props.slug}`)}`}>{t("login")}<ArrowRight size={15} /></Link></Button>
        </>}
        <p className={styles.privacy}>{t("privacy")}</p>
        {snapshot.runId && <Link className={styles.recordLink} href="/workflows/runs">{t("records")}<ArrowRight size={13} aria-hidden="true" /></Link>}
      </aside>
      <div className={styles.canvas}>
        <nav className={styles.canvasBar} aria-label={t("views")}>
          <div role="group" aria-label={t("views")} className={styles.tabs}>
            <button type="button" onClick={() => setView("result")} aria-pressed={view === "result"}>{t("result")}</button>
            <button type="button" onClick={() => setView("process")} aria-pressed={view === "process"}>{t("process")}<span>{props.definition.nodes.length}</span></button>
          </div>
          <div className={styles.canvasActions}>
            {view === "result" && hasOutput && <>
              {experience.output.format === "markdown" && <button type="button" onClick={() => setRendered(!rendered)}>{t(rendered ? "source" : "preview")}</button>}
              <button type="button" onClick={() => setWidth(width === "desktop" ? "mobile" : "desktop")}>{t(width === "desktop" ? "narrow" : "wide")}</button>
              <button type="button" onClick={copy} aria-label={t("copy")} title={t("copy")}>{copied ? <Check size={16} /> : <Clipboard size={16} />}</button>
              <button type="button" onClick={download} aria-label={t("download")} title={t("download")}><Download size={16} /></button>
            </>}
          </div>
        </nav>
        <div className={styles.viewport}>
          {view === "result" ? hasOutput ? <div className={`${styles.document} ${width === "mobile" ? styles.narrow : ""}`}>
            <div className={styles.documentHeader}><FileOutput size={17} aria-hidden="true" /><span>{experience.output.label}</span><span className={styles.documentVersion}>v{props.version}</span></div>
            <div className={styles.documentContent}>
              {experience.output.format === "markdown" && rendered ? <Markdown skipHtml remarkPlugins={[remarkGfm]} components={{ img: ({ alt }) => <span className={styles.imagePlaceholder}>{alt || t("externalImage")}</span>, a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}>{snapshot.output || t("emptyOutput")}</Markdown> : <pre>{snapshot.output || t("emptyOutput")}</pre>}
            </div>
          </div> : <div className={styles.empty}>
            <div className={styles.emptyArtwork} aria-hidden="true"><FileOutput size={34} /><span /><span /></div>
            <p className={styles.outputLabel}>{experience.output.label}</p>
            <h3>{t(snapshot.busy ? "workingTitle" : snapshot.error ? "failedTitle" : "emptyTitle")}</h3>
            <p>{t(snapshot.busy ? "workingBody" : snapshot.error ? "failedBody" : "emptyBody")}</p>
            <div className={styles.inputOutput}><span>{t("yourMaterials")}</span><ArrowRight size={15} aria-hidden="true" /><span>{experience.stages.length} {t("stages")}</span><ArrowRight size={15} aria-hidden="true" /><strong>{experience.output.label}</strong></div>
            <button type="button" className={styles.textAction} onClick={() => setView("process")}>{t("inspectSteps")}<ArrowRight size={14} aria-hidden="true" /></button>
          </div> : <div className={styles.process}>
            <div className={styles.processHeading}><div><p>{t("processEyebrow")}</p><h3>{t("processTitle")}</h3></div><span>{snapshot.runId ? t("completedNodes", { count: completed, total: props.definition.nodes.length }) : t("notRun")}</span></div>
            <ol className={styles.stageList}>{experience.stages.map((stage, index) => {
              const state = stageState(stage.nodeIds);
              return <li key={stage.id} data-state={state}><span className={styles.stageMarker}>{state === "succeeded" ? <CheckCircle2 size={19} /> : state === "failed" ? <XCircle size={19} /> : String(index + 1).padStart(2, "0")}</span><div className={styles.stageContent}><div className={styles.stageHeading}><h4>{stage.title}</h4><span>{t(`stageStates.${state}`)}</span></div>{stage.description && <p>{stage.description}</p>}<ul>{stage.nodeIds.map(id => {
                const node = props.definition.nodes.find(node => node.id === id)!;
                const record = snapshot.nodeRuns.find(item => item.nodeId === id);
                const inputs = props.definition.edges.filter(edge => edge.to === id).map(edge => props.definition.nodes.find(item => item.id === edge.from)?.label ?? edge.from);
                return <li key={id}><div><span>{node.label}</span><span className={styles.nodeType}>{t(`nodeTypes.${node.type}`)}</span></div><p>{inputs.length ? t("receives", { labels: inputs.join(" / ") }) : t("receivesInput")}</p>{record && <p className={styles.nodeRecord}>{t("attempts", { count: record.attempts })}{record.error && <span>{record.error}</span>}</p>}</li>;
              })}</ul></div></li>;
            })}</ol>
          </div>}
        </div>
        <footer className={styles.canvasFooter}><span><FileOutput size={13} aria-hidden="true" />{experience.output.label}</span><span>{t(hasOutput ? "realOutput" : "noExample")}</span></footer>
      </div>
    </div>
    {actionError && <p role="alert" className={styles.actionError}>{actionError}</p>}
    {copied && <span role="status" className="sr-only">{t("copied")}</span>}
  </section>;
}
