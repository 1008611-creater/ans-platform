"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type ModelCredentialSummary = {
  id: string;
  label: string;
  baseUrl: string;
  keyMasked: string;
  active: boolean;
};

const MAX_CREDENTIALS = 5;

/**
 * 自带模型 Key（BYOK）管理。
 *
 * 明文只在提交那一刻存在于内存里，服务端加密保存；之后所有读取路径都只返回掩码，
 * 因此这里也永远无法把 Key 显示回来。
 */
export function ModelCredentials({
  initialCredentials,
}: {
  initialCredentials: ModelCredentialSummary[];
}) {
  const router = useRouter();
  const [credentials, setCredentials] = useState(initialCredentials);
  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const full = credentials.length >= MAX_CREDENTIALS;

  async function create() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/user/model-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), baseUrl: baseUrl.trim(), apiKey: apiKey.trim() }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "绑定失败，请稍后重试。");
      const created = body?.data?.credential as ModelCredentialSummary | undefined;
      if (created) setCredentials((prev) => [created, ...prev]);
      setLabel("");
      setBaseUrl("");
      setApiKey("");
      setMessage("已绑定。运行工作流时可以在「模型额度来源」里选择它。");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "绑定失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(credential: ModelCredentialSummary) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/user/model-credentials/${credential.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !credential.active }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "更新失败，请稍后重试。");
      const updated = body?.data?.credential as ModelCredentialSummary | undefined;
      if (updated) {
        setCredentials((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "更新失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/user/model-credentials/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message ?? "解绑失败，请稍后重试。");
      }
      setCredentials((prev) => prev.filter((item) => item.id !== id));
      setMessage("已解绑。");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "解绑失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" /> 自带模型 Key
        </CardTitle>
        <CardDescription>
          绑定你自己的模型接口后，运行工作流时可以不走平台模型池。Key 在服务端加密保存，
          页面只会显示掩码；最多绑定 {MAX_CREDENTIALS} 个。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {credentials.length > 0 && (
          <ul className="space-y-3">
            {credentials.map((credential) => (
              <li
                key={credential.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{credential.label}</span>
                    <Badge variant={credential.active ? "outline" : "secondary"}>
                      {credential.active ? "启用中" : "已停用"}
                    </Badge>
                  </div>
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    {credential.baseUrl} · {credential.keyMasked}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => toggleActive(credential)}
                  >
                    {credential.active ? "停用" : "启用"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={busy}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>解绑「{credential.label}」？</AlertDialogTitle>
                        <AlertDialogDescription>
                          解绑后无法恢复，使用这个 Key 的工作流会回退到平台模型池。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(credential.id)}>
                          确认解绑
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        )}

        {full ? (
          <p className="text-sm text-muted-foreground">
            已达到 {MAX_CREDENTIALS} 个上限，先解绑一个再添加。
          </p>
        ) : (
          <div className="space-y-4 rounded-lg border p-4">
            <p className="text-sm font-medium">添加一个凭证</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="credential-label">名称 *</Label>
                <Input
                  id="credential-label"
                  maxLength={40}
                  placeholder="我的实验室额度"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="credential-base-url">接口地址 *</Label>
                <Input
                  id="credential-base-url"
                  placeholder="https://api.example.com/v1"
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="credential-api-key">API Key *</Label>
                <Input
                  id="credential-api-key"
                  type="password"
                  autoComplete="off"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  保存后不再显示明文，只显示末四位。请确认这是你有权使用的 Key。
                </p>
              </div>
            </div>
            <Button
              disabled={busy || !label.trim() || !baseUrl.trim() || apiKey.trim().length < 8}
              onClick={create}
            >
              {busy ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : <Plus className="me-1.5 h-4 w-4" />}
              绑定
            </Button>
          </div>
        )}

        {message && (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
