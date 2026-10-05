import type { Metadata } from "next";
import Link from "next/link";
import { listCompetitions } from "@/server/competitions/service";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Check,
  HeartHandshake,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("competitionsHub");
  return {
    title: t("title"),
    description: t("description"),
  };
}

/**
 * 比赛中心的两个入口。结构写死在这里，文案全部走 competitionsHub 命名空间，
 * 与 /competitions/aigc、/competitions/agrihackathon 两个页面保持一致。
 */
const hubEntries = [
  {
    id: "aigc",
    href: "/competitions/aigc",
    icon: Sparkles,
    accent: "from-sky-500/20 via-violet-500/5 to-transparent",
    iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  },
  {
    id: "agrihackathon",
    href: "/competitions/agrihackathon",
    icon: HeartHandshake,
    accent: "from-emerald-500/20 via-amber-500/5 to-transparent",
    iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  },
] as const;

export default async function CompetitionsPage() {
  const t = await getTranslations("competitionsHub");

  let competitions: Awaited<ReturnType<typeof listCompetitions>> = [];
  let listUnavailable = false;
  try {
    competitions = await listCompetitions();
  } catch (error) {
    listUnavailable = true;
    console.error("competition hub: list failed", error);
  }

  const entries = hubEntries.map((entry) => ({
    ...entry,
    ...(t.raw(`items.${entry.id}`) as {
      name: string;
      tagline: string;
      description: string;
      status: string;
      highlights: string[];
      cta: string;
    }),
  }));

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_18%_0%,hsl(var(--primary)/0.16),transparent_45%),radial-gradient(circle_at_84%_10%,rgba(16,185,129,0.14),transparent_38%)]" />
      <div className="container space-y-12 py-10 md:py-14">
        <section className="max-w-3xl space-y-4">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] tracking-[0.18em]">
            {t("eyebrow")}
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl md:leading-[1.05]">
            {t("title")}
          </h1>
          <p className="text-base leading-7 text-muted-foreground md:text-lg">
            {t("description")}
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {entries.map((entry) => {
            const Icon = entry.icon;
            return (
              <Card
                key={entry.id}
                className="group relative flex flex-col overflow-hidden border-border/80 bg-background/80 transition-colors hover:border-primary/40"
              >
                <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-br ${entry.accent}`} />
                <CardHeader className="relative gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${entry.iconClass}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant="outline" className="rounded-full bg-background/60 text-[11px]">
                      {entry.status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl">{entry.name}</CardTitle>
                    <CardDescription className="text-sm font-medium text-foreground/80">
                      {entry.tagline}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="relative flex flex-1 flex-col gap-5">
                  <p className="text-sm leading-6 text-muted-foreground">{entry.description}</p>
                  <ul className="space-y-2">
                    {entry.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild size="lg" className="mt-auto w-full justify-between">
                    <Link href={entry.href}>
                      {entry.cta}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">全部赛事</h2>
              <p className="text-sm text-muted-foreground">
                平台上已创建的赛事。点进任一赛事，可以报名、组队、提交作品并跟踪评审进度。
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/teams">团队与比赛</Link>
            </Button>
          </div>
          {competitions.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {competitions.map((competition) => (
                <Link key={competition.id} href={`/competitions/${competition.id}`} className="group">
                  <Card className="h-full overflow-hidden transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                    <div className="h-1.5 bg-gradient-to-r from-primary via-fuchsia-500 to-amber-400" />
                    <CardHeader className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant={competition.status === "ENDED" ? "secondary" : "default"}>
                          {competition.status === "ENDED" ? "已结束" : competition.status === "ONGOING" ? "进行中" : "即将开始"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{competition._count.teams} 支队伍</span>
                      </div>
                      <CardTitle className="text-xl leading-snug group-hover:text-primary">{competition.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-muted-foreground">
                        {competition.description || "用团队协作完成一个 AI 原生作品，提交指定版本参与评审。"}
                      </p>
                      <div className="flex items-center justify-between border-t pt-4 text-sm">
                        <span>{competition.organizer || "ANS 创作者社区"}</span>
                        <span className="font-semibold text-primary">{competition.rewardXp} XP 激励</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <p className="font-semibold">{listUnavailable ? "赛事列表暂时不可用" : "新赛事正在准备中"}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {listUnavailable ? "比赛中心仍可正常使用，请稍后刷新查看已创建赛事。" : "稍后再来，或先创建项目并邀请队友。"}
                </p>
              </CardContent>
            </Card>
          )}
        </section>

      </div>
    </div>
  );
}
