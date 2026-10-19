"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight, Braces, CheckCircle2, FileOutput, GitBranch, Layers3, Loader2, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { z } from "zod";
import { workflowDefinitionSchema, workflowNodeSchema, workflowExperienceSchema, type WorkflowExperience, type WorkflowNode } from "@/contracts/workflow";
import { workflowExperience } from "@/domain/workflows/experience";
import { validateWorkflow } from "@/domain/workflows/graph";
import { RESUME_WORKFLOW_DEFINITION } from "@/domain/workflows/recipes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useWorkspaceNavigation } from "@/components/providers/workspace-navigation";

export type WorkflowEditorMeta = { slug: string; title: string; summary: string; description: string; estimatedCost: number };
export type WorkflowSourceProject = { slug: string; title: string; inputs: string | string[]; output: string; sourceUrl?: string };
export const SAMPLE_WORKFLOW = {
  version: 1, maxNodes: 20,
  nodes: [
    { id: "draft", type: "model", label: "生成初稿", config: { prompt: "请根据用户的真实要求生成初稿：{{input.topic}}", variables: [{ key: "topic", label: "创作要求", required: true, hint: "填写目标、素材和约束" }] }, timeoutMs: 60000, maxRetries: 1 },
    { id: "polish", type: "model", label: "整理成稿", config: { prompt: "请把下面的内容整理得更清晰、有条理，不添加未经提供的事实：\n\n{{draft}}" }, timeoutMs: 60000, maxRetries: 1 },
    { id: "result", type: "output", label: "最终文稿", config: {}, timeoutMs: 1000, maxRetries: 0 },
  ],
  edges: [{ id: "draft-to-polish", from: "draft", to: "polish", mapping: {} }, { id: "polish-to-result", from: "polish", to: "result", mapping: {} }],
};
// Empty labels are legitimate intermediate edits, but server validation remains strict.
const editorViewSchema = workflowDefinitionSchema.extend({
  nodes: z.array(workflowNodeSchema.extend({ label: z.string().max(120) })).min(1).max(50),
  experience: workflowExperienceSchema.extend({
    output: workflowExperienceSchema.shape.output.extend({ label: z.string().max(120) }),
    stages: z.array(workflowExperienceSchema.shape.stages.element.extend({ title: z.string().max(120) })).min(1).max(50),
  }).optional(),
});
type ValidationIssue = { code?: string; message: string; path?: string | (string | number)[] };
type VariableRecord = Record<string, unknown>;
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function definedVariables(node: WorkflowNode): VariableRecord[] { return Array.isArray(node.config.variables) ? node.config.variables.filter(isRecord) : []; }
function uniqueId(prefix: string, existing: string[]) { let index = 1; while (existing.includes(`${prefix}${index}`)) index++; return `${prefix}${index}`; }

