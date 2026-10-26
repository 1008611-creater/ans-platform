"use client";

import { usePausedRunModels } from "@/components/providers/run-model-pricing";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useMarketActorId, useMarketRequest } from "@/components/marketplace/account-boundary";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_RUN_MODEL, RUN_MODEL_OPTIONS, RUN_REASONING_EFFORTS, RUN_REASONING_EFFORT_LABELS, type RunReasoningEffort } from "@/lib/run-models";
import type { WorkflowInputVariable } from "@/domain/workflows/variables";

type CredentialOption = { id: string; label: string; keyMasked: string };

export type NodeRunSummary = {
  nodeId: string;
  status: string;
  attempts: number;
  error: string | null;
  output?: unknown;
};

export type WorkflowRunSnapshot = {
  busy: boolean;
  status: string;
  error: string;
  output: string | null;
  nodeRuns: NodeRunSummary[];
  runId: string | null;
};

type PersistedRunSummary = {
  id: string;
  status: string;
  output?: unknown;
  error?: string | null;
  nodeRuns?: NodeRunSummary[];
};

function outputText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

/**
 * 统一运行入口：填变量 → 创建运行（扣额度）→ 同步执行 → 展示逐节点结果。
 * 连接中断时仅查询已创建的运行，人工重试复用原请求编号，避免重复扣额度。
 */
