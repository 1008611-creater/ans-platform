"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export type WorkflowEditorMeta = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  estimatedCost: number;
};

export const SAMPLE_WORKFLOW = {
  version: 1,
  maxNodes: 20,
  nodes: [
    {
      id: "draft",
      type: "model",
      label: "生成初稿",
      config: {
        prompt: "请根据以下要求写一份初稿：{{input.topic}}",
        variables: [{ key: "topic", label: "主题", required: true, hint: "例如：校园二手交易平台调研" }],
      },
      timeoutMs: 60000,
      maxRetries: 1,
    },
    {
      id: "polish",
      type: "model",
      label: "润色成稿",
      config: { prompt: "请把下面的内容润色得更清晰、更有条理：\n\n{{draft}}" },
      timeoutMs: 60000,
      maxRetries: 1,
    },
    {
      id: "result",
      type: "output",
      label: "输出结果",
      config: {},
      timeoutMs: 1000,
      maxRetries: 0,
    },
  ],
  edges: [
    { id: "draft-to-polish", from: "draft", to: "polish", mapping: {} },
    { id: "polish-to-result", from: "polish", to: "result", mapping: {} },
  ],
};

type ValidationIssue = { code: string; message: string; path?: string };

/**
 * 工作流创作台。
 *
 * 定义以 JSON 文本编辑，保存前先走 `/api/workflows/validate` 做无环校验，
 * 让作者在提交审核之前就能看到拓扑顺序和具体错误，而不是等运行失败。
 */
export function WorkflowEditor({
  mode,
  initialMeta,
  initialDefinition,
  initialVersion,
}: {
  mode: "create" | "version";
  initialMeta?: Partial<WorkflowEditorMeta>;
  initialDefinition?: unknown;
  initialVersion?: number;
}) {
  const router = useRouter();
  const [meta, setMeta] = useState<WorkflowEditorMeta>({
    slug: initialMeta?.slug ?? "",
    title: initialMeta?.title ?? "",
    summary: initialMeta?.summary ?? "",
    description: initialMeta?.description ?? "",
    estimatedCost: initialMeta?.estimatedCost ?? 1,
  });
  const [text, setText] = useState(() =>
    JSON.stringify(initialDefinition ?? SAMPLE_WORKFLOW, null, 2),
  );
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const parseResult = useMemo(() => {
    try {
      return { definition: JSON.parse(text) as unknown, parseError: "" };
    } catch (cause) {
      return {
        definition: null,
        parseError: cause instanceof Error ? cause.message : "JSON 解析失败",
      };
    }
  }, [text]);

  async function validate() {
    setBusy(true);
    setMessage("");
    setError("");
    setChecked(false);
    try {
      if (parseResult.definition === null) throw new Error(`JSON 格式错误：${parseResult.parseError}`);
      const response = await fetch("/api/workflows/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parseResult.definition),
      });
      const body = await response.json().catch(() => null);
      if (response.ok) {
        setIssues([]);
        setOrder((body?.data?.order ?? []) as string[]);
        setChecked(true);
        setMessage("校验通过，可以保存或提交审核。");
      } else {
        const details = body?.error?.details;
        setIssues(Array.isArray(details) ? (details as ValidationIssue[]) : []);
        setOrder([]);
        setError(body?.error?.message ?? "工作流定义校验未通过。");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "校验失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      if (parseResult.definition === null) throw new Error(`JSON 格式错误：${parseResult.parseError}`);
      const response =
        mode === "create"
          ? await fetch("/api/workflows", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                slug: meta.slug.trim(),
                title: meta.title.trim(),
                summary: meta.summary.trim() || undefined,
                description: meta.description.trim() || undefined,
                estimatedCost: Number(meta.estimatedCost) || 1,
                definition: parseResult.definition,
              }),
            })
          : await fetch(`/api/workflows/${initialMeta?.slug}/versions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ definition: parseResult.definition }),
            });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "保存失败，请稍后重试。");
      if (mode === "create") {
        const slug: string = body?.data?.workflow?.slug ?? meta.slug.trim();
        router.push(`/workflows/mine/${slug}`);
      } else {
        setMessage(`已保存为第 ${body?.data?.version?.version ?? ""} 版草稿，可在提交审核后由管理员复核。`);
        router.refresh();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {mode === "create" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本信息</CardTitle>
            <CardDescription>标识用于生成公开链接，创建后不可修改，请使用小写字母、数字和连字符。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="workflow-slug">标识 *</Label>
              <Input
                id="workflow-slug"
                value={meta.slug}
                placeholder="campus-report-writer"
                onChange={(event) => setMeta((prev) => ({ ...prev, slug: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="workflow-title">标题 *</Label>
              <Input
                id="workflow-title"
                value={meta.title}
                onChange={(event) => setMeta((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="workflow-summary">一句话摘要</Label>
              <Input
                id="workflow-summary"
                maxLength={240}
                value={meta.summary}
                onChange={(event) => setMeta((prev) => ({ ...prev, summary: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="workflow-cost">单次运行消耗算力</Label>
              <Input
                id="workflow-cost"
                type="number"
                min={1}
                max={200}
                value={meta.estimatedCost}
                onChange={(event) =>
                  setMeta((prev) => ({ ...prev, estimatedCost: Number(event.target.value) || 1 }))
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="workflow-description">使用说明</Label>
              <Textarea
                id="workflow-description"
                rows={4}
                value={meta.description}
                onChange={(event) => setMeta((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            工作流定义{mode === "version" ? `（将保存为第 ${(initialVersion ?? 0) + 1} 版）` : ""}
          </CardTitle>
          <CardDescription>
            节点类型支持 prompt、template、model、condition、output。提示词里用 {"{{input.变量名}}"} 引用用户输入，
            用 {"{{节点ID}}"} 引用上游节点结果。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            aria-label="工作流定义 JSON"
            className="min-h-[360px] font-mono text-xs leading-6"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setChecked(false);
              setIssues([]);
              setOrder([]);
            }}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" disabled={busy} onClick={validate}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              校验定义
            </Button>
            <Button disabled={busy || !checked} onClick={save}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {mode === "create" ? "创建草稿" : "保存新版本"}
            </Button>
            {mode === "create" && !checked && (
              <span className="text-xs text-muted-foreground">先校验通过才能保存。</span>
            )}
          </div>

          {parseResult.definition === null && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>JSON 无法解析</AlertTitle>
              <AlertDescription className="break-words">{parseResult.parseError}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>校验未通过</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{error}</p>
                {issues.length > 0 && (
                  <ul className="list-disc space-y-1 ps-5 text-xs">
                    {issues.map((issue, index) => (
                      <li key={`${issue.code}-${index}`}>
                        {issue.path ? `${issue.path}：` : ""}
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          {checked && order.length > 0 && (
            <div className="space-y-2 rounded-lg border p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> 执行顺序（拓扑排序）
              </p>
              <div className="flex flex-wrap gap-2">
                {order.map((nodeId, index) => (
                  <Badge key={nodeId} variant="outline">
                    {index + 1}. {nodeId}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {message && (
            <p role="status" className="text-sm text-muted-foreground">
              {message}
              {mode === "version" && initialMeta?.slug && (
                <>
                  {" "}
                  <Link href={`/workflows/mine/${initialMeta.slug}`} className="text-primary underline">
                    返回我的工作流
                  </Link>
                </>
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
