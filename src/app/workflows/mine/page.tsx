import Link from "next/link";
import type { Metadata } from "next";
import { GitBranch, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkflowActions } from "@/components/workflows/workflow-actions";
import { auth } from "@/lib/auth";
import { listOwnWorkflows } from "@/server/workflows/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "我的工作流 · ANS",
  description: "管理你创建的工作流草稿、版本和发布状态。",
};

const STATUS_LABELS: Record<string, { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  DRAFT: { label: "草稿", variant: "secondary" },
  PENDING: { label: "待审核", variant: "outline" },
  PUBLISHED: { label: "已发布", variant: "outline" },
  REJECTED: { label: "已驳回", variant: "destructive" },
};

/**
 * 我的工作流。
 *
 * 状态机：草稿/驳回可编辑并提交审核；待审冻结；已发布可继续追加新版本。
 */
export default async function MyWorkflowsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="container max-w-2xl space-y-4 py-16">
        <h1 className="text-2xl font-bold">我的工作流</h1>
        <p className="text-muted-foreground">查看和管理自己创建的工作流需要先登录。</p>
        <Link
          href={`/login?callbackUrl=${encodeURIComponent("/workflows/mine")}`}
          className="text-sm text-primary underline"
        >
          前往登录
        </Link>
      </div>
    );
  }

  const workflows = await listOwnWorkflows(session.user.id);

  return (
    <div className="container max-w-5xl space-y-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/workflows" className="text-sm text-primary">
            返回工作流广场
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">我的工作流</h1>
        </div>
        <Button asChild>
          <Link href="/workflows/new">
            <Plus className="me-1.5 h-4 w-4" />
            创建工作流
          </Link>
        </Button>
      </header>

      <p className="text-sm text-muted-foreground">
        展示最近 100 个你创建的工作流。草稿和驳回可以继续编辑并提交审核；待审期间正文冻结；
        已发布的工作流可以追加新版本，运行中的同学仍然跑在原来的不可变版本上。
      </p>

      {workflows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          还没有工作流，先创建你的第一条流程。
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {workflows.map((workflow) => {
            const status = STATUS_LABELS[workflow.status] ?? {
              label: workflow.status,
              variant: "secondary" as const,
            };
            const latestVersion = workflow.versions[0]?.version ?? 0;
            const editable = workflow.status === "DRAFT" || workflow.status === "REJECTED";
            return (
              <Card key={workflow.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-lg">
                      <Link href={`/workflows/mine/${workflow.slug}`} className="hover:underline">
                        {workflow.title}
                      </Link>
                    </CardTitle>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  {workflow.summary ? (
                    <p className="text-sm text-muted-foreground">{workflow.summary}</p>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">v{latestVersion || 1}</Badge>
                    <Badge variant="outline">{Math.max(1, workflow.estimatedCost)} 点/次</Badge>
                    <span>共 {workflow.versions.length} 个版本</span>
                    <span>· 已运行 {workflow.useCount} 次</span>
                  </div>

                  {workflow.status === "PENDING" && (
                    <p className="text-sm text-muted-foreground">
                      已提交审核，管理员复核通过后会公开。复核期间定义不会再变化。
                    </p>
                  )}
                  {workflow.status === "REJECTED" && (
                    <p className="text-sm text-destructive">
                      审核未通过。修改定义后可以重新提交，理由见管理员的复核记录。
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {editable && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/workflows/mine/${workflow.slug}`}>编辑草稿</Link>
                      </Button>
                    )}
                    {workflow.status === "PUBLISHED" && (
                      <>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/workflows/${workflow.slug}`}>
                            <GitBranch className="me-1.5 h-3.5 w-3.5" />
                            查看公开详情
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/workflows/mine/${workflow.slug}`}>追加新版本</Link>
                        </Button>
                      </>
                    )}
                  </div>

                  {(workflow.status === "DRAFT" || workflow.status === "REJECTED") && (
                    <WorkflowActions slug={workflow.slug} mode="submit" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
