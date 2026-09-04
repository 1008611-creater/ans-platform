import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Coins, FolderOpen, Users, Zap } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLevelProgress, formatLevel } from "@/lib/level";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

export default async function WorkspacePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/workspace");
  }

  const [user, runs, memberships] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { xp: true, quotaPoints: true, nickname: true, name: true },
    }),
    db.run.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        costPoints: true,
        createdAt: true,
        template: { select: { title: true, slug: true } },
      },
    }),
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

  const xp = user?.xp ?? 0;
  const progress = getLevelProgress(xp);
  const displayName = user?.nickname ?? user?.name ?? "匿名同学";

  return (
    <div className="container py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">工作台</h1>
        <p className="mt-2 text-muted-foreground">
          你好，{displayName} · {formatLevel(xp)}
        </p>
      </header>

      {/* 概览卡片 */}
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
                style={{ width: `${Math.round(progress.progress * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {progress.nextLevel
                ? `距${progress.nextLevel.nameZh}还需 ${progress.xpToNext.toLocaleString()} XP`
                : "已达最高等级"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> 运行次数
            </CardDescription>
            <CardTitle className="text-2xl">{runs.length}</CardTitle>
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

      {/* 我的运行 */}
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
                          href={`/templates/${r.template.slug}`}
                          className="truncate font-medium hover:underline"
                        >
                          {r.template.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {r.createdAt.toLocaleString("zh-CN")}
                        </p>
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
      </section>

      {/* 团队算力 */}
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
                    <Link href={`/teams/${m.team.slug}`} className="hover:underline">
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
