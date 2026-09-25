import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkflowActions } from "@/components/workflows/workflow-actions";
import { WorkflowReviewStatus } from "@/components/workflows/workflow-review-status";
import { requireAdminPermission } from "@/lib/admin-permissions";
import { getPublicDisplayName } from "@/lib/public-identity";
import { listWorkflowQueue } from "@/server/workflows/service";
import { canPublishAfterReview } from "@/server/workflows/review";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "工作流审核队列 · ANS",
};

/**
 * 工作流审核队列。
 *
 * 与模板审核一致：先看定义和输入变量，再人工复核。管理员不能审核自己的作品。
 */
export default async function WorkflowQueuePage() {
  const admin = await requireAdminPermission("PROMPTS_MANAGE");
  if (!admin) {
    return (
      <div className="container max-w-2xl space-y-4 py-16">
        <h1 className="text-2xl font-bold">工作流审核队列</h1>
        <p className="text-muted-foreground">需要内容管理权限才能查看审核队列。</p>
        <Link href="/admin" className="text-sm text-primary underline">
          返回管理后台
        </Link>
      </div>
    );
  }

  const workflows = await listWorkflowQueue();

  return (
    <div className="container max-w-5xl space-y-6 py-10">
      <Link href="/admin" className="text-sm text-primary">
        返回管理后台
      </Link>
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">工作流审核队列</h1>
        <p className="text-sm text-muted-foreground">
          按待审更新时间展示前 100 项。复核通过后，线上执行的就是这里看到的这一版定义；
          驳回时必须写明理由，作者会据此修改后重新提交。发布前必须有 AI 初审 PASS，
          未通过或服务异常时只能驳回或重新发起初审。
        </p>
      </header>

      {workflows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          暂无待审工作流。
        </p>
      ) : (
        workflows.map((workflow) => {
          const version = workflow.versions[0] ?? null;
          return (
            <Card key={workflow.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{workflow.title}</CardTitle>
                  <Badge variant="outline">v{version?.version ?? 0}</Badge>
                  <Badge variant="outline">{Math.max(1, workflow.estimatedCost)} 点/次</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  作者：{getPublicDisplayName(workflow.author)} · 标识{" "}
                  <span className="font-mono">{workflow.slug}</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                {workflow.summary && (
                  <p className="whitespace-pre-wrap break-words text-sm">
                    摘要：{workflow.summary}
                  </p>
                )}
                {workflow.description && (
                  <p className="whitespace-pre-wrap break-words text-sm">
                    说明：{workflow.description}
                  </p>
                )}
                <details className="rounded-lg border p-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    待发布版本定义（v{version?.version ?? 0}）
                  </summary>
                  <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs">
                    {JSON.stringify(version?.definition ?? null, null, 2)}
                  </pre>
                </details>
                <WorkflowReviewStatus
                  status={workflow.status}
                  reviewScore={workflow.reviewScore}
                  reviewNote={workflow.reviewNote}
                />
                <WorkflowActions
                  slug={workflow.slug}
                  mode="review"
                  selfReview={admin.userId === workflow.authorId}
                  canPublish={canPublishAfterReview(workflow.reviewScore)}
                />
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
