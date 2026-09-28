import Link from "next/link";
import type { Metadata } from "next";
import { GitBranch, ListChecks, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPublicDisplayName } from "@/lib/public-identity";
import { listPublishedWorkflows } from "@/server/workflows/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "工作流广场",
  description: "按节点编排的校园 AI 工作流，填好输入即可一次跑完。",
};

/**
 * 工作流广场。
 *
 * 只展示已发布且存在发布版本的工作流；作者一律用匿名昵称，
 * 与 Prompt、模板保持同一套公开身份规则。
 */
export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";

  const workflows = await listPublishedWorkflows({ query: query || undefined, take: 24 });

  return (
    <div className="container space-y-8 py-10">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <GitBranch className="h-4 w-4" />
          <span>ANS 工作流广场</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">把多步任务交给一条工作流</h1>
        <p className="max-w-2xl text-muted-foreground">
          工作流由若干节点按顺序串起来：模型调用、模板填充、条件判断和输出整理。你只需要填一次输入，
          系统会按顺序跑完并把每一步的结果保存下来。
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <form action="/workflows" className="flex items-center gap-2">
            <Input
              name="q"
              defaultValue={query}
              placeholder="搜索工作流标题或摘要"
              className="w-56"
              aria-label="搜索工作流"
            />
            <Button type="submit" variant="outline" size="sm">
              搜索
            </Button>
          </form>
          <Button asChild variant="outline" size="sm">
            <Link href="/workflows/mine">我的工作流</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/workflows/runs">
              <ListChecks className="me-1.5 h-3.5 w-3.5" />
              运行记录
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/workflows/new">
              <Sparkles className="me-1.5 h-3.5 w-3.5" />
              创建工作流
            </Link>
          </Button>
        </div>
      </header>

      {workflows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {query
                ? "没有匹配的工作流，换个关键词试试。"
                : "还没有已发布的工作流。工作流须经管理员复核后才会公开。"}
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/workflows/new">创建第一个工作流</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => {
            const latestVersion = workflow.versions[0]?.version ?? 1;
            return (
              <Link key={workflow.id} href={`/workflows/${workflow.slug}`}>
                <Card className="h-full transition-colors hover:border-primary/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{workflow.title}</CardTitle>
                      <GitBranch aria-hidden className="h-5 w-5 shrink-0 text-muted-foreground" />
                    </div>
                    {workflow.summary ? (
                      <CardDescription className="line-clamp-2">{workflow.summary}</CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2 pt-0 text-xs text-muted-foreground">
                    <Badge variant="secondary">v{latestVersion}</Badge>
                    <Badge variant="outline">{Math.max(1, workflow.estimatedCost)} 点/次</Badge>
                    <span>{getPublicDisplayName(workflow.author)}</span>
                    <span>· 已运行 {workflow.useCount} 次</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
