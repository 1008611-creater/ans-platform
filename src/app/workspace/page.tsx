import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { FolderOpen, Heart, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLevelProgress, formatLevel } from "@/lib/level";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DisplayNameEditor } from "@/components/workspace/display-name-editor";
import { SwissOnboardingGuide } from "@/components/workspace/swiss-onboarding-guide";

export async function generateMetadata() {
  const t = await getTranslations("product.workspace");
  return { title: t("metaTitle"), description: t("description") };
}

const RUN_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  QUEUED: "outline", RUNNING: "secondary", SUCCEEDED: "default", FAILED: "destructive", CANCELLED: "outline",
};

type WorkspacePageProps = {
  searchParams?: Promise<{ runsCursor?: string | string[]; prompt?: string | string[] }>;
};

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const retired = await getTranslations("retirement");
  const t = await getTranslations("product.workspace");
  const locale = await getLocale();
  const computeCopy = await getTranslations("product.computeHistory");
  const query = searchParams ? await searchParams : {};
  const rawCursor = Array.isArray(query.runsCursor) ? query.runsCursor[0] : query.runsCursor;
  const rawPrompt = Array.isArray(query.prompt) ? query.prompt[0] : query.prompt;
  const initialPrompt = rawPrompt && rawPrompt.length <= 2000 ? rawPrompt : "";
  const runsCursor = rawCursor && rawCursor.length <= 128 ? rawCursor : undefined;
  const pageSize = 20;

  const [user, runRows, runCount, memberships] = userId
    ? await Promise.all([
        db.user.findUnique({
          where: { id: userId },
          select: { xp: true, quotaPoints: true, nickname: true },
        }),
        db.run.findMany({
          where: { userId },
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
        db.run.count({ where: { userId } }),
        db.teamMember.findMany({
          where: { userId, status: "ACTIVE" },
          select: {
            role: true,
            quotaAllowance: true,
            quotaUsed: true,
            team: { select: { id: true, name: true, slug: true } },
          },
        }),
      ])
    : [null, [], 0, []];

  const hasMoreRuns = runRows.length > pageSize;
  const runs = hasMoreRuns ? runRows.slice(0, pageSize) : runRows;
  const nextRunsCursor = hasMoreRuns ? runs[runs.length - 1]?.id : undefined;
  const xp = user?.xp ?? 0;
  const progress = getLevelProgress(xp);
  const displayName = user?.nickname?.trim() || (userId ? t("anonymous") : locale === "zh" ? "访客创作者" : "Guest Creator");
  const currentPoints = Number(user?.quotaPoints ?? 0);
  const levelName = locale === "zh" ? formatLevel(xp) : progress.level.nameEn;

  return (
    <div className="ans-product-container ans-page-content ans-workspace-page">
      <div className="mb-5">
        <SwissOnboardingGuide variant="workspace" />
      </div>
      <DisplayNameEditor
        codexWorkbench
        actorId={userId ?? "guest"}
        current={displayName}
        points={currentPoints}
        levelName={levelName}
        initialPrompt={initialPrompt}
      />

      <details className="mt-5 rounded-2xl border border-border/70 bg-card/60 p-4">
        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 text-sm font-semibold">
          <span>
            📊 {locale === "zh" ? "历史运行与团队记录" : "Run History & Teams"}
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {locale === "zh"
              ? `运行 ${runCount} 次 · 团队 ${memberships.length} 个`
              : `${runCount} Runs · ${memberships.length} Teams`}
          </span>
        </summary>
        <div className="mt-4">
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
            <Button asChild variant="outline" size="sm"><Link href="/workspace/compute">{computeCopy("entry")}</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href="/community">{t("community")}</Link></Button>
          </div>

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
      <section className="ans-workspace-section flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold"><Heart className="h-4 w-4" />{retired("favoritesTitle")}</h2><Button asChild variant="outline" size="sm"><Link href="/collection">{retired("openFavorites")}</Link></Button></section>
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
      </details>
    </div>
  );
}
