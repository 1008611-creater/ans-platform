import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, GitBranch, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { WorkflowRunForm } from "@/components/workflows/workflow-run-form";
import { auth } from "@/lib/auth";
import { getPublicDisplayName } from "@/lib/public-identity";
import { extractInputVariables } from "@/domain/workflows/variables";
import { workflowDefinitionSchema } from "@/contracts/workflow";
import { listCredentials } from "@/server/credentials/service";
import { isFavorited } from "@/server/favorites/service";
import { getPublishedWorkflow } from "@/server/workflows/service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const workflow = await getPublishedWorkflow(slug);
  if (!workflow) return { title: "工作流不存在 · ANS" };
  return {
    title: `${workflow.title} · ANS 工作流`,
    description: workflow.summary ?? workflow.description ?? "在 ANS 上运行这个校园 AI 工作流。",
  };
}

/**
 * 工作流详情页。
 *
 * 统一展示：匿名作者、版本、审核状态、输入变量、运行入口、收藏入口与限制说明。
 * 运行表单需要登录，未登录时只展示节点结构和「登录后运行」的引导。
 */
export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workflow = await getPublishedWorkflow(slug);
  if (!workflow) notFound();

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const parsed = workflowDefinitionSchema.safeParse(workflow.publishedDefinition);
  const definition = parsed.success ? parsed.data : null;
  const variables = definition ? extractInputVariables(definition) : [];

  const [credentials, favorited] = await Promise.all([
    userId ? listCredentials(userId).catch(() => []) : Promise.resolve([]),
    userId ? isFavorited(userId, "WORKFLOW", workflow.id) : Promise.resolve(false),
  ]);

  const authorName = getPublicDisplayName(workflow.author);
  const version = workflow.publishedVersion ?? 1;
  const cost = Math.max(1, workflow.estimatedCost);

  return (
    <article className="container max-w-4xl space-y-6 py-10">
      <Link href="/workflows" className="text-sm text-primary">
        返回工作流广场
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">已发布</Badge>
          <Badge variant="outline">v{version}</Badge>
          <Badge variant="outline">{cost} 点/次</Badge>
          <Badge variant="outline">已运行 {workflow.useCount} 次</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{workflow.title}</h1>
        <p className="text-sm text-muted-foreground">
          作者：{authorName} · 内容已通过管理员复核
        </p>
        {workflow.summary && <p className="text-muted-foreground">{workflow.summary}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <FavoriteButton
            targetType="WORKFLOW"
            targetId={workflow.id}
            initialFavorited={favorited}
          />
          <span className="text-xs text-muted-foreground">收藏后可在「我的收藏」里快速找回。</span>
        </div>
      </header>

      {workflow.description && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">使用说明</h2>
          <p className="whitespace-pre-wrap break-words">{workflow.description}</p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <GitBranch className="h-4 w-4" /> 节点结构（共 {definition?.nodes.length ?? 0} 个节点）
        </h2>
        {definition ? (
          <ol className="space-y-2">
            {definition.nodes.map((node) => (
              <li key={node.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{node.id}</span>
                  <Badge variant="outline">{node.type}</Badge>
                  <span className="text-sm font-medium">{node.label}</span>
                  <span className="text-xs text-muted-foreground">
                    超时 {Math.round(node.timeoutMs / 1000)} 秒 · 最多重试 {node.maxRetries} 次
                  </span>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">发布版本的定义暂时无法解析，请联系管理员。</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">运行这个工作流</h2>
        {userId ? (
          <WorkflowRunForm
            slug={workflow.slug}
            variables={variables}
            estimatedCost={cost}
            credentials={credentials.map((credential) => ({
              id: credential.id,
              label: credential.label,
              keyMasked: credential.keyMasked,
            }))}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">登录后即可运行</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                运行需要消耗算力点数，并会把结果保存到你的运行记录里。
              </p>
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(`/workflows/${workflow.slug}`)}`}
                className="inline-flex items-center gap-1 text-sm text-primary underline"
              >
                前往登录 <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-medium">
          <ShieldAlert className="h-4 w-4" /> 使用条件与限制
        </h2>
        <ul className="list-disc space-y-1 ps-5 text-xs text-muted-foreground">
          <li>单次运行消耗 {cost} 点算力；运行失败会自动退回额度。</li>
          <li>单次执行最长 120 秒，每个节点有自己的超时与重试上限。</li>
          <li>工作流只会按已发布的不可变版本执行，作者改动不会影响你正在跑的任务。</li>
          <li>输入内容会随运行记录保存，请不要填写身份证号、住址等敏感信息。</li>
          <li>运行结果由 AI 生成，请自行核对后再用于正式场合。</li>
        </ul>
      </section>

      {definition && (
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer text-sm font-medium">查看输入变量与原始定义</summary>
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">输入变量</p>
              <pre className="overflow-x-auto text-xs">{JSON.stringify(variables, null, 2)}</pre>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">发布版本定义</p>
              <pre className="max-h-96 overflow-auto text-xs">
                {JSON.stringify(definition, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      )}
    </article>
  );
}
