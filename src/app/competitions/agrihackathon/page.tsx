import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, ArrowUpRight, Compass, Cpu, FileCheck2, Sprout, Star, Telescope, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/layout/page-heading";
import { CompetitionDetails } from "@/components/competitions/competition-details";
import { AgriMobileSegments } from "@/components/competitions/agri-mobile-segments";
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
const linkClass = "inline-flex min-h-9 items-center gap-1.5 rounded-md py-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const mobileStepCta = " max-md:min-h-0 max-md:w-auto max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:after:absolute max-md:after:inset-0 max-md:after:rounded-xl max-md:hover:bg-transparent";
const stepCtaClass = "inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const primaryStepCtaClass = "inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
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
    <div className="ans-product-container ans-page-content space-y-6">
      <Link href="/competitions" className={linkClass}>{t("backToHub")}</Link>
      <PageHeading title={t("title")} description={t("intro")}
        actions={<Button asChild size="lg" className="h-auto min-h-11 w-full whitespace-normal sm:w-auto"><Link href="/explore/submit?event=agrihackathon">{wall("publish")}<ArrowRight className="size-4 shrink-0" aria-hidden="true" /></Link></Button>} />

      <AgriMobileSegments label={t("segments.label")} labels={{ pipeline: t("segments.pipeline"), tracks: t("segments.tracks"), guide: t("segments.guide") }}>
      <section data-agri-segment="pipeline" aria-labelledby="agri-pipeline-heading" className="space-y-3 rounded-2xl border bg-card/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[11px]">STEP 01 → 05</Badge>
            <h2 id="agri-pipeline-heading" className="text-lg font-semibold">{t("pipelineTitle")}</h2>
          </div>
          <p className="text-xs text-muted-foreground max-md:hidden">{t("pipelineDescription")}</p>
        </div>
        <ol className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-5">
          {pipelineSteps.map((step) => {
            const StepIcon = step.icon;
            const isCoreSubmit = step.id === "submit";
            const ctaStyle = (isCoreSubmit ? primaryStepCtaClass : stepCtaClass) + mobileStepCta;
            return (
              <li
                key={step.id}
                className={
                  isCoreSubmit
                    ? "relative flex min-w-0 flex-col justify-between rounded-xl border-2 border-primary/45 bg-primary/[0.04] p-3.5 shadow-xs max-md:min-h-14 max-md:flex-row max-md:items-center max-md:gap-3 max-md:py-2.5"
                    : "relative flex min-w-0 flex-col justify-between rounded-xl border bg-card p-3.5 max-md:min-h-14 max-md:flex-row max-md:items-center max-md:gap-3 max-md:py-2.5"
                }
              >
                <div className="space-y-1.5 max-md:flex max-md:min-w-0 max-md:flex-1 max-md:items-center max-md:gap-2.5 max-md:space-y-0">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={isCoreSubmit ? "default" : "outline"} className="font-mono text-[10px] max-md:text-xs">{step.step}</Badge>
                    <StepIcon className="size-4 shrink-0 text-primary max-md:hidden" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-semibold leading-snug max-md:truncate">{step.title}</h3>
                  <p className="text-xs leading-5 text-muted-foreground max-md:hidden">{step.description}</p>
                </div>
                <div className="mt-3 pt-1 max-md:mt-0 max-md:pt-0">
                  {step.href.startsWith("#") ? (
                    <a href={step.href} className={ctaStyle}>
                      <span className="max-md:sr-only">{step.cta}</span>
                      <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
                    </a>
                  ) : (
                    <Link href={step.href} className={ctaStyle}>
                      <span className="max-md:sr-only">{step.cta}</span>
                      <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <nav aria-label={t("nextAction")} className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t pt-2.5">
          <Link href="/teams" className={linkClass}>{t("openTeams")}</Link>
          {competition && <Link href={`/competitions/${competition.id}`} className={linkClass}>{t("enterWorkbench")}</Link>}
          <Link href="/explore/agrihackathon/submit" className={linkClass}>{t("bindProject")}</Link>
          <Link href="/competitions/agrihackathon/tasks" className={linkClass}>{tasks("title")}</Link>
        </nav>
      </section>

      <aside data-agri-segment="pipeline" aria-labelledby="agri-rules-pending" className="min-w-0 rounded-xl border bg-muted/25 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="agri-rules-pending" className="text-sm font-semibold">{guide ? management("rulesTitle") : pending("rulesPendingTitle")}</h2>
          {guide && <span className="text-xs text-muted-foreground">{management("publishedVersion")}: {guide.rule.version}</span>}
        </div>
        {guide ? <>
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-muted-foreground">{guide.rule.windows.map(window => <li key={window.stage}><span className="font-medium text-foreground">{management("stage." + window.stage)}</span>{" · "}{window.state === "CONFIRMED" && window.opensAt && window.closesAt ? <>{submissions("dates", { opens: formatDate(window.opensAt), closes: formatDate(window.closesAt) })}{" · "}{submissions(window.includesDeadline ? "inclusive" : "exclusive")}</> : management("windowPending")}</li>)}</ul>
          <details className="mt-1.5"><summary className="min-h-8 w-fit cursor-pointer rounded py-1 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("readPublishedRules")}</summary><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">{guide.rule.guidanceMarkdown}</p></details>
        </> : <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">{pending("rulesPendingBody")}</p>}
      </aside>

      <section data-agri-segment="tracks" id="tracks" aria-labelledby="agri-tracks-title" className="scroll-mt-24 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="agri-tracks-title" className="text-xl font-semibold">{t("tracksTitle")}</h2>
          <p className="text-xs text-muted-foreground">{t("tracksDescription")}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">{tracks.map(track => { const Icon = track.icon; return <article key={track.id} id={`track-${track.id}`} className="flex min-w-0 flex-col justify-between rounded-xl border bg-card p-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />{track.name}</h3>
              <Badge variant="outline" className="font-mono text-[10px]">{track.code}</Badge>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">{track.description}</p>
          </div>
          <details className="mt-2.5 border-t pt-1.5"><summary className="min-h-8 w-fit cursor-pointer rounded py-1 text-xs font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("trackFocus")}</summary><p className="text-xs leading-5 text-muted-foreground">{track.detail}</p></details>
        </article>; })}</div>
      </section>

      <section data-agri-segment="guide" aria-labelledby="agri-guide-title" className="space-y-3">
        <h2 id="agri-guide-title" className="text-xl font-semibold">{t("guideTitle")}</h2>
        <CompetitionDetails title={t("phasesTitle")}>
          <p className="max-w-3xl text-muted-foreground">{t("phasesDescription")}</p>
          <div className="grid gap-3 md:grid-cols-3">
            <figure className={visualFrameClass}>
              <Image src="/competitions/agrihackathon/gitglow-hub.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" />
            </figure>
            <figure className={visualFrameClass}>
              <Image src="/competitions/agrihackathon/gitglow-wall.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" />
            </figure>
            <figure className={visualFrameClass}>
              <Image src="/competitions/agrihackathon/gitglow-tracks.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" />
            </figure>
          </div>
          <dl className="grid gap-3 sm:grid-cols-4">{(["tracks", "scale", "phases", "deliverables"] as const).map(key => <div key={key} className="rounded-lg border bg-muted/20 p-3"><dt className="text-xs text-muted-foreground">{t(`stats.${key}`)}</dt><dd className="mt-1 font-semibold">{t(`stats.${key}Value`)}</dd></div>)}</dl>
          <ol className="grid gap-3 sm:grid-cols-2">{phases.map(phase => <li key={phase.id} className="rounded-xl border p-3.5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{phase.label}</h3><Badge variant="secondary">{phase.state}</Badge></div><p className="mt-1.5 text-xs leading-5 text-muted-foreground">{phase.description}</p></li>)}</ol>
        </CompetitionDetails>
        <CompetitionDetails title={t("deliverablesTitle")}>
          <p className="max-w-3xl text-muted-foreground">{t("deliverablesDescription")}</p>
          <figure className={visualFrameClass}>
            <Image src="/competitions/agrihackathon/gitglow-workflow.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" />
          </figure>
          <ul className="grid gap-2 sm:grid-cols-2">{deliverables.map(item => <li key={item.id} className="rounded-lg border bg-muted/20 px-3 py-2 text-xs">{item.label}</li>)}</ul>
        </CompetitionDetails>
        <CompetitionDetails title={t("scoringTitle")}>
          <p className="max-w-3xl text-muted-foreground">{t("scoringDescription")}</p>
          <figure className={visualFrameClass}>
            <Image src="/competitions/agrihackathon/gitglow-scoring.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" />
          </figure>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{scoring.map(item => <div key={item.id} className="rounded-lg border bg-muted/20 p-3"><dt className="font-medium">{item.label}</dt><dd className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</dd></div>)}</dl>
          <h3 className="text-base font-semibold">{t("advanceTitle")}</h3>
          <p className="max-w-3xl">{t("advanceDescription")}</p>
          <ul className="grid gap-2 sm:grid-cols-2">{(["professional", "pool", "panel", "review"] as const).map(item => <li key={item} className="rounded-lg border px-3 py-2 text-xs">{t(`advanceItems.${item}`)}</li>)}</ul>
          <p className="max-w-3xl text-xs text-muted-foreground">{t("advanceNote")}</p>
        </CompetitionDetails>
        <CompetitionDetails title={t("awardsTitle")}>
          <p className="max-w-3xl text-muted-foreground">{t("awardsDescription")}</p>
          <figure className={visualFrameClass}>
            <Image src="/competitions/agrihackathon/gitglow-awards.webp" alt="" width={1440} height={900} unoptimized className="aspect-[16/10] w-full object-cover" />
          </figure>
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
      </AgriMobileSegments>
    </div>
  </div>;
}
