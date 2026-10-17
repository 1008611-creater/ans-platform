import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowUpRight,
  ExternalLink,
  Layers3,
  Network,
  Sparkles,
} from "lucide-react";
import { CompetitionDetails } from "@/components/competitions/competition-details";
import { PageHeading } from "@/components/layout/page-heading";
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
  const locale = await getLocale();
  const t = await getTranslations({ locale: locale === "zh" ? "zh" : "en", namespace: "aigcCompetition" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

const connectorStyles = {
  solara: {
    icon: Network,
    iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
    cover: "/catalog/gitglow-v1/infinite-canvas.webp",
  },
  plane: {
    icon: Layers3,
    iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    cover: "/catalog/gitglow-v1/plane-projects.webp",
  },
  toonflow: {
    icon: Sparkles,
    iconClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    cover: "/catalog/gitglow-v1/niannian-drama.webp",
  },
} as const;

export default async function AigcCompetitionPage() {
  const locale = await getLocale();
  const t = await getTranslations({ locale: locale === "zh" ? "zh" : "en", namespace: "aigcCompetition" });
  const tRoot = await getTranslations();

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
    <div className="ans-product-shell">
      <div className="ans-product-container ans-page-content space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/competitions" className="inline-flex min-h-11 items-center rounded text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{tRoot("nav.competitionHub")}</Link>
          <Link href="/teams" className="inline-flex min-h-11 items-center rounded text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("openTeams")}</Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <PageHeading title={t("title")} description={t("description")} actions={<Button asChild size="lg" className="h-auto min-h-11 whitespace-normal"><Link href="/projects">{t("createProject")}</Link></Button>} />
          <figure className="overflow-hidden rounded-2xl border bg-slate-950/90 shadow-sm">
            <img src="/catalog/gitglow-v1/aigc-workspace.webp" alt="" loading="lazy" className="aspect-[16/9] w-full object-cover object-top" />
          </figure>
        </div>
        <section className="space-y-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
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
                <Card key={connector.id} className="group relative min-w-0 overflow-hidden border-border/80">
                  <a href={connector.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden border-b bg-slate-950/90">
                    <img src={connector.cover} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]" />
                  </a>
                  <CardHeader className="relative gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${connector.iconClass}`}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <Badge variant="outline" className="rounded-full bg-background/60 text-[11px]">{label}</Badge>
                    </div>
                    <a href={connector.url} target="_blank" rel="noopener noreferrer" className="space-y-1.5 hover:underline">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{connector.name}</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </div>
                      <CardDescription className="text-sm font-medium text-foreground/80">{connector.role}</CardDescription>
                    </a>
                  </CardHeader>
                  <CardContent className="relative space-y-4">
                    <p className="text-sm leading-6 text-muted-foreground">{connector.description}</p>
                    <Button asChild className="h-auto min-h-11 w-full whitespace-normal">
                      <a href={connector.url} target="_blank" rel="noopener noreferrer" aria-label={t("openNamedTool", { name: connector.name })}>
                        {t("openTool")}
                        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{t("externalNotice")}</p>
        <section aria-label={t("preparationTitle")}>
          <CompetitionDetails title={t("phasesTitle")}>
            <p className="max-w-3xl text-muted-foreground">{t("phasesDescription")}</p>
            <ol className="space-y-4">{phases.map(phase => <li key={phase.id}><h3 className="font-medium">{phase.label}</h3><p className="max-w-3xl text-muted-foreground">{phase.description}</p><Badge variant="secondary">{phase.state}</Badge></li>)}</ol>
          </CompetitionDetails>
          <CompetitionDetails title={t("deliverablesTitle")}>
            <p className="max-w-3xl text-muted-foreground">{t("deliverablesDescription")}</p>
            <ul className="list-disc space-y-2 ps-5">{deliverables.map(item => <li key={item.id}>{item.label}</li>)}</ul>
          </CompetitionDetails>
          <CompetitionDetails title={t("resourcesTitle")}>
            <div className="flex flex-wrap gap-x-5">{[["/projects",t("openProjects")],["/market",t("openWorkflows")],["/hubs",t("openTemplates")],["/hubs/vibehub",t("openSkills")]].map(([href,label]) => <Link key={href} href={href} className="inline-flex min-h-11 items-center rounded underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{label}</Link>)}</div>
          </CompetitionDetails>
        </section>
      </div>
    </div>
  );
}
