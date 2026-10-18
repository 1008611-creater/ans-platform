import { getTranslations } from "next-intl/server";
import { marketProductPath } from "@/domain/marketplace/product-route";
import { listRelatedPublishedMarketListings } from "@/server/marketplace/listings";
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
const BLUEPRINT_WORKFLOWS = [
  {
    title: "Agri-Vision 农田病虫害多模态诊断流水线",
    version: "v1.4 · 已发布",
    cost: "3 点/次",
    runs: "1,280 次运行",
    cover: "/images/home/showcase/agri-drone-ai.png",
    desc: "串联无人机遥感切片识别、气象知识库检索与防治处方生成 3 大不可变节点版本。",
    href: "/workflows/new",
  },
  {
    title: "ToonFlow 漫剧剧本拆解与角色三视图生成流",
    version: "v2.1 · 市场在售 (80% 分成)",
    cost: "5 点/次",
    runs: "2,450 次运行",
    cover: "/images/home/showcase/toonflow-studio.png",
    desc: "支持小说章节一键拆解 12 镜分镜提示词，自动锁定角色种子与镜头光影一致性。",
    href: "/workflows/toonflow",
  },
  {
    title: "Scholar-Web 科研主页与论文解读自动编排流",
    version: "v1.2 · 已发布",
    cost: "2 点/次",
    runs: "890 次运行",
    cover: "/images/home/showcase/academic-portal.png",
    desc: "输入 PDF 论文摘要或 ORCID，自动生成双语学术主页结构与精选海报卡片。",
    href: "/market/resume-website",
  },
];

export default async function MyWorkflowsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="container max-w-5xl space-y-8 py-12" data-testid="workflows-mine-guest-preview">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <div className="space-y-1.5">
            <Badge variant="secondary">Immutable Workflow Versioning · 80% 算力分成</Badge>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">我的工作流与版本管理台</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              在 ANS 创建的工作流支持「草稿编排 → 审核冻结 → 不可变版本发布 → 市场挂牌 80% 算力自动分润」。登录即可管理你的私有草稿与线上版本。
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild>
              <Link href={`/login?callbackUrl=${encodeURIComponent("/workflows/mine")}`}>登录管理我的工作流</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/workflows/new">
                <Plus className="me-1.5 h-4 w-4" />
                免登录体验新建画布
              </Link>
            </Button>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">平台官方参考工作流蓝图（可一键克隆编排）</h2>
            <Link href="/market" className="text-sm text-primary hover:underline">前往工作流市场 →</Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {BLUEPRINT_WORKFLOWS.map((item) => (
              <Card key={item.title} className="overflow-hidden transition hover:border-primary/40 hover:shadow-md">
                <div className="aspect-[16/9] w-full overflow-hidden border-b bg-muted">
                  <img src={item.cover} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-xs">{item.version}</Badge>
                    <span className="text-xs font-medium text-primary">{item.cost}</span>
                  </div>
                  <CardTitle className="mt-2 text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs leading-5 text-muted-foreground">{item.desc}</p>
                  <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span>{item.runs}</span>
                    <Link href={item.href} className="font-medium text-primary hover:underline">打开蓝图 →</Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const workflows = await listOwnWorkflows(session.user.id);
  const w = await getTranslations("marketWorkflow");
  const marketOffers = await listRelatedPublishedMarketListings({ workflowIds: workflows.filter(row => row.status === "PUBLISHED").map(row => row.id) });

  return (
    <div className="container max-w-5xl space-y-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/hubs" className="text-sm text-primary">
            {w("backToHub")}
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
            const marketOffer = marketOffers.find(offer => offer.listing.execution?.workflowId === workflow.id && offer.listing.execution.version === workflow.publishedVersion);
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
                        {marketOffer ? <Button asChild variant="outline" size="sm">
                          <Link href={marketProductPath(marketOffer)}>
                            <GitBranch className="me-1.5 h-3.5 w-3.5" />
                            {w("viewPublishedMarket")}
                          </Link>
                        </Button> : <p className="text-sm text-muted-foreground">{w("notListedMarket")}</p>}
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/workflows/mine/${workflow.slug}`}>追加新版本</Link>
                        </Button>
                      </>
                    )}
                  </div>

                  {(workflow.status === "DRAFT" || workflow.status === "REJECTED" || workflow.status === "PUBLISHED" && latestVersion > (workflow.publishedVersion ?? 0)) && (
                    <WorkflowActions slug={workflow.slug} mode="submit" version={latestVersion} />
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
