import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Clock3, Coins, FolderOpen, Heart, Users, Zap } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLevelProgress, formatLevel } from "@/lib/level";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DisplayNameEditor } from "@/components/workspace/display-name-editor";

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

  const query = searchParams ? await searchParams : {};
  const rawCursor = Array.isArray(query.runsCursor) ? query.runsCursor[0] : query.runsCursor;
  const runsCursor = rawCursor && rawCursor.length <= 128 ? rawCursor : undefined;
  const pageSize = 20;

  const [user, runRows, runCount, memberships, favorites, recentRuns] = await Promise.all([
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
    db.templateFavorite.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        template: { select: { slug: true, title: true, summary: true, status: true } },
      },
    }),
    db.run.findMany({
      where: { userId: session.user.id, status: "SUCCEEDED" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 12,
      select: { template: { select: { slug: true, title: true } } },
    }),
  ]);

  const hasMoreRuns = runRows.length > pageSize;
  const runs = hasMoreRuns ? runRows.slice(0, pageSize) : runRows;
  const nextRunsCursor = hasMoreRuns ? runs[runs.length - 1]?.id : undefined;
  const favoriteTemplates = favorites.filter((item) => item.template.status === "PUBLISHED");
  const recentTemplates = Array.from(
    new Map(recentRuns.map((item) => [item.template.slug, item.template])).values()
  ).slice(0, 6);

  const xp = user?.xp ?? 0;
  const progress = getLevelProgress(xp);
  const displayName = user?.nickname?.trim() || "匿名同学";

  return (
    <div className="container py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">工作台</h1>
        <p className="mt-2 text-muted-foreground">
          你好，{displayName} · {formatLevel(xp)}
          <DisplayNameEditor current={displayName} />
        </p>
      </header>

      <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5" /> 算力余额
            </CardDescription>
            <CardTitle className="text-2xl">
              {(user?.quotaPoints ?? 0).toLocaleString()}
              <span className="ms-1 text-sm font-normal text-muted-foreground">点</span>
            </CardTitle>
          </CardHeader>
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

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Heart className="h-4 w-4" /> 我的收藏
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/templates">发现更多模板</Link>
          </Button>
        </div>
        {favoriteTemplates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              还没有收藏模板。在模板详情页点击“收藏”即可保存。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {favoriteTemplates.map((item) => (
              <Card key={item.template.slug}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    <Link href={"/templates/" + item.template.slug} className="hover:underline">
                      {item.template.title}
                    </Link>
                  </CardTitle>
                  {item.template.summary && <CardDescription className="line-clamp-2">{item.template.summary}</CardDescription>}
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Clock3 className="h-4 w-4" /> 最近使用
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/templates">去模板广场</Link>
          </Button>
        </div>
        {recentTemplates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              运行过的模板会显示在这里。
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-wrap gap-2">
            {recentTemplates.map((template) => (
              <Button key={template.slug} asChild variant="secondary" size="sm">
                <Link href={"/templates/" + template.slug}>{template.title}</Link>
              </Button>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FolderOpen className="h-4 w-4" /> 我的运行
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/templates">去模板广场</Link>
          </Button>
        </div>

        {runs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              还没有运行记录。去模板广场挑一个模板试试吧。
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
                        <Link
                          href={"/templates/" + r.template.slug}
                          className="truncate font-medium hover:underline"
                        >
                          {r.template.title}
                        </Link>
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

      <section>
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
  );
}
