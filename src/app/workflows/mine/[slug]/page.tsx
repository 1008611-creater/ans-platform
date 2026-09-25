import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkflowActions } from "@/components/workflows/workflow-actions";
import { WorkflowEditor } from "@/components/workflows/workflow-editor";
import { WorkflowReviewStatus } from "@/components/workflows/workflow-review-status";
import { auth } from "@/lib/auth";
import { WorkflowServiceError, getWorkflowForEditor } from "@/server/workflows/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "编辑工作流 · ANS",
};

/**
 * 作者编辑页。
 *
 * 展示当前最新版本的定义，允许继续追加新版本（版本一旦创建就不可修改）。
 * 草稿与驳回状态可以直接提交审核；待审期间编辑器只读提示，避免审核对象漂移。
 */
export default async function EditWorkflowPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="container max-w-2xl space-y-4 py-16">
        <h1 className="text-2xl font-bold">编辑工作流</h1>
        <p className="text-muted-foreground">编辑工作流需要先登录。</p>
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(`/workflows/mine/${slug}`)}`}
          className="text-sm text-primary underline"
        >
          前往登录
        </Link>
      </div>
    );
  }

  let workflow;
  try {
    workflow = await getWorkflowForEditor(slug, session.user.id);
  } catch (error) {
    if (error instanceof WorkflowServiceError && error.code === "NOT_FOUND") notFound();
    if (error instanceof WorkflowServiceError) {
      return (
        <div className="container max-w-2xl space-y-4 py-16">
          <h1 className="text-2xl font-bold">编辑工作流</h1>
          <p className="text-muted-foreground">{error.message}</p>
          <Link href="/workflows/mine" className="text-sm text-primary underline">
            返回我的工作流
          </Link>
        </div>
      );
    }
    throw error;
  }

  const latest = workflow.versions[0] ?? null;
  const isOwner = workflow.authorId === session.user.id;

  return (
    <div className="container max-w-4xl space-y-6 py-10">
      <Link href="/workflows/mine" className="text-sm text-primary">
        返回我的工作流
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{workflow.title}</h1>
          <Badge variant={workflow.status === "PUBLISHED" ? "outline" : "secondary"}>
            {workflow.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          标识 <span className="font-mono">{workflow.slug}</span> · 当前最新版本 v
          {latest?.version ?? 0} · {Math.max(1, workflow.estimatedCost)} 点/次
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/workflows/${workflow.slug}`} className="text-sm text-primary underline">
            查看公开详情
          </Link>
          {workflow.status === "PUBLISHED" && workflow.publishedVersion !== null && (
            <span className="text-sm text-muted-foreground">
              线上运行的是 v{workflow.publishedVersion}
            </span>
          )}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">审核状态</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkflowReviewStatus
            status={workflow.status}
            reviewScore={workflow.reviewScore}
            reviewNote={workflow.reviewNote}
          />
        </CardContent>
      </Card>

      {workflow.status === "PENDING" && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">已提交审核</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            复核期间不能再追加版本。管理员通过后会公开，被驳回则可以继续修改。
            AI 初审未通过时会被退回，请按初审说明修改后重新提交。
          </CardContent>
        </Card>
      )}

      <WorkflowEditor
        mode="version"
        initialMeta={{
          slug: workflow.slug,
          title: workflow.title,
          summary: workflow.summary ?? "",
          description: workflow.description ?? "",
          estimatedCost: workflow.estimatedCost,
        }}
        initialDefinition={latest?.definition ?? undefined}
        initialVersion={latest?.version ?? 0}
      />

      {(workflow.status === "DRAFT" || workflow.status === "REJECTED") && isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">提交审核</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              提交的是当前最新版本。管理员复核通过后，工作流才会出现在工作流广场。
            </p>
            <WorkflowActions slug={workflow.slug} mode="submit" />
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">版本历史</h2>
        <p className="text-sm text-muted-foreground">
          每个版本创建后都不可修改，运行记录始终指向当时执行的版本。
        </p>
        <ul className="space-y-2">
          {workflow.versions.map((version) => (
            <li
              key={version.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm"
            >
              <Badge variant="secondary">v{version.version}</Badge>
              <span className="text-muted-foreground">
                {version.createdAt.toISOString().slice(0, 19).replace("T", " ")} UTC
              </span>
              {workflow.publishedVersion === version.version && (
                <Badge variant="outline">当前线上版本</Badge>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
