import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, ArrowUpRight, Compass, Cpu, FileCheck2, Sprout, Star, Telescope, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/layout/page-heading";
import { CompetitionDetails } from "@/components/competitions/competition-details";
import { AGRI_AWARDS, AGRI_DELIVERABLES, AGRI_PHASES, AGRI_TRACKS } from "@/lib/agrihackathon/cluster";
import { readAgriPublicGuide } from "@/server/competitions/agrihackathon/workspace";
import { findAgriHackathonCompetition } from "@/server/competitions/service";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("agriHackathon");
  return { title: t("title"), description: t("description") };
}
const SCORING_KEYS = ["innovation", "technical", "completeness", "problem", "fit"] as const;
const PIPELINE_KEYS = ["rules", "compute", "submit", "star", "ranking"] as const;
const pipelineIcons = { rules: Compass, compute: Cpu, submit: FileCheck2, star: Star, ranking: Trophy } as const;
const trackStyles = { people: { icon: Sprout }, discovery: { icon: Telescope }, action: { icon: Compass } };
const linkClass = "inline-flex min-h-11 items-center gap-2 rounded-md py-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const visualFrameClass = "overflow-hidden rounded-2xl border bg-slate-950/90 shadow-sm";

export default async function AgriHackathonPage() {
  const t = await getTranslations("agriHackathon");
  const wall = await getTranslations("agriWall");
  const locale = await getLocale();
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
  const pending = await getTranslations("product.agrihackathon");
  const tasks = await getTranslations("product.agriTasks");
  const submissions = await getTranslations("product.agriSubmissions");
  const works = await getTranslations("product.agriWorks");
  const publications = await getTranslations("product.agriPublications");
  const onsite = await getTranslations("product.agriOnsite");
  const management = await getTranslations("product.agriWorkspace");
  const rankings = await getTranslations("product.agriRankings");
  const benefits = await getTranslations("product.computeBenefits");
  const competition = await findAgriHackathonCompetition();
  const guide = await readAgriPublicGuide().catch(() => null);

  const pipelineSteps = PIPELINE_KEYS.map((key) => {
    const copy = t.raw(`pipeline.${key}`) as {
      step: string;
      title: string;
      description: string;
      cta: string;
      href: string;
    };
    return {
      id: key,
      ...copy,
      icon: pipelineIcons[key],
    };
  });

  const tracks = AGRI_TRACKS.map((track) => {
    const copy = t.raw(`tracks.${track.id}`) as {
      name: string;
      code: string;
      role: string;
      description: string;
      status: string;
      detail: string;
    };
    return { ...track, ...copy, ...trackStyles[track.id] };
  });

  const phases = AGRI_PHASES.map((phase) => ({
    id: phase,
    ...(t.raw(`phases.${phase}`) as {
      label: string;
      description: string;
      state: string;
    }),
  }));

  const deliverables = AGRI_DELIVERABLES.map((deliverable) => ({
    id: deliverable,
    label: t(`deliverables.${deliverable}`),
  }));

  const scoring = SCORING_KEYS.map((key) => ({
    id: key,
    ...(t.raw(`scoring.${key}`) as {
      label: string;
      description: string;
    }),
  }));

  const awards = AGRI_AWARDS.map((award) => ({
    id: award,
    ...(t.raw(`awards.${award}`) as {
      label: string;
      amount: string;
      description: string;
    }),
  }));

  const rules = ["opensource", "data", "originality", "team", "demo", "conduct", "rights", "frozen"] as const;

  return <div className="ans-product-shell">
    <div className="ans-product-container ans-page-content space-y-9">
      <Link href="/competitions" className={linkClass}>{t("backToHub")}</Link>
      <PageHeading title={t("title")} description={t("intro")}
        actions={<Button asChild size="lg" className="h-auto min-h-11 w-full whitespace-normal sm:w-auto"><Link href="/explore/submit?event=agrihackathon">{wall("publish")}<ArrowRight className="size-4 shrink-0" aria-hidden="true" /></Link></Button>} />
      <aside aria-labelledby="agri-rules-pending" className="min-w-0 rounded-xl border bg-muted/30 p-4 sm:p-5">
        <h2 id="agri-rules-pending" className="font-semibold">{guide ? management("rulesTitle") : pending("rulesPendingTitle")}</h2>
        {guide ? <>
          <details className="mt-2"><summary className="min-h-11 w-fit cursor-pointer rounded py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("readPublishedRules")}</summary><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{guide.rule.guidanceMarkdown}</p></details>
          <p className="mt-3 text-sm text-muted-foreground">{management("publishedVersion")}: {guide.rule.version}</p>
          <ul className="mt-3 space-y-2 text-sm">{guide.rule.windows.map(window => <li key={window.stage}><span className="font-medium">{management("stage." + window.stage)}</span>{" · "}{window.state === "CONFIRMED" && window.opensAt && window.closesAt ? <>{submissions("dates", { opens: formatDate(window.opensAt), closes: formatDate(window.closesAt) })}{" · "}{submissions(window.includesDeadline ? "inclusive" : "exclusive")}</> : management("windowPending")}</li>)}</ul>
        </> : <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">{pending("rulesPendingBody")}</p>}
      </aside>

      <section aria-labelledby="agri-pipeline-heading" className="space-y-4">
        <div className="space-y-1">
          <h2 id="agri-pipeline-heading" className="text-xl font-semibold">{t("pipelineTitle")}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/competitions/agrihackathon/tasks" className={`${visualFrameClass} group relative block transition hover:border-primary/60`}>
            <Image src="/competitions/agrihackathon/gitglow-hub.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
            <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/85 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xs">🎯 进入赛事任务 →</span>
          </Link>
          <Link href="/explore/submit?event=agrihackathon" className={`${visualFrameClass} group relative block transition hover:border-primary/60`}>
            <Image src="/competitions/agrihackathon/gitglow-wall.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
            <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/85 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xs">🚀 提交参赛作品 →</span>
          </Link>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {pipelineSteps.map((step) => {
            const StepIcon = step.icon;
            return (
              <li key={step.id} className="flex min-w-0 flex-col justify-between rounded-xl border bg-card p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <StepIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    <Badge variant="outline" className="font-mono text-[10px]">{step.step}</Badge>
                  </div>
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <p className="text-xs leading-5 text-muted-foreground">{step.description}</p>
                </div>
                <div className="mt-3 pt-2">
                  {step.href.startsWith("#") ? (
                    <a href={step.href} className={linkClass}>
                      <span>{step.cta}</span>
                      <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
                    </a>
                  ) : (
                    <Link href={step.href} className={linkClass}>
                      <span>{step.cta}</span>
                      <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <nav aria-label={t("nextAction")} className="flex flex-wrap gap-x-5 border-y py-3">
          <Link href="/explore/agrihackathon/submit" className={linkClass}>{t("bindProject")}</Link>
          <Link href="/competitions/agrihackathon/tasks" className={linkClass}>{tasks("title")}</Link>
          <Link href="/teams" className={linkClass}>{t("openTeams")}</Link>
          {competition && <Link href={`/competitions/${competition.id}`} className={linkClass}>{t("enterWorkbench")}</Link>}
      </nav>

      <section id="tracks" aria-labelledby="agri-tracks-title" className="scroll-mt-24 space-y-4">
        <div className="space-y-1">
          <h2 id="agri-tracks-title" className="text-2xl font-semibold">{t("tracksTitle")}</h2>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{t("tracksDescription")}</p>
        </div>
        <figure className={visualFrameClass}>
          <Image src="/competitions/agrihackathon/gitglow-tracks.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" />
        </figure>
        <div className="grid gap-4 md:grid-cols-3">{tracks.map(track => { const Icon = track.icon; return <article key={track.id} id={`track-${track.id}`} className="flex min-w-0 flex-col justify-between rounded-2xl border bg-card p-5">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold"><Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />{track.name}</h3>
              <Badge variant="outline" className="font-mono text-[10px]">{track.code}</Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{track.description}</p>
          </div>
          <details className="mt-3 border-t pt-2"><summary className="min-h-11 w-fit cursor-pointer rounded py-1.5 text-xs font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("trackFocus")}</summary><p className="text-xs leading-5 text-muted-foreground">{track.detail}</p></details>
        </article>; })}</div>
      </section>

      <section aria-labelledby="agri-guide-title" className="space-y-4">
        <h2 id="agri-guide-title" className="text-2xl font-semibold">{t("guideTitle")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <figure className={visualFrameClass}>
            <Image src="/competitions/agrihackathon/gitglow-workflow.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" />
          </figure>
          <figure className={visualFrameClass}>
            <Image src="/competitions/agrihackathon/gitglow-scoring.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" />
          </figure>
          <figure className={visualFrameClass}>
            <Image src="/competitions/agrihackathon/gitglow-awards.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" />
          </figure>
        </div>
        <CompetitionDetails title={t("phasesTitle")}>
          <p className="max-w-3xl text-muted-foreground">{t("phasesDescription")}</p>
          <dl className="grid gap-3 sm:grid-cols-4">{(["tracks", "scale", "phases", "deliverables"] as const).map(key => <div key={key} className="rounded-lg border bg-muted/20 p-3"><dt className="text-xs text-muted-foreground">{t(`stats.${key}`)}</dt><dd className="mt-1 font-semibold">{t(`stats.${key}Value`)}</dd></div>)}</dl>
          <ol className="grid gap-3 sm:grid-cols-2">{phases.map(phase => <li key={phase.id} className="rounded-xl border p-3.5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{phase.label}</h3><Badge variant="secondary">{phase.state}</Badge></div><p className="mt-1.5 text-xs leading-5 text-muted-foreground">{phase.description}</p></li>)}</ol>
        </CompetitionDetails>
        <CompetitionDetails title={t("deliverablesTitle")}>
          <p className="max-w-3xl text-muted-foreground">{t("deliverablesDescription")}</p>
          <ul className="grid gap-2 sm:grid-cols-2">{deliverables.map(item => <li key={item.id} className="rounded-lg border bg-muted/20 px-3 py-2 text-xs">{item.label}</li>)}</ul>
        </CompetitionDetails>
        <CompetitionDetails title={t("scoringTitle")}>
          <p className="max-w-3xl text-muted-foreground">{t("scoringDescription")}</p>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{scoring.map(item => <div key={item.id} className="rounded-lg border bg-muted/20 p-3"><dt className="font-medium">{item.label}</dt><dd className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</dd></div>)}</dl>
          <h3 className="text-base font-semibold">{t("advanceTitle")}</h3>
          <p className="max-w-3xl">{t("advanceDescription")}</p>
          <ul className="grid gap-2 sm:grid-cols-2">{(["professional", "pool", "panel", "review"] as const).map(item => <li key={item} className="rounded-lg border px-3 py-2 text-xs">{t(`advanceItems.${item}`)}</li>)}</ul>
          <p className="max-w-3xl text-xs text-muted-foreground">{t("advanceNote")}</p>
        </CompetitionDetails>
        <CompetitionDetails title={t("awardsTitle")}>
          <p className="max-w-3xl text-muted-foreground">{t("awardsDescription")}</p>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{awards.map(award => <div key={award.id} className="rounded-lg border bg-muted/20 p-3.5"><dt className="font-medium">{award.label}<span className="ms-2 text-primary">{award.amount}</span></dt><dd className="mt-1 text-xs leading-5 text-muted-foreground">{award.description}</dd></div>)}</dl>
        </CompetitionDetails>
        <CompetitionDetails title={t("rulesTitle")}>
          <p className="max-w-3xl text-muted-foreground">{t("rulesDescription")}</p>
          <ul className="grid gap-2.5 sm:grid-cols-2">{rules.map(rule => <li key={rule} className="rounded-lg border bg-muted/20 p-3 text-xs leading-5">{t(`rules.${rule}`)}</li>)}</ul>
        </CompetitionDetails>
        <CompetitionDetails title={t("toolsTitle")}>
          <p className="max-w-3xl text-muted-foreground">{pending("workspaceLinksBody")}</p>
          <div className="flex flex-wrap gap-x-5"><Link href="/explore" className={linkClass}>{t("browseProjects")}</Link><Link href="/hubs" className={linkClass}>{pending("openHubs")}</Link><Link href="/workspace" className={linkClass}>{t("myWorkspace")}</Link></div>
          <p className="max-w-3xl text-muted-foreground">{competition ? t("boundaryDescriptionOpen") : t("boundaryDescription")}</p>
          <ul className="grid gap-2 sm:grid-cols-2">{(["entry", "links", "ownership", "next"] as const).map(item => <li key={item} className="rounded-lg border px-3 py-2 text-xs">{item === "next" && competition ? t("boundaryNextOpen") : t(`boundaryItems.${item}`)}</li>)}</ul>
        </CompetitionDetails>
        <CompetitionDetails title={pending("organizerTools")}>
          <p className="max-w-3xl text-muted-foreground">{pending("organizerToolsBody")}</p>
          <div className="grid gap-3 pt-1 sm:grid-cols-2">{([
            ["works", works("title")], ["onsite", onsite("title")], ["publication-review", publications("reviewTitle")], ["popularity", wall("managementTitle")], ["manage", management("title")], ["rankings", rankings("adminTitle")],
          ] as const).map(([path, label]) => <div key={path} className="rounded-lg border bg-background/60 p-3.5">
            <Link href={`/competitions/agrihackathon/${path}`} className={linkClass}><span>{label}</span><ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" /></Link>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{pending(`organizerToolDescriptions.${path}`)}</p>
          </div>)}</div>
        </CompetitionDetails>
      </section>
    </div>
  </div>;
}
