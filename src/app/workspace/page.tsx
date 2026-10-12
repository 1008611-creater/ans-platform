import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Activity, Coins, FolderOpen, Heart, Users, Zap } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLevelProgress, formatLevel } from "@/lib/level";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DisplayNameEditor } from "@/components/workspace/display-name-editor";
import { CreationTools } from "@/components/workspace/creation-tools";
import { PageHeading } from "@/components/layout/page-heading";

export const metadata = {
  title: "工作台 · ANS",
  description: "正在运行的任务、产出库、算力余额与我的团队。",
};

const RUN_STATUS_LABEL: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  QUEUED: { text: "排队中", variant: "outline" },
  RUNNING: { text: "运行中", variant: "secondary" },
  SUCCEEDED: { text: "已完成", variant: "default" },
  FAILED: { text: "失败", variant: "destructive" },
  CANCELLED: { text: "已取消", variant: "outline" },
};

type WorkspacePageProps = {
  searchParams?: Promise<{ runsCursor?: string | string[] }>;
};

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/workspace");
  }

  const retired = await getTranslations("retirement");
  const computeCopy = await getTranslations("product.computeHistory");
  const product = await getTranslations("product");
  const quotaCopy = await getTranslations("product.quotaHistory");
  const query = searchParams ? await searchParams : {};
  const rawCursor = Array.isArray(query.runsCursor) ? query.runsCursor[0] : query.runsCursor;
  const runsCursor = rawCursor && rawCursor.length <= 128 ? rawCursor : undefined;
  const pageSize = 20;

  const [user, runRows, runCount, memberships] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { xp: true, quotaPoints: true, nickname: true },
    }),
    db.run.findMany({
      where: { userId: session.user.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(runsCursor ? { cursor: { id: runsCursor }, skip: 1 } : {}),
      take: pageSize + 1,
      select: {
        id: true,
        status: true,
        costPoints: true,
        outputText: true,
        error: true,
        createdAt: true,
        template: { select: { title: true, slug: true } },
      },
    }),
    db.run.count({ where: { userId: session.user.id } }),
    db.teamMember.findMany({
      where: { userId: session.user.id, status: "ACTIVE" },
      select: {
        role: true,
        quotaAllowance: true,
        quotaUsed: true,
        team: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  const hasMoreRuns = runRows.length > pageSize;
  const runs = hasMoreRuns ? runRows.slice(0, pageSize) : runRows;
  const nextRunsCursor = hasMoreRuns ? runs[runs.length - 1]?.id : undefined;
  const xp = user?.xp ?? 0;
  const progress = getLevelProgress(xp);
  const displayName = user?.nickname?.trim() || "匿名同学";

  return (
    <div className="ans-product-container ans-page-content ans-workspace-page">
      <PageHeading title="工作台"
        description={<span className="ans-workspace-greeting">你好，{displayName} · {formatLevel(xp)}
          <DisplayNameEditor current={displayName} /></span>}
        actions={<><Button asChild><Link href="/projects">{product("myProjects")}</Link></Button><Button asChild variant="outline"><Link href="/explore">{product("nav.explore")}</Link></Button></>} />

      <CreationTools />
      <section className="ans-account-summary">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5" /> 算力余额
            </CardDescription>
            <CardTitle className="text-2xl">
              {(user?.quotaPoints ?? 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}
              <span className="ms-1 text-sm font-normal text-muted-foreground">点</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0"><Button asChild variant="outline" size="sm"><Link href="/workspace/credits">{quotaCopy("entry")}</Link></Button><Button asChild variant="ghost" size="sm"><Link href="/workspace/compute">{computeCopy("entry")}</Link></Button></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> 经验 / 等级
            </CardDescription>
            <CardTitle className="text-2xl">
              {xp.toLocaleString()}
              <span className="ms-1 text-sm font-normal text-muted-foreground">XP</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: String(Math.round(progress.progress * 100)) + "%" }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {progress.nextLevel
                ? "距" + progress.nextLevel.nameZh + "还需 " + progress.xpToNext.toLocaleString() + " XP"
                : "已达最高等级"}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href="/community">社区签到 · 流水与贡献榜</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> 运行次数
            </CardDescription>
            <CardTitle className="text-2xl">{runCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> 我的团队
            </CardDescription>
            <CardTitle className="text-2xl">{memberships.length}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <div className="ans-workspace-records">
      <section className="ans-workspace-section ans-workspace-runs">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FolderOpen className="h-4 w-4" /> {retired("historyTitle")}
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/workflows/runs">{retired("workflowRuns")}</Link>
          </Button>
        </div>

        {runs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {retired("noHistory")}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {runs.map((r) => {
                  const st = RUN_STATUS_LABEL[r.status] ?? { text: r.status, variant: "outline" as const };
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{r.template.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.createdAt.toLocaleString("zh-CN")}
                        </p>
                        {r.outputText && <details className="mt-2"><summary className="cursor-pointer text-sm">查看结果</summary><pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words text-sm">{r.outputText}</pre></details>}
                        {r.error && <p className="mt-2 text-sm text-destructive">{r.error}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted-foreground">-{r.costPoints} 点</span>
                        <Badge variant={st.variant}>{st.text}</Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
        {(hasMoreRuns || runsCursor) && (
          <div className="mt-4 flex gap-2">
            {hasMoreRuns && nextRunsCursor && (
              <Button asChild variant="outline" size="sm">
                <Link href={"/workspace?runsCursor=" + encodeURIComponent(nextRunsCursor)}>下一页</Link>
              </Button>
            )}
            {runsCursor && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/workspace">回到第一页</Link>
              </Button>
            )}
          </div>
        )}
      </section>
      <section className="ans-workspace-section"><h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Heart className="h-4 w-4" />{retired("favoritesTitle")}</h2><p className="text-sm leading-7 text-muted-foreground">{retired("favoritesNote")}</p><Button asChild variant="outline" className="mt-4"><Link href="/collection">{retired("openFavorites")}</Link></Button></section>
      <section className="ans-workspace-section ans-workspace-teams">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-4 w-4" /> 团队与算力
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/teams">团队管理</Link>
          </Button>
        </div>

        {memberships.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              还没有加入团队。加入后可使用团队比赛算力包。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memberships.map((m) => (
              <Card key={m.team.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    <Link href={"/teams/" + m.team.slug} className="hover:underline">
                      {m.team.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {m.role === "OWNER" ? "队长" : m.role === "ADMIN" ? "管理员" : "成员"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  队内额度 {m.quotaUsed.toLocaleString()} / {m.quotaAllowance.toLocaleString()} 点
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
