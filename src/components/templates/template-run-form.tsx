"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { DEFAULT_RUN_MODEL, RUN_MODEL_OPTIONS } from "@/lib/run-models";

export type RunFormField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select";
  required?: boolean;
  options?: string[];
  default?: string | number;
  placeholder?: string;
};

function makeIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return String(Date.now()) + "-" + Math.random().toString(36).slice(2);
}

export function TemplateRunForm({
  slug,
  formSchema = [],
  estimatedCost,
}: {
  slug: string;
  formSchema?: RunFormField[];
  estimatedCost: number;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(formSchema.map((f) => [f.key, String(f.default ?? "")]))
  );
  const [modelKey, setModelKey] = useState<string>(DEFAULT_RUN_MODEL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const pendingKey = useRef<string | null>(null);

  async function waitForRun(id: string) {
    for (let attempt = 0; attempt < 65; attempt += 1) {
      const response = await fetch("/api/runs/" + encodeURIComponent(id), {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("无法查询运行状态，请到工作台查看记录");
      }
      const data = await response.json();
      const run = data.run;
      setRunStatus(run.status);
      if (run.status === "SUCCEEDED") {
        setOutput(run.outputText ?? "");
        return;
      }
      if (run.status === "FAILED" || run.status === "CANCELLED") {
        const terminalError = new Error(run.error || "运行失败");
        (terminalError as Error & { terminal?: boolean }).terminal = true;
        throw terminalError;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error("等待时间较长，请到工作台查看运行状态");
  }

  async function run() {
    const key = pendingKey.current ?? makeIdempotencyKey();
    pendingKey.current = key;
    setBusy(true);
    setError("");
    setOutput(null);
    setRunId(null);
    setRunStatus("QUEUED");
    let clearKeyOnError = false;
    try {
      const response = await fetch("/api/templates/" + encodeURIComponent(slug) + "/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ inputs: values, modelKey }),
      });
      const data = await response.json();
      if (!response.ok) {
        clearKeyOnError = true;
        throw new Error(data.message || data.error || "运行失败");
      }
      setRunId(data.runId ?? null);
      setRunStatus(data.status ?? null);
      if (data.status === "SUCCEEDED") {
        setOutput(data.outputText ?? "");
        pendingKey.current = null;
      } else if (data.runId) {
        await waitForRun(data.runId);
        pendingKey.current = null;
      } else {
        clearKeyOnError = true;
        throw new Error("运行记录缺少编号");
      }
      router.refresh();
    } catch (cause) {
      const terminal = cause instanceof Error && (cause as Error & { terminal?: boolean }).terminal;
      if (clearKeyOnError || terminal) pendingKey.current = null;
      setError(cause instanceof Error ? cause.message : "运行失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" /> 在线运行
        </CardTitle>
        <CardDescription>填写输入后运行模板，消耗算力点数，结果保存在工作台。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {formSchema.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="ms-1 text-destructive">*</span>}
            </Label>
            {field.type === "select" ? (
              <Select
                value={values[field.key] ?? ""}
                onValueChange={(value) => setValues((prev) => ({ ...prev, [field.key]: value }))}
              >
                <SelectTrigger id={field.key} className="w-full">
                  <SelectValue placeholder={field.placeholder ?? "请选择"} />
                </SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.type === "textarea" ? (
              <Textarea
                id={field.key}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
                rows={4}
              />
            ) : (
              <Input
                id={field.key}
                type={field.type === "number" ? "number" : "text"}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
              />
            )}
          </div>
        ))}

        <div className="space-y-1.5">
          <Label htmlFor="run-model">模型</Label>
          <Select value={modelKey} onValueChange={setModelKey}>
            <SelectTrigger id="run-model" className="w-full">
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

        <div className="flex items-center gap-3">
          <Button disabled={busy} onClick={run}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {busy ? "运行中…" : "运行（" + estimatedCost + " 点）"}
          </Button>
          {runId && <span className="text-sm text-muted-foreground">记录 {runId.slice(0, 8)}…</span>}
          {runStatus && busy && <span className="text-xs text-muted-foreground">{runStatus === "QUEUED" ? "排队中" : "处理中"}</span>}
        </div>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {output !== null && (
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/30 p-4 text-sm leading-7">
            {output}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
