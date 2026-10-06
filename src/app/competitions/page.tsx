import type { Metadata } from "next";
import Link from "next/link";
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
      </div>
    </div>
  );
}