export function WorkflowRunForm({
  slug,
  variables,
  estimatedCost,
  credentials = [],
  defaultModelKey = DEFAULT_RUN_MODEL,
  embedded = false,
  onStateChange,
}: {
  slug: string;
  variables: WorkflowInputVariable[];
  estimatedCost: number | null;
  credentials?: CredentialOption[];
  defaultModelKey?: string;
  embedded?: boolean;
  onStateChange?: (snapshot: WorkflowRunSnapshot) => void;
}) {
  const router = useRouter();
  const request = useMarketRequest(), actorId = useMarketActorId();
  const alive = useRef(true), submitting = useRef(false);
  const activeRun = useRef<{ id: string | null; terminal: boolean }>({ id: null, terminal: false });
  const intent = useRef<{ fingerprint: string; key: string } | null>(null);
  const runRecoverySlot = actorId ? `ans:workflow-run-id:${encodeURIComponent(actorId)}:${encodeURIComponent(slug)}` : null;
  const portalRoot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  const billing = useTranslations("learning");
  const pausedModels = usePausedRunModels();
  const workflowBilling = useTranslations("marketWorkflow");
  const studio = useTranslations("workflowStudio");
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(variables.map((variable) => [variable.key, ""])),
  );
  const [modelKey, setModelKey] = useState(defaultModelKey);
  const [credentialId, setCredentialId] = useState("platform");
  const [reasoningEffort, setReasoningEffort] = useState<RunReasoningEffort>("none");
  const [recovery] = useState(() => {
    try {
      const raw = runRecoverySlot ? sessionStorage.getItem(runRecoverySlot) : null;
      if (!raw) return null;
      const stored = raw.startsWith("{") ? JSON.parse(raw) : { id: raw };
      return typeof stored.id === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(stored.id)
        ? { id: stored.id as string, intentSlot: typeof stored.intentSlot === "string" && stored.intentSlot.startsWith(`ans:workflow-run:${encodeURIComponent(actorId!)}:${encodeURIComponent(slug)}:`) ? stored.intentSlot as string : null }
        : null;
    } catch { return null; }
  });
  const pendingIntentSlot = useRef<string | null>(recovery?.intentSlot ?? null);
  const [busy, setBusy] = useState(Boolean(recovery));
  const [error, setError] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [nodeRuns, setNodeRuns] = useState<NodeRunSummary[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState(recovery ? "PREPARING" : "IDLE");
  useEffect(() => {
    onStateChange?.({ busy, status, error, output, nodeRuns, runId });
  }, [busy, status, error, output, nodeRuns, runId, onStateChange]);
  const readStatus = useEffectEvent(async (id: string) => request<{ run: PersistedRunSummary }>(`/api/workflows/runs/${id}`, "GET", undefined));
  const recoveryFailed = useEffectEvent(() => studio("failed"));
  function clearRecovery() {
    try {
      if (runRecoverySlot) sessionStorage.removeItem(runRecoverySlot);
      if (pendingIntentSlot.current) sessionStorage.removeItem(pendingIntentSlot.current);
    } catch { /* Optional recovery storage. */ }
    pendingIntentSlot.current = null;
    intent.current = null;
  }
  const completeRecovery = useEffectEvent(clearRecovery);
  useEffect(() => {
    // A single status loop follows live, restored, and disconnected runs.
    if (!runId || !["PENDING", "QUEUED", "RUNNING", "UNKNOWN"].includes(status)) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      try {
        const detail = await readStatus(runId!);
        if (stopped || !alive.current || activeRun.current.id !== runId || activeRun.current.terminal) return;
        if (["SUCCEEDED", "FAILED", "CANCELLED"].includes(detail.run.status)) {
          activeRun.current.terminal = true;
          if (detail.run.status === "SUCCEEDED") { setOutput(outputText(detail.run.output)); setError(""); }
          else setError(detail.run.error ?? recoveryFailed());
          setBusy(false);
          completeRecovery();
        }
        if (detail.run.nodeRuns) setNodeRuns(detail.run.nodeRuns);
        setStatus(detail.run.status);
      } catch { /* Execution response remains authoritative if status reads fail. */ }
      if (!stopped) timer = setTimeout(() => void poll(), 1500);
    }
    timer = setTimeout(() => void poll(), 400);
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  }, [runId, status]);
  useEffect(() => {
    if (!recovery) return;
    let cancelled = false;
    void readStatus(recovery.id).then((detail) => {
      if (cancelled || !alive.current) return;
      const terminal = ["SUCCEEDED", "FAILED", "CANCELLED"].includes(detail.run.status);
      activeRun.current = { id: recovery.id, terminal };
      setRunId(recovery.id);
      setStatus(detail.run.status);
      setBusy(false);
      if (detail.run.status === "SUCCEEDED") { setOutput(outputText(detail.run.output)); setError(""); }
      else if (terminal) setError(detail.run.error ?? recoveryFailed());
      if (detail.run.nodeRuns) setNodeRuns(detail.run.nodeRuns);
      if (terminal) completeRecovery();
    }).catch(() => {
      if (!cancelled && alive.current) { activeRun.current = { id: recovery.id, terminal: false }; setRunId(recovery.id); setStatus("UNKNOWN"); setBusy(false); }
    });
    return () => { cancelled = true; };
  }, [recovery]);
  useEffect(() => {
    if (!busy) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [busy]);

  const missing = variables
    .filter((variable) => variable.required && !(values[variable.key] ?? "").trim())
    .map((variable) => variable.label);

  async function fetchRunDetail(id: string) {
    const detail = await request<{ run: PersistedRunSummary }>(`/api/workflows/runs/${id}`, "GET", undefined);
    return detail.run;
  }
  async function run() {
    if (submitting.current || busy || ["UNKNOWN", "PENDING", "QUEUED", "RUNNING"].includes(status) || !alive.current || missing.length) return;
    submitting.current = true;
    // Capture both inputs and execution choices before any asynchronous work.
    const input = { ...values };
    const options = { modelKey, reasoningEffort, ...(credentialId === "platform" ? {} : { credentialId }) };
    activeRun.current = { id: null, terminal: false };
    setBusy(true); setStatus("PREPARING"); setRunId(null); setError(""); setOutput(null); setNodeRuns([]);
    let createdRunId: string | null = null;
    let recoverySlot: string | null = null;
    function finishIntent() {
      intent.current = null;
      try { if (recoverySlot) sessionStorage.removeItem(recoverySlot); } catch { /* Optional recovery storage. */ }
    }
    try {
      if (!actorId) throw new Error("账号已变更，请刷新后重试。");
      // Persist only a digest and random key, never the personal input or credential choice.
      const serialized = JSON.stringify([slug, Object.keys(input).sort().map(key => [key, input[key]]), options]);
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(serialized));
      if (!alive.current) return;
      const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
      recoverySlot = `ans:workflow-run:${encodeURIComponent(actorId)}:${encodeURIComponent(slug)}:${fingerprint}`;
      if (!intent.current || intent.current.fingerprint !== fingerprint) {
        let savedKey: string | null = null;
        try {
          const stored = sessionStorage.getItem(recoverySlot);
          if (stored && /^[a-zA-Z0-9_-]{8,80}$/.test(stored)) savedKey = stored;
        } catch { /* In-memory idempotency remains available when storage is disabled. */ }
        intent.current = { fingerprint, key: savedKey ?? crypto.randomUUID() };
      }
      const idempotencyKey = intent.current.key;
      try { sessionStorage.setItem(recoverySlot, idempotencyKey); } catch { /* Optional recovery storage. */ }
      const created = await request<{ run: { id: string } }>(`/api/workflows/${slug}/run`, "POST", { input, idempotencyKey });
      if (!alive.current) return;
      const id = created.run?.id;
      if (!id) throw new Error("服务端未返回运行编号。");
      createdRunId = id;
      activeRun.current = { id, terminal: false };
      setRunId(id);
      pendingIntentSlot.current = recoverySlot;
      try { if (runRecoverySlot) sessionStorage.setItem(runRecoverySlot, JSON.stringify({ id, intentSlot: recoverySlot })); } catch { /* Optional recovery storage. */ }
      setStatus("PENDING");
      // 模型与额度来源随执行请求提交；服务端再次校验凭证归属。
      const executed = await request<{ result: { status: string; output?: unknown; error?: string } }>(`/api/workflows/runs/${id}/execute`, "POST", options);
      if (!alive.current) return;
      if (!["succeeded", "failed"].includes(executed.result?.status ?? "")) throw new Error(studio("unknownRun"));
      activeRun.current.terminal = true;
      if (executed.result.status === "failed") { setStatus("FAILED"); setError(executed.result.error ?? studio("failed")); }
      else { setStatus("SUCCEEDED"); setOutput(outputText(executed.result.output)); }
      const detail = await fetchRunDetail(id).catch(() => null);
      if (!alive.current) return;
      if (detail?.nodeRuns) setNodeRuns(detail.nodeRuns);
      if (detail && ["SUCCEEDED", "FAILED", "CANCELLED"].includes(detail.status)) setStatus(detail.status);
      try { if (runRecoverySlot) sessionStorage.removeItem(runRecoverySlot); } catch { /* Optional recovery storage. */ }
      finishIntent();
      router.refresh();
    } catch (cause) {
      if (!alive.current) return;
      if (activeRun.current.terminal) return;
      // Pause live polling while reconciling the lost execution acknowledgement.
      if (createdRunId) setStatus("PREPARING");
      // Recover with reads only; never retry a charge automatically.
      const completed = createdRunId ? await fetchRunDetail(createdRunId).catch(() => null) : null;
      if (!alive.current) return;
      if (completed && ["SUCCEEDED", "FAILED", "CANCELLED"].includes(completed.status)) {
        activeRun.current.terminal = true;
        if (completed.nodeRuns) setNodeRuns(completed.nodeRuns);
        setStatus(completed.status);
        if (completed.status === "SUCCEEDED") { setError(""); setOutput(outputText(completed.output)); }
        else { setOutput(null); setError(completed.error ?? "工作流执行未完成，请查看运行记录与额度流水。"); }
        finishIntent();
        try { if (runRecoverySlot) sessionStorage.removeItem(runRecoverySlot); } catch { /* Optional recovery storage. */ }
        router.refresh();
      } else {
        if (completed?.nodeRuns) setNodeRuns(completed.nodeRuns);
        setStatus(createdRunId ? "UNKNOWN" : "FAILED");
        setError(cause instanceof Error ? cause.message : studio("failed"));
      }
    } finally {
      submitting.current = false;
      if (alive.current) setBusy(false);
    }
  }

  const Frame = embedded ? "div" : Card;
  const Content = embedded ? "div" : CardContent;
  return (
    <Frame>
      {!embedded && <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" /> 运行这个工作流
        </CardTitle>
        <CardDescription>
          {estimatedCost === null ? workflowBilling("meteredCost") : billing("billingExplanation", { points: estimatedCost })}
        </CardDescription>
      </CardHeader>}
      <Content className="space-y-5">
        <div ref={portalRoot} className="contents">
        {embedded && <p className="text-xs leading-6 text-muted-foreground">{estimatedCost === null ? workflowBilling("meteredCost") : billing("billingExplanation", { points: estimatedCost })}</p>}
        {variables.length === 0 ? (
          <p className="text-sm text-muted-foreground">这个工作流不需要额外输入，直接运行即可。</p>
        ) : (
          variables.map((variable) => (
            <div key={variable.key} className="space-y-1.5">
              <Label htmlFor={`wf-${variable.key}`}>
                {variable.label}
                {variable.required && <span className="ms-1 text-destructive">*</span>}
              </Label>
              {variable.hint ? (
                <p className="text-xs text-muted-foreground">{variable.hint}</p>
              ) : null}
              {variable.hint && variable.hint.length > 60 ? (
                <Textarea
                  id={`wf-${variable.key}`}
                  disabled={busy}
                  rows={4}
                  value={values[variable.key] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [variable.key]: event.target.value }))
                  }
                />
              ) : (
                <Input
                  id={`wf-${variable.key}`}
                  disabled={busy}
                  value={values[variable.key] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [variable.key]: event.target.value }))
                  }
                />
              )}
            </div>
          ))
        )}

        <div className={embedded ? "grid gap-4" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
          <div className="space-y-1.5">
            <Label htmlFor="workflow-run-model">模型</Label>
            <Select disabled={busy} value={modelKey} onValueChange={setModelKey}>
              <SelectTrigger id="workflow-run-model" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent container={portalRoot.current}>
                {RUN_MODEL_OPTIONS.map((model) => (
                  <SelectItem key={model.key} value={model.key} disabled={pausedModels.includes(model.key)}>
                    {!pausedModels.includes(model.key) ? model.label : `${model.label} · ${billing("modelUnavailable")}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="workflow-run-reasoning">思考强度</Label>
            <Select disabled={busy} value={reasoningEffort} onValueChange={(value) => setReasoningEffort(value as RunReasoningEffort)}>
              <SelectTrigger id="workflow-run-reasoning" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent container={portalRoot.current}>
                {RUN_REASONING_EFFORTS.map((effort) => (
                  <SelectItem key={effort} value={effort}>
                    {RUN_REASONING_EFFORT_LABELS[effort]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {credentials.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="workflow-run-credential">模型额度来源</Label>
              <Select disabled={busy} value={credentialId} onValueChange={setCredentialId}>
                <SelectTrigger id="workflow-run-credential" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent container={portalRoot.current}>
                  <SelectItem value="platform">平台模型池</SelectItem>
                  {credentials.map((credential) => (
                    <SelectItem key={credential.id} value={credential.id}>
                      {credential.label}（{credential.keyMasked}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button className={embedded ? "w-full" : undefined} disabled={busy || ["UNKNOWN", "PENDING", "QUEUED", "RUNNING"].includes(status) || missing.length > 0} onClick={run}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {busy ? "运行中…" : estimatedCost === null ? workflowBilling("confirmRun") : billing("billingRun", { points: estimatedCost })}
          </Button>
          {missing.length > 0 && (
            <span className="text-xs text-muted-foreground">还需填写：{missing.join("、")}</span>
          )}
          {runId && <span className="text-xs text-muted-foreground">运行编号 {runId.slice(0, 8)}…</span>}
        </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>运行未完成</AlertTitle>
            <AlertDescription className="break-words">{error}</AlertDescription>
          </Alert>
        )}

        {!embedded && output !== null && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">运行结果</h3>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/30 p-4 text-sm leading-7">
              {output || "（空结果）"}
            </pre>
          </div>
        )}

        {!embedded && nodeRuns.length > 0 && (
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer text-sm font-medium">逐节点执行记录</summary>
            <ul className="mt-3 space-y-2 text-xs">
              {nodeRuns.map((node) => (
                <li key={node.nodeId} className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono">{node.nodeId}</span>
                  <span
                    className={
                      node.status === "SUCCEEDED" ? "text-emerald-600" : "text-destructive"
                    }
                  >
                    {node.status}
                  </span>
                  <span className="text-muted-foreground">尝试 {node.attempts} 次</span>
                  {node.error && <span className="break-words text-destructive">{node.error}</span>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Content>
    </Frame>
  );
}
