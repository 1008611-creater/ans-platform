"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CheckCircle2, KeyRound, Loader2, RefreshCw, Save } from "lucide-react";

type Config = {
  baseUrl: string;
  apiKey: string;
  selectedModel: string;
  availableModels: string[];
  reasoningEffort: "none" | "low" | "medium" | "high";
  timeoutMs: number;
  enabled: boolean;
  updatedAt: string;
};

export function AiConfigForm({ initialConfig }: { initialConfig: Config | null }) {
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState(initialConfig?.baseUrl ?? "");
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState(initialConfig?.selectedModel ?? "");
  const [modelsText, setModelsText] = useState(initialConfig?.availableModels.join("\n") ?? "");
  const [reasoningEffort, setReasoningEffort] = useState<Config["reasoningEffort"]>(initialConfig?.reasoningEffort ?? "none");
  const [timeoutSeconds, setTimeoutSeconds] = useState(String(Math.round((initialConfig?.timeoutMs ?? 30_000) / 1000)));
  const [enabled, setEnabled] = useState(initialConfig?.enabled ?? true);
  const [busy, setBusy] = useState<"save" | "sync" | "rollback" | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const models = useMemo(() => [...new Set(modelsText.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))], [modelsText]);

  async function save() {
    setBusy("save");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/ai-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl,
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
          selectedModel,
          availableModels: models,
          reasoningEffort,
          timeoutMs: Number(timeoutSeconds) * 1000,
          enabled,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "保存失败");
      setApiKey("");
      setMessage({ kind: "success", text: "配置已保存，后续初审会使用新配置" });
      router.refresh();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "保存失败" });
    } finally {
      setBusy(null);
    }
  }

  async function syncModels() {
    setBusy("sync");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/ai-config/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}) }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "模型同步失败");
      const next = body.data as Config;
      setModelsText(next.availableModels.join("\n"));
      setSelectedModel(next.selectedModel);
      setMessage({ kind: "success", text: `已同步 ${body.count} 个上游模型，可继续手动删改后保存` });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "模型同步失败" });
    } finally {
      setBusy(null);
    }
  }

  async function rollback() {
    setBusy("rollback");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/ai-config/rollback", { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.data) throw new Error(body.message || "恢复失败");
      const next = body.data as Config;
      setBaseUrl(next.baseUrl);
      setSelectedModel(next.selectedModel);
      setModelsText(next.availableModels.join("\n"));
      setReasoningEffort(next.reasoningEffort);
      setTimeoutSeconds(String(Math.round(next.timeoutMs / 1000)));
      setEnabled(next.enabled);
      setApiKey("");
      setMessage({ kind: "success", text: "已恢复上一版配置" });
      router.refresh();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "恢复失败" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />初审模型供应商</CardTitle>
          <CardDescription>配置 OpenAI 兼容接口。API Key 只在服务端加密保存，页面只显示掩码。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ai-base-url">API 地址</Label>
              <Input id="ai-base-url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.example.com/v1" />
              <p className="text-xs text-muted-foreground">支持带或不带 /v1，系统会自动请求 /chat/completions 和 /models。</p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ai-api-key">API Key</Label>
              <Input id="ai-api-key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={initialConfig?.apiKey ? `已保存：${initialConfig.apiKey}（留空表示不更换）` : "输入 API Key"} autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <Label>默认初审模型</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-full"><SelectValue placeholder="先同步或输入模型" /></SelectTrigger>
                <SelectContent>
                  {models.map((model) => <SelectItem key={model} value={model}>{model}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} placeholder="也可以直接输入模型 ID" className="font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label>思考强度</Label>
              <Select value={reasoningEffort} onValueChange={(value) => setReasoningEffort(value as Config["reasoningEffort"])}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">关闭（速度优先）</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高（质量优先）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ai-timeout">请求超时（秒）</Label>
              <Input id="ai-timeout" type="number" min={5} max={120} value={timeoutSeconds} onChange={(event) => setTimeoutSeconds(event.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div><Label htmlFor="ai-enabled">启用后台配置</Label><p className="text-xs text-muted-foreground">关闭后暂停 AI 初审，不会回退到旧配置。</p></div>
              <Switch id="ai-enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3"><Label htmlFor="ai-models">上游模型列表</Label><Button type="button" variant="outline" size="sm" onClick={syncModels} disabled={busy !== null}><RefreshCw className={`mr-2 h-4 w-4 ${busy === "sync" ? "animate-spin" : ""}`} />同步上游模型</Button></div>
            <textarea id="ai-models" value={modelsText} onChange={(event) => setModelsText(event.target.value)} rows={8} className="border-input bg-background w-full rounded-md border px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="每行一个模型 ID，例如：\nzzzz/deepseek-v4-pro" />
            <p className="text-xs text-muted-foreground">同步后仍可手动增删模型；默认模型必须在列表中，保存时会自动补入。</p>
          </div>

          {message && <div className={`flex items-center gap-2 rounded-md border p-3 text-sm ${message.kind === "success" ? "text-emerald-700" : "text-destructive"}`}>{message.kind === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{message.text}</div>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={busy !== null}><Save className="mr-2 h-4 w-4" />{busy === "save" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />保存中</> : "保存初审配置"}</Button>
            {initialConfig && <Button type="button" variant="outline" onClick={rollback} disabled={busy !== null}><RefreshCw className={`mr-2 h-4 w-4 ${busy === "rollback" ? "animate-spin" : ""}`} />{busy === "rollback" ? "恢复中" : "恢复上一版"}</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
