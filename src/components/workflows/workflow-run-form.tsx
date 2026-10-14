"use client";

import { useEffect, useRef, useState } from "react";
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

type NodeRunSummary = {
  nodeId: string;
  status: string;
  attempts: number;
  error: string | null;
  output?: unknown;
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
}: {
  slug: string;
  variables: WorkflowInputVariable[];
  estimatedCost: number | null;
  credentials?: CredentialOption[];
  defaultModelKey?: string;
}) {
  const router = useRouter();
  const request = useMarketRequest(), actorId = useMarketActorId();
  const alive = useRef(true), submitting = useRef(false);
  const intent = useRef<{ fingerprint: string; key: string } | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelWait = useRef<(() => void) | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; if (pollTimer.current) clearTimeout(pollTimer.current); cancelWait.current?.(); };
  }, []);
  const billing = useTranslations("learning");
  const workflowBilling = useTranslations("marketWorkflow");
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(variables.map((variable) => [variable.key, ""])),
  );
  const [modelKey, setModelKey] = useState(defaultModelKey);
  const [credentialId, setCredentialId] = useState("platform");
  const [reasoningEffort, setReasoningEffort] = useState<RunReasoningEffort>("none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [nodeRuns, setNodeRuns] = useState<NodeRunSummary[]>([]);
  const [runId, setRunId] = useState<string | null>(null);

  const missing = variables
    .filter((variable) => variable.required && !(values[variable.key] ?? "").trim())
    .map((variable) => variable.label);

  async function fetchRunDetail(id: string) {
    const detail = await request<{ run: PersistedRunSummary }>(`/api/workflows/runs/${id}`, "GET", undefined);
    return detail.run;
  }
  async function waitForRunCompletion(id: string, maxPolls = 150): Promise<PersistedRunSummary | null> {
    for (let attempt = 0; alive.current && attempt < maxPolls; attempt += 1) {
      const detail = await fetchRunDetail(id).catch(() => null);
      if (!alive.current) return null;
      if (detail && ["SUCCEEDED", "FAILED", "CANCELLED"].includes(detail.status)) return detail;
      await new Promise<void>((resolve) => {
        cancelWait.current = resolve;
        pollTimer.current = setTimeout(() => { pollTimer.current = null; cancelWait.current = null; resolve(); }, 1000);
      });
    }
    return null;
  }

  async function run() {
    if (submitting.current || !alive.current || missing.length) return;
    submitting.current = true;
    // Capture both inputs and execution choices before any asynchronous work.
    const input = { ...values };
    const options = { modelKey, reasoningEffort, ...(credentialId === "platform" ? {} : { credentialId }) };
    setBusy(true); setError(""); setOutput(null); setNodeRuns([]);
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
      setRunId(id);
      // 模型与额度来源随执行请求提交；服务端再次校验凭证归属。
      const executed = await request<{ result: { status: string; output?: unknown; error?: string } }>(`/api/workflows/runs/${id}/execute`, "POST", options);
      if (!alive.current) return;
      if (executed.result?.status === "failed") setError(executed.result.error ?? "工作流执行失败，请查看运行记录与额度流水。");
      else setOutput(outputText(executed.result?.output));
      const detail = await fetchRunDetail(id).catch(() => null);
      if (!alive.current) return;
      setNodeRuns(detail?.nodeRuns ?? []);
      finishIntent();
      router.refresh();
    } catch (cause) {
      if (!alive.current) return;
      // Recover acknowledgements with read-only polling; never retry a charge automatically.
      const completed = createdRunId ? await waitForRunCompletion(createdRunId) : null;
      if (!alive.current) return;
      if (completed) {
        setNodeRuns(completed.nodeRuns ?? []);
        if (completed.status === "SUCCEEDED") { setError(""); setOutput(outputText(completed.output)); }
        else { setOutput(null); setError(completed.error ?? "工作流执行未完成，请查看运行记录与额度流水。"); }
        finishIntent();
        router.refresh();
      } else {
        setError(cause instanceof Error ? cause.message : "运行未完成，请稍后重试。");
      }
    } finally {
      submitting.current = false;
      if (alive.current) setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" /> 运行这个工作流
        </CardTitle>
        <CardDescription>
          {estimatedCost === null ? workflowBilling("meteredCost") : billing("billingExplanation", { points: estimatedCost })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="workflow-run-model">模型</Label>
            <Select disabled={busy} value={modelKey} onValueChange={setModelKey}>
              <SelectTrigger id="workflow-run-model" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RUN_MODEL_OPTIONS.map((model) => (
                  <SelectItem key={model.key} value={model.key}>
                    {model.label}
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
              <SelectContent>
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
                <SelectContent>
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
          <Button disabled={busy || missing.length > 0} onClick={run}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {busy ? "运行中…" : estimatedCost === null ? workflowBilling("confirmRun") : billing("billingRun", { points: estimatedCost })}
          </Button>
          {missing.length > 0 && (
            <span className="text-xs text-muted-foreground">还需填写：{missing.join("、")}</span>
          )}
          {runId && <span className="text-xs text-muted-foreground">运行编号 {runId.slice(0, 8)}…</span>}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>运行未完成</AlertTitle>
            <AlertDescription className="break-words">{error}</AlertDescription>
          </Alert>
        )}

        {output !== null && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">运行结果</h3>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/30 p-4 text-sm leading-7">
              {output || "（空结果）"}
            </pre>
          </div>
        )}

        {nodeRuns.length > 0 && (
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
      </CardContent>
    </Card>
  );
}
