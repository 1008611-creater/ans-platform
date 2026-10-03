"use client";

import { useState } from "react";
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

async function fetchRunDetail(id: string): Promise<PersistedRunSummary | null> {
  const response = await fetch(`/api/workflows/runs/${id}`, { cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) return null;
  return (body?.data?.run ?? null) as PersistedRunSummary | null;
}

async function waitForRunCompletion(id: string, maxPolls = 150): Promise<PersistedRunSummary | null> {
  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    const run = await fetchRunDetail(id).catch(() => null);
    if (run && ["SUCCEEDED", "FAILED", "CANCELLED"].includes(run.status)) return run;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return null;
}

/**
 * 统一运行入口：填变量 → 创建运行（扣额度）→ 同步执行 → 展示逐节点结果。
 * 失败时服务端已自动退费，这里只负责把可理解的错误显示给用户。
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
  estimatedCost: number;
  credentials?: CredentialOption[];
  defaultModelKey?: string;
}) {
  const router = useRouter();
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

  async function run() {
    setBusy(true);
    setError("");
    setOutput(null);
    setNodeRuns([]);
    let createdRunId: string | null = null;
    try {
      const created = await fetch(`/api/workflows/${slug}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: values }),
      });
      const createdBody = await created.json().catch(() => null);
      if (!created.ok) {
        throw new Error(createdBody?.error?.message ?? "无法创建运行，请稍后重试");
      }
      const id: string = createdBody?.data?.run?.id;
      if (!id) throw new Error("服务端未返回运行编号。");
      createdRunId = id;
      setRunId(id);

      // 模型与额度来源随执行请求一起提交；服务端会再次校验凭证归属。
      const executed = await fetch(`/api/workflows/runs/${id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelKey,
          reasoningEffort,
          ...(credentialId === "platform" ? {} : { credentialId }),
        }),
      });
      const executedBody = await executed.json().catch(() => null);
      if (!executed.ok) {
        throw new Error(executedBody?.error?.message ?? "工作流执行失败");
      }
      const result = executedBody?.data?.result;
      if (result?.status === "failed") {
        setError(result.error ?? "工作流执行失败，额度已退回。");
      } else {
        setOutput(outputText(result?.output));
      }
      const detail = await fetch(`/api/workflows/runs/${id}`).then((r) => r.json()).catch(() => null);
      setNodeRuns((detail?.data?.run?.nodeRuns ?? []) as NodeRunSummary[]);
      router.refresh();
    } catch (cause) {
      const completed = createdRunId ? await waitForRunCompletion(createdRunId) : null;
      if (completed) {
        setNodeRuns(completed.nodeRuns ?? []);
        if (completed.status === "SUCCEEDED") {
          setError("");
          setOutput(outputText(completed.output));
        } else {
          setOutput(null);
          setError(completed.error ?? "Workflow execution failed; quota refunded.");
        }
        router.refresh();
      } else {
        setError(cause instanceof Error ? cause.message : "Run failed; please retry.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" /> 运行这个工作流
        </CardTitle>
        <CardDescription>
          填写输入后运行，消耗 {estimatedCost} 点算力；失败会自动退回额度，结果保存在运行记录里。
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
                  rows={4}
                  value={values[variable.key] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [variable.key]: event.target.value }))
                  }
                />
              ) : (
                <Input
                  id={`wf-${variable.key}`}
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
            <Select value={modelKey} onValueChange={setModelKey}>
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
            <Select value={reasoningEffort} onValueChange={(value) => setReasoningEffort(value as RunReasoningEffort)}>
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
              <Select value={credentialId} onValueChange={setCredentialId}>
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
            {busy ? "运行中…" : `运行（${estimatedCost} 点）`}
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
