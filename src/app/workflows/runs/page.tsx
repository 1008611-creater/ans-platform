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
    id: "run-agri-uav-98f2a1c4",
    title: "Agri-Vision 农田病虫害多模态诊断流水线",
    status: "已完成 (SUCCEEDED)",
    models: "Qwen-VL-Max, DeepSeek-V3",
    tokens: "1,840 Tokens",
    elapsed: "3.6 秒",
    cost: "3 点",
    cover: "/images/home/showcase/agri-drone-ai.png",
    output: '{\n  "crop": "冬小麦 (灌浆期)",\n  "detected": "条锈病中度感染 (置信度 96.4%)",\n  "prescription": "建议 24h 内无人机喷洒戊唑醇·嘧菌酯悬浮剂 15ml/亩"\n}',
    href: "/competitions/agrihackathon",
  },
  {
    id: "run-toonflow-44d8e0b2",
    title: "ToonFlow 漫剧全自动分镜与角色三视图生成流",
    status: "已完成 (SUCCEEDED)",
    models: "DeepSeek-R1, Flux-Pro-4K",
    tokens: "3,120 Tokens",
    elapsed: "6.2 秒",
    cost: "5 点",
    cover: "/images/home/showcase/toonflow-studio.png",
    output: '[\n  { "shot": 1, "camera": "Low-angle wide shot", "prompt": "Cyberpunk greenhouse at dusk, glowing holographic wheat..." },\n  { "shot": 2, "camera": "Close-up tracking", "prompt": "Young researcher inspecting drone telemetry visor..." }\n]',
    href: "/workflows/toonflow",
  },
  {
    id: "run-scholar-19c3f7a8",
    title: "Scholar-Web 科研主页与论文高颜值展示生成流",
    status: "已完成 (SUCCEEDED)",
    models: "DeepSeek-V3",
    tokens: "1,250 Tokens",
    elapsed: "2.4 秒",
    cost: "2 点",
    cover: "/images/home/showcase/academic-portal.png",
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
            <Badge variant="secondary">Node-Level Telemetry · 失败自动退费</Badge>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <History className="h-6 w-6 text-primary" /> 工作流运行记录与节点审计
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              每次工作流执行均实时记录模型调用次数、Token 消耗、耗时与结构化输出；若节点超时或执行失败，预扣算力额度将自动原路退回。
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild>
              <Link href={`/login?callbackUrl=${encodeURIComponent("/workflows/runs")}`}>登录查看我的运行记录</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/market">去市场体验工作流</Link>
            </Button>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">实时节点执行日志与输出回执样例</h2>
          <div className="grid gap-5 lg:grid-cols-3">
            {SAMPLE_RUNS.map((run) => (
              <Card key={run.id} className="overflow-hidden">
                <div className="aspect-[16/9] w-full overflow-hidden border-b bg-muted">
                  <img src={run.cover} alt={run.title} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-xs">{run.status}</Badge>
                    <span className="font-mono text-xs text-muted-foreground">{run.id}</span>
                  </div>
                  <CardTitle className="mt-2 text-base">{run.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    模型 {run.models} · {run.tokens} · 耗时 {run.elapsed} · 消耗 {run.cost}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-mono text-xs">
                    {run.output}
                  </pre>
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
        </section>
      </div>
    );
  }

  const runs = await listWorkflowRuns(session.user.id);

  return (
    <div className="container max-w-4xl space-y-6 py-10">
      <header className="space-y-2">
        <Link href="/workflows" className="text-sm text-foreground underline underline-offset-4">
          返回工作流广场
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
          还没有运行记录，去工作流广场找一条试试。
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
            return (
              <Card key={run.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      <Link href={`/workflows/${run.workflow.slug}`} className="hover:underline">
                        {run.workflow.title}
                      </Link>
                    </CardTitle>
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
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">输出摘要</p>
                      <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/30 p-3 text-xs">
                        {summary}
                      </pre>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/workflows/${run.workflow.slug}`}>
                        <RotateCcw className="me-1.5 h-3.5 w-3.5" />
                        再次运行
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
