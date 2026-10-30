import Link from "next/link";
import type { Metadata } from "next";
import { History, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RunCancelButton } from "@/components/workflows/run-cancel-button";
import { auth } from "@/lib/auth";
import { listWorkflowRuns } from "@/server/workflows/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "运行记录 · ANS",
  description: "查看你运行过的工作流、逐节点结果和失败原因。",
};

const STATUS_LABELS: Record<string, { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  QUEUED: { label: "排队中", variant: "secondary" },
  RUNNING: { label: "执行中", variant: "secondary" },
  SUCCEEDED: { label: "已完成", variant: "outline" },
  FAILED: { label: "失败", variant: "destructive" },
  CANCELLED: { label: "已取消", variant: "outline" },
};

function outputSummary(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 400 ? `${text.slice(0, 400)}…` : text;
}

function elapsedText(startedAt: Date | null, finishedAt: Date | null): string {
  if (!startedAt) return "尚未开始";
  const end = finishedAt ? finishedAt.getTime() : Date.now();
  const seconds = Math.max(0, Math.round((end - startedAt.getTime()) / 1000));
  return `${seconds} 秒`;
}

/**
 * 运行记录与复用入口。
 *
 * 每条记录都能一键回到对应工作流再跑一次，这是「发现 → 运行 → 收藏 → 复用」里
 * 复用环节最短的路径。
 */
function tokenText(value: number | null): string | null {
  return value === null ? null : value.toLocaleString("zh-CN");
}

const SAMPLE_RUNS = [
  {
    id: "sample-agri-uav",
    badge: "📖 范例 #1",
    title: "Agri-Vision 农田病虫害多模态诊断流水线",
    status: "参考样例",
    models: "Qwen-VL-Max, DeepSeek-V3",
    tokens: "1,840 Tokens",
    elapsed: "3.6 秒",
    cost: "3 点",
    cover: "/competitions/agrihackathon/gitglow-hub.webp",
    output: '{\n  "crop": "冬小麦 (灌浆期)",\n  "detected": "条锈病中度感染 (置信度 96.4%)",\n  "prescription": "建议 24h 内无人机喷洒戊唑醇·嘧菌酯悬浮剂 15ml/亩"\n}',
    href: "/competitions/agrihackathon",
  },
  {
    id: "sample-canvas",
    badge: "📖 范例 #2",
    title: "CAUAI 无限画布多模态视觉与视频生成流",
    status: "参考样例",
    models: "DeepSeek-R1, Flux-Pro-4K",
    tokens: "3,120 Tokens",
    elapsed: "6.2 秒",
    cost: "5 点",
    cover: "/catalog/ans-pro-v1/infinite-canvas.webp",
    output: '[\n  { "shot": 1, "camera": "Low-angle wide shot", "prompt": "Greenhouse at dusk, drone inspection..." },\n  { "shot": 2, "camera": "Close-up tracking", "prompt": "Researcher inspecting leaf lesion telemetry..." }\n]',
    href: "https://hb.cauai.fun/",
  },
  {
    id: "sample-scholar",
    badge: "📖 范例 #3",
    title: "Scholar-Web 科研主页与论文高颜值展示生成流",
    status: "参考样例",
    models: "DeepSeek-V3",
    tokens: "1,250 Tokens",
    elapsed: "2.4 秒",
    cost: "2 点",
    cover: "/catalog/ans-pro-v1/magic-resume.webp",
    output: "# Dr. Lin Lab · Smart Agriculture & UAV Vision\n- Featured Publication: Multi-Spectral Crop Disease Detection (CVPR Agri-Workshop)\n- Open Dataset: CAU-AgriUAV-2026 (12,000 annotated frames)",
    href: "/market/resume-website",
  },
];

