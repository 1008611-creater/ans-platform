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

export default async function WorkflowRunsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="container max-w-2xl space-y-4 py-16">
        <h1 className="text-2xl font-bold">运行记录</h1>
        <p className="text-muted-foreground">查看自己的运行记录需要先登录。</p>
        <Link
          href={`/login?callbackUrl=${encodeURIComponent("/workflows/runs")}`}
          className="text-sm text-primary underline"
        >
          前往登录
        </Link>
      </div>
    );
  }

  const runs = await listWorkflowRuns(session.user.id);

  return (
    <div className="container max-w-4xl space-y-6 py-10">
      <header className="space-y-2">
        <Link href="/workflows" className="text-sm text-primary">
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