export function WorkflowEditor({ mode, initialMeta, initialDefinition, initialVersion, sourceProject }: {
  mode: "create" | "version"; initialMeta?: Partial<WorkflowEditorMeta>; initialDefinition?: unknown; initialVersion?: number; sourceProject?: WorkflowSourceProject;
}) {
  const t = useTranslations("workflowAuthor");
  const recipeT = useTranslations("marketWorkflow");
  const router = useRouter();
  const { register } = useWorkspaceNavigation();
  const [meta, setMeta] = useState<WorkflowEditorMeta>({ slug: initialMeta?.slug ?? "", title: initialMeta?.title ?? sourceProject?.title ?? "", summary: initialMeta?.summary ?? "", description: initialMeta?.description ?? "", estimatedCost: initialMeta?.estimatedCost ?? 1 });
  const [text, setText] = useState(() => {
    const seed = initialDefinition ?? SAMPLE_WORKFLOW;
    if (!initialDefinition && sourceProject) {
      const definition = workflowDefinitionSchema.parse(seed);
      return JSON.stringify({ ...definition, experience: { ...workflowExperience(definition), output: { label: sourceProject.output.slice(0, 120) || sourceProject.title, format: "markdown" }, sourceProjectSlug: sourceProject.slug } }, null, 2);
    }
    return JSON.stringify(seed, null, 2);
  });
  const [tab, setTab] = useState<"visual" | "json">("visual");
  const [selectedId, setSelectedId] = useState("draft");
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const leaveApproved = useRef(false);
  const revision = useRef(0);
  const alive = useRef(true);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    alive.current = true;
    function beforeUnload(event: BeforeUnloadEvent) { if (dirtyRef.current) { event.preventDefault(); event.returnValue = ""; } }
    function beforeLink(event: MouseEvent) {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.href === window.location.href || (url.pathname === window.location.pathname && url.search === window.location.search && url.hash)) return;
      if (!window.confirm(t("leaveConfirm"))) { event.preventDefault(); event.stopPropagation(); } else { leaveApproved.current = true; queueMicrotask(() => { leaveApproved.current = false; }); }
    }
    const unregister = register((proceed, cancel) => {
      if (!dirtyRef.current || leaveApproved.current || window.confirm(t("leaveConfirm"))) proceed();
      else cancel();
    });
    window.addEventListener("beforeunload", beforeUnload); document.addEventListener("click", beforeLink, true);
    return () => { alive.current = false; request.current?.abort(); unregister(); window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", beforeLink, true); };
  }, [t, register]);
  const parsed = useMemo(() => {
    try { const raw: unknown = JSON.parse(text); const result = editorViewSchema.safeParse(raw); return { raw, definition: result.success ? result.data : null, parseError: "", schemaIssues: result.success ? [] : result.error.issues }; }
    catch (cause) { return { raw: null, definition: null, parseError: cause instanceof Error ? cause.message : t("invalidJson"), schemaIssues: [] }; }
  }, [text, t]);
  const definition = parsed.definition;
  const graph = useMemo(() => definition ? validateWorkflow(definition) : null, [definition]);
  const experience = useMemo(() => definition && graph?.ok ? workflowExperience(definition) : null, [definition, graph]);
  const selected = definition?.nodes.find(node => node.id === selectedId) ?? definition?.nodes[0];
  const recipeLocked = !!definition?.recipe;
  const displayNodes = graph?.ok ? graph.executionOrder.map(id => definition!.nodes.find(node => node.id === id)!) : definition?.nodes ?? [];
  function invalidate() { revision.current++; dirtyRef.current = true; setDirty(true); setChecked(false); setIssues([]); setOrder([]); setMessage(""); setError(""); }
  function updateText(next: string) { invalidate(); setText(next); }
  function changeMeta(key: keyof WorkflowEditorMeta, value: string | number) { invalidate(); setMeta(prev => ({ ...prev, [key]: value })); }
  // Mutate the original object so advanced config, branches and unknown fields survive visual editing.
  function mutate(mutator: (raw: Record<string, unknown>) => Record<string, unknown>) {
    if (!definition || !isRecord(parsed.raw) || recipeLocked) return;
    updateText(JSON.stringify(mutator(parsed.raw), null, 2));
  }
  function updateNode(id: string, patch: Partial<WorkflowNode>) {
    mutate(raw => ({ ...raw, nodes: (raw.nodes as Record<string, unknown>[]).map(node => node.id === id ? { ...node, ...patch, ...(patch.config ? { config: { ...(isRecord(node.config) ? node.config : {}), ...patch.config } } : {}) } : node) }));
  }
  function updateExperience(patch: Partial<WorkflowExperience>) { if (experience) mutate(raw => ({ ...raw, experience: { ...experience, ...patch } })); }
  function updateVariable(index: number, patch: VariableRecord) {
    if (!selected) return;
    const original = Array.isArray(selected.config.variables) ? selected.config.variables : [];
    const positions = original.flatMap((value, i) => isRecord(value) ? [i] : []);
    updateNode(selected.id, { config: { variables: original.map((value, i) => i === positions[index] && isRecord(value) ? { ...value, ...patch } : value) } });
  }
  function addVariable() {
    if (!selected) return;
    const variables = Array.isArray(selected.config.variables) ? selected.config.variables : [];
    const allKeys = definition!.nodes.flatMap(node => definedVariables(node).map(variable => String(variable.key)));
    updateNode(selected.id, { config: { variables: [...variables, { key: uniqueId("input", allKeys), label: t("newInput"), required: true }] } });
  }
  function deleteVariable(index: number) {
    if (!selected) return;
    const original = Array.isArray(selected.config.variables) ? selected.config.variables : [];
    const positions = original.flatMap((value, i) => isRecord(value) ? [i] : []);
    const key = String(definedVariables(selected)[index].key ?? "");
    if (definition!.nodes.some(node => [node.config.prompt, node.config.template, node.config.value].some(value => typeof value === "string" && [...value.matchAll(/\{\{\s*input\.([a-zA-Z][a-zA-Z0-9_-]*)/g)].some(match => match[1] === key)))) { setError(t("removeInputReference")); return; }
    updateNode(selected.id, { config: { variables: original.filter((_, i) => i !== positions[index]) } });
  }
  function addModel() {
    if (!definition || !experience || recipeLocked) return;
    const target = [...displayNodes].reverse().find(node => node.type === "output");
    const incoming = definition.edges.filter(edge => edge.to === target?.id);
    if (!target || incoming.length !== 1 || Object.keys(incoming[0].mapping).length || definition.nodes.length >= definition.maxNodes || definition.nodes.length >= 50) { setError(t("advancedInsertion")); return; }
    const id = uniqueId("step", definition.nodes.map(node => node.id));
    const edgeId = uniqueId("connection", definition.edges.map(edge => edge.id));
    const existing = incoming[0];
    const model = { id, type: "model", label: t("newStep"), config: { prompt: `${t("newPrompt")}\n\n{{${existing.from}}}` }, timeoutMs: 60000, maxRetries: 1 };
    const targetIndex = experience.stages.findIndex(stage => stage.nodeIds.includes(target.id));
    const sourceIndex = experience.stages.findIndex(stage => stage.nodeIds.includes(existing.from));
    if (targetIndex <= sourceIndex) { setError(t("advancedInsertion")); return; }
    const stages = [...experience.stages]; stages.splice(targetIndex, 0, { id: uniqueId("stage", stages.map(stage => stage.id)), title: model.label, nodeIds: [id] });
    mutate(raw => ({ ...raw, nodes: [...(raw.nodes as unknown[]), model], edges: [...(raw.edges as Record<string, unknown>[]).map(edge => edge.id === existing.id ? { ...edge, from: id } : edge), { id: edgeId, from: existing.from, to: id, mapping: {} }], experience: { ...experience, stages } }));
    setSelectedId(id);
  }
  function deleteNode() {
    if (!selected || !definition || !experience || recipeLocked) return;
    const incoming = definition.edges.filter(edge => edge.to === selected.id), outgoing = definition.edges.filter(edge => edge.from === selected.id);
    const references = definition.nodes.some(node => node.id !== selected.id && new RegExp(`\\{\\{\\s*${selected.id}(?:[.\\s}]|$)`).test(JSON.stringify(node.config)));
    if (selected.type === "output" || definition.nodes.length <= 1 || references || incoming.length > 1 || outgoing.length > 1 || [...incoming, ...outgoing].some(edge => Object.keys(edge.mapping).length)) { setError(t("advancedRemoval")); return; }
    const edges = (parsed.raw as Record<string, unknown>).edges as Record<string, unknown>[];
    const connected = incoming.length === 1 && outgoing.length === 1 ? { ...edges.find(edge => edge.id === outgoing[0].id), from: incoming[0].from } : null;
    const stages = experience.stages.map(stage => ({ ...stage, nodeIds: stage.nodeIds.filter(id => id !== selected.id) })).filter(stage => stage.nodeIds.length);
    mutate(raw => ({ ...raw, nodes: (raw.nodes as Record<string, unknown>[]).filter(node => node.id !== selected.id), edges: [...edges.filter(edge => edge.from !== selected.id && edge.to !== selected.id), ...(connected ? [connected] : [])], experience: { ...experience, stages } }));
    setSelectedId(definition.nodes.find(node => node.id !== selected.id)!.id);
  }
  async function check(snapshot: unknown, signal: AbortSignal): Promise<boolean> {
    const response = await fetch("/api/workflows/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snapshot), signal });
    const body = await response.json().catch(() => null);
    if (!alive.current) return false;
    if (!response.ok) { setIssues(Array.isArray(body?.error?.details) ? body.error.details : []); setOrder([]); setChecked(false); setError(body?.error?.message ?? t("validationFailed")); return false; }
    setIssues([]); setOrder(Array.isArray(body?.data?.order) ? body.data.order : []); setChecked(true); return true;
  }
  async function perform(save: boolean) {
    if (busy || request.current) return;
    const currentRevision = revision.current, snapshot = parsed.raw;
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setMessage(""); setError(""); setChecked(false);
    try {
      if (snapshot === null) throw new Error(t("invalidJson"));
      if (definition) {
        for (const node of definition.nodes) {
          const seen = new Set<string>();
          for (const variable of definedVariables(node)) {
            const key = typeof variable.key === "string" ? variable.key : "";
            if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(key) || seen.has(key) || (variable.label !== undefined && (typeof variable.label !== "string" || !variable.label.trim() || variable.label.length > 120)) || (variable.hint !== undefined && (typeof variable.hint !== "string" || variable.hint.length > 240))) throw new Error(t("invalidInput", { node: node.label }));
            seen.add(key);
          }
        }
      }
      const valid = await check(snapshot, controller.signal);
      if (!valid || !alive.current || currentRevision !== revision.current) return;
      if (!save) { setMessage(t("validated")); return; }
      const response = await fetch(mode === "create" ? "/api/workflows" : `/api/workflows/${initialMeta?.slug}/versions`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify(mode === "create" ? { slug: meta.slug.trim(), title: meta.title.trim(), summary: meta.summary.trim() || undefined, description: meta.description.trim() || undefined, estimatedCost: Number(meta.estimatedCost) || 1, definition: snapshot } : { definition: snapshot }) });
      const body = await response.json().catch(() => null);
      if (!alive.current) return;
      if (!response.ok) throw new Error(body?.error?.message ?? t("saveFailed"));
      dirtyRef.current = false; setDirty(false);
      if (mode === "create") router.push(`/workflows/mine/${body?.data?.workflow?.slug ?? meta.slug.trim()}`);
      else { setMessage(t("savedVersion", { version: body?.data?.version?.version ?? "" })); router.refresh(); }
    } catch (cause) { if (alive.current && !(cause instanceof DOMException && cause.name === "AbortError")) setError(cause instanceof Error ? cause.message : t("saveFailed")); }
    finally { request.current = null; if (alive.current) setBusy(false); }
  }
  function inputReferenced(key: string) {
    return !!definition?.nodes.some(node => [node.config.prompt, node.config.template, node.config.value].some(value => typeof value === "string" && [...value.matchAll(/\{\{\s*input\.([a-zA-Z][a-zA-Z0-9_-]*)/g)].some(match => match[1] === key)));
  }
  const variables = selected ? definedVariables(selected) : [];
  const promptField = selected && typeof selected.config.prompt === "string" ? "prompt" : selected?.type === "template" ? "template" : "prompt";
  const stage = experience?.stages.find(item => item.nodeIds.includes(selected?.id ?? ""));
  return (
    <div className="overflow-hidden rounded-2xl border bg-background">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4 sm:px-7">
        <div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{t("studio")}</p><h2 className="mt-1 text-xl font-semibold tracking-tight">{meta.title || t("untitled")}</h2><p className="mt-1 text-xs text-muted-foreground">{mode === "version" ? t("nextVersion", { version: (initialVersion ?? 0) + 1 }) : t("privateDraft")} · {dirty ? t("unsaved") : t("ready")}</p></div>
        <div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={busy} onClick={() => void perform(false)}><ShieldCheck className="size-4" />{t("validate")}</Button><Button size="sm" disabled={busy} onClick={() => void perform(true)}>{busy ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Save className="size-4" />}{mode === "create" ? t("create") : t("save")}</Button></div>
      </header>
      {sourceProject && <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-5 py-4 sm:px-7"><div className="max-w-[70ch]"><p className="text-sm font-medium">{t("source", { title: sourceProject.title })}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{t("sourceNotice")}</p>{sourceProject.inputs.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{t("sourceInputs")} {(Array.isArray(sourceProject.inputs) ? sourceProject.inputs : [sourceProject.inputs]).join(" · ")}</p>}</div><Link className="text-xs font-medium text-primary underline-offset-4 hover:underline" href={`/explore/${sourceProject.slug}`} target="_blank">{t("viewProject")} <span aria-hidden="true">↗</span></Link></div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 sm:px-7"><div className="flex gap-1" role="group" aria-label={t("editorMode")}><Button size="sm" variant={tab === "visual" ? "secondary" : "ghost"} aria-pressed={tab === "visual"} onClick={() => setTab("visual")}><Layers3 className="size-4" />{t("visual")}</Button><Button size="sm" variant={tab === "json" ? "secondary" : "ghost"} aria-pressed={tab === "json"} onClick={() => setTab("json")}><Braces className="size-4" />{t("advanced")}</Button></div><p className="text-xs text-muted-foreground">{t("realExecution")}</p></div>
      <fieldset disabled={busy} className="min-w-0">
      {mode === "create" && <details className="border-b px-5 py-4 sm:px-7" open={!meta.slug || !meta.title}><summary className="cursor-pointer text-sm font-medium">{t("identity")}</summary><div className="mt-5 grid max-w-4xl gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="workflow-title">{t("title")}</Label><Input id="workflow-title" maxLength={120} value={meta.title} onChange={event => changeMeta("title", event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="workflow-slug">{t("slug")}</Label><Input id="workflow-slug" maxLength={64} value={meta.slug} placeholder="my-workflow" onChange={event => changeMeta("slug", event.target.value)} /><p className="text-xs text-muted-foreground">{t("slugHint")}</p></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="workflow-summary">{t("summary")}</Label><Input id="workflow-summary" maxLength={240} value={meta.summary} onChange={event => changeMeta("summary", event.target.value)} /></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="workflow-description">{t("description")}</Label><Textarea id="workflow-description" rows={3} maxLength={10000} value={meta.description} onChange={event => changeMeta("description", event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="workflow-cost">{t("cost")}</Label><Input id="workflow-cost" type="number" min={1} max={200} step={1} value={meta.estimatedCost} onChange={event => changeMeta("estimatedCost", Number(event.target.value) || 1)} /><p className="text-xs text-muted-foreground">{t("costHint")}</p></div>
      </div></details>}
      {tab === "json" ? <section className="space-y-4 p-5 sm:p-7"><div><h3 className="font-semibold">{t("advancedTitle")}</h3><p className="mt-1 max-w-[70ch] text-sm leading-6 text-muted-foreground">{t("advancedHint")}</p></div><Textarea aria-label={t("jsonLabel")} spellCheck={false} className="min-h-[560px] font-mono text-xs leading-6" value={text} onChange={event => updateText(event.target.value)} /></section> : !definition || !graph?.ok ? <section className="space-y-4 p-7"><h3 className="font-semibold">{t("needsRepair")}</h3><p className="text-sm text-muted-foreground">{t("repairHint")}</p><ul className="list-disc space-y-1 pl-5 text-sm text-destructive">{(parsed.schemaIssues.length ? parsed.schemaIssues : graph?.issues ?? []).slice(0, 8).map((issue, index) => <li key={index}>{issue.message}</li>)}</ul><Button variant="outline" onClick={() => setTab("json")}><Braces className="size-4" />{t("advanced")}</Button></section> : <div className="grid min-h-[580px] lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b bg-muted/20 px-4 py-5 lg:border-b-0 lg:border-r"><div className="mb-5 flex items-center justify-between"><h3 className="text-sm font-semibold">{t("structure")}</h3><span className="text-xs tabular-nums text-muted-foreground">{t("nodeCount", { count: definition.nodes.length })}</span></div>
          <ol className="space-y-2">{displayNodes.map((node, index) => { const incoming = definition.edges.filter(edge => edge.to === node.id); return <li key={node.id}><button type="button" aria-pressed={selected?.id === node.id} onClick={() => setSelectedId(node.id)} className={cn("w-full rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50", selected?.id === node.id ? "border-primary/45 bg-primary/5" : "border-transparent hover:border-border hover:bg-background")}><span className="flex items-center gap-3"><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-medium", selected?.id === node.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{node.type === "output" ? <FileOutput className="size-4" /> : String(index + 1).padStart(2, "0")}</span><span className="min-w-0"><span className="block truncate text-sm font-medium">{node.label}</span><span className="block text-[11px] text-muted-foreground">{t(`types.${node.type}`)}</span></span></span>{incoming.length > 0 && <span className="mt-2 flex items-start gap-1.5 pl-11 text-[11px] text-muted-foreground"><GitBranch className="mt-0.5 size-3 shrink-0" /><span className="break-all">{incoming.map(edge => definition.nodes.find(candidate => candidate.id === edge.from)?.label ?? edge.from).join(" + ")}</span></span>}</button></li>; })}</ol>
          <Button className="mt-4 w-full" size="sm" variant="outline" disabled={recipeLocked || definition.nodes.length >= definition.maxNodes} onClick={addModel}><Plus className="size-4" />{t("addStep")}</Button><p className="mt-3 text-xs leading-5 text-muted-foreground">{t("dependenciesHint")}</p>
          {mode === "create" && <details className="mt-7 border-t pt-4"><summary className="cursor-pointer text-xs font-medium">{recipeT("recipeTitle")}</summary><p className="mt-3 text-xs leading-5 text-muted-foreground">{recipeT("recipeNotice")}</p><Button className="mt-3 w-full" size="sm" variant="outline" onClick={() => { if (!dirtyRef.current || window.confirm(t("replaceConfirm"))) { updateText(JSON.stringify(RESUME_WORKFLOW_DEFINITION, null, 2)); setSelectedId("copy"); } }}>{recipeT("useResumeRecipe")}</Button></details>}
        </aside>
        <main className="min-w-0 px-5 py-6 sm:px-7">
          {recipeLocked && <p className="mb-6 rounded-lg bg-muted px-4 py-3 text-sm leading-6">{t("recipeLocked")}</p>}
          {selected && <div className="space-y-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs text-muted-foreground">{t(`types.${selected.type}`)} · <span className="font-mono">{selected.id}</span></p><h3 className="mt-1 text-2xl font-semibold tracking-tight">{selected.label}</h3></div><Button variant="ghost" size="icon" disabled={recipeLocked} onClick={deleteNode} aria-label={t("deleteStep")}><Trash2 className="size-4" /></Button></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="node-label">{t("stepName")}</Label><Input id="node-label" disabled={recipeLocked} maxLength={120} value={selected.label} onChange={event => updateNode(selected.id, { label: event.target.value })} /></div>{stage && <div className="space-y-2"><Label htmlFor="stage-title">{t("stageName")}</Label><Input id="stage-title" disabled={recipeLocked} maxLength={120} value={stage.title} onChange={event => updateExperience({ stages: experience!.stages.map(item => item.id === stage.id ? { ...item, title: event.target.value } : item) })} /></div>}</div>
            {["model", "prompt", "template"].includes(selected.type) && <div className="space-y-2"><Label htmlFor="node-prompt">{selected.type === "template" ? t("template") : t("prompt")}</Label><Textarea id="node-prompt" disabled={recipeLocked} rows={8} className="font-mono text-sm leading-6" value={String(selected.config[promptField] ?? "")} onChange={event => updateNode(selected.id, { config: { [promptField]: event.target.value } })} /><p className="text-xs leading-5 text-muted-foreground">{t("promptHint", { input: "{{input.topic}}", upstream: "{{upstreamStepID}}" })}</p><div className="flex flex-wrap gap-2">{definition.edges.filter(edge => edge.to === selected.id).map(edge => <span key={edge.id} className="rounded-md bg-muted px-2 py-1 font-mono text-xs">{`{{${edge.from}}}`}</span>)}{variables.map((variable, index) => <span key={index} className="rounded-md bg-muted px-2 py-1 font-mono text-xs">{`{{input.${String(variable.key ?? "")}}}`}</span>)}</div></div>}
            {selected.type === "condition" && <p className="rounded-lg bg-muted px-4 py-3 text-sm leading-6">{t("conditionHint")}</p>}
            <section className="border-t pt-6"><div className="flex items-center justify-between gap-3"><div><h4 className="text-sm font-semibold">{t("inputs")}</h4><p className="mt-1 text-xs text-muted-foreground">{t("inputHint")}</p></div><Button variant="outline" size="sm" disabled={recipeLocked} onClick={addVariable}><Plus className="size-3.5" />{t("addInput")}</Button></div>
              {variables.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">{t("noInputs")}</p> : <div className="mt-5 space-y-5">{variables.map((variable, index) => <div key={`${selected.id}-${index}`} className="grid gap-3 border-b pb-5 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor={`input-key-${index}`}>{t("inputKey")}</Label><Input id={`input-key-${index}`} disabled={recipeLocked} readOnly={inputReferenced(String(variable.key ?? ""))} title={inputReferenced(String(variable.key ?? "")) ? t("referencedInputKey") : undefined} value={String(variable.key ?? "")} maxLength={64} onChange={event => updateVariable(index, { key: event.target.value })} /></div><div className="space-y-1.5"><Label htmlFor={`input-label-${index}`}>{t("inputLabel")}</Label><Input id={`input-label-${index}`} disabled={recipeLocked} value={String(variable.label ?? "")} maxLength={120} onChange={event => updateVariable(index, { label: event.target.value })} /></div><div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`input-hint-${index}`}>{t("inputHelp")}</Label><Input id={`input-hint-${index}`} disabled={recipeLocked} value={String(variable.hint ?? "")} maxLength={240} onChange={event => updateVariable(index, { hint: event.target.value })} /></div><div className="flex items-center gap-2"><Checkbox id={`input-required-${index}`} aria-label={t("required")} disabled={recipeLocked} checked={variable.required !== false} onCheckedChange={value => updateVariable(index, { required: value === true })} /><Label htmlFor={`input-required-${index}`}>{t("required")}</Label></div><Button className="justify-self-start sm:justify-self-end" variant="ghost" size="sm" disabled={recipeLocked} onClick={() => deleteVariable(index)}><Trash2 className="size-3.5" />{t("removeInput")}</Button></div>)}</div>}
            </section>
            <details className="border-t pt-4"><summary className="cursor-pointer text-xs font-medium">{t("executionSettings")}</summary><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="node-timeout">{t("timeout")}</Label><Input id="node-timeout" disabled={recipeLocked} type="number" min={100} max={120000} value={selected.timeoutMs} onChange={event => updateNode(selected.id, { timeoutMs: Math.max(100, Math.min(120000, Number(event.target.value) || 100)) })} /></div><div className="space-y-2"><Label htmlFor="node-retries">{t("retries")}</Label><Input id="node-retries" disabled={recipeLocked} type="number" min={0} max={3} value={selected.maxRetries} onChange={event => updateNode(selected.id, { maxRetries: Math.max(0, Math.min(3, Number(event.target.value) || 0)) })} /></div></div></details>
          </div>}
          {experience && <section className="mt-8 border-t pt-6"><div className="flex items-center gap-2"><FileOutput className="size-4 text-primary" /><h4 className="text-sm font-semibold">{t("deliverable")}</h4></div><div className="mt-4 grid gap-4 sm:grid-cols-[1fr_180px]"><div className="space-y-2"><Label htmlFor="output-label">{t("outputName")}</Label><Input id="output-label" disabled={recipeLocked} maxLength={120} value={experience.output.label} onChange={event => updateExperience({ output: { ...experience.output, label: event.target.value } })} /></div><div className="space-y-2"><Label htmlFor="output-format">{t("outputFormat")}</Label><Select disabled={recipeLocked} value={experience.output.format} onValueChange={value => updateExperience({ output: { ...experience.output, format: value as WorkflowExperience["output"]["format"] } })}><SelectTrigger id="output-format" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">{t("formats.text")}</SelectItem><SelectItem value="markdown">{t("formats.markdown")}</SelectItem><SelectItem value="json">{t("formats.json")}</SelectItem></SelectContent></Select></div></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{t("previewNotice")}</p></section>}
          <details className="mt-7 border-t pt-4"><summary className="cursor-pointer text-xs font-medium">{t("allConnections")}</summary><ul className="mt-3 space-y-2 text-xs">{definition.edges.map(edge => <li key={edge.id} className="flex flex-wrap items-center gap-2"><span className="font-mono">{edge.from}</span><ArrowRight className="size-3 text-muted-foreground" /><span className="font-mono">{edge.to}</span>{Object.keys(edge.mapping).length > 0 && <span className="text-muted-foreground">{t("customMapping")}</span>}</li>)}</ul></details>
        </main>
      </div>}
      </fieldset>
      {(error || parsed.parseError) && <div role="alert" className="border-t px-5 py-4 text-sm text-destructive sm:px-7"><p>{error || parsed.parseError}</p>{issues.length > 0 && <ul className="mt-2 list-disc space-y-1 break-words pl-5 text-xs">{issues.map((issue, index) => <li key={index}>{issue.path ? `${Array.isArray(issue.path) ? issue.path.join(".") : issue.path}: ` : ""}{issue.message}</li>)}</ul>}</div>}
      {checked && order.length > 0 && <div className="flex flex-wrap items-center gap-2 border-t px-5 py-4 text-xs sm:px-7"><CheckCircle2 className="size-4 text-primary" /><span className="font-medium">{t("checkedOrder")}</span>{order.map((id, index) => <span key={id} className="rounded bg-muted px-2 py-1">{index + 1}. {id}</span>)}</div>}
      {message && <div role="status" className="border-t px-5 py-4 text-sm text-muted-foreground sm:px-7">{message}{mode === "version" && initialMeta?.slug && <Link className="ml-2 text-primary underline" href={`/workflows/mine/${initialMeta.slug}`}>{t("back")}</Link>}</div>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-5 py-4 sm:px-7"><p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" />{t("privateNotice")}</p><span className="text-xs text-muted-foreground">{t("saveChecks")}</span></footer>
    </div>
  );
}