export default async function WorkflowRunsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="container max-w-5xl space-y-8 py-12" data-testid="workflows-runs-guest-preview">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <div className="space-y-1.5">
            <Badge variant="secondary">当前未登录 · 真实运行记录需登录后查看</Badge>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <History className="h-6 w-6 text-primary" /> 工作流运行记录
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              登录后可查看你运行过的工作流、Token 消耗与结构化输出；若节点超时或执行失败，预扣积分将自动退回。
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild>
              <Link href={`/login?callbackUrl=${encodeURIComponent("/workflows/runs")}`}>登录查看我的运行记录</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/market">去工具与工作流市场</Link>
            </Button>
          </div>
        </div>

        <details className="group rounded-xl border bg-card p-5">
          <summary className="cursor-pointer list-none font-semibold flex items-center justify-between">
            <span>📖 运行记录与输出回执范例（3 条）</span>
            <span className="text-xs font-normal text-muted-foreground group-open:hidden">▾</span>
          </summary>
          <div className="mt-4 grid gap-5 lg:grid-cols-3">
            {SAMPLE_RUNS.map((run) => (
              <Card key={run.id} className="group/card overflow-hidden">
                <div className="aspect-[16/9] w-full overflow-hidden border-b bg-muted">
                  <img src={run.cover} alt={run.title} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-xs">{run.badge}</Badge>
                    <span className="text-xs text-muted-foreground">{run.cost}</span>
                  </div>
                  <CardTitle className="mt-2 text-base">{run.title}</CardTitle>
                  <p className="hidden text-xs text-muted-foreground group-hover/card:block">
                    模型 {run.models} · {run.tokens} · 耗时 {run.elapsed}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <details className="rounded-md border bg-muted/20 p-2 text-xs">
                    <summary className="cursor-pointer font-medium text-muted-foreground">查看结构化输出样例</summary>
                    <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-2 font-mono text-xs">
                      {run.output}
                    </pre>
                  </details>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={run.href}>
                      <RotateCcw className="me-1.5 h-3.5 w-3.5" />
                      体验该工作流
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      </div>
    );
  }

  const runs = await listWorkflowRuns(session.user.id);

  return (
    <div className="container max-w-4xl space-y-6 py-10">
      <header className="space-y-2">
        <Link href="/market" className="text-sm text-foreground underline underline-offset-4">
          返回工具与工作流市场
        </Link>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <History className="h-6 w-6" /> 运行记录
        </h1>
        <p className="text-sm text-muted-foreground">
          最近 50 次运行。失败的运行会自动退回额度，并在这里给出可读的错误原因。
        </p>
      </header>

      {runs.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          还没有运行记录，去 <Link href="/market" className="text-primary underline">工具与工作流市场</Link> 找一条试试。
        </p>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => {
            const status = STATUS_LABELS[run.status] ?? {
              label: run.status,
              variant: "secondary" as const,
            };
            const summary = outputSummary(run.output);
            const cancellable = run.status === "QUEUED" || run.status === "RUNNING";
            const runAgainHref =
              run.workflow.slug === "ans-portfolio-website"
                ? "/market/resume-website"
                : run.workflow.authorId === session.user.id
                  ? `/workflows/mine/${run.workflow.slug}`
                  : `/market?q=${encodeURIComponent(run.workflow.title)}`;
            return (
              <Card key={run.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base">{run.workflow.title}</CardTitle>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{run.createdAt.toISOString().slice(0, 19).replace("T", " ")} UTC</span>
                    {run.audit?.models.length ? <span>· 模型 {run.audit.models.join(", ")}</span> : null}
                    {run.audit?.modelCalls ? <span>· 模型调用 {run.audit.modelCalls} 次</span> : null}
                    {tokenText(run.audit?.tokenUsage.totalTokens ?? null) && (
                      <span>· Token {tokenText(run.audit?.tokenUsage.totalTokens ?? null)}</span>
                    )}
                    {run.audit?.reasoningEffort && run.audit.reasoningEffort !== "none" ? (
                      <span>· 思考强度 {run.audit.reasoningEffort}</span>
                    ) : null}
                    <span>· 耗时 {elapsedText(run.startedAt, run.finishedAt)}</span>
                    <span>· 消耗 {run.costPoints} 点</span>
                    <span>· 编号 {run.id.slice(0, 8)}…</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {run.error && (
                    <p className="break-words rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {run.error}
                    </p>
                  )}
                  {summary && (
                    <details className="space-y-1 rounded-md border bg-muted/20 p-2.5">
                      <summary className="cursor-pointer text-xs font-medium text-muted-foreground">查看输出摘要</summary>
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/30 p-3 text-xs">
                        {summary}
                      </pre>
                    </details>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button asChild variant="outline" size="sm">
                      <Link href={runAgainHref}>
                        <RotateCcw className="me-1.5 h-3.5 w-3.5" />
                        查看工作流
                      </Link>
                    </Button>
                    {cancellable && <RunCancelButton runId={run.id} />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
