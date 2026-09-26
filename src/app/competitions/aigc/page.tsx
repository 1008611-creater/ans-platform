import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  Check,
  ClipboardCheck,
  ExternalLink,
  FileCheck2,
  Layers3,
  ListChecks,
  Network,
  Rocket,
  ShieldCheck,
  Sparkles,
  Workflow,
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
import {
  AIGC_CONNECTORS,
  AIGC_DELIVERABLES,
  AIGC_PHASES,
} from "@/lib/aigc/cluster";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("aigcCompetition");
  return {
    title: t("title"),
    description: t("description"),
  };
}

const connectorStyles = {
  solara: {
    icon: Network,
    accent: "from-sky-500/20 via-sky-500/5 to-transparent",
    iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  },
  plane: {
    icon: Layers3,
    accent: "from-violet-500/20 via-violet-500/5 to-transparent",
    iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  },
  toonflow: {
    icon: Sparkles,
    accent: "from-amber-500/20 via-amber-500/5 to-transparent",
    iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  },
} as const;

export default async function AigcCompetitionPage() {
  const t = await getTranslations("aigcCompetition");

  const connectors = AIGC_CONNECTORS.map((connector) => {
    const copy = t.raw(`connectors.${connector.id}`) as {
      name: string;
      host: string;
      role: string;
      description: string;
      status: string;
      detail: string;
    };
    return { ...connector, ...copy, ...connectorStyles[connector.id] };
  });

  const phases = AIGC_PHASES.map((phase) => ({
    id: phase,
    ...(t.raw(`phases.${phase}`) as {
      label: string;
      description: string;
      state: string;
    }),
  }));

  const deliverables = AIGC_DELIVERABLES.map((deliverable) => ({
    id: deliverable,
    label: t(`deliverables.${deliverable}`),
  }));

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_20%_0%,hsl(var(--primary)/0.16),transparent_45%),radial-gradient(circle_at_82%_12%,rgba(245,158,11,0.14),transparent_38%)]" />
      <div className="container space-y-12 py-10 md:py-14">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] tracking-[0.18em]">
                {t("eyebrow")}
              </Badge>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_hsl(142_71%_45%/0.12)]" />
                {t("statusTitle")}
              </span>
            </div>
            <div className="max-w-4xl space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight md:text-6xl md:leading-[1.05]">
                {t("title")}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                {t("description")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/projects">
                  <Rocket className="h-4 w-4" />
                  {t("createProject")}
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/teams">
                  <Boxes className="h-4 w-4" />
                  {t("openTeams")}
                </Link>
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden border-primary/20 bg-background/75 shadow-xl shadow-primary/5 backdrop-blur">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BadgeCheck className="h-5 w-5 text-emerald-500" />
                    {t("statusTitle")}
                  </CardTitle>
                  <CardDescription className="mt-2 leading-6">
                    {t("statusDescription")}
                  </CardDescription>
                </div>
                <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4 lg:grid-cols-2">
              {(["tools", "entry", "phases", "deliverables"] as const).map((key) => (
                <div key={key} className="space-y-1">
                  <p className="text-2xl font-semibold tracking-tight">{t(`stats.${key}Value`)}</p>
                  <p className="text-xs text-muted-foreground">{t(`stats.${key}`)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">{t("clusterSectionLabel")}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{t("connectorsTitle")}</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground md:text-right">{t("connectorsDescription")}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {connectors.map((connector) => {
              const Icon = connector.icon;
              const label = connector.kind === "planning"
                ? t("planningLabel")
                : connector.kind === "production"
                  ? t("productionLabel")
                  : t("backupLabel");
              return (
                <Card key={connector.id} className="group relative overflow-hidden border-border/80 bg-background/80 transition-colors hover:border-primary/40">
                  <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-br ${connector.accent}`} />
                  <CardHeader className="relative gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${connector.iconClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="outline" className="rounded-full bg-background/60 text-[11px]">{label}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{connector.name}</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">{connector.host}</p>
                      <CardDescription className="text-sm font-medium text-foreground/80">{connector.role}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="relative space-y-5">
                    <p className="text-sm leading-6 text-muted-foreground">{connector.description}</p>
                    <div className="rounded-xl border bg-muted/25 p-3 text-xs leading-5 text-muted-foreground">
                      <span className="font-medium text-foreground">{connector.status}</span>
                      <span className="mx-1.5 text-border">·</span>
                      {connector.detail}
                    </div>
                    <Button asChild className="w-full" variant={connector.id === "toonflow" ? "default" : "outline"}>
                      <a href={connector.url} target="_blank" rel="noopener noreferrer">
                        {t("openTool")}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      {connector.id === "solara" ? t("loginNote") : t("noIframeNote")}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-border/80">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary"><Workflow className="h-5 w-5" /></div>
                <div>
                  <CardTitle>{t("phasesTitle")}</CardTitle>
                  <CardDescription className="mt-2 leading-6">{t("phasesDescription")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {phases.map((phase, index) => (
                <div key={phase.id} className="group flex gap-4 rounded-2xl border bg-muted/20 p-4 transition-colors hover:bg-muted/40">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold text-primary ring-1 ring-border">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{phase.label}</p>
                      <Badge variant="secondary" className="rounded-full text-[11px]">{phase.state}</Badge>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{phase.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-300"><ClipboardCheck className="h-5 w-5" /></div>
                <div>
                  <CardTitle>{t("deliverablesTitle")}</CardTitle>
                  <CardDescription className="mt-2 leading-6">{t("deliverablesDescription")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {deliverables.map((deliverable) => (
                <div key={deliverable.id} className="flex items-start gap-2 rounded-xl border bg-background p-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{deliverable.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-primary/20 bg-primary/[0.035]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" />{t("workflowTitle")}</CardTitle>
              <CardDescription className="leading-6">{t("workflowDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {[
                ["/projects", t("openProjects"), FileCheck2],
                ["/workflows", t("openWorkflows"), Workflow],
                ["/templates", t("openTemplates"), Layers3],
                ["/skills", t("openSkills"), Sparkles],
              ].map(([href, label, Icon]) => (
                <Button key={href as string} asChild variant="outline" className="justify-between bg-background/80">
                  <Link href={href as string}>
                    <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{label as string}</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-amber-500/25 bg-amber-500/[0.035]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-300" />{t("boundaryTitle")}</CardTitle>
              <CardDescription className="leading-6">{t("boundaryDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {(["entry", "links", "ownership", "next"] as const).map((item) => (
                <div key={item} className="flex gap-2 text-sm leading-6">
                  <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
                  <span>{t(`boundaryItems.${item}`)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("syncNote")}
        </p>
      </div>
    </div>
  );
}
