import Link from "next/link";
import type { Metadata } from "next";
import { WorkflowEditor } from "@/components/workflows/workflow-editor";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "创建工作流 · ANS",
  description: "用节点编排一条可复用的校园 AI 工作流。",
};

/**
 * 创建工作流。
 *
 * 编辑器会先让作者校验定义（无环、节点合法），通过后才能保存为草稿，
 * 避免把跑不通的定义带进审核队列。
 */
export default async function NewWorkflowPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="container max-w-2xl space-y-4 py-16">
        <h1 className="text-2xl font-bold">创建工作流</h1>
        <p className="text-muted-foreground">
          创作工作流需要登录，并且账号需要处于正常状态。
        </p>
        <Link
          href={`/login?callbackUrl=${encodeURIComponent("/workflows/new")}`}
          className="text-sm text-primary underline"
        >
          前往登录
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl space-y-6 py-10">
      <Link href="/workflows/mine" className="text-sm text-primary">
        返回我的工作流
      </Link>
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">创建工作流</h1>
        <p className="text-sm text-muted-foreground">
          保存后会生成第 1 版草稿。草稿不会公开，提交审核并通过后才会出现在工作流广场。
        </p>
      </header>
      <WorkflowEditor mode="create" />
    </div>
  );
}
