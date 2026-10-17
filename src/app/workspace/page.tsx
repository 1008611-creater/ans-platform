import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Activity, Coins, FolderOpen, Gift, Heart, Sparkles, Users, Zap } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLevelProgress, formatLevel } from "@/lib/level";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DisplayNameEditor } from "@/components/workspace/display-name-editor";
import { CreationTools } from "@/components/workspace/creation-tools";
import { PageHeading } from "@/components/layout/page-heading";

export async function generateMetadata() {
  const t = await getTranslations("product.workspace");
  return { title: t("metaTitle"), description: t("description") };
}

const RUN_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  QUEUED: "outline", RUNNING: "secondary", SUCCEEDED: "default", FAILED: "destructive", CANCELLED: "outline",
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
  const t = await getTranslations("product.workspace");
  const locale = await getLocale();
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
  const displayName = user?.nickname?.trim() || t("anonymous");
  const currentPoints = Number(user?.quotaPoints ?? 0);

  return (
    <div className="ans-product-container ans-page-content ans-workspace-page">
      <PageHeading title={t("title")}
        description={<span className="ans-workspace-greeting">{t("greeting", { name: displayName })} · {locale === "zh" ? formatLevel(xp) : progress.level.nameEn}
          <DisplayNameEditor actorId={session.user.id} current={displayName} /></span>}
        actions={<><Button asChild><Link href="/projects">{product("myProjects")}</Link></Button><Button asChild variant="outline"><Link href="/explore">{product("nav.explore")}</Link></Button></>} />

      {currentPoints < 100 && (
        <section aria-label={locale === "zh" ? "算力福利直通车" : "Compute Benefits Express"} className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-amber-500/5 to-rose-500/10 p-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <Gift className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {locale === "zh"
                  ? "🎁 算力福利中心开放中：免费领 100~150 积分（¥10~¥15）· 0.1% 抽 1,000 积分神话锦鲤"
                  : "🎁 Compute Benefits Open: Claim 100–150 Free Pts ($10–$15) & 0.1% 1,000-Pt Mythic Jackpot"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {locale === "zh"
                  ? "完成 5 题 DeepSeek 破冰问卷即领 $5（50 积分），参与 3D 灵龙抓娃娃机与星轨转盘最高暴击 1,000 积分（¥100）！"
                  : "Complete the 5-question DeepSeek onboarding for $5 (50 pts) and play the 3D Claw Machine for up to 1,000 pts ($100)!"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500">
              <Link href="/workspace/benefits">
                <Sparkles className="me-1 h-3.5 w-3.5" aria-hidden="true" />
                {locale === "zh" ? "立即免费领算力 / 抓娃娃" : "Claim Free Credits & Play"}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/workspace/credits">
                {locale === "zh" ? "卡密充值兑换" : "Redeem Voucher"}
              </Link>
            </Button>
          </div>
        </section>
      )}

      <CreationTools />
      <section className="ans-account-summary">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5" /> {t("balance")}
            </CardDescription>
            <CardTitle className="text-2xl">
              {(user?.quotaPoints ?? 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}
              <span className="ms-1 text-sm font-normal text-muted-foreground">{t("pointsUnit")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
            <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500">
              <Link href="/workspace/benefits">
                <Gift className="me-1 h-3.5 w-3.5" aria-hidden="true" />
                {locale === "zh" ? "领 100~150分 · 抽锦鲤" : "Free 100–150 Pts"}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm"><Link href="/workspace/credits">{quotaCopy("entry")}</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href="/workspace/compute">{computeCopy("entry")}</Link></Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> {t("experience")}
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
                ? t("nextLevel", { level: locale === "zh" ? progress.nextLevel.nameZh : progress.nextLevel.nameEn, xp: progress.xpToNext })
                : t("maxLevel")}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href="/community">{t("community")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> {t("runs")}
            </CardDescription>
            <CardTitle className="text-2xl">{runCount}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> {t("myTeams")}
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
                  const variant = RUN_STATUS_VARIANT[r.status] ?? "outline";
                  const statusLabel = RUN_STATUS_VARIANT[r.status] ? t("status." + r.status) : r.status;
                  return (
                    <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1 basis-48">
                        <p className="truncate font-medium">{r.template.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.createdAt.toLocaleString(locale)}
                        </p>
                        {r.outputText && <details className="mt-2"><summary className="cursor-pointer py-2 text-sm">{t("viewResult")}</summary><pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words text-sm">{r.outputText}</pre></details>}
                        {r.error && <p className="mt-2 text-sm text-destructive">{r.error}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted-foreground">{t("runCost", { points: r.costPoints.toLocaleString(locale, { maximumFractionDigits: 6 }) })}</span>
                        <Badge variant={variant}>{statusLabel}</Badge>
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
                <Link href={"/workspace?runsCursor=" + encodeURIComponent(nextRunsCursor)}>{t("nextPage")}</Link>
              </Button>
            )}
            {runsCursor && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/workspace">{t("firstPage")}</Link>
              </Button>
            )}
          </div>
        )}
      </section>
      <section className="ans-workspace-section"><h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Heart className="h-4 w-4" />{retired("favoritesTitle")}</h2><p className="text-sm leading-7 text-muted-foreground">{retired("favoritesNote")}</p><Button asChild variant="outline" className="mt-4"><Link href="/collection">{retired("openFavorites")}</Link></Button></section>
      <section className="ans-workspace-section ans-workspace-teams">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-4 w-4" /> {t("teamCredits")}
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/teams">{t("manageTeams")}</Link>
          </Button>
        </div>

        {memberships.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {t("noTeams")}
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
                    {t(m.role === "OWNER" ? "owner" : m.role === "ADMIN" ? "admin" : "member")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {t("teamAllowance", { used: m.quotaUsed, total: m.quotaAllowance })}
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
